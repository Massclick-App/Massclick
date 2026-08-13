/**
 * Spawns `server/scripts/s3KeyMigration.js` as a child process on behalf of the admin
 * UI — the piece that turns the monitoring-only S3 key restructure card into one that
 * can actually start runs.
 *
 * Deliberately NOT an in-process refactor of the CLI's command functions. That script
 * is ~1600 lines carrying real hardening earned from real incidents (checksum
 * verification, torn-line detection, resumable state, the newly-added duplicate-newKey
 * conflict detection) — reusing the exact already-proven code path by spawning it is
 * safer than re-deriving its behavior in a second copy. See
 * S3_KEY_RESTRUCTURE_PROGRESS.md and C:\Users\USER\.claude\plans\parsed-sauteeing-garden.md
 * for the fuller reasoning.
 *
 * Two shapes, matching how the underlying subcommands actually behave:
 *
 *   - `plan` / `verify-s3` / `verify` — no long-running loop, no job-doc tracking of
 *     their own (only `copy`/`rewrite` claim a job doc — see
 *     utils/s3MigrationJobTracking.js). Run to completion and return the full result.
 *   - `copy` / `rewrite` — long-running, resumable, already job-doc-tracked by the CLI
 *     itself via `--state-uri`/`S3_MIGRATION_STATE_URI`. Fire-and-forget: wait up to a
 *     short grace window to catch immediate failures (bad scope, a claim conflict),
 *     then return — the existing `latest`/`runs`/`:jobId` endpoints and the card's
 *     5s poll already surface real progress from the job doc the CLI writes.
 *
 * A connection string never reaches the client and is never placed on argv (so it
 * can't show up in `ps aux` on the box) — it's resolved server-side from
 * `S3_MIGRATION_DEV_URI` / `S3_MIGRATION_PROD_URI` and passed to the child via env.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT_PATH = path.join(SERVER_DIR, "scripts", "s3KeyMigration.js");

const TARGET_ENV_KEYS = { dev: "S3_MIGRATION_DEV_URI", prod: "S3_MIGRATION_PROD_URI" };

/** The only place a "dev"/"prod" label becomes a real connection string. Throws on
 * anything else, including a missing env var — never silently falls back. */
export const resolveTargetUri = (target, env = process.env) => {
  const envKey = TARGET_ENV_KEYS[target];
  if (!envKey) {
    throw new Error(`unknown migration target "${target}" — expected "dev" or "prod"`);
  }
  const uri = env[envKey];
  if (!uri) {
    throw new Error(`${envKey} is not configured on this server — cannot resolve target "${target}"`);
  }
  return uri;
};

const MAX_TAIL_LINES = 500;

/** runId -> ChildProcess, for cancelRun()'s SIGTERM fallback. Only populated for
 * copy/rewrite — plan/verify-s3/verify never outlive their own request. */
const runningChildren = new Map();

const spawnScript = (subcommand, args, env) =>
  spawn(process.execPath, [SCRIPT_PATH, subcommand, ...args], {
    cwd: SERVER_DIR,
    env: { ...process.env, ...env },
  });

const attachTail = (child) => {
  const tail = [];
  const push = (chunk) => {
    for (const line of chunk.toString("utf8").split("\n")) {
      if (!line) continue;
      tail.push(line);
      if (tail.length > MAX_TAIL_LINES) tail.shift();
    }
  };
  child.stdout.on("data", push);
  child.stderr.on("data", push);
  return tail;
};

/** Runs a subcommand to completion and returns its full output. For plan/verify-s3/
 * verify — none of them loop or need to be interrupted mid-flight. */
const runToCompletion = ({ subcommand, args = [], env = {}, timeoutMs = 5 * 60 * 1000 }) =>
  new Promise((resolve, reject) => {
    const child = spawnScript(subcommand, args, env);
    const tail = attachTail(child);
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, output: tail.join("\n") });
    });
  });

/** Starts a long-running subcommand (copy/rewrite) and returns once either (a) it
 * exits within the grace window — an immediate failure like a bad --run or a job-claim
 * conflict, surfaced synchronously — or (b) the grace window elapses while it's still
 * running, in which case it keeps running in the background and the caller should poll
 * the job doc (`latest`/`:jobId`) for real progress. */
const startLongRunning = ({ subcommand, args = [], env = {}, runId, graceMs = 3000 }) =>
  new Promise((resolve, reject) => {
    if (runningChildren.has(runId)) {
      reject(Object.assign(new Error(`run ${runId} already has a ${subcommand} in flight`), { code: "ALREADY_RUNNING" }));
      return;
    }
    const child = spawnScript(subcommand, args, env);
    runningChildren.set(runId, child);
    const tail = attachTail(child);

    let settled = false;
    const graceTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ started: true, finished: false });
      }
    }, graceMs);

    child.on("error", (error) => {
      clearTimeout(graceTimer);
      runningChildren.delete(runId);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.on("close", (exitCode) => {
      clearTimeout(graceTimer);
      runningChildren.delete(runId);
      if (!settled) {
        settled = true;
        if (exitCode === 0) {
          resolve({ started: true, finished: true, exitCode });
        } else {
          reject(
            Object.assign(new Error(`${subcommand} exited immediately with code ${exitCode}:\n${tail.slice(-40).join("\n")}`), {
              exitCode,
              output: tail.join("\n"),
            }),
          );
        }
      }
    });
  });

/** `plan` always reads both databases regardless of which is "primary" — the labels
 * are only for the run's own bookkeeping (`meta.json`'s `primaryDb`/`compareDb`). */
export const runPlan = ({ scope }) =>
  runToCompletion({
    subcommand: "plan",
    args: [`--scope=${scope}`],
    env: {
      S3_MIGRATION_URI: resolveTargetUri("dev"),
      S3_MIGRATION_COMPARE_URI: resolveTargetUri("prod"),
    },
  });

export const runVerifyS3 = ({ runId }) =>
  runToCompletion({ subcommand: "verify-s3", args: [`--run=${runId}`] });

export const runVerify = ({ runId, target }) =>
  runToCompletion({
    subcommand: "verify",
    args: [`--run=${runId}`],
    env: { S3_MIGRATION_URI: resolveTargetUri(target) },
  });

/** Job docs always live in dev, regardless of which DB a rewrite targets — matches
 * every proven rehearsal invocation (`--state-uri=<dev>`), so the monitoring card has
 * one consistent place to read from. */
export const startCopy = ({ runId, commit, concurrency }) =>
  startLongRunning({
    subcommand: "copy",
    args: [`--run=${runId}`, ...(commit ? ["--commit"] : []), ...(concurrency ? [`--concurrency=${concurrency}`] : [])],
    env: { S3_MIGRATION_STATE_URI: resolveTargetUri("dev") },
    runId,
  });

export const startRewrite = ({ runId, target, commit }) =>
  startLongRunning({
    subcommand: "rewrite",
    args: [`--run=${runId}`, ...(commit ? ["--commit"] : [])],
    env: {
      S3_MIGRATION_URI: resolveTargetUri(target),
      S3_MIGRATION_STATE_URI: resolveTargetUri("dev"),
    },
    runId,
  });

/** Scope name for plan/copy, or the escalated phrase once a rewrite/verify targets
 * prod — the one place the "type to confirm" phrase is computed, so the controller's
 * guard and the frontend modal (which mirrors this deliberately, see
 * TypeToConfirmModal's caller in S3KeyMigrationCard.js) can be tested against the
 * same source instead of two hand-copies quietly drifting apart. */
export const expectedConfirmPhrase = ({ subcommand, scope, target }) => {
  if (target === "prod") return "RUN ON PROD";
  return `${subcommand}:${scope}`;
};

/** SIGTERM fallback for a copy/rewrite this process itself launched. The primary,
 * proven stop mechanism is still the existing pause/cancel endpoints flipping the job
 * doc's `status`, which the CLI's own `isStopRequested` polling honors — this only
 * helps if that process is somehow not polling (e.g. mid-batch on a single slow S3
 * call). Returns false if this process has no record of running that runId (e.g. the
 * server restarted, or it was launched by a human on the CLI instead). */
export const cancelRun = (runId) => {
  const child = runningChildren.get(runId);
  if (!child) return false;
  child.kill("SIGTERM");
  return true;
};
