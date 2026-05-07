import { getCache, setCache, isRedisConnected } from '../utils/redisClient.js';

export const cacheMiddleware = (options = {}) => {
  const {
    expirySeconds = 3600,
    keyPrefix = 'cache',
    ignoreParams = [],
  } = options;

  return async (req, res, next) => {
    // Skip caching if: Redis is down OR not a GET request OR response already sent
    if (!isRedisConnected() || req.method !== 'GET' || res.headersSent) {
      return next();
    }

    try {
      const cacheKey = generateCacheKey(req, keyPrefix, ignoreParams);

      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      if (cachedData && !res.headersSent) {
        return res.json(cachedData);
      }

      // Intercept response to cache it
      const originalJson = res.json.bind(res);

      res.json = function (data) {
        // Non-blocking cache write - don't delay response
        if (isRedisConnected()) {
          setCache(cacheKey, data, expirySeconds).catch(err => {
            console.warn('[Cache] Failed to cache response (non-blocking):', err.message);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      // If anything goes wrong with caching, just continue without caching
      console.warn('[Cache] Middleware error (non-blocking, continuing request):', error.message);
      next();
    }
  };
};

export const generateCacheKey = (req, prefix, ignoreParams = []) => {
  const queryParams = { ...req.query };

  ignoreParams.forEach(param => {
    delete queryParams[param];
  });

  const queryString = Object.keys(queryParams)
    .sort()
    .map(key => `${key}=${queryParams[key]}`)
    .join('&');

  const path = req.path;
  return `${prefix}:${path}${queryString ? ':' + queryString : ''}`;
};

export const invalidateCache = async (pattern, redisClient) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};
