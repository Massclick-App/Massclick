import { randomUUID } from "crypto";
import dotenv from "dotenv";
import AWS from "aws-sdk";
import { fileURLToPath } from "url";
import s3CacheHeaderMigrationJobModel from "../../model/maintenance/s3CacheHeaderMigrationJobModel.js";
import {
  buildCacheHeaderCopyParams,
  hasSufficientBrowserCache,
} from "../../utils/s3CacheHeaderMigrationUtils.js";

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

const JOB_TYPE = "s3-cache-header-migration";
const ACTIVE_SLOT = "active";
const CHECKPOINT_VERSION = 2;
const LEASE_DURATION_MS = 90 * 1000;
const RECOVERY_INTERVAL_MS = 30 * 1000;
const MAX_RECENT_FAILURES = 100;
const WORKER_ID = `${process.pid}-${randomUUID()}`;
const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000];
const runningWorkers = new Set();
const pendingWorkerLaunches = new Set();

let recoveryTimer = null;

const FOLDER_PREFIXES = {
  businessList: "businessList/",
  category: "category/",
  seo: "seo/",
  advertisements: "advertisements/",
  admin: "admin/",
  user: "user/",
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

const ACTIVE_JOB_STATUSES = ["queued", "running", "paused"];
const PAUSABLE_JOB_STATUSES = ["queued", "running"];
const NON_RETRYABLE_AWS_CODES = new Set([
  "AccessDenied",
  "InvalidAccessKeyId",
  "NoSuchBucket",
  "NoSuchKey",
  "NotFound",
  "SignatureDoesNotMatch",
]);

const migrationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getErrorMessage = (error) =>
  String(error?.message || error || "Unknown error").slice(0, 2000);

const withRetry = async (fn, retryCount = 3) => {
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const retryable = !NON_RETRYABLE_AWS_CODES.has(error?.code);
      if (attempt === retryCount || !retryable) {
        throw error;
      }

      const delayMs =
        RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Retry loop exited unexpectedly");
};

const copyObjectWithCacheHeaders = async (sourceKey, retryCount = 3) =>
  withRetry(async () => {
    const head = await s3
      .headObject({
        Bucket: assetsBucket,
        Key: sourceKey,
      })
      .promise();

    if (hasSufficientBrowserCache(head.CacheControl)) {
      return {
        sourceKey,
        skipped: true,
      };
    }

    await s3
      .copyObject(
        buildCacheHeaderCopyParams({
          bucket: assetsBucket,
          key: sourceKey,
          head,
        }),
      )
      .promise();

    return {
      sourceKey,
      skipped: false,
    };
  }, retryCount);

const listObjectsPage = async ({
  prefix,
  startAfter = "",
  maxKeys,
  retryCount,
}) => {
  const params = {
    Bucket: assetsBucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  };

  if (startAfter) {
    params.StartAfter = startAfter;
  }

  return withRetry(() => s3.listObjectsV2(params).promise(), retryCount);
};

const leaseFields = () => {
  const now = new Date();
  return {
    lastHeartbeatAt: now,
    leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
  };
};

const ownedJobFilter = (jobId) => ({
  _id: jobId,
  jobType: JOB_TYPE,
  status: "running",
  workerId: WORKER_ID,
});

const updateOwnedJob = async (jobId, update = {}) => {
  const result = await s3CacheHeaderMigrationJobModel.updateOne(
    ownedJobFilter(jobId),
    {
      ...update,
      $set: {
        ...(update.$set || {}),
        ...leaseFields(),
      },
    },
  );

  return result.matchedCount === 1;
};

const normalizeLegacyCheckpoint = async (jobId) => {
  await s3CacheHeaderMigrationJobModel.updateOne(
    {
      _id: jobId,
      jobType: JOB_TYPE,
      status: { $in: ACTIVE_JOB_STATUSES },
      "checkpoint.version": { $ne: CHECKPOINT_VERSION },
    },
    {
      $set: {
        phase: "scanning",
        checkpoint: {
          version: CHECKPOINT_VERSION,
          folderIndex: 0,
          lastScannedKey: "",
          lastProcessedKey: "",
        },
        progress: {
          objectsScanned: 0,
          objectsUpdated: 0,
          objectsFailed: 0,
          objectsSkipped: 0,
        },
        totals: { candidateObjects: 0 },
        failures: [],
        lastProcessedKey: "",
        lastError: "",
      },
    },
  );
};

const claimMigrationJob = async (jobId) => {
  await normalizeLegacyCheckpoint(jobId);

  const now = new Date();
  const claimedJob = await s3CacheHeaderMigrationJobModel.findOneAndUpdate(
    {
      _id: jobId,
      jobType: JOB_TYPE,
      status: { $in: ["queued", "running"] },
      $or: [
        { status: "queued" },
        { status: "running", workerId: WORKER_ID },
        { status: "running", leaseExpiresAt: { $exists: false } },
        { status: "running", leaseExpiresAt: null },
        { status: "running", leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "running",
        activeSlot: ACTIVE_SLOT,
        workerId: WORKER_ID,
        pausedAt: null,
        lastHeartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
      },
    },
    { new: true },
  );

  if (!claimedJob) {
    return null;
  }

  if (!claimedJob.startedAt) {
    await s3CacheHeaderMigrationJobModel.updateOne(
      { _id: jobId, startedAt: null },
      { $set: { startedAt: now } },
    );
  }

  return s3CacheHeaderMigrationJobModel.findById(jobId);
};

const completeMigrationJob = async (job) => {
  const status =
    Number(job.progress?.objectsFailed || 0) > 0
      ? "completed_with_errors"
      : "completed";
  const now = new Date();

  await s3CacheHeaderMigrationJobModel.updateOne(ownedJobFilter(job._id), {
    $set: {
      status,
      finishedAt: now,
      lastHeartbeatAt: now,
      leaseExpiresAt: null,
    },
    $unset: {
      activeSlot: 1,
      workerId: 1,
    },
  });
};

const failMigrationJob = async (jobId, error) => {
  const now = new Date();

  await s3CacheHeaderMigrationJobModel.updateOne(ownedJobFilter(jobId), {
    $set: {
      status: "failed",
      lastError: getErrorMessage(error),
      finishedAt: now,
      lastHeartbeatAt: now,
      leaseExpiresAt: null,
    },
    $unset: {
      activeSlot: 1,
      workerId: 1,
    },
  });
};

const scanNextPage = async (job, scope) => {
  const folderIndex = Number(job.checkpoint?.folderIndex || 0);

  if (folderIndex >= scope.folders.length) {
    return updateOwnedJob(job._id, {
      $set: {
        phase: "migrating",
        "checkpoint.folderIndex": 0,
        "checkpoint.lastScannedKey": "",
        "checkpoint.lastProcessedKey": "",
      },
    });
  }

  const folderPrefix = scope.folders[folderIndex];
  const response = await listObjectsPage({
    prefix: folderPrefix,
    startAfter: job.checkpoint?.lastScannedKey || "",
    maxKeys: 1000,
    retryCount: job.options?.retryCount || 3,
  });
  const keys = (response.Contents || [])
    .map((object) => object.Key)
    .filter(Boolean);
  const lastScannedKey = keys[keys.length - 1] || "";

  if (response.IsTruncated && !lastScannedKey) {
    throw new Error(
      `S3 returned a truncated empty page for prefix: ${folderPrefix}`,
    );
  }

  const pageFinishedFolder = !response.IsTruncated;

  return updateOwnedJob(job._id, {
    $inc: {
      "totals.candidateObjects": keys.length,
    },
    $set: {
      "checkpoint.folderIndex": pageFinishedFolder
        ? folderIndex + 1
        : folderIndex,
      "checkpoint.lastScannedKey": pageFinishedFolder ? "" : lastScannedKey,
    },
  });
};

const recordObjectResult = async ({
  jobId,
  key,
  folderPrefix,
  copyResult,
  error,
}) => {
  const increment = {
    "progress.objectsScanned": 1,
  };
  const update = {
    $inc: increment,
    $set: {
      "checkpoint.lastProcessedKey": key,
      lastProcessedKey: key,
    },
  };

  if (error) {
    increment["progress.objectsFailed"] = 1;
    update.$push = {
      failures: {
        $each: [
          {
            s3Key: key,
            folderPrefix,
            error: getErrorMessage(error),
          },
        ],
        $slice: -MAX_RECENT_FAILURES,
      },
    };
  } else if (copyResult?.skipped) {
    increment["progress.objectsSkipped"] = 1;
  } else {
    increment["progress.objectsUpdated"] = 1;
  }

  return updateOwnedJob(jobId, update);
};

const migrateNextPage = async (job, scope) => {
  const folderIndex = Number(job.checkpoint?.folderIndex || 0);

  if (folderIndex >= scope.folders.length) {
    await completeMigrationJob(job);
    return false;
  }

  const folderPrefix = scope.folders[folderIndex];
  const response = await listObjectsPage({
    prefix: folderPrefix,
    startAfter: job.checkpoint?.lastProcessedKey || "",
    maxKeys: job.options?.batchSize || 100,
    retryCount: job.options?.retryCount || 3,
  });
  const keys = (response.Contents || [])
    .map((object) => object.Key)
    .filter(Boolean);

  if (response.IsTruncated && keys.length === 0) {
    throw new Error(
      `S3 returned a truncated empty page for prefix: ${folderPrefix}`,
    );
  }

  for (const key of keys) {
    let copyResult = null;
    let copyError = null;

    try {
      copyResult = await copyObjectWithCacheHeaders(
        key,
        job.options?.retryCount || 3,
      );
    } catch (error) {
      copyError = error;
    }

    const stillRunning = await recordObjectResult({
      jobId: job._id,
      key,
      folderPrefix,
      copyResult,
      error: copyError,
    });

    if (!stillRunning) {
      return false;
    }
  }

  if (!response.IsTruncated) {
    return updateOwnedJob(job._id, {
      $set: {
        "checkpoint.folderIndex": folderIndex + 1,
        "checkpoint.lastProcessedKey": "",
      },
    });
  }

  return true;
};

const processMigrationJob = async (jobId) => {
  let claimedJob;
  let heartbeatTimer = null;

  try {
    claimedJob = await claimMigrationJob(jobId);
  } catch (error) {
    console.error(`Unable to claim S3 cache migration job ${jobId}:`, error);
    return;
  }

  if (!claimedJob) {
    return;
  }

  heartbeatTimer = setInterval(
    () => {
      updateOwnedJob(jobId).catch((error) => {
        console.error(
          `S3 cache migration heartbeat failed for ${jobId}:`,
          error,
        );
      });
    },
    Math.floor(LEASE_DURATION_MS / 3),
  );
  heartbeatTimer.unref?.();

  try {
    while (true) {
      const job = await s3CacheHeaderMigrationJobModel
        .findOne(ownedJobFilter(jobId))
        .lean();

      if (!job) {
        return;
      }

      const scope = SUPPORTED_SCOPES[job.scopeKey];
      if (!scope) {
        throw new Error(
          `Invalid scope stored on migration job: ${job.scopeKey}`,
        );
      }

      const stillRunning =
        job.phase === "migrating"
          ? await migrateNextPage(job, scope)
          : await scanNextPage(job, scope);

      if (!stillRunning) {
        return;
      }
    }
  } catch (error) {
    console.error(`S3 cache migration job ${jobId} failed:`, error);
    await failMigrationJob(jobId, error);
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  }
};

const launchMigrationJob = (jobId, queueIfRunning = false) => {
  const normalizedJobId = String(jobId);

  if (runningWorkers.has(normalizedJobId)) {
    if (queueIfRunning) {
      pendingWorkerLaunches.add(normalizedJobId);
    }
    return;
  }

  runningWorkers.add(normalizedJobId);
  processMigrationJob(normalizedJobId)
    .catch((error) => {
      console.error(
        `Unexpected S3 cache migration worker error ${normalizedJobId}:`,
        error,
      );
    })
    .finally(() => {
      runningWorkers.delete(normalizedJobId);
      if (pendingWorkerLaunches.delete(normalizedJobId)) {
        launchMigrationJob(normalizedJobId);
      }
    });
};

export const startS3CacheHeaderMigration = async (
  scopeKey,
  batchSize = 100,
  retryCount = 3,
  userId,
  userName,
  email,
) => {
  const scope = SUPPORTED_SCOPES[scopeKey];
  if (!scope) {
    throw migrationError(`Invalid scope: ${scopeKey}`);
  }

  const existingJob = await s3CacheHeaderMigrationJobModel.findOne({
    jobType: JOB_TYPE,
    status: { $in: ACTIVE_JOB_STATUSES },
  });

  if (existingJob) {
    throw migrationError(
      `A ${existingJob.scopeLabel} migration is already ${existingJob.status}`,
      409,
    );
  }

  const job = new s3CacheHeaderMigrationJobModel({
    jobType: JOB_TYPE,
    activeSlot: ACTIVE_SLOT,
    scopeKey,
    scopeLabel: scope.scopeLabel,
    phase: "scanning",
    status: "queued",
    options: { batchSize, retryCount },
    progress: {
      objectsScanned: 0,
      objectsUpdated: 0,
      objectsFailed: 0,
      objectsSkipped: 0,
    },
    totals: { candidateObjects: 0 },
    checkpoint: {
      version: CHECKPOINT_VERSION,
      folderIndex: 0,
      lastScannedKey: "",
      lastProcessedKey: "",
    },
    createdBy: { userId, userName, email },
  });

  try {
    await job.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw migrationError("A migration job is already active", 409);
    }
    throw error;
  }

  launchMigrationJob(job._id);
  return job;
};

export const getLatestS3CacheHeaderMigrationJob = async (scopeKey = "all") => {
  const query = {
    jobType: JOB_TYPE,
  };

  if (scopeKey) {
    query.scopeKey = scopeKey;
  }

  return s3CacheHeaderMigrationJobModel.findOne(query).sort({ createdAt: -1 });
};

export const getActiveS3CacheHeaderMigrationJob = async () =>
  s3CacheHeaderMigrationJobModel
    .findOne({
      jobType: JOB_TYPE,
      status: { $in: ACTIVE_JOB_STATUSES },
    })
    .sort({ createdAt: -1 });

export const pauseS3CacheHeaderMigrationJob = async (jobId) => {
  const job = await s3CacheHeaderMigrationJobModel.findOneAndUpdate(
    {
      _id: jobId,
      jobType: JOB_TYPE,
      status: { $in: PAUSABLE_JOB_STATUSES },
    },
    {
      $set: {
        status: "paused",
        pausedAt: new Date(),
        leaseExpiresAt: null,
      },
      $unset: {
        workerId: 1,
      },
    },
    { new: true },
  );

  if (job) {
    return job;
  }

  const existingJob = await s3CacheHeaderMigrationJobModel.findById(jobId);
  if (!existingJob) {
    throw migrationError("Migration job not found", 404);
  }

  throw migrationError(
    `Cannot pause job with status: ${existingJob.status}`,
    409,
  );
};

export const resumeS3CacheHeaderMigrationJob = async (jobId) => {
  const otherActiveJob = await s3CacheHeaderMigrationJobModel.findOne({
    _id: { $ne: jobId },
    jobType: JOB_TYPE,
    status: { $in: ACTIVE_JOB_STATUSES },
  });

  if (otherActiveJob) {
    throw migrationError(
      `A ${otherActiveJob.scopeLabel} migration is already ${otherActiveJob.status}`,
      409,
    );
  }

  await normalizeLegacyCheckpoint(jobId);

  let job;
  try {
    job = await s3CacheHeaderMigrationJobModel.findOneAndUpdate(
      {
        _id: jobId,
        jobType: JOB_TYPE,
        status: "paused",
      },
      {
        $set: {
          status: "queued",
          activeSlot: ACTIVE_SLOT,
          pausedAt: null,
          lastError: "",
          leaseExpiresAt: null,
        },
        $unset: {
          workerId: 1,
        },
      },
      { new: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      throw migrationError("Another migration job is already active", 409);
    }
    throw error;
  }

  if (!job) {
    const existingJob = await s3CacheHeaderMigrationJobModel.findById(jobId);
    if (!existingJob) {
      throw migrationError("Migration job not found", 404);
    }
    throw migrationError(
      `Cannot resume job with status: ${existingJob.status}`,
      409,
    );
  }

  launchMigrationJob(job._id, true);
  return job;
};

export const cancelS3CacheHeaderMigrationJob = async (jobId) => {
  const now = new Date();
  const job = await s3CacheHeaderMigrationJobModel.findOneAndUpdate(
    {
      _id: jobId,
      jobType: JOB_TYPE,
      status: { $in: ACTIVE_JOB_STATUSES },
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        finishedAt: now,
        lastHeartbeatAt: now,
        leaseExpiresAt: null,
      },
      $unset: {
        activeSlot: 1,
        workerId: 1,
      },
    },
    { new: true },
  );

  if (job) {
    return job;
  }

  const existingJob = await s3CacheHeaderMigrationJobModel.findById(jobId);
  if (!existingJob) {
    throw migrationError("Migration job not found", 404);
  }

  throw migrationError(
    `Cannot cancel job with status: ${existingJob.status}`,
    409,
  );
};

const recoverMigrationJobs = async () => {
  const now = new Date();
  const recoverableJobs = await s3CacheHeaderMigrationJobModel
    .find({
      jobType: JOB_TYPE,
      $or: [
        { status: "queued" },
        { status: "running", leaseExpiresAt: { $exists: false } },
        { status: "running", leaseExpiresAt: null },
        { status: "running", leaseExpiresAt: { $lte: now } },
      ],
    })
    .select({ _id: 1 })
    .lean();

  recoverableJobs.forEach((job) => launchMigrationJob(job._id));
};

export const startS3CacheHeaderMigrationRecovery = async () => {
  try {
    await s3CacheHeaderMigrationJobModel.createIndexes();
  } catch (error) {
    console.error("S3 cache migration index setup failed:", error);
  }

  try {
    await recoverMigrationJobs();
  } catch (error) {
    console.error("Initial S3 cache migration recovery check failed:", error);
  }

  if (recoveryTimer) {
    return;
  }

  recoveryTimer = setInterval(() => {
    recoverMigrationJobs().catch((error) => {
      console.error("S3 cache migration recovery check failed:", error);
    });
  }, RECOVERY_INTERVAL_MS);

  recoveryTimer.unref?.();
};

export const SUPPORTED_S3_CACHE_SCOPES = SUPPORTED_SCOPES;
