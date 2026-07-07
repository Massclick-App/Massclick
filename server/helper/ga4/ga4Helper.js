import { google } from "googleapis";
import { getCache, setCache } from "../../utils/redisClient.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("GA4");

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const PROPERTY = `properties/${PROPERTY_ID}`;
const CACHE_TTL = 60 * 60; // 1 hour — GA4 data is fresher than GSC's 2-3 day lag

const dateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

let _ga4 = null;
const getGa4Client = () => {
  if (_ga4) return _ga4;

  if (!process.env.GA4_KEY_PATH) {
    throw new Error("GA4_KEY_PATH is not set in .env — add it and restart the server.");
  }
  if (!PROPERTY_ID) {
    throw new Error("GA4_PROPERTY_ID is not set in .env — add it and restart the server.");
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GA4_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  _ga4 = google.analyticsdata({ version: "v1beta", auth });
  return _ga4;
};

const runReport = async (requestBody) => {
  const ga4 = getGa4Client();
  await logger.info("Sending runReport request", {
    property: PROPERTY,
    dateRanges: requestBody.dateRanges,
    dimensions: (requestBody.dimensions || []).map((d) => d.name),
    metrics: (requestBody.metrics || []).map((m) => m.name),
  });
  await logger.debug("Full runReport request body", requestBody);

  try {
    const res = await ga4.properties.runReport({
      property: PROPERTY,
      requestBody,
    });
    const rows = res.data.rows || [];
    await logger.info("runReport completed", { rowCount: rows.length });
    return { rows, res: res.data };
  } catch (error) {
    await logger.error("runReport failed", error?.response?.data || error);
    throw error;
  }
};

const withCache = async (cacheKey, fetcher) => {
  const cached = await getCache(cacheKey);
  if (cached) {
    await logger.info("Cache HIT", { cacheKey });
    return cached;
  }
  await logger.info("Cache MISS", { cacheKey });

  const result = await fetcher();
  await setCache(cacheKey, result, CACHE_TTL);
  return result;
};

const metricValue = (row, index) =>
  Number(row.metricValues?.[index]?.value || 0);

// ── Exported helper functions ──────────────────────────────────────────────

export const getOverview = async (days = 28) => {
  return withCache(`ga4:overview:${days}`, async () => {
    const metrics = [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "conversions" },
    ];

    const [{ rows: curRows }, { rows: prevRows }] = await Promise.all([
      runReport({
        dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
        metrics,
      }),
      runReport({
        dateRanges: [{ startDate: dateStr(2 * days), endDate: dateStr(days + 1) }],
        metrics,
      }),
    ]);

    const agg = (rows) => {
      const row = rows[0];
      if (!row) return { activeUsers: 0, sessions: 0, pageViews: 0, conversions: 0 };
      return {
        activeUsers: metricValue(row, 0),
        sessions: metricValue(row, 1),
        pageViews: metricValue(row, 2),
        conversions: metricValue(row, 3),
      };
    };

    const current = agg(curRows);
    const prev = agg(prevRows);
    const pct = (cur, pre) =>
      pre === 0 ? null : parseFloat((((cur - pre) / pre) * 100).toFixed(1));

    return {
      current,
      prev,
      delta: {
        activeUsers: pct(current.activeUsers, prev.activeUsers),
        sessions: pct(current.sessions, prev.sessions),
        pageViews: pct(current.pageViews, prev.pageViews),
        conversions: pct(current.conversions, prev.conversions),
      },
      days,
    };
  });
};

export const getTrends = async (days = 90) => {
  return withCache(`ga4:trends:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 500,
    });

    return rows.map((r) => ({
      date: r.dimensionValues[0].value,
      activeUsers: metricValue(r, 0),
      sessions: metricValue(r, 1),
      pageViews: metricValue(r, 2),
    }));
  });
};

export const getTrafficSources = async (days = 28, limit = 25) => {
  return withCache(`ga4:traffic-sources:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      source: r.dimensionValues[0].value,
      medium: r.dimensionValues[1].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getLocations = async (days = 28, limit = 25) => {
  return withCache(`ga4:locations:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      country: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getDevices = async (days = 28) => {
  return withCache(`ga4:devices:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows.map((r) => ({
      device: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getConversions = async (days = 28, limit = 25) => {
  return withCache(`ga4:conversions:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "conversions" }, { name: "eventCount" }],
      orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
      limit,
    });

    return rows
      .map((r) => ({
        eventName: r.dimensionValues[0].value,
        conversions: metricValue(r, 0),
        eventCount: metricValue(r, 1),
      }))
      .filter((r) => r.conversions > 0);
  });
};
