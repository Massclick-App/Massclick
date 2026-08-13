/**
 * On-disk run state for the S3 key restructure migration — step 2.2.
 *
 * `_migrations/s3-key-restructure/<runId>/` is the SOURCE OF TRUTH for a run, per the
 * plan's "Where run state lives": it describes the *bucket*, which both databases
 * share, so putting it in one DB would make that DB privileged and break on restore.
 * The Mongo job doc (s3KeyMigrationJobModel) is a mirror for the lease and the
 * monitoring card only — losing it never loses migration state.
 *
 * Two file categories, handled differently on purpose:
 *
 *   PLAN OUTPUTS (written once, by `plan`, never touched again):
 *     manifest.jsonl, conflicts.jsonl, orphans.jsonl, missing.jsonl, external.jsonl
 *     Checksummed into meta.json at the end of `plan`. Every subsequent subcommand
 *     calls verifyManifestChecksums() first and refuses to run if any byte changed —
 *     "re-verifies the manifest checksum on start and refuses to run if it was edited."
 *
 *   APPEND-ONLY LOGS (grow throughout the run, one line per confirmed operation):
 *     copied.jsonl, applied-<db>.jsonl, swept.jsonl, reversed.jsonl
 *     Logged AFTER the operation succeeds, never before — so a hard kill loses at most
 *     the in-flight item, and every operation is idempotent so replaying it is harmless.
 *     Never checksummed (they are expected to change); `doctor` re-verifies their TAIL
 *     against S3/the DB and truncates a torn final line from an unclean exit.
 *
 * state.json is the resumable checkpoint, written atomically (temp file + rename) so a
 * kill mid-write can never leave a torn state.json — the one file every subcommand reads
 * first to know where a run stands.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ulid } from "./idGen.js";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const MIGRATION_ROOT = path.join(REPO_ROOT, "_migrations", "s3-key-restructure");

export const STATE_VERSION = 1;

/** Plan outputs — fixed at `plan` time, checksummed, never edited afterwards. */
export const PLAN_FILES = Object.freeze([
  "manifest.jsonl",
  "conflicts.jsonl",
  "orphans.jsonl",
  "missing.jsonl",
  "external.jsonl",
]);

export const newRunId = () => ulid();

export const runDir = (runId) => path.join(MIGRATION_ROOT, runId);

export const ensureRunDir = (runId) => {
  const dir = runDir(runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const runFile = (runId, name) => path.join(runDir(runId), name);

export const listRuns = () => {
  if (!fs.existsSync(MIGRATION_ROOT)) return [];
  return fs
    .readdirSync(MIGRATION_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
};

// ---------------------------------------------------------------- atomic JSON

/** Temp-file-then-rename so a kill mid-write can never leave a torn/partial file. */
export const writeJsonAtomic = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
};

export const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

// ---------------------------------------------------------------- state.json

/**
 * {stateVersion, runId, phase, scope, cursor, counts, startedAt, updatedAt}
 * A `resume` against a mismatched stateVersion refuses rather than guessing, same as
 * the cache-header job's CHECKPOINT_VERSION.
 */
export const writeState = (runId, patch) => {
  const filePath = runFile(runId, "state.json");
  const existing = readJson(filePath) || {
    stateVersion: STATE_VERSION,
    runId,
    phase: "plan",
    scope: "all",
    cursor: null,
    counts: {},
    startedAt: new Date().toISOString(),
  };
  const next = {
    ...existing,
    ...patch,
    stateVersion: STATE_VERSION,
    runId,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(filePath, next);
  return next;
};

export const readState = (runId) => readJson(runFile(runId, "state.json"));

// ---------------------------------------------------------------- meta.json

export const gitCommit = () => {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

export const sha256File = (filePath) => {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
};

/**
 * Called once, at the end of a successful `plan`. Checksums every PLAN_FILE that
 * exists (a scope with zero orphans legitimately has no orphans.jsonl) and records run
 * params + the git commit the manifest was built against.
 */
export const writeMeta = (runId, params) => {
  const checksums = {};
  for (const name of PLAN_FILES) {
    const filePath = runFile(runId, name);
    if (fs.existsSync(filePath)) checksums[name] = sha256File(filePath);
  }
  const meta = {
    runId,
    createdAt: new Date().toISOString(),
    gitCommit: gitCommit(),
    params,
    checksums,
  };
  writeJsonAtomic(runFile(runId, "meta.json"), meta);
  return meta;
};

export const readMeta = (runId) => readJson(runFile(runId, "meta.json"));

/**
 * "Every subcommand re-verifies the manifest checksum on start and refuses to run if
 * it was edited." Returns a list of problems; empty means clean. Missing meta.json (a
 * runId that was never planned, or a typo) is itself a problem, not a pass.
 */
export const verifyManifestChecksums = (runId) => {
  const meta = readMeta(runId);
  if (!meta) return [`no meta.json for run "${runId}" — was plan --commit ever run for it?`];
  const problems = [];
  for (const [name, expected] of Object.entries(meta.checksums || {})) {
    const filePath = runFile(runId, name);
    if (!fs.existsSync(filePath)) {
      problems.push(`${name}: present at plan time, now missing`);
      continue;
    }
    const actual = sha256File(filePath);
    if (actual !== expected) {
      problems.push(`${name}: checksum mismatch — edited since plan (expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…)`);
    }
  }
  return problems;
};

// ---------------------------------------------------------------- append-only .jsonl

/**
 * Append one row after the operation it records has already succeeded — never before.
 * A hard kill can only ever lose the in-flight item, not corrupt what came before it.
 */
export const appendJsonl = (filePath, row) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`);
};

/**
 * Parse a .jsonl file, tolerating a torn final line (a kill mid-`fs.appendFile` can
 * leave a partial JSON line — risk 7). `rows` excludes the torn line; `tornLastLine`
 * carries its raw text so `doctor` can decide whether to truncate it. A parse failure
 * anywhere OTHER than the last line is a real corruption and throws, since append-only
 * logs are never edited except by appending.
 */
export const readJsonl = (filePath) => {
  if (!fs.existsSync(filePath)) return { rows: [], tornLastLine: null };
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const rows = [];
  let tornLastLine = null;
  for (let i = 0; i < lines.length; i += 1) {
    try {
      rows.push(JSON.parse(lines[i]));
    } catch (error) {
      if (i === lines.length - 1) {
        tornLastLine = lines[i];
      } else {
        throw new Error(`${filePath}:${i + 1} is not valid JSON and is not the final line — real corruption, not a torn write.\n  ${error.message}`);
      }
    }
  }
  return { rows, tornLastLine };
};

/**
 * Truncate a torn final line off an append-only log. Rewrites the file from the parsed
 * good rows — the only writer allowed to touch these files other than an append.
 * `doctor` is the only caller.
 */
export const truncateTornLine = (filePath) => {
  const { rows, tornLastLine } = readJsonl(filePath);
  if (!tornLastLine) return false;
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.length ? `${rows.map((r) => JSON.stringify(r)).join("\n")}\n` : "");
  fs.renameSync(tmp, filePath);
  return true;
};

/** Set of rowIds already logged — resumability's core primitive: skip what's done. */
export const loadDoneRowIds = (filePath, idField = "rowId") => {
  const { rows } = readJsonl(filePath);
  return new Set(rows.map((r) => r[idField]));
};
