import dotenv from "dotenv";
import AWS from "aws-sdk";
import sharp from "sharp";
import { fileURLToPath } from "url";
import businessListModel from "../../model/businessList/businessListModel.js";
import businessWebpMigrationJobModel from "../../model/maintenance/businessWebpMigrationJobModel.js";
import {
  invalidateCategoryCache,
  invalidateDashboardCache,
  invalidateSearchCache,
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
const TARGET_FIELDS = [
  { path: "bannerImageKey", kind: "single" },
  { path: "businessImagesKey", kind: "array" },
  { path: "kycDocumentsKey", kind: "array" },
  { path: "qrCode.qrImageKey", kind: "single" },
];

const activeJobIds = new Set();
const STOPPED_STATUS = new Set(["paused", "cancelled", "completed", "completed_with_errors", "failed"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await s3
      .deleteObject({
        Bucket: assetsBucket,
        Key: sourceKey,
      })
      .promise();
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
    const object = await s3
      .getObject({
        Bucket: assetsBucket,
        Key: normalizedSourceKey,
      })
      .promise();

    const sourceBuffer = Buffer.isBuffer(object.Body)
      ? object.Body
      : Buffer.from(object.Body || []);

    const webpBuffer = await sharp(sourceBuffer)
      .webp({ quality: 82 })
      .toBuffer();

    await s3
      .putObject({
        Bucket: assetsBucket,
        Key: webpKey,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
      .promise();

    return {
      sourceKey: normalizedSourceKey,
      webpKey,
      skipped: false,
    };
  }, retryCount);

  return result;
};

const buildQuery = () => ({
  $or: TARGET_FIELDS.map((field) => {
    if (field.kind === "array") {
      return {
        [field.path]: {
          $elemMatch: { $type: "string" },
        },
      };
    }

    return {
      [field.path]: { $type: "string" },
    };
  }),
});

const countCandidateImages = async () => {
  let candidateImages = 0;
  const cursor = businessListModel.find(buildQuery(), {
    bannerImageKey: 1,
    businessImagesKey: 1,
    kycDocumentsKey: 1,
    qrCode: 1,
  }).lean().cursor({ batchSize: 100 });

  for await (const business of cursor) {
    for (const field of TARGET_FIELDS) {
      const value = getByPath(business, field.path);
      if (field.kind === "array" && Array.isArray(value)) {
        candidateImages += value.filter((item) => {
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
    .select("status lastProcessedBusinessId")
    .lean();

  if (!job) {
    throw new Error("Migration job not found");
  }

  return job;
};

const shouldStopForControlState = (status) => STOPPED_STATUS.has(status);

const scheduleBusinessWebpMigration = (jobId) => {
  const launch = (remainingWaitMs = 30000) => {
    if (!jobId) {
      return;
    }

    if (!activeJobIds.has(jobId)) {
      runBusinessWebpMigration(jobId).catch((error) => {
        console.error("Business WebP migration crashed:", error);
      });
      return;
    }

    if (remainingWaitMs <= 0) {
      console.warn("Business WebP migration is still active; skipping restart for now.");
      return;
    }

    setTimeout(() => launch(remainingWaitMs - 1000), 1000);
  };

  setTimeout(() => launch(), 0);
};

const processBusiness = async (business, job, cache) => {
  const changedPaths = [];
  const failedEntries = [];
  const imagesToDelete = new Set();
  const updates = {};

  for (const field of TARGET_FIELDS) {
    const currentValue = getByPath(business, field.path);

    if (field.kind === "array") {
      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        continue;
      }

      const nextValues = [];
      let fieldChanged = false;

      for (const rawItem of currentValue) {
        const sourceKey = extractS3Key(rawItem);
        if (!sourceKey) {
          job.progress.imagesSkipped += 1;
          nextValues.push(rawItem);
          continue;
        }

        if (isWebpKey(sourceKey)) {
          job.progress.imagesSkipped += 1;
          nextValues.push(sourceKey);
          continue;
        }

        job.progress.imagesScanned += 1;

        if (cache.has(sourceKey)) {
          nextValues.push(cache.get(sourceKey));
          fieldChanged = true;
          job.progress.imagesConverted += 1;
          if (job.options.deleteOriginals) {
            imagesToDelete.add(sourceKey);
          }
          continue;
        }

        try {
          const converted = await convertSourceKeyToWebp(
            sourceKey,
            job.options.retryCount
          );
          cache.set(sourceKey, converted.webpKey);
          nextValues.push(converted.webpKey);
          fieldChanged = true;
          job.progress.imagesConverted += 1;
          if (job.options.deleteOriginals && !converted.skipped) {
            imagesToDelete.add(sourceKey);
          }
        } catch (error) {
          nextValues.push(sourceKey);
          job.progress.imagesFailed += 1;
          incrementFailureBucket(failedEntries, {
            businessId: String(business._id),
            businessName: business.businessName || "",
            fieldPath: field.path,
            sourceKey,
            error: error?.message || String(error),
          });
        }
      }

      if (fieldChanged) {
        setByPath(updates, field.path, nextValues);
        changedPaths.push(field.path);
      }
      continue;
    }

    const sourceKey = extractS3Key(currentValue);
    if (!sourceKey) {
      job.progress.imagesSkipped += 1;
      continue;
    }

    if (isWebpKey(sourceKey)) {
      job.progress.imagesSkipped += 1;
      continue;
    }

    job.progress.imagesScanned += 1;

    if (cache.has(sourceKey)) {
      setByPath(updates, field.path, cache.get(sourceKey));
      changedPaths.push(field.path);
      job.progress.imagesConverted += 1;
      if (job.options.deleteOriginals) {
        imagesToDelete.add(sourceKey);
      }
      continue;
    }

    try {
      const converted = await convertSourceKeyToWebp(
        sourceKey,
        job.options.retryCount
      );
      cache.set(sourceKey, converted.webpKey);
      setByPath(updates, field.path, converted.webpKey);
      changedPaths.push(field.path);
      job.progress.imagesConverted += 1;
      if (job.options.deleteOriginals && !converted.skipped) {
        imagesToDelete.add(sourceKey);
      }
    } catch (error) {
      job.progress.imagesFailed += 1;
      incrementFailureBucket(failedEntries, {
        businessId: String(business._id),
        businessName: business.businessName || "",
        fieldPath: field.path,
        sourceKey,
        error: error?.message || String(error),
      });
    }
  }

  if (!changedPaths.length) {
    job.progress.businessesScanned += 1;
    return { changed: false, failures: failedEntries };
  }

  setByPath(updates, "updatedAt", new Date());
  await businessListModel.updateOne(
    { _id: business._id },
    { $set: updates }
  );

  job.progress.businessesScanned += 1;
  job.progress.businessesUpdated += 1;

  if (job.options.deleteOriginals && imagesToDelete.size > 0) {
    for (const sourceKey of imagesToDelete) {
      try {
        await deleteSourceObject(sourceKey);
        job.progress.originalsDeleted += 1;
      } catch (error) {
        incrementFailureBucket(failedEntries, {
          businessId: String(business._id),
          businessName: business.businessName || "",
          fieldPath: "deleteOriginal",
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

export const startBusinessWebpMigration = async ({
  deleteOriginals = true,
  batchSize = 100,
  retryCount = 3,
  createdBy = null,
} = {}) => {
  const runningJob = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: { $in: ["queued", "running"] },
  }).sort({ createdAt: -1 }).lean();

  if (runningJob) {
    return { job: runningJob, alreadyRunning: true, resumed: false };
  }

  const pausedJob = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: "paused",
  }).sort({ createdAt: -1 });

  if (pausedJob) {
    pausedJob.status = "running";
    pausedJob.startedAt = pausedJob.startedAt || new Date();
    pausedJob.lastHeartbeatAt = new Date();
    pausedJob.lastError = "";
    await pausedJob.save();

    scheduleBusinessWebpMigration(String(pausedJob._id));

    return {
      job: pausedJob.toObject ? pausedJob.toObject() : pausedJob,
      alreadyRunning: false,
      resumed: true,
    };
  }

  const candidateBusinesses = await businessListModel.countDocuments(buildQuery());
  const candidateImages = await countCandidateImages();

  const jobDoc = await businessWebpMigrationJobModel.create({
    jobType: JOB_TYPE,
    status: "queued",
    options: {
      deleteOriginals: Boolean(deleteOriginals),
      batchSize: Math.max(1, Number(batchSize) || 100),
      retryCount: Math.max(1, Number(retryCount) || 3),
    },
    totals: {
      candidateBusinesses,
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
    scheduleBusinessWebpMigration(String(jobDoc._id));
  });

  return { job: jobDoc.toObject ? jobDoc.toObject() : jobDoc, alreadyRunning: false };
};

export const getBusinessWebpMigrationJobById = async (jobId) => {
  if (!jobId) return null;
  return businessWebpMigrationJobModel.findById(jobId).lean();
};

export const getLatestBusinessWebpMigrationJob = async () =>
  businessWebpMigrationJobModel
    .findOne({ jobType: JOB_TYPE })
    .sort({ createdAt: -1 })
    .lean();

export const runBusinessWebpMigration = async (jobId) => {
  if (!jobId || activeJobIds.has(jobId)) {
    return;
  }

  activeJobIds.add(jobId);

  const jobRecord = await businessWebpMigrationJobModel.findById(jobId);
  if (!jobRecord) {
    activeJobIds.delete(jobId);
    throw new Error("Migration job not found");
  }

  const cache = new Map();

  try {
    jobRecord.status = "running";
    jobRecord.startedAt = jobRecord.startedAt || new Date();
    jobRecord.lastHeartbeatAt = new Date();
    jobRecord.lastError = "";
    await jobRecord.save();

    const cursor = businessListModel
      .find({
        ...buildQuery(),
        ...(jobRecord.lastProcessedBusinessId
          ? { _id: { $gt: jobRecord.lastProcessedBusinessId } }
          : {}),
      }, {
        bannerImageKey: 1,
        businessImagesKey: 1,
        kycDocumentsKey: 1,
        qrCode: 1,
        businessName: 1,
      })
      .sort({ _id: 1 })
      .lean()
      .cursor({ batchSize: jobRecord.options?.batchSize || 100 });

    for await (const business of cursor) {
      const controlState = await getLatestJobControlState(jobId);
      if (shouldStopForControlState(controlState.status)) {
        jobRecord.status = controlState.status;
        jobRecord.lastProcessedBusinessId = controlState.lastProcessedBusinessId || jobRecord.lastProcessedBusinessId || "";
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

      const result = await processBusiness(business, jobRecord, cache);
      jobRecord.failures = [...jobRecord.failures, ...result.failures].slice(0, 25);
      jobRecord.summary.totalDocumentsTouched += 1;
      if (result.changed) {
        jobRecord.summary.totalDocumentsWithChanges += 1;
      }
      jobRecord.lastProcessedBusinessId = String(business._id);

      await updateJob(jobId, {
        progress: jobRecord.progress,
        summary: jobRecord.summary,
        failures: jobRecord.failures.slice(0, 25),
        lastProcessedBusinessId: jobRecord.lastProcessedBusinessId,
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

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();
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

export const pauseBusinessWebpMigration = async () => {
  const job = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: "running",
  }).sort({ createdAt: -1 });

  if (!job) {
    return null;
  }

  job.status = "paused";
  job.pausedAt = new Date();
  job.lastHeartbeatAt = new Date();
  await job.save();
  return job.toObject();
};

export const cancelBusinessWebpMigration = async () => {
  const job = await businessWebpMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: { $in: ["queued", "running", "paused"] },
  }).sort({ createdAt: -1 });

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
