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

// GA4 Data API caps a single runReport request at 10 metrics, so the overview
// is split into two requests (core + engagement) rather than one.
const CORE_METRICS = [
  { name: "activeUsers" },
  { name: "totalUsers" },
  { name: "newUsers" },
  { name: "sessions" },
  { name: "engagedSessions" },
  { name: "screenPageViews" },
  { name: "conversions" },
];
const ENGAGEMENT_METRICS = [
  { name: "eventCount" },
  { name: "totalRevenue" },
  { name: "averageSessionDuration" },
  { name: "bounceRate" },
  { name: "engagementRate" },
];

export const getOverview = async (days = 28) => {
  return withCache(`ga4:overview:${days}`, async () => {
    const dateRange = (from, to) => ({ dateRanges: [{ startDate: dateStr(from), endDate: dateStr(to) }] });

    const [
      { rows: curCoreRows },
      { rows: curEngagementRows },
      { rows: prevCoreRows },
      { rows: prevEngagementRows },
    ] = await Promise.all([
      runReport({ ...dateRange(days, 0), metrics: CORE_METRICS }),
      runReport({ ...dateRange(days, 0), metrics: ENGAGEMENT_METRICS }),
      runReport({ ...dateRange(2 * days, days + 1), metrics: CORE_METRICS }),
      runReport({ ...dateRange(2 * days, days + 1), metrics: ENGAGEMENT_METRICS }),
    ]);

    const aggCore = (rows) => {
      const row = rows[0];
      if (!row) return { activeUsers: 0, totalUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0, pageViews: 0, conversions: 0 };
      return {
        activeUsers: metricValue(row, 0),
        totalUsers: metricValue(row, 1),
        newUsers: metricValue(row, 2),
        sessions: metricValue(row, 3),
        engagedSessions: metricValue(row, 4),
        pageViews: metricValue(row, 5),
        conversions: metricValue(row, 6),
      };
    };

    const aggEngagement = (rows) => {
      const row = rows[0];
      if (!row) return { eventCount: 0, totalRevenue: 0, averageSessionDuration: 0, bounceRate: 0, engagementRate: 0 };
      return {
        eventCount: metricValue(row, 0),
        totalRevenue: parseFloat(metricValue(row, 1).toFixed(2)),
        averageSessionDuration: parseFloat(metricValue(row, 2).toFixed(1)),
        bounceRate: parseFloat((metricValue(row, 3) * 100).toFixed(2)),
        engagementRate: parseFloat((metricValue(row, 4) * 100).toFixed(2)),
      };
    };

    const current = { ...aggCore(curCoreRows), ...aggEngagement(curEngagementRows) };
    const prev = { ...aggCore(prevCoreRows), ...aggEngagement(prevEngagementRows) };
    const pct = (cur, pre) =>
      pre === 0 ? null : parseFloat((((cur - pre) / pre) * 100).toFixed(1));

    const delta = {};
    for (const key of Object.keys(current)) {
      delta[key] = pct(current[key], prev[key]);
    }

    return { current, prev, delta, days };
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

export const getCities = async (days = 28, limit = 25) => {
  return withCache(`ga4:cities:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "city" }, { name: "country" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      city: r.dimensionValues[0].value,
      country: r.dimensionValues[1].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getBrowsers = async (days = 28) => {
  return withCache(`ga4:browsers:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows.map((r) => ({
      browser: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getPages = async (days = 28, limit = 25) => {
  return withCache(`ga4:pages:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }, { name: "hostName" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      pagePath: r.dimensionValues[0].value,
      pageTitle: r.dimensionValues[1].value,
      hostName: r.dimensionValues[2].value,
      pageViews: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getLandingPages = async (days = 28, limit = 25) => {
  return withCache(`ga4:landing-pages:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "engagementRate" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      landingPage: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
      engagementRate: parseFloat((metricValue(r, 2) * 100).toFixed(2)),
    }));
  });
};

export const getAcquisition = async (days = 28, limit = 25) => {
  return withCache(`ga4:acquisition:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "firstUserSource" }],
      metrics: [{ name: "newUsers" }, { name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      firstUserSource: r.dimensionValues[0].value,
      newUsers: metricValue(r, 0),
      sessions: metricValue(r, 1),
      activeUsers: metricValue(r, 2),
    }));
  });
};

// ── Engagement detail (per-session/per-user engagement quality) ────────────

const ENGAGEMENT_DETAIL_METRICS = [
  { name: "sessionsPerUser" },
  { name: "screenPageViewsPerSession" },
  { name: "userEngagementDuration" },
  { name: "eventCountPerUser" },
  { name: "eventValue" },
  { name: "scrolledUsers" },
  { name: "sessionConversionRate" },
];

export const getEngagementOverview = async (days = 28) => {
  return withCache(`ga4:engagement-overview:${days}`, async () => {
    const dateRange = (from, to) => ({ dateRanges: [{ startDate: dateStr(from), endDate: dateStr(to) }] });

    const [{ rows: curRows }, { rows: prevRows }] = await Promise.all([
      runReport({ ...dateRange(days, 0), metrics: ENGAGEMENT_DETAIL_METRICS }),
      runReport({ ...dateRange(2 * days, days + 1), metrics: ENGAGEMENT_DETAIL_METRICS }),
    ]);

    const agg = (rows) => {
      const row = rows[0];
      if (!row) {
        return {
          sessionsPerUser: 0, screenPageViewsPerSession: 0, userEngagementDuration: 0,
          eventCountPerUser: 0, eventValue: 0, scrolledUsers: 0, sessionConversionRate: 0,
        };
      }
      return {
        sessionsPerUser: parseFloat(metricValue(row, 0).toFixed(2)),
        screenPageViewsPerSession: parseFloat(metricValue(row, 1).toFixed(2)),
        userEngagementDuration: parseFloat(metricValue(row, 2).toFixed(1)),
        eventCountPerUser: parseFloat(metricValue(row, 3).toFixed(2)),
        eventValue: parseFloat(metricValue(row, 4).toFixed(2)),
        scrolledUsers: metricValue(row, 5),
        sessionConversionRate: parseFloat((metricValue(row, 6) * 100).toFixed(2)),
      };
    };

    const current = agg(curRows);
    const prev = agg(prevRows);
    const pct = (cur, pre) => (pre === 0 ? null : parseFloat((((cur - pre) / pre) * 100).toFixed(1)));

    const delta = {};
    for (const key of Object.keys(current)) delta[key] = pct(current[key], prev[key]);

    return { current, prev, delta, days };
  });
};

// ── Ecommerce ────────────────────────────────────────────────────────────

const ECOMMERCE_METRICS = [
  { name: "transactions" },
  { name: "purchaseRevenue" },
  { name: "addToCarts" },
  { name: "checkouts" },
  { name: "purchaserConversionRate" },
  { name: "firstTimePurchasers" },
  { name: "averagePurchaseRevenue" },
];

export const getEcommerceOverview = async (days = 28) => {
  return withCache(`ga4:ecommerce-overview:${days}`, async () => {
    const dateRange = (from, to) => ({ dateRanges: [{ startDate: dateStr(from), endDate: dateStr(to) }] });

    const [{ rows: curRows }, { rows: prevRows }] = await Promise.all([
      runReport({ ...dateRange(days, 0), metrics: ECOMMERCE_METRICS }),
      runReport({ ...dateRange(2 * days, days + 1), metrics: ECOMMERCE_METRICS }),
    ]);

    const agg = (rows) => {
      const row = rows[0];
      if (!row) {
        return {
          transactions: 0, purchaseRevenue: 0, addToCarts: 0, checkouts: 0,
          purchaserConversionRate: 0, firstTimePurchasers: 0, averagePurchaseRevenue: 0,
        };
      }
      return {
        transactions: metricValue(row, 0),
        purchaseRevenue: parseFloat(metricValue(row, 1).toFixed(2)),
        addToCarts: metricValue(row, 2),
        checkouts: metricValue(row, 3),
        purchaserConversionRate: parseFloat((metricValue(row, 4) * 100).toFixed(2)),
        firstTimePurchasers: metricValue(row, 5),
        averagePurchaseRevenue: parseFloat(metricValue(row, 6).toFixed(2)),
      };
    };

    const current = agg(curRows);
    const prev = agg(prevRows);
    const pct = (cur, pre) => (pre === 0 ? null : parseFloat((((cur - pre) / pre) * 100).toFixed(1)));

    const delta = {};
    for (const key of Object.keys(current)) delta[key] = pct(current[key], prev[key]);

    return { current, prev, delta, days };
  });
};

export const getTopItems = async (days = 28, limit = 25) => {
  return withCache(`ga4:top-items:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "itemName" }, { name: "itemCategory" }],
      metrics: [{ name: "itemRevenue" }],
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      itemName: r.dimensionValues[0].value,
      itemCategory: r.dimensionValues[1].value,
      itemRevenue: parseFloat(metricValue(r, 0).toFixed(2)),
    }));
  });
};

// ── Traffic: referrers & campaigns ──────────────────────────────────────

export const getReferrers = async (days = 28, limit = 25) => {
  return withCache(`ga4:referrers:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "pageReferrer" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows
      .map((r) => ({
        pageReferrer: r.dimensionValues[0].value,
        sessions: metricValue(r, 0),
        activeUsers: metricValue(r, 1),
      }))
      .filter((r) => r.pageReferrer && r.pageReferrer !== "(not set)");
  });
};

export const getCampaigns = async (days = 28, limit = 25) => {
  return withCache(`ga4:campaigns:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "sessionCampaignName" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "newUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      campaign: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
      newUsers: metricValue(r, 2),
    }));
  });
};

// ── Technology: OS, platform, device model, screen resolution ──────────

export const getOperatingSystems = async (days = 28) => {
  return withCache(`ga4:operating-systems:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "operatingSystem" }, { name: "operatingSystemVersion" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 25,
    });

    return rows.map((r) => ({
      operatingSystem: r.dimensionValues[0].value,
      operatingSystemVersion: r.dimensionValues[1].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getPlatforms = async (days = 28) => {
  return withCache(`ga4:platforms:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "platform" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows.map((r) => ({
      platform: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getDeviceModels = async (days = 28, limit = 25) => {
  return withCache(`ga4:device-models:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "deviceModel" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows
      .map((r) => ({
        deviceModel: r.dimensionValues[0].value,
        sessions: metricValue(r, 0),
        activeUsers: metricValue(r, 1),
      }))
      .filter((r) => r.deviceModel && r.deviceModel !== "(not set)");
  });
};

export const getScreenResolutions = async (days = 28, limit = 25) => {
  return withCache(`ga4:screen-resolutions:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "screenResolution" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      screenResolution: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

// ── Geography: regions, continents, sub-continents ──────────────────────

export const getRegions = async (days = 28, limit = 25) => {
  return withCache(`ga4:regions:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "region" }, { name: "country" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });

    return rows
      .map((r) => ({
        region: r.dimensionValues[0].value,
        country: r.dimensionValues[1].value,
        sessions: metricValue(r, 0),
        activeUsers: metricValue(r, 1),
      }))
      .filter((r) => r.region && r.region !== "(not set)");
  });
};

export const getContinents = async (days = 28) => {
  return withCache(`ga4:continents:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "continent" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows.map((r) => ({
      continent: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getSubContinents = async (days = 28) => {
  return withCache(`ga4:sub-continents:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "subContinent" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows.map((r) => ({
      subContinent: r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

// ── Audience: new vs returning, day of week, hour of day ────────────────

export const getNewVsReturning = async (days = 28) => {
  return withCache(`ga4:new-vs-returning:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    return rows
      .map((r) => ({
        segment: r.dimensionValues[0].value,
        sessions: metricValue(r, 0),
        activeUsers: metricValue(r, 1),
        conversions: metricValue(r, 2),
      }))
      .filter((r) => r.segment && r.segment !== "(not set)");
  });
};

export const getDayOfWeek = async (days = 28) => {
  return withCache(`ga4:day-of-week:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "dayOfWeek" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "dayOfWeek" } }],
    });

    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rows.map((r) => ({
      dayOfWeek: DAY_LABELS[Number(r.dimensionValues[0].value)] || r.dimensionValues[0].value,
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

export const getHourOfDay = async (days = 28) => {
  return withCache(`ga4:hour-of-day:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "hour" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "hour" } }],
    });

    return rows.map((r) => ({
      hour: Number(r.dimensionValues[0].value),
      sessions: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};

// ── Screens (unified app+web screen name — mostly relevant if this
// property ever adds a mobile app data stream; for web-only it usually
// mirrors pageTitle) ─────────────────────────────────────────────────────

export const getScreens = async (days = 28, limit = 25) => {
  return withCache(`ga4:screens:${limit}:${days}`, async () => {
    const { rows } = await runReport({
      dateRanges: [{ startDate: dateStr(days), endDate: dateStr(0) }],
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
    });

    return rows.map((r) => ({
      screenName: r.dimensionValues[0].value,
      pageViews: metricValue(r, 0),
      activeUsers: metricValue(r, 1),
    }));
  });
};
