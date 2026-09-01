import { ObjectId } from "mongodb";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { computePublicLocationSlugs } from "./locationSlug.js";

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// slug, hierarchyPath, keywords and level are always derived from the
// hierarchy fields so they can never drift out of sync with each other.
const buildDerivedFields = (data) => {
  const parts = [data.state, data.district, data.zone, data.ward, data.locality].filter(Boolean);

  let level = "district";
  if (data.locality) level = "locality";
  else if (data.ward) level = "ward";
  else if (data.zone) level = "zone";

  const alternates = Array.isArray(data.alternateNames) ? data.alternateNames : [];

  const keywords = [
    ...[data.locality, data.ward, data.zone].filter(Boolean),
    ...alternates,
  ].map((k) => k.toLowerCase().trim()).filter(Boolean);

  return {
    slug: parts.map(slugify).join("-"),
    hierarchyPath: parts.join(" > "),
    keywords: [...new Set(keywords)],
    level,
  };
};

const normalize = (reqBody = {}) => {
  const data = { ...reqBody };

  [
    "state",
    "district",
    "zone",
    "ward",
    "locality",
    "pincode",
    "searchGroupSlug",
  ].forEach((field) => {
    if (typeof data[field] === "string") data[field] = data[field].trim();
    if (data[field] === "") data[field] = null;
  });

  // alternateNames arrives as an array or a comma-separated string
  if (typeof data.alternateNames === "string") {
    data.alternateNames = data.alternateNames.split(",").map((a) => a.trim()).filter(Boolean);
  }
  if (typeof data.searchGroupNames === "string") {
    data.searchGroupNames = data.searchGroupNames.split(",").map((a) => a.trim()).filter(Boolean);
  }

  return data;
};

export const createMasterLocation = async (reqBody = {}) => {
  const data = normalize(reqBody);

  if (!data.state) throw new Error("State is required");
  if (!data.district) throw new Error("District is required");
  if (!data.zone) throw new Error("Zone is required");

  const derived = buildDerivedFields(data);

  const duplicate = await masterLocationModel.findOne({ slug: derived.slug }).lean();
  if (duplicate) {
    throw new Error(`Location "${derived.hierarchyPath}" already exists.`);
  }

  const document = new masterLocationModel({ ...data, ...derived });
  return document.save();
};

export const viewMasterLocation = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid location ID");

  const location = await masterLocationModel.findById(id).lean();
  if (!location) throw new Error("Location not found");
  return location;
};

// Shared by viewAllMasterLocation and viewMasterLocationsWithBusinessStats so
// the two admin list views can never drift apart on what a filter means.
const buildMasterLocationQuery = ({
  search,
  status,
  reviewStatus,
  importSource,
  origin,
  level,
  district,
  zone,
  ward,
  locality,
  pincode,
  pincodeStatus,
}) => {
  const query = {};
  const andConditions = [];

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  // Lets the admin pull up just the bulk-imported backlog ("pending") rather
  // than every inactive doc, which would also include deleted ones.
  if (reviewStatus && reviewStatus !== "all") query.reviewStatus = reviewStatus;
  if (importSource && importSource !== "all") query.importSource = importSource;
  if (origin === "google") query.importSource = { $regex: "^gmaps", $options: "i" };
  if (origin === "non-google") {
    andConditions.push({
      $or: [
        { importSource: { $exists: false } },
        { importSource: null },
        { importSource: "" },
        { importSource: { $not: /^gmaps/i } },
      ],
    });
  }
  if (level && level !== "all") query.level = level;
  if (district && district.trim() !== "") {
    query.district = { $regex: `^${escapeRegex(district.trim())}$`, $options: "i" };
  }
  if (zone && zone.trim() !== "") {
    query.zone = { $regex: `^${escapeRegex(zone.trim())}$`, $options: "i" };
  }
  if (ward && ward.trim() !== "") {
    query.ward = { $regex: `^${escapeRegex(ward.trim())}$`, $options: "i" };
  }
  if (locality && locality.trim() !== "") {
    query.locality = { $regex: `^${escapeRegex(locality.trim())}$`, $options: "i" };
  }

  if (search && search.trim() !== "") {
    const term = escapeRegex(search.trim());
    andConditions.push({ $or: [
      { keywords: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
      { hierarchyPath: { $regex: term, $options: "i" } },
      { searchGroupSlug: { $regex: term, $options: "i" } },
      { searchGroupNames: { $regex: term, $options: "i" } },
      { pincode: { $regex: term, $options: "i" } },
      { pincodes: { $regex: term, $options: "i" } },
    ] });
  }

  if (pincode && pincode.trim() !== "") {
    const term = escapeRegex(pincode.trim());
    andConditions.push({ $or: [
      { pincode: { $regex: term, $options: "i" } },
      { pincodes: { $regex: term, $options: "i" } },
    ] });
  }

  if (pincodeStatus === "with") {
    andConditions.push({ $or: [
      { pincode: { $nin: [null, ""] } },
      { pincodes: { $exists: true, $ne: [] } },
    ] });
  }
  if (pincodeStatus === "without") {
    andConditions.push({
      $and: [
        { $or: [{ pincode: { $exists: false } }, { pincode: null }, { pincode: "" }] },
        { $or: [{ pincodes: { $exists: false } }, { pincodes: { $size: 0 } }] },
      ],
    });
  }

  if (andConditions.length) query.$and = andConditions;
  return query;
};

const LOCATION_SORTABLE_FIELDS = new Set([
  "district",
  "zone",
  "ward",
  "locality",
  "level",
  "pincode",
  "reviewStatus",
  "importSource",
  "slug",
  "hierarchyPath",
  "createdAt",
  "updatedAt",
]);

export const viewAllMasterLocation = async ({
  pageNo,
  pageSize,
  search,
  status,
  reviewStatus,
  importSource,
  origin,
  level,
  district,
  zone,
  ward,
  locality,
  pincode,
  pincodeStatus,
  sortBy,
  sortOrder,
}) => {
  const query = buildMasterLocationQuery({
    search, status, reviewStatus, importSource, origin, level,
    district, zone, ward, locality, pincode, pincodeStatus,
  });

  const sortQuery = sortBy && LOCATION_SORTABLE_FIELDS.has(sortBy) ? { [sortBy]: sortOrder } : { slug: 1 };

  const total = await masterLocationModel.countDocuments(query);

  const list = await masterLocationModel
    .find(query)
    .sort(sortQuery)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { list, total };
};

// Number of businesses shown inline per location row — a compact preview,
// not the full list. The exact businessCount is always returned alongside it
// so the UI can tell "5 shown" from "5 total".
const BUSINESS_PREVIEW_LIMIT = 5;

/**
 * Same location list as viewAllMasterLocation, but with each row's linked
 * business count/preview joined in, and an optional businessCoverage filter
 * ("has" / "needs") applied on top of it.
 *
 * The join is strict FK only (business.masterLocation.locationId === this
 * location's _id) — deliberately not a free-text fallback. ~96.5% of
 * businesses already carry the structured link; the remainder (mostly older
 * records with only district/town-level free text) are left uncounted here
 * rather than guessed at.
 */
export const viewMasterLocationsWithBusinessStats = async ({
  pageNo,
  pageSize,
  search,
  status,
  reviewStatus,
  importSource,
  origin,
  level,
  district,
  zone,
  ward,
  locality,
  pincode,
  pincodeStatus,
  category,
  businessCoverage,
  sortBy,
  sortOrder,
}) => {
  const query = buildMasterLocationQuery({
    search, status, reviewStatus, importSource, origin, level,
    district, zone, ward, locality, pincode, pincodeStatus,
  });

  const isSortable = sortBy && (sortBy === "businessCount" || LOCATION_SORTABLE_FIELDS.has(sortBy));
  const sortQuery = isSortable ? { [sortBy]: sortOrder } : { slug: 1 };

  // Businesses are one-document-per-category (a listing in 9 categories is 9
  // documents), so "does this location have a business" is meaningless across
  // 500+ categories at once — scoping to one category is what makes the
  // has/needs signal actionable rather than a wall of green badges.
  const businessMatch = { $expr: { $eq: ["$masterLocation.locationId", "$$locId"] } };
  if (category && category.trim() !== "") {
    businessMatch.category = { $regex: `^${escapeRegex(category.trim())}$`, $options: "i" };
  }

  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: businessListModel.collection.name,
        let: { locId: "$_id" },
        pipeline: [
          { $match: businessMatch },
          { $project: { businessName: 1, isActive: 1, category: 1 } },
        ],
        as: "businesses",
      },
    },
    { $addFields: { businessCount: { $size: "$businesses" } } },
  ];

  if (businessCoverage === "has") pipeline.push({ $match: { businessCount: { $gt: 0 } } });
  if (businessCoverage === "needs") pipeline.push({ $match: { businessCount: 0 } });

  pipeline.push({ $sort: sortQuery });

  pipeline.push({
    $facet: {
      data: [
        { $skip: (pageNo - 1) * pageSize },
        { $limit: pageSize },
        { $addFields: { businesses: { $slice: ["$businesses", BUSINESS_PREVIEW_LIMIT] } } },
      ],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await masterLocationModel.aggregate(pipeline);
  const list = result?.data || [];
  const total = result?.totalCount?.[0]?.count || 0;

  return { list, total, businessPreviewLimit: BUSINESS_PREVIEW_LIMIT };
};

// Per-location category breakdown for the "what's covered / what's missing"
// drill-down: which of the ~550 active categories already have a business
// linked to THIS one location (with a count each), and which have none.
// Categories are matched case-insensitively since business.category is
// free-typed at creation time rather than a reference to the category doc.
export const getLocationCategoryCoverage = async (locationId) => {
  if (!ObjectId.isValid(locationId)) throw new Error("Invalid location ID");

  const location = await masterLocationModel.findById(locationId).lean();
  if (!location) throw new Error("Location not found");

  const [presentCounts, allCategories] = await Promise.all([
    businessListModel.aggregate([
      { $match: { "masterLocation.locationId": new ObjectId(locationId) } },
      { $group: { _id: { $toLower: "$category" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    categoryModel.find({ isActive: true }, { category: 1 }).sort({ category: 1 }).lean(),
  ]);

  const countByLowerCategory = new Map(presentCounts.map((row) => [row._id, row.count]));
  const knownKeys = new Set();

  const present = [];
  const missing = [];
  for (const cat of allCategories) {
    const key = (cat.category || "").toLowerCase();
    knownKeys.add(key);
    const count = countByLowerCategory.get(key);
    if (count) present.push({ category: cat.category, count });
    else missing.push(cat.category);
  }

  // Business categories not matching any active category doc (renamed,
  // deactivated, or a data-entry variant) — included so they aren't silently
  // dropped from the count, not just the active category list.
  for (const row of presentCounts) {
    if (!knownKeys.has(row._id)) present.push({ category: row._id, count: row.count });
  }
  present.sort((a, b) => b.count - a.count);

  return {
    location: {
      id: location._id,
      name: location.locality || location.ward || location.zone || location.district,
      hierarchyPath: location.hierarchyPath,
    },
    present,
    missing,
    totalCategories: allCategories.length,
  };
};

// Distinct existing values for one hierarchy field, scoped by its parents —
// powers the admin form's cascading autocomplete so a new entry's Zone/Ward
// text matches an existing doc's spelling exactly instead of silently
// forking the hierarchy (a Zone/Ward field is plain text, not a reference).
const DISTINCT_FIELDS = ["district", "zone", "ward", "locality", "importSource"];

export const listDistinctMasterLocationValues = async ({
  field,
  district,
  zone,
  ward,
  status = "active",
  reviewStatus = "all",
  importSource = "all",
  origin = "all",
}) => {
  if (!DISTINCT_FIELDS.includes(field)) throw new Error("Invalid field");

  const query = { [field]: { $nin: [null, ""] } };
  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (reviewStatus && reviewStatus !== "all") query.reviewStatus = reviewStatus;
  if (importSource && importSource !== "all" && field !== "importSource") query.importSource = importSource;
  if (origin === "google") query.importSource = { $regex: "^gmaps", $options: "i" };
  if (origin === "non-google") {
    query.$or = [
      { importSource: { $exists: false } },
      { importSource: null },
      { importSource: "" },
      { importSource: { $not: /^gmaps/i } },
    ];
  }
  if (district && district.trim()) query.district = { $regex: `^${escapeRegex(district.trim())}$`, $options: "i" };
  if (zone && zone.trim()) query.zone = { $regex: `^${escapeRegex(zone.trim())}$`, $options: "i" };
  if (ward && ward.trim()) query.ward = { $regex: `^${escapeRegex(ward.trim())}$`, $options: "i" };

  const values = await masterLocationModel.distinct(field, query);
  return values.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

// Resolve free text ("kk nagar", "manaparai", "trichy") to a location, then
// expose its slug so callers can prefix-match businesses at any hierarchy level.
// Ranked exact > prefix > substring match first, so a term like "mettu" surfaces
// "Mettur"/"Metturdam" (prefix hits) ahead of "Sundamettupudur" (mid-string hit)
// instead of results being decided by which district's slug sorts first.
export const searchMasterLocation = async (text, limit = 10) => {
  const term = (text || "").toLowerCase().trim();
  if (!term) return [];
  const hierarchyTokens = term
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const hierarchyTokenMatch = {
    $and: hierarchyTokens.map((token) => ({
      hierarchyPath: {
        $regex: escapeRegex(token),
        $options: "i",
      },
    })),
  };

  return masterLocationModel.aggregate([
    {
      $match: {
        isActive: true,
        $or: [
          { keywords: term },
          { keywords: { $regex: term, $options: "i" } },
          { slug: { $regex: slugify(term), $options: "i" } },
          { pincode: term },
          hierarchyTokenMatch,
        ],
      },
    },
    {
      $addFields: {
        // keywords[0] is always the doc's own name (locality, or ward/zone
        // for parent-level docs) — see buildDerivedFields. Matching there
        // outranks a match that's only inherited from a parent's name, so
        // e.g. "Mettur" and "Metturdam" beat every other locality that just
        // happens to sit inside the Mettur zone.
        _rank: {
          $switch: {
            branches: [
              { case: { $in: [term, "$keywords"] }, then: 0 },
              { case: { $eq: [{ $indexOfCP: [{ $arrayElemAt: ["$keywords", 0] }, term] }, 0] }, then: 1 },
              {
                case: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$keywords",
                          as: "k",
                          cond: { $eq: [{ $indexOfCP: ["$$k", term] }, 0] },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: 2,
              },
            ],
            default: 3,
          },
        },
      },
    },
    { $sort: { _rank: 1, level: 1, slug: 1 } },
    { $limit: limit },
    { $project: { _rank: 0 } },
  ]);
};

export const updateMasterLocation = async (id, reqBody = {}) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid location ID");

  const existing = await masterLocationModel.findById(id).lean();
  if (!existing) throw new Error("Location not found");

  const data = normalize(reqBody);
  const merged = { ...existing, ...data };
  const derived = buildDerivedFields(merged);

  const duplicate = await masterLocationModel
    .findOne({ slug: derived.slug, _id: { $ne: new ObjectId(id) } })
    .lean();
  if (duplicate) {
    throw new Error(`Location "${derived.hierarchyPath}" already exists.`);
  }

  const location = await masterLocationModel.findByIdAndUpdate(
    id,
    { ...data, ...derived, updatedAt: new Date() },
    { new: true }
  );
  return location;
};

export const deleteMasterLocation = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid location ID");

  const deleted = await masterLocationModel.findByIdAndUpdate(
    id,
    { isActive: false, reviewStatus: "rejected", updatedAt: new Date() },
    { new: true }
  );
  if (!deleted) throw new Error("Location not found");
  // an active sibling disappeared, so the qualified/unqualified public slugs
  // of the remaining ones may change
  await refreshPublicLocationSlugs(deleted.district);
  return deleted;
};

/**
 * Recompute publicLocationSlug for every ACTIVE doc in a district.
 *
 * publicLocationSlug cannot be derived one document at a time: when two
 * places in a district share a bare name, each has to be qualified by its
 * parent ("anna-nagar-ariyamangalam"), which is only knowable by looking at
 * all siblings together. Any change to which docs are active therefore
 * invalidates the whole district's slugs, so enable, disable and delete all
 * call this.
 */
export const refreshPublicLocationSlugs = async (district) => {
  if (!district) return 0;

  const docs = await masterLocationModel
    .find({ district, isActive: true })
    .lean();

  const districtUrlSlugByName = new Map();
  for (const d of docs) {
    if (d.level === "district" && d.urlAlias) {
      districtUrlSlugByName.set(d.district, d.urlAlias);
    }
  }

  const computed = computePublicLocationSlugs(docs, districtUrlSlugByName);

  const ops = [];
  for (const doc of docs) {
    const next = computed.get(String(doc._id)) || "";
    if (next !== (doc.publicLocationSlug || "")) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { publicLocationSlug: next, updatedAt: new Date() } },
        },
      });
    }
  }
  if (ops.length) await masterLocationModel.bulkWrite(ops, { ordered: false });
  return ops.length;
};

/**
 * Enable or disable a location.
 *
 * isActive is the gate every public read path already filters on, so flipping
 * it is what actually takes a location in or out of search, URLs and
 * sitemaps. reviewStatus records WHY it is in that state, which isActive
 * alone cannot express — deleteMasterLocation() also sets isActive: false.
 */
export const setMasterLocationActive = async (id, isActive) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid location ID");

  const location = await masterLocationModel.findByIdAndUpdate(
    id,
    {
      isActive: Boolean(isActive),
      reviewStatus: isActive ? "approved" : "pending",
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!location) throw new Error("Location not found");

  const slugsUpdated = await refreshPublicLocationSlugs(location.district);
  return { location, slugsUpdated };
};

/**
 * Enable or disable many locations at once, for working through a review
 * queue. Slugs are recomputed once per affected district at the end rather
 * than per document.
 */
export const setManyMasterLocationsActive = async (ids = [], isActive) => {
  const valid = ids.filter((id) => ObjectId.isValid(id));
  if (!valid.length) throw new Error("No valid location IDs supplied");

  const targets = await masterLocationModel
    .find({ _id: { $in: valid } }, { district: 1 })
    .lean();

  const result = await masterLocationModel.updateMany(
    { _id: { $in: valid } },
    {
      $set: {
        isActive: Boolean(isActive),
        reviewStatus: isActive ? "approved" : "pending",
        updatedAt: new Date(),
      },
    }
  );

  let slugsUpdated = 0;
  for (const district of new Set(targets.map((t) => t.district).filter(Boolean))) {
    slugsUpdated += await refreshPublicLocationSlugs(district);
  }
  return { matched: result.matchedCount, modified: result.modifiedCount, slugsUpdated };
};
