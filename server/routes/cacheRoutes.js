import express from "express";
import {
  getSystemCacheStatsAction,
  invalidateCacheAction,
  invalidateAllCachesAction,
  getRedisStatusAction
} from "../controller/cache/cacheController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

// Get Redis connection status
router.get("/api/admin/redis/status", oauthAuthentication, getRedisStatusAction);

// Get cache statistics
router.get("/api/admin/cache/stats", oauthAuthentication, getSystemCacheStatsAction);

// Invalidate specific cache type
router.post("/api/admin/cache/invalidate", oauthAuthentication, invalidateCacheAction);

// Clear all caches (requires confirmation from UI)
router.post("/api/admin/cache/clear-all", oauthAuthentication, invalidateAllCachesAction);

export default router;
