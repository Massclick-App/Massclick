/**
 * S3 key restructure — migration CLI.
 *
 * See S3_KEY_RESTRUCTURE_PROGRESS.md at the repo root for where this sits in the
 * plan, and the "Do NOT do" ordering rules before changing anything here.
 *
 * Subcommands (steps 0.1 and 0.7 so far):
 *
 *   scan          READ-ONLY baseline. Touches nothing. Reports, per database:
 *                 every referenced S3 key by scope/collection/field, which of
 *                 those are present vs MISSING in the bucket, which bucket
 *                 objects are unreferenced, a valueShape histogram, and — with
 *                 --compare-uri — whether the two databases are clones.
 *   collections   Print the collection list the registry covers, for --collections
 *                 on db-backups/backup.js so the two can never drift.
 *   flush-caches  Purge every cache that could keep serving an old key after a
 *                 rewrite. Dry run by default; --commit clears. Calls every
 *                 invalidator in utils/cacheInvalidation.js by reflection, so a
 *                 newly added one is picked up without editing this file.
 *
 * Everything here is dry-run by default; nothing writes without --commit, and
 * `scan` has no --commit at all because it has nothing to write.
 *
 * The connection string comes from --uri=... with NO default, so this can never
 * be pointed at prod by a stale environment variable. (Convention borrowed from
 * scripts/backfillBusinessPublicId.js.)
 *
 * Usage:
 *   node scripts/s3KeyMigration.js collections
 *
 *   node scripts/s3KeyMigration.js scan \
 *     --uri="mongodb://user:pass@127.0.0.1:27018/massClick_dev?authSource=admin" \
 *     --compare-uri="mongodb://user:pass@127.0.0.1:27018/massClick?authSource=admin" \
 *     --out=_migrations/s3-key-restructure/scan-dev.json
 *
 * Flags:
 *   --uri=          required (except for `collections`)
 *   --compare-uri=  second database, for the clone check and the true-orphan count
 *   --out=          write the full JSON report here (the summary always prints)
 *   --no-s3         skip the bucket listing; reference counts only, no
 *                   present/missing/orphan analysis
 *
 * The SSH tunnel to 127.0.0.1:27018 must be up. `ECONNREFUSED` means reconnect
 * it and re-run — it is not something this script works around.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import AWS from "aws-sdk";
import mongoose from "mongoose";

import { SCOPES, registryCollections } from "../utils/s3ScopeRegistry.js";
import { connect, scanDatabase, compareIds, listBucket } from "../utils/s3MigrationScan.js";
import { s3Path, isCanonicalKey } from "../utils/s3ObjectKeys.js";
import { ulid } from "../utils/idGen.js";
import { resolveDuplicateNewKeys } from "../utils/s3ManifestDedup.js";
import { evaluateConflictGate } from "../utils/s3ConflictGate.js";
import {
  newRunId,
  ensureRunDir,
  runFile,
  writeMeta,
  readMeta,
  writeState,
  readState,
  appendJsonl,
  readJsonl,
  loadDoneRowIds,
  verifyManifestChecksums,
  truncateTornLine,
  STATE_VERSION,
  listRuns,
} from "../utils/s3MigrationManifest.js";
import { withRetry, runPool, copySourceFor } from "../utils/s3RetryPolicy.js";
import { createJobTracker } from "../utils/s3MigrationJobTracking.js";
import {
  initRedis,
  getRedisClient,
  isRedisConnected,
  clearAllCache,
} from "../utils/redisClient.js";
import * as cacheInvalidation from "../utils/cacheInvalidation.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const SUBCOMMAND = argv.find((a) => !a.startsWith("--")) || "";
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const has = (name) => argv.includes(`--${name}`);

/** Env-var fallback lets a spawned child process (the admin UI) pass connection
 * strings without putting them on argv, where `ps aux` on the box could see them.
 * The flag is always checked first, so every hand-typed CLI invocation is unaffected. */
const URI = flag("uri") || process.env.S3_MIGRATION_URI || null;
const COMPARE_URI = flag("compare-uri") || process.env.S3_MIGRATION_COMPARE_URI || null;
const OUT = flag("out");
const SKIP_S3 = has("no-s3");
/** Nothing in this CLI writes anything without this. `scan` ignores it entirely. */
const COMMIT = has("commit");
const RUN_ID = flag("run");
const SCOPE_FLAG = flag("scope") || "all";
const CONCURRENCY = Number(flag("concurrency")) || 8;
/** Exact count of REVIEWABLE conflicts.jsonl entries the operator has read and accepts.
 * Never able to bypass a blocking kind — see utils/s3ConflictGate.js. */
const ACKNOWLEDGE_CONFLICTS = flag("acknowledge-conflicts");
/** Where the monitoring-card job doc is written. Job tracking is skipped entirely
 * (with a warning) if this isn't given — copy/rewrite still work standalone. */
const STATE_URI = flag("state-uri") || process.env.S3_MIGRATION_STATE_URI || null;

const BUCKET = process.env.AWS_S3_BUCKET_MASSCLICK;

const s3Client = () => {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  return new AWS.S3();
};

const requireRun = (runId = RUN_ID) => {
  if (!runId) die("this subcommand requires --run=<runId> (from a prior `plan`).");
  const meta = readMeta(runId);
  if (!meta) die(`no meta.json for run "${runId}" — was \`plan\` ever run for it? Check _migrations/s3-key-restructure/.`);
  const problems = verifyManifestChecksums(runId);
  if (problems.length) {
    die(
      `Manifest checksum mismatch for run ${runId} — refusing to proceed:\n` +
        problems.map((p) => `  - ${p}`).join("\n") +
        `\n\nA plan output file was edited after \`plan\` ran. Re-run \`plan\` to build a fresh, trustworthy manifest.`,
    );
  }
  return meta;
};

const dbNameOf = (uri) => (uri.split("/").pop() || "").split("?")[0] || "(unknown)";

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

// classify / readField / connect / scanDatabase / compareIds / listBucket now live in
// utils/s3MigrationScan.js, shared with `plan` — see that file's header for why.

// ---------------------------------------------------------------- reporting

const pad = (v, n) => String(v).padEnd(n);
const num = (v, n) => String(v).padStart(n);

const printFieldTable = (rows) => {
  console.log(
    `\n  ${pad("collection", 26)}${pad("field", 40)}${pad("kind", 15)}${num("refs", 8)}${num("distinct", 10)}  shapes`,
  );
  console.log(`  ${"-".repeat(112)}`);
  for (const r of rows) {
    if (!r.refs) continue;
    const shapes = Object.entries(r.shapes)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(
      `  ${pad(r.collection, 26)}${pad(r.field, 40)}${pad(r.kind, 15)}${num(r.refs, 8)}${num(r.distinctKeys, 10)}  ${shapes}`,
    );
  }
  const zero = rows.filter((r) => !r.refs);
  if (zero.length) {
    console.log(`\n  declared but zero references today (${zero.length}):`);
    console.log(`    ${zero.map((r) => `${r.collection}.${r.field}`).join(", ")}`);
  }
};

// ---------------------------------------------------------------- subcommands

const cmdCollections = () => {
  const names = registryCollections();
  console.log(`\n${names.length} collections covered by the registry:\n`);
  console.log(names.join(","));
  console.log(`\nFor db-backups/backup.js --collections\n`);
};

/**
 * Purge every cache that could keep serving an old image key after a rewrite.
 *
 * Step 0.7. A correct database behind a stale cache still serves broken images, and
 * discovering that during a prod rewrite is the worst possible time — hence it is built
 * and proven now rather than at R.4.
 *
 * Dry run by default: reports what is cached and what would be cleared. `--commit`
 * actually clears.
 *
 * The invalidator list is derived by reflection over utils/cacheInvalidation.js rather
 * than hardcoded, so an invalidator added later is picked up without editing this file.
 */
const cmdFlushCaches = async () => {
  const FULL = has("full");

  console.log(`\n=== flush-caches ===`);
  console.log(`redis:  ${process.env.REDIS_URL || "redis://127.0.0.1:6379"}`);
  console.log(`mode:   ${COMMIT ? "COMMIT (will clear)" : "DRY RUN (nothing cleared)"}\n`);

  await initRedis();
  if (!isRedisConnected()) {
    die(
      "Redis is not reachable.\n" +
        "  Nothing was cleared. A rewrite must not proceed while the cache cannot be purged —\n" +
        "  a correct database behind a stale cache still serves the old image keys.",
    );
  }

  const client = getRedisClient();

  const snapshot = async () => {
    const keys = await client.keys("*");
    const byPrefix = {};
    for (const key of keys) {
      const prefix = key.includes(":") ? `${key.slice(0, key.indexOf(":"))}:*` : key;
      byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
    }
    return { total: keys.length, byPrefix };
  };

  const before = await snapshot();
  console.log(`  cached keys: ${before.total}`);
  for (const [prefix, count] of Object.entries(before.byPrefix).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`    ${pad(prefix, 44)}${num(count, 7)}`);
  }

  const invalidators = Object.entries(cacheInvalidation)
    .filter(([name, fn]) => name.startsWith("invalidate") && typeof fn === "function")
    .sort(([a], [b]) => a.localeCompare(b));

  console.log(`\n  invalidators found in cacheInvalidation.js: ${invalidators.length}`);
  for (const [name] of invalidators) console.log(`    ${name}`);

  if (!COMMIT) {
    console.log(`\n  DRY RUN — nothing cleared. Re-run with --commit.\n`);
  } else {
    console.log();
    for (const [name, fn] of invalidators) {
      const ok = await fn();
      console.log(`    ${ok ? "ok  " : "FAIL"} ${name}`);
    }

    if (FULL) {
      // flushDb removes EVERYTHING in the database, not just cache entries. Only for a
      // recovery situation where a targeted invalidation is not trusted.
      console.log(`\n  --full: flushing the entire Redis database...`);
      console.log(`    ${(await clearAllCache()) ? "ok" : "FAILED"}`);
    }

    const after = await snapshot();
    console.log(`\n  cached keys: ${before.total} -> ${after.total}  (cleared ${before.total - after.total})`);
    if (after.total) {
      console.log(`  remaining:`);
      for (const [prefix, count] of Object.entries(after.byPrefix).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
        console.log(`    ${pad(prefix, 44)}${num(count, 7)}`);
      }
      console.log(
        `\n  Remaining keys are not necessarily a failure — anything written between the two\n` +
          `  snapshots, and any non-cache key, will still be here. Re-run to confirm it settles.`,
      );
    }
  }

  // --- prerendered HTML -----------------------------------------------------
  //
  // Redis invalidation does not cover prerendered HTML: a crawler-facing snapshot
  // holds fully-rendered <img> tags with the OLD keys baked in.
  //
  // As of 2026-08-11 nothing in this repo puts prerender in the request path.
  // `prerender-node` (the Express middleware) is in package.json but is imported
  // nowhere, and app.js never references it. prerenderServer.js exists but is a
  // standalone service, is not started by anything here, and hardcodes a Windows
  // Chrome path. If prerendering is in fact enabled at the nginx layer, it is outside
  // this repository and this command cannot see it.
  const purgeUrl = process.env.PRERENDER_PURGE_URL;
  console.log(`\n  prerendered HTML:`);
  if (!purgeUrl) {
    console.log(`    SKIPPED — no PRERENDER_PURGE_URL configured.`);
    console.log(`    Nothing in this repo wires prerender-node into the request path:`);
    console.log(`      - prerender-node is a dependency but is imported nowhere`);
    console.log(`      - app.js never references it`);
    console.log(`      - prerenderServer.js is standalone and started by nothing here`);
    console.log(`    If prerendering IS enabled at the infra layer, set PRERENDER_PURGE_URL`);
    console.log(`    (and optionally PRERENDER_PURGE_TOKEN) and re-run. See progress file 0.7.`);
  } else if (!COMMIT) {
    console.log(`    DRY RUN — would POST ${purgeUrl}`);
  } else {
    try {
      const res = await fetch(purgeUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.PRERENDER_PURGE_TOKEN
            ? { authorization: `Bearer ${process.env.PRERENDER_PURGE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ reason: "s3-key-restructure" }),
      });
      console.log(`    ${res.ok ? "ok  " : "FAIL"} POST ${purgeUrl} -> ${res.status}`);
      if (!res.ok) process.exitCode = 1;
    } catch (error) {
      console.log(`    FAIL POST ${purgeUrl} -> ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log();
  await client.quit().catch(() => {});
};

const cmdScan = async () => {
  if (!URI) die("scan requires --uri=... (no default, so prod cannot be hit by accident).");

  const label = dbNameOf(URI);
  const compareLabel = COMPARE_URI ? dbNameOf(COMPARE_URI) : null;

  console.log(`\n=== s3KeyMigration scan — READ-ONLY, writes nothing ===`);
  console.log(`database:  ${label}`);
  if (compareLabel) console.log(`compare:   ${compareLabel}`);
  console.log(`bucket:    ${SKIP_S3 ? "(skipped, --no-s3)" : BUCKET}`);
  console.log(`started:   ${new Date().toISOString()}\n`);

  const primary = await connect(URI, label);
  console.log(`  scanning ${label}...`);
  const scan = await scanDatabase(primary, label, BUCKET);

  let compareScan = null;
  let compare = null;
  let secondary = null;
  if (COMPARE_URI) {
    secondary = await connect(COMPARE_URI, compareLabel);
    console.log(`  scanning ${compareLabel}...`);
    compareScan = await scanDatabase(secondary, compareLabel, BUCKET);
    console.log(`  comparing _ids...`);
    compare = await compareIds(primary, secondary, label, compareLabel);
  }

  const bucketKeys = SKIP_S3 ? null : await listBucket(BUCKET);

  // --- present / missing / orphan ---
  const referenced = new Set(scan.keyOwners.keys());
  const referencedEither = new Set(referenced);
  if (compareScan) for (const k of compareScan.keyOwners.keys()) referencedEither.add(k);

  let present = 0;
  const missing = [];
  if (bucketKeys) {
    for (const key of referenced) {
      if (bucketKeys.has(key)) present += 1;
      else missing.push({ key, owners: scan.keyOwners.get(key) });
    }
  }

  const crossDbSplits = [];
  const fanOut = [];

  const orphans = [];
  let orphanBytes = 0;
  if (bucketKeys) {
    for (const [key, meta] of bucketKeys) {
      if (!referencedEither.has(key)) {
        orphans.push(key);
        orphanBytes += meta?.size || 0;
      }
    }
  }

  // --- report ---
  console.log(`\n\n──────── ${label} — referenced keys by field ────────`);
  printFieldTable(scan.perField);

  const totalRefs = scan.perField.reduce((a, r) => a + r.refs, 0);
  console.log(`\n  valueShape histogram (${label}):`);
  for (const [shape, count] of Object.entries(scan.shapeTotals).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pad(shape, 16)}${num(count, 8)}  ${((count / totalRefs) * 100).toFixed(1)}%`);
  }
  console.log(`    ${pad("TOTAL refs", 16)}${num(totalRefs, 8)}`);
  console.log(`    ${pad("distinct keys", 16)}${num(referenced.size, 8)}`);

  if (compareScan) {
    const compareRefs = compareScan.perField.reduce((a, r) => a + r.refs, 0);
    console.log(`\n──────── ${compareLabel} — summary ────────`);
    console.log(`    ${pad("TOTAL refs", 16)}${num(compareRefs, 8)}`);
    console.log(`    ${pad("distinct keys", 16)}${num(compareScan.keyOwners.size, 8)}`);
    for (const [shape, count] of Object.entries(compareScan.shapeTotals).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${pad(shape, 16)}${num(count, 8)}`);
    }

    let sharedKeys = 0;
    for (const k of referenced) if (compareScan.keyOwners.has(k)) sharedKeys += 1;
    console.log(`\n    keys referenced by BOTH databases: ${sharedKeys}`);
    console.log(`    only ${label}: ${referenced.size - sharedKeys}`);
    console.log(`    only ${compareLabel}: ${compareScan.keyOwners.size - sharedKeys}`);

    // Pre-compute what conflicts.jsonl will contain, so the "expect near-empty"
    // assumption is a measured number at 0.1 rather than a surprise at plan time.
    const ownerSet = (owners) => new Set(owners.map((o) => `${o.collection}:${o.docId}`));
    for (const key of referenced) {
      const other = compareScan.keyOwners.get(key);
      if (!other) continue;
      const a = ownerSet(scan.keyOwners.get(key));
      const b = ownerSet(other);
      if (a.size === b.size && [...a].every((x) => b.has(x))) continue;

      // A strict superset is one database simply holding an extra reference to the
      // same object — the (entity, entityId, purpose) mapping still agrees, so it is
      // NOT a conflict. Only a genuine disagreement forces two newKeys and two copies.
      const superset = [...b].every((x) => a.has(x)) || [...a].every((x) => b.has(x));
      crossDbSplits.push({
        key,
        kind: superset ? "superset" : "disagreement",
        [label]: [...a].sort(),
        [compareLabel]: [...b].sort(),
      });
    }
    const genuine = crossDbSplits.filter((c) => c.kind === "disagreement");
    console.log(`\n    keys whose owner set differs across the two DBs: ${crossDbSplits.length}`);
    console.log(`      one side a strict superset (same entity, NOT a conflict): ${crossDbSplits.length - genuine.length}`);
    console.log(`      genuine disagreement:                                     ${genuine.length}   <-- future conflicts.jsonl`);
    for (const c of genuine.slice(0, 10)) {
      console.log(`      ${c.key}`);
      console.log(`        ${label}: ${c[label].join(", ")}`);
      console.log(`        ${compareLabel}: ${c[compareLabel].join(", ")}`);
    }
  }

  // Intra-DB fan-out: one key referenced by more than one document in the same
  // database. Each gets its own newKey per owning document, so this is the count
  // of extra byte-copies the plan must budget for.
  for (const [key, owners] of scan.keyOwners) {
    const docs = new Set(owners.map((o) => `${o.collection}:${o.docId}`));
    if (docs.size > 1) fanOut.push({ key, docs: [...docs] });
  }
  console.log(`\n    intra-DB fan-out in ${label} (one key, several documents): ${fanOut.length}`);
  for (const f of fanOut.slice(0, 10)) {
    console.log(`      ${pad(f.key, 62)} ${f.docs.length} docs`);
  }

  // Pre-existing bug fixed in passing: this block used to be nested inside the
  // fanOut loop above, so it printed once per fan-out row (up to 10x) when a
  // compare-uri was given, and crashed with "compare is not iterable" when it
  // wasn't (compare is null) and any fan-out existed at all — hit for real while
  // testing the s3MigrationScan.js extraction. `compare` is only ever set when
  // COMPARE_URI is provided, so this must run at most once and only then.
  if (compare) {
    console.log(`\n──────── clone check — _id overlap per collection ────────`);
    console.log(
      `\n  ${pad("collection", 26)}${num(label, 12)}${num(compareLabel, 12)}${num("shared", 10)}${num("overlap%", 10)}`,
    );
    console.log(`  ${"-".repeat(70)}`);
    for (const row of compare) {
      console.log(
        `  ${pad(row.collection, 26)}${num(row[label], 12)}${num(row[compareLabel], 12)}${num(row.shared, 10)}${num(`${row.overlapPct}%`, 10)}`,
      );
    }
    const totalShared = compare.reduce((a, r) => a + r.shared, 0);
    const totalUnion = compare.reduce((a, r) => a + r[label] + r[compareLabel] - r.shared, 0);
    console.log(
      `  ${pad("ALL", 26)}${num(compare.reduce((a, r) => a + r[label], 0), 12)}${num(compare.reduce((a, r) => a + r[compareLabel], 0), 12)}${num(totalShared, 10)}${num(`${((totalShared / totalUnion) * 100).toFixed(2)}%`, 10)}`,
    );
  }

  if (bucketKeys) {
    console.log(`\n──────── bucket reconciliation ────────`);
    console.log(`    objects in bucket:            ${num(bucketKeys.size, 8)}`);
    console.log(`    referenced by ${pad(label, 16)}${num(referenced.size, 8)}`);
    if (compareScan) console.log(`    referenced by either DB:      ${num(referencedEither.size, 8)}`);
    console.log(`    referenced AND present:       ${num(present, 8)}`);
    console.log(`    referenced but MISSING:       ${num(missing.length, 8)}   <-- pre-existing breakage baseline`);
    console.log(
      `    present but UNREFERENCED:     ${num(orphans.length, 8)}   ${(orphanBytes / 1048576).toFixed(0)} MB  (${((orphans.length / bucketKeys.size) * 100).toFixed(1)}% of bucket)`,
    );

    if (missing.length) {
      console.log(`\n    missing — first 15:`);
      for (const m of missing.slice(0, 15)) {
        console.log(`      ${m.key}`);
        console.log(`        <- ${m.owners[0].collection} ${m.owners[0].docId} ${m.owners[0].locator}`);
      }
      const byCollection = {};
      for (const m of missing) {
        for (const o of m.owners) byCollection[o.collection] = (byCollection[o.collection] || 0) + 1;
      }
      console.log(`\n    missing by collection:`);
      for (const [c, n] of Object.entries(byCollection).sort((a, b) => b[1] - a[1])) {
        console.log(`      ${pad(c, 28)}${num(n, 6)}`);
      }
    }

    const orphanPrefixes = {};
    for (const key of orphans) {
      const prefix = key.split("/").slice(0, 2).join("/");
      orphanPrefixes[prefix] = (orphanPrefixes[prefix] || 0) + 1;
    }
    console.log(`\n    orphans by prefix (top 20):`);
    for (const [p, n] of Object.entries(orphanPrefixes).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`      ${pad(p, 44)}${num(n, 7)}`);
    }
  }

  if (scan.corruptArrays.length) {
    console.log(`\n  ⚠ ARRAY CORRUPTION — array field stored as a non-array (${scan.corruptArrays.length}):`);
    for (const c of scan.corruptArrays.slice(0, 10)) {
      console.log(`      ${c.collection} ${c.docId} ${c.locator}`);
    }
  }
  if (scan.junkSamples.length) {
    console.log(`\n  ⚠ junk values needing eyes (${scan.shapeTotals.junk || 0} total, first ${scan.junkSamples.length}):`);
    for (const j of scan.junkSamples.slice(0, 15)) {
      console.log(`      ${pad(`${j.collection}.${j.locator}`, 52)} ${j.value}`);
    }
  }
  if (scan.externalSamples.length) {
    console.log(`\n  external URLs — never touched by the migration (first ${scan.externalSamples.length}):`);
    for (const e of scan.externalSamples.slice(0, 10)) {
      console.log(`      ${pad(`${e.collection}.${e.locator}`, 46)} ${e.value.slice(0, 70)}`);
    }
  }

  if (OUT) {
    const report = {
      generatedAt: new Date().toISOString(),
      bucket: SKIP_S3 ? null : BUCKET,
      primary: {
        database: label,
        perField: scan.perField,
        shapeTotals: scan.shapeTotals,
        distinctKeys: referenced.size,
        totalRefs,
        junkSamples: scan.junkSamples,
        externalSamples: scan.externalSamples,
        corruptArrays: scan.corruptArrays,
        intraDbFanOut: fanOut,
      },
      crossDbSplits,
      compare: compareScan
        ? {
            database: compareLabel,
            perField: compareScan.perField,
            shapeTotals: compareScan.shapeTotals,
            distinctKeys: compareScan.keyOwners.size,
            junkSamples: compareScan.junkSamples,
            corruptArrays: compareScan.corruptArrays,
            idOverlap: compare,
          }
        : null,
      bucketReconciliation: bucketKeys
        ? {
            objectsInBucket: bucketKeys.size,
            referencedByPrimary: referenced.size,
            referencedByEither: referencedEither.size,
            referencedAndPresent: present,
            referencedButMissing: missing.length,
            presentButUnreferenced: orphans.length,
            orphanBytes,
            missing: missing.slice(0, 2000),
            orphans: orphans.slice(0, 5000),
          }
        : null,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\n  full report written to ${OUT}`);
  }

  console.log(`\n=== scan complete — nothing was written to any database or to S3 ===\n`);

  await primary.close();
  if (secondary) await secondary.close();
};

// ---------------------------------------------------------------- plan

/**
 * `plan` — step 2.2. Builds a manifest for a NEW run. Writes ONLY to local disk
 * (manifest.jsonl, conflicts.jsonl, orphans.jsonl, missing.jsonl, external.jsonl,
 * meta.json, state.json) — no S3 write, no database write, matching the plan's own
 * "Neither writes to S3 or to any database. If either fails, the run simply doesn't
 * start."
 *
 * Always mints a FRESH runId (Do-Not-Do rule 4: "Do not re-run plan on an existing
 * runId. ULIDs are generated once and persisted; re-planning invalidates every logged
 * copy."). `--run=` is not accepted here — it is how every OTHER subcommand targets a
 * run `plan` already produced.
 *
 * Resolution rule (the plan's "Key referenced by BOTH databases" table), implemented
 * generically rather than case-by-case: every owner of an oldKey is reduced to its
 * (entity, entityId, purpose, seq) identity, owners are grouped by that identity, and
 * each DISTINCT group mints its own newKey and gets its own manifest row. One group
 * total = shared identity (the overwhelming majority, since dev is a clone of prod).
 * More than one group = a cross-DB split or an intra-DB fan-out — mechanically
 * identical to build, but also logged to conflicts.jsonl for human review before
 * `copy`, per the plan ("a large count is a stop signal").
 */
const cmdPlan = async () => {
  if (!URI) die("plan requires --uri=... (primary, e.g. dev — no default).");
  if (!COMPARE_URI) die("plan requires --compare-uri=... (the other database) — the manifest must account for both databases' owners, not just one.");
  if (SCOPE_FLAG !== "all" && !SCOPES[SCOPE_FLAG]) {
    die(`plan: unknown --scope=${SCOPE_FLAG}. Valid: all, ${Object.keys(SCOPES).join(", ")}`);
  }

  const label = dbNameOf(URI);
  const compareLabel = dbNameOf(COMPARE_URI);
  const runId = newRunId();
  ensureRunDir(runId);

  console.log(`\n=== s3KeyMigration plan — writes ONLY to local disk, nothing to S3 or any database ===`);
  console.log(`runId:     ${runId}`);
  console.log(`primary:   ${label}`);
  console.log(`compare:   ${compareLabel}`);
  console.log(`scope:     ${SCOPE_FLAG}`);
  console.log(`bucket:    ${BUCKET}`);
  console.log(`started:   ${new Date().toISOString()}\n`);

  const primary = await connect(URI, label);
  console.log(`  scanning ${label}...`);
  const scanA = await scanDatabase(primary, label, BUCKET);
  const secondary = await connect(COMPARE_URI, compareLabel);
  console.log(`  scanning ${compareLabel}...`);
  const scanB = await scanDatabase(secondary, compareLabel, BUCKET);
  const bucketKeys = await listBucket(BUCKET);
  await primary.close();
  await secondary.close();

  const scopeObj = SCOPE_FLAG === "all" ? null : SCOPES[SCOPE_FLAG];
  const inScope = (owners) => !scopeObj || owners.some((o) => o.scopeKey === SCOPE_FLAG);

  const allOldKeys = new Set([...scanA.keyOwners.keys(), ...scanB.keyOwners.keys()]);
  const referencedEither = allOldKeys;

  const manifestFile = runFile(runId, "manifest.jsonl");
  const conflictsFile = runFile(runId, "conflicts.jsonl");
  const orphansFile = runFile(runId, "orphans.jsonl");
  const missingFile = runFile(runId, "missing.jsonl");
  const externalFile = runFile(runId, "external.jsonl");

  const counts = { rows: 0, missing: 0, orphans: 0, external: 0, conflicts: 0 };
  const mapKindCounts = {};
  let totalBytes = 0;

  // Buffered, NOT written to manifestFile yet — a deterministic newKey is minted from
  // (entity, entityId, purpose, seq) alone, so two DIFFERENT oldKeys (typically the
  // same entity's dev vs prod image) can independently mint the SAME newKey. That only
  // becomes visible once every oldKey has been processed, so newKey-collision detection
  // is a second pass below. See the 2026-08-13 category rehearsal note in
  // S3_RESTRUCTURE_PROGRESS.md — this is exactly the bug that fired there (two size
  // mismatches, silently overwritten, never flagged as a conflict).
  const pendingRows = [];

  for (const oldKey of allOldKeys) {
    const ownersA = (scanA.keyOwners.get(oldKey) || []).map((o) => ({ ...o, db: label }));
    const ownersB = (scanB.keyOwners.get(oldKey) || []).map((o) => ({ ...o, db: compareLabel }));
    const allOwners = [...ownersA, ...ownersB];
    if (!inScope(allOwners)) continue;

    const bucketMeta = bucketKeys.get(oldKey);
    if (!bucketMeta) {
      appendJsonl(missingFile, { oldKey, owners: allOwners });
      counts.missing += 1;
      continue;
    }

    // Group by (entity, entityId, purpose, seq) — see function docstring.
    const groups = new Map();
    for (const owner of allOwners) {
      if (owner.entityId === null || owner.entityId === undefined) {
        appendJsonl(conflictsFile, { oldKey, kind: "missing-entity-id", owner });
        counts.conflicts += 1;
        continue;
      }
      const groupKey = `${owner.entity}/${owner.entityId}/${owner.purpose}${owner.seq ? `/${owner.seq}` : ""}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { entity: owner.entity, entityId: owner.entityId, purpose: owner.purpose, seq: owner.seq, owners: [] });
      }
      groups.get(groupKey).owners.push(owner);
    }
    if (groups.size === 0) continue;

    const dbsInvolved = new Set(allOwners.map((o) => o.db));
    const mapKind = groups.size === 1 ? "shared" : dbsInvolved.size > 1 ? "split" : "fanout";
    mapKindCounts[mapKind] = (mapKindCounts[mapKind] || 0) + groups.size;

    if (groups.size > 1) {
      appendJsonl(conflictsFile, {
        oldKey,
        kind: mapKind,
        groups: [...groups.entries()].map(([groupKey, g]) => ({ groupKey, owners: g.owners })),
      });
      counts.conflicts += 1;
    }

    for (const group of groups.values()) {
      let token;
      try {
        token = s3Path({ entity: group.entity, entityId: group.entityId, purpose: group.purpose, seq: group.seq || undefined });
      } catch (error) {
        appendJsonl(conflictsFile, { oldKey, kind: "key-mint-failed", group, error: error.message });
        counts.conflicts += 1;
        continue;
      }
      pendingRows.push({
        oldKey,
        newKey: token.key,
        size: bucketMeta.size,
        etag: bucketMeta.etag,
        mapKind,
        owners: group.owners,
      });
    }
  }

  // --- second pass: detect duplicate deterministic newKeys minted from different
  // oldKeys. Same newKey + identical bytes (size+etag) is safe to merge — it is the
  // same image stored twice (e.g. dev/prod clones in sync). Same newKey + DIFFERENT
  // bytes means the two databases disagree about what this entity's image actually
  // is; copying either one over the other is a silent, unreviewable data loss, so it
  // is routed to conflicts.jsonl instead and excluded from the manifest. Logic lives
  // in utils/s3ManifestDedup.js so it can be unit-tested without a live DB/S3 — see
  // scripts/verifyS3ManifestDedup.js.
  const dedup = resolveDuplicateNewKeys(pendingRows, { ulid });
  const { mergedNewKeyGroups, duplicateNewKeyGroups } = dedup;
  for (const row of dedup.manifestRows) {
    appendJsonl(manifestFile, row);
    counts.rows += 1;
    totalBytes += row.size || 0;
  }
  for (const entry of dedup.conflictEntries) {
    appendJsonl(conflictsFile, entry);
    counts.conflicts += 1;
  }

  // Orphans: bucket objects with zero owners in EITHER db. Scope-filtered by
  // folderPrefix when a scope was given, since an orphan has no owner to derive a
  // scopeKey from.
  for (const [key, meta] of bucketKeys) {
    if (referencedEither.has(key)) continue;
    if (scopeObj && !key.startsWith(`${scopeObj.folderPrefix}/`)) continue;
    appendJsonl(orphansFile, { key, size: meta.size, etag: meta.etag });
    counts.orphans += 1;
  }

  // External: URL fields pointing outside our bucket — never touched, recorded for
  // the "review the count before copying" check.
  for (const [db, s] of [[label, scanA], [compareLabel, scanB]]) {
    for (const e of s.externalSamples) {
      if (scopeObj) {
        const scope = Object.values(SCOPES).find((sc) => sc.collection === e.collection);
        if (!scope || scope.scopeKey !== SCOPE_FLAG) continue;
      }
      appendJsonl(externalFile, { db, ...e });
      counts.external += 1;
    }
  }

  const meta = writeMeta(runId, { primaryDb: label, compareDb: compareLabel, scope: SCOPE_FLAG, bucket: BUCKET });
  writeState(runId, {
    phase: "plan",
    scope: SCOPE_FLAG,
    cursor: null,
    counts: { total: counts.rows, done: 0, skipped: 0, failed: 0 },
  });

  console.log(`  manifest rows (newKeys to create):  ${counts.rows}`);
  for (const [kind, n] of Object.entries(mapKindCounts)) console.log(`    ${pad(kind, 10)}${num(n, 8)}`);
  if (mergedNewKeyGroups) console.log(`    merged (dup newKey, same bytes)  ${num(mergedNewKeyGroups, 4)}`);
  console.log(`  total bytes to copy:                ${(totalBytes / 1048576).toFixed(1)} MB`);
  console.log(`  missing (pre-existing, not copied):  ${counts.missing}`);
  console.log(`  orphans (untouched):                 ${counts.orphans}`);
  console.log(`  external (untouched):                ${counts.external}`);
  console.log(`  conflicts.jsonl entries:              ${counts.conflicts}   ${counts.conflicts ? "<-- REVIEW before copy" : "(expect near-empty)"}`);
  if (duplicateNewKeyGroups) {
    console.log(`    of which duplicate-newkey-diff-bytes: ${duplicateNewKeyGroups}   <-- same entity, different bytes in each DB — excluded from manifest, copy would refuse anyway`);
  }
  console.log(`\n  run directory: ${runFile(runId, "")}`);
  console.log(`  meta.json checksums cover: ${Object.keys(meta.checksums).join(", ") || "(no plan-output files were written — nothing in scope?)"}`);
  console.log(`\n=== plan complete for run ${runId} — nothing was written to S3 or to any database ===\n`);
};

// ---------------------------------------------------------------- copy

/**
 * `copy` — step 2.2. Server-side CopyObject from every manifest row's oldKey to its
 * newKey, within the same bucket (no bytes transit this machine — per the plan's
 * parallelism notes). Dry-run by default; `--commit` writes to S3. Never touches any
 * database and never deletes anything — old keys stay exactly where they are.
 *
 * Resumable: skips any rowId already confirmed in copied.jsonl. Idempotent even
 * without that skip — CopyObject onto the same newKey from the same oldKey produces
 * identical bytes, so a duplicated in-flight row from an unclean exit is harmless.
 * Logs to copied.jsonl AFTER each confirmed copy, never before, so a hard kill loses
 * at most the in-flight batch.
 */
const cmdCopy = async ({ runId = RUN_ID, commit = COMMIT, concurrency = CONCURRENCY, stateUri = STATE_URI } = {}) => {
  const meta = requireRun(runId);
  if (commit) {
    const { rows: conflictRows } = readJsonl(runFile(runId, "conflicts.jsonl"));
    // Kind-aware: `duplicate-newkey-diff-bytes`/`missing-entity-id`/`key-mint-failed`
    // (and any unrecognised kind) refuse unconditionally, because their rows are
    // MISSING from the manifest. `split`/`fanout` rows are present in the manifest and
    // only logged for review, so they are acknowledgeable by exact count. Full
    // reasoning + fail-closed rationale in utils/s3ConflictGate.js.
    const gate = evaluateConflictGate({ conflictRows, acknowledgeRaw: ACKNOWLEDGE_CONFLICTS, runId });
    if (!gate.allowed) die(gate.reason);
    if (gate.reviewable) {
      console.log(`\n  ${gate.reviewable} reviewable conflict entries acknowledged (--acknowledge-conflicts=${gate.reviewable}); 0 blocking.`);
    }
  }
  const { rows } = readJsonl(runFile(runId, "manifest.jsonl"));
  const copiedFile = runFile(runId, "copied.jsonl");
  const { tornLastLine } = readJsonl(copiedFile);
  if (tornLastLine) {
    die(`${copiedFile} has a torn final line (an unclean exit mid-write). Run \`doctor --run=${runId}\` first — it truncates this safely. copy refuses to guess.`);
  }
  const done = loadDoneRowIds(copiedFile);
  const pending = rows.filter((r) => !done.has(r.rowId));
  const pendingBytes = pending.reduce((a, r) => a + (r.size || 0), 0);

  console.log(`\n=== s3KeyMigration copy — run ${runId} ===`);
  console.log(`mode:        ${commit ? "COMMIT (writes to S3)" : "DRY RUN (nothing written)"}`);
  console.log(`concurrency: ${concurrency}`);
  console.log(`manifest rows:     ${rows.length}`);
  console.log(`already copied:    ${done.size}`);
  console.log(`pending:           ${pending.length}  (${(pendingBytes / 1048576).toFixed(1)} MB)\n`);

  if (!pending.length) {
    console.log(commit ? "Nothing pending — copy is already complete for this run.\n" : "Nothing pending.\n");
    return;
  }
  if (!commit) {
    console.log("DRY RUN — re-run with --commit to actually copy. First 10 pending:");
    for (const r of pending.slice(0, 10)) console.log(`  ${r.oldKey}  ->  ${r.newKey}`);
    console.log();
    return;
  }

  // --- job-doc tracking for the monitoring card, if a --state-uri was given ---
  let tracker = null;
  let jobConnection = null;
  let jobId = null;
  let heartbeatTimer = null;
  if (stateUri) {
    jobConnection = await connect(stateUri, "state-db");
    tracker = createJobTracker(jobConnection);
    const job = await tracker.claimJob({
      runId,
      phase: "copy",
      scopeKey: meta.params?.scope || "all",
      total: rows.length,
    });
    jobId = job._id;
    heartbeatTimer = tracker.startHeartbeat(jobId);
  } else {
    console.log("(no --state-uri given — this run will not be visible on the monitoring card)\n");
  }

  const s3 = s3Client();
  let failed = 0;
  let lastProgressLine = "";
  let stopReason = null;
  let stopCache = false;
  let stopCheckCounter = 0;

  const shouldStop = tracker
    ? async () => {
        stopCheckCounter += 1;
        if (stopCheckCounter % 5 !== 1) return stopCache;
        stopCache = await tracker.isStopRequested(jobId);
        return stopCache;
      }
    : undefined;

  try {
    await runPool(
      pending,
      concurrency,
      async (row) => {
        await withRetry(() =>
          s3
            .copyObject({
              Bucket: BUCKET,
              CopySource: copySourceFor(BUCKET, row.oldKey),
              Key: row.newKey,
              MetadataDirective: "COPY",
            })
            .promise(),
        );
        appendJsonl(copiedFile, { rowId: row.rowId, oldKey: row.oldKey, newKey: row.newKey, size: row.size, copiedAt: new Date().toISOString() });
      },
      (completed, total, result) => {
        if (!result.ok) {
          failed += 1;
          console.log(`\n  FAIL  ${result.item.oldKey} -> ${result.item.newKey}\n        ${result.error.message}`);
        }
        const line = `  ${completed}/${total}  failed=${failed}`;
        if (line !== lastProgressLine) {
          process.stdout.write(`\r${line}${" ".repeat(Math.max(0, lastProgressLine.length - line.length))}`);
          lastProgressLine = line;
        }
        if (tracker && completed % 5 === 0) {
          tracker.updateProgress(jobId, { counts: { total: pending.length, done: completed, skipped: 0, failed } }).catch(() => {});
        }
      },
      shouldStop,
    );
  } catch (error) {
    if (tracker) await tracker.failJob(jobId, error).catch(() => {});
    throw error;
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
  process.stdout.write("\n");

  if (tracker && stopCache) {
    stopReason = "paused/cancelled from the monitoring card mid-run";
    console.log(`\nStopped early — ${stopReason}. Already-copied rows are safe; re-run \`copy --run=${runId} --commit\` to continue.\n`);
  }

  const doneNow = loadDoneRowIds(copiedFile);
  writeState(runId, {
    phase: "copy",
    cursor: null,
    counts: { total: rows.length, done: doneNow.size, skipped: 0, failed },
  });

  if (tracker) {
    // Whether stopped or finished, the job doc must stop being "ours" — finishJob for
    // a clean completion, releaseSlot (status already set by the admin action) for a
    // voluntary stop. Never leave activeSlot held past this point.
    if (stopCache) await tracker.releaseSlot(jobId).catch(() => {});
    else await tracker.finishJob(jobId, { failed, counts: { total: rows.length, done: doneNow.size, skipped: 0, failed } }).catch(() => {});
  }
  if (jobConnection) await jobConnection.close();

  console.log(`\ncopied this run: ${pending.length - failed}   failed: ${failed}   total done: ${doneNow.size}/${rows.length}`);
  if (failed) {
    console.log(`\nFAILED — re-run \`copy --run=${runId} --commit\` to retry just the failures (already-done rows are skipped).\n`);
    process.exitCode = 1;
  } else if (doneNow.size === rows.length && !stopCache) {
    console.log(`\n=== copy complete for run ${runId} — every manifest row has a newKey object. Old keys untouched. ===\n`);
  }
};

// ---------------------------------------------------------------- verify-s3

/**
 * `verify-s3` — step 2.2. Read-only. Confirms, for every manifest row: the newKey
 * exists (HeadObject) with the expected size, AND the oldKey is STILL present (copy
 * never moves). This is the gate `copy` claims to have passed, checked independently
 * rather than trusted.
 */
/** Single-line \r progress for the long read-only passes (`verify-s3`, `verify`).
 * Without it they print nothing between their header and their final summary, which on
 * a 33k-row run is 20+ minutes of silence that is indistinguishable from a hang — this
 * cost a real "is it stuck?" stop during the 2026-08-14 run, with the only way to tell
 * being to check the process's CPU counter from outside. Throttled to ~4 updates/sec so
 * the reporting never becomes the bottleneck it is reporting on. */
const progressReporter = ({ everyMs = 250 } = {}) => {
  const startedAt = Date.now();
  let lastWrite = 0;
  let lastLine = "";
  return (completed, total) => {
    const now = Date.now();
    if (completed !== total && now - lastWrite < everyMs) return;
    lastWrite = now;
    const elapsedSec = (now - startedAt) / 1000;
    const rate = elapsedSec > 0 ? completed / elapsedSec : 0;
    const remainingSec = rate > 0 ? Math.round((total - completed) / rate) : null;
    const eta =
      remainingSec === null
        ? "—"
        : remainingSec >= 60
          ? `${Math.floor(remainingSec / 60)}m${String(remainingSec % 60).padStart(2, "0")}s`
          : `${remainingSec}s`;
    const pct = total ? ((completed / total) * 100).toFixed(1) : "0.0";
    const line = `  ${completed}/${total}  ${pct}%  ${rate.toFixed(0)}/s  elapsed ${Math.round(elapsedSec)}s  eta ${eta}`;
    process.stdout.write(`\r${line}${" ".repeat(Math.max(0, lastLine.length - line.length))}`);
    lastLine = line;
  };
};

const cmdVerifyS3 = async () => {
  requireRun();
  const { rows } = readJsonl(runFile(RUN_ID, "manifest.jsonl"));
  console.log(`\n=== s3KeyMigration verify-s3 — run ${RUN_ID} — READ-ONLY ===`);
  console.log(`manifest rows: ${rows.length}`);
  console.log(`concurrency:   ${CONCURRENCY}`);
  console.log(`HeadObject calls to make: ${rows.length * 2}  (newKey + oldKey per row)\n`);

  if (!rows.length) {
    console.log("Nothing to verify — empty manifest.\n");
    return;
  }

  const s3 = s3Client();
  const head = async (key) => {
    try {
      const result = await withRetry(() => s3.headObject({ Bucket: BUCKET, Key: key }).promise());
      return { exists: true, size: result.ContentLength };
    } catch (error) {
      if (error.code === "NotFound" || error.statusCode === 404) return { exists: false };
      throw error;
    }
  };

  let newMissing = 0;
  let oldMissing = 0;
  let sizeMismatch = 0;
  const problems = [];

  const results = await runPool(rows, CONCURRENCY, async (row) => {
    const [newHead, oldHead] = await Promise.all([head(row.newKey), head(row.oldKey)]);
    if (!newHead.exists) {
      newMissing += 1;
      problems.push(`  NEW MISSING   ${row.newKey}  (rowId ${row.rowId}, copy never landed or was deleted)`);
    } else if (row.size !== undefined && newHead.size !== row.size) {
      sizeMismatch += 1;
      problems.push(`  SIZE MISMATCH ${row.newKey}  expected ${row.size}, got ${newHead.size}`);
    }
    if (!oldHead.exists) {
      oldMissing += 1;
      problems.push(`  OLD MISSING   ${row.oldKey}  (should still exist — copy never moves)`);
    }
  }, progressReporter());
  process.stdout.write("\n\n");

  // runPool captures a throwing worker into results rather than propagating it, so a
  // row whose HeadObject failed outright (throttling that exhausted withRetry,
  // AccessDenied, a dropped connection) never touched ANY of the counters above — and
  // would therefore have been reported as passing. An unchecked row is not a verified
  // row: count it explicitly and fail the gate.
  const errored = results.filter((r) => r && !r.ok);
  for (const r of errored.slice(0, 10)) {
    problems.push(`  CHECK FAILED  ${r.item.newKey}  (neither key could be checked: ${r.error?.message || r.error})`);
  }

  for (const p of problems.slice(0, 50)) console.log(p);
  if (problems.length > 50) console.log(`  ... and ${problems.length - 50} more`);

  if (errored.length) console.log(`\nrows that could not be checked at all: ${errored.length}   <-- NOT counted as passing`);
  console.log(`\nnewKey present:        ${rows.length - newMissing}/${rows.length}`);
  console.log(`newKey size matches:   ${rows.length - newMissing - sizeMismatch}/${rows.length - newMissing}`);
  console.log(`oldKey still present:  ${rows.length - oldMissing}/${rows.length}`);

  if (newMissing || oldMissing || sizeMismatch || errored.length) {
    console.log(`\nFAIL\n`);
    process.exitCode = 1;
  } else {
    console.log(`\nPASS — every newKey exists at the right size, every oldKey is still untouched.\n`);
  }
};

// ---------------------------------------------------------------- rewrite

const mongoLocatorOf = (locator) => locator.replace(/\[(\d+)\]/g, ".$1");
const ownerKeyOf = (rowId, owner) => `${rowId}:${owner.collection}:${owner.docId}:${owner.locator}`;

/**
 * `rewrite` — step 2.2. Points ONE database's document fields at their newKey.
 * Deliberately one `--uri` per invocation — never both — per Do-Not-Do rule 3: "Do not
 * rewrite prod until dev has passed R.5 and soaked through R.6. Two separate
 * invocations, two separate snapshots — never one command against both databases."
 *
 * Only `valueShape: "key"` owners are handled. `valueShape: "url"` owners
 * (fcmCampaign.imageUrl, seoBlog businessDetails[].bannerImage) are the plan's own
 * "Special cases" — fcmCampaign needs a NEW schema field (`imageKey`, added alongside
 * the historical `imageUrl`) and businessDetails[].bannerImage needs its own decision,
 * neither of which is "rewrite the same field in place". Reported as SKIPPED, not
 * silently mishandled — building that now would mean guessing at a schema change this
 * session has not scoped.
 *
 * Idempotent by construction: `updateOne({_id, [path]: oldKey}, {$set:{[path]:newKey}})`
 * re-validates the OLD value is still there before writing. If a concurrent write
 * already changed it (array shifted, doc edited, already rewritten by a prior run),
 * matchedCount is 0 and nothing happens — never a blind overwrite by array index alone.
 * Logs to applied-<db>.jsonl only after a confirmed match+write.
 */
const cmdRewrite = async ({ runId = RUN_ID, uri = URI, commit = COMMIT, stateUri = STATE_URI } = {}) => {
  const meta = requireRun(runId);
  if (!uri) die("rewrite requires --uri=... — exactly ONE database. Never both in one invocation (Do-Not-Do rule 3).");
  const dbLabel = dbNameOf(uri);
  const { rows } = readJsonl(runFile(runId, "manifest.jsonl"));

  const dbsInManifest = new Set(rows.flatMap((r) => r.owners.map((o) => o.db)));
  if (!dbsInManifest.has(dbLabel)) {
    die(`--uri resolves to db "${dbLabel}", but this manifest's owners only ever mention: ${[...dbsInManifest].join(", ")}. Wrong --uri, or wrong --run?`);
  }

  const appliedFile = runFile(runId, `applied-${dbLabel}.jsonl`);
  const { tornLastLine } = readJsonl(appliedFile);
  if (tornLastLine) {
    die(`${appliedFile} has a torn final line (an unclean exit mid-write). Run \`doctor --run=${runId}\` first. rewrite refuses to guess.`);
  }
  const doneOwnerKeys = new Set(readJsonl(appliedFile).rows.map((r) => r.ownerKey));

  const pending = [];
  let skippedUrlShape = 0;
  for (const row of rows) {
    for (const owner of row.owners) {
      if (owner.db !== dbLabel) continue;
      if (owner.valueShape !== "key") {
        skippedUrlShape += 1;
        continue;
      }
      const ownerKey = ownerKeyOf(row.rowId, owner);
      if (doneOwnerKeys.has(ownerKey)) continue;
      pending.push({ row, owner, ownerKey });
    }
  }

  console.log(`\n=== s3KeyMigration rewrite — run ${runId} — target db: ${dbLabel} ===`);
  console.log(`mode:              ${commit ? "COMMIT (writes to the database)" : "DRY RUN (nothing written)"}`);
  console.log(`already applied:   ${doneOwnerKeys.size}`);
  console.log(`pending:           ${pending.length}`);
  console.log(`skipped (url-shape, needs special handling, not migrated by rewrite): ${skippedUrlShape}\n`);

  if (!pending.length) {
    console.log("Nothing pending.\n");
    return;
  }
  if (!commit) {
    console.log("DRY RUN — re-run with --commit to actually write. First 10 pending:");
    for (const p of pending.slice(0, 10)) {
      console.log(`  ${p.owner.collection}.${p.owner.docId}.${p.owner.locator}:  ${p.row.oldKey}  ->  ${p.row.newKey}`);
    }
    console.log();
    return;
  }

  const connection = await connect(uri, dbLabel);

  let tracker = null;
  let jobConnection = null;
  let jobId = null;
  let heartbeatTimer = null;
  if (stateUri) {
    jobConnection = dbNameOf(stateUri) === dbLabel ? connection : await connect(stateUri, "state-db");
    tracker = createJobTracker(jobConnection);
    const job = await tracker.claimJob({
      runId,
      phase: "rewrite",
      targetDb: dbLabel,
      scopeKey: meta.params?.scope || "all",
      total: pending.length,
    });
    jobId = job._id;
    heartbeatTimer = tracker.startHeartbeat(jobId);
  } else {
    console.log("(no --state-uri given — this run will not be visible on the monitoring card)\n");
  }

  let applied = 0;
  let stale = 0;
  let stopped = false;
  const staleExamples = [];
  // Serial by design (ordering + resumability beat speed on a write path), so this is
  // ~50 rows/s over the tunnel — 11 minutes for a 33k run with no output at all before
  // this was added. R.7 does exactly this against PROD; "is it stuck?" is not a
  // question anyone should be asking there.
  const report = progressReporter();

  try {
    let i = 0;
    for (const { row, owner, ownerKey } of pending) {
      i += 1;
      if (tracker && i % 5 === 1 && (await tracker.isStopRequested(jobId))) {
        stopped = true;
        console.log(`\nStopped early at ${i}/${pending.length} — paused/cancelled from the monitoring card. Already-applied owners are safe; re-run \`rewrite --run=${runId} --uri=... --commit\` to continue.`);
        break;
      }

      const mongoLocator = mongoLocatorOf(owner.locator);
      let docId;
      try {
        docId = new mongoose.Types.ObjectId(owner.docId);
      } catch {
        staleExamples.push(`  BAD docId  ${owner.collection} ${owner.docId} ${owner.locator}`);
        stale += 1;
        continue;
      }

      let result;
      try {
        result = await connection.db.collection(owner.collection).updateOne(
          { _id: docId, [mongoLocator]: row.oldKey },
          { $set: { [mongoLocator]: row.newKey } },
        );
      } catch (error) {
        if (/ECONNREFUSED|ETIMEDOUT|ServerSelection|topology was destroyed/i.test(error.message)) {
          writeState(runId, { phase: "rewrite", cursor: ownerKey, counts: { total: rows.length, done: applied, skipped: stale, failed: 0 } });
          if (tracker) await tracker.failJob(jobId, error).catch(() => {});
          die(
            `\nTunnel down mid-rewrite (${error.message}).\n` +
              `Applied ${applied} before this — all logged and safe. Reconnect the SSH tunnel and re-run\n` +
              `the exact same \`rewrite --run=${runId} --uri=...\` command; already-applied owners are skipped.`,
          );
        }
        throw error;
      }

      if (result.matchedCount === 1) {
        appendJsonl(appliedFile, {
          rowId: row.rowId,
          ownerKey,
          collection: owner.collection,
          docId: owner.docId,
          locator: mongoLocator,
          from: row.oldKey,
          to: row.newKey,
          appliedAt: new Date().toISOString(),
        });
        applied += 1;
      } else {
        stale += 1;
        if (staleExamples.length < 15) {
          staleExamples.push(`  STALE  ${owner.collection} ${owner.docId} ${mongoLocator}  (no longer holds ${row.oldKey} — already changed by something else)`);
        }
      }

      if (tracker && i % 5 === 0) {
        await tracker.updateProgress(jobId, { counts: { total: pending.length, done: applied, skipped: stale, failed: 0 }, cursor: ownerKey }).catch(() => {});
      }
      report(i, pending.length);
    }
    process.stdout.write("\n");

    // Must run BEFORE the connections close in `finally` below.
    if (tracker) {
      if (stopped) await tracker.releaseSlot(jobId).catch(() => {});
      else await tracker.finishJob(jobId, { failed: 0, counts: { total: pending.length, done: applied, skipped: stale, failed: 0 } }).catch(() => {});
    }
  } catch (error) {
    if (tracker) await tracker.failJob(jobId, error).catch(() => {});
    throw error;
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await connection.close();
    if (jobConnection && jobConnection !== connection) await jobConnection.close();
  }

  for (const s of staleExamples) console.log(s);
  if (stale > staleExamples.length) console.log(`  ... and ${stale - staleExamples.length} more stale`);

  writeState(runId, { phase: "rewrite", cursor: null, counts: { total: rows.length, done: doneOwnerKeys.size + applied, skipped: stale, failed: 0 } });

  console.log(`\napplied this run: ${applied}   stale (skipped, filter didn't match): ${stale}`);
  console.log(`\n=== rewrite complete for run ${runId} against ${dbLabel} ===\n`);
};

// ---------------------------------------------------------------- verify

/**
 * `verify` — step 2.2. Read-only, run against ONE database after its `rewrite`.
 *
 * Checks, for every applied owner in applied-<db>.jsonl:
 *   1. the document's field now holds the newKey (re-fetched fresh, not trusted from
 *      the log)
 *   2. the newKey HeadObjects in S3
 *   3. a fresh scan of that scope's field confirms no document still holds the OLD key
 *      at that same locator ("no document still holds a listed oldKey")
 *   4. every arrayOfObjects/array field touched is still Array.isArray() (the
 *      setByPath corruption guard, re-checked post-write)
 *
 * Deliberately narrower than the plan's full checklist: "reference count per field
 * unchanged from baseline" is NOT implemented — that needs a persisted plan-time
 * baseline to diff against, which this version doesn't yet write. Noted rather than
 * silently skipped; a reasonable follow-up once `rewrite` is exercised at real scale.
 */
const cmdVerify = async () => {
  requireRun();
  if (!URI) die("verify requires --uri=... — the database to verify.");
  const dbLabel = dbNameOf(URI);
  const appliedFile = runFile(RUN_ID, `applied-${dbLabel}.jsonl`);
  const { rows: applied, tornLastLine } = readJsonl(appliedFile);
  if (tornLastLine) die(`${appliedFile} has a torn final line. Run \`doctor --run=${RUN_ID}\` first.`);

  console.log(`\n=== s3KeyMigration verify — run ${RUN_ID} — db: ${dbLabel} — READ-ONLY ===`);
  console.log(`applied rows to verify: ${applied.length}\n`);

  if (!applied.length) {
    console.log("Nothing applied yet for this database — run `rewrite --commit` first.\n");
    return;
  }

  const connection = await connect(URI, dbLabel);
  const s3 = s3Client();
  const head = async (key) => {
    try {
      await withRetry(() => s3.headObject({ Bucket: BUCKET, Key: key }).promise());
      return true;
    } catch (error) {
      if (error.code === "NotFound" || error.statusCode === 404) return false;
      throw error;
    }
  };

  let fieldMismatch = 0;
  let s3Missing = 0;
  let notCanonical = 0;
  const problems = [];

  const results = await runPool(applied, CONCURRENCY, async (row) => {
    if (!isCanonicalKey(row.to)) {
      notCanonical += 1;
      problems.push(`  NOT CANONICAL  ${row.collection}.${row.docId}.${row.locator} = ${row.to}`);
    }

    // Project only the BASE field (e.g. "ratingPhotos", not "ratingPhotos.41"). Mongo's
    // array-index dot-notation in a projection re-indexes the result to a single-element
    // array starting at 0, so projecting the full locator for an array-index path silently
    // returns the wrong element — found live: verify reported "expected X, got undefined"
    // for ratingPhotos.41..44 while the document, read without that projection, held the
    // correct value at the real index all along.
    const baseField = row.locator.split(".")[0];
    const doc = await connection.db.collection(row.collection).findOne(
      { _id: new mongoose.Types.ObjectId(row.docId) },
      { projection: { [baseField]: 1 } },
    );
    const current = doc ? row.locator.split(".").reduce((v, k) => (v == null ? v : v[k]), doc) : undefined;
    if (current !== row.to) {
      fieldMismatch += 1;
      problems.push(`  FIELD MISMATCH  ${row.collection}.${row.docId}.${row.locator}  expected ${row.to}, got ${JSON.stringify(current)}`);
    }

    if (!(await head(row.to))) {
      s3Missing += 1;
      problems.push(`  S3 MISSING  ${row.to}  (${row.collection}.${row.docId}.${row.locator})`);
    }
  }, progressReporter());
  process.stdout.write("\n");

  // Array-shape corruption guard: re-scan the scopes touched and confirm no field the
  // registry declares as an array kind has been flattened into a `{"0":{…}}` object.
  console.log("\n  re-scanning for array-shape corruption (no progress output — one pass over the touched scopes)...");
  const rescan = await scanDatabase(connection, dbLabel, BUCKET);
  await connection.close();

  // Same unchecked-row hole as verify-s3: runPool captures a throwing worker rather
  // than propagating it, so a row whose DB read or HeadObject failed outright touched
  // none of the counters below and would otherwise be reported as passing.
  const errored = results.filter((r) => r && !r.ok);
  for (const r of errored.slice(0, 10)) {
    problems.push(`  CHECK FAILED  ${r.item.collection}.${r.item.docId}.${r.item.locator}  (${r.error?.message || r.error})`);
  }

  for (const p of problems.slice(0, 50)) console.log(p);
  if (problems.length > 50) console.log(`  ... and ${problems.length - 50} more`);

  if (errored.length) console.log(`\nrows that could not be checked at all: ${errored.length}   <-- NOT counted as passing`);
  console.log(`\nfield holds newKey:     ${applied.length - fieldMismatch}/${applied.length}`);
  console.log(`newKey is canonical:    ${applied.length - notCanonical}/${applied.length}`);
  console.log(`newKey present in S3:   ${applied.length - s3Missing}/${applied.length}`);
  console.log(`array-shape corruption: ${rescan.corruptArrays.length}`);
  if (rescan.corruptArrays.length) {
    for (const c of rescan.corruptArrays.slice(0, 10)) console.log(`  CORRUPT ARRAY  ${c.collection} ${c.docId} ${c.locator}`);
  }

  if (fieldMismatch || s3Missing || notCanonical || rescan.corruptArrays.length || errored.length) {
    console.log(`\nFAIL\n`);
    process.exitCode = 1;
  } else {
    console.log(`\nPASS — every applied field holds a canonical newKey that exists in S3, no array corruption.\n`);
  }
};

// ---------------------------------------------------------------- status

/**
 * `status` — read-only. `state.json` is the source of truth (per the plan's "Where
 * run state lives"); this is a convenience view over it plus the append-only logs'
 * actual line counts, which can be slightly ahead of `state.json`'s last checkpoint
 * write if a batch is still in flight.
 *
 * There is no lease to report yet — the Mongo job doc (`s3KeyMigrationJobModel`) is
 * built but not wired into any command, since nothing reads it yet either (that's the
 * 2.3 monitoring card). Noted explicitly rather than silently omitted.
 */
const cmdStatus = () => {
  if (!RUN_ID) {
    const runs = listRuns();
    console.log(`\nNo --run given. ${runs.length} run(s) on disk under _migrations/s3-key-restructure/:`);
    for (const r of runs) console.log(`  ${r}`);
    console.log(`\nnode scripts/s3KeyMigration.js status --run=<runId>\n`);
    return;
  }

  const meta = readMeta(RUN_ID);
  if (!meta) die(`no meta.json for run "${RUN_ID}".`);
  const state = readState(RUN_ID);
  const checksumProblems = verifyManifestChecksums(RUN_ID);

  console.log(`\n=== status — run ${RUN_ID} ===`);
  console.log(`created:      ${meta.createdAt}`);
  console.log(`git commit:   ${meta.gitCommit}`);
  console.log(`params:       ${JSON.stringify(meta.params)}`);
  console.log(`manifest ok:  ${checksumProblems.length ? "NO — " + checksumProblems.join("; ") : "yes, checksums match"}`);

  if (!state) {
    console.log(`\nNo state.json — plan ran but nothing since.\n`);
    return;
  }
  console.log(`\nphase:        ${state.phase}`);
  console.log(`scope:        ${state.scope}`);
  console.log(`cursor:       ${state.cursor ?? "(none — clean boundary)"}`);
  console.log(`counts:       ${JSON.stringify(state.counts)}`);
  console.log(`started:      ${state.startedAt}`);
  console.log(`last update:  ${state.updatedAt}`);
  console.log(`state version ${state.stateVersion} (current: ${STATE_VERSION})${state.stateVersion !== STATE_VERSION ? "  <-- MISMATCH, resume will refuse" : ""}`);

  const { rows: manifestRows } = readJsonl(runFile(RUN_ID, "manifest.jsonl"));
  const { rows: copiedRows, tornLastLine: copiedTorn } = readJsonl(runFile(RUN_ID, "copied.jsonl"));
  console.log(`\ncopied.jsonl: ${copiedRows.length}/${manifestRows.length}${copiedTorn ? "  ⚠ TORN LAST LINE — run doctor" : ""}`);

  for (const db of new Set(manifestRows.flatMap((r) => r.owners.map((o) => o.db)))) {
    const { rows: appliedRows, tornLastLine: appliedTorn } = readJsonl(runFile(RUN_ID, `applied-${db}.jsonl`));
    console.log(`applied-${db}.jsonl: ${appliedRows.length}${appliedTorn ? "  ⚠ TORN LAST LINE — run doctor" : ""}`);
  }

  console.log(`\n⚠ No lease/worker-liveness tracking yet — the Mongo job doc exists but nothing writes to it until the 2.3 monitoring card lands. Treat this CLI's exit as the only liveness signal for now.\n`);
};

// ---------------------------------------------------------------- doctor

/**
 * `doctor` — the hard-kill repair tool. Re-verifies the manifest checksum, truncates a
 * torn final line from any append-only log (the ONLY writer allowed to touch these
 * files other than an append), and spot-checks the TAIL of each log against live
 * reality (S3 for copied.jsonl, the database for applied-<db>.jsonl) — catching a log
 * entry that claims success but whose effect somehow isn't there. Reports drift;
 * never writes anything except the torn-line truncation itself. Run before every
 * `resume` after an unclean exit.
 */
const cmdDoctor = async () => {
  if (!RUN_ID) die("doctor requires --run=<runId>.");
  const meta = readMeta(RUN_ID);
  if (!meta) die(`no meta.json for run "${RUN_ID}".`);

  console.log(`\n=== doctor — run ${RUN_ID} ===\n`);

  const checksumProblems = verifyManifestChecksums(RUN_ID);
  if (checksumProblems.length) {
    console.log(`MANIFEST CHECKSUM PROBLEMS (nothing below can be trusted until this is resolved):`);
    for (const p of checksumProblems) console.log(`  - ${p}`);
  } else {
    console.log(`manifest checksums: OK`);
  }

  const { rows: manifestRows } = readJsonl(runFile(RUN_ID, "manifest.jsonl"));
  const manifestByRowId = new Map(manifestRows.map((r) => [r.rowId, r]));

  // --- copied.jsonl: torn-line repair + tail check against real S3 ---
  const copiedFile = runFile(RUN_ID, "copied.jsonl");
  if (fs.existsSync(copiedFile)) {
    const truncated = truncateTornLine(copiedFile);
    console.log(`\ncopied.jsonl: ${truncated ? "TORN LINE FOUND AND TRUNCATED" : "no torn line"}`);
    const { rows: copiedRows } = readJsonl(copiedFile);
    const tail = copiedRows.slice(-20);
    if (tail.length) {
      const s3 = s3Client();
      let mismatches = 0;
      for (const row of tail) {
        try {
          await withRetry(() => s3.headObject({ Bucket: BUCKET, Key: row.newKey }).promise());
        } catch (error) {
          if (error.code === "NotFound" || error.statusCode === 404) {
            mismatches += 1;
            console.log(`  DRIFT  ${row.newKey} logged as copied but not found in S3 (rowId ${row.rowId})`);
          } else {
            throw error;
          }
        }
      }
      console.log(`  tail check: ${tail.length - mismatches}/${tail.length} of the last ${tail.length} logged copies confirmed present in S3`);
    }
  } else {
    console.log(`\ncopied.jsonl: does not exist yet (copy hasn't run)`);
  }

  // --- applied-<db>.jsonl: torn-line repair + tail check against live documents ---
  const dbsInManifest = new Set(manifestRows.flatMap((r) => r.owners.map((o) => o.db)));
  for (const db of dbsInManifest) {
    if (URI && dbNameOf(URI) !== db) continue; // --uri given: restrict to that db only
    const appliedFile = runFile(RUN_ID, `applied-${db}.jsonl`);
    if (!fs.existsSync(appliedFile)) {
      console.log(`\napplied-${db}.jsonl: does not exist yet (rewrite hasn't run against ${db})`);
      continue;
    }
    const truncated = truncateTornLine(appliedFile);
    console.log(`\napplied-${db}.jsonl: ${truncated ? "TORN LINE FOUND AND TRUNCATED" : "no torn line"}`);
    const { rows: appliedRows } = readJsonl(appliedFile);
    const tail = appliedRows.slice(-20);
    if (tail.length && URI) {
      const connection = await connect(URI, db);
      let mismatches = 0;
      for (const row of tail) {
        const doc = await connection.db.collection(row.collection).findOne(
          { _id: new mongoose.Types.ObjectId(row.docId) },
          { projection: { [row.locator]: 1 } },
        );
        const current = doc ? row.locator.split(".").reduce((v, k) => (v == null ? v : v[k]), doc) : undefined;
        if (current !== row.to) {
          mismatches += 1;
          console.log(`  DRIFT  ${row.collection}.${row.docId}.${row.locator} logged as -> ${row.to} but currently ${JSON.stringify(current)}`);
        }
      }
      await connection.close();
      console.log(`  tail check: ${tail.length - mismatches}/${tail.length} of the last ${tail.length} logged writes confirmed live`);
    } else if (tail.length) {
      console.log(`  (pass --uri=<${db}'s connection string> to tail-check this log against live documents)`);
    }
  }

  console.log(`\n=== doctor complete for run ${RUN_ID} ===\n`);
};

// ---------------------------------------------------------------- resume

/**
 * `resume` — takes `state.json`'s `phase` as authoritative and re-drives the matching
 * command (`copy` or `rewrite`) with the same resumability logic those commands
 * already have. Not a separate mechanism: `copy`/`rewrite` are already safe to just
 * re-run (they skip whatever their log says is done), so `resume` exists mainly to (a)
 * refuse on a `stateVersion` mismatch rather than guess, and (b) save the operator
 * from having to remember which phase a run stopped in.
 *
 * Dry-run by default (prints what it would redo); `--commit` actually does it.
 */
const cmdResume = async () => {
  if (!RUN_ID) die("resume requires --run=<runId>.");
  const state = readState(RUN_ID);
  if (!state) die(`no state.json for run "${RUN_ID}" — nothing to resume. Was anything past \`plan\` ever run?`);
  if (state.stateVersion !== STATE_VERSION) {
    die(
      `state.json for run ${RUN_ID} has stateVersion ${state.stateVersion}, this CLI is at ${STATE_VERSION}.\n` +
        `Refusing to guess how to resume an incompatible checkpoint — investigate manually.`,
    );
  }

  console.log(`\n=== resume — run ${RUN_ID} — last phase: ${state.phase} ===`);
  console.log(`cursor: ${state.cursor ?? "(none)"}   counts: ${JSON.stringify(state.counts)}\n`);

  if (state.phase === "plan") {
    console.log(`Nothing to resume — plan has no partial state to redo. Run \`copy\` next.\n`);
    return;
  }
  if (state.phase === "copy") {
    await cmdCopy({ runId: RUN_ID, commit: COMMIT, concurrency: CONCURRENCY });
    return;
  }
  if (state.phase === "rewrite") {
    if (!URI) die(`resume of a "rewrite" phase requires --uri=... — which database it was rewriting (state.json does not record the connection string).`);
    await cmdRewrite({ runId: RUN_ID, uri: URI, commit: COMMIT });
    return;
  }
  console.log(`No resume handler for phase "${state.phase}" yet (this CLI has: copy, rewrite).\n`);
};

// ---------------------------------------------------------------- reverse

/**
 * `reverse` — replays `applied-<db>.jsonl` BACKWARDS: for every logged write, restores
 * `from` in place of `to`, filtered on the field CURRENTLY holding `to` — the same
 * idempotent-by-construction pattern as `rewrite` itself, so a doc changed again since
 * the rewrite (by something else, or by a second `reverse` run) is left alone rather
 * than blindly overwritten. Old keys were never touched by `copy`/`rewrite`, so the
 * app is correct again the instant this finishes — no S3 involvement at all.
 *
 * Resumable via `reversed.jsonl`, the same skip-by-key pattern as everything else here.
 */
const cmdReverse = async () => {
  requireRun();
  if (!URI) die("reverse requires --uri=... — the database to reverse.");
  const dbLabel = dbNameOf(URI);
  const appliedFile = runFile(RUN_ID, `applied-${dbLabel}.jsonl`);
  const { rows: applied, tornLastLine: appliedTorn } = readJsonl(appliedFile);
  if (appliedTorn) die(`${appliedFile} has a torn final line. Run \`doctor --run=${RUN_ID}\` first.`);
  if (!applied.length) {
    console.log(`\nNothing applied for ${dbLabel} in run ${RUN_ID} — nothing to reverse.\n`);
    return;
  }

  const reversedFile = runFile(RUN_ID, "reversed.jsonl");
  const { tornLastLine: reversedTorn } = readJsonl(reversedFile);
  if (reversedTorn) die(`${reversedFile} has a torn final line. Run \`doctor --run=${RUN_ID}\` first.`);
  const doneOwnerKeys = loadDoneRowIds(reversedFile, "ownerKey");

  const pending = applied.filter((r) => !doneOwnerKeys.has(r.ownerKey));

  console.log(`\n=== s3KeyMigration reverse — run ${RUN_ID} — target db: ${dbLabel} ===`);
  console.log(`mode:              ${COMMIT ? "COMMIT (writes to the database)" : "DRY RUN (nothing written)"}`);
  console.log(`applied total:     ${applied.length}`);
  console.log(`already reversed:  ${doneOwnerKeys.size}`);
  console.log(`pending:           ${pending.length}\n`);

  if (!pending.length) {
    console.log("Nothing pending.\n");
    return;
  }
  if (!COMMIT) {
    console.log("DRY RUN — re-run with --commit to actually reverse. First 10 pending:");
    for (const r of pending.slice(0, 10)) console.log(`  ${r.collection}.${r.docId}.${r.locator}:  ${r.to}  ->  ${r.from}`);
    console.log();
    return;
  }

  const connection = await connect(URI, dbLabel);
  let reversed = 0;
  let stale = 0;
  // Same serial shape as rewrite — and this is the rollback path, run under pressure
  // when something has already gone wrong. Silence is least acceptable here.
  const report = progressReporter();
  try {
    let i = 0;
    for (const r of pending) {
      i += 1;
      const result = await connection.db.collection(r.collection).updateOne(
        { _id: new mongoose.Types.ObjectId(r.docId), [r.locator]: r.to },
        { $set: { [r.locator]: r.from } },
      );
      if (result.matchedCount === 1) {
        appendJsonl(reversedFile, { ...r, reversedAt: new Date().toISOString() });
        reversed += 1;
      } else {
        stale += 1;
        console.log(`\n  STALE  ${r.collection}.${r.docId}.${r.locator}  no longer holds ${r.to} — already changed since rewrite, left alone`);
      }
      report(i, pending.length);
    }
    process.stdout.write("\n");
  } finally {
    await connection.close();
  }

  console.log(`\nreversed this run: ${reversed}   stale (skipped): ${stale}`);
  console.log(`\n=== reverse complete for run ${RUN_ID} against ${dbLabel} — old keys were never touched, so the app was already correct throughout ===\n`);
};

// ---------------------------------------------------------------- rollback-copies

/**
 * `rollback-copies` — deletes ONLY the newKey objects logged in `copied.jsonl`. No
 * database involvement (nothing was rewritten yet, or this runs before `rewrite`).
 * Bucket versioning is Enabled, so even this is reversible via `undelete` (not built).
 */
const cmdRollbackCopies = async () => {
  requireRun();
  const copiedFile = runFile(RUN_ID, "copied.jsonl");
  const { rows: copied, tornLastLine } = readJsonl(copiedFile);
  if (tornLastLine) die(`${copiedFile} has a torn final line. Run \`doctor --run=${RUN_ID}\` first.`);

  console.log(`\n=== s3KeyMigration rollback-copies — run ${RUN_ID} ===`);
  console.log(`mode:  ${COMMIT ? "COMMIT (deletes from S3)" : "DRY RUN (nothing deleted)"}`);
  console.log(`objects logged in copied.jsonl: ${copied.length}\n`);

  if (!copied.length) {
    console.log("Nothing to roll back.\n");
    return;
  }
  if (!COMMIT) {
    console.log("DRY RUN — re-run with --commit to actually delete. First 10:");
    for (const r of copied.slice(0, 10)) console.log(`  ${r.newKey}`);
    console.log();
    return;
  }

  const s3 = s3Client();
  let deleted = 0;
  for (const row of copied) {
    await withRetry(() => s3.deleteObject({ Bucket: BUCKET, Key: row.newKey }).promise());
    deleted += 1;
  }
  console.log(`deleted: ${deleted}/${copied.length}`);
  console.log(`\n=== rollback-copies complete for run ${RUN_ID} — old keys were never touched ===\n`);
};

// ---------------------------------------------------------------- main

const main = async () => {
  switch (SUBCOMMAND) {
    case "collections":
      cmdCollections();
      break;
    case "scan":
      await cmdScan();
      break;
    case "flush-caches":
      await cmdFlushCaches();
      break;
    case "plan":
      await cmdPlan();
      break;
    case "copy":
      await cmdCopy();
      break;
    case "verify-s3":
      await cmdVerifyS3();
      break;
    case "rewrite":
      await cmdRewrite();
      break;
    case "verify":
      await cmdVerify();
      break;
    case "status":
      cmdStatus();
      break;
    case "doctor":
      await cmdDoctor();
      break;
    case "resume":
      await cmdResume();
      break;
    case "reverse":
      await cmdReverse();
      break;
    case "rollback-copies":
      await cmdRollbackCopies();
      break;
    default:
      die(
        `Unknown subcommand "${SUBCOMMAND || "(none)"}".\n` +
          `Available: scan, plan, copy, verify-s3, rewrite, verify, status, doctor, resume, reverse,\n` +
          `           rollback-copies, collections, flush-caches\n\n` +
          `  node scripts/s3KeyMigration.js scan --uri=... [--compare-uri=...] [--out=...] [--no-s3]\n` +
          `  node scripts/s3KeyMigration.js plan --uri=... --compare-uri=... [--scope=<scopeKey>]\n` +
          `  node scripts/s3KeyMigration.js copy --run=<runId> [--commit] [--concurrency=8] [--acknowledge-conflicts=<n>]\n` +
          `  node scripts/s3KeyMigration.js verify-s3 --run=<runId>\n` +
          `  node scripts/s3KeyMigration.js rewrite --run=<runId> --uri=... [--commit]\n` +
          `  node scripts/s3KeyMigration.js verify --run=<runId> --uri=...\n` +
          `  node scripts/s3KeyMigration.js status [--run=<runId>]\n` +
          `  node scripts/s3KeyMigration.js doctor --run=<runId> [--uri=...]\n` +
          `  node scripts/s3KeyMigration.js resume --run=<runId> [--uri=...] [--commit]\n` +
          `  node scripts/s3KeyMigration.js reverse --run=<runId> --uri=... [--commit]\n` +
          `  node scripts/s3KeyMigration.js rollback-copies --run=<runId> [--commit]`,
      );
  }
  process.exit(0);
};

await main();
