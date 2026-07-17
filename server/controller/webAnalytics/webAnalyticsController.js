import {
    ingestEvents,
    getOverview,
    getTrends,
    getTopPages,
    getTopBusinesses,
    getTopSearches,
    getDevices,
} from "../../helper/webAnalytics/webAnalyticsHelper.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("SiteEvents");

// Public ingest. Always answers 204 — malformed or bot traffic is dropped
// silently so the endpoint reveals nothing to probes.
export const collectAction = async (req, res) => {
    try {
        await ingestEvents(req);
    } catch (err) {
        await logger.error("site-events ingest failed", err);
    }
    res.status(204).end();
};

const daysHandler = (name, fn, defaultDays = 28) => async (req, res) => {
    try {
        const days = parseInt(req.query.days) || defaultDays;
        res.send(await fn(days));
    } catch (err) {
        await logger.error(`${name} controller failed`, err);
        res.status(500).send({ message: err.message });
    }
};

const daysLimitHandler = (name, fn, defaultDays = 28, defaultLimit = 10) => async (req, res) => {
    try {
        const days = parseInt(req.query.days) || defaultDays;
        const limit = parseInt(req.query.limit) || defaultLimit;
        res.send(await fn(days, limit));
    } catch (err) {
        await logger.error(`${name} controller failed`, err);
        res.status(500).send({ message: err.message });
    }
};

export const overviewAction = daysHandler("overview", getOverview);
export const trendsAction = daysHandler("trends", getTrends);
export const topPagesAction = daysLimitHandler("top-pages", getTopPages);
export const topBusinessesAction = daysLimitHandler("top-businesses", getTopBusinesses);
export const topSearchesAction = daysLimitHandler("top-searches", getTopSearches);
export const devicesAction = daysHandler("devices", getDevices);
