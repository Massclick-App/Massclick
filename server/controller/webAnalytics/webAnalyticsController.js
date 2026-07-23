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

// Every dashboard read now takes the same shape: the helper owns range,
// filter, pagination, sort, and search parsing straight off the query string.
const readHandler = (name, fn) => async (req, res) => {
    try {
        res.send(await fn(req.query));
    } catch (err) {
        await logger.error(`${name} controller failed`, err);
        res.status(500).send({ message: err.message });
    }
};

export const overviewAction = readHandler("overview", getOverview);
export const trendsAction = readHandler("trends", getTrends);
export const topPagesAction = readHandler("top-pages", getTopPages);
export const topBusinessesAction = readHandler("top-businesses", getTopBusinesses);
export const topSearchesAction = readHandler("top-searches", getTopSearches);
export const devicesAction = readHandler("devices", getDevices);
