import {
  getOverview,
  getTrends,
  getTrafficSources,
  getLocations,
  getDevices,
  getCities,
  getBrowsers,
  getPages,
  getLandingPages,
  getAcquisition,
  getEngagementOverview,
  getReferrers,
  getCampaigns,
  getOperatingSystems,
  getPlatforms,
  getDeviceModels,
  getScreenResolutions,
  getRegions,
  getContinents,
  getSubContinents,
  getNewVsReturning,
  getDayOfWeek,
  getHourOfDay,
  getScreens,
} from "../helper/ga4/ga4Helper.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("GA4");

// Thin (days[, limit]) => JSON handlers all share the same shape, so the
// remaining endpoints below are generated rather than hand-copied.
const daysHandler = (name, fn, defaultDays = 28) => async (req, res) => {
  try {
    const days = parseInt(req.query.days) || defaultDays;
    res.send(await fn(days));
  } catch (err) {
    await logger.error(`${name} controller failed`, err);
    res.status(500).send({ message: err.message });
  }
};

const daysLimitHandler = (name, fn, defaultDays = 28, defaultLimit = 25) => async (req, res) => {
  try {
    const days = parseInt(req.query.days) || defaultDays;
    const limit = parseInt(req.query.limit) || defaultLimit;
    res.send(await fn(days, limit));
  } catch (err) {
    await logger.error(`${name} controller failed`, err);
    res.status(500).send({ message: err.message });
  }
};

export const overview = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getOverview(days);
    res.send(data);
  } catch (err) {
    await logger.error("overview controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const trends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const data = await getTrends(days);
    res.send(data);
  } catch (err) {
    await logger.error("trends controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const trafficSources = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getTrafficSources(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("trafficSources controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const locations = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getLocations(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("locations controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const devices = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getDevices(days);
    res.send(data);
  } catch (err) {
    await logger.error("devices controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const cities = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getCities(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("cities controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const browsers = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getBrowsers(days);
    res.send(data);
  } catch (err) {
    await logger.error("browsers controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const pages = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getPages(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("pages controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const landingPages = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getLandingPages(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("landingPages controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const acquisition = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getAcquisition(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("acquisition controller failed", err);
    res.status(500).send({ message: err.message });
  }
};

export const engagementOverview = daysHandler("engagementOverview", getEngagementOverview);
export const referrers = daysLimitHandler("referrers", getReferrers);
export const campaigns = daysLimitHandler("campaigns", getCampaigns);
export const operatingSystems = daysHandler("operatingSystems", getOperatingSystems);
export const platforms = daysHandler("platforms", getPlatforms);
export const deviceModels = daysLimitHandler("deviceModels", getDeviceModels);
export const screenResolutions = daysLimitHandler("screenResolutions", getScreenResolutions);
export const regions = daysLimitHandler("regions", getRegions);
export const continents = daysHandler("continents", getContinents);
export const subContinents = daysHandler("subContinents", getSubContinents);
export const newVsReturning = daysHandler("newVsReturning", getNewVsReturning);
export const dayOfWeek = daysHandler("dayOfWeek", getDayOfWeek);
export const hourOfDay = daysHandler("hourOfDay", getHourOfDay);
export const screens = daysLimitHandler("screens", getScreens);
