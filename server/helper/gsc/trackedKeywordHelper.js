import trackedKeywordModel from "../../model/seoModel/trackedKeywordModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import {
  checkKeywordRank,
  getQuotaRemainingToday,
  getQuotaUsedToday,
  getDailyQuota,
  DEFAULTS,
} from "./rankCheckHelper.js";

const withLatest = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  const history = plain.history || [];
  const latest = history[history.length - 1] || null;
  const previous = history[history.length - 2] || null;
  const delta =
    latest?.rank != null && previous?.rank != null ? previous.rank - latest.rank : null;

  return { ...plain, latest, delta };
};

export const listTrackedKeywords = async () => {
  const docs = await trackedKeywordModel.find().sort({ createdAt: -1 });
  return docs.map(withLatest);
};

export const addTrackedKeyword = async (data, addedBy) => {
  const doc = new trackedKeywordModel({
    keyword: data.keyword,
    location: data.location || DEFAULTS.location,
    device: data.device || DEFAULTS.device,
    category: data.category || "",
    targetUrl: data.targetUrl || "",
    notes: data.notes || "",
    source: data.source || "manual",
    addedBy: addedBy || "",
  });
  await doc.save();
  return withLatest(doc);
};

export const updateTrackedKeyword = async (id, data) => {
  const allowed = ["notes", "targetUrl", "category", "isActive", "location", "device"];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  const doc = await trackedKeywordModel.findByIdAndUpdate(id, update, { new: true });
  if (!doc) throw new Error("Tracked keyword not found");
  return withLatest(doc);
};

export const deleteTrackedKeyword = async (id) => {
  const result = await trackedKeywordModel.findByIdAndDelete(id);
  if (!result) throw new Error("Tracked keyword not found");
  return { deleted: true };
};

export const getTrackedKeywordHistory = async (id) => {
  const doc = await trackedKeywordModel.findById(id).select("keyword history");
  if (!doc) throw new Error("Tracked keyword not found");
  const history = doc.history.map((h) => {
    const entry = h.toObject ? h.toObject() : h;
    return {
      ...entry,
      screenshotUrl: entry.screenshotKey ? getSignedUrlByKey(entry.screenshotKey) : "",
    };
  });
  return { keyword: doc.keyword, history };
};

export const checkTrackedKeyword = async (id) => {
  const doc = await trackedKeywordModel.findById(id);
  if (!doc) throw new Error("Tracked keyword not found");

  const result = await checkKeywordRank({
    keyword: doc.keyword,
    location: doc.location,
    device: doc.device,
  });

  doc.history.push({
    checkedAt: new Date(),
    status: result.status,
    rank: result.rank,
    page: result.page,
    url: result.url,
    provider: "google_cse",
  });
  await doc.save();
  return withLatest(doc);
};

export const manualCheckTrackedKeyword = async (id, { rank, page, url, screenshot, checkedBy }) => {
  const doc = await trackedKeywordModel.findById(id);
  if (!doc) throw new Error("Tracked keyword not found");

  let screenshotKey = "";
  if (screenshot) {
    const uploadPath = `seo/keyword-tracking/${doc._id}/${Date.now()}`;
    const uploaded = await uploadImageToS3(screenshot, uploadPath);
    screenshotKey = uploaded.key;
  }

  const hasRank = rank !== undefined && rank !== null && rank !== "";
  doc.history.push({
    checkedAt: new Date(),
    status: hasRank ? "found" : "not_found",
    rank: hasRank ? Number(rank) : null,
    page: page ? Number(page) : null,
    url: url || "",
    provider: "manual",
    screenshotKey,
    checkedBy: checkedBy || "",
  });
  await doc.save();
  return withLatest(doc);
};

export const checkAllTrackedKeywords = async () => {
  const keywords = await trackedKeywordModel.find({ isActive: true });

  const results = [];
  const skipped = [];

  for (const doc of keywords) {
    const used = getDailyQuota() - (await getQuotaRemainingToday());
    if (getDailyQuota() - used <= 0) {
      skipped.push(doc.keyword);
      continue;
    }

    try {
      const result = await checkKeywordRank({
        keyword: doc.keyword,
        location: doc.location,
        device: doc.device,
      });
      doc.history.push({
        checkedAt: new Date(),
        status: result.status,
        rank: result.rank,
        page: result.page,
        url: result.url,
        provider: "google_cse",
      });
      await doc.save();
      results.push({ id: doc._id, keyword: doc.keyword, ...result });
    } catch (err) {
      skipped.push(doc.keyword);
    }
  }

  return {
    checked: results.length,
    skipped,
    quotaRemaining: await getQuotaRemainingToday(),
  };
};

export const getQuotaStatus = async () => ({
  used: await getQuotaUsedToday(),
  remaining: await getQuotaRemainingToday(),
  limit: getDailyQuota(),
});
