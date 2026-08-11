/**
 * S3 key restructure — migration CLI.
 *
 * See S3_KEY_RESTRUCTURE_PROGRESS.md at the repo root for where this sits in the
 * plan, and the "Do NOT do" ordering rules before changing anything here.
 *
 * Subcommands (only `scan` and `collections` exist so far — step 0.1):
 *
 *   scan          READ-ONLY baseline. Touches nothing. Reports, per database:
 *                 every referenced S3 key by scope/collection/field, which of
 *                 those are present vs MISSING in the bucket, which bucket
 *                 objects are unreferenced, a valueShape histogram, and — with
 *                 --compare-uri — whether the two databases are clones.
 *   collections   Print the collection list the registry covers, for --collections
 *                 on db-backups/backup.js so the two can never drift.
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
import mongoose from "mongoose";
import AWS from "aws-sdk";

import { SCOPES, registryCollections, validateRegistry } from "../utils/s3ScopeRegistry.js";

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

const BUCKET = process.env.AWS_S3_BUCKET_MASSCLICK;

const dbNameOf = (uri) => (uri.split("/").pop() || "").split("?")[0] || "(unknown)";

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

// ------------------------------------------------- key/value classification

// Derived from helper/mediaCleanup/s3WebpMigrationHelper.js:226, with a fix that
// version does not have. 0.1 stays read-only and touches no shipped file; step 0.3
// extracts one shared copy into utils/s3KeyUtils.js and repoints this import along
// with the three helpers that carry the broken one.
//
// THE FIX: the shipped version strips the base URL exactly once. Real data has the
// base URL prepended up to FOUR times —
//   https://<bucket>.s3.../https://<bucket>.s3.../https://<bucket>.s3.../businessList/banners/x.jpg
// (54 such values in seopagecontentblogs.businessDetails[].bannerImage). One pass
// leaves a still-doubled string, which then resolves to nothing. Strip until stable.
const extractS3Key = (value) => {
  if (!value || typeof value !== "string") return "";
  let current = value.trim();
  if (!current) return "";
  for (let i = 0; i < 8 && /^https?:\/\//i.test(current); i += 1) {
    let next;
    try {
      next = new URL(current).pathname.replace(/^\/+/, "");
    } catch {
      return current;
    }
    if (!next || next === current) return current;
    current = next;
  }
  return current.split("?")[0];
};

const OBJECT_EXT =
  /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?|pdf|mp4|mov|webm|mkv|docx?|xlsx?|pptx?|csv|zip|txt|heic|html?)$/i;

/**
 * What is actually stored in this field on this document?
 *   key            a bare object key — the overwhelming majority
 *   url-ours       an absolute URL that resolves into our bucket (fcmCampaign.imageUrl,
 *                  seoBlog businessDetails[].bannerImage)
 *   url-external   an absolute URL somewhere else — never touched by the migration
 *   empty          "" / null / absent — not a reference
 *   junk           a string that is neither: a bare word, a data: URI, a path with
 *                  no extension. Needs eyes before the manifest is built.
 */
const classify = (raw) => {
  if (raw === null || raw === undefined) return { shape: "empty", key: "" };
  if (typeof raw !== "string") return { shape: "junk", key: String(raw).slice(0, 200) };
  const value = raw.trim();
  if (!value) return { shape: "empty", key: "" };

  if (/^data:/i.test(value)) return { shape: "junk", key: value.slice(0, 60) };

  if (/^https?:\/\//i.test(value)) {
    const ours =
      (BUCKET && value.includes(BUCKET)) || /massclickdev|massclickprod/i.test(value);
    const key = extractS3Key(value);
    if (ours && key) return { shape: "url-ours", key };
    return { shape: "url-external", key: "" };
  }

  const bare = value.replace(/^\/+/, "").split("?")[0];
  if (!OBJECT_EXT.test(bare)) return { shape: "junk", key: bare };
  return { shape: "key", key: bare };
};

const getByPath = (obj, fieldPath) =>
  fieldPath.split(".").reduce((acc, part) => (acc === null || acc === undefined ? acc : acc[part]), obj);

/**
 * Every stored reference on one document for one registry field, as
 * {locator, raw} — `locator` is precise enough to rewrite the exact slot later.
 */
const readField = (doc, field) => {
  const out = [];
  const value = getByPath(doc, field.path);

  switch (field.kind) {
    case "single":
      out.push({ locator: field.path, raw: value });
      break;

    case "array":
      if (Array.isArray(value)) {
        value.forEach((item, i) => out.push({ locator: `${field.path}[${i}]`, raw: item }));
      } else if (value !== null && value !== undefined && value !== "") {
        // A scalar where the schema says array — real corruption, surfaced as junk.
        out.push({ locator: `${field.path}<NOT-ARRAY>`, raw: value });
      }
      break;

    case "object":
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const key of field.keys) out.push({ locator: `${field.path}.${key}`, raw: value[key] });
      }
      break;

    case "arrayOfObjects":
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (item && typeof item === "object") {
            out.push({ locator: `${field.path}[${i}].${field.itemPath}`, raw: item[field.itemPath] });
          }
        });
      } else if (value !== null && value !== undefined && value !== "") {
        // This is exactly the `{"0":{…}}` corruption the setByPath bug produces.
        out.push({ locator: `${field.path}<NOT-ARRAY>.${field.itemPath}`, raw: null, corrupt: true });
      }
      break;

    default:
      break;
  }

  return out;
};

// ---------------------------------------------------------------- mongo

const connect = async (uri, label) => {
  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await connection.asPromise();
  } catch (error) {
    if (/ECONNREFUSED|ETIMEDOUT|ServerSelection/i.test(error.message)) {
      die(
        `Cannot reach ${label} at ${uri.replace(/\/\/[^@]*@/, "//<redacted>@")}\n` +
          `  ${error.message}\n\n` +
          `The SSH tunnel to 127.0.0.1:27018 is almost certainly down. Reconnect it and re-run.`,
      );
    }
    throw error;
  }
  return connection;
};

/** Walk one database through the registry. Read-only: find() and nothing else. */
const scanDatabase = async (connection, dbLabel) => {
  const problems = await validateRegistry(connection.db);
  if (problems.length) {
    console.error(`\nRegistry does not match ${dbLabel}:`);
    for (const p of problems) console.error(`  - ${p}`);
    die("Refusing to scan against a registry that disagrees with the database.");
  }

  const perField = [];
  const shapeTotals = {};
  const keyOwners = new Map(); // key -> [{scopeKey, collection, docId, locator}]
  const junkSamples = [];
  const externalSamples = [];
  const corruptArrays = [];

  for (const scope of Object.values(SCOPES)) {
    const collection = connection.db.collection(scope.collection);
    const docCount = await collection.countDocuments({});
    const matching = await collection.countDocuments(scope.buildQuery());

    const perFieldCounts = new Map();
    for (const field of scope.fields) {
      const id = `${field.path}${field.itemPath ? `.${field.itemPath}` : ""}`;
      perFieldCounts.set(id, { field, id, shapes: {}, refs: 0, distinct: new Set() });
    }

    const cursor = collection.find(scope.buildQuery(), { projection: scope.projection });
    for await (const doc of cursor) {
      for (const field of scope.fields) {
        const id = `${field.path}${field.itemPath ? `.${field.itemPath}` : ""}`;
        const bucketRow = perFieldCounts.get(id);

        for (const { locator, raw, corrupt } of readField(doc, field)) {
          if (corrupt) {
            corruptArrays.push({ collection: scope.collection, docId: String(doc._id), locator });
            continue;
          }
          const { shape, key } = classify(raw);
          if (shape === "empty") continue;

          bucketRow.shapes[shape] = (bucketRow.shapes[shape] || 0) + 1;
          shapeTotals[shape] = (shapeTotals[shape] || 0) + 1;
          bucketRow.refs += 1;

          if (shape === "junk" && junkSamples.length < 40) {
            junkSamples.push({ collection: scope.collection, docId: String(doc._id), locator, value: key });
          }
          if (shape === "url-external" && externalSamples.length < 40) {
            externalSamples.push({ collection: scope.collection, docId: String(doc._id), locator, value: String(raw).slice(0, 160) });
          }

          if (shape === "key" || shape === "url-ours") {
            bucketRow.distinct.add(key);
            if (!keyOwners.has(key)) keyOwners.set(key, []);
            keyOwners.get(key).push({
              scopeKey: scope.scopeKey,
              collection: scope.collection,
              docId: String(doc._id),
              locator,
              valueShape: shape === "url-ours" ? "url" : "key",
            });
          }
        }
      }
    }

    for (const row of perFieldCounts.values()) {
      perField.push({
        scopeKey: scope.scopeKey,
        collection: scope.collection,
        docCount,
        matchingDocs: matching,
        field: row.id,
        kind: row.field.kind,
        declaredShape: row.field.valueShape,
        stability: row.field.stability,
        refs: row.refs,
        distinctKeys: row.distinct.size,
        shapes: row.shapes,
      });
    }
  }

  return { perField, shapeTotals, keyOwners, junkSamples, externalSamples, corruptArrays };
};

/** _id overlap per collection — the "are these two databases clones?" question. */
const compareIds = async (a, b, labelA, labelB) => {
  const rows = [];
  for (const name of registryCollections()) {
    const idsA = new Set(
      (await a.db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)),
    );
    const idsB = new Set(
      (await b.db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)),
    );
    let shared = 0;
    for (const id of idsA) if (idsB.has(id)) shared += 1;
    const union = idsA.size + idsB.size - shared;
    rows.push({
      collection: name,
      [labelA]: idsA.size,
      [labelB]: idsB.size,
      shared,
      onlyA: idsA.size - shared,
      onlyB: idsB.size - shared,
      overlapPct: union ? Number(((shared / union) * 100).toFixed(2)) : 100,
    });
  }
  return rows;
};

// ---------------------------------------------------------------- s3

const listBucket = async () => {
  if (!BUCKET) die("AWS_S3_BUCKET_MASSCLICK is not set in server/.env.");
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const s3 = new AWS.S3();

  const keys = new Map(); // key -> size
  let token;
  let pages = 0;
  do {
    const page = await s3
      .listObjectsV2({ Bucket: BUCKET, MaxKeys: 1000, ContinuationToken: token })
      .promise();
    for (const obj of page.Contents || []) keys.set(obj.Key, obj.Size);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    pages += 1;
    process.stdout.write(`\r  listing bucket ${BUCKET}: ${keys.size} objects (${pages} pages)`);
  } while (token);
  process.stdout.write("\n");
  return keys;
};

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
  const scan = await scanDatabase(primary, label);

  let compareScan = null;
  let compare = null;
  let secondary = null;
  if (COMPARE_URI) {
    secondary = await connect(COMPARE_URI, compareLabel);
    console.log(`  scanning ${compareLabel}...`);
    compareScan = await scanDatabase(secondary, compareLabel);
    console.log(`  comparing _ids...`);
    compare = await compareIds(primary, secondary, label, compareLabel);
  }

  const bucketKeys = SKIP_S3 ? null : await listBucket();

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
    for (const [key, size] of bucketKeys) {
      if (!referencedEither.has(key)) {
        orphans.push(key);
        orphanBytes += size || 0;
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

// ---------------------------------------------------------------- main

const main = async () => {
  switch (SUBCOMMAND) {
    case "collections":
      cmdCollections();
      break;
    case "scan":
      await cmdScan();
      break;
    default:
      die(
        `Unknown subcommand "${SUBCOMMAND || "(none)"}".\n` +
          `Available so far: scan, collections\n\n` +
          `  node scripts/s3KeyMigration.js scan --uri=... [--compare-uri=...] [--out=...] [--no-s3]`,
      );
  }
  process.exit(0);
};

await main();
