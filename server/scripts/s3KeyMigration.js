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

import { SCOPES, registryCollections } from "../utils/s3ScopeRegistry.js";
import { connect, scanDatabase, compareIds, listBucket } from "../utils/s3MigrationScan.js";
import { s3Path } from "../utils/s3ObjectKeys.js";
import { ulid } from "../utils/idGen.js";
import {
  newRunId,
  ensureRunDir,
  runFile,
  writeMeta,
  writeState,
  appendJsonl,
} from "../utils/s3MigrationManifest.js";
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

const URI = flag("uri");
const COMPARE_URI = flag("compare-uri");
const OUT = flag("out");
const SKIP_S3 = has("no-s3");
/** Nothing in this CLI writes anything without this. `scan` ignores it entirely. */
const COMMIT = has("commit");
const RUN_ID = flag("run");
const SCOPE_FLAG = flag("scope") || "all";

const BUCKET = process.env.AWS_S3_BUCKET_MASSCLICK;

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
      appendJsonl(manifestFile, {
        rowId: ulid(),
        oldKey,
        newKey: token.key,
        size: bucketMeta.size,
        etag: bucketMeta.etag,
        mapKind,
        owners: group.owners,
      });
      counts.rows += 1;
      totalBytes += bucketMeta.size || 0;
    }
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
  console.log(`  total bytes to copy:                ${(totalBytes / 1048576).toFixed(1)} MB`);
  console.log(`  missing (pre-existing, not copied):  ${counts.missing}`);
  console.log(`  orphans (untouched):                 ${counts.orphans}`);
  console.log(`  external (untouched):                ${counts.external}`);
  console.log(`  conflicts.jsonl entries:              ${counts.conflicts}   ${counts.conflicts ? "<-- REVIEW before copy" : "(expect near-empty)"}`);
  console.log(`\n  run directory: ${runFile(runId, "")}`);
  console.log(`  meta.json checksums cover: ${Object.keys(meta.checksums).join(", ") || "(no plan-output files were written — nothing in scope?)"}`);
  console.log(`\n=== plan complete for run ${runId} — nothing was written to S3 or to any database ===\n`);
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
    default:
      die(
        `Unknown subcommand "${SUBCOMMAND || "(none)"}".\n` +
          `Available so far: scan, plan, collections, flush-caches\n\n` +
          `  node scripts/s3KeyMigration.js scan --uri=... [--compare-uri=...] [--out=...] [--no-s3]\n` +
          `  node scripts/s3KeyMigration.js plan --uri=... --compare-uri=... [--scope=<scopeKey>]`,
      );
  }
  process.exit(0);
};

await main();
