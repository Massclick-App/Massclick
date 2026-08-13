/**
 * Mongo job-doc lifecycle for the S3 key restructure CLI — step 2.3's backing store.
 *
 * `_migrations/s3-key-restructure/<runId>/state.json` stays the SOURCE OF TRUTH for
 * resumability (see s3MigrationManifest.js); this module is the MIRROR that lets the
 * SystemSettings monitoring card and the admin pause/cancel endpoints see what a CLI
 * process — running as its own OS process, not inside the always-on Express server —
 * is doing right now. Losing this doc never loses migration state; `doctor` never
 * needs it.
 *
 * Deliberately different from s3CacheHeaderMigrationHelper.js in one structural way:
 * that job runs INSIDE the Express server process (`launchMigrationJob` spawns an
 * async worker in-process, triggered by a `/start` HTTP call). This migration's plan
 * says explicitly: "No /start" — the CLI is the only way to begin a run, so there is
 * no in-process worker or launch function here. The CLI process itself is the worker;
 * it claims the job doc, heartbeats while it runs, and releases it on exit. The lease/
 * heartbeat/steal-safe-write mechanics are otherwise the same pattern, reused
 * deliberately rather than reinvented.
 *
 * `createJobTracker(connection)` is a FACTORY, not a singleton module export, because
 * the CLI opens its own per-invocation connection via `mongoose.createConnection()`
 * (see utils/s3MigrationScan.js's `connect()`) rather than the app's shared default
 * connection the Express server uses — so the model must be bound per-connection via
 * `connection.model(...)`, reusing the SAME schema `s3KeyMigrationJobModel.js` exports.
 */
import { randomUUID } from "node:crypto";
import { S3KEYMIGRATIONJOB } from "../collectionName.js";
import { s3KeyMigrationJobSchema } from "../model/maintenance/s3KeyMigrationJobModel.js";

const JOB_TYPE = "s3-key-restructure";
const ACTIVE_SLOT = "active";
export const LEASE_DURATION_MS = 90 * 1000;
const WORKER_ID = `${process.pid}-${randomUUID()}`;

export const createJobTracker = (connection) => {
  const Model = connection.models[S3KEYMIGRATIONJOB] || connection.model(S3KEYMIGRATIONJOB, s3KeyMigrationJobSchema);

  const ownedFilter = (jobId) => ({ _id: jobId, jobType: JOB_TYPE, status: "running", workerId: WORKER_ID });
  const leaseFields = () => {
    const now = new Date();
    return { lastHeartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS) };
  };

  /**
   * Claim (or re-claim) the ONE job doc for this runId, upserted by {jobType, runId}
   * — one doc per run, reused and updated as it moves through copy/rewrite, not one
   * doc per phase. The {jobType, activeSlot} unique-partial index (only one doc may
   * hold activeSlot:"active" at a time, system-wide, across ALL runIds) is the actual
   * mutual-exclusion guarantee: it throws E11000 if a DIFFERENT run is already
   * active — correct, since this migration's ordering rules assume only one
   * commit-writing operation is ever in flight. Throws with a clear message on
   * conflict; the caller should always treat that as fatal.
   */
  const claimJob = async ({ runId, phase, targetDb = "", scopeKey = "all", total = 0, createdBy = {} }) => {
    const now = new Date();
    try {
      return await Model.findOneAndUpdate(
        { jobType: JOB_TYPE, runId },
        {
          $set: {
            activeSlot: ACTIVE_SLOT,
            status: "running",
            phase,
            targetDb,
            scopeKey,
            workerId: WORKER_ID,
            lastError: "",
            finishedAt: null,
            pausedAt: null,
            cancelledAt: null,
            "counts.total": total,
            ...leaseFields(),
          },
          $setOnInsert: { jobType: JOB_TYPE, runId, createdBy, startedAt: now },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error?.code === 11000) {
        const activeJob = await Model.findOne({ jobType: JOB_TYPE, activeSlot: ACTIVE_SLOT });
        const err = new Error(
          activeJob
            ? `Another S3 key migration run is active: runId ${activeJob.runId} (phase ${activeJob.phase}, status ${activeJob.status}). Only one run may write at a time.`
            : "Could not claim the migration job doc (E11000) — a stale activeSlot may need manual cleanup.",
        );
        err.code = "JOB_CLAIM_CONFLICT";
        throw err;
      }
      throw error;
    }
  };

  /** Steal-safe write: only succeeds while this process still owns the lease. */
  const updateOwnedJob = async (jobId, update = {}) => {
    const result = await Model.updateOne(ownedFilter(jobId), {
      ...update,
      $set: { ...(update.$set || {}), ...leaseFields() },
    });
    return result.matchedCount === 1;
  };

  const updateProgress = (jobId, { counts, cursor, phase } = {}) =>
    updateOwnedJob(jobId, {
      $set: {
        ...(counts ? { counts } : {}),
        ...(cursor !== undefined ? { "checkpoint.cursor": cursor } : {}),
        ...(phase ? { phase } : {}),
      },
    });

  /**
   * A light, unowned read — used by the CLI's own loop to voluntarily stop when the
   * UI has flipped status to "paused"/"cancelled". This is what makes pause/cancel
   * actually stop a running CLI process, not just relabel a job doc nobody watches.
   */
  const isStopRequested = async (jobId) => {
    const job = await Model.findById(jobId).select("status").lean();
    return !job || job.status !== "running";
  };

  const startHeartbeat = (jobId) => {
    const timer = setInterval(() => {
      updateOwnedJob(jobId).catch(() => {});
    }, Math.floor(LEASE_DURATION_MS / 3));
    timer.unref?.();
    return timer;
  };

  /**
   * `counts`, if given, is the TRUE final tally — not the last periodic checkpoint.
   * Progress is only pushed every 5 completions (throttled, to avoid hammering Mongo),
   * so without this a run whose total isn't a multiple of 5 finishes with
   * `counts.done` stuck a few short of the real number. Caught live: an 8-item run
   * completed with `done: 5` on the job doc despite all 8 actually succeeding.
   */
  const finishJob = async (jobId, { failed = 0, counts } = {}) => {
    const now = new Date();
    await Model.updateOne(ownedFilter(jobId), {
      $set: {
        status: failed > 0 ? "completed_with_errors" : "completed",
        finishedAt: now,
        lastHeartbeatAt: now,
        leaseExpiresAt: null,
        ...(counts ? { counts } : {}),
      },
      $unset: { activeSlot: 1, workerId: 1 },
    });
  };

  /**
   * Called on a voluntary stop (the admin endpoint already flipped `status` to
   * "paused"/"cancelled" — see s3KeyMigrationController.js — and the CLI's own
   * `isStopRequested` polling picked that up). This does NOT touch `status`; its only
   * job is to release the exclusive `activeSlot` so a later run can claim it, and to
   * drop `workerId` so this process no longer "owns" the doc. Deliberately NOT the
   * admin endpoint's job to unset `activeSlot` itself — doing so the instant `pause`
   * is clicked would let a brand-new run claim the slot while THIS process might still
   * be mid-batch, finishing an in-flight S3/DB write. Only the CLI process itself,
   * once it has actually stopped iterating, may safely release the slot.
   */
  const releaseSlot = async (jobId) => {
    await Model.updateOne(
      { _id: jobId, jobType: JOB_TYPE, workerId: WORKER_ID },
      { $set: { leaseExpiresAt: null }, $unset: { activeSlot: 1, workerId: 1 } },
    );
  };

  const failJob = async (jobId, error) => {
    const now = new Date();
    await Model.updateOne(ownedFilter(jobId), {
      $set: {
        status: "failed",
        lastError: String(error?.message || error || "Unknown error").slice(0, 2000),
        finishedAt: now,
        lastHeartbeatAt: now,
        leaseExpiresAt: null,
      },
      $unset: { activeSlot: 1, workerId: 1 },
    });
  };

  return { claimJob, updateOwnedJob, updateProgress, isStopRequested, startHeartbeat, finishJob, releaseSlot, failJob };
};
