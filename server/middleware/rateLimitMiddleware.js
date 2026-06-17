import { getRedisClient, isRedisConnected } from "../utils/redisClient.js";
import { getSettings } from "../helper/systemSettings/settingsService.js";

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

const resolveSettingNumber = (value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const next = Math.floor(parsed);
  if (next < min) return fallback;
  if (next > max) return max;
  return next;
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

const RATE_LIMIT_RULES = {
  api: {
    limitKey: "rate_limit_api_limit",
    windowKey: "rate_limit_api_window_minutes",
    fallbackLimit: 900,
    fallbackWindowMinutes: 15,
    message: "API rate limit exceeded. Please slow down and try again.",
    keyPrefix: "api",
  },
  businesslist: {
    limitKey: "rate_limit_businesslist_limit",
    windowKey: "rate_limit_businesslist_window_minutes",
    fallbackLimit: 240,
    fallbackWindowMinutes: 10,
    message: "Business list requests are being throttled. Please slow down.",
    keyPrefix: "businesslist",
  },
  auth: {
    limitKey: "rate_limit_auth_limit",
    windowKey: "rate_limit_auth_window_minutes",
    fallbackLimit: 20,
    fallbackWindowMinutes: 15,
    message: "Too many authentication attempts. Please wait and try again.",
    keyPrefix: "auth",
  },
  otp: {
    limitKey: "rate_limit_otp_limit",
    windowKey: "rate_limit_otp_window_minutes",
    fallbackLimit: 5,
    fallbackWindowMinutes: 10,
    message: "Too many OTP requests. Please wait before trying again.",
    keyPrefix: "otp",
  },
  chat: {
    limitKey: "rate_limit_chat_limit",
    windowKey: "rate_limit_chat_window_minutes",
    fallbackLimit: 120,
    fallbackWindowMinutes: 15,
    message: "Chat actions are being rate limited. Please slow down.",
    keyPrefix: "chat",
  },
  lead: {
    limitKey: "rate_limit_lead_limit",
    windowKey: "rate_limit_lead_window_minutes",
    fallbackLimit: 30,
    fallbackWindowMinutes: 15,
    message: "Lead submission is temporarily rate limited. Please try again later.",
    keyPrefix: "lead",
  },
  admin: {
    limitKey: "rate_limit_enquiry_limit",
    windowKey: "rate_limit_enquiry_window_minutes",
    fallbackLimit: 120,
    fallbackWindowMinutes: 15,
    message: "Admin requests are being rate limited. Please slow down.",
    keyPrefix: "admin",
  },
  payment: {
    limitKey: "rate_limit_payment_limit",
    windowKey: "rate_limit_payment_window_minutes",
    fallbackLimit: 20,
    fallbackWindowMinutes: 15,
    message: "Payment requests are being rate limited. Please try again later.",
    keyPrefix: "payment",
  },
};

const createConfiguredRateLimit = (ruleName) => async (req, res, next) => {
  const rule = RATE_LIMIT_RULES[ruleName];
  if (!rule) return next();

  try {
    const settings = await getSettings();
    if (settings?.rate_limit_enabled === false) {
      return next();
    }

    const limit = resolveSettingNumber(settings?.[rule.limitKey], rule.fallbackLimit, 1, 100000);
    const windowMinutes = resolveSettingNumber(settings?.[rule.windowKey], rule.fallbackWindowMinutes, 1, 1440);

    return createRateLimit({
      windowMs: windowMinutes * 60 * 1000,
      limit,
      message: rule.message,
      keyPrefix: rule.keyPrefix,
    })(req, res, next);
  } catch (error) {
    console.warn(`[RateLimit] Failed to load settings for ${ruleName}: ${error.message}`);
    return createRateLimit({
      windowMs: rule.fallbackWindowMinutes * 60 * 1000,
      limit: rule.fallbackLimit,
      message: rule.message,
      keyPrefix: rule.keyPrefix,
    })(req, res, next);
  }
};

export const apiRateLimit = createConfiguredRateLimit("api");
export const businessListRateLimit = createConfiguredRateLimit("businesslist");
export const authRateLimit = createConfiguredRateLimit("auth");
export const otpRateLimit = createConfiguredRateLimit("otp");
export const chatRateLimit = createConfiguredRateLimit("chat");
export const leadRateLimit = createConfiguredRateLimit("lead");
export const adminRateLimit = createConfiguredRateLimit("admin");
export const paymentRateLimit = createConfiguredRateLimit("payment");
