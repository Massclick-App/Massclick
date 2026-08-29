import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import masterLocationModel from "../model/locationModel/masterLocationModel.js";
import { isPointInDistrict, kmOutsideDistrict } from "../helper/location/districtBoundary.js";

dotenv.config();

// Applies hand-placed coordinates from a reviewed CSV to masterlocations.
//
// These are the points a human located deliberately — junctions, bus stands,
// taluk town centres, and the records automation got wrong. They are written
// with coordinatesMeta.lockedAt set, which puts them permanently out of reach
// of backfillMasterLocationCoordinates.js and
// applyMasterLocationCoordinateSourceReport.js, --force included.
//
// Expected CSV columns (extra columns are ignored):
//   slug, NEW_LNG, NEW_LAT           required
//   zone, ward, locality, level      used only for the printed report
//   NEW_CONF                         high | medium-high | medium | low
//   PROPER_LOCATION, MATCHED_NAME    what the point is, free text
//   NEW_SOURCE_PROVIDER, NEW_SOURCE_URL, GEOCODE_QUERY, notes
//
// Safe defaults:
//   - dry-run unless --apply is passed
//   - --apply snapshots masterlocations first
//   - production refuses to run unless --prod is passed
//   - a row is rejected, never silently written, if the point fails validation
//
// Examples:
//   node scripts/applyManualCoordinates.js --files=../outputs/coordinate_fix_20260829/coordinate_requests_corrected.csv
//   node scripts/applyManualCoordinates.js --files=a.csv,b.csv --apply

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const DEFAULT_BACKUP_SCRIPT = path.resolve(REPO_ROOT, "..", "db-backups", "backup.js");
const PROD_DB = "massClick";

// The reviewer's vocabulary is finer than the schema's enum. "medium-high"
// maps down, not up: confidence is meant to be spent on widening distance
// bands for uncertain origins, so rounding uncertainty away defeats it.
const CONFIDENCE_MAP = new Map([
  ["high", "high"],
  ["medium-high", "medium"],
  ["medium", "medium"],
  ["medium-low", "low"],
  ["low", "low"],
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
const VERIFIED_BY = String(args["verified-by"] || "manual-review");
const TOLERANCE_KM = Number(args["tolerance-km"] ?? 2);

if (args.help || !args.files) {
  console.log(`
Usage:
  node scripts/applyManualCoordinates.js --files=<a.csv[,b.csv]> [options]

Options:
  --apply                Write the accepted rows. Dry-run by default.
  --verified-by=<name>   Stored in coordinatesMeta.verifiedBy. Default: manual-review.
  --tolerance-km=<n>     How far outside its district a point may sit. Default: 2.
  --uri=<mongodb-uri>    Overrides MONGO_URL/MC_URI.
  --db=<name>            Overrides the database name in the URI path.
  --prod                 Required if --db=massClick.
`);
  process.exit(args.help ? 0 : 1);
}

// Minimal RFC4180 reader: the reviewed files contain quoted commas and URLs.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((cells) => cells.some((cell) => String(cell).trim() !== ""))
    .map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
};

const num = (value) => {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
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
  if (!APPLY) return;
  if (!fs.existsSync(DEFAULT_BACKUP_SCRIPT)) {
    throw new Error(`Snapshot script missing: ${DEFAULT_BACKUP_SCRIPT}`);
  }
  const backupArgs = [
    DEFAULT_BACKUP_SCRIPT,
    "--db", dbName,
    "--collections", "masterlocations",
    "--label", "pre-manual-coordinate-apply",
    "--reason", "applying reviewed hand-placed coordinates",
  ];
  if (dbName === PROD_DB) backupArgs.push("--prod");

  console.log("\nSnapshotting masterlocations before writes...");
  execFileSync("node", backupArgs, {
    cwd: path.dirname(DEFAULT_BACKUP_SCRIPT),
    stdio: "inherit",
    env: { ...process.env, MC_URI: uri },
  });
};

const label = (row, doc) => {
  const parts = [row.zone || doc?.zone, row.ward || doc?.ward, row.locality || doc?.locality];
  return parts.filter(Boolean).join(" > ") || row.slug;
};

const main = async () => {
  const files = String(args.files).split(",").map((f) => f.trim()).filter(Boolean);
  const rows = files.flatMap((file) => {
    const resolved = path.resolve(file);
    if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
    const parsed = parseCsv(fs.readFileSync(resolved, "utf8"));
    console.log(`${path.basename(resolved)}: ${parsed.length} rows`);
    return parsed;
  });

  const { uri, dbName } = getMongoUri();
  await mongoose.connect(uri);
  console.log(`\nMongoDB connected: ${dbName} - ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const accepted = [];
  const rejected = [];
  const seenSlugs = new Map();
  const now = new Date();

  for (const row of rows) {
    const slug = String(row.slug || "").trim();
    const lng = num(row.NEW_LNG);
    const lat = num(row.NEW_LAT);

    const reject = (reason) => rejected.push({ slug, name: label(row), reason });

    if (!slug || slug.startsWith("(")) { reject("no slug — the document does not exist yet"); continue; }
    if (lng === null || lat === null) { reject("NEW_LNG/NEW_LAT missing or not numeric"); continue; }
    if (lng === 0 && lat === 0) { reject("[0, 0]"); continue; }

    const doc = await masterLocationModel
      .findOne({ slug }, { slug: 1, level: 1, district: 1, zone: 1, ward: 1, locality: 1, pincode: 1, coordinates: 1, coordinatesMeta: 1 })
      .lean();
    if (!doc) { reject("slug not found in masterlocations"); continue; }

    if (!isPointInDistrict(doc.district, [lng, lat], { toleranceKm: TOLERANCE_KM })) {
      const km = kmOutsideDistrict(doc.district, [lng, lat]);
      reject(`${km.toFixed(2)}km outside ${doc.district} — check the record's parent, not its coordinate`);
      continue;
    }

    // Two rows pointing at one document is fine only if they agree.
    const previous = seenSlugs.get(slug);
    if (previous) {
      if (previous.lng !== lng || previous.lat !== lat) {
        reject(`conflicting duplicate: another row gives [${previous.lng}, ${previous.lat}]`);
        continue;
      }
      continue;
    }
    seenSlugs.set(slug, { lng, lat });

    const rawConfidence = String(row.NEW_CONF || "").trim().toLowerCase();
    const confidence = CONFIDENCE_MAP.get(rawConfidence) || "medium";
    const provider = String(row.NEW_SOURCE_PROVIDER || "").trim();
    const matched = String(row.MATCHED_NAME || row.PROPER_LOCATION || "").trim();
    const sourceUrl = String(row.NEW_SOURCE_URL || "").trim();

    accepted.push({
      slug,
      name: label(row, doc),
      level: doc.level,
      from: doc.coordinates?.coordinates,
      to: [lng, lat],
      confidence,
      rawConfidence,
      provider,
      update: {
        $set: {
          coordinates: { type: "Point", coordinates: [lng, lat] },
          coordinatesMeta: {
            source: "manual",
            confidence,
            query: String(row.GEOCODE_QUERY || "").trim() ||
              [doc.locality, doc.ward, doc.zone, doc.district, doc.pincode].filter(Boolean).join(", "),
            // The audit trail for a hand-placed point: what it is, who says so,
            // and the page it came from. Nothing else records that.
            formattedAddress: [matched, provider && `via ${provider}`, sourceUrl]
              .filter(Boolean).join(" | ").slice(0, 500),
            placeId: "",
            derivedFromCount: 0,
            updatedAt: now,
            lockedAt: now,
            verifiedBy: VERIFIED_BY,
          },
          updatedAt: now,
        },
      },
    });
  }

  console.log(`Accepted: ${accepted.length}   Rejected: ${rejected.length}\n`);
  for (const a of accepted) {
    const from = Array.isArray(a.from) ? `[${a.from}]` : "(none)";
    const conf = a.rawConfidence && a.rawConfidence !== a.confidence
      ? `${a.confidence} (from "${a.rawConfidence}")`
      : a.confidence;
    console.log(`  ${a.level.padEnd(8)} ${a.name}\n      ${from} -> [${a.to}]  conf=${conf}`);
  }
  if (rejected.length) {
    console.log("\nREJECTED — nothing written for these:");
    for (const r of rejected) console.log(`  ${r.name || r.slug}\n      ${r.reason}`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these.");
    await mongoose.disconnect();
    return;
  }

  await mongoose.disconnect();
  ensureSnapshot({ dbName, uri });
  await mongoose.connect(uri);

  const result = await masterLocationModel.bulkWrite(
    accepted.map((a) => ({ updateOne: { filter: { slug: a.slug }, update: a.update } })),
  );
  console.log(`\nWritten. matched=${result.matchedCount} modified=${result.modifiedCount}`);
  console.log("These locations are now locked; the derive scripts will skip them.");
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
