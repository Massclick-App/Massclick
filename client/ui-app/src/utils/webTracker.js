// First-party visitor tracker. Batches events to POST /api/site-events.
//
// Deliberately NOT built on axiosInstance: its interceptors show the global
// loading spinner and attach auth headers, and sendBeacon (used on pagehide)
// cannot go through axios at all. Bodies are sent as plain strings so the
// browser uses text/plain — CORS-safelisted, so no preflight and sendBeacon
// works cross-origin; the server parses it as JSON.
//
// Every public function fails silently: analytics is lossy by design and
// must never break the page.

import { ensureWebDeviceId, getCustomerUser } from "../auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL || "";
const INGEST_URL = API_URL ? `${API_URL}/site-events` : "";

const SESSION_KEY = "mc_sid";
const SESSION_TS_KEY = "mc_sid_ts";
const BUSINESS_VIEW_KEY = "mc_bv";

const SESSION_GAP_MS = 30 * 60 * 1000;
const FLUSH_AT_COUNT = 10;
const FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE = 50;
const MAX_EVENTS_PER_POST = 25;

let queue = [];
let flushTimer = null;
let pendingNewSession = false;
let userIdOverride = null;
let cachedDeviceId = "";

// sessionStorage with in-memory fallback (Safari private mode etc.). The
// fallback still yields per-pageload sessions instead of losing the visitor.
const memStore = {};
const storeGet = (key) => {
    try {
        const value = window.sessionStorage.getItem(key);
        return value !== null ? value : memStore[key] ?? null;
    } catch (_) {
        return memStore[key] ?? null;
    }
};
const storeSet = (key, value) => {
    memStore[key] = value;
    try {
        window.sessionStorage.setItem(key, value);
    } catch (_) {
        /* private mode */
    }
};
const storeRemove = (key) => {
    delete memStore[key];
    try {
        window.sessionStorage.removeItem(key);
    } catch (_) {
        /* private mode */
    }
};

const canTrack = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    if (!INGEST_URL) return false;
    // Headless/prerender traffic (SEO snapshots, bots that run JS) is not real.
    if (window.navigator && window.navigator.webdriver) return false;
    const path = window.location.pathname || "";
    // Admins working in the panel must not pollute visitor data.
    if (path.startsWith("/dashboard") || path.startsWith("/admin")) return false;
    return true;
};

const getDeviceId = () => {
    if (cachedDeviceId) return cachedDeviceId;
    try {
        cachedDeviceId = ensureWebDeviceId() || "";
    } catch (_) {
        cachedDeviceId = "";
    }
    return cachedDeviceId;
};

// Returns the active session id, rolling to a new one after 30 min of
// inactivity. The first event of a fresh session carries isNewSession.
const touchSession = () => {
    const now = Date.now();
    let sid = storeGet(SESSION_KEY);
    const lastActivity = Number(storeGet(SESSION_TS_KEY)) || 0;

    if (!sid || now - lastActivity > SESSION_GAP_MS) {
        sid = `s_${Math.random().toString(36).slice(2)}${now.toString(36)}`;
        storeSet(SESSION_KEY, sid);
        storeRemove(BUSINESS_VIEW_KEY);
        pendingNewSession = true;
    }
    storeSet(SESSION_TS_KEY, String(now));
    return sid;
};

const externalReferrer = () => {
    try {
        const ref = document.referrer;
        if (!ref) return "";
        return new URL(ref).origin === window.location.origin ? "" : ref;
    } catch (_) {
        return "";
    }
};

const transmit = (body, preferBeacon) => {
    try {
        if (preferBeacon && window.navigator && typeof window.navigator.sendBeacon === "function") {
            if (window.navigator.sendBeacon(INGEST_URL, body)) return;
        }
    } catch (_) {
        /* fall through to fetch */
    }
    try {
        window
            .fetch(INGEST_URL, { method: "POST", body, keepalive: true, credentials: "omit" })
            .catch(() => {});
    } catch (_) {
        /* dropped — analytics is lossy by design */
    }
};

const flush = (preferBeacon = false) => {
    try {
        if (queue.length === 0) return;
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }

        const deviceId = getDeviceId();
        const sessionId = storeGet(SESSION_KEY);
        if (!deviceId || !sessionId) {
            queue = [];
            return;
        }

        let userId = userIdOverride;
        if (!userId) {
            try {
                userId = getCustomerUser()?._id || null;
            } catch (_) {
                userId = null;
            }
        }

        while (queue.length > 0) {
            const events = queue.splice(0, MAX_EVENTS_PER_POST);
            transmit(JSON.stringify({ deviceId, sessionId, userId, events }), preferBeacon);
        }
    } catch (_) {
        queue = [];
    }
};

const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
    }, FLUSH_INTERVAL_MS);
};

const track = (type, payload = {}) => {
    try {
        if (!canTrack()) return;

        touchSession();
        const event = {
            type,
            t: Date.now(),
            path: window.location.pathname || "",
            ...payload,
        };

        if (pendingNewSession) {
            event.isNewSession = true;
            const referrer = externalReferrer();
            if (referrer) event.referrer = referrer;
            pendingNewSession = false;
        }

        queue.push(event);
        if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);

        if (queue.length >= FLUSH_AT_COUNT) flush();
        else scheduleFlush();
    } catch (_) {
        /* never break the page */
    }
};

// One business_view per (session, business) — guards against remounts and
// back/forward revisits inflating view counts.
const alreadyViewed = (businessId) => {
    try {
        const list = JSON.parse(storeGet(BUSINESS_VIEW_KEY) || "[]");
        if (!Array.isArray(list)) return false;
        if (list.includes(businessId)) return true;
        list.push(businessId);
        if (list.length > 100) list.shift();
        storeSet(BUSINESS_VIEW_KEY, JSON.stringify(list));
        return false;
    } catch (_) {
        return false;
    }
};

export const trackPageView = (path) => {
    track("page_view", typeof path === "string" && path ? { path } : {});
};

export const trackBusinessView = (businessId, name) => {
    try {
        if (!businessId || !canTrack()) return;
        const id = String(businessId);
        if (alreadyViewed(id)) return;
        track("business_view", { biz: { businessId: id, name: name || "" } });
    } catch (_) {
        /* ignore */
    }
};

export const trackBusinessClick = (businessId, name, action, source) => {
    if (!businessId || !action) return;
    track("business_click", {
        biz: { businessId: String(businessId), name: name || "", action, source: source || "card" },
    });
};

export const trackSearch = ({ query, location, resultsCount, known } = {}) => {
    if (!query) return;
    track("search", {
        search: {
            query: String(query),
            location: location ? String(location) : "",
            results: Number.isFinite(resultsCount) ? resultsCount : null,
            known: known === true,
        },
    });
};

export const trackSearchResultClick = (businessId, name, position) => {
    if (!businessId) return;
    track("search_result_click", {
        biz: { businessId: String(businessId), name: name || "" },
        search: { position: Number.isFinite(position) ? position : null },
    });
};

// Called when an anonymous visitor logs in (OTP success): flush what was
// queued as anonymous, then attribute everything after to the user.
export const identify = (userId) => {
    try {
        flush();
        userIdOverride = userId ? String(userId) : null;
    } catch (_) {
        /* ignore */
    }
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush(true);
    });
    window.addEventListener("pagehide", () => flush(true));
}
