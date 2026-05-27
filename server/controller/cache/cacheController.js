import {
  invalidateSeoCache,
  invalidateCategoryCache,
  invalidateSearchCache
} from "../../utils/cacheInvalidation.js";
import {
  getCacheStats,
  clearCacheByPrefix,
  deleteCachePattern
} from "../../utils/cacheStats.js";
import { createLogger } from "../../utils/logger.js";
import { isRedisConnected, getRedisClient } from "../../utils/redisClient.js";

const logger = createLogger("CACHE");

export const getRedisStatusAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";

    await logger.info(`Redis status check requested`, {
      admin: adminEmail,
      ip: req.ip
    });

    const redisConnected = isRedisConnected();
    const stats = redisConnected ? await getCacheStats() : { totalKeys: 0, cacheKeys: 0 };

    await logger.info(`Redis status retrieved`, {
      admin: adminEmail,
      connected: redisConnected,
      totalKeys: stats.totalKeys || 0,
      cacheKeys: stats.cacheKeys || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        redis_connected: redisConnected,
        status: redisConnected ? "CONNECTED" : "DISCONNECTED",
        totalKeys: stats.totalKeys || 0,
        message: redisConnected ? "Redis is working properly" : "Redis is unavailable - caching disabled"
      }
    });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("getRedisStatusAction error", error, {
      admin: adminEmail,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const CACHE_TYPES = {
  'seo-meta': { label: 'SEO Meta Tags', pattern: 'seo-meta:*', invalidateFn: invalidateSeoCache },
  'seo-page-content': { label: 'SEO Page Content', pattern: 'seo-page-content:*', invalidateFn: invalidateSeoCache },
  'seo-blog': { label: 'SEO Blog', pattern: 'seo-blog:*', invalidateFn: invalidateSeoCache },
  'seo': { label: 'SEO Cache', pattern: 'seo:*', invalidateFn: invalidateSeoCache },
  'category': { label: 'Categories', pattern: 'category:*', invalidateFn: invalidateCategoryCache },
  'home-category': { label: 'Home Categories', pattern: 'home-category:*', invalidateFn: invalidateCategoryCache },
  'home-categories': { label: 'Home Categories Data', pattern: 'home-categories:*', invalidateFn: invalidateCategoryCache },
  'popular-categories': { label: 'Popular Categories', pattern: 'popular-categories:*', invalidateFn: invalidateCategoryCache },
  'service-cards': { label: 'Service Cards', pattern: 'service-cards:*', invalidateFn: null },
  'search': { label: 'Search Results', pattern: 'cache:/api/businesslist/search*', invalidateFn: invalidateSearchCache },
  'suggestions': { label: 'Suggestions', pattern: 'suggestions:*', invalidateFn: invalidateSearchCache },
  'trends': { label: 'Trending', pattern: 'trends:*', invalidateFn: invalidateSearchCache },
  'reviews': { label: 'Reviews', pattern: 'reviews:*', invalidateFn: null },
  'blog': { label: 'Blog Cache', pattern: 'blog:*', invalidateFn: null },
  'mobile': { label: 'Mobile Lookup', pattern: 'mobile:*', invalidateFn: null },
  'dashboard': { label: 'Dashboard', pattern: 'dashboard-*', invalidateFn: null },
  'dashboard-summary': { label: 'Dashboard Summary', pattern: 'dashboard-summary:*', invalidateFn: null },
  'dashboard-charts': { label: 'Dashboard Charts', pattern: 'dashboard-charts:*', invalidateFn: null },
  'advertisement': { label: 'Advertisement', pattern: 'advertisment:*', invalidateFn: null }
};

export const getSystemCacheStatsAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";

    await logger.info(`Cache stats requested`, {
      admin: adminEmail,
      ip: req.ip
    });

    const stats = await getCacheStats();

    // Get stats for each cache type
    const cacheTypeStats = {};
    for (const [key, config] of Object.entries(CACHE_TYPES)) {
      cacheTypeStats[key] = {
        label: config.label,
        pattern: config.pattern,
        estimatedSize: '0 KB',
        status: 'ready'
      };
    }

    await logger.debug(`Cache stats computed`, {
      admin: adminEmail,
      totalKeys: stats.totalKeys || 0,
      cacheKeys: stats.cacheKeys || 0,
      memoryUsage: stats.memoryUsage || 'N/A'
    });

    return res.status(200).json({
      success: true,
      data: {
        totalKeys: stats.totalKeys || 0,
        cacheKeys: stats.cacheKeys || 0,
        memoryUsage: stats.memoryUsage || 'N/A',
        cacheTypes: cacheTypeStats
      }
    });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("getSystemCacheStatsAction error", error, {
      admin: adminEmail,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const invalidateCacheAction = async (req, res) => {
  try {
    const { cacheType } = req.body;
    const adminEmail = req.authUser?.email || "admin";
    const requestIp = req.ip;

    await logger.info(`Cache invalidation requested`, {
      cacheType,
      admin: adminEmail,
      ip: requestIp
    });

    // Validate cache type
    if (!cacheType || !CACHE_TYPES[cacheType]) {
      await logger.warn(`Invalid cache type requested for invalidation`, {
        attemptedType: cacheType,
        admin: adminEmail,
        validTypes: Object.keys(CACHE_TYPES)
      });
      return res.status(400).json({
        success: false,
        message: `Invalid cache type. Allowed types: ${Object.keys(CACHE_TYPES).join(', ')}`
      });
    }

    const config = CACHE_TYPES[cacheType];

    await logger.warn(`Clearing cache: ${config.label}`, {
      cacheType,
      label: config.label,
      admin: adminEmail,
      pattern: config.pattern
    });

    // Clear the cache by pattern
    await clearCacheByPrefix(cacheType);

    // Also call the specific invalidation function if available
    if (config.invalidateFn) {
      try {
        await config.invalidateFn();
        await logger.info(`Secondary invalidation completed for ${cacheType}`, {
          cacheType,
          admin: adminEmail
        });
      } catch (err) {
        await logger.warn(`Secondary invalidation failed for ${cacheType}`, {
          cacheType,
          admin: adminEmail,
          error: err.message
        });
      }
    }

    const stats = await getCacheStats();

    await logger.info(`Cache invalidation completed successfully`, {
      cacheType,
      label: config.label,
      admin: adminEmail,
      remainingKeys: stats.totalKeys || 0,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Cache "${config.label}" cleared successfully`,
      data: {
        clearedType: cacheType,
        label: config.label,
        totalKeys: stats.totalKeys || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("invalidateCacheAction error", error, {
      admin: adminEmail,
      cacheType: req.body?.cacheType,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const invalidateAllCachesAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";
    const requestIp = req.ip;

    await logger.warn(`CLEARING ALL CACHES INITIATED`, {
      admin: adminEmail,
      ip: requestIp,
      timestamp: new Date().toISOString(),
      cacheTypesCount: Object.keys(CACHE_TYPES).length
    });

    const clearedTypes = [];
    const failedTypes = [];

    // Clear all cache types
    for (const [key, config] of Object.entries(CACHE_TYPES)) {
      try {
        await clearCacheByPrefix(key);
        clearedTypes.push(key);
        await logger.info(`Cleared cache type: ${config.label}`, {
          type: key,
          label: config.label,
          admin: adminEmail
        });
      } catch (err) {
        failedTypes.push(key);
        await logger.warn(`Failed to clear cache type: ${config.label}`, {
          type: key,
          label: config.label,
          admin: adminEmail,
          error: err.message
        });
      }
    }

    // Run all invalidation functions
    let invalidationStats = { seoCache: false, categoryCache: false, searchCache: false };
    try {
      await invalidateSeoCache();
      invalidationStats.seoCache = true;
      await logger.info(`SEO cache invalidation function executed`, { admin: adminEmail });
    } catch (err) {
      await logger.warn(`SEO invalidation function failed`, {
        admin: adminEmail,
        error: err.message
      });
    }

    try {
      await invalidateCategoryCache();
      invalidationStats.categoryCache = true;
      await logger.info(`Category cache invalidation function executed`, { admin: adminEmail });
    } catch (err) {
      await logger.warn(`Category invalidation function failed`, {
        admin: adminEmail,
        error: err.message
      });
    }

    try {
      await invalidateSearchCache();
      invalidationStats.searchCache = true;
      await logger.info(`Search cache invalidation function executed`, { admin: adminEmail });
    } catch (err) {
      await logger.warn(`Search invalidation function failed`, {
        admin: adminEmail,
        error: err.message
      });
    }

    const stats = await getCacheStats();

    await logger.warn(`ALL CACHES CLEARED COMPLETED`, {
      admin: adminEmail,
      totalCleared: clearedTypes.length,
      totalFailed: failedTypes.length,
      clearedTypes,
      failedTypes,
      invalidationStats,
      remainingKeys: stats.totalKeys || 0,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: "All caches cleared successfully",
      data: {
        totalCleared: Object.keys(CACHE_TYPES).length,
        clearedTypes,
        failedTypes,
        totalKeys: stats.totalKeys || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("invalidateAllCachesAction error", error, {
      admin: adminEmail,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getRedisInfoAction = async (req, res) => {
  try {
    if (!isRedisConnected()) {
      return res.status(200).json({ success: true, data: { connected: false } });
    }

    const client = getRedisClient();
    const raw = await client.info();

    const parsed = {};
    raw.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      }
    });

    const hits = parseInt(parsed.keyspace_hits) || 0;
    const misses = parseInt(parsed.keyspace_misses) || 0;
    const hitRate = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null;

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        version: parsed.redis_version,
        mode: parsed.redis_mode || 'standalone',
        os: parsed.os,
        tcp_port: parseInt(parsed.tcp_port) || 6379,
        uptime_seconds: parseInt(parsed.uptime_in_seconds) || 0,
        connected_clients: parseInt(parsed.connected_clients) || 0,
        used_memory_human: parsed.used_memory_human,
        used_memory_peak_human: parsed.used_memory_peak_human,
        mem_fragmentation_ratio: parseFloat(parsed.mem_fragmentation_ratio) || 0,
        total_commands_processed: parseInt(parsed.total_commands_processed) || 0,
        keyspace_hits: hits,
        keyspace_misses: misses,
        hit_rate: hitRate,
      }
    });
  } catch (error) {
    await logger.error("getRedisInfoAction error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const flushRedisDbAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";

    if (!isRedisConnected()) {
      return res.status(503).json({ success: false, message: "Redis unavailable" });
    }

    const client = getRedisClient();
    const totalBefore = await client.dbSize();
    await client.flushDb();

    await logger.warn(`REDIS DB FLUSHED`, {
      admin: adminEmail,
      keysFlushed: totalBefore,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Redis database flushed — ${totalBefore} key(s) removed`,
      data: { keysFlushed: totalBefore }
    });
  } catch (error) {
    await logger.error("flushRedisDbAction error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRedisPatternAction = async (req, res) => {
  try {
    const { pattern } = req.body;
    const adminEmail = req.authUser?.email || "admin";

    if (!pattern) {
      return res.status(400).json({ success: false, message: "pattern is required" });
    }

    if (!isRedisConnected()) {
      return res.status(503).json({ success: false, message: "Redis unavailable" });
    }

    const client = getRedisClient();
    const keys = await client.keys(pattern);
    let deleted = 0;
    if (keys.length > 0) {
      deleted = await client.del(keys);
    }

    await logger.warn(`Redis pattern deleted`, {
      admin: adminEmail,
      pattern,
      deleted,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `${deleted} key(s) deleted matching "${pattern}"`,
      data: { deleted, pattern }
    });
  } catch (error) {
    await logger.error("deleteRedisPatternAction error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRedisKeysAction = async (req, res) => {
  try {
    if (!isRedisConnected()) {
      return res.status(200).json({
        success: true,
        data: { keys: [], totalKeys: 0, connected: false }
      });
    }

    const client = getRedisClient();
    const pattern = req.query.pattern || '*';
    const allKeys = await client.keys(pattern);

    const ttls = await Promise.all(allKeys.map(k => client.ttl(k)));

    const keys = allKeys
      .map((key, i) => ({ key, ttl: ttls[i] }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return res.status(200).json({
      success: true,
      data: { keys, totalKeys: keys.length, connected: true }
    });
  } catch (error) {
    await logger.error("getRedisKeysAction error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRedisKeysAction = async (req, res) => {
  try {
    const { keys } = req.body;
    const adminEmail = req.authUser?.email || "admin";

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ success: false, message: "keys must be a non-empty array" });
    }

    if (!isRedisConnected()) {
      return res.status(503).json({ success: false, message: "Redis unavailable" });
    }

    const client = getRedisClient();
    const deleted = await client.del(keys);

    await logger.warn(`Redis keys manually deleted`, {
      admin: adminEmail,
      keys,
      deleted,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `${deleted} key(s) deleted`,
      data: { deleted, keys }
    });
  } catch (error) {
    await logger.error("deleteRedisKeysAction error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
