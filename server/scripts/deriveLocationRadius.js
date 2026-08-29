import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import masterLocationModel from "../model/locationModel/masterLocationModel.js";

dotenv.config();

// Fills coordinatesMeta.radiusM: how far a node actually extends from its own
// point, measured as the p80 distance of its coordinate-carrying children.
//
// Search currently buckets every result into the same hardcoded 0-2 / 2-5 /
// 5-10 / 10-20 km bands regardless of what was searched. That is wrong in both
// directions: a 400m cross street gets a 2km "very close" band that includes
// half the neighbourhood, and a 25km taluk zone gets a 20km "far" band that
// still cuts off its own villages. radiusM lets the bands scale with the node.
//
// p80 rather than max, because a single outlying child (a mis-parented village,
// a border hamlet) should not define the extent of the whole ward.
//
// Only parents can be measured — a locality has no children, so it keeps
// radiusM: null and callers fall back to a level default.
//
//   node server/scripts/deriveLocationRadius.js --districts=Tiruchirappalli
//   node server/scripts/deriveLocationRadius.js --districts=Tiruchirappalli --apply

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const DEFAULT_BACKUP_SCRIPT = path.resolve(REPO_ROOT, "..", "db-backups", "backup.js");
const PROD_DB = "massClick";

// Below this, a p80 is not a measurement, it is an accident.
const MIN_CHILDREN = 4;

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
const DISTRICTS = args.districts
  ? String(args.districts).split(",").map((s) => s.trim()).filter(Boolean)
  : null;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const pointOf = (doc) => {
  const c = doc?.coordinates?.coordinates;
  return Array.isArray(c) && c.length >= 2 && isNum(c[0]) && isNum(c[1]) && !(c[0] === 0 && c[1] === 0) ? c : null;
};

const distanceM = (a, b) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const percentile = (sorted, p) =>
  sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))];

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
    DEFAULT_BACKUP_SCRIPT, "--db", dbName, "--collections", "masterlocations",
    "--label", "pre-location-radius-derive", "--reason", "deriving coordinatesMeta.radiusM",
  ];
  if (dbName === PROD_DB) backupArgs.push("--prod");
  console.log("\nSnapshotting masterlocations before writes...");
  execFileSync("node", backupArgs, {
    cwd: path.dirname(DEFAULT_BACKUP_SCRIPT), stdio: "inherit",
    env: { ...process.env, MC_URI: uri },
  });
};

const childrenOf = (parent, all) => all.filter((child) => {
  if (child.district !== parent.district) return false;
  if (parent.level === "ward") return child.level === "locality" && child.zone === parent.zone && child.ward === parent.ward;
  if (parent.level === "zone") return child.level === "locality" && child.zone === parent.zone;
  if (parent.level === "district") return child.level === "zone";
  return false;
});

const main = async () => {
  const { uri, dbName } = getMongoUri();
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${dbName} - ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const query = { isActive: true, ...(DISTRICTS ? { district: { $in: DISTRICTS } } : {}) };
  const docs = await masterLocationModel
    .find(query, { level: 1, district: 1, zone: 1, ward: 1, locality: 1, coordinates: 1, coordinatesMeta: 1 })
    .lean();

  const parents = docs.filter((d) => ["ward", "zone", "district"].includes(d.level) && pointOf(d));
  const rows = [];
  let tooFew = 0;

  for (const parent of parents) {
    const origin = pointOf(parent);
    const distances = childrenOf(parent, docs)
      .map(pointOf)
      .filter(Boolean)
      .map((p) => distanceM(origin, p))
      .sort((a, b) => a - b);

    if (distances.length < MIN_CHILDREN) { tooFew++; continue; }
    rows.push({
      doc: parent,
      radiusM: Math.round(percentile(distances, 0.8)),
      maxM: Math.round(distances[distances.length - 1]),
      n: distances.length,
    });
  }

  const byLevel = {};
  for (const r of rows) (byLevel[r.doc.level] = byLevel[r.doc.level] || []).push(r);

  console.log(`parents with a coordinate: ${parents.length}`);
  console.log(`measurable (>= ${MIN_CHILDREN} located children): ${rows.length}`);
  console.log(`too few children to measure: ${tooFew}\n`);

  for (const [level, list] of Object.entries(byLevel)) {
    const radii = list.map((r) => r.radiusM).sort((a, b) => a - b);
    console.log(`${level}: n=${list.length}  median ${(percentile(radii, 0.5) / 1000).toFixed(1)}km  ` +
      `p10 ${(percentile(radii, 0.1) / 1000).toFixed(1)}km  p90 ${(percentile(radii, 0.9) / 1000).toFixed(1)}km`);
  }

  console.log("\nwidest nodes (these are the ones the fixed bands were wrong about):");
  rows.sort((a, b) => b.radiusM - a.radiusM).slice(0, 12).forEach((r) => {
    const name = [r.doc.zone, r.doc.ward].filter(Boolean).join(" > ") || r.doc.district;
    console.log(`  ${r.doc.level.padEnd(8)} ${name.padEnd(38)} radius ${(r.radiusM / 1000).toFixed(1)}km (max ${(r.maxM / 1000).toFixed(1)}km, ${r.n} children)`);
  });
  console.log("\ntightest nodes:");
  rows.slice(-8).reverse().forEach((r) => {
    const name = [r.doc.zone, r.doc.ward].filter(Boolean).join(" > ") || r.doc.district;
    console.log(`  ${r.doc.level.padEnd(8)} ${name.padEnd(38)} radius ${(r.radiusM / 1000).toFixed(2)}km (${r.n} children)`);
  });

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these.");
    await mongoose.disconnect();
    return;
  }

  await mongoose.disconnect();
  ensureSnapshot({ dbName, uri });
  await mongoose.connect(uri);

  // Targeted $set: radiusM is the only field this script owns, and the whole
  // point of coordinatesMeta.lockedAt is that nothing here disturbs the rest.
  const result = await masterLocationModel.bulkWrite(rows.map((r) => ({
    updateOne: {
      filter: { _id: r.doc._id },
      update: { $set: { "coordinatesMeta.radiusM": r.radiusM } },
    },
  })));
  console.log(`\nWritten. matched=${result.matchedCount} modified=${result.modifiedCount}`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
