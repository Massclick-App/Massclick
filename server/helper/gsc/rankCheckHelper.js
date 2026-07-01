import { getCache, setCache } from "../../utils/redisClient.js";

const DEFAULT_DOMAIN = process.env.RANK_TRACKER_DOMAIN || "massclick.in";
const DEFAULT_MAX_PAGES = Number(process.env.RANK_TRACKER_MAX_PAGES || 5);
const DEFAULT_WAIT_MS = Number(process.env.RANK_TRACKER_WAIT_MS || 1000);
const DEFAULT_LOCATION = process.env.RANK_TRACKER_LOCATION || "India";
const DEFAULT_DEVICE = process.env.RANK_TRACKER_DEVICE || "desktop";
const DAILY_QUOTA = Number(process.env.RANK_TRACKER_DAILY_QUOTA || 100);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeDomain = (domain) =>
  String(domain || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export const matchesDomain = (url, domain) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
};

const quotaKey = () => `gsc:cse-quota:${new Date().toISOString().slice(0, 10)}`;
const secondsUntilMidnightUTC = () => {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(60, Math.round((midnight - now) / 1000));
};

export const getQuotaUsedToday = async () => (await getCache(quotaKey())) || 0;

export const getQuotaRemainingToday = async () => {
  const used = await getQuotaUsedToday();
  return Math.max(0, DAILY_QUOTA - used);
};

export const getDailyQuota = () => DAILY_QUOTA;

const recordQuotaUsage = async (count = 1) => {
  const used = await getQuotaUsedToday();
  await setCache(quotaKey(), used + count, secondsUntilMidnightUTC());
};

const googleCseRequest = async (params) => {
  const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  await recordQuotaUsage(1);
  const body = await response.json();

  if (!response.ok || body.error) {
    throw new Error(body.error?.message || `Google CSE returned HTTP ${response.status}`);
  }

  return body;
};

// Checks real SERP rank for `keyword` via Google Custom Search API, paging until
// the target domain is found or `maxPages` is exhausted.
export const checkKeywordRank = async ({
  keyword,
  location,
  device,
  domain,
  maxPages,
}) => {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error("GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID are not set in .env");
  }

  const targetDomain = normalizeDomain(domain || DEFAULT_DOMAIN);
  const resolvedDevice = device || DEFAULT_DEVICE;
  const resolvedMaxPages = Math.min(Number(maxPages || DEFAULT_MAX_PAGES), 10);
  const gl = process.env.GOOGLE_COUNTRY || "in";
  const hl = process.env.GOOGLE_LANGUAGE || "en";
  const googleDomain = process.env.GOOGLE_DOMAIN || "google.co.in";

  const remaining = await getQuotaRemainingToday();
  if (remaining <= 0) {
    throw new Error("Google CSE daily quota exhausted — try again tomorrow");
  }

  for (let page = 0; page < resolvedMaxPages; page += 1) {
    const start = page * 10 + 1;
    const data = await googleCseRequest({
      key: apiKey,
      cx: cseId,
      q: keyword,
      num: "10",
      start: String(start),
      gl,
      hl,
      googlehost: googleDomain,
      cr: gl ? `country${gl.toUpperCase()}` : "",
    });

    const results = Array.isArray(data.items) ? data.items : [];
    const matchIndex = results.findIndex((r) => r.link && matchesDomain(r.link, targetDomain));

    if (matchIndex !== -1) {
      const result = results[matchIndex];
      const rank = start + matchIndex;
      return {
        status: "found",
        rank,
        page: Math.ceil(rank / 10),
        url: result.link || "",
      };
    }

    if (page < resolvedMaxPages - 1) {
      await sleep(DEFAULT_WAIT_MS);
    }
  }

  return { status: "not_found", rank: null, page: null, url: "" };
};

export const DEFAULTS = {
  location: DEFAULT_LOCATION,
  device: DEFAULT_DEVICE,
  domain: DEFAULT_DOMAIN,
  maxPages: DEFAULT_MAX_PAGES,
};
