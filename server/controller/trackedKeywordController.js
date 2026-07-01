import {
  listTrackedKeywords,
  addTrackedKeyword,
  updateTrackedKeyword,
  deleteTrackedKeyword,
  getTrackedKeywordHistory,
  checkTrackedKeyword,
  manualCheckTrackedKeyword,
  checkAllTrackedKeywords,
  getQuotaStatus,
} from "../helper/gsc/trackedKeywordHelper.js";

const actorLabel = (req) =>
  req.user?.emailId || req.user?.userName || String(req.user?._id || req.userId || "");

export const listKeywords = async (req, res) => {
  try {
    const data = await listTrackedKeywords();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const createKeyword = async (req, res) => {
  try {
    if (!req.body?.keyword) {
      return res.status(400).send({ message: "keyword is required" });
    }
    const data = await addTrackedKeyword(req.body, actorLabel(req));
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const patchKeyword = async (req, res) => {
  try {
    const data = await updateTrackedKeyword(req.params.id, req.body);
    res.send(data);
  } catch (err) {
    res.status(err.message === "Tracked keyword not found" ? 404 : 500).send({ message: err.message });
  }
};

export const removeKeyword = async (req, res) => {
  try {
    const data = await deleteTrackedKeyword(req.params.id);
    res.send(data);
  } catch (err) {
    res.status(err.message === "Tracked keyword not found" ? 404 : 500).send({ message: err.message });
  }
};

export const keywordHistory = async (req, res) => {
  try {
    const data = await getTrackedKeywordHistory(req.params.id);
    res.send(data);
  } catch (err) {
    res.status(err.message === "Tracked keyword not found" ? 404 : 500).send({ message: err.message });
  }
};

export const checkKeyword = async (req, res) => {
  try {
    const data = await checkTrackedKeyword(req.params.id);
    res.send(data);
  } catch (err) {
    res.status(err.message === "Tracked keyword not found" ? 404 : 500).send({ message: err.message });
  }
};

export const manualCheckKeyword = async (req, res) => {
  try {
    const data = await manualCheckTrackedKeyword(req.params.id, {
      ...req.body,
      checkedBy: actorLabel(req),
    });
    res.send(data);
  } catch (err) {
    res.status(err.message === "Tracked keyword not found" ? 404 : 500).send({ message: err.message });
  }
};

export const checkAllKeywords = async (req, res) => {
  try {
    const data = await checkAllTrackedKeywords();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const quotaStatus = async (req, res) => {
  try {
    const data = await getQuotaStatus();
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
