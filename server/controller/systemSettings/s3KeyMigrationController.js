/**
 * Admin endpoints for the S3 key restructure monitoring card — step 2.3.
 *
 * No `/start` — per the plan: "Starting a destructive migration from a web button is
 * how the wrong database gets rewritten." The CLI (`server/scripts/s3KeyMigration.js`)
 * is the only way to begin a run. This controller only ever reads the job doc the CLI
 * writes (via utils/s3MigrationJobTracking.js), and lets an admin pause/cancel a run
 * that's already in flight.
 *
 * Reuses `clampInteger`/`errorStatus`/`resolveActiveJobId` conventions from
 * s3CacheHeaderMigrationController.js, adapted: this job model is keyed by `runId`,
 * not a single global slot, so "the active job" means the one doc (if any) currently
 * holding `activeSlot: "active"`.
 */
import s3KeyMigrationJobModel from "../../model/maintenance/s3KeyMigrationJobModel.js";

const JOB_TYPE = "s3-key-restructure";
const PAUSABLE_STATUSES = ["running"];
const CANCELLABLE_STATUSES = ["running", "paused"];

const errorStatus = (error) => (Number.isInteger(error?.statusCode) ? error.statusCode : 500);

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const getActiveJob = () => s3KeyMigrationJobModel.findOne({ jobType: JOB_TYPE, activeSlot: "active" });

const resolveActiveJobId = async (requestedJobId) => {
  if (requestedJobId) return requestedJobId;
  const activeJob = await getActiveJob();
  return activeJob?._id || null;
};

/**
 * GET /latest — the card's main poll target. Returns the most recently touched job
 * doc (any status) plus, separately, whichever doc currently holds the exclusive
 * activeSlot (there is at most one across the whole system — see the plan's
 * "Only one run may write at a time").
 */
export const getLatestS3KeyMigrationJobAction = async (req, res) => {
  try {
    const runId = req.query?.runId || null;
    const query = { jobType: JOB_TYPE, ...(runId ? { runId } : {}) };

    const [job, activeJob] = await Promise.all([
      s3KeyMigrationJobModel.findOne(query).sort({ updatedAt: -1 }),
      getActiveJob(),
    ]);

    return res.json({ success: true, data: job || null, activeJob: activeJob || null });
  } catch (error) {
    console.error("getLatestS3KeyMigrationJobAction error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load migration job" });
  }
};

/** GET /:jobId — a specific job doc by its Mongo _id. */
export const getS3KeyMigrationJobAction = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await s3KeyMigrationJobModel.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Migration job not found" });
    }
    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("getS3KeyMigrationJobAction error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load migration job" });
  }
};

/** GET /runs — recent runs, newest first, for the card's history view. */
export const getS3KeyMigrationRunsAction = async (req, res) => {
  try {
    const limit = clampInteger(req.query?.limit, 1, 100, 20);
    const runs = await s3KeyMigrationJobModel
      .find({ jobType: JOB_TYPE })
      .sort({ updatedAt: -1 })
      .limit(limit);
    return res.json({ success: true, data: runs });
  } catch (error) {
    console.error("getS3KeyMigrationRunsAction error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load migration runs" });
  }
};

/**
 * POST /pause — flips `status` to "paused". Deliberately does NOT touch `activeSlot`
 * or `workerId`: the CLI process itself, once its own polling (`isStopRequested`)
 * notices the flip and actually stops iterating, releases the slot — see
 * s3MigrationJobTracking.js's `releaseSlot` docstring for why the ordering matters
 * (releasing the slot here, immediately, could let a new run start while the old
 * process is still mid-batch).
 */
export const pauseS3KeyMigrationJobAction = async (req, res) => {
  try {
    const jobId = await resolveActiveJobId(req.body?.jobId);
    if (!jobId) {
      return res.status(404).json({ success: false, message: "No running migration job found" });
    }

    const job = await s3KeyMigrationJobModel.findOneAndUpdate(
      { _id: jobId, jobType: JOB_TYPE, status: { $in: PAUSABLE_STATUSES } },
      { $set: { status: "paused", pausedAt: new Date() } },
      { new: true },
    );

    if (!job) {
      const existing = await s3KeyMigrationJobModel.findById(jobId);
      if (!existing) return res.status(404).json({ success: false, message: "Migration job not found" });
      return res.status(409).json({ success: false, message: `Cannot pause job with status: ${existing.status}` });
    }

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("pauseS3KeyMigrationJobAction error:", error);
    return res.status(errorStatus(error)).json({ success: false, message: error.message || "Failed to pause migration" });
  }
};

/** POST /cancel — same flip-only pattern as pause, to "cancelled". */
export const cancelS3KeyMigrationJobAction = async (req, res) => {
  try {
    const jobId = await resolveActiveJobId(req.body?.jobId);
    if (!jobId) {
      return res.status(404).json({ success: false, message: "No migration job found to cancel" });
    }

    const job = await s3KeyMigrationJobModel.findOneAndUpdate(
      { _id: jobId, jobType: JOB_TYPE, status: { $in: CANCELLABLE_STATUSES } },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { new: true },
    );

    if (!job) {
      const existing = await s3KeyMigrationJobModel.findById(jobId);
      if (!existing) return res.status(404).json({ success: false, message: "Migration job not found" });
      return res.status(409).json({ success: false, message: `Cannot cancel job with status: ${existing.status}` });
    }

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("cancelS3KeyMigrationJobAction error:", error);
    return res.status(errorStatus(error)).json({ success: false, message: error.message || "Failed to cancel migration" });
  }
};
