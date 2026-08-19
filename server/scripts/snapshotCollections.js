/**
 * Point-in-time snapshot of named collections in ONE database, plus a checksum
 * manifest — the R.1 gate of S3_KEY_RESTRUCTURE_PROGRESS.md ("Snapshot both DBs |
 * checksums verified, counts match live").
 *
 * ⚠️ SUPERSEDED — PREFER `D:\dev_abishek\db-backups\backup.js`.
 *
 * This was written on 2026-08-14 on a false premise: a search confined to the
 * `massclick/` repo found no `db-backups/backup.js` and concluded the tooling did not
 * exist. It does — at `D:\dev_abishek\db-backups\`, a SIBLING of this repo, exactly as
 * S3_KEY_RESTRUCTURE_PROGRESS.md's "Backups taken" section already stated.
 *
 * That tool is better on every axis that matters here: it has a real `restore.js`
 * (three modes, verifies checksums and refuses a tampered snapshot), records indexes,
 * appends to a `MANIFEST.md` log, and refuses to touch prod without `--prod`. This
 * script has none of that — a snapshot with no restore path is a weak backup.
 *
 * Kept only because snapshots taken with it already exist on disk and this is what
 * reads them back. Do not extend it, and do not reach for it for new snapshots.
 *
 * Two subcommands:
 *
 *   create   Reads every named collection and writes one EJSON file per collection to
 *            `db-backups/snapshots/<db>/<timestamp>__<label>/`, plus `manifest.json`
 *            holding per-collection counts and SHA-256 checksums. Read-only against
 *            the database; writes only to local disk. Each run gets its own
 *            millisecond-stamped directory, so a snapshot can never overwrite an
 *            earlier one (the existsSync guard below is belt-and-braces, not the
 *            mechanism) — re-running with the same --label is safe and just produces
 *            a second, separately-named snapshot.
 *
 *   verify   Recomputes each file's checksum and compares it to the manifest (proves
 *            the snapshot on disk is intact), then — unless --offline — connects to
 *            the database and compares live document counts against the manifest
 *            (proves the snapshot matches what is actually there). Both halves of
 *            R.1's gate in one command.
 *
 * Usage:
 *   node scripts/snapshotCollections.js create --uri=... --collections=a,b --label=slug [--reason="..."]
 *   node scripts/snapshotCollections.js verify --dir=<snapshot dir> [--uri=...] [--offline]
 *
 * Connection strings always come from --uri=, no default and no env fallback — same
 * convention as s3KeyMigration.js and prodDevSync.js, so this can never be pointed at
 * the wrong database by a stale environment variable.
 *
 * WHY EJSON AND NOT PLAIN JSON: `prodDevSync.js`'s pre-reclone snapshots use
 * JSON.stringify, which flattens ObjectId and Date to strings — fine for diffing,
 * lossy for restoring. This snapshot's whole job is to be the backstop if `reverse`
 * ever can't be trusted, so it must round-trip: EJSON.parse(file) returns real
 * ObjectIds and Dates that insertMany accepts unchanged.
 *
 * Restoring is deliberately NOT a subcommand here. A restore is a destructive write
 * that should be a considered, hand-driven act with a human reading the manifest
 * first — not one flag away from a snapshot command someone runs routinely.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { EJSON } from "bson";
import { connect } from "../utils/s3MigrationScan.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SNAPSHOT_ROOT = path.join(REPO_ROOT, "db-backups", "snapshots");

const argv = process.argv.slice(2);
const SUBCOMMAND = argv.find((a) => !a.startsWith("--")) || "";
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const has = (name) => argv.includes(`--${name}`);

const URI = flag("uri");
const COLLECTIONS_FLAG = flag("collections");
const LABEL = flag("label");
const REASON = flag("reason");
const DIR = flag("dir");
const OFFLINE = has("offline");

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const dbNameOf = (uri) => (uri.split("/").pop() || "").split("?")[0] || "(unknown)";
const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const num = (n) => String(n).padStart(7);

/** Recursive key-sort so field-order alone never changes a checksum — same rule
 * prodDevSync.js uses for its content diff, kept identical on purpose. */
const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

/** Checksum of a whole collection: docs sorted by _id, each hashed, then the hashes
 * hashed together. Order-independent with respect to natural/insertion order, so
 * re-reading the snapshot reproduces it exactly. */
const checksumDocs = (docs) => {
  const perDoc = docs
    .map((d) => crypto.createHash("sha256").update(stableStringify(JSON.parse(EJSON.stringify(d)))).digest("hex"))
    .sort();
  return crypto.createHash("sha256").update(perDoc.join("")).digest("hex");
};

// ---------------------------------------------------------------- create

const cmdCreate = async () => {
  if (!URI) die("create requires --uri=... (no default — never guess which database).");
  if (!COLLECTIONS_FLAG) die("create requires --collections=a,b — never defaults to 'everything', matching prodDevSync.js.");
  if (!LABEL) die('create requires --label=<slug> (e.g. --label=pre-s3-rewrite) — an unlabelled snapshot is unfindable later.');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(LABEL)) die(`--label must be a lowercase kebab-case slug, got "${LABEL}".`);

  const dbLabel = dbNameOf(URI);
  const collections = COLLECTIONS_FLAG.split(",").map((s) => s.trim()).filter(Boolean);
  const snapshotDir = path.join(SNAPSHOT_ROOT, dbLabel, `${timestamp()}__${LABEL}`);

  if (fs.existsSync(snapshotDir)) die(`Snapshot directory already exists, refusing to overwrite:\n  ${snapshotDir}`);

  console.log(`\n=== snapshotCollections create — reads the database, writes only to local disk ===`);
  console.log(`database:    ${dbLabel}`);
  console.log(`collections: ${collections.length}`);
  console.log(`label:       ${LABEL}`);
  if (REASON) console.log(`reason:      ${REASON}`);
  console.log(`output:      ${snapshotDir}`);
  console.log(`started:     ${new Date().toISOString()}\n`);

  const connection = await connect(URI, dbLabel);
  const live = await connection.db.listCollections().toArray();
  const liveNames = new Set(live.map((c) => c.name));

  fs.mkdirSync(snapshotDir, { recursive: true });

  const entries = [];
  let totalDocs = 0;
  let totalBytes = 0;

  for (const name of collections) {
    if (!liveNames.has(name)) {
      // Not fatal: an empty collection legitimately may not exist yet (job_applications
      // and trackedkeywords were both 0/0 in the 2026-08-14 diff). Recorded so the
      // manifest still accounts for every collection that was asked for.
      console.log(`  ${name.padEnd(24)} ${"—".padStart(7)}   (does not exist in ${dbLabel} — recorded, not written)`);
      entries.push({ collection: name, exists: false, count: 0, sha256: null, file: null, bytes: 0 });
      continue;
    }

    const docs = await connection.db.collection(name).find({}).toArray();
    docs.sort((a, b) => String(a._id).localeCompare(String(b._id)));

    const file = `${name}.ejson`;
    const body = EJSON.stringify(docs, { relaxed: false });
    fs.writeFileSync(path.join(snapshotDir, file), body);

    const sha256 = checksumDocs(docs);
    const bytes = Buffer.byteLength(body);
    totalDocs += docs.length;
    totalBytes += bytes;

    entries.push({ collection: name, exists: true, count: docs.length, sha256, file, bytes });
    console.log(`  ${name.padEnd(24)} ${num(docs.length)} docs   ${(bytes / 1048576).toFixed(1).padStart(7)} MB   ${sha256.slice(0, 16)}…`);
  }

  await connection.close();

  const manifest = {
    database: dbLabel,
    label: LABEL,
    reason: REASON || null,
    createdAt: new Date().toISOString(),
    snapshotDir,
    totalCollections: entries.length,
    totalDocuments: totalDocs,
    totalBytes,
    collections: entries,
  };
  fs.writeFileSync(path.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n  total: ${totalDocs} documents, ${(totalBytes / 1048576).toFixed(1)} MB across ${entries.filter((e) => e.exists).length} collections`);
  console.log(`\n=== snapshot complete — verify it before relying on it: ===`);
  console.log(`  node scripts/snapshotCollections.js verify --dir="${snapshotDir}" --uri=<same uri>\n`);
};

// ---------------------------------------------------------------- verify

const cmdVerify = async () => {
  if (!DIR) die("verify requires --dir=<snapshot dir>.");
  const manifestPath = path.join(DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) die(`No manifest.json in:\n  ${DIR}`);
  if (!OFFLINE && !URI) {
    die("verify requires --uri=... to compare live counts, or --offline to check on-disk checksums only.\nR.1's gate is BOTH halves — use --offline only when the database is deliberately unreachable.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  console.log(`\n=== snapshotCollections verify — read-only ===`);
  console.log(`snapshot:  ${DIR}`);
  console.log(`database:  ${manifest.database}`);
  console.log(`label:     ${manifest.label}`);
  console.log(`created:   ${manifest.createdAt}`);
  console.log(`live-count comparison: ${OFFLINE ? "SKIPPED (--offline)" : "on"}\n`);

  if (!OFFLINE && dbNameOf(URI) !== manifest.database) {
    die(`--uri points at "${dbNameOf(URI)}" but this snapshot is of "${manifest.database}". Refusing to compare unrelated databases.`);
  }

  let connection = null;
  if (!OFFLINE) connection = await connect(URI, manifest.database);

  let checksumFailures = 0;
  let countMismatches = 0;

  for (const entry of manifest.collections) {
    if (!entry.exists) {
      console.log(`  ${entry.collection.padEnd(24)} (not present at snapshot time — skipped)`);
      continue;
    }

    const filePath = path.join(DIR, entry.file);
    let diskLine = "";
    if (!fs.existsSync(filePath)) {
      diskLine = "FILE MISSING";
      checksumFailures += 1;
    } else {
      const docs = EJSON.parse(fs.readFileSync(filePath, "utf8"), { relaxed: false });
      const sha256 = checksumDocs(docs);
      if (sha256 !== entry.sha256) {
        diskLine = `CHECKSUM MISMATCH (manifest ${entry.sha256.slice(0, 12)}… disk ${sha256.slice(0, 12)}…)`;
        checksumFailures += 1;
      } else if (docs.length !== entry.count) {
        diskLine = `COUNT MISMATCH in file (manifest ${entry.count}, file ${docs.length})`;
        checksumFailures += 1;
      } else {
        diskLine = "checksum ok";
      }
    }

    let liveLine = "";
    if (connection) {
      const liveCount = await connection.db.collection(entry.collection).countDocuments();
      if (liveCount !== entry.count) {
        liveLine = `   live=${liveCount} vs snapshot=${entry.count}  <-- DRIFT`;
        countMismatches += 1;
      } else {
        liveLine = `   live=${liveCount} matches`;
      }
    }

    console.log(`  ${entry.collection.padEnd(24)} ${num(entry.count)} docs   ${diskLine}${liveLine}`);
  }

  if (connection) await connection.close();

  console.log(`\n  checksum failures: ${checksumFailures}`);
  if (!OFFLINE) console.log(`  live-count mismatches: ${countMismatches}`);

  if (checksumFailures || countMismatches) {
    console.log(`\n=== VERIFY FAILED — do not treat this snapshot as a rollback backstop ===\n`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n=== verify PASSED — checksums intact${OFFLINE ? "" : ", counts match live"} ===\n`);
};

// ---------------------------------------------------------------- main

const main = async () => {
  switch (SUBCOMMAND) {
    case "create":
      await cmdCreate();
      break;
    case "verify":
      await cmdVerify();
      break;
    default:
      die(
        `Unknown subcommand "${SUBCOMMAND || "(none)"}".\n` +
          `Available: create, verify\n\n` +
          `  node scripts/snapshotCollections.js create --uri=... --collections=a,b --label=<slug> [--reason="..."]\n` +
          `  node scripts/snapshotCollections.js verify --dir=<snapshot dir> [--uri=...] [--offline]`,
      );
  }
  process.exit(process.exitCode || 0);
};

await main();
