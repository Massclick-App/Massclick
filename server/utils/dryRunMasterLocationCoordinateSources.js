import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

// Read-only coordinate source report for masterlocations.
//
// This script does not write to MongoDB. It estimates which masterlocation
// localities can safely receive coordinates from linked business geo points,
// Google Maps lead points, or both.
//
// Examples:
//   node scripts/dryRunMasterLocationCoordinateSources.js
//   node scripts/dryRunMasterLocationCoordinateSources.js --districts=Karur,Perambalur
//   node scripts/dryRunMasterLocationCoordinateSources.js --min-gmaps=5 --cluster-km=3

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "..");
const PROD_DB = "massClick";

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

const usage = () => {
  console.log(`
Usage:
  node scripts/dryRunMasterLocationCoordinateSources.js [options]

Options:
  --uri=<mongodb-uri>           Overrides MONGO_URL/MC_URI.
  --db=<name>                   Overrides the database name in the URI path.
  --prod                        Required if --db=massClick or URI points at massClick.
  --districts=A,B               Scope to district names.
  --report=<path>               JSON report output.
  --include-insufficient        Include every insufficient locality in the report.
  --min-business=<n>            Business-only minimum points. Default: 2.
  --min-gmaps=<n>               GMaps-only minimum matching places. Default: 3.
  --cluster-km=<n>              Max p80 distance for a tight locality cluster. Default: 5.
  --agreement-km=<n>            Max distance between business and GMaps centers. Default: 3.
  --parent-cluster-km=<n>       Max p80 distance for tight derived parent group. Default: 10.
`);
};

if (args.help) {
  usage();
  process.exit(0);
}

const REPORT_FILE = path.resolve(
  args.report ||
    path.join(
      SERVER_ROOT,
      "reports",
      `masterlocation-coordinate-source-dry-run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    )
);

const DISTRICTS = args.districts
  ? String(args.districts).split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const INCLUDE_INSUFFICIENT = Boolean(args["include-insufficient"]);
const MIN_BUSINESS = Number(args["min-business"] || 2);
const MIN_GMAPS = Number(args["min-gmaps"] || 3);
const CLUSTER_KM = Number(args["cluster-km"] || 5);
const AGREEMENT_KM = Number(args["agreement-km"] || 3);
const PARENT_CLUSTER_KM = Number(args["parent-cluster-km"] || 10);

const validGeoQuery = (field) => ({
  [`${field}.coordinates.0`]: { $gte: 68, $lte: 98 },
  [`${field}.coordinates.1`]: { $gte: 6, $lte: 38 },
});

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizePlace = (value) =>
  normalizeText(value).replace(/\b(district|dt|city|municipality|taluk)\b/g, " ").replace(/\s+/g, " ").trim();

const unique = (items) => [...new Set(items.filter(Boolean))];

const median = (numbers) => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const roundPoint = (point) => point.map((value) => Number(value.toFixed(7)));

const haversineKm = (a, b) => {
  const rad = Math.PI / 180;
  const lat1 = a[1] * rad;
  const lat2 = b[1] * rad;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const centerOf = (points) => [median(points.map((p) => p[0])), median(points.map((p) => p[1]))];

const clusterStats = (points) => {
  if (!points.length) return null;
  const center = centerOf(points);
  const distances = points.map((p) => haversineKm(center, p)).sort((a, b) => a - b);
  return {
    center,
    p80Km: distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.8))],
    maxKm: distances[distances.length - 1],
  };
};

const increment = (obj, key, by = 1) => {
  obj[key] = (obj[key] || 0) + by;
};

const getMongoUri = () => {
  const uri = args.uri || process.env.MC_URI || process.env.MONGO_URL;
  if (!uri) throw new Error("Mongo URI missing. Set MONGO_URL/MC_URI or pass --uri.");

  const url = new URL(uri);
  if (args.db) url.pathname = `/${args.db}`;
  const dbName = url.pathname.replace(/^\//, "") || args.db || "";
  if (dbName === PROD_DB && !args.prod) {
    throw new Error("Refusing to read production massClick without --prod.");
  }
  return { uri: url.toString(), dbName };
};

const buildDistrictBucketMap = (masterDocs) => {
  const bucketToDistricts = new Map();
  for (const doc of masterDocs.filter((item) => item.level === "district")) {
    for (const raw of [doc.district, doc.urlAlias, ...(doc.alternateNames || [])]) {
      const key = normalizePlace(raw);
      if (!key) continue;
      if (!bucketToDistricts.has(key)) bucketToDistricts.set(key, new Set());
      bucketToDistricts.get(key).add(doc.district);
    }
  }
  return bucketToDistricts;
};

const makeLocalityNames = (location) =>
  unique([location.locality, ...(location.alternateNames || [])])
    .map(normalizeText)
    .filter((name) => name.length >= 4 && !/^\d+$/.test(name));

const main = async () => {
  const { uri, dbName } = getMongoUri();
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();

  const db = client.db(dbName);
  const masterlocations = db.collection("masterlocations");
  const businesslists = db.collection("businesslists");
  const gmapsLeads = db.collection("gmaps_leads");

  const districtFilter = DISTRICTS ? { district: { $in: DISTRICTS } } : {};
  const masterDocs = await masterlocations
    .find(
      { isActive: { $ne: false }, ...districtFilter },
      {
        projection: {
          district: 1,
          zone: 1,
          ward: 1,
          locality: 1,
          level: 1,
          slug: 1,
          pincode: 1,
          alternateNames: 1,
          urlAlias: 1,
          coordinates: 1,
        },
      }
    )
    .toArray();

  const localities = masterDocs.filter((doc) => doc.level === "locality" && doc.pincode);
  const localityBySlug = new Map(localities.map((doc) => [doc.slug, doc]));
  const districtBucketMap = buildDistrictBucketMap(masterDocs);

  const businessPointsBySlug = new Map();
  let businessValidRowsRead = 0;
  let businessRowsLinkedToLocality = 0;
  for await (const business of businesslists.find(
    {
      ...validGeoQuery("geoLocation"),
      isActive: { $ne: false },
      activeBusinesses: { $ne: false },
      businessesLive: { $ne: false },
      "masterLocation.slug": { $exists: true, $nin: [null, ""] },
      ...(DISTRICTS ? { "masterLocation.district": { $in: DISTRICTS } } : {}),
    },
    { projection: { geoLocation: 1, masterLocation: 1 } }
  )) {
    businessValidRowsRead++;
    const slug = business.masterLocation?.slug;
    if (!localityBySlug.has(slug)) continue;
    businessRowsLinkedToLocality++;
    if (!businessPointsBySlug.has(slug)) businessPointsBySlug.set(slug, []);
    businessPointsBySlug.get(slug).push(business.geoLocation.coordinates);
  }

  const pincodeRegex = /\b[1-9][0-9]{5}\b/g;
  const gmapsByDistrictPincode = new Map();
  let gmapsValidRowsRead = 0;
  let gmapsRowsBroadTamilNaduSkipped = 0;
  let gmapsRowsUnmappedLocationBucketSkipped = 0;
  let gmapsRowsLocationBucketMatched = 0;
  let gmapsRowsBucketMatchedWithPincode = 0;
  let gmapsDistrictPincodeRowsForMatching = 0;

  for await (const lead of gmapsLeads.find(validGeoQuery("geoLocation"), {
    projection: {
      formatted_address: 1,
      massclick_location: 1,
      geoLocation: 1,
      place_id: 1,
      name: 1,
    },
  })) {
    gmapsValidRowsRead++;
    const locationBucket = normalizePlace(lead.massclick_location);
    if (!locationBucket || locationBucket === "tamil nadu") {
      if (locationBucket === "tamil nadu") gmapsRowsBroadTamilNaduSkipped++;
      continue;
    }

    const districts = districtBucketMap.get(locationBucket);
    if (!districts || districts.size === 0) {
      gmapsRowsUnmappedLocationBucketSkipped++;
      continue;
    }

    gmapsRowsLocationBucketMatched++;
    const pincodes = unique(String(lead.formatted_address || "").match(pincodeRegex) || []);
    if (!pincodes.length) continue;
    gmapsRowsBucketMatchedWithPincode++;

    const normalizedAddress = normalizeText(lead.formatted_address);
    for (const district of districts) {
      if (DISTRICTS && !DISTRICTS.includes(district)) continue;
      for (const pincode of pincodes) {
        const key = `${district}\t${pincode}`;
        if (!gmapsByDistrictPincode.has(key)) gmapsByDistrictPincode.set(key, []);
        gmapsByDistrictPincode.get(key).push({
          address: normalizedAddress,
          point: lead.geoLocation.coordinates,
          placeId: lead.place_id || "",
        });
        gmapsDistrictPincodeRowsForMatching++;
      }
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    database: dbName,
    dryRunOnly: true,
    options: {
      districts: DISTRICTS || "all",
      minBusiness: MIN_BUSINESS,
      minGmaps: MIN_GMAPS,
      clusterKm: CLUSTER_KM,
      agreementKm: AGREEMENT_KM,
      parentClusterKm: PARENT_CLUSTER_KM,
      includeInsufficient: INCLUDE_INSUFFICIENT,
    },
    masterlocations: {
      activeTotal: masterDocs.length,
      activeLocalitiesWithPincode: localities.length,
      existingValidCoordinates: await masterlocations.countDocuments({
        ...validGeoQuery("coordinates"),
        ...districtFilter,
      }),
    },
    sourceCoverage: {
      businessValidRowsRead,
      businessRowsLinkedToLocality,
      gmapsValidRowsRead,
      gmapsRowsBroadTamilNaduSkipped,
      gmapsRowsUnmappedLocationBucketSkipped,
      gmapsRowsLocationBucketMatched,
      gmapsRowsBucketMatchedWithPincode,
      gmapsDistrictPincodeRowsForMatching,
    },
    localityDryRun: {},
    parentDryRun: {},
    byDistrict: {},
  };

  const candidates = [];
  const reviewRejects = [];
  const insufficient = [];
  const acceptedLocalityCenters = new Map();

  for (const location of localities) {
    const districtStats =
      summary.byDistrict[location.district] ||
      (summary.byDistrict[location.district] = {
        localities: 0,
        accepted: 0,
        highBoth: 0,
        businessOnly: 0,
        gmapsOnly: 0,
        lowSingleBusiness: 0,
        reviewSpread: 0,
        insufficient: 0,
      });
    districtStats.localities++;

    const businessPoints = businessPointsBySlug.get(location.slug) || [];
    const localityNames = makeLocalityNames(location);
    const leadRows = gmapsByDistrictPincode.get(`${location.district}\t${location.pincode}`) || [];
    const seenPlaces = new Set();
    const gmapsPoints = [];

    for (const lead of leadRows) {
      if (!localityNames.some((name) => lead.address.includes(name))) continue;
      const key = lead.placeId || lead.point.join(",");
      if (seenPlaces.has(key)) continue;
      seenPlaces.add(key);
      gmapsPoints.push(lead.point);
    }

    const businessStats = clusterStats(businessPoints);
    const gmapsStats = clusterStats(gmapsPoints);
    const combinedStats = clusterStats([...businessPoints, ...gmapsPoints]);

    let tier = "insufficient";
    let reason = "not enough matching points";
    let selectedPoint = null;
    let selectedStats = null;

    if (
      businessPoints.length >= MIN_BUSINESS &&
      gmapsPoints.length >= MIN_GMAPS &&
      businessStats.p80Km <= CLUSTER_KM &&
      gmapsStats.p80Km <= CLUSTER_KM &&
      haversineKm(businessStats.center, gmapsStats.center) <= AGREEMENT_KM
    ) {
      tier = "highBoth";
      reason = "business and gmaps clusters agree";
      selectedStats = combinedStats;
      selectedPoint = combinedStats.center;
    } else if (businessPoints.length >= MIN_BUSINESS && businessStats.p80Km <= CLUSTER_KM) {
      tier = "businessOnly";
      reason = "business cluster is tight";
      selectedStats = businessStats;
      selectedPoint = businessStats.center;
    } else if (gmapsPoints.length >= MIN_GMAPS && gmapsStats.p80Km <= CLUSTER_KM) {
      tier = "gmapsOnly";
      reason = "gmaps address cluster is tight";
      selectedStats = gmapsStats;
      selectedPoint = gmapsStats.center;
    } else if (
      businessPoints.length === 1 &&
      gmapsPoints.length >= MIN_GMAPS &&
      gmapsStats.p80Km <= CLUSTER_KM &&
      haversineKm(businessPoints[0], gmapsStats.center) <= AGREEMENT_KM
    ) {
      tier = "highBoth";
      reason = "single business point agrees with gmaps cluster";
      selectedStats = combinedStats;
      selectedPoint = combinedStats.center;
    } else if (businessPoints.length === 1 && gmapsPoints.length === 0) {
      tier = "lowSingleBusiness";
      reason = "one linked business point only";
      selectedStats = { center: businessPoints[0], p80Km: 0, maxKm: 0 };
      selectedPoint = businessPoints[0];
    } else if (
      (businessPoints.length >= MIN_BUSINESS && businessStats.p80Km > CLUSTER_KM) ||
      (gmapsPoints.length >= MIN_GMAPS && gmapsStats.p80Km > CLUSTER_KM)
    ) {
      tier = "reviewSpread";
      reason = "points are too spread out";
      selectedStats = combinedStats || businessStats || gmapsStats;
    }

    increment(summary.localityDryRun, tier);
    increment(districtStats, tier);

    const row = {
      slug: location.slug,
      district: location.district,
      zone: location.zone || "",
      ward: location.ward || "",
      locality: location.locality || "",
      pincode: location.pincode || "",
      tier,
      reason,
      sourceCounts: {
        business: businessPoints.length,
        gmaps: gmapsPoints.length,
      },
      businessCluster: businessStats
        ? {
            center: roundPoint(businessStats.center),
            p80Km: Number(businessStats.p80Km.toFixed(2)),
            maxKm: Number(businessStats.maxKm.toFixed(2)),
          }
        : null,
      gmapsCluster: gmapsStats
        ? {
            center: roundPoint(gmapsStats.center),
            p80Km: Number(gmapsStats.p80Km.toFixed(2)),
            maxKm: Number(gmapsStats.maxKm.toFixed(2)),
          }
        : null,
      selected: selectedPoint
        ? {
            coordinates: roundPoint(selectedPoint),
            p80Km: Number((selectedStats?.p80Km || 0).toFixed(2)),
            maxKm: Number((selectedStats?.maxKm || 0).toFixed(2)),
          }
        : null,
    };

    if (["highBoth", "businessOnly", "gmapsOnly", "lowSingleBusiness"].includes(tier)) {
      districtStats.accepted++;
      acceptedLocalityCenters.set(location.slug, {
        point: selectedPoint,
        district: location.district,
        zone: location.zone || "",
        ward: location.ward || "",
        tier,
      });
      candidates.push(row);
    } else if (tier === "reviewSpread") {
      reviewRejects.push(row);
    } else if (INCLUDE_INSUFFICIENT) {
      insufficient.push(row);
    }
  }

  const parentGroups = new Map();
  for (const item of acceptedLocalityCenters.values()) {
    const keys = [`${item.district}\t\t\tdistrict`];
    if (item.zone) keys.push(`${item.district}\t${item.zone}\t\tzone`);
    if (item.zone && item.ward) keys.push(`${item.district}\t${item.zone}\t${item.ward}\tward`);

    for (const key of keys) {
      if (!parentGroups.has(key)) parentGroups.set(key, []);
      parentGroups.get(key).push(item.point);
    }
  }

  const parentCandidates = [];
  const parentReview = [];
  const parentDryRun = { derivable3Plus: 0, derivable5Plus: 0, tight3Plus: 0, reviewSpread: 0 };

  for (const [key, points] of parentGroups.entries()) {
    const [district, zone, ward, level] = key.split("\t");
    const stats = clusterStats(points);
    const row = {
      level,
      district,
      zone,
      ward,
      childCoordinateCount: points.length,
      center: roundPoint(stats.center),
      p80Km: Number(stats.p80Km.toFixed(2)),
      maxKm: Number(stats.maxKm.toFixed(2)),
    };

    if (points.length >= 3) parentDryRun.derivable3Plus++;
    if (points.length >= 5) parentDryRun.derivable5Plus++;
    if (points.length >= 3 && stats.p80Km <= PARENT_CLUSTER_KM) {
      parentDryRun.tight3Plus++;
      parentCandidates.push(row);
    }
    if (points.length >= 3 && stats.p80Km > PARENT_CLUSTER_KM) {
      parentDryRun.reviewSpread++;
      parentReview.push(row);
    }
  }

  for (const row of Object.values(summary.byDistrict)) {
    row.acceptedPct = Number(((row.accepted / row.localities) * 100).toFixed(1));
  }

  summary.parentDryRun = parentDryRun;
  summary.acceptedCandidateCount = candidates.length;
  summary.reviewRejectCount = reviewRejects.length;
  summary.insufficientIncludedCount = insufficient.length;
  summary.parentCandidateCount = parentCandidates.length;
  summary.parentReviewCount = parentReview.length;
  summary.topDistrictsByAccepted = Object.entries(summary.byDistrict)
    .map(([district, row]) => ({ district, ...row }))
    .sort((a, b) => b.accepted - a.accepted)
    .slice(0, 15);
  summary.lowestDistrictsByAcceptedPct = Object.entries(summary.byDistrict)
    .filter(([, row]) => row.localities >= 20)
    .map(([district, row]) => ({ district, ...row }))
    .sort((a, b) => a.acceptedPct - b.acceptedPct)
    .slice(0, 12);

  const report = {
    summary,
    candidates,
    reviewRejects,
    parentCandidates,
    parentReview,
    insufficient,
  };

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReport written: ${REPORT_FILE}`);

  await client.close();
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
