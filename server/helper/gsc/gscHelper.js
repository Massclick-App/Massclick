import { google } from "googleapis";
import { getCache, setCache } from "../../utils/redisClient.js";
import seoPageContentModel from "../../model/seoModel/seoPageContentModel.js";

const SITE = process.env.GSC_SITE || "sc-domain:massclick.in";
const CACHE_TTL = 4 * 60 * 60; // 4 hours

const dateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const toSlug = (t = "") =>
  t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const parseQueryParts = (q = "") => {
  const clean = q.toLowerCase().trim();
  const m = clean.match(
    /^(?:best|top|cheap|good|nearest?)?\s*(.+?)\s+(?:in|near me in|near)\s+(.+)$/
  );
  if (!m) return null;
  return {
    category: m[1].trim().replace(/^(?:best|top|cheap|good)\s+/, ""),
    city: m[2].trim(),
  };
};

let _sc = null;
const getSc = async () => {
  if (_sc) return _sc;
  if (!process.env.GSC_KEY_PATH) {
    throw new Error("GSC_KEY_PATH is not set in .env — add it and restart the server.");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GSC_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  _sc = google.searchconsole({ version: "v1", auth });
  return _sc;
};

const gscQuery = async (requestBody) => {
  const sc = await getSc();
  const res = await sc.searchanalytics.query({ siteUrl: SITE, requestBody });
  return res.data.rows || [];
};

// ── Exported helper functions ──────────────────────────────────────────────

export const getOverview = async (days = 28) => {
  const cacheKey = `gsc:overview:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [curRows, prevRows] = await Promise.all([
    gscQuery({ startDate: dateStr(days), endDate: dateStr(0), dimensions: [], type: "web" }),
    gscQuery({ startDate: dateStr(2 * days), endDate: dateStr(days + 1), dimensions: [], type: "web" }),
  ]);

  const agg = (rows) => {
    if (!rows.length) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const r = rows[0];
    return {
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
      position: parseFloat((r.position || 0).toFixed(1)),
    };
  };

  const current = agg(curRows);
  const prev = agg(prevRows);
  const pct = (cur, pre) =>
    pre === 0 ? null : parseFloat((((cur - pre) / pre) * 100).toFixed(1));

  const result = {
    current,
    prev,
    delta: {
      clicks: pct(current.clicks, prev.clicks),
      impressions: pct(current.impressions, prev.impressions),
      ctr: pct(current.ctr, prev.ctr),
      position: pct(current.position, prev.position),
    },
    days,
  };

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getTrends = async (days = 90) => {
  const cacheKey = `gsc:trends:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const rows = await gscQuery({
    startDate: dateStr(days),
    endDate: dateStr(0),
    dimensions: ["date"],
    type: "web",
    rowLimit: 500,
  });

  const result = rows.map((r) => ({
    date: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
    position: parseFloat((r.position || 0).toFixed(1)),
  }));

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getTopQueries = async (limit = 50, days = 28) => {
  const cacheKey = `gsc:queries:${limit}:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const rows = await gscQuery({
    startDate: dateStr(days),
    endDate: dateStr(0),
    dimensions: ["query"],
    type: "web",
    rowLimit: limit,
  });

  const result = rows.map((r) => ({
    query: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
    position: parseFloat((r.position || 0).toFixed(1)),
  }));

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getTopPages = async (limit = 25, days = 28) => {
  const cacheKey = `gsc:pages:${limit}:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const rows = await gscQuery({
    startDate: dateStr(days),
    endDate: dateStr(0),
    dimensions: ["page"],
    type: "web",
    rowLimit: limit,
  });

  const result = rows.map((r) => ({
    page: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
    position: parseFloat((r.position || 0).toFixed(1)),
  }));

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getDevices = async (days = 28) => {
  const cacheKey = `gsc:devices:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const rows = await gscQuery({
    startDate: dateStr(days),
    endDate: dateStr(0),
    dimensions: ["device"],
    type: "web",
    rowLimit: 10,
  });

  const result = rows.map((r) => ({
    device: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
  }));

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getCountries = async (limit = 25, days = 28) => {
  const cacheKey = `gsc:countries:${limit}:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const rows = await gscQuery({
    startDate: dateStr(days),
    endDate: dateStr(0),
    dimensions: ["country"],
    type: "web",
    rowLimit: limit,
  });

  const result = rows.map((r) => ({
    country: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
    position: parseFloat((r.position || 0).toFixed(1)),
  }));

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getOpportunities = async (days = 28) => {
  const cacheKey = `gsc:opportunities:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const all = await getTopQueries(1000, days);

  const quickWins = all
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 100)
    .sort((a, b) => a.position - b.position);

  const lowCtr = all
    .filter((r) => r.ctr < 1 && r.impressions >= 200)
    .sort((a, b) => b.impressions - a.impressions);

  const result = { quickWins, lowCtr };
  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

export const getKeywordGaps = async (days = 90) => {
  const cacheKey = `gsc:keyword-gaps:${days}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [queryRows, existingContent] = await Promise.all([
    getTopQueries(1000, days),
    seoPageContentModel.find({ isActive: true }).select("category location").lean(),
  ]);

  const existingSet = new Set(
    existingContent.map((e) => `${toSlug(e.category || "")}|${toSlug(e.location || "")}`)
  );

  const agg = new Map();
  for (const row of queryRows) {
    const parsed = parseQueryParts(row.query);
    if (!parsed) continue;
    const key = `${toSlug(parsed.category)}|${toSlug(parsed.city)}`;
    const prev = agg.get(key) || {
      category: parsed.category,
      city: parsed.city,
      impressions: 0,
      clicks: 0,
      positions: [],
    };
    prev.impressions += row.impressions;
    prev.clicks += row.clicks;
    prev.positions.push(row.position);
    agg.set(key, prev);
  }

  const result = [];
  for (const [key, data] of agg) {
    const hasContent = existingSet.has(key);
    const avgPos =
      data.positions.length
        ? parseFloat(
            (data.positions.reduce((a, b) => a + b, 0) / data.positions.length).toFixed(1)
          )
        : 0;
    result.push({
      category: data.category,
      city: data.city,
      impressions: data.impressions,
      clicks: data.clicks,
      position: avgPos,
      hasContent,
    });
  }

  // Gaps first (no content), then sorted by impressions desc
  result.sort((a, b) => {
    if (a.hasContent !== b.hasContent) return a.hasContent ? 1 : -1;
    return b.impressions - a.impressions;
  });

  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};
