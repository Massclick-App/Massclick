import { createLogger } from "./logger.js";
import { deleteCachePattern } from "./redisClient.js";

const logger = createLogger("CACHE_INVALIDATION");

/**
 * Invalidate SEO-related cache entries
 * Clears: SEO meta tags, page content, and blog content caches
 */
export const invalidateSeoCache = async () => {
  try {
    const patterns = ['seo-meta:*', 'seo-page-content:*', 'seo-blog:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated SEO cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating SEO cache", error);
    return false;
  }
};

/**
 * Invalidate category-related cache entries
 * Clears: Category listings, home categories, and related caches
 */
export const invalidateCategoryCache = async () => {
  try {
    const patterns = ['category:*', 'categories:*', 'home-category:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated category cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating category cache", error);
    return false;
  }
};

/**
 * Invalidate search-related cache entries
 * Clears: Search results, suggestions, trends, and related caches
 */
export const invalidateSearchCache = async () => {
  try {
    const patterns = ['suggestions:*', 'trends:*', 'trending-categories:*', 'cache:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated search cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating search cache", error);
    return false;
  }
};

/**
 * Invalidate advertisement-related cache entries
 * Clears: Advertisement listings and category-based advertisements
 */
export const invalidateAdvertisementCache = async () => {
  try {
    const patterns = ['advertisment:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated advertisement cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating advertisement cache", error);
    return false;
  }
};

/**
 * Invalidate review-related cache entries
 * Clears: Review listings for businesses
 */
export const invalidateReviewCache = async () => {
  try {
    const patterns = ['reviews:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated review cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating review cache", error);
    return false;
  }
};

/**
 * Invalidate dashboard-related cache entries
 * Clears: Dashboard summary and charts
 */
export const invalidateDashboardCache = async () => {
  try {
    const patterns = ['dashboard-summary:*', 'dashboard-charts:*'];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated dashboard cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating dashboard cache", error);
    return false;
  }
};
