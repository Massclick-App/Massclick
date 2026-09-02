import express from 'express';

import { adsReelAction, adsCategoriesAction, adsShowcaseAction } from "../controller/ads/adsController.js";
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { apiRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

/**
 * Public, unauthenticated endpoints for the standalone interactive ad
 * creatives (massclick-ad-creatives/interactive/*).
 *
 * Ads are embedded on surfaces we don't control and can spike hard when a
 * campaign lands, so these carry their own rate limit on top of the global
 * `/api` one and a long HTTP cache — the underlying data is curated and only
 * moves when inventory does.
 */
const adsCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'ads' });

router.use('/api/ads', apiRateLimit);

router.get('/api/ads/reel', adsCache, adsReelAction);
router.get('/api/ads/categories', adsCache, adsCategoriesAction);
router.get('/api/ads/showcase', adsCache, adsShowcaseAction);

export default router;
