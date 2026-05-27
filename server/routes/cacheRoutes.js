import express from "express";
import {
  getSystemCacheStatsAction,
  invalidateCacheAction,
  invalidateAllCachesAction,
  getRedisStatusAction,
  getRedisKeysAction,
  deleteRedisKeysAction,
  getRedisInfoAction,
  flushRedisDbAction,
  deleteRedisPatternAction,
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

// List all Redis keys with TTL (optional ?pattern=* query param)
router.get("/api/admin/redis/keys", oauthAuthentication, getRedisKeysAction);

// Delete specific Redis keys by name
router.delete("/api/admin/redis/keys", oauthAuthentication, deleteRedisKeysAction);

// Redis server INFO stats
router.get("/api/admin/redis/info", oauthAuthentication, getRedisInfoAction);

// Flush entire Redis DB
router.post("/api/admin/redis/flush", oauthAuthentication, flushRedisDbAction);

// Delete all keys matching a glob pattern
router.delete("/api/admin/redis/pattern", oauthAuthentication, deleteRedisPatternAction);

export default router;
