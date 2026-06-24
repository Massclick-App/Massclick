import dotenv from "dotenv";
import AWS from "aws-sdk";
import sharp from "sharp";
import { fileURLToPath } from "url";

import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import advertismentModel from "../../model/advertistment/advertismentModel.js";
import seoPageContentBlogModel from "../../model/seoModel/seoPageContentBlogModel.js";
import userModel from "../../model/userModel.js";
import message91Model from "../../model/msg91Model/usersModels.js";
import businessWebpMigrationJobModel from "../../model/maintenance/businessWebpMigrationJobModel.js";
import {
  invalidateAdvertisementCache,
  invalidateCategoryCache,
  invalidateCategoryDisplaySettingsCache,
  invalidateDashboardCache,
  invalidateSearchCache,
  invalidateSeoCache,
} from "../../utils/cacheInvalidation.js";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

const assetsBucket = process.env.AWS_S3_BUCKET_MASSCLICK;

if (!assetsBucket) {
  throw new Error("AWS S3 bucket not configured in env");
}

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const JOB_TYPE = "business-webp-migration";
const RETRY_DELAYS_MS = [500, 1000, 2000];
const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
const STOPPED_STATUS = new Set(["paused", "cancelled", "completed", "completed_with_errors", "failed"]);

const SUPPORTED_SCOPES = {
  businessList: {
    scopeKey: "businessList",
    scopeLabel: "Business List",
    scopeDescription: "Convert business banners, galleries, and KYC images.",
    folderPrefix: "businessList",
    progressKey: "businesses",
    projection: {
      bannerImageKey: 1,
      businessImagesKey: 1,
      kycDocumentsKey: 1,
      qrCode: 1,
      businessName: 1,
    },
    buildQuery: () => ({
      $or: [
        { bannerImageKey: { $type: "string" } },
        { businessImagesKey: { $elemMatch: { $type: "string" } } },
        { kycDocumentsKey: { $elemMatch: { $type: "string" } } },
        { "qrCode.qrImageKey": { $type: "string" } },
      ],
    }),
    model: businessListModel,
    fields: [
      { path: "bannerImageKey", kind: "single" },
      { path: "businessImagesKey", kind: "array" },
      { path: "kycDocumentsKey", kind: "array" },
      { path: "qrCode.qrImageKey", kind: "single" },
    ],
    invalidate: [invalidateSearchCache, invalidateDashboardCache, invalidateCategoryCache],
  },
  category: {
    scopeKey: "category",
    scopeLabel: "Category Images",
    scopeDescription: "Convert legacy category hero, card, and thumbnail images.",
    folderPrefix: "category",
    progressKey: "documents",
    projection: {
      categoryImageKey: 1,
      liveImageKey: 1,
      categoryImages: 1,
      category: 1,
    },
    buildQuery: () => ({
      $or: [
        { categoryImageKey: { $type: "string" } },
        { liveImageKey: { $type: "string" } },
        ...[
          "webHero",
          "webCard",
          "webThumbnail",
          "mobileVertical",
          "mobileCard",
          "mobileThumbnail",
        ].map((variant) => ({ [`categoryImages.${variant}`]: { $type: "string" } })),
      ],
    }),
    model: categoryModel,
    fields: [
      { path: "categoryImageKey", kind: "single" },
      { path: "liveImageKey", kind: "single" },
      { path: "categoryImages", kind: "object" },
    ],
    invalidate: [
      invalidateCategoryCache,
      invalidateCategoryDisplaySettingsCache,
      invalidateSearchCache,
    ],
  },
  seo: {
    scopeKey: "seo",
    scopeLabel: "SEO Blog Images",
    scopeDescription: "Convert SEO blog profile, page, and OG images.",
    folderPrefix: "seo",
    progressKey: "documents",
    projection: {
      profileImageKey: 1,
      pageImageKey: 1,
      ogImageKey: 1,
      heading: 1,
      category: 1,
      location: 1,
    },
    buildQuery: () => ({
      $or: [
        { profileImageKey: { $type: "string" } },
        { pageImageKey: { $elemMatch: { $type: "string" } } },
        { ogImageKey: { $type: "string" } },
      ],
    }),
    model: seoPageContentBlogModel,
    fields: [
      { path: "profileImageKey", kind: "single" },
      { path: "pageImageKey", kind: "array" },
      { path: "ogImageKey", kind: "single" },
    ],
    invalidate: [invalidateSeoCache],
  },
  advertisements: {
    scopeKey: "advertisements",
    scopeLabel: "Advertisements",
    scopeDescription: "Convert advertisement banner images.",
    folderPrefix: "advertisements",
    progressKey: "documents",
    projection: {
      bannerImageKey: 1,
      mobileBannerImageKey: 1,
      title: 1,
    },
    buildQuery: () => ({
      $or: [
        { bannerImageKey: { $type: "string" } },
        { mobileBannerImageKey: { $type: "string" } },
      ],
    }),
    model: advertismentModel,
    fields: [
      { path: "bannerImageKey", kind: "single" },
      { path: "mobileBannerImageKey", kind: "single" },
    ],
    invalidate: [invalidateAdvertisementCache],
  },
  admin: {
    scopeKey: "admin",
    scopeLabel: "Admin Profiles",
    scopeDescription: "Convert admin user profile images.",
    folderPrefix: "admin",
    progressKey: "documents",
    projection: {
      userProfileKey: 1,
      userName: 1,
      emailId: 1,
    },
    buildQuery: () => ({
      userProfileKey: { $type: "string" },
    }),
    model: userModel,
    fields: [
      { path: "userProfileKey", kind: "single" },
    ],
    invalidate: [],
  },
  user: {
    scopeKey: "user",
    scopeLabel: "Customer Profiles",
    scopeDescription: "Convert customer profile images from the user folder.",
    folderPrefix: "user",
    progressKey: "documents",
    projection: {
      profileImageKey: 1,
      userName: 1,
      mobileNumber1: 1,
    },
    buildQuery: () => ({
      profileImageKey: { $type: "string" },
    }),
    model: message91Model,
    fields: [
      { path: "profileImageKey", kind: "single" },
    ],
    invalidate: [],
  },
};

const activeJobIds = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeScopeKey = (scopeKey = "businessList") =>
  SUPPORTED_SCOPES[scopeKey] ? scopeKey : "businessList";

const getScopeConfig = (scopeKey = "businessList") =>
  SUPPORTED_SCOPES[normalizeScopeKey(scopeKey)];

export const getSupportedWebpMigrationScopes = () =>
  Object.values(SUPPORTED_SCOPES).map((scope) => ({
    scopeKey: scope.scopeKey,
    scopeLabel: scope.scopeLabel,
    scopeDescription: scope.scopeDescription,
    folderPrefix: scope.folderPrefix,
  }));

const extractS3Key = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (!trimmed.startsWith("http")) {
    return trimmed;
  }

  try {
    if (trimmed.includes("/https://")) {
      const match = trimmed.match(/\/https:\/\/[^/]+\/(.+?)(?:\?|$)/);
      if (match?.[1]) return match[1];
    }

    const urlObj = new URL(trimmed);
    return urlObj.pathname.replace(/^\/+/, "");
  } catch {
    return trimmed;
  }
};

const isWebpKey = (value) => {
  const key = extractS3Key(value).toLowerCase();
  return key.endsWith(".webp");
};

const toWebpKey = (value) => {
  const key = extractS3Key(value);
  if (!key) return "";
  if (key.toLowerCase().endsWith(".webp")) return key;
  return key.replace(/\.[^.\/]+$/, "") + ".webp";
};

const getByPath = (obj, path) =>
  path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);

const setByPath = (obj, path, value) => {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== "object") {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
};

const incrementFailureBucket = (bucket, failure) => {
  if (bucket.length < 25) {
    bucket.push(failure);
  }
};

const retryAsync = async (fn, retryCount = 3) => {
  let lastError;
  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retryCount - 1) {
        await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
      }
    }
  }
  throw lastError;
};

const deleteSourceObject = async (sourceKey) => {
  try {
    await s3.deleteObject({
      Bucket: assetsBucket,
      Key: sourceKey,
    }).promise();
    return true;
  } catch (error) {
    if (error?.code === "NoSuchKey" || error?.code === "NotFound") {
      return true;
    }
    throw error;
  }
};

const convertSourceKeyToWebp = async (sourceKey, retryCount = 3) => {
  const normalizedSourceKey = extractS3Key(sourceKey);
  const webpKey = toWebpKey(normalizedSourceKey);
  if (!normalizedSourceKey || !webpKey) {
    throw new Error("Invalid S3 key");
  }

  if (isWebpKey(normalizedSourceKey)) {
    return {
      sourceKey: normalizedSourceKey,
      webpKey: normalizedSourceKey,
      skipped: true,
    };
  }

  const result = await retryAsync(async () => {
    const object = await s3.getObject({
      Bucket: assetsBucket,
      Key: normalizedSourceKey,
    }).promise();

    const sourceBuffer = Buffer.isBuffer(object.Body)
      ? object.Body
      : Buffer.from(object.Body || []);

    const webpBuffer = await sharp(sourceBuffer)
      .webp({ quality: 82 })
      .toBuffer();

    await s3.putObject({
      Bucket: assetsBucket,
      Key: webpKey,
      Body: webpBuffer,
      ContentType: "image/webp",
    }).promise();

    return {
      sourceKey: normalizedSourceKey,
      webpKey,
      skipped: false,
    };
  }, retryCount);

  return result;
};

const updateJob = async (jobId, patch) => {
  await businessWebpMigrationJobModel.findByIdAndUpdate(jobId, {
    $set: {
      ...patch,
      lastHeartbeatAt: new Date(),
    },
  });
};

const getLatestJobControlState = async (jobId) => {
  const job = await businessWebpMigrationJobModel
    .findById(jobId)
    .select("status lastProcessedBusinessId lastProcessedItemId scopeKey")
    .lean();

  if (!job) {
    throw new Error("Migration job not found");
  }

  return job;
};

const shouldStopForControlState = (status) => STOPPED_STATUS.has(status);

const scheduleWebpMigration = (jobId) => {
  const launch = (remainingWaitMs = 30000) => {
    if (!jobId) {
      return;
    }

    if (!activeJobIds.has(jobId)) {
      runWebpMigration(jobId).catch((error) => {
        console.error("WebP migration crashed:", error);
      });
      return;
    }

    if (remainingWaitMs <= 0) {
      console.warn("WebP migration is still active; skipping restart for now.");
      return;
    }

    setTimeout(() => launch(remainingWaitMs - 1000), 1000);
  };

  setTimeout(() => launch(), 0);
};

const processValue = async ({
  rawValue,
  jobRecord,
  cache,
  retryCount,
  allowDeleteOriginals,
  failedEntries,
  failureContext,
}) => {
  const sourceKey = extractS3Key(rawValue);
  if (!sourceKey) {
    jobRecord.progress.imagesSkipped += 1;
    return { nextValue: rawValue, changed: false, deleteSource: null };
  }

  if (isWebpKey(sourceKey)) {
    jobRecord.progress.imagesSkipped += 1;
    return { nextValue: sourceKey, changed: rawValue !== sourceKey, deleteSource: null };
  }

  jobRecord.progress.imagesScanned += 1;

  if (cache.has(sourceKey)) {
    const cached = cache.get(sourceKey);
    jobRecord.progress.imagesConverted += 1;
    return {
      nextValue: cached,
      changed: rawValue !== cached,
      deleteSource: allowDeleteOriginals ? sourceKey : null,
    };
  }

  try {
    const converted = await convertSourceKeyToWebp(sourceKey, retryCount);
    cache.set(sourceKey, converted.webpKey);
    jobRecord.progress.imagesConverted += 1;
    return {
      nextValue: converted.webpKey,
      changed: rawValue !== converted.webpKey,
      deleteSource: allowDeleteOriginals && !converted.skipped ? sourceKey : null,
    };
  } catch (error) {
    jobRecord.progress.imagesFailed += 1;
    incrementFailureBucket(failedEntries, {
      ...failureContext,
      sourceKey,
      error: error?.message || String(error),
    });
    return { nextValue: rawValue, changed: false, deleteSource: null };
  }
};

const processDocument = async (doc, jobRecord, cache, scopeConfig) => {
  const changedPaths = [];
  const failedEntries = [];
  const imagesToDelete = new Set();
  const updates = {};

  for (const field of scopeConfig.fields) {
    const currentValue = getByPath(doc, field.path);

    if (field.kind === "array") {
      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        continue;
      }

      const nextValues = [];
      let fieldChanged = false;

      for (const rawItem of currentValue) {
        const { nextValue, changed, deleteSource } = await processValue({
          rawValue: rawItem,
          jobRecord,
          cache,
          retryCount: jobRecord.options?.retryCount || 3,
          allowDeleteOriginals: jobRecord.options?.deleteOriginals,
          failedEntries,
          failureContext: {
            scopeKey: scopeConfig.scopeKey,
            fieldPath: field.path,
            documentId: String(doc._id),
            documentLabel: doc.businessName || doc.title || doc.heading || doc.userName || doc.name || "",
          },
        });

        nextValues.push(nextValue);
        if (changed) {
          fieldChanged = true;
        }
        if (deleteSource) {
          imagesToDelete.add(deleteSource);
        }
      }

      if (fieldChanged) {
        setByPath(updates, field.path, nextValues);
        changedPaths.push(field.path);
      }
      continue;
    }

    if (field.kind === "object") {
      if (!currentValue || typeof currentValue !== "object" || Array.isArray(currentValue)) {
        continue;
      }

      const nextObject = { ...currentValue };
      let fieldChanged = false;

      for (const [variant, rawItem] of Object.entries(currentValue)) {
        const { nextValue, changed, deleteSource } = await processValue({
          rawValue: rawItem,
          jobRecord,
          cache,
          retryCount: jobRecord.options?.retryCount || 3,
          allowDeleteOriginals: jobRecord.options?.deleteOriginals,
          failedEntries,
          failureContext: {
            scopeKey: scopeConfig.scopeKey,
            fieldPath: `${field.path}.${variant}`,
            documentId: String(doc._id),
            documentLabel: doc.category || doc.title || doc.heading || doc.userName || doc.name || "",
          },
        });

        nextObject[variant] = nextValue;
        if (changed) {
          fieldChanged = true;
        }
        if (deleteSource) {
          imagesToDelete.add(deleteSource);
        }
      }

      if (fieldChanged) {
        setByPath(updates, field.path, nextObject);
        changedPaths.push(field.path);
      }
      continue;
    }

    const { nextValue, changed, deleteSource } = await processValue({
      rawValue: currentValue,
      jobRecord,
      cache,
      retryCount: jobRecord.options?.retryCount || 3,
      allowDeleteOriginals: jobRecord.options?.deleteOriginals,
      failedEntries,
      failureContext: {
        scopeKey: scopeConfig.scopeKey,
        fieldPath: field.path,
        documentId: String(doc._id),
        documentLabel: doc.businessName || doc.title || doc.heading || doc.userName || doc.name || "",
      },
    });

    if (changed) {
      setByPath(updates, field.path, nextValue);
      changedPaths.push(field.path);
    }
    if (deleteSource) {
      imagesToDelete.add(deleteSource);
    }
  }

  if (!changedPaths.length) {
    if (scopeConfig.progressKey === "businesses") {
      jobRecord.progress.businessesScanned += 1;
    }
    jobRecord.progress.documentsScanned += 1;
    return { changed: false, failures: failedEntries };
  }

  setByPath(updates, "updatedAt", new Date());
  await scopeConfig.model.updateOne({ _id: doc._id }, { $set: updates });

  if (scopeConfig.progressKey === "businesses") {
    jobRecord.progress.businessesScanned += 1;
    jobRecord.progress.businessesUpdated += 1;
  }
  jobRecord.progress.documentsScanned += 1;
  jobRecord.progress.documentsUpdated += 1;

  if (jobRecord.options.deleteOriginals && imagesToDelete.size > 0) {
    for (const sourceKey of imagesToDelete) {
      try {
        await deleteSourceObject(sourceKey);
        jobRecord.progress.originalsDeleted += 1;
      } catch (error) {
        incrementFailureBucket(failedEntries, {
          scopeKey: scopeConfig.scopeKey,
          fieldPath: "deleteOriginal",
          documentId: String(doc._id),
          documentLabel: doc.businessName || doc.title || doc.heading || doc.userName || doc.name || "",
          sourceKey,
          error: error?.message || String(error),
        });
      }
    }
  }

  return {
    changed: true,
    failures: failedEntries,
  };
};

const countCandidateImages = async (scopeConfig) => {
  let candidateImages = 0;
  const cursor = scopeConfig.model.find(scopeConfig.buildQuery(), scopeConfig.projection).lean().cursor({ batchSize: 100 });

  for await (const doc of cursor) {
    for (const field of scopeConfig.fields) {
      const value = getByPath(doc, field.path);

      if (field.kind === "array" && Array.isArray(value)) {
        candidateImages += value.filter((item) => {
          const key = extractS3Key(item);
          return key && !isWebpKey(key);
        }).length;
        continue;
      }

      if (field.kind === "object" && value && typeof value === "object" && !Array.isArray(value)) {
        candidateImages += Object.values(value).filter((item) => {
          const key = extractS3Key(item);
          return key && !isWebpKey(key);
        }).length;
        continue;
      }

      const key = extractS3Key(value);
      if (key && !isWebpKey(key)) {
        candidateImages += 1;
      }
    }
  }

  return candidateImages;
};

const countCandidateDocuments = async (scopeConfig) => {
  try {
    return await scopeConfig.model.countDocuments(scopeConfig.buildQuery());
  } catch {
    return 0;
  }
};

const getLatestJob = async (scopeKey = null) => {
  const query = { jobType: JOB_TYPE };
  if (scopeKey) {
    query.scopeKey = normalizeScopeKey(scopeKey);
  }

  return businessWebpMigrationJobModel
    .findOne(query)
    .sort({ createdAt: -1 })
    .lean();
};

export const getLatestWebpMigrationJob = async (scopeKey = null) =>
  getLatestJob(scopeKey);

export const getWebpMigrationJobById = async (jobId) => {
  if (!jobId) return null;
  return businessWebpMigrationJobModel.findById(jobId).lean();
};

export const startWebpMigration = async ({
  scopeKey = "businessList",
  deleteOriginals = true,
  batchSize = 100,
  retryCount = 3,
  createdBy = null,
} = {}) => {
  const normalizedScopeKey = normalizeScopeKey(scopeKey);
  const scopeConfig = getScopeConfig(normalizedScopeKey);

  const runningJob = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: { $in: [...ACTIVE_JOB_STATUSES] },
  }).sort({ createdAt: -1 }).lean();

  if (runningJob) {
    return { job: runningJob, alreadyRunning: true, resumed: false };
  }

  const pausedJob = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    scopeKey: normalizedScopeKey,
    status: "paused",
  }).sort({ createdAt: -1 });

  if (pausedJob) {
    pausedJob.status = "running";
    pausedJob.startedAt = pausedJob.startedAt || new Date();
    pausedJob.lastHeartbeatAt = new Date();
    pausedJob.lastError = "";
    if (typeof deleteOriginals === "boolean") {
      pausedJob.options.deleteOriginals = Boolean(deleteOriginals);
    }
    if (batchSize) {
      pausedJob.options.batchSize = Math.max(1, Number(batchSize) || pausedJob.options.batchSize || 100);
    }
    if (retryCount) {
      pausedJob.options.retryCount = Math.max(1, Number(retryCount) || pausedJob.options.retryCount || 3);
    }
    await pausedJob.save();

    scheduleWebpMigration(String(pausedJob._id));

    return {
      job: pausedJob.toObject ? pausedJob.toObject() : pausedJob,
      alreadyRunning: false,
      resumed: true,
    };
  }

  const candidateDocuments = await countCandidateDocuments(scopeConfig);
  const candidateImages = await countCandidateImages(scopeConfig);

  const jobDoc = await businessWebpMigrationJobModel.create({
    jobType: JOB_TYPE,
    scopeKey: scopeConfig.scopeKey,
    scopeLabel: scopeConfig.scopeLabel,
    status: "queued",
    options: {
      deleteOriginals: Boolean(deleteOriginals),
      batchSize: Math.max(1, Number(batchSize) || 100),
      retryCount: Math.max(1, Number(retryCount) || 3),
    },
    totals: {
      candidateBusinesses: scopeConfig.progressKey === "businesses" ? candidateDocuments : 0,
      candidateDocuments,
      candidateImages,
    },
    createdBy: {
      userId: String(createdBy?.userId || ""),
      userName: String(createdBy?.userName || createdBy?.name || ""),
      email: String(createdBy?.email || createdBy?.emailId || ""),
    },
    progress: {
      businessesScanned: 0,
      businessesUpdated: 0,
      documentsScanned: 0,
      documentsUpdated: 0,
      imagesScanned: 0,
      imagesConverted: 0,
      imagesSkipped: 0,
      imagesFailed: 0,
      originalsDeleted: 0,
    },
    failures: [],
    summary: {
      totalDocumentsTouched: 0,
      totalDocumentsWithChanges: 0,
    },
  });

  setImmediate(() => {
    scheduleWebpMigration(String(jobDoc._id));
  });

  return { job: jobDoc.toObject ? jobDoc.toObject() : jobDoc, alreadyRunning: false, resumed: false };
};

export const runWebpMigration = async (jobId) => {
  if (!jobId || activeJobIds.has(jobId)) {
    return;
  }

  activeJobIds.add(jobId);

  const jobRecord = await businessWebpMigrationJobModel.findById(jobId);
  if (!jobRecord) {
    activeJobIds.delete(jobId);
    throw new Error("Migration job not found");
  }

  const scopeConfig = getScopeConfig(jobRecord.scopeKey);
  const cache = new Map();

  try {
    jobRecord.status = "running";
    jobRecord.startedAt = jobRecord.startedAt || new Date();
    jobRecord.lastHeartbeatAt = new Date();
    jobRecord.lastError = "";
    await jobRecord.save();

    const query = {
      ...scopeConfig.buildQuery(),
      ...(jobRecord.lastProcessedItemId
        ? { _id: { $gt: jobRecord.lastProcessedItemId } }
        : {}),
    };

    const cursor = scopeConfig.model
      .find(query, scopeConfig.projection)
      .sort({ _id: 1 })
      .lean()
      .cursor({ batchSize: jobRecord.options?.batchSize || 100 });

    for await (const doc of cursor) {
      const controlState = await getLatestJobControlState(jobId);
      if (shouldStopForControlState(controlState.status)) {
        jobRecord.status = controlState.status;
        jobRecord.lastProcessedItemId =
          controlState.lastProcessedItemId || jobRecord.lastProcessedItemId || "";
        if (controlState.status === "cancelled") {
          jobRecord.cancelledAt = jobRecord.cancelledAt || new Date();
          jobRecord.finishedAt = jobRecord.finishedAt || new Date();
        }
        if (controlState.status === "paused") {
          jobRecord.pausedAt = jobRecord.pausedAt || new Date();
        }
        jobRecord.lastHeartbeatAt = new Date();
        await jobRecord.save().catch(() => {});
        break;
      }

      const result = await processDocument(doc, jobRecord, cache, scopeConfig);
      jobRecord.failures = [...jobRecord.failures, ...result.failures].slice(0, 25);
      jobRecord.summary.totalDocumentsTouched += 1;
      if (result.changed) {
        jobRecord.summary.totalDocumentsWithChanges += 1;
      }
      jobRecord.lastProcessedItemId = String(doc._id);
      if (scopeConfig.progressKey === "businesses") {
        jobRecord.lastProcessedBusinessId = String(doc._id);
      }

      await updateJob(jobId, {
        progress: jobRecord.progress,
        summary: jobRecord.summary,
        failures: jobRecord.failures.slice(0, 25),
        lastProcessedBusinessId: jobRecord.lastProcessedBusinessId,
        lastProcessedItemId: jobRecord.lastProcessedItemId,
      });
    }

    const finalControlState = await getLatestJobControlState(jobId);
    if (finalControlState.status === "paused") {
      jobRecord.status = "paused";
      jobRecord.pausedAt = jobRecord.pausedAt || new Date();
      jobRecord.lastHeartbeatAt = new Date();
      await jobRecord.save();
      return jobRecord.toObject();
    }

    if (finalControlState.status === "cancelled") {
      jobRecord.status = "cancelled";
      jobRecord.cancelledAt = jobRecord.cancelledAt || new Date();
      jobRecord.finishedAt = jobRecord.finishedAt || new Date();
      jobRecord.lastHeartbeatAt = new Date();
      await jobRecord.save();
      return jobRecord.toObject();
    }

    jobRecord.status =
      jobRecord.progress.imagesFailed > 0
        ? "completed_with_errors"
        : "completed";
    jobRecord.finishedAt = new Date();
    jobRecord.lastHeartbeatAt = new Date();
    await jobRecord.save();

    await Promise.all(scopeConfig.invalidate.map((fn) => fn()));
  } catch (error) {
    jobRecord.status = "failed";
    jobRecord.lastError = error?.message || String(error);
    jobRecord.finishedAt = new Date();
    jobRecord.lastHeartbeatAt = new Date();
    await jobRecord.save().catch(() => {});
    throw error;
  } finally {
    activeJobIds.delete(jobId);
  }

  return jobRecord.toObject();
};

export const pauseWebpMigration = async ({ scopeKey = null } = {}) => {
  const query = {
    jobType: JOB_TYPE,
    status: { $in: ["queued", "running"] },
  };
  if (scopeKey) {
    query.scopeKey = normalizeScopeKey(scopeKey);
  }

  const job = await businessWebpMigrationJobModel.findOne(query).sort({ createdAt: -1 });

  if (!job) {
    return null;
  }

  job.status = "paused";
  job.pausedAt = new Date();
  job.lastHeartbeatAt = new Date();
  await job.save();
  return job.toObject();
};

export const cancelWebpMigration = async ({ scopeKey = null } = {}) => {
  const query = {
    jobType: JOB_TYPE,
    status: { $in: ["queued", "running", "paused"] },
  };
  if (scopeKey) {
    query.scopeKey = normalizeScopeKey(scopeKey);
  }

  const job = await businessWebpMigrationJobModel.findOne(query).sort({ createdAt: -1 });

  if (!job) {
    return null;
  }

  job.status = "cancelled";
  job.cancelledAt = new Date();
  job.finishedAt = new Date();
  job.lastHeartbeatAt = new Date();
  await job.save();
  return job.toObject();
};
