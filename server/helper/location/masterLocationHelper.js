import { ObjectId } from "mongodb";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";

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

  ["state", "district", "zone", "ward", "locality", "pincode"].forEach((field) => {
    if (typeof data[field] === "string") data[field] = data[field].trim();
    if (data[field] === "") data[field] = null;
  });

  // alternateNames arrives as an array or a comma-separated string
  if (typeof data.alternateNames === "string") {
    data.alternateNames = data.alternateNames.split(",").map((a) => a.trim()).filter(Boolean);
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

export const viewAllMasterLocation = async ({
  pageNo,
  pageSize,
  search,
  status,
  level,
  district,
  pincode,
  sortBy,
  sortOrder,
}) => {
  const query = {};
  const andConditions = [];

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (level && level !== "all") query.level = level;
  if (district && district.trim() !== "") {
    query.district = { $regex: `^${escapeRegex(district.trim())}$`, $options: "i" };
  }

  if (search && search.trim() !== "") {
    const term = escapeRegex(search.trim());
    andConditions.push({ $or: [
      { keywords: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
      { hierarchyPath: { $regex: term, $options: "i" } },
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

  if (andConditions.length) query.$and = andConditions;

  const sortQuery = sortBy ? { [sortBy]: sortOrder } : { slug: 1 };

  const total = await masterLocationModel.countDocuments(query);

  const list = await masterLocationModel
    .find(query)
    .sort(sortQuery)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { list, total };
};

// Distinct existing values for one hierarchy field, scoped by its parents —
// powers the admin form's cascading autocomplete so a new entry's Zone/Ward
// text matches an existing doc's spelling exactly instead of silently
// forking the hierarchy (a Zone/Ward field is plain text, not a reference).
const DISTINCT_FIELDS = ["district", "zone", "ward", "locality"];

export const listDistinctMasterLocationValues = async ({ field, district, zone, ward }) => {
  if (!DISTINCT_FIELDS.includes(field)) throw new Error("Invalid field");

  const query = { isActive: true, [field]: { $ne: null } };
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

  return masterLocationModel.aggregate([
    {
      $match: {
        isActive: true,
        $or: [
          { keywords: term },
          { keywords: { $regex: term, $options: "i" } },
          { slug: { $regex: slugify(term), $options: "i" } },
          { pincode: term },
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
    { isActive: false, updatedAt: new Date() },
    { new: true }
  );
  if (!deleted) throw new Error("Location not found");
  return deleted;
};
