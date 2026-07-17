import {
  startS3CacheHeaderMigration,
  getLatestS3CacheHeaderMigrationJob,
  getActiveS3CacheHeaderMigrationJob,
  pauseS3CacheHeaderMigrationJob,
  resumeS3CacheHeaderMigrationJob,
  cancelS3CacheHeaderMigrationJob,
  SUPPORTED_S3_CACHE_SCOPES,
} from "../../helper/mediaCleanup/s3CacheHeaderMigrationHelper.js";
import s3CacheHeaderMigrationJobModel from "../../model/maintenance/s3CacheHeaderMigrationJobModel.js";

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const errorStatus = (error) =>
  Number.isInteger(error?.statusCode) ? error.statusCode : 500;

const resolveActiveJobId = async (requestedJobId) => {
  if (requestedJobId) {
    return requestedJobId;
  }

  const activeJob = await getActiveS3CacheHeaderMigrationJob();
  return activeJob?._id || null;
};

export const startS3CacheHeaderMigrationAction = async (req, res) => {
  try {
    const scopeKey = req.body?.scopeKey || "all";
    const batchSize = clampInteger(req.body?.batchSize, 10, 500, 100);
    const retryCount = clampInteger(req.body?.retryCount, 1, 5, 3);

    if (!SUPPORTED_S3_CACHE_SCOPES[scopeKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope: ${scopeKey}`,
      });
    }

    const job = await startS3CacheHeaderMigration(
      scopeKey,
      batchSize,
      retryCount,
      req.authUser?.userId || "",
      req.authUser?.userName || "",
      req.authUser?.email || "",
    );

    return res.status(202).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("startS3CacheHeaderMigrationAction error:", error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message || "Failed to start migration",
    });
  }
};

export const pauseS3CacheHeaderMigrationAction = async (req, res) => {
  try {
    const jobId = await resolveActiveJobId(req.body?.jobId);

    if (!jobId) {
      return res.status(404).json({
        success: false,
        message: "No running migration job found",
      });
    }

    const job = await pauseS3CacheHeaderMigrationJob(jobId);

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("pauseS3CacheHeaderMigrationAction error:", error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message || "Failed to pause migration",
    });
  }
};

export const resumeS3CacheHeaderMigrationAction = async (req, res) => {
  try {
    const jobId = await resolveActiveJobId(req.body?.jobId);

    if (!jobId) {
      return res.status(404).json({
        success: false,
        message: "No paused migration job found",
      });
    }

    const job = await resumeS3CacheHeaderMigrationJob(jobId);

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("resumeS3CacheHeaderMigrationAction error:", error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message || "Failed to resume migration",
    });
  }
};

export const cancelS3CacheHeaderMigrationAction = async (req, res) => {
  try {
    const jobId = await resolveActiveJobId(req.body?.jobId);

    if (!jobId) {
      return res.status(404).json({
        success: false,
        message: "No migration job found to cancel",
      });
    }

    const job = await cancelS3CacheHeaderMigrationJob(jobId);

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("cancelS3CacheHeaderMigrationAction error:", error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message || "Failed to cancel migration",
    });
  }
};

export const getLatestS3CacheHeaderMigrationJobAction = async (req, res) => {
  try {
    const scopeKey = req.query?.scopeKey || "all";

    if (!SUPPORTED_S3_CACHE_SCOPES[scopeKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope: ${scopeKey}`,
      });
    }

    const [job, activeJob] = await Promise.all([
      getLatestS3CacheHeaderMigrationJob(scopeKey),
      getActiveS3CacheHeaderMigrationJob(),
    ]);

    return res.json({
      success: true,
      data: job || null,
      activeJob: activeJob || null,
    });
  } catch (error) {
    console.error("getLatestS3CacheHeaderMigrationJobAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load migration job",
    });
  }
};

export const getS3CacheHeaderMigrationJobAction = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await s3CacheHeaderMigrationJobModel.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Migration job not found",
      });
    }

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("getS3CacheHeaderMigrationJobAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load migration job",
    });
  }
};

export const getSupportedS3CacheScopesAction = async (req, res) => {
  try {
    const scopes = Object.values(SUPPORTED_S3_CACHE_SCOPES).map((scope) => ({
      scopeKey: scope.scopeKey,
      scopeLabel: scope.scopeLabel,
    }));

    return res.json({
      success: true,
      data: scopes,
    });
  } catch (error) {
    console.error("getSupportedS3CacheScopesAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load scopes",
    });
  }
};
