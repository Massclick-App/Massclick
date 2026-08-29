import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import businessListModel from "../model/businessList/businessListModel.js";
import masterLocationModel from "../model/locationModel/masterLocationModel.js";
import { isPointInDistrict } from "../helper/location/districtBoundary.js";

dotenv.config();

// Properly fills masterlocations.coordinates.
//
// Localities are geocoded with Google using the full hierarchy and pincode
// where available. Wards/zones/districts are derived from child locality
// coordinates, so broad parent nodes stay centered on MassClick's own data.
//
// Safe defaults:
//   - dry-run unless --apply is passed
//   - samples only unless --all or --limit is passed
//   - --apply automatically snapshots masterlocations first
//   - production refuses to run unless --prod is passed
//
// Examples:
//   node scripts/backfillMasterLocationCoordinates.js --districts=Tiruchirappalli --limit=10
//   node scripts/backfillMasterLocationCoordinates.js --districts=Tiruchirappalli --all --apply
//   node scripts/backfillMasterLocationCoordinates.js --all --apply

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
const DEFAULT_BACKUP_SCRIPT = path.resolve(REPO_ROOT, "..", "db-backups", "backup.js");
const PROD_DB = "massClick";
const DEFAULT_LEVELS = ["locality", "ward", "zone", "district"];

const PLACE_ALIASES = new Map([
  ["tiruchirappalli", ["trichy", "tiruchirapalli", "tiruchchirappalli"]],
  ["thoothukudi", ["tuticorin"]],
  ["kanniyakumari", ["kanyakumari"]],
  ["mayiladuthurai", ["mayiladuturai"]],
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }

    const eq = arg.indexOf("=");
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
};

const args = parseArgs(process.argv.slice(2));
const APPLY = Boolean(args.apply);
const FORCE = Boolean(args.force);
const ALL = Boolean(args.all);
const LIMIT = args.limit ? Number(args.limit) : (ALL ? Infinity : 25);
const DELAY_MS = Number(args["delay-ms"] || 120);
const PROD = Boolean(args.prod);
const LEVELS = String(args.levels || DEFAULT_LEVELS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DISTRICTS = args.districts
  ? String(args.districts).split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const MIN_PARENT_COVERAGE = Number(args["min-parent-coverage"] || 1);
const CACHE_FILE = path.resolve(
  args.cache || path.join(SERVER_ROOT, "reports", "masterlocation-geocode-cache.jsonl")
);
const REPORT_FILE = path.resolve(
  args.report || path.join(SERVER_ROOT, "reports", `masterlocation-coordinate-backfill-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
);

const usage = () => {
  console.log(`
Usage:
  node scripts/backfillMasterLocationCoordinates.js [options]

Options:
  --apply                       Write accepted coordinates. Dry-run by default.
  --all                         Process every matching missing row. Without this, defaults to 25.
  --limit=<n>                   Process at most n locality geocode candidates.
  --force                       Re-check rows that already have non-zero coordinates.
                                Never touches human-placed points (coordinatesMeta.lockedAt).
                                Coordinates outside their own district's bounds are
                                re-checked by default and do not need this flag.
  --districts=A,B               Scope to district names.
  --levels=locality,ward,...    Default: ${DEFAULT_LEVELS.join(",")}.
  --delay-ms=<n>                Delay between uncached Google calls. Default: ${DELAY_MS}.
  --min-parent-coverage=<0-1>   Required child locality coverage before deriving parent. Default: 1.
  --uri=<mongodb-uri>           Overrides MONGO_URL/MC_URI.
  --db=<name>                   Overrides the database name in the URI path.
  --prod                        Required if --db=massClick.
  --cache=<path>                JSONL geocode cache.
  --report=<path>               JSON report output.
`);
};

if (args.help) {
  usage();
  process.exit(0);
}

const clean = (value) => String(value || "").trim();

const canonicalPlace = (value) => clean(value)
  .toLowerCase()
  .replace(/\b(district|dt|city|municipality|taluk)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const placeMatches = (expected, actual) => {
  const a = canonicalPlace(expected);
  const b = canonicalPlace(actual);
  if (!a || !b) return false;
  if (a === b) return true;

  const aliases = PLACE_ALIASES.get(a) || [];
  if (aliases.some((alias) => canonicalPlace(alias) === b)) return true;

  for (const [primary, values] of PLACE_ALIASES.entries()) {
    if (b === primary && values.some((alias) => canonicalPlace(alias) === a)) return true;
  }

  return a.includes(b) || b.includes(a);
};

const isRealPoint = (point) => {
  const coords = point?.coordinates;
  return Array.isArray(coords) &&
    coords.length >= 2 &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1]) &&
    coords[0] !== 0 &&
    coords[1] !== 0;
};

const coordKey = (doc) => String(doc._id);

const getLeafName = (doc) => {
  if (doc.level === "locality") return clean(doc.locality);
  if (doc.level === "ward") return clean(doc.ward);
  if (doc.level === "zone") return clean(doc.zone);
  return clean(doc.district);
};

const uniqueParts = (parts) => {
  const seen = new Set();
  const out = [];
  for (const part of parts.map(clean).filter(Boolean)) {
    const key = canonicalPlace(part);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
};

const buildGeocodeQuery = (doc) => {
  const parts = uniqueParts([
    doc.locality,
    doc.ward,
    doc.zone,
    doc.district,
    doc.state || "Tamil Nadu",
    doc.pincode,
    "India",
  ]);
  return parts.join(", ");
};

const getMongoUri = () => {
  const uri = args.uri || process.env.MC_URI || process.env.MONGO_URL;
  if (!uri) {
    throw new Error("Mongo URI missing. Set MONGO_URL/MC_URI or pass --uri.");
  }

  const url = new URL(uri);
  if (args.db) url.pathname = `/${args.db}`;
  const dbName = url.pathname.replace(/^\//, "") || args.db || "";
  if (dbName === PROD_DB && !PROD) {
    throw new Error("Refusing to touch production massClick without --prod.");
  }
  return { uri: url.toString(), dbName };
};

const getGoogleKey = () => {
  const key = process.env.GOOGLE_MAPS_KEY || process.env.REACT_APP_GOOGLE_MAPS_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_KEY missing. Cannot geocode properly without a provider key.");
  return key;
};

const loadCache = (file) => {
  const map = new Map();
  if (!fs.existsSync(file)) return map;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.query) map.set(entry.query, entry);
    } catch {
      // Ignore malformed cache lines; they can be reviewed manually.
    }
  }
  return map;
};

const appendCache = (file, entry) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
};

const geocode = async (query, key, cache) => {
  if (cache.has(query)) return { ...cache.get(query), cached: true };

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "in");
  url.searchParams.set("key", key);

  const response = await fetch(url);
  const body = await response.json();
  const entry = {
    query,
    status: body.status,
    errorMessage: body.error_message || "",
    results: (body.results || []).slice(0, 5),
    fetchedAt: new Date().toISOString(),
  };
  cache.set(query, entry);
  appendCache(CACHE_FILE, entry);
  await sleep(DELAY_MS);
  return { ...entry, cached: false };
};

const getComponent = (result, type) => {
  const component = result.address_components?.find((part) => part.types?.includes(type));
  return component?.long_name || "";
};

const districtComponent = (result) =>
  getComponent(result, "administrative_area_level_3") ||
  getComponent(result, "administrative_area_level_2");

const buildDistrictGuards = async () => {
  const rows = await businessListModel.aggregate([
    {
      $match: {
        isActive: true,
        "masterLocation.district": { $type: "string", $ne: "" },
        "geoLocation.coordinates.0": { $type: "number", $ne: 0 },
        "geoLocation.coordinates.1": { $type: "number", $ne: 0 },
      },
    },
    {
      $group: {
        _id: "$masterLocation.district",
        count: { $sum: 1 },
        coords: { $push: "$geoLocation.coordinates" },
      },
    },
  ]);

  const guards = new Map();
  for (const row of rows) {
    const lngs = row.coords.map((coord) => coord[0]).filter(Number.isFinite).sort((a, b) => a - b);
    const lats = row.coords.map((coord) => coord[1]).filter(Number.isFinite).sort((a, b) => a - b);
    const quantile = (values, q) => values[Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * q)))];
    guards.set(row._id, {
      district: row._id,
      count: row.count,
      minLng: quantile(lngs, 0.05),
      maxLng: quantile(lngs, 0.95),
      minLat: quantile(lats, 0.05),
      maxLat: quantile(lats, 0.95),
    });
  }
  return guards;
};

const insideDistrictGuard = (guard, coordinates) => {
  if (!guard || guard.count < 10) return true;

  const [lng, lat] = coordinates;
  const pad = 0.25;
  return lng >= guard.minLng - pad &&
    lng <= guard.maxLng + pad &&
    lat >= guard.minLat - pad &&
    lat <= guard.maxLat + pad;
};

const evaluateResult = (doc, result, districtGuards) => {
  const country = getComponent(result, "country");
  const state = getComponent(result, "administrative_area_level_1");
  const district = districtComponent(result);
  const postalCode = getComponent(result, "postal_code");
  const location = result.geometry?.location;

  if (!location || !Number.isFinite(location.lng) || !Number.isFinite(location.lat)) {
    return { accepted: false, reason: "missing-geometry" };
  }
  if (!placeMatches("India", country)) {
    return { accepted: false, reason: `country-mismatch:${country || "missing"}` };
  }
  if (doc.state && state && !placeMatches(doc.state, state)) {
    return { accepted: false, reason: `state-mismatch:${state}` };
  }
  if (doc.district && district && !placeMatches(doc.district, district)) {
    return { accepted: false, reason: `district-mismatch:${district}` };
  }
  if (doc.pincode && postalCode && clean(doc.pincode) !== clean(postalCode)) {
    return { accepted: false, reason: `pincode-mismatch:${postalCode}` };
  }
  if (result.partial_match) {
    return { accepted: false, reason: "partial-match" };
  }

  const locationType = result.geometry?.location_type || "";
  const types = result.types || [];
  const localityLike = types.some((type) => [
    "locality",
    "sublocality",
    "sublocality_level_1",
    "neighborhood",
    "postal_code",
    "political",
  ].includes(type));
  const confidence = doc.pincode && postalCode === clean(doc.pincode)
    ? "high"
    : (localityLike || locationType === "GEOMETRIC_CENTER" ? "medium" : "low");
  const coordinates = [location.lng, location.lat];

  if (!insideDistrictGuard(districtGuards.get(doc.district), coordinates)) {
    return { accepted: false, reason: "district-geo-outlier" };
  }

  return {
    accepted: confidence !== "low",
    reason: confidence === "low" ? `low-confidence:${types.join("|") || locationType}` : "",
    confidence,
    coordinates,
    formattedAddress: result.formatted_address || "",
    placeId: result.place_id || "",
  };
};

const chooseGeocode = (doc, response, districtGuards) => {
  if (response.status !== "OK") {
    return { accepted: false, reason: `google-status:${response.status}${response.errorMessage ? `:${response.errorMessage}` : ""}` };
  }

  const rejected = [];
  for (const result of response.results || []) {
    const evaluation = evaluateResult(doc, result, districtGuards);
    if (evaluation.accepted) return evaluation;
    rejected.push(evaluation.reason);
  }

  return { accepted: false, reason: rejected.filter(Boolean).join(";") || "no-accepted-result" };
};

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const derivedCoordinate = (childCoords) => [
  Number(median(childCoords.map((c) => c[0])).toFixed(7)),
  Number(median(childCoords.map((c) => c[1])).toFixed(7)),
];

const childLocalitiesFor = (parent, localities) => localities.filter((child) => {
  if (child.district !== parent.district) return false;
  if (parent.level === "ward") return child.zone === parent.zone && child.ward === parent.ward;
  if (parent.level === "zone") return child.zone === parent.zone;
  if (parent.level === "district") return true;
  return false;
});

// A human placed this point by hand. Nothing here may overwrite it, --force
// included: --force exists to re-check machine-derived points, and the manual
// ones are exactly the points that must survive that. Clear
// coordinatesMeta.lockedAt to hand a location back to automation.
const isLocked = (doc) => Boolean(doc?.coordinatesMeta?.lockedAt);

// A point that exists but is provably wrong — outside its own district's
// published boundary. Previously the only way to reach one of these was
// --force, which also re-geocodes every good point in scope; so in practice
// bad coordinates were never fixed at all. They are now in scope by default.
//
// Deliberately NOT using the business-derived districtGuards for this: those
// bounds are computed from the same coordinates being judged, so a bad point
// widens the box that is supposed to catch it. See districtBoundary.js.
const isSuspectPoint = (doc) => {
  if (!isRealPoint(doc.coordinates)) return false;
  return !isPointInDistrict(doc.district, doc.coordinates.coordinates);
};

const needsCoordinate = (doc) => {
  if (isLocked(doc)) return false;
  if (FORCE) return true;
  if (!isRealPoint(doc.coordinates)) return true;
  return isSuspectPoint(doc);
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
    "--label", "pre-masterlocation-coordinate-backfill",
    "--reason", "before filling masterlocation coordinates",
  ];
  if (dbName === PROD_DB) backupArgs.push("--prod");

  console.log("\nSnapshotting masterlocations before writes...");
  execFileSync("node", backupArgs, {
    cwd: path.dirname(DEFAULT_BACKUP_SCRIPT),
    stdio: "inherit",
    env: { ...process.env, MC_URI: uri },
  });
};

const inDistrictScope = (doc) => !DISTRICTS || DISTRICTS.includes(doc.district);
const inLevelScope = (doc) => LEVELS.includes(doc.level);

const run = async () => {
  if (!Number.isFinite(LIMIT) && !ALL) {
    throw new Error("Use --all or --limit=<n>.");
  }

  const { uri, dbName } = getMongoUri();
  const googleKey = getGoogleKey();

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${dbName} - ${APPLY ? "APPLY" : "DRY RUN"}${FORCE ? " (force)" : ""}`);
  console.log(`Scope: ${DISTRICTS ? DISTRICTS.join(", ") : "all districts"} | levels: ${LEVELS.join(", ")} | locality limit: ${Number.isFinite(LIMIT) ? LIMIT : "all"}`);

  const docs = await masterLocationModel
    .find({ isActive: true }, {
      state: 1,
      district: 1,
      zone: 1,
      ward: 1,
      locality: 1,
      level: 1,
      pincode: 1,
      coordinates: 1,
      coordinatesMeta: 1,
    })
    .sort({ district: 1, zone: 1, ward: 1, locality: 1, level: 1 })
    .lean();

  const scopedDocs = docs.filter((doc) => inDistrictScope(doc));
  const localities = docs.filter((doc) => doc.level === "locality");
  const plannedCoords = new Map();
  const ops = [];
  const review = [];
  const accepted = [];
  const derived = [];
  const skipped = [];
  const cache = loadCache(CACHE_FILE);
  const districtGuards = await buildDistrictGuards();

  // Seed the parent-derivation pool with points we already trust. A suspect
  // point is deliberately left out: a child sitting in the wrong district must
  // not pull its parent's centre toward it, whether or not this run happens to
  // re-geocode that child.
  for (const doc of docs) {
    if (isRealPoint(doc.coordinates) && !isSuspectPoint(doc)) {
      plannedCoords.set(coordKey(doc), doc.coordinates.coordinates);
    }
  }

  const lockedInScope = scopedDocs.filter((doc) => inLevelScope(doc) && isLocked(doc)).length;
  if (lockedInScope > 0) {
    console.log(`Locked (human-placed) locations in scope, left untouched: ${lockedInScope}`);
  }

  const localityTargets = scopedDocs
    .filter((doc) => doc.level === "locality" && inLevelScope(doc) && needsCoordinate(doc))
    .slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);

  console.log(`Localities to geocode this run: ${localityTargets.length}`);

  for (let i = 0; i < localityTargets.length; i++) {
    const doc = localityTargets[i];
    const query = buildGeocodeQuery(doc);
    const response = await geocode(query, googleKey, cache);
    const chosen = chooseGeocode(doc, response, districtGuards);

    if (!chosen.accepted) {
      review.push({
        id: String(doc._id),
        level: doc.level,
        district: doc.district,
        zone: doc.zone,
        ward: doc.ward,
        locality: doc.locality,
        pincode: doc.pincode,
        query,
        reason: chosen.reason,
      });
      continue;
    }

    const coordinateDoc = {
      type: "Point",
      coordinates: chosen.coordinates,
    };
    plannedCoords.set(coordKey(doc), chosen.coordinates);
    accepted.push({
      id: String(doc._id),
      level: doc.level,
      name: getLeafName(doc),
      district: doc.district,
      query,
      confidence: chosen.confidence,
      coordinates: chosen.coordinates,
      cached: response.cached,
    });
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            coordinates: coordinateDoc,
            coordinatesMeta: {
              source: "google-geocode",
              confidence: chosen.confidence,
              query,
              formattedAddress: chosen.formattedAddress,
              placeId: chosen.placeId,
              derivedFromCount: 0,
              updatedAt: new Date(),
            },
            updatedAt: new Date(),
          },
        },
      },
    });

    if ((i + 1) % 25 === 0) console.log(`  geocoded ${i + 1}/${localityTargets.length}`);
  }

  const parentTargets = scopedDocs
    .filter((doc) => ["ward", "zone", "district"].includes(doc.level))
    .filter((doc) => inLevelScope(doc) && needsCoordinate(doc));

  for (const parent of parentTargets) {
    const children = childLocalitiesFor(parent, localities);
    const childCoords = children
      .map((child) => plannedCoords.get(coordKey(child)))
      .filter((coords) => Array.isArray(coords) && coords.length >= 2);
    const coverage = children.length ? childCoords.length / children.length : 0;

    if (!children.length || coverage < MIN_PARENT_COVERAGE) {
      skipped.push({
        id: String(parent._id),
        level: parent.level,
        district: parent.district,
        zone: parent.zone,
        ward: parent.ward,
        name: getLeafName(parent),
        reason: "insufficient-child-coordinate-coverage",
        childCount: children.length,
        childCoordinates: childCoords.length,
        coverage,
      });
      continue;
    }

    const coordinates = derivedCoordinate(childCoords);
    plannedCoords.set(coordKey(parent), coordinates);
    derived.push({
      id: String(parent._id),
      level: parent.level,
      name: getLeafName(parent),
      district: parent.district,
      childCount: children.length,
      coordinates,
    });
    ops.push({
      updateOne: {
        filter: { _id: parent._id },
        update: {
          $set: {
            coordinates: {
              type: "Point",
              coordinates,
            },
            coordinatesMeta: {
              source: "derived-from-children",
              confidence: "high",
              query: "",
              formattedAddress: "",
              placeId: "",
              derivedFromCount: childCoords.length,
              updatedAt: new Date(),
            },
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    db: dbName,
    mode: APPLY ? "apply" : "dry-run",
    force: FORCE,
    scope: {
      districts: DISTRICTS,
      levels: LEVELS,
      localityLimit: Number.isFinite(LIMIT) ? LIMIT : "all",
      minParentCoverage: MIN_PARENT_COVERAGE,
    },
    counts: {
      activeMasterlocations: docs.length,
      scopedMasterlocations: scopedDocs.length,
      localityTargets: localityTargets.length,
      acceptedGeocodes: accepted.length,
      reviewNeeded: review.length,
      derivedParents: derived.length,
      skippedParents: skipped.length,
      writesPlanned: ops.length,
    },
    accepted: accepted.slice(0, 100),
    review: review.slice(0, 500),
    derived: derived.slice(0, 200),
    skipped: skipped.slice(0, 500),
  };

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log("\nSummary:");
  console.log(`  Accepted locality geocodes: ${accepted.length}`);
  console.log(`  Review needed: ${review.length}`);
  console.log(`  Derived parent coordinates: ${derived.length}`);
  console.log(`  Skipped parents: ${skipped.length}`);
  console.log(`  Planned writes: ${ops.length}`);
  console.log(`  Report: ${REPORT_FILE}`);
  console.log(`  Cache: ${CACHE_FILE}`);

  if (APPLY && ops.length) {
    ensureSnapshot({ dbName, uri });
    const result = await masterLocationModel.bulkWrite(ops, { ordered: false });
    console.log(`\nUpdated masterlocations: ${result.modifiedCount + result.upsertedCount}`);
  } else if (APPLY) {
    console.log("\nNo writes needed.");
  } else {
    console.log(`\nDry run - no writes. Re-run with --apply to write after reviewing the report.`);
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
