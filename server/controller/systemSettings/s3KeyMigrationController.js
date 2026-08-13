/**
 * Admin endpoints for the S3 key restructure card — step 2.3, plus the 2026-08-13
 * addition that lets the card actually start runs (`plan`/`copy`/`verify-s3`/
 * `rewrite`/`verify`), not just watch them. `reverse`/`rollback-copies`/`doctor`/
 * `resume` are a deliberate later phase — the CLI is still the only way to run those.
 *
 * The start actions spawn `server/scripts/s3KeyMigration.js` as a child process (see
 * helper/s3Migration/s3KeyMigrationRunner.js for why: reusing the exact already-proven
 * CLI code path rather than re-deriving its hardening in a second copy). They never
 * accept a raw connection string from the client — only a `target: "dev"|"prod"`
 * label, resolved server-side. Any action that would pass `--commit` also requires a
 * `confirm` field matching a server-computed phrase (the scope/runId, or the
 * escalated `"RUN ON PROD"` when targeting prod) — a UI bug or a replayed request
 * alone can't trigger a write, mirroring the CLI's requirement that a human type
 * `--commit` themselves.
 *
 * Reuses `clampInteger`/`errorStatus`/`resolveActiveJobId` conventions from
 * s3CacheHeaderMigrationController.js, adapted: this job model is keyed by `runId`,
 * not a single global slot, so "the active job" means the one doc (if any) currently
 * holding `activeSlot: "active"`.
 */
import s3KeyMigrationJobModel from "../../model/maintenance/s3KeyMigrationJobModel.js";
import { readJsonl, readMeta, runFile } from "../../utils/s3MigrationManifest.js";
import { SCOPE_KEYS } from "../../utils/s3ScopeRegistry.js";
import {
  cancelRun,
  expectedConfirmPhrase,
  runPlan,
  runVerify,
  runVerifyS3,
  startCopy,
  startRewrite,
} from "../../helper/s3Migration/s3KeyMigrationRunner.js";

const JOB_TYPE = "s3-key-restructure";
const PAUSABLE_STATUSES = ["running"];
const CANCELLABLE_STATUSES = ["running", "paused"];

const errorStatus = (error) => (Number.isInteger(error?.statusCode) ? error.statusCode : 500);

/** Runner errors carry no statusCode (they're plain Errors from child_process/plain
 * validation) — classify by shape instead of forcing every throw site to remember to
 * attach one. */
const runnerErrorStatus = (error) => {
  if (error?.code === "ALREADY_RUNNING") return 409;
  if (/unknown migration target|is not configured on this server|^plan: unknown --scope/.test(error?.message || "")) {
    return 400;
  }
  return errorStatus(error);
};

const requireConfirm = (req, { subcommand, scope, target }) => {
  const expected = expectedConfirmPhrase({ subcommand, scope, target });
  if (req.body?.confirm !== expected) {
    const error = new Error(`confirm mismatch — expected exactly "${expected}"`);
    error.statusCode = 400;
    throw error;
  }
};

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

    // Best-effort SIGTERM if this same server process launched the child — the proven
    // stop mechanism is still the CLI's own isStopRequested polling picking up the
    // status flip above; this only helps a process not currently between S3 calls.
    cancelRun(job.runId);

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("cancelS3KeyMigrationJobAction error:", error);
    return res.status(errorStatus(error)).json({ success: false, message: error.message || "Failed to cancel migration" });
  }
};

/** GET /scopes — the UI's scope dropdown for a new plan. Derived from the registry,
 * same source `s3ScopeRegistry.js` already feeds everything else. */
export const getS3KeyMigrationScopesAction = (req, res) => {
  return res.json({ success: true, data: SCOPE_KEYS });
};

/**
 * POST /plan — always reads BOTH databases (dev/prod resolved server-side), never
 * writes to S3 or a database. No confirm phrase needed — matches `plan` itself never
 * needing `--commit`. Runs to completion (typically well under a minute for a single
 * scope) and returns the parsed runId plus the conflict count so the UI can show a
 * warning banner before anyone tries to `copy` a run with unresolved conflicts.
 */
export const startS3KeyMigrationPlanAction = async (req, res) => {
  try {
    const scope = req.body?.scope || "all";
    if (scope !== "all" && !SCOPE_KEYS.includes(scope)) {
      return res.status(400).json({ success: false, message: `Unknown scope "${scope}". Valid: all, ${SCOPE_KEYS.join(", ")}` });
    }

    const result = await runPlan({ scope });
    if (result.exitCode !== 0) {
      return res.status(422).json({ success: false, message: `plan exited with code ${result.exitCode}`, data: result });
    }

    const runIdMatch = result.output.match(/^runId:\s*(\S+)/m);
    const runId = runIdMatch ? runIdMatch[1] : null;
    const conflictCount = runId ? readJsonl(runFile(runId, "conflicts.jsonl")).rows.length : 0;

    return res.json({ success: true, data: { runId, scope, conflictCount, output: result.output } });
  } catch (error) {
    console.error("startS3KeyMigrationPlanAction error:", error);
    return res.status(runnerErrorStatus(error)).json({ success: false, message: error.message || "Failed to run plan" });
  }
};

/**
 * POST /copy — dry run unless `commit: true`, in which case `confirm` must equal
 * `"copy:<scope>"` (scope read from the run's own meta.json, not trusted from the
 * client). The CLI itself independently refuses `copy --commit` when
 * conflicts.jsonl is non-empty — this confirm gate is an earlier, friendlier stop,
 * not the only one.
 */
export const startS3KeyMigrationCopyAction = async (req, res) => {
  try {
    const { runId, commit, concurrency } = req.body || {};
    if (!runId) return res.status(400).json({ success: false, message: "runId is required" });

    if (commit) {
      const meta = readMeta(runId);
      if (!meta) return res.status(404).json({ success: false, message: `no meta.json for run "${runId}"` });
      requireConfirm(req, { subcommand: "copy", scope: meta.params?.scope || runId });
    }

    const result = await startCopy({ runId, commit: !!commit, concurrency });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("startS3KeyMigrationCopyAction error:", error);
    return res
      .status(runnerErrorStatus(error))
      .json({ success: false, message: error.message || "Failed to start copy", output: error.output });
  }
};

/** POST /verify-s3 — always read-only, no confirm needed. Runs to completion. */
export const startS3KeyMigrationVerifyS3Action = async (req, res) => {
  try {
    const { runId } = req.body || {};
    if (!runId) return res.status(400).json({ success: false, message: "runId is required" });

    const result = await runVerifyS3({ runId });
    return res.json({ success: result.exitCode === 0, data: result });
  } catch (error) {
    console.error("startS3KeyMigrationVerifyS3Action error:", error);
    return res.status(runnerErrorStatus(error)).json({ success: false, message: error.message || "Failed to run verify-s3" });
  }
};

/**
 * POST /rewrite — the one action that writes to a specific database's documents.
 * `target` ("dev"|"prod") is required and resolved server-side; a raw connection
 * string is never accepted. Commit requires `confirm === "rewrite:<scope>"` for dev,
 * escalating to the literal phrase `"RUN ON PROD"` for prod — the frontend modal
 * computes the same escalation so the two can't silently disagree.
 */
export const startS3KeyMigrationRewriteAction = async (req, res) => {
  try {
    const { runId, target, commit } = req.body || {};
    if (!runId) return res.status(400).json({ success: false, message: "runId is required" });
    if (target !== "dev" && target !== "prod") {
      return res.status(400).json({ success: false, message: 'target must be "dev" or "prod"' });
    }

    if (commit) {
      const meta = readMeta(runId);
      if (!meta) return res.status(404).json({ success: false, message: `no meta.json for run "${runId}"` });
      requireConfirm(req, { subcommand: "rewrite", scope: meta.params?.scope || runId, target });
    }

    const result = await startRewrite({ runId, target, commit: !!commit });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("startS3KeyMigrationRewriteAction error:", error);
    return res
      .status(runnerErrorStatus(error))
      .json({ success: false, message: error.message || "Failed to start rewrite", output: error.output });
  }
};

/** POST /verify — read-only against whichever DB was just rewritten. */
export const startS3KeyMigrationVerifyAction = async (req, res) => {
  try {
    const { runId, target } = req.body || {};
    if (!runId) return res.status(400).json({ success: false, message: "runId is required" });
    if (target !== "dev" && target !== "prod") {
      return res.status(400).json({ success: false, message: 'target must be "dev" or "prod"' });
    }

    const result = await runVerify({ runId, target });
    return res.json({ success: result.exitCode === 0, data: result });
  } catch (error) {
    console.error("startS3KeyMigrationVerifyAction error:", error);
    return res.status(runnerErrorStatus(error)).json({ success: false, message: error.message || "Failed to run verify" });
  }
};
