import { getRedisClient, isRedisConnected } from './redisClient.js';

// Wrapper to ensure cache operations never block responses (max 100ms wait)
const CACHE_TIMEOUT_MS = 100;

const withTimeout = (promise, timeoutMs = CACHE_TIMEOUT_MS) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cache operation timeout')), timeoutMs)
    )
  ]);
};

export const invalidateCachePattern = async (pattern) => {
  try {
    if (!isRedisConnected()) {
      // Redis is down but app continues, just skip invalidation
      return;
    }

    const client = getRedisClient();
    if (!client) {
      return;
    }

    // Wrap with timeout to prevent hanging
    await withTimeout(
      (async () => {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
          console.log(`[Cache] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        }
      })()
    );
  } catch (error) {
    // Don't block the response if cache invalidation fails
    console.warn('[Cache] Invalidation warning (non-blocking):', error.message);
  }
};

export const invalidateBusinessCache = async (businessId) => {
  const patterns = [
    'cache:*business*',
    'suggestions:*',
    'reviews:*',
    `cache:/api/business/by-slug*`,
    `cache:/api/businesslist/view*`,
  ];

  // Non-blocking invalidation
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate pattern:', pattern, err.message);
    });
  }
};

export const invalidateCategoryCache = async () => {
  const patterns = [
    'category:*',
    'home-category:*',
    'cache:/api/category/*',
  ];

  // Non-blocking invalidation
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate pattern:', pattern, err.message);
    });
  }
};

export const invalidateReviewCache = async (businessId) => {
  const patterns = [
    `reviews:*${businessId}*`,
    'cache:/api/business/*/reviews*',
  ];

  // Non-blocking invalidation
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate pattern:', pattern, err.message);
    });
  }
};

export const invalidateSeoCache = async () => {
  const patterns = [
    'seo-meta:*',
    'seo-page-content:*',
    'seo-blog:*',
    'cache:/api/seo/*',
    'cache:/api/seopagecontent/*',
    'cache:/api/seopagecontentblog/*',
  ];

  // Non-blocking invalidation
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate pattern:', pattern, err.message);
    });
  }
};

export const invalidateSearchCache = async () => {
  const patterns = [
    'cache:/api/businesslist/search*',
    'suggestions:*',
    'trends:*',
  ];

  // Non-blocking invalidation
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate pattern:', pattern, err.message);
    });
  }
};
