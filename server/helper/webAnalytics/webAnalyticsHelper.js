import { createHash } from "crypto";
import mongoose from "mongoose";
import webEventModel from "../../model/webAnalytics/webEventModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import {
    EVENT_TYPES,
    BUSINESS_ACTIONS,
    BUSINESS_SOURCES,
} from "../../schema/webAnalytics/webEventSchema.js";

const MAX_EVENTS_PER_BATCH = 25;
const MAX_BODY_CHARS = 20000;
const MAX_CLIENT_CLOCK_SKEW_MS = 30 * 60 * 1000;
const DASHBOARD_TIMEZONE = "Asia/Kolkata";

const BOT_UA_RE = /bot|crawl|spider|slurp|headless|lighthouse|prerender|phantom|puppeteer|playwright/i;
// Lower bounds are loose: Math.random().toString(36) can emit short strings.
const DEVICE_ID_RE = /^web_[a-z0-9]{4,60}$/i;
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
        isNewSession,
        path: capString(raw.path, 512),
        referrer: isNewSession ? capString(raw.referrer, 512) : "",
        device: enrichment.device,
        browser: enrichment.browser,
        fp: enrichment.fp,
    };

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

    const envelope = {
        deviceId: body.deviceId,
        sessionId: body.sessionId,
        userId:
            typeof body.userId === "string" && OBJECT_ID_RE.test(body.userId)
                ? new mongoose.Types.ObjectId(body.userId)
                : null,
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

const clampDays = (days) => Math.min(Math.max(parseInt(days, 10) || 28, 1), 365);
const clampLimit = (limit, fallback = 10) => Math.min(Math.max(parseInt(limit, 10) || fallback, 1), 100);

const rangeForDays = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const previousStart = new Date(end.getTime() - 2 * days * 86400000);
    return { start, end, previousStart };
};

const istDayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

// Distinct counts use two-stage $group -> $count (never $addToSet) so memory
// stays bounded regardless of traffic volume.
const overviewForRange = async (start, end) => {
    const [result] = await webEventModel.aggregate([
        { $match: { ts: { $gte: start, $lt: end } } },
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
            },
        },
    ]);

    const counts = {};
    for (const row of result?.byType || []) counts[row._id] = row.n;

    const sessions = result?.sessions?.[0]?.n || 0;
    const pageViews = counts.page_view || 0;

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
    };
};

export const getOverview = async (days) => {
    const safeDays = clampDays(days);
    const { start, end, previousStart } = rangeForDays(safeDays);

    const [current, previous] = await Promise.all([
        overviewForRange(start, end),
        overviewForRange(previousStart, start),
    ]);

    return { days: safeDays, current, previous };
};

export const getTrends = async (days) => {
    const safeDays = clampDays(days);
    const { start, end } = rangeForDays(safeDays);
    const dayExpr = {
        $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: DASHBOARD_TIMEZONE },
    };

    const [result] = await webEventModel.aggregate([
        { $match: { ts: { $gte: start, $lt: end } } },
        {
            $facet: {
                bySession: [
                    {
                        $group: {
                            _id: { day: dayExpr, sessionId: "$sessionId" },
                            pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
                            businessClicks: { $sum: { $cond: [{ $eq: ["$type", "business_click"] }, 1, 0] } },
                            searches: { $sum: { $cond: [{ $eq: ["$type", "search"] }, 1, 0] } },
                        },
                    },
                    {
                        $group: {
                            _id: "$_id.day",
                            sessions: { $sum: 1 },
                            pageViews: { $sum: "$pageViews" },
                            businessClicks: { $sum: "$businessClicks" },
                            searches: { $sum: "$searches" },
                        },
                    },
                ],
                byVisitor: [
                    { $group: { _id: { day: dayExpr, deviceId: "$deviceId" } } },
                    { $group: { _id: "$_id.day", visitors: { $sum: 1 } } },
                ],
            },
        },
    ]);

    const sessionRows = new Map((result?.bySession || []).map((row) => [row._id, row]));
    const visitorRows = new Map((result?.byVisitor || []).map((row) => [row._id, row.visitors]));

    // Emit a row for every day in the window so charts render gapless.
    const trend = [];
    const nowMs = Date.now();
    for (let i = safeDays - 1; i >= 0; i -= 1) {
        const day = istDayFormatter.format(new Date(nowMs - i * 86400000));
        const row = sessionRows.get(day);
        trend.push({
            date: day,
            visitors: visitorRows.get(day) || 0,
            sessions: row?.sessions || 0,
            pageViews: row?.pageViews || 0,
            businessClicks: row?.businessClicks || 0,
            searches: row?.searches || 0,
        });
    }

    return { days: safeDays, trend };
};

export const getTopPages = async (days, limit) => {
    const safeDays = clampDays(days);
    const { start, end } = rangeForDays(safeDays);

    const pages = await webEventModel.aggregate([
        { $match: { type: "page_view", ts: { $gte: start, $lt: end } } },
        { $group: { _id: { path: "$path", sessionId: "$sessionId" }, n: { $sum: 1 } } },
        { $group: { _id: "$_id.path", views: { $sum: "$n" }, sessions: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: clampLimit(limit) },
        { $project: { _id: 0, path: "$_id", views: 1, sessions: 1 } },
    ]);

    return { days: safeDays, pages };
};

export const getTopBusinesses = async (days, limit) => {
    const safeDays = clampDays(days);
    const { start, end } = rangeForDays(safeDays);

    const actionSum = (action) => ({
        $sum: { $cond: [{ $eq: ["$biz.action", action] }, 1, 0] },
    });

    const businesses = await webEventModel.aggregate([
        {
            $match: {
                type: { $in: ["business_view", "business_click"] },
                "biz.businessId": { $exists: true },
                ts: { $gte: start, $lt: end },
            },
        },
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
        { $sort: { views: -1, clicks: -1 } },
        { $limit: clampLimit(limit) },
        {
            $project: {
                _id: 0,
                businessId: "$_id",
                name: 1,
                views: 1,
                clicks: 1,
                actions: {
                    call: "$call",
                    whatsapp: "$whatsapp",
                    direction: "$direction",
                    enquiry: "$enquiry",
                    showNumber: "$showNumber",
                },
            },
        },
    ]);

    return { days: safeDays, businesses };
};

export const getTopSearches = async (days, limit) => {
    const safeDays = clampDays(days);
    const safeLimit = clampLimit(limit);
    const { start, end } = rangeForDays(safeDays);

    const [result] = await webEventModel.aggregate([
        { $match: { type: "search", ts: { $gte: start, $lt: end } } },
        {
            $facet: {
                top: [
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
                    { $sort: { count: -1 } },
                    { $limit: safeLimit },
                    {
                        $project: {
                            _id: 0,
                            query: "$_id",
                            count: 1,
                            typedCount: 1,
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
                            zeroResults: 1,
                            location: "$topLocation",
                        },
                    },
                ],
                zeroResult: [
                    { $match: { "search.results": 0 } },
                    {
                        $group: {
                            _id: {
                                query: { $toLower: { $ifNull: ["$search.query", ""] } },
                                location: { $ifNull: ["$search.location", ""] },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { "_id.query": 1, count: -1, "_id.location": 1 } },
                    {
                        $group: {
                            _id: "$_id.query",
                            count: { $sum: "$count" },
                            topLocation: { $first: "$_id.location" },
                        },
                    },
                    { $match: { _id: { $ne: "" } } },
                    { $sort: { count: -1 } },
                    { $limit: safeLimit },
                    { $project: { _id: 0, query: "$_id", count: 1, location: "$topLocation" } },
                ],
                totals: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            typed: { $sum: { $cond: [{ $eq: ["$search.known", false] }, 1, 0] } },
                        },
                    },
                ],
            },
        },
    ]);

    const totals = result?.totals?.[0] || { total: 0, typed: 0 };

    return {
        days: safeDays,
        totalSearches: totals.total,
        typedSearches: totals.typed,
        categorySearches: totals.total - totals.typed,
        searches: result?.top || [],
        zeroResult: result?.zeroResult || [],
    };
};

export const getDevices = async (days) => {
    const safeDays = clampDays(days);
    const { start, end } = rangeForDays(safeDays);

    const [result] = await webEventModel.aggregate([
        { $match: { ts: { $gte: start, $lt: end } } },
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
                    { $limit: 8 },
                    { $project: { _id: 0, browser: "$_id", visitors: 1 } },
                ],
            },
        },
    ]);

    return {
        days: safeDays,
        devices: result?.devices || [],
        browsers: result?.browsers || [],
    };
};
