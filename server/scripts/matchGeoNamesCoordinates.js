import fs from "fs";
import path from "path";
import readline from "readline";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import masterLocationModel from "../model/locationModel/masterLocationModel.js";
import { isPointInDistrict } from "../helper/location/districtBoundary.js";

dotenv.config();

// Fills remaining masterlocation coordinates from the GeoNames India dump.
//
// This runs AFTER recoverImportCoordinates.js, on whatever it could not reach.
// GeoNames is a name-keyed gazetteer, so matching is a guess by construction —
// the guards below are the whole point of the script, not decoration.
//
// A naive name match measured on real Trichy data produced 132 hits and several
// were badly wrong: "Elur" under Srirangam > Tirupparaithurai matched a place
// 55km away, "Ulaganathapuram" under Ariyamangalam matched one well outside the
// zone. Both are real GeoNames entries; they are simply not the place we mean.
// So a match is only accepted when it lands near the record's own parent.
//
// Guards, all of which must pass:
//   1. inside the record's district boundary
//   2. within --ward-km of the parent ward's coordinate, when the ward has one
//   3. otherwise within --zone-km of the parent zone's coordinate
//   4. a record whose parents have no coordinate at all is skipped, not guessed
//   5. when one name maps to several GeoNames points, exactly one must survive
//
// The GeoNames dump is not vendored — it is 69MB. Download IN.txt from
// https://download.geonames.org/export/dump/ and point --geonames at it.
// Tamil Nadu is admin1 code 25.
//
//   node server/scripts/matchGeoNamesCoordinates.js --districts=Tiruchirappalli
//   node server/scripts/matchGeoNamesCoordinates.js --districts=Tiruchirappalli --apply

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const DEFAULT_BACKUP_SCRIPT = path.resolve(REPO_ROOT, "..", "db-backups", "backup.js");
const DEFAULT_GEONAMES = "C:/Users/USER/Downloads/Tamil_Nadu_Location_Data_Downloader/TamilNadu_Location_Data/geonames_india_IN/IN.txt";
const PROD_DB = "massClick";
const TN_ADMIN1 = "25";

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
const GEONAMES_FILE = path.resolve(args.geonames || DEFAULT_GEONAMES);
const WARD_KM = Number(args["ward-km"] ?? 6);
const ZONE_KM = Number(args["zone-km"] ?? 15);
const DISTRICTS = args.districts
  ? String(args.districts).split(",").map((s) => s.trim()).filter(Boolean)
  : null;

if (args.help) {
  console.log(`
Usage:
  node scripts/matchGeoNamesCoordinates.js --districts=A,B [options]

Options:
  --apply              Write the accepted matches. Dry-run by default.
  --geonames=<path>    GeoNames IN.txt. Default: ${DEFAULT_GEONAMES}
  --ward-km=<n>        Max distance from the parent ward. Default: 6.
  --zone-km=<n>        Max distance from the parent zone. Default: 15.
  --uri / --db / --prod  As in the other coordinate scripts.
`);
  process.exit(0);
}

const normalizeName = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const isRealPoint = (point) => {
  const c = point?.coordinates;
  return Array.isArray(c) && c.length >= 2 && isNum(c[0]) && isNum(c[1]) && !(c[0] === 0 && c[1] === 0);
};

const distanceKm = (a, b) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const getMongoUri = () => {
  const uri = args.uri || process.env.MC_URI || process.env.MONGO_URL;
  if (!uri) throw new Error("Mongo URI missing. Set MONGO_URL/MC_URI or pass --uri.");
  const url = new URL(uri);
  if (args.db) url.pathname = `/${args.db}`;
  const dbName = url.pathname.replace(/^\//, "") || args.db || "";
  if (dbName === PROD_DB && !PROD) throw new Error("Refusing to touch production massClick without --prod.");
  return { uri: url.toString(), dbName };
};

const ensureSnapshot = ({ dbName, uri }) => {
  if (!fs.existsSync(DEFAULT_BACKUP_SCRIPT)) throw new Error(`Snapshot script missing: ${DEFAULT_BACKUP_SCRIPT}`);
  const backupArgs = [
    DEFAULT_BACKUP_SCRIPT,
    "--db", dbName,
    "--collections", "masterlocations",
    "--label", "pre-geonames-coordinate-match",
    "--reason", "filling remaining coordinates from GeoNames",
  ];
  if (dbName === PROD_DB) backupArgs.push("--prod");
  console.log("\nSnapshotting masterlocations before writes...");
  execFileSync("node", backupArgs, {
    cwd: path.dirname(DEFAULT_BACKUP_SCRIPT),
    stdio: "inherit",
    env: { ...process.env, MC_URI: uri },
  });
};

// name key -> [{ lng, lat, name, fcode }]. Every alternate spelling GeoNames
// carries becomes its own key, which is where most of the useful matches come
// from (diacritics, "Vālādi" vs "Valadi").
const loadGeoNames = async () => {
  if (!fs.existsSync(GEONAMES_FILE)) {
    throw new Error(
      `GeoNames file not found: ${GEONAMES_FILE}\n` +
      "Download IN.txt from https://download.geonames.org/export/dump/ and pass --geonames=<path>.",
    );
  }
  const index = new Map();
  const stream = readline.createInterface({ input: fs.createReadStream(GEONAMES_FILE) });
  let rows = 0;

  for await (const line of stream) {
    const f = line.split("\t");
    if (f[10] !== TN_ADMIN1) continue;
    // Populated places and railway stations. Rivers, hills and forests are
    // real features but never what a business address means.
    if (f[6] !== "P" && f[7] !== "RSTN") continue;
    const lat = Number(f[4]);
    const lng = Number(f[5]);
    if (!isNum(lat) || !isNum(lng)) continue;
    rows++;

    const entry = { lng, lat, name: f[1], fcode: f[7] };
    for (const raw of [f[1], f[2], ...String(f[3] || "").split(",")]) {
      const key = normalizeName(raw);
      if (!key || key.length < 4) continue;
      const bucket = index.get(key);
      if (bucket) bucket.push(entry);
      else index.set(key, [entry]);
    }
  }
  console.log(`GeoNames: ${rows} Tamil Nadu places, ${index.size} distinct name keys`);
  return index;
};

const main = async () => {
  const geonames = await loadGeoNames();

  const { uri, dbName } = getMongoUri();
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${dbName} - ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const query = { isActive: true, ...(DISTRICTS ? { district: { $in: DISTRICTS } } : {}) };
  const docs = await masterLocationModel
    .find(query, { slug: 1, level: 1, district: 1, zone: 1, ward: 1, locality: 1, pincode: 1, alternateNames: 1, coordinates: 1, coordinatesMeta: 1 })
    .lean();

  // Parent reference points, taken only from records that already have one.
  const wardPoint = new Map();
  const zonePoint = new Map();
  for (const d of docs) {
    if (!isRealPoint(d.coordinates)) continue;
    if (d.level === "ward") wardPoint.set(`${d.district}|${d.zone}|${d.ward}`, d.coordinates.coordinates);
    if (d.level === "zone") zonePoint.set(`${d.district}|${d.zone}`, d.coordinates.coordinates);
  }

  const targets = docs.filter((d) => d.level === "locality" && !isRealPoint(d.coordinates) && !d.coordinatesMeta?.lockedAt);
  console.log(`Localities missing a coordinate: ${targets.length}\n`);

  const stats = { noName: 0, noGeoNames: 0, noParent: 0, tooFar: 0, outsideDistrict: 0, ambiguous: 0 };
  const accepted = [];
  const now = new Date();

  for (const doc of targets) {
    const names = [doc.locality, ...(doc.alternateNames || [])].filter(Boolean);
    const candidates = [];
    for (const name of names) {
      const bucket = geonames.get(normalizeName(name));
      if (bucket) candidates.push(...bucket);
    }
    if (!names.length) { stats.noName++; continue; }
    if (!candidates.length) { stats.noGeoNames++; continue; }

    const ward = wardPoint.get(`${doc.district}|${doc.zone}|${doc.ward}`);
    const zone = zonePoint.get(`${doc.district}|${doc.zone}`);
    const reference = ward || zone;
    const limitKm = ward ? WARD_KM : ZONE_KM;
    if (!reference) { stats.noParent++; continue; }

    const inDistrict = candidates.filter((c) => isPointInDistrict(doc.district, [c.lng, c.lat]));
    if (!inDistrict.length) { stats.outsideDistrict++; continue; }

    const near = inDistrict
      .map((c) => ({ ...c, km: distanceKm([c.lng, c.lat], reference) }))
      .filter((c) => c.km <= limitKm)
      .sort((a, b) => a.km - b.km);
    if (!near.length) { stats.tooFar++; continue; }

    // Several distinct places share this name inside the guard radius. Picking
    // the closest would be a coin flip dressed up as a decision.
    if (near.length > 1 && distanceKm([near[0].lng, near[0].lat], [near[1].lng, near[1].lat]) > 2) {
      stats.ambiguous++;
      continue;
    }

    const best = near[0];
    accepted.push({
      doc,
      point: [best.lng, best.lat],
      matchedName: best.name,
      km: best.km,
      via: ward ? "ward" : "zone",
      fcode: best.fcode,
    });
  }

  console.log(`Accepted: ${accepted.length}`);
  console.log("Rejected:");
  console.log(`  no GeoNames entry for the name : ${stats.noGeoNames}`);
  console.log(`  parent has no coordinate       : ${stats.noParent}`);
  console.log(`  match too far from parent      : ${stats.tooFar}`);
  console.log(`  match outside the district     : ${stats.outsideDistrict}`);
  console.log(`  several distinct places match  : ${stats.ambiguous}`);
  console.log(`  no usable name                 : ${stats.noName}\n`);

  for (const a of accepted.slice(0, 40)) {
    console.log(`  ${a.doc.zone} > ${a.doc.ward} > ${a.doc.locality}`);
    console.log(`      -> "${a.matchedName}" [${a.point}] ${a.km.toFixed(1)}km from ${a.via}${a.fcode === "RSTN" ? " (railway station)" : ""}`);
  }
  if (accepted.length > 40) console.log(`  ...and ${accepted.length - 40} more`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these.");
    await mongoose.disconnect();
    return;
  }

  await mongoose.disconnect();
  ensureSnapshot({ dbName, uri });
  await mongoose.connect(uri);

  const result = await masterLocationModel.bulkWrite(accepted.map((a) => ({
    updateOne: {
      filter: { _id: a.doc._id },
      update: {
        $set: {
          coordinates: { type: "Point", coordinates: a.point },
          coordinatesMeta: {
            source: "geonames-import",
            confidence: a.km <= 2 ? "medium" : "low",
            query: [a.doc.locality, a.doc.ward, a.doc.zone, a.doc.district, a.doc.pincode].filter(Boolean).join(", "),
            formattedAddress: `GeoNames "${a.matchedName}" (${a.fcode}), ${a.km.toFixed(1)}km from parent ${a.via}`,
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
  })));
  console.log(`\nWritten. matched=${result.matchedCount} modified=${result.modifiedCount}`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
