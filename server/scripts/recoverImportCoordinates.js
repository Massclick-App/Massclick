import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import masterLocationModel from "../model/locationModel/masterLocationModel.js";
import { isPointInDistrict, kmOutsideDistrict } from "../helper/location/districtBoundary.js";

dotenv.config();

// Recovers the coordinates that the enrichment import already had and dropped.
//
// outputs/trichy_enrichment/IMPORT_masterlocations.json is the file that
// created ~10k Trichy locations on 2026-08-25. Every row carries `_lat`/`_lon`
// from whichever upstream dataset found the place — Google, OpenStreetMap or
// the 2011 Census. The importer treated `_`-prefixed keys as scratch metadata
// and wrote none of them, so 8,291 known coordinates were thrown away and the
// locations went live with nothing to rank from.
//
// Rows are matched to documents by `slug` — the same slug the import wrote, so
// this is an exact join, not a name guess.
//
// Never touches:
//   - documents that already have a real coordinate (use the audit + manual
//     path for those; this script only fills blanks)
//   - documents with coordinatesMeta.lockedAt (hand-placed)
//   - points that fall outside their own district boundary
//
// Safe defaults:
//   - dry-run unless --apply is passed
//   - --apply snapshots masterlocations first
//   - production refuses to run unless --prod is passed
//
// Examples:
//   node scripts/recoverImportCoordinates.js
//   node scripts/recoverImportCoordinates.js --active-only
//   node scripts/recoverImportCoordinates.js --apply

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const DEFAULT_BACKUP_SCRIPT = path.resolve(REPO_ROOT, "..", "db-backups", "backup.js");
const DEFAULT_IMPORT_FILE = path.resolve(REPO_ROOT, "outputs", "trichy_enrichment", "IMPORT_masterlocations.json");
const PROD_DB = "massClick";

// `_origin` in the import file -> coordinatesMeta.source.
const SOURCE_BY_ORIGIN = new Map([
  ["Google", "gmaps-import"],
  ["OpenStreetMap", "osm-import"],
  ["Official (Census)", "census-import"],
]);

const parseArgs = (argv) => {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
};

const args = parseArgs(process.argv.slice(2));
const APPLY = Boolean(args.apply);
const PROD = Boolean(args.prod);
const ACTIVE_ONLY = Boolean(args["active-only"]);
const TOLERANCE_KM = Number(args["tolerance-km"] ?? 2);
const IMPORT_FILE = path.resolve(args.file || DEFAULT_IMPORT_FILE);

if (args.help) {
  console.log(`
Usage:
  node scripts/recoverImportCoordinates.js [options]

Options:
  --apply                Write the recovered coordinates. Dry-run by default.
  --active-only          Skip documents with isActive: false. Default: fill both.
  --file=<path>          Import JSON. Default: ${DEFAULT_IMPORT_FILE}
  --tolerance-km=<n>     How far outside its district a point may sit. Default: 2.
  --uri=<mongodb-uri>    Overrides MONGO_URL/MC_URI.
  --db=<name>            Overrides the database name in the URI path.
  --prod                 Required if --db=massClick.
`);
  process.exit(0);
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const isRealPoint = (point) => {
  const c = point?.coordinates;
  return Array.isArray(c) && c.length >= 2 && isNum(c[0]) && isNum(c[1]) && !(c[0] === 0 && c[1] === 0);
};

const getMongoUri = () => {
  const uri = args.uri || process.env.MC_URI || process.env.MONGO_URL;
  if (!uri) throw new Error("Mongo URI missing. Set MONGO_URL/MC_URI or pass --uri.");
  const url = new URL(uri);
  if (args.db) url.pathname = `/${args.db}`;
  const dbName = url.pathname.replace(/^\//, "") || args.db || "";
  if (dbName === PROD_DB && !PROD) {
    throw new Error("Refusing to touch production massClick without --prod.");
  }
  return { uri: url.toString(), dbName };
};

const ensureSnapshot = ({ dbName, uri }) => {
  if (!fs.existsSync(DEFAULT_BACKUP_SCRIPT)) {
    throw new Error(`Snapshot script missing: ${DEFAULT_BACKUP_SCRIPT}`);
  }
  const backupArgs = [
    DEFAULT_BACKUP_SCRIPT,
    "--db", dbName,
    "--collections", "masterlocations",
    "--label", "pre-import-coordinate-recovery",
    "--reason", "restoring coordinates dropped by the enrichment import",
  ];
  if (dbName === PROD_DB) backupArgs.push("--prod");

  console.log("\nSnapshotting masterlocations before writes...");
  execFileSync("node", backupArgs, {
    cwd: path.dirname(DEFAULT_BACKUP_SCRIPT),
    stdio: "inherit",
    env: { ...process.env, MC_URI: uri },
  });
};

// The import's own verdict on the row, carried through so a later reviewer can
// tell a corroborated village from a single-source one without re-reading the
// import file. `_verified` means the place was confirmed against more than one
// upstream source; `_zoneConfidence` is how sure the import was about which
// zone it belongs to, which is what makes a coordinate trustworthy or not.
const confidenceFor = (row) => {
  if (row._verified && row._zoneConfidence === "high") return "high";
  if (row._zoneConfidence === "low") return "low";
  return "medium";
};

const main = async () => {
  if (!fs.existsSync(IMPORT_FILE)) throw new Error(`Import file not found: ${IMPORT_FILE}`);
  const rows = JSON.parse(fs.readFileSync(IMPORT_FILE, "utf8"));
  const withPoint = rows.filter((r) => isNum(r._lat) && isNum(r._lon));
  console.log(`${path.basename(IMPORT_FILE)}: ${rows.length} rows, ${withPoint.length} carry _lat/_lon`);

  const { uri, dbName } = getMongoUri();
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${dbName} - ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const bySlug = new Map();
  for (const row of withPoint) {
    // Later rows win; the import wrote one document per slug either way.
    bySlug.set(row.slug, row);
  }

  const docs = await masterLocationModel
    .find({ slug: { $in: [...bySlug.keys()] } },
      { slug: 1, level: 1, district: 1, zone: 1, ward: 1, locality: 1, pincode: 1, isActive: 1, coordinates: 1, coordinatesMeta: 1 })
    .lean();
  console.log(`matched ${docs.length} of ${bySlug.size} slugs in masterlocations\n`);

  const stats = {
    fillActive: 0, fillInactive: 0,
    skipHasCoordinate: 0, skipLocked: 0, skipInactive: 0,
    skipOutsideDistrict: 0, skipNoDoc: bySlug.size - docs.length,
  };
  const bySource = {};
  const byConfidence = {};
  const outside = [];
  const ops = [];
  const now = new Date();

  for (const doc of docs) {
    const row = bySlug.get(doc.slug);
    const point = [row._lon, row._lat];

    if (doc.coordinatesMeta?.lockedAt) { stats.skipLocked++; continue; }
    if (isRealPoint(doc.coordinates)) { stats.skipHasCoordinate++; continue; }
    if (ACTIVE_ONLY && !doc.isActive) { stats.skipInactive++; continue; }

    if (!isPointInDistrict(doc.district, point, { toleranceKm: TOLERANCE_KM })) {
      stats.skipOutsideDistrict++;
      outside.push(`${doc.zone} > ${doc.ward} > ${doc.locality}  [${point}]  ${kmOutsideDistrict(doc.district, point).toFixed(1)}km out`);
      continue;
    }

    const source = SOURCE_BY_ORIGIN.get(row._origin) || "";
    const confidence = confidenceFor(row);
    if (doc.isActive) stats.fillActive++; else stats.fillInactive++;
    bySource[source] = (bySource[source] || 0) + 1;
    byConfidence[confidence] = (byConfidence[confidence] || 0) + 1;

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            coordinates: { type: "Point", coordinates: point },
            coordinatesMeta: {
              source,
              confidence,
              query: [doc.locality, doc.ward, doc.zone, doc.district, doc.pincode].filter(Boolean).join(", "),
              formattedAddress: `recovered from enrichment import (${row._origin}` +
                `${Array.isArray(row._sources) && row._sources.length ? `, sources: ${row._sources.join("+")}` : ""}` +
                `${row._verified ? ", corroborated" : ", single-source"})`,
              placeId: "",
              derivedFromCount: 0,
              updatedAt: now,
              lockedAt: null,
              verifiedBy: "",
            },
            updatedAt: now,
          },
        },
      },
    });
  }

  console.log("Would fill:");
  console.log(`  active documents  : ${stats.fillActive}`);
  console.log(`  inactive documents: ${stats.fillInactive}`);
  console.log(`  total             : ${ops.length}`);
  console.log("\nBy source:    ", JSON.stringify(bySource));
  console.log("By confidence:", JSON.stringify(byConfidence));
  console.log("\nSkipped:");
  console.log(`  already has a coordinate : ${stats.skipHasCoordinate}`);
  console.log(`  locked (hand-placed)     : ${stats.skipLocked}`);
  console.log(`  inactive (--active-only) : ${stats.skipInactive}`);
  console.log(`  outside its district     : ${stats.skipOutsideDistrict}`);
  console.log(`  slug not in masterlocations: ${stats.skipNoDoc}`);
  if (outside.length) {
    console.log("\nOutside their district — not written:");
    outside.slice(0, 25).forEach((o) => console.log(`  ${o}`));
    if (outside.length > 25) console.log(`  ...and ${outside.length - 25} more`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these.");
    await mongoose.disconnect();
    return;
  }

  await mongoose.disconnect();
  ensureSnapshot({ dbName, uri });
  await mongoose.connect(uri);

  const result = await masterLocationModel.bulkWrite(ops);
  console.log(`\nWritten. matched=${result.matchedCount} modified=${result.modifiedCount}`);
  console.log("Next: roll the new children up into wards/zones with");
  console.log("  node scripts/backfillMasterLocationCoordinates.js --districts=Tiruchirappalli --levels=ward,zone,district --all");
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
