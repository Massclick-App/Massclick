import { createHash } from "crypto";
import mongoose from "mongoose";
import webEventModel from "../../model/webAnalytics/webEventModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import {
    EVENT_TYPES,
    BUSINESS_ACTIONS,
    BUSINESS_SOURCES,
    DEVICE_TYPES,
    PLATFORMS,
} from "../../schema/webAnalytics/webEventSchema.js";

const MAX_EVENTS_PER_BATCH = 25;
const MAX_BODY_CHARS = 20000;
const MAX_CLIENT_CLOCK_SKEW_MS = 30 * 60 * 1000;
const DASHBOARD_TIMEZONE = "Asia/Kolkata";

const BOT_UA_RE = /bot|crawl|spider|slurp|headless|lighthouse|prerender|phantom|puppeteer|playwright/i;
// Lower bounds are loose: Math.random().toString(36) can emit short strings.
// `web_` is the browser tracker; `app_` is the mobile tracker.
const DEVICE_ID_RE = /^(web|app)_[a-z0-9]{4,60}$/i;
const SESSION_ID_RE = /^s_[a-z0-9]{4,60}$/i;
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

const BIZ_EVENT_TYPES = new Set(["business_view", "business_click", "search_result_click"]);
const LEAD_ACTIONS = new Set(["call", "whatsapp", "enquiry"]);

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

// Coarse UA classification — enough for a device/browser split without a
// parser dependency. Android tablets without "Mobi" land in desktop.
export const parseUserAgent = (ua = "") => {
    let device = "other";
    if (ua) {
        if (/ipad|tablet/i.test(ua)) device = "tablet";
        else if (/mobi|android|iphone/i.test(ua)) device = "mobile";
        else device = "desktop";
    }

    let browser = "Other";
    if (/edg(a|ios)?\//i.test(ua)) browser = "Edge";
    else if (/opr\/|opera/i.test(ua)) browser = "Opera";
    else if (/samsungbrowser/i.test(ua)) browser = "Samsung";
    else if (/firefox\/|fxios/i.test(ua)) browser = "Firefox";
    else if (/chrome\/|crios/i.test(ua)) browser = "Chrome";
    else if (/safari\//i.test(ua)) browser = "Safari";

    return { device, browser };
};

// Short hash of IP + user-agent for abuse dedup. Raw IP is never stored.
const requestFingerprint = (req, ua) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    return createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 12);
};

const capString = (value, max) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const capInt = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const int = Math.floor(n);
    return int >= min && int <= max ? int : null;
};

// Beacons can arrive late; accept up to 30 min of client-side buffering but
// never trust timestamps from the future.
const clampTimestamp = (t, nowMs) => {
    const n = Number(t);
    if (!Number.isFinite(n) || n < nowMs - MAX_CLIENT_CLOCK_SKEW_MS || n > nowMs) {
        return new Date(nowMs);
    }
    return new Date(n);
};

const sanitizeEvent = (raw, envelope, enrichment, nowMs) => {
    if (!raw || typeof raw !== "object") return null;
    if (!EVENT_TYPES.includes(raw.type)) return null;

    const isNewSession = raw.isNewSession === true;
    const doc = {
        type: raw.type,
        ts: clampTimestamp(raw.t, nowMs),
        sessionId: envelope.sessionId,
        deviceId: envelope.deviceId,
        userId: envelope.userId,
        platform: envelope.platform,
        appVersion: envelope.appVersion,
        osVersion: envelope.osVersion,
        deviceModel: envelope.deviceModel,
        isNewSession,
        path: capString(raw.path, 512),
        referrer: isNewSession ? capString(raw.referrer, 512) : "",
        device: enrichment.device,
        browser: enrichment.browser,
        fp: enrichment.fp,
    };

    if (isNewSession && raw.utm && typeof raw.utm === "object") {
        doc.utm = {
            source: capString(raw.utm.source, 80),
            medium: capString(raw.utm.medium, 80),
            campaign: capString(raw.utm.campaign, 80),
            term: capString(raw.utm.term, 80),
            content: capString(raw.utm.content, 80),
        };
    }

    if (BIZ_EVENT_TYPES.has(raw.type)) {
        const biz = raw.biz || {};
        if (typeof biz.businessId !== "string" || !OBJECT_ID_RE.test(biz.businessId)) return null;
        doc.biz = {
            businessId: new mongoose.Types.ObjectId(biz.businessId),
            name: capString(biz.name, 160),
        };
        if (raw.type === "business_click") {
            if (!BUSINESS_ACTIONS.includes(biz.action)) return null;
            doc.biz.action = biz.action;
            doc.biz.source = BUSINESS_SOURCES.includes(biz.source) ? biz.source : "card";
        }
    }

    if (raw.type === "search") {
        const search = raw.search || {};
        const query = capString(search.query, 160);
        if (!query) return null;
        doc.search = {
            query,
            location: capString(search.location, 120),
            results: capInt(search.results, 0, 100000),
            known: search.known === true,
        };
    }

    if (raw.type === "search_result_click") {
        const search = raw.search || {};
        doc.search = { position: capInt(search.position, 1, 500) };
    }

    return doc;
};

// Lifetime counters on the business document — this is what the "popular"
// sort reads, so views/clicks/leads finally reflect real visitor behavior.
const applyBusinessCounters = async (docs) => {
    const byBusiness = new Map();

    for (const doc of docs) {
        if (doc.type !== "business_view" && doc.type !== "business_click") continue;
        const key = doc.biz.businessId.toString();
        const entry = byBusiness.get(key) || { views: 0, clicks: 0, leads: 0 };
        if (doc.type === "business_view") entry.views += 1;
        else {
            entry.clicks += 1;
            if (LEAD_ACTIONS.has(doc.biz.action)) entry.leads += 1;
        }
        byBusiness.set(key, entry);
    }

    if (byBusiness.size === 0) return;

    const now = new Date();
    const ops = [...byBusiness.entries()].map(([id, counts]) => {
        const inc = {};
        if (counts.views) inc["analytics.views"] = counts.views;
        if (counts.clicks) inc["analytics.clicks"] = counts.clicks;
        if (counts.leads) inc["analytics.leads"] = counts.leads;
        const update = { $inc: inc };
        if (counts.views) update.$set = { "analytics.lastViewedAt": now };
        return {
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update,
            },
        };
    });

    await businessListModel.bulkWrite(ops, { ordered: false });
};

// Validates and stores a batch. Invalid input is dropped silently — the
// ingest endpoint always answers 204 so probes learn nothing.
export const ingestEvents = async (req) => {
    const ua = req.headers["user-agent"] || "";
    if (!ua || BOT_UA_RE.test(ua)) return { inserted: 0 };

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return { inserted: 0 };

    const { events } = body;
    if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS_PER_BATCH) {
        return { inserted: 0 };
    }

    try {
        if (JSON.stringify(body).length > MAX_BODY_CHARS) return { inserted: 0 };
    } catch {
        return { inserted: 0 };
    }

    if (typeof body.deviceId !== "string" || !DEVICE_ID_RE.test(body.deviceId)) return { inserted: 0 };
    if (typeof body.sessionId !== "string" || !SESSION_ID_RE.test(body.sessionId)) return { inserted: 0 };

    // Platform and app build info are envelope-level: one device per batch.
    // The web tracker sends none of these, so absent values collapse to the
    // web defaults. App-only fields are dropped for web so a spoofed web
    // batch can't smuggle them in.
    const platform = PLATFORMS.includes(body.platform) ? body.platform : "web";
    const isApp = platform !== "web";

    const envelope = {
        deviceId: body.deviceId,
        sessionId: body.sessionId,
        userId:
            typeof body.userId === "string" && OBJECT_ID_RE.test(body.userId)
                ? new mongoose.Types.ObjectId(body.userId)
                : null,
        platform,
        appVersion: isApp ? capString(body.appVersion, 40) : "",
        osVersion: isApp ? capString(body.osVersion, 40) : "",
        deviceModel: isApp ? capString(body.deviceModel, 80) : "",
    };

    const { device, browser } = parseUserAgent(ua);
    const enrichment = { device, browser, fp: requestFingerprint(req, ua) };
    const nowMs = Date.now();

    const docs = events
        .map((raw) => sanitizeEvent(raw, envelope, enrichment, nowMs))
        .filter(Boolean);

    if (docs.length === 0) return { inserted: 0 };

    await webEventModel.insertMany(docs, { ordered: false });

    applyBusinessCounters(docs).catch((err) => {
        console.warn(`[SiteEvents] business counter update failed: ${err.message}`);
    });

    return { inserted: docs.length };
};

// ---------------------------------------------------------------------------
// Dashboard aggregations
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;
const MAX_TREND_DAYS = 366;

const clampDays = (days) => Math.min(Math.max(parseInt(days, 10) || 28, 1), 365);
const clampLimit = (limit, fallback = 25, max = 500) =>
    Math.min(Math.max(parseInt(limit, 10) || fallback, 1), max);
const clampPage = (page) => Math.max(parseInt(page, 10) || 1, 1);

// Escapes user text before it is used inside a MongoDB $regex, so a query like
// "a.b" matches literally instead of as a wildcard.
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const rangeForDays = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * DAY_MS);
    const previousStart = new Date(end.getTime() - 2 * days * DAY_MS);
    return { start, end, previousStart };
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const IST_UTC_OFFSET = "+05:30";

// A bare "YYYY-MM-DD" from the dashboard is interpreted in IST — not UTC — so
// a custom range lines up with the IST day buckets used for grouping. The end
// date is inclusive, so it advances to the start of the next IST day.
const parseBoundary = (value, { inclusiveEnd = false } = {}) => {
    if (!value) return null;
    const raw = String(value).trim();

    if (DATE_ONLY_RE.test(raw)) {
        const midnight = new Date(`${raw}T00:00:00${IST_UTC_OFFSET}`);
        if (Number.isNaN(midnight.getTime())) return null;
        return inclusiveEnd ? new Date(midnight.getTime() + DAY_MS) : midnight;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Resolves the active window from either an explicit start/end pair (custom
// range) or a preset day count. The comparison window is always the
// equal-length span immediately before `start`, so period-over-period deltas
// stay meaningful in both modes.
const resolveRange = (query = {}) => {
    const startBoundary = parseBoundary(query.start);
    const endBoundary = parseBoundary(query.end, { inclusiveEnd: true });

    if (startBoundary || endBoundary) {
        const end = endBoundary || new Date();
        let start = startBoundary || new Date(end.getTime() - 28 * DAY_MS);
        if (start.getTime() >= end.getTime()) start = new Date(end.getTime() - DAY_MS);
        const spanMs = end.getTime() - start.getTime();
        const previousStart = new Date(start.getTime() - spanMs);
        const days = Math.max(Math.round(spanMs / DAY_MS), 1);
        return { start, end, previousStart, days, custom: true };
    }

    const days = clampDays(query.days);
    const { start, end, previousStart } = rangeForDays(days);
    return { start, end, previousStart, days, custom: false };
};

// The device / browser slice on its own, with no time bound. Used by the
// first-seen lookups that must look further back than the active window.
const dimensionMatch = (query = {}) => {
    const match = {};
    // Accepts one platform or a comma-separated list ("android,ios"), so the
    // app dashboard can show every app platform in a single view.
    //
    // Rows written before the platform field existed store nothing for it, and
    // aggregations never see mongoose defaults — so the web pin must also
    // match missing values ($in with null matches absent fields). No platform
    // param means no filter, which keeps pre-existing dashboard calls intact.
    const platforms = String(query.platform || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => PLATFORMS.includes(value));
    if (platforms.length) {
        const values = platforms.includes("web") ? [...platforms, null] : platforms;
        match.platform = values.length === 1 ? values[0] : { $in: values };
    }
    if (query.device && DEVICE_TYPES.includes(query.device)) match.device = query.device;
    if (query.browser) match.browser = query.browser;
    return match;
};

// device / browser filters apply to any event-level aggregation. Returns a new
// $match object combining the time window with the optional dimension filters.
const baseMatch = (start, end, query = {}) => ({
    ts: { $gte: start, $lt: end },
    ...dimensionMatch(query),
});

// A visitor is "new" when their first-ever event (within the 90-day raw
// retention window) falls inside the active range — so this deliberately looks
// outside the window to tell a returning device from a first-time one.
const countNewVisitors = async (start, end, query) => {
    const scope = dimensionMatch(query);
    const [row] = await webEventModel.aggregate([
        ...(Object.keys(scope).length ? [{ $match: scope }] : []),
        { $group: { _id: "$deviceId", firstSeen: { $min: "$ts" } } },
        { $match: { firstSeen: { $gte: start, $lt: end } } },
        { $count: "n" },
    ]);
    return row?.n || 0;
};

const percent = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

const sortDir = (dir) => (dir === "asc" ? 1 : -1);

const istDayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

// Distinct counts use two-stage $group -> $count (never $addToSet) so memory
// stays bounded regardless of traffic volume.
const overviewForRange = async (start, end, query) => {
    const [result] = await webEventModel.aggregate([
        { $match: baseMatch(start, end, query) },
        {
            $facet: {
                byType: [{ $group: { _id: "$type", n: { $sum: 1 } } }],
                sessions: [{ $group: { _id: "$sessionId" } }, { $count: "n" }],
                visitors: [{ $group: { _id: "$deviceId" } }, { $count: "n" }],
                identified: [
                    { $match: { userId: { $ne: null } } },
                    { $group: { _id: "$userId" } },
                    { $count: "n" },
                ],
                // A bounce is a session that never got past its first page.
                bounce: [
                    {
                        $group: {
                            _id: "$sessionId",
                            pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            sessions: { $sum: 1 },
                            bounced: { $sum: { $cond: [{ $lte: ["$pageViews", 1] }, 1, 0] } },
                        },
                    },
                ],
                // Form submissions are enquiry-form clicks on a listing.
                enquiries: [
                    { $match: { type: "business_click", "biz.action": "enquiry" } },
                    { $count: "n" },
                ],
                leads: [
                    { $match: { type: "business_click", "biz.action": { $in: [...LEAD_ACTIONS] } } },
                    { $count: "n" },
                ],
            },
        },
    ]);

    const counts = {};
    for (const row of result?.byType || []) counts[row._id] = row.n;

    const sessions = result?.sessions?.[0]?.n || 0;
    const pageViews = counts.page_view || 0;
    const bounce = result?.bounce?.[0] || { sessions: 0, bounced: 0 };

    return {
        pageViews,
        sessions,
        visitors: result?.visitors?.[0]?.n || 0,
        identifiedUsers: result?.identified?.[0]?.n || 0,
        pagesPerSession: sessions ? Math.round((pageViews / sessions) * 100) / 100 : 0,
        businessViews: counts.business_view || 0,
        interactions: counts.business_click || 0,
        searches: counts.search || 0,
        resultClicks: counts.search_result_click || 0,
        bounceRate: percent(bounce.bounced, bounce.sessions),
        formSubmissions: result?.enquiries?.[0]?.n || 0,
        leads: result?.leads?.[0]?.n || 0,
    };
};

export const getOverview = async (query) => {
    const { start, end, previousStart, days } = resolveRange(query);

    const [current, previous, newVisitors, previousNewVisitors] = await Promise.all([
        overviewForRange(start, end, query),
        overviewForRange(previousStart, start, query),
        countNewVisitors(start, end, query),
        countNewVisitors(previousStart, start, query),
    ]);

    return {
        days,
        current: { ...current, newVisitors },
        previous: { ...previous, newVisitors: previousNewVisitors },
    };
};

export const getTrends = async (query) => {
    const { start, end, days } = resolveRange(query);
    const dayExpr = {
        $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: DASHBOARD_TIMEZONE },
    };

    const typeSum = (type) => ({ $sum: { $cond: [{ $eq: ["$type", type] }, 1, 0] } });
    const scope = dimensionMatch(query);

    const [[result], newVisitorRows] = await Promise.all([
        webEventModel.aggregate([
            { $match: baseMatch(start, end, query) },
            {
                $facet: {
                    bySession: [
                        {
                            $group: {
                                _id: { day: dayExpr, sessionId: "$sessionId" },
                                pageViews: typeSum("page_view"),
                                businessViews: typeSum("business_view"),
                                businessClicks: typeSum("business_click"),
                                searches: typeSum("search"),
                                resultClicks: typeSum("search_result_click"),
                                formSubmissions: {
                                    $sum: { $cond: [{ $eq: ["$biz.action", "enquiry"] }, 1, 0] },
                                },
                                leads: {
                                    $sum: { $cond: [{ $in: ["$biz.action", [...LEAD_ACTIONS]] }, 1, 0] },
                                },
                            },
                        },
                        {
                            $group: {
                                _id: "$_id.day",
                                sessions: { $sum: 1 },
                                pageViews: { $sum: "$pageViews" },
                                businessViews: { $sum: "$businessViews" },
                                businessClicks: { $sum: "$businessClicks" },
                                searches: { $sum: "$searches" },
                                resultClicks: { $sum: "$resultClicks" },
                                formSubmissions: { $sum: "$formSubmissions" },
                                leads: { $sum: "$leads" },
                                bounced: { $sum: { $cond: [{ $lte: ["$pageViews", 1] }, 1, 0] } },
                            },
                        },
                    ],
                    byVisitor: [
                        { $group: { _id: { day: dayExpr, deviceId: "$deviceId" } } },
                        { $group: { _id: "$_id.day", visitors: { $sum: 1 } } },
                    ],
                },
            },
        ]),
        // New visitors per day: bucketed by each device's first-ever event, so
        // this pipeline is deliberately not bounded by the active window.
        webEventModel.aggregate([
            ...(Object.keys(scope).length ? [{ $match: scope }] : []),
            { $group: { _id: "$deviceId", firstSeen: { $min: "$ts" } } },
            { $match: { firstSeen: { $gte: start, $lt: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$firstSeen", timezone: DASHBOARD_TIMEZONE } },
                    n: { $sum: 1 },
                },
            },
        ]),
    ]);

    const sessionRows = new Map((result?.bySession || []).map((row) => [row._id, row]));
    const visitorRows = new Map((result?.byVisitor || []).map((row) => [row._id, row.visitors]));
    const newVisitorsByDay = new Map((newVisitorRows || []).map((row) => [row._id, row.n]));

    // Emit a row for every calendar day in the window so charts render gapless.
    // Stepping forward from `start` covers both preset and custom ranges; IST
    // has no DST, so each 24h step advances the local date by exactly one.
    const trend = [];
    const seen = new Set();
    const dayCount = Math.min(Math.max(Math.ceil((end.getTime() - start.getTime()) / DAY_MS), 1), MAX_TREND_DAYS);
    for (let i = 0; i < dayCount; i += 1) {
        const day = istDayFormatter.format(new Date(start.getTime() + i * DAY_MS));
        if (seen.has(day)) continue;
        seen.add(day);
        const row = sessionRows.get(day);
        const sessions = row?.sessions || 0;
        const pageViews = row?.pageViews || 0;
        trend.push({
            date: day,
            visitors: visitorRows.get(day) || 0,
            newVisitors: newVisitorsByDay.get(day) || 0,
            sessions,
            pageViews,
            businessViews: row?.businessViews || 0,
            businessClicks: row?.businessClicks || 0,
            searches: row?.searches || 0,
            resultClicks: row?.resultClicks || 0,
            formSubmissions: row?.formSubmissions || 0,
            leads: row?.leads || 0,
            pagesPerSession: sessions ? Math.round((pageViews / sessions) * 100) / 100 : 0,
            bounceRate: percent(row?.bounced || 0, sessions),
        });
    }

    return { days, trend };
};

export const getTopPages = async (query) => {
    const { start, end, days } = resolveRange(query);
    const limit = clampLimit(query.limit);
    const page = clampPage(query.page);
    const sortField = query.sort === "sessions" ? "sessions" : "views";
    const dir = sortDir(query.dir);
    const q = typeof query.q === "string" ? query.q.trim() : "";

    const match = { ...baseMatch(start, end, query), type: "page_view" };
    if (q) match.path = { $regex: escapeRegex(q), $options: "i" };

    const [result] = await webEventModel.aggregate([
        { $match: match },
        { $group: { _id: { path: "$path", sessionId: "$sessionId" }, n: { $sum: 1 } } },
        { $group: { _id: "$_id.path", views: { $sum: "$n" }, sessions: { $sum: 1 } } },
        {
            $facet: {
                data: [
                    { $sort: { [sortField]: dir, _id: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    { $project: { _id: 0, path: "$_id", views: 1, sessions: 1 } },
                ],
                total: [{ $count: "n" }],
                grand: [
                    { $group: { _id: null, views: { $sum: "$views" }, sessions: { $sum: "$sessions" } } },
                ],
            },
        },
    ]);

    return {
        days,
        page,
        limit,
        total: result?.total?.[0]?.n || 0,
        totals: {
            views: result?.grand?.[0]?.views || 0,
            sessions: result?.grand?.[0]?.sessions || 0,
        },
        pages: result?.data || [],
    };
};

export const getTopBusinesses = async (query) => {
    const { start, end, days } = resolveRange(query);
    const limit = clampLimit(query.limit);
    const page = clampPage(query.page);
    const dir = sortDir(query.dir);
    const sortField = ["views", "clicks", "leads"].includes(query.sort) ? query.sort : "views";
    const q = typeof query.q === "string" ? query.q.trim() : "";

    const match = {
        ...baseMatch(start, end, query),
        type: { $in: ["business_view", "business_click"] },
        "biz.businessId": { $exists: true },
    };
    if (q) match["biz.name"] = { $regex: escapeRegex(q), $options: "i" };

    const actionSum = (action) => ({
        $sum: { $cond: [{ $eq: ["$biz.action", action] }, 1, 0] },
    });

    const [result] = await webEventModel.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$biz.businessId",
                name: { $max: "$biz.name" },
                views: { $sum: { $cond: [{ $eq: ["$type", "business_view"] }, 1, 0] } },
                clicks: { $sum: { $cond: [{ $eq: ["$type", "business_click"] }, 1, 0] } },
                call: actionSum("call"),
                whatsapp: actionSum("whatsapp"),
                direction: actionSum("direction"),
                enquiry: actionSum("enquiry"),
                showNumber: actionSum("show_number"),
            },
        },
        // Leads mirror the ingest definition: call + whatsapp + enquiry.
        { $addFields: { leads: { $add: ["$call", "$whatsapp", "$enquiry"] } } },
        {
            $facet: {
                data: [
                    { $sort: { [sortField]: dir, views: -1, _id: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            businessId: "$_id",
                            name: 1,
                            views: 1,
                            clicks: 1,
                            leads: 1,
                            actions: {
                                call: "$call",
                                whatsapp: "$whatsapp",
                                direction: "$direction",
                                enquiry: "$enquiry",
                                showNumber: "$showNumber",
                            },
                        },
                    },
                ],
                total: [{ $count: "n" }],
                grand: [
                    {
                        $group: {
                            _id: null,
                            views: { $sum: "$views" },
                            clicks: { $sum: "$clicks" },
                            leads: { $sum: "$leads" },
                        },
                    },
                ],
            },
        },
    ]);

    return {
        days,
        page,
        limit,
        total: result?.total?.[0]?.n || 0,
        totals: {
            views: result?.grand?.[0]?.views || 0,
            clicks: result?.grand?.[0]?.clicks || 0,
            leads: result?.grand?.[0]?.leads || 0,
        },
        businesses: result?.data || [],
    };
};

// ---------------------------------------------------------------------------
// Traffic sources / campaigns
// ---------------------------------------------------------------------------

// Attributes each session to a source/medium/campaign. QR codes, printed
// banners, and paid ads carry ?utm_* params on the landing URL (they have no
// referrer at all); everything else falls back to the referring URL, or
// "(direct)" when there's neither. $max in the first $group picks out the
// single non-empty value stamped on the session's landing event — every other
// event in the session stores "" for these fields.
export const getCampaigns = async (query) => {
    const { start, end, days } = resolveRange(query);
    const limit = clampLimit(query.limit);
    const page = clampPage(query.page);
    const dir = sortDir(query.dir);
    const sortField = ["sessions", "visitors", "leads"].includes(query.sort) ? query.sort : "sessions";
    const q = typeof query.q === "string" ? query.q.trim() : "";

    const [result] = await webEventModel.aggregate([
        { $match: baseMatch(start, end, query) },
        {
            $group: {
                _id: "$sessionId",
                utmSource: { $max: { $ifNull: ["$utm.source", ""] } },
                utmMedium: { $max: { $ifNull: ["$utm.medium", ""] } },
                utmCampaign: { $max: { $ifNull: ["$utm.campaign", ""] } },
                referrer: { $max: { $ifNull: ["$referrer", ""] } },
                deviceId: { $first: "$deviceId" },
                leads: { $sum: { $cond: [{ $in: ["$biz.action", [...LEAD_ACTIONS]] }, 1, 0] } },
            },
        },
        {
            $addFields: {
                hasUtm: { $or: [{ $ne: ["$utmSource", ""] }, { $ne: ["$utmMedium", ""] }, { $ne: ["$utmCampaign", ""] }] },
                hasReferrer: { $ne: ["$referrer", ""] },
            },
        },
        {
            $addFields: {
                source: {
                    $cond: [
                        "$hasUtm",
                        { $cond: [{ $ne: ["$utmSource", ""] }, "$utmSource", "(not set)"] },
                        { $cond: ["$hasReferrer", "$referrer", "(direct)"] },
                    ],
                },
                medium: {
                    $cond: [
                        "$hasUtm",
                        { $cond: [{ $ne: ["$utmMedium", ""] }, "$utmMedium", "(not set)"] },
                        { $cond: ["$hasReferrer", "referral", "(none)"] },
                    ],
                },
                campaign: {
                    $cond: ["$hasUtm", { $cond: [{ $ne: ["$utmCampaign", ""] }, "$utmCampaign", "(not set)"] }, "(direct)"],
                },
            },
        },
        ...(q
            ? [
                  {
                      $match: {
                          $or: [
                              { source: { $regex: escapeRegex(q), $options: "i" } },
                              { medium: { $regex: escapeRegex(q), $options: "i" } },
                              { campaign: { $regex: escapeRegex(q), $options: "i" } },
                          ],
                      },
                  },
              ]
            : []),
        {
            $group: {
                _id: { source: "$source", medium: "$medium", campaign: "$campaign", deviceId: "$deviceId" },
                sessions: { $sum: 1 },
                leads: { $sum: "$leads" },
            },
        },
        {
            $group: {
                _id: { source: "$_id.source", medium: "$_id.medium", campaign: "$_id.campaign" },
                sessions: { $sum: "$sessions" },
                visitors: { $sum: 1 },
                leads: { $sum: "$leads" },
            },
        },
        {
            $facet: {
                data: [
                    { $sort: { [sortField]: dir, "_id.source": 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            source: "$_id.source",
                            medium: "$_id.medium",
                            campaign: "$_id.campaign",
                            sessions: 1,
                            visitors: 1,
                            leads: 1,
                        },
                    },
                ],
                total: [{ $count: "n" }],
                grand: [
                    {
                        $group: {
                            _id: null,
                            sessions: { $sum: "$sessions" },
                            visitors: { $sum: "$visitors" },
                            leads: { $sum: "$leads" },
                        },
                    },
                ],
            },
        },
    ]);

    return {
        days,
        page,
        limit,
        total: result?.total?.[0]?.n || 0,
        totals: {
            sessions: result?.grand?.[0]?.sessions || 0,
            visitors: result?.grand?.[0]?.visitors || 0,
            leads: result?.grand?.[0]?.leads || 0,
        },
        campaigns: result?.data || [],
    };
};

export const getTopSearches = async (query) => {
    const { start, end, days } = resolveRange(query);
    const limit = clampLimit(query.limit);
    const page = clampPage(query.page);
    const dir = sortDir(query.dir);
    const sortField = ["count", "avgResults", "zeroResults"].includes(query.sort) ? query.sort : "count";
    const q = typeof query.q === "string" ? query.q.trim() : "";
    const zeroOnly = query.zeroOnly === "true" || query.zeroOnly === true;

    // typed = the visitor typed a free-text query (known === false);
    // category = the search came from browsing a known category (known === true).
    const listMatch = { ...baseMatch(start, end, query), type: "search" };
    if (query.searchType === "typed") listMatch["search.known"] = false;
    else if (query.searchType === "category") listMatch["search.known"] = true;
    if (zeroOnly) listMatch["search.results"] = 0;
    if (q) listMatch["search.query"] = { $regex: escapeRegex(q), $options: "i" };

    // Period totals ignore the list-level filters (type toggle / search text) so
    // the typed-vs-category composition line always describes the whole window.
    const totalsMatch = { ...baseMatch(start, end, query), type: "search" };

    const [listResult, totalsRow] = await Promise.all([
        webEventModel.aggregate([
            { $match: listMatch },
            {
                $group: {
                    _id: {
                        query: { $toLower: { $ifNull: ["$search.query", ""] } },
                        location: { $ifNull: ["$search.location", ""] },
                    },
                    count: { $sum: 1 },
                    typedCount: { $sum: { $cond: [{ $eq: ["$search.known", false] }, 1, 0] } },
                    resultSum: { $sum: { $ifNull: ["$search.results", 0] } },
                    resultCount: { $sum: { $cond: [{ $ne: ["$search.results", null] }, 1, 0] } },
                    zeroResults: { $sum: { $cond: [{ $eq: ["$search.results", 0] }, 1, 0] } },
                },
            },
            { $sort: { "_id.query": 1, count: -1, "_id.location": 1 } },
            {
                $group: {
                    _id: "$_id.query",
                    count: { $sum: "$count" },
                    typedCount: { $sum: "$typedCount" },
                    resultSum: { $sum: "$resultSum" },
                    resultCount: { $sum: "$resultCount" },
                    zeroResults: { $sum: "$zeroResults" },
                    topLocation: { $first: "$_id.location" },
                },
            },
            { $match: { _id: { $ne: "" } } },
            {
                $addFields: {
                    avgResults: {
                        $round: [
                            {
                                $cond: [
                                    { $gt: ["$resultCount", 0] },
                                    { $divide: ["$resultSum", "$resultCount"] },
                                    0,
                                ],
                            },
                            1,
                        ],
                    },
                },
            },
            {
                $facet: {
                    data: [
                        { $sort: { [sortField]: dir, _id: 1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 0,
                                query: "$_id",
                                count: 1,
                                typedCount: 1,
                                avgResults: 1,
                                zeroResults: 1,
                                location: "$topLocation",
                            },
                        },
                    ],
                    total: [{ $count: "n" }],
                },
            },
        ]),
        webEventModel.aggregate([
            { $match: totalsMatch },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    typed: { $sum: { $cond: [{ $eq: ["$search.known", false] }, 1, 0] } },
                },
            },
        ]),
    ]);

    const result = listResult?.[0] || {};
    const totals = totalsRow?.[0] || { total: 0, typed: 0 };

    return {
        days,
        page,
        limit,
        total: result?.total?.[0]?.n || 0,
        totalSearches: totals.total,
        typedSearches: totals.typed,
        categorySearches: totals.total - totals.typed,
        searches: result?.data || [],
    };
};

export const getDevices = async (query) => {
    const { start, end, days } = resolveRange(query);

    const [result] = await webEventModel.aggregate([
        { $match: baseMatch(start, end, query) },
        {
            $facet: {
                devices: [
                    { $group: { _id: { device: "$device", deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.device", visitors: { $sum: 1 } } },
                    { $sort: { visitors: -1 } },
                    { $project: { _id: 0, device: "$_id", visitors: 1 } },
                ],
                browsers: [
                    { $group: { _id: { browser: "$browser", deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.browser", visitors: { $sum: 1 } } },
                    { $sort: { visitors: -1 } },
                    { $limit: 12 },
                    { $project: { _id: 0, browser: "$_id", visitors: 1 } },
                ],
            },
        },
    ]);

    return {
        days,
        devices: result?.devices || [],
        browsers: result?.browsers || [],
    };
};

// The app panel's counterpart to getDevices: visitor split by platform and by
// app version. Rows with no appVersion (all web traffic) are excluded from
// the version facet rather than showing up as a giant "" bucket.
export const getAppVersions = async (query) => {
    const { start, end, days } = resolveRange(query);

    const [result] = await webEventModel.aggregate([
        { $match: baseMatch(start, end, query) },
        {
            $facet: {
                platforms: [
                    { $group: { _id: { platform: { $ifNull: ["$platform", "web"] }, deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.platform", visitors: { $sum: 1 } } },
                    { $sort: { visitors: -1 } },
                    { $project: { _id: 0, platform: "$_id", visitors: 1 } },
                ],
                appVersions: [
                    { $match: { appVersion: { $nin: ["", null] } } },
                    { $group: { _id: { appVersion: "$appVersion", deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.appVersion", visitors: { $sum: 1 } } },
                    { $sort: { visitors: -1 } },
                    { $limit: 12 },
                    { $project: { _id: 0, appVersion: "$_id", visitors: 1 } },
                ],
                osVersions: [
                    { $match: { osVersion: { $nin: ["", null] } } },
                    { $group: { _id: { osVersion: "$osVersion", deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.osVersion", visitors: { $sum: 1 } } },
                    { $sort: { visitors: -1 } },
                    { $limit: 12 },
                    { $project: { _id: 0, osVersion: "$_id", visitors: 1 } },
                ],
            },
        },
    ]);

    return {
        days,
        platforms: result?.platforms || [],
        appVersions: result?.appVersions || [],
        osVersions: result?.osVersions || [],
    };
};
