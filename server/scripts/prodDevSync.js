/**
 * Compare and (optionally) re-clone collections between prod and dev — the "fresh
 * prod -> dev clone" prerequisite S3_KEY_RESTRUCTURE_PROGRESS.md's operational rule
 * requires before the category (or any broad) S3 key migration can be retried:
 * "Before retrying category or any broad/full S3 key migration: 1. Make a perfect
 * fresh prod -> dev DB clone."
 *
 * Two subcommands:
 *
 *   diff      Read-only. For every collection present in either database, compares
 *             `_id` sets and reports:
 *               - missing in dev   — prod has it, dev doesn't (what `reclone` would ADD)
 *               - missing in prod  — dev has it, prod doesn't (what `reclone` would
 *                                    DESTROY — the thing to review BEFORE cloning)
 *               - (with --check-content) shared _ids whose document bytes differ —
 *                 the exact class of bug that broke the 2026-08-13 category
 *                 rehearsal (same _id, different image bytes in each DB)
 *             Every finding is written to a JSON report under
 *             `_migrations/prod-dev-sync/<timestamp>/`, not just printed.
 *
 *   reclone   Wipes named dev collections and re-inserts prod's documents 1:1.
 *             ALWAYS snapshots dev's current documents first (not skippable) to
 *             `db-backups/<timestamp>_pre-reclone-<collection>/dev_<collection>.json`
 *             — same convention as the existing db-backups/ snapshots. Dry-run by
 *             default; --commit writes. Refuses a collection that has dev-only
 *             documents (per the diff above) unless --acknowledge-dev-only-loss is
 *             also given — the same "stop and force a human decision" pattern as the
 *             S3 migration's conflicts.jsonl gate. Never defaults --collections to
 *             "everything" — always pass an explicit, scoped list.
 *
 * Usage:
 *   node scripts/prodDevSync.js diff --prod-uri=... --dev-uri=... [--collections=a,b] [--check-content]
 *   node scripts/prodDevSync.js reclone --prod-uri=... --dev-uri=... --collections=a,b [--commit] [--acknowledge-dev-only-loss]
 *
 * Connection strings always come from --prod-uri=/--dev-uri=, no defaults — same
 * convention as s3KeyMigration.js, so this can never be pointed at the wrong database
 * by a stale environment variable.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connect } from "../utils/s3MigrationScan.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const REPORT_ROOT = path.join(REPO_ROOT, "_migrations", "prod-dev-sync");
const BACKUP_ROOT = path.join(REPO_ROOT, "db-backups");

// Bookkeeping collections that belong to ONE environment by definition and were
// never meant to be identical across dev/prod — comparing or cloning them is
// meaningless noise, not a real finding.
const EXCLUDED_COLLECTIONS = new Set(["s3keymigrationjob", "s3cacheheadermigrationjob", "businesswebpmigrationjob"]);

const argv = process.argv.slice(2);
const SUBCOMMAND = argv.find((a) => !a.startsWith("--")) || "";
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const has = (name) => argv.includes(`--${name}`);

const PROD_URI = flag("prod-uri");
const DEV_URI = flag("dev-uri");
const COLLECTIONS_FLAG = flag("collections");
const COMMIT = has("commit");
const CHECK_CONTENT = has("check-content");
const ACKNOWLEDGE_DEV_ONLY_LOSS = has("acknowledge-dev-only-loss");

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const dbNameOf = (uri) => (uri.split("/").pop() || "").split("?")[0] || "(unknown)";

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/** Recursive key-sort so field-order differences (e.g. from an unrelated $set on one
 * side) don't register as a false "differs" — only actual value differences do. */
const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

const hashDoc = (doc) => crypto.createHash("sha256").update(stableStringify(doc)).digest("hex");

const listCollectionNames = async (connection) => {
  const names = await connection.db.listCollections().toArray();
  return names.map((c) => c.name).filter((n) => !n.startsWith("system.") && !EXCLUDED_COLLECTIONS.has(n.toLowerCase()));
};

const fetchIdSet = async (connection, collectionName) => {
  const docs = await connection.db.collection(collectionName).find({}, { projection: { _id: 1 } }).toArray();
  return new Set(docs.map((d) => String(d._id)));
};

// ---------------------------------------------------------------- diff

const cmdDiff = async () => {
  if (!PROD_URI) die("diff requires --prod-uri=... (no default — never guess which DB is prod).");
  if (!DEV_URI) die("diff requires --dev-uri=... (no default — never guess which DB is dev).");
  if (dbNameOf(PROD_URI) === dbNameOf(DEV_URI)) {
    die(`--prod-uri and --dev-uri resolve to the SAME database ("${dbNameOf(PROD_URI)}") — almost certainly a copy-paste mistake. Refusing.`);
  }

  const prodLabel = dbNameOf(PROD_URI);
  const devLabel = dbNameOf(DEV_URI);
  const runStamp = timestamp();
  const reportDir = path.join(REPORT_ROOT, runStamp);

  console.log(`\n=== prodDevSync diff — read-only, writes only to local disk ===`);
  console.log(`prod: ${prodLabel}`);
  console.log(`dev:  ${devLabel}`);
  console.log(`check-content: ${CHECK_CONTENT ? "on (slower, byte-for-byte on shared _ids)" : "off"}\n`);

  const prod = await connect(PROD_URI, prodLabel);
  const dev = await connect(DEV_URI, devLabel);

  const wantedCollections = COLLECTIONS_FLAG ? COLLECTIONS_FLAG.split(",").map((s) => s.trim()) : null;
  const [prodCollections, devCollections] = await Promise.all([listCollectionNames(prod), listCollectionNames(dev)]);
  const allCollections = [...new Set([...prodCollections, ...devCollections])]
    .filter((name) => !wantedCollections || wantedCollections.includes(name))
    .sort();

  const summary = [];

  for (const collectionName of allCollections) {
    const inProd = prodCollections.includes(collectionName);
    const inDev = devCollections.includes(collectionName);

    if (!inProd) {
      console.log(`  ${collectionName.padEnd(30)} exists only in ${devLabel} (not in prod at all)`);
      summary.push({ collection: collectionName, inProd, inDev, missingInDev: 0, missingInProd: "all", differs: 0 });
      continue;
    }
    if (!inDev) {
      console.log(`  ${collectionName.padEnd(30)} exists only in ${prodLabel} (not in dev at all)`);
      summary.push({ collection: collectionName, inProd, inDev, missingInDev: "all", missingInProd: 0, differs: 0 });
      continue;
    }

    const [prodIds, devIds] = await Promise.all([fetchIdSet(prod, collectionName), fetchIdSet(dev, collectionName)]);
    const missingInDev = [...prodIds].filter((id) => !devIds.has(id));
    const missingInProd = [...devIds].filter((id) => !prodIds.has(id));

    let differingIds = [];
    if (CHECK_CONTENT) {
      const sharedIds = [...prodIds].filter((id) => devIds.has(id));
      for (const batchStart of Array.from({ length: Math.ceil(sharedIds.length / 500) }, (_, i) => i * 500)) {
        const batch = sharedIds.slice(batchStart, batchStart + 500);
        const objectIds = batch.map((id) => (/^[0-9a-fA-F]{24}$/.test(id) ? new mongoose.Types.ObjectId(id) : id));
        const [prodDocs, devDocs] = await Promise.all([
          prod.db.collection(collectionName).find({ _id: { $in: objectIds } }).toArray(),
          dev.db.collection(collectionName).find({ _id: { $in: objectIds } }).toArray(),
        ]);
        const prodById = new Map(prodDocs.map((d) => [String(d._id), d]));
        const devById = new Map(devDocs.map((d) => [String(d._id), d]));
        for (const id of batch) {
          const p = prodById.get(id);
          const d = devById.get(id);
          if (p && d && hashDoc(p) !== hashDoc(d)) differingIds.push(id);
        }
      }
    }

    console.log(
      `  ${collectionName.padEnd(30)} prod=${String(prodIds.size).padStart(6)}  dev=${String(devIds.size).padStart(6)}  ` +
        `missing-in-dev=${String(missingInDev.length).padStart(5)}  missing-in-prod=${String(missingInProd.length).padStart(5)}` +
        (CHECK_CONTENT ? `  differs=${String(differingIds.length).padStart(5)}` : ""),
    );

    if (missingInDev.length) writeJson(path.join(reportDir, `${collectionName}.missing-in-dev.json`), missingInDev);
    if (missingInProd.length) writeJson(path.join(reportDir, `${collectionName}.missing-in-prod.json`), missingInProd);
    if (differingIds.length) writeJson(path.join(reportDir, `${collectionName}.differs.json`), differingIds);

    summary.push({
      collection: collectionName,
      inProd,
      inDev,
      prodCount: prodIds.size,
      devCount: devIds.size,
      missingInDev: missingInDev.length,
      missingInProd: missingInProd.length,
      differs: CHECK_CONTENT ? differingIds.length : null,
    });
  }

  await prod.close();
  await dev.close();

  writeJson(path.join(reportDir, "summary.json"), { prodLabel, devLabel, checkContent: CHECK_CONTENT, runStamp, summary });

  const totalMissingInProd = summary.reduce((a, s) => a + (typeof s.missingInProd === "number" ? s.missingInProd : 0), 0);
  const collectionsWithDevOnlyDocs = summary.filter((s) => typeof s.missingInProd === "number" && s.missingInProd > 0);

  console.log(`\nreport written: ${reportDir}`);
  if (totalMissingInProd > 0) {
    console.log(`\n⚠️  ${totalMissingInProd} document(s) exist in dev but NOT in prod, across ${collectionsWithDevOnlyDocs.length} collection(s):`);
    for (const s of collectionsWithDevOnlyDocs) console.log(`    ${s.collection}: ${s.missingInProd}`);
    console.log(`  A fresh reclone of these collections would DESTROY those documents. Review the`);
    console.log(`  *.missing-in-prod.json files in the report dir before running \`reclone\` on them.`);
  } else {
    console.log(`\nNo dev-only documents found in any compared collection — clean to reclone.`);
  }
  console.log(`\n=== diff complete — nothing written to either database ===\n`);
};

// ---------------------------------------------------------------- reclone

const cmdReclone = async () => {
  if (!PROD_URI) die("reclone requires --prod-uri=... (no default).");
  if (!DEV_URI) die("reclone requires --dev-uri=... (no default).");
  if (!COLLECTIONS_FLAG) die("reclone requires --collections=<a,b,c> — never defaults to \"everything\" (see db-backups convention: always scope, never whole-db).");
  if (dbNameOf(PROD_URI) === dbNameOf(DEV_URI)) {
    die(`--prod-uri and --dev-uri resolve to the SAME database ("${dbNameOf(PROD_URI)}") — almost certainly a copy-paste mistake. Refusing.`);
  }

  const prodLabel = dbNameOf(PROD_URI);
  const devLabel = dbNameOf(DEV_URI);
  const collections = COLLECTIONS_FLAG.split(",").map((s) => s.trim());
  const runStamp = timestamp();

  console.log(`\n=== prodDevSync reclone — run ${runStamp} ===`);
  console.log(`mode:        ${COMMIT ? "COMMIT (wipes + rewrites dev)" : "DRY RUN (nothing written)"}`);
  console.log(`prod:        ${prodLabel}`);
  console.log(`dev:         ${devLabel}`);
  console.log(`collections: ${collections.join(", ")}\n`);

  const prod = await connect(PROD_URI, prodLabel);
  const dev = await connect(DEV_URI, devLabel);

  for (const collectionName of collections) {
    const prodDocs = await prod.db.collection(collectionName).find({}).toArray();
    const devIds = await fetchIdSet(dev, collectionName);
    const prodIds = new Set(prodDocs.map((d) => String(d._id)));
    const devOnlyIds = [...devIds].filter((id) => !prodIds.has(id));

    console.log(`  ${collectionName}: prod=${prodDocs.length}  dev=${devIds.size}  dev-only=${devOnlyIds.length}`);

    if (devOnlyIds.length && !ACKNOWLEDGE_DEV_ONLY_LOSS) {
      const reportPath = path.join(REPORT_ROOT, runStamp, `${collectionName}.dev-only-would-be-lost.json`);
      writeJson(reportPath, devOnlyIds);
      die(
        `  ${collectionName} has ${devOnlyIds.length} document(s) that exist ONLY in dev — a reclone would\n` +
          `  permanently destroy them. Written to ${reportPath}.\n` +
          `  Run \`diff\` first and review that list. If you're certain they're safe to lose, re-run with\n` +
          `  --acknowledge-dev-only-loss.`,
      );
    }

    if (!COMMIT) {
      console.log(`    DRY RUN — would delete ${devIds.size} dev doc(s) and insert ${prodDocs.length} from prod.`);
      continue;
    }

    // Snapshot dev BEFORE any write — not skippable, matches the "snapshot before
    // dev changes" convention already used throughout this project's DB work.
    const snapshotDir = path.join(BACKUP_ROOT, `${runStamp}_pre-reclone-${collectionName}`);
    const devDocsBeforeWipe = await dev.db.collection(collectionName).find({}).toArray();
    writeJson(path.join(snapshotDir, `dev_${collectionName}.json`), devDocsBeforeWipe);
    console.log(`    snapshot written: ${snapshotDir}`);

    await dev.db.collection(collectionName).deleteMany({});
    let inserted = 0;
    for (let i = 0; i < prodDocs.length; i += 500) {
      const batch = prodDocs.slice(i, i + 500);
      if (batch.length) {
        const result = await dev.db.collection(collectionName).insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
      }
    }
    const afterCount = await dev.db.collection(collectionName).countDocuments();
    console.log(`    wiped ${devDocsBeforeWipe.length}, inserted ${inserted}/${prodDocs.length}, dev now has ${afterCount} (prod has ${prodDocs.length})`);
    if (afterCount !== prodDocs.length) {
      console.log(`    ⚠️  MISMATCH — dev count does not equal prod count after reclone. Investigate before trusting this collection.`);
    }
  }

  await prod.close();
  await dev.close();

  console.log(`\n=== reclone complete for run ${runStamp} ===\n`);
};

// ---------------------------------------------------------------- main

const main = async () => {
  switch (SUBCOMMAND) {
    case "diff":
      await cmdDiff();
      break;
    case "reclone":
      await cmdReclone();
      break;
    default:
      die(
        `Unknown subcommand "${SUBCOMMAND || "(none)"}". Available: diff, reclone\n\n` +
          `  node scripts/prodDevSync.js diff --prod-uri=... --dev-uri=... [--collections=a,b] [--check-content]\n` +
          `  node scripts/prodDevSync.js reclone --prod-uri=... --dev-uri=... --collections=a,b [--commit] [--acknowledge-dev-only-loss]`,
      );
  }
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
