import { getRedisClient, isRedisConnected } from "../utils/redisClient.js";

const localBuckets = new Map();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

const normalizeIp = (value) => {
  const ip = String(value || "unknown").trim();
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip || "unknown";
};

const cleanupLocalBuckets = (now) => {
  for (const [key, bucket] of localBuckets.entries()) {
    if (bucket.expiresAt <= now) {
      localBuckets.delete(key);
    }
  }
};

const incrementLocalBucket = (key, windowMs, now) => {
  cleanupLocalBuckets(now);

  const existing = localBuckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    const next = { count: 1, expiresAt: now + windowMs };
    localBuckets.set(key, next);
    return next;
  }

  existing.count += 1;
  return existing;
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return normalizeIp(forwarded.split(",")[0]);
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress);
};

export const createRateLimit = ({
  windowMs = DEFAULT_WINDOW_MS,
  limit = 100,
  message = "Too many requests. Please try again later.",
  keyPrefix = "api",
  keyGenerator,
} = {}) => {
  return async (req, res, next) => {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const clientIp = getClientIp(req);
    const bucketKey = keyGenerator ? keyGenerator(req, clientIp) : clientIp;
    const storageKey = `${keyPrefix}:${bucketKey}:${bucket}`;
    const resetAt = (bucket + 1) * windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

    const setHeaders = (count) => {
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
    };

    const rejectRequest = (count) => {
      setHeaders(count);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message,
        retryAfterSeconds,
      });
    };

    try {
      let bucketState;

      if (isRedisConnected()) {
        const redisClient = getRedisClient();
        const count = await redisClient.incr(storageKey);
        if (count === 1) {
          await redisClient.expire(storageKey, Math.ceil(windowMs / 1000) + 5);
        }

        setHeaders(count);
        if (count > limit) {
          return rejectRequest(count);
        }

        return next();
      }

      bucketState = incrementLocalBucket(storageKey, windowMs, now);
      setHeaders(bucketState.count);
      if (bucketState.count > limit) {
        return rejectRequest(bucketState.count);
      }

      return next();
    } catch (error) {
      console.warn(`[RateLimit] Falling back to local limiter for ${keyPrefix}: ${error.message}`);
      const bucketState = incrementLocalBucket(storageKey, windowMs, now);
      setHeaders(bucketState.count);

      if (bucketState.count > limit) {
        return rejectRequest(bucketState.count);
      }

      return next();
    }
  };
};

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 900,
  keyPrefix: "api",
  message: "API rate limit exceeded. Please slow down and try again.",
});

export const businessListRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 240,
  keyPrefix: "businesslist",
  message: "Business list requests are being throttled. Please slow down.",
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyPrefix: "auth",
  message: "Too many authentication attempts. Please wait and try again.",
});

export const otpRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  keyPrefix: "otp",
  message: "Too many OTP requests. Please wait before trying again.",
});

export const chatRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyPrefix: "chat",
  message: "Chat actions are being rate limited. Please slow down.",
});

export const leadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyPrefix: "lead",
  message: "Lead submission is temporarily rate limited. Please try again later.",
});

export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyPrefix: "admin",
  message: "Admin requests are being rate limited. Please slow down.",
});

export const paymentRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyPrefix: "payment",
  message: "Payment requests are being rate limited. Please try again later.",
});
