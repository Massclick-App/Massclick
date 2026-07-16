import dotenv from "dotenv";
import AWS from "aws-sdk";
import { fileURLToPath } from "url";
import s3CacheHeaderMigrationJobModel from "../../model/maintenance/s3CacheHeaderMigrationJobModel.js";

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

const FOLDER_PREFIXES = {
  businessList: "businessList",
  category: "category",
  seo: "seo",
  advertisements: "advertisements",
  admin: "admin",
  user: "user",
};

const SUPPORTED_SCOPES = {
  all: {
    scopeKey: "all",
    scopeLabel: "All Folders",
    folders: Object.values(FOLDER_PREFIXES),
  },
  businessList: {
    scopeKey: "businessList",
    scopeLabel: "Business List",
    folders: [FOLDER_PREFIXES.businessList],
  },
  category: {
    scopeKey: "category",
    scopeLabel: "Category Images",
    folders: [FOLDER_PREFIXES.category],
  },
  seo: {
    scopeKey: "seo",
    scopeLabel: "SEO Blog Images",
    folders: [FOLDER_PREFIXES.seo],
  },
  advertisements: {
    scopeKey: "advertisements",
    scopeLabel: "Advertisements",
    folders: [FOLDER_PREFIXES.advertisements],
  },
  admin: {
    scopeKey: "admin",
    scopeLabel: "Admin Profiles",
    folders: [FOLDER_PREFIXES.admin],
  },
  user: {
    scopeKey: "user",
    scopeLabel: "Customer Profiles",
    folders: [FOLDER_PREFIXES.user],
  },
};

const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
const STOPPED_STATUS = new Set(["paused", "cancelled", "completed", "completed_with_errors", "failed"]);
const RETRY_DELAYS_MS = [500, 1000, 2000];

const withRetry = async (fn, retryCount = 3) => {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retryCount) throw error;
      const delayMs = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

const CACHE_CONTROL_VALUE = 'public, max-age=31536000';

const copyObjectWithCacheHeaders = async (sourceKey, retryCount = 3) => {
  const result = await withRetry(async () => {
    const head = await s3.headObject({
      Bucket: assetsBucket,
      Key: sourceKey,
    }).promise();

    if (head.CacheControl === CACHE_CONTROL_VALUE) {
      return {
        sourceKey,
        skipped: true,
      };
    }

    // MetadataDirective REPLACE wipes ALL metadata, so ContentType and any
    // user metadata must be carried over explicitly or images get served as
    // application/octet-stream.
    await s3.copyObject({
      Bucket: assetsBucket,
      CopySource: `${assetsBucket}/${sourceKey}`,
      Key: sourceKey,
      CacheControl: CACHE_CONTROL_VALUE,
      ContentType: head.ContentType || 'application/octet-stream',
      Metadata: head.Metadata || {},
      MetadataDirective: 'REPLACE',
    }).promise();

    return {
      sourceKey,
      skipped: false,
    };
  }, retryCount);

  return result;
};

const listObjectsByPrefix = async (prefix) => {
  const allKeys = [];
  let continuationToken;

  while (true) {
    const params = {
      Bucket: assetsBucket,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    };

    const response = await s3.listObjectsV2(params).promise();

    if (response.Contents) {
      response.Contents.forEach(obj => {
        allKeys.push(obj.Key);
      });
    }

    if (!response.IsTruncated) break;
    continuationToken = response.NextContinuationToken;
  }

  return allKeys;
};

const processBatch = async (keys, jobId, retryCount, onProgress) => {
  const results = {
    updated: 0,
    failed: 0,
    skipped: 0,
    failures: [],
  };

  for (const key of keys) {
    try {
      const copyResult = await copyObjectWithCacheHeaders(key, retryCount);
      if (copyResult.skipped) {
        results.skipped++;
      } else {
        results.updated++;
      }
    } catch (error) {
      results.failed++;
      results.failures.push({
        s3Key: key,
        error: error.message,
      });
    }

    if (onProgress) {
      onProgress({
        objectsScanned: results.updated + results.failed + results.skipped,
        objectsUpdated: results.updated,
        objectsFailed: results.failed,
        objectsSkipped: results.skipped,
      });
    }
  }

  return results;
};

export const startS3CacheHeaderMigration = async (scopeKey, batchSize = 100, retryCount = 3, userId, userName, email) => {
  const scope = SUPPORTED_SCOPES[scopeKey];
  if (!scope) {
    throw new Error(`Invalid scope: ${scopeKey}`);
  }

  const existingJob = await s3CacheHeaderMigrationJobModel.findOne({
    jobType: "s3-cache-header-migration",
    status: { $in: ["queued", "running"] },
  });

  if (existingJob) {
    throw new Error("A migration job is already running");
  }

  const allKeys = [];
  for (const folderPrefix of scope.folders) {
    const keys = await listObjectsByPrefix(folderPrefix);
    allKeys.push(...keys);
  }

  const job = new s3CacheHeaderMigrationJobModel({
    jobType: "s3-cache-header-migration",
    scopeKey,
    scopeLabel: scope.scopeLabel,
    status: "queued",
    options: { batchSize, retryCount },
    totals: { candidateObjects: allKeys.length },
    createdBy: { userId, userName, email },
  });

  await job.save();

  processMigrationJob(job._id, allKeys, batchSize, retryCount).catch(err => {
    console.error("Migration job error:", err);
  });

  return job;
};

const processMigrationJob = async (jobId, allKeys, batchSize, retryCount) => {
  const job = await s3CacheHeaderMigrationJobModel.findById(jobId);
  if (!job) return;

  job.status = "running";
  job.startedAt = new Date();
  await job.save();

  try {
    let processedIndex = 0;

    for (let i = 0; i < allKeys.length; i += batchSize) {
      const currentJob = await s3CacheHeaderMigrationJobModel.findById(jobId);
      if (!currentJob) break;

      if (currentJob.status === "cancelled") {
        currentJob.status = "cancelled";
        currentJob.cancelledAt = new Date();
        currentJob.finishedAt = new Date();
        await currentJob.save();
        return;
      }

      if (currentJob.status === "paused") {
        await new Promise(resolve => {
          const checkInterval = setInterval(async () => {
            const updatedJob = await s3CacheHeaderMigrationJobModel.findById(jobId);
            if (updatedJob && updatedJob.status === "running") {
              clearInterval(checkInterval);
              resolve();
            }
          }, 2000);
        });
        continue;
      }

      const batch = allKeys.slice(i, Math.min(i + batchSize, allKeys.length));
      const batchResults = await processBatch(batch, jobId, retryCount, (progress) => {
        // Update job progress
        job.progress.objectsScanned = processedIndex + progress.objectsScanned;
        job.progress.objectsUpdated = progress.objectsUpdated;
        job.progress.objectsFailed = progress.objectsFailed;
        job.progress.objectsSkipped = progress.objectsSkipped;
      });

      processedIndex += batch.length;
      job.progress.objectsUpdated += batchResults.updated;
      job.progress.objectsFailed += batchResults.failed;
      job.progress.objectsSkipped += batchResults.skipped;
      job.failures.push(...batchResults.failures);
      job.lastHeartbeatAt = new Date();

      await job.save();
    }

    job.status = job.progress.objectsFailed > 0 ? "completed_with_errors" : "completed";
    job.finishedAt = new Date();
  } catch (error) {
    job.status = "failed";
    job.lastError = error.message;
    job.finishedAt = new Date();
  }

  await job.save();
};

export const getLatestS3CacheHeaderMigrationJob = async (scopeKey = "all") => {
  const query = {
    jobType: "s3-cache-header-migration",
  };

  if (scopeKey && scopeKey !== "all") {
    query.scopeKey = scopeKey;
  }

  const job = await s3CacheHeaderMigrationJobModel.findOne(query).sort({ createdAt: -1 });
  return job;
};

export const pauseS3CacheHeaderMigrationJob = async (jobId) => {
  const job = await s3CacheHeaderMigrationJobModel.findById(jobId);
  if (!job) throw new Error("Job not found");

  if (!ACTIVE_JOB_STATUSES.has(job.status)) {
    throw new Error(`Cannot pause job with status: ${job.status}`);
  }

  job.status = "paused";
  job.pausedAt = new Date();
  await job.save();

  return job;
};

export const cancelS3CacheHeaderMigrationJob = async (jobId) => {
  const job = await s3CacheHeaderMigrationJobModel.findById(jobId);
  if (!job) throw new Error("Job not found");

  if (!["queued", "running", "paused"].includes(job.status)) {
    throw new Error(`Cannot cancel job with status: ${job.status}`);
  }

  job.status = "cancelled";
  job.cancelledAt = new Date();
  job.finishedAt = new Date();
  await job.save();

  return job;
};

export const SUPPORTED_S3_CACHE_SCOPES = SUPPORTED_SCOPES;
