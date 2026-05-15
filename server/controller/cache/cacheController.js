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

const logger = createLogger("CACHE");

const CACHE_TYPES = {
  'seo-meta': { label: 'SEO Meta Tags', pattern: 'seo-meta:*', invalidateFn: invalidateSeoCache },
  'seo-page-content': { label: 'SEO Page Content', pattern: 'seo-page-content:*', invalidateFn: invalidateSeoCache },
  'seo-blog': { label: 'SEO Blog', pattern: 'seo-blog:*', invalidateFn: invalidateSeoCache },
  'category': { label: 'Categories', pattern: 'category:*', invalidateFn: invalidateCategoryCache },
  'home-category': { label: 'Home Categories', pattern: 'home-category:*', invalidateFn: invalidateCategoryCache },
  'search': { label: 'Search Results', pattern: 'cache:/api/businesslist/search*', invalidateFn: invalidateSearchCache },
  'suggestions': { label: 'Suggestions', pattern: 'suggestions:*', invalidateFn: invalidateSearchCache },
  'trends': { label: 'Trending', pattern: 'trends:*', invalidateFn: invalidateSearchCache },
  'reviews': { label: 'Reviews', pattern: 'reviews:*', invalidateFn: null },
  'mobile': { label: 'Mobile Lookup', pattern: 'mobile:*', invalidateFn: null },
  'dashboard': { label: 'Dashboard', pattern: 'dashboard-*', invalidateFn: null },
  'advertisement': { label: 'Advertisement', pattern: 'advertisment:*', invalidateFn: null }
};

export const getSystemCacheStatsAction = async (req, res) => {
  try {
    const stats = await getCacheStats();

    // Get stats for each cache type
    const cacheTypeStats = {};
    for (const [key, config] of Object.entries(CACHE_TYPES)) {
      cacheTypeStats[key] = {
        label: config.label,
        pattern: config.pattern,
        estimatedSize: '0 KB', // Placeholder - would need to calculate from actual keys
        status: 'ready'
      };
    }

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
    await logger.error("getSystemCacheStatsAction error", error);
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

    // Validate cache type
    if (!cacheType || !CACHE_TYPES[cacheType]) {
      return res.status(400).json({
        success: false,
        message: `Invalid cache type. Allowed types: ${Object.keys(CACHE_TYPES).join(', ')}`
      });
    }

    const config = CACHE_TYPES[cacheType];

    await logger.info(`Clearing cache: ${cacheType}`, { cacheType, admin: adminEmail });

    // Clear the cache by pattern
    await clearCacheByPrefix(cacheType);

    // Also call the specific invalidation function if available
    if (config.invalidateFn) {
      try {
        await config.invalidateFn();
      } catch (err) {
        await logger.warn(`Secondary invalidation failed for ${cacheType}`, err);
      }
    }

    const stats = await getCacheStats();

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
    await logger.error("invalidateCacheAction error", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const invalidateAllCachesAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";

    await logger.warn(`CLEARING ALL CACHES`, { admin: adminEmail });

    // Clear all cache types
    for (const [key, config] of Object.entries(CACHE_TYPES)) {
      try {
        await clearCacheByPrefix(key);
      } catch (err) {
        await logger.warn(`Failed to clear ${key}`, err);
      }
    }

    // Run all invalidation functions
    try {
      await invalidateSeoCache();
      await invalidateCategoryCache();
      await invalidateSearchCache();
    } catch (err) {
      await logger.warn(`Some invalidation functions failed`, err);
    }

    const stats = await getCacheStats();

    return res.status(200).json({
      success: true,
      message: "All caches cleared successfully",
      data: {
        totalCleared: Object.keys(CACHE_TYPES).length,
        totalKeys: stats.totalKeys || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    await logger.error("invalidateAllCachesAction error", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
