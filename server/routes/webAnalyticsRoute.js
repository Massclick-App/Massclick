import express from "express";

import {
    collectAction,
    overviewAction,
    trendsAction,
    topPagesAction,
    topBusinessesAction,
    campaignsAction,
    topSearchesAction,
    devicesAction,
} from "../controller/webAnalytics/webAnalyticsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { analyticsRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// The tracker posts JSON as text/plain: sendBeacon may not send non-safelisted
// content types cross-origin, and plain fetch then skips the CORS preflight
// too. The global express.json only parses application/json, so parse both
// here; a malformed body is dropped with 204 like every other bad payload.
const ingestBodyParser = express.json({ type: ["application/json", "text/plain"], limit: "25kb" });
const tolerantBodyParser = (req, res, next) => {
    ingestBodyParser(req, res, (err) => {
        if (err) return res.status(204).end();
        next();
    });
};

// Public ingest — anonymous visitors post batched events (sendBeacon friendly).
router.post("/api/site-events", analyticsRateLimit, tolerantBodyParser, collectAction);

// Admin dashboard reads.
router.get("/api/site-events/overview", oauthAuthentication, cacheMiddleware({ expirySeconds: 300, keyPrefix: "wa-overview" }), overviewAction);
router.get("/api/site-events/trends", oauthAuthentication, cacheMiddleware({ expirySeconds: 300, keyPrefix: "wa-trends" }), trendsAction);
router.get("/api/site-events/top-pages", oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: "wa-top-pages" }), topPagesAction);
router.get("/api/site-events/top-businesses", oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: "wa-top-businesses" }), topBusinessesAction);
router.get("/api/site-events/campaigns", oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: "wa-campaigns" }), campaignsAction);
router.get("/api/site-events/top-searches", oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: "wa-top-searches" }), topSearchesAction);
router.get("/api/site-events/devices", oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: "wa-devices" }), devicesAction);

export default router;
