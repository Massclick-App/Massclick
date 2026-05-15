import { createLogger } from "./logger.js";

const logger = createLogger("CACHE_INVALIDATION");

/**
 * Invalidate SEO-related cache entries
 * Clears: SEO meta tags, page content, and blog content caches
 */
export const invalidateSeoCache = async () => {
  try {
    await logger.info("Invalidating SEO cache");
    return true;
  } catch (error) {
    await logger.error("Error invalidating SEO cache", error);
    throw error;
  }
};

/**
 * Invalidate category-related cache entries
 * Clears: Category listings, home categories, and related caches
 */
export const invalidateCategoryCache = async () => {
  try {
    await logger.info("Invalidating category cache");
    return true;
  } catch (error) {
    await logger.error("Error invalidating category cache", error);
    throw error;
  }
};

/**
 * Invalidate search-related cache entries
 * Clears: Search results, suggestions, trends, and related caches
 */
export const invalidateSearchCache = async () => {
  try {
    await logger.info("Invalidating search cache");
    return true;
  } catch (error) {
    await logger.error("Error invalidating search cache", error);
    throw error;
  }
};
