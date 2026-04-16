import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export let redisClient = null;

const disableRedis = (reason) => {
  console.error("Redis disabled:", reason);
  redisClient = null;
};

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on("error", (error) => {
    disableRedis(error);
  });

  redisClient.on("ready", () => {
    console.log("Redis client ready", REDIS_URL);
  });
}

export const initRedisClient = async () => {
  if (!redisClient) {
    console.log("Redis not configured - caching disabled");
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis connected:", REDIS_URL);
    }
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    redisClient = null; // Disable Redis if connection fails
  }
};

export const cacheMiddleware = (ttlSeconds = 60) => {
  return async (req, res, next) => {
    if (req.method !== "GET" || req.headers.authorization) {
      return next();
    }

    if (!redisClient || !redisClient.isOpen) {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;

    try {
      const cachedValue = await redisClient.get(cacheKey);
      if (cachedValue) {
        res.set("X-Cache", "HIT");
        const parsedValue = JSON.parse(cachedValue);
        return res.status(200).json(parsedValue);
      }
    } catch (error) {
      disableRedis(error);
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let bodyToCache = null;

    res.json = (body) => {
      if (res.statusCode === 200) {
        bodyToCache = body;
      }
      return originalJson(body);
    };

    res.send = (body) => {
      if (res.statusCode === 200) {
        bodyToCache = body;
      }
      return originalSend(body);
    };

    res.once("finish", async () => {
      if (res.statusCode !== 200 || bodyToCache == null) {
        return;
      }

      try {
        const payload =
          typeof bodyToCache === "string"
            ? bodyToCache
            : JSON.stringify(bodyToCache);
        await redisClient.setEx(cacheKey, ttlSeconds, payload);
      } catch (error) {
        disableRedis(error);
      }
    });

    next();
  };
};
