import {
  getOverview,
  getTrends,
  getTopQueries,
  getTopPages,
  getDevices,
  getCountries,
  getOpportunities,
  getKeywordGaps,
} from "../helper/gsc/gscHelper.js";

export const overview = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getOverview(days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const trends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const data = await getTrends(days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const queries = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const days = parseInt(req.query.days) || 28;
    const data = await getTopQueries(limit, days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const pages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const days = parseInt(req.query.days) || 28;
    const data = await getTopPages(limit, days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const devices = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getDevices(days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const countries = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const days = parseInt(req.query.days) || 28;
    const data = await getCountries(limit, days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const opportunities = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 28;
    const data = await getOpportunities(days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const keywordGaps = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const data = await getKeywordGaps(days);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
