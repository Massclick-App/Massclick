import { getRedisClient, isRedisConnected } from "./redisClient.js";
import { createLogger } from "./logger.js";

const logger = createLogger("CACHE_STATS");

/**
 * Get cache statistics
 * Returns information about cache size and key counts
 */
export const getCacheStats = async () => {
  try {
    if (!isRedisConnected()) {
      return {
        totalKeys: 0,
        cacheKeys: 0,
        memoryUsage: "N/A (Redis unavailable)",
        timestamp: new Date().toISOString()
      };
    }

    const client = getRedisClient();
    const dbSize = await client.dbSize();

    return {
      totalKeys: dbSize || 0,
      cacheKeys: dbSize || 0,
      memoryUsage: "N/A",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await logger.error("Error getting cache stats", error);
    return {
      totalKeys: 0,
      cacheKeys: 0,
      memoryUsage: "Error",
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Clear cache entries by prefix
 * @param {string} prefix - The cache key prefix to clear
 */
export const clearCacheByPrefix = async (prefix) => {
  try {
    if (!isRedisConnected()) {
      await logger.warn(`Redis unavailable, cannot clear prefix: ${prefix}`);
      return { cleared: false, prefix, reason: "Redis unavailable" };
    }

    const client = getRedisClient();
    const pattern = `${prefix}:*`;
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(keys);
      await logger.info(`Cleared ${keys.length} keys with prefix: ${prefix}`);
    } else {
      await logger.info(`No keys found with prefix: ${prefix}`);
    }

    return { cleared: true, prefix, keysDeleted: keys.length };
  } catch (error) {
    await logger.error(`Error clearing cache prefix: ${prefix}`, error);
    throw error;
  }
};

/**
 * Delete cache entries matching a pattern
 * @param {string} pattern - The pattern to match cache keys
 */
export const deleteCachePattern = async (pattern) => {
  try {
    if (!isRedisConnected()) {
      await logger.warn(`Redis unavailable, cannot delete pattern: ${pattern}`);
      return { deleted: false, pattern, reason: "Redis unavailable" };
    }

    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(keys);
      await logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    } else {
      await logger.info(`No keys found matching pattern: ${pattern}`);
    }

    return { deleted: true, pattern, keysDeleted: keys.length };
  } catch (error) {
    await logger.error(`Error deleting cache pattern: ${pattern}`, error);
    throw error;
  }
};
