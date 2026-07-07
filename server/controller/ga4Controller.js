import {
  getOverview,
  getTrends,
  getTrafficSources,
  getLocations,
  getDevices,
  getConversions,
} from "../helper/ga4/ga4Helper.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("GA4");

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

export const conversions = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const limit = parseInt(req.query.limit) || 25;
    const data = await getConversions(days, limit);
    res.send(data);
  } catch (err) {
    await logger.error("conversions controller failed", err);
    res.status(500).send({ message: err.message });
  }
};
