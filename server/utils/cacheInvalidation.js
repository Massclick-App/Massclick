import { createLogger } from "./logger.js";
import { deleteCachePattern } from "./redisClient.js";

const logger = createLogger("CACHE_INVALIDATION");

/**
 * Invalidate SEO-related cache entries
 * Clears: SEO meta tags, page content, and blog content caches
 */
export const invalidateSeoCache = async () => {
  try {
    const patterns = ['seo:*', 'seo-meta:*', 'seo-page-content:*', 'seo-blog:*'];
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
    // NOTE: these must match the keys the controllers actually WRITE. Verified
    // against live Redis on 2026-08-11 — the five v1 keys below were previously
    // uncovered, so a rewrite would have left them serving stale image URLs:
    //   home-categories:desktop|mobile   categoryController.js:159,242
    //   popular-categories:home          categoryController.js:418
    //   service-cards:home|mobile        categoryController.js:542,660
    const patterns = [
      'category:*',
      'categories:*',
      'home-category:*',
      'home-categories:*',
      'home-mobile-category:*',
      'popular-categories:*',
      'popular-category-content:*',
      'service-cards:*',
    ];
    const results = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    // This function is called after ANY category create/update/delete/image
    // upload (categoryController.js, categoryImageController.js) — but the v2
    // middleware-cached endpoints (category-v2, category-group-v2,
    // home-category-v2, home-mobile-category-v2, district-category-v2) were
    // added later in categoryDisplaySettingsController.js and never wired into
    // THIS function's pattern list, only into the separate display-settings
    // invalidation below. Concretely: uploading a category's webHero image
    // updates the DB instantly but the group-listing page kept serving its
    // cached (pre-upload) response for up to an hour, since nothing told
    // Redis that category-derived v2 data had changed. Delegating here
    // instead of duplicating the pattern list is deliberate — it's the same
    // kind of drift this function's own history already hit once (see the
    // v1-key comment above), and a plain second list would just drift again
    // the next time a v2 cache is added.
    const v2Result = await invalidateCategoryDisplaySettingsCache();
    await logger.info(`Invalidated category cache - patterns: ${patterns.join(', ')}`);
    return results.every(r => r === true) && v2Result;
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
    const patterns = [
      'search-v2:*',
      'suggestions:*',
      'trends:*',
      'trending-categories:*',
      'mobile-v3:*',           // GET /api/businesslist/findByMobile — carries business images
      'cache:*',
    ];
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
 * Invalidate category display settings cache entries (v2 public endpoints)
 */
export const invalidateCategoryDisplaySettingsCache = async () => {
  try {
    // Middleware-level cache keys (keyPrefix:path-hash format)
    const patterns = [
      'home-category-v2:*',        // GET /api/v2/category/home
      'home-mobile-category-v2:*', // GET /api/v2/category/home-mobile + mobile-service-cards
      'category-v2:*',             // GET /api/v2/category/sub/:parentSlug
      'category-group-v2:*',       // GET /api/v2/category/group/:parentSlug
      'district-category-v2:*',    // GET /api/v2/category/district — carries category images
    ];
    // Controller-level cache keys, as PATTERNS rather than an explicit list.
    // The explicit list is what drifted: it named only the ':v2' variants, so the
    // v1 keys written by categoryController.js were never cleared. Patterns cover
    // both and cannot drift again when a new suffix appears.
    const directPatterns = [
      'home-categories:*',
      'popular-categories:*',
      'service-cards:*',
      'popular-searches:*',
      'top-tourist:*',
      'popular-category-content:*',
    ];
    const patternResults = await Promise.all(
      patterns.map(pattern => deleteCachePattern(pattern))
    );
    const directResults = await Promise.all(
      directPatterns.map(pattern => deleteCachePattern(pattern))
    );
    await logger.info(`Invalidated category display settings cache`);
    return [...patternResults, ...directResults].every(r => r === true);
  } catch (error) {
    await logger.error("Error invalidating category display settings cache", error);
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
