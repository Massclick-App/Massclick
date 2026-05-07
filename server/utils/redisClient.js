import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;
let reconnectTimer = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const RECONNECT_DELAY = 5000; // 5 seconds

const setupRedisErrorHandlers = () => {
  if (!redisClient) return;

  redisClient.on('error', (err) => {
    console.warn('[Cache] Redis Error:', err.message);
    isConnected = false;
    attemptReconnect();
  });

  redisClient.on('disconnect', () => {
    console.warn('[Cache] Redis disconnected, caching disabled');
    isConnected = false;
    attemptReconnect();
  });

  redisClient.on('connect', () => {
    console.log('[Cache] Redis Client Connected');
    isConnected = true;
    clearTimeout(reconnectTimer);
  });

  redisClient.on('ready', () => {
    console.log('[Cache] Redis Client Ready');
    isConnected = true;
  });
};

const attemptReconnect = () => {
  if (reconnectTimer) return; // Already scheduled

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      console.log('[Cache] Attempting to reconnect to Redis...');
      if (redisClient && !isConnected) {
        await redisClient.connect();
        isConnected = true;
        console.log('[Cache] Reconnected successfully');
      }
    } catch (err) {
      console.warn('[Cache] Reconnection failed:', err.message, ' — will retry');
      attemptReconnect();
    }
  }, RECONNECT_DELAY);
};

export const initRedis = async () => {
  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('[Cache] Max reconnection attempts reached, giving up');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    setupRedisErrorHandlers();

    await redisClient.connect();
    isConnected = true;
    console.log('[Cache] ✓ Redis connected successfully:', REDIS_URL);
    return redisClient;
  } catch (error) {
    console.warn('[Cache] ⚠ Redis unavailable at startup — app will work without caching:', error.message);
    isConnected = false;
    // Don't throw, allow app to continue
    return null;
  }
};

export const getRedisClient = () => redisClient;

export const isRedisConnected = () => isConnected;

export const setCache = async (key, value, expirySeconds = 3600) => {
  try {
    if (!isConnected || !redisClient) return false;

    const serialized = JSON.stringify(value);
    if (expirySeconds) {
      await redisClient.setEx(key, expirySeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

export const getCache = async (key) => {
  try {
    if (!isConnected || !redisClient) return null;

    const cached = await redisClient.get(key);
    if (!cached) return null;

    return JSON.parse(cached);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

export const deleteCache = async (key) => {
  try {
    if (!isConnected || !redisClient) return false;

    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

export const deleteCachePattern = async (pattern) => {
  try {
    if (!isConnected || !redisClient) return false;

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    return false;
  }
};

export const clearAllCache = async () => {
  try {
    if (!isConnected || !redisClient) return false;

    await redisClient.flushDb();
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
};
