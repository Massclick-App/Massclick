import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { searchMasterLocation } from "./masterLocationHelper.js";

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Resolve a location string from the search UI or a URL to a single
// masterlocation node. Tried in precision order — an exact slug (sent by the
// verified-locations autocomplete) never falls through to fuzzy matching.
export const resolveLocationForSearch = async (text) => {
  const term = (text || "").toLowerCase().trim();
  if (!term) return null;

  const bySlug = await masterLocationModel
    .findOne({ slug: slugify(term), isActive: true })
    .lean();
  if (bySlug) return bySlug;

  // District docs don't carry their own name in `keywords` (only alternate
  // spellings — see buildDerivedFields), so match the district name directly.
  const byDistrict = await masterLocationModel
    .findOne({
      level: "district",
      district: new RegExp(`^${escapeRegex(term)}$`, "i"),
      isActive: true,
    })
    .lean();
  if (byDistrict) return byDistrict;

  // Exact name/alternate match. Prefer the shallowest doc: "salem" should
  // resolve to the district, not a ward that carries "salem" as a keyword.
  const byKeyword = await masterLocationModel
    .find({ keywords: term, isActive: true })
    .lean();
  if (byKeyword.length > 0) {
    const depth = { state: 0, district: 1, zone: 2, ward: 3, locality: 4 };
    byKeyword.sort((a, b) => depth[a.level] - depth[b.level]);
    return byKeyword[0];
  }

  if (/^\d{6}$/.test(term)) {
    const { node } = await resolveByPincode(term);
    if (node) return node;
  }

  const ranked = await searchMasterLocation(term, 1);
  return ranked[0] || null;
};

// Resolve a pincode to the deepest node that covers ALL localities sharing
// it. A pincode usually spans several localities, so this walks up: one
// locality → that locality; several in one ward → the ward; one zone → the
// zone; otherwise the district. Returns the matched localities too so the
// backfill can log ambiguity.
export const resolveByPincode = async (pincode) => {
  const code = (pincode || "").trim();
  if (!/^\d{6}$/.test(code)) return { node: null, matchedLocalities: [] };

  const localities = await masterLocationModel
    .find({ pincode: code, level: "locality", isActive: true })
    .lean();

  if (localities.length === 0) return { node: null, matchedLocalities: [] };
  if (localities.length === 1) return { node: localities[0], matchedLocalities: localities };

  const shared = (field) => {
    const values = new Set(localities.map((l) => l[field]));
    return values.size === 1 && !values.has(null) ? localities[0][field] : null;
  };

  const district = shared("district");
  const zone = shared("zone");
  const ward = shared("ward");

  let query = null;
  if (district && zone && ward) query = { district, zone, ward, level: "ward" };
  else if (district && zone) query = { district, zone, level: "zone" };
  else if (district) query = { district, level: "district" };

  const node = query
    ? await masterLocationModel.findOne({ ...query, isActive: true }).lean()
    : null;

  return { node, matchedLocalities: localities };
};

// --- Text matching against location names -------------------------------
// Used by the backfill to read street/location/globalAddress text and find
// which known location names appear in it.

const LEVEL_DEPTH = { state: 0, district: 1, zone: 2, ward: 3, locality: 4 };

export const ownNameOf = (doc) =>
  doc.locality || doc.ward || doc.zone || doc.district || doc.state;

// Space-padded, punctuation-free lowercase so `includes` only hits on whole
// words: " 21 b woraiyur main road trichy " contains " woraiyur " but a
// locality "Ur" can never match inside "Woraiyur".
export const normalizeForMatch = (text) =>
  " " + (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";

// Pre-compute each doc's matchable names (own name + alternates). Names
// shorter than minLen are dropped — 3-letter fragments false-match too often.
export const buildNameEntries = (docs, minLen = 4) =>
  docs
    .map((doc) => ({
      doc,
      names: [ownNameOf(doc), ...(doc.alternateNames || [])]
        .filter((n) => n && n.trim().length >= minLen)
        .map((n) => normalizeForMatch(n)),
    }))
    .filter((e) => e.names.length > 0);

// All entries whose name appears in the haystack, best first: longest matched
// name wins (most specific), deeper hierarchy level breaks ties.
export const findTextMatches = (haystack, entries) => {
  const matches = [];
  for (const { doc, names } of entries) {
    let best = null;
    for (const name of names) {
      if (haystack.includes(name) && (!best || name.length > best.length)) best = name;
    }
    if (best) matches.push({ doc, name: best.trim() });
  }
  return matches.sort(
    (a, b) =>
      b.name.length - a.name.length ||
      LEVEL_DEPTH[b.doc.level] - LEVEL_DEPTH[a.doc.level]
  );
};

// Shape a masterlocation doc into the `masterLocation` subdocument stored on
// a business (see businessListSchema).
export const buildMasterLocationBlock = (node, { confidence, source }) => ({
  locationId: node._id,
  slug: node.slug,
  state: node.state || null,
  district: node.district || null,
  zone: node.zone || null,
  ward: node.ward || null,
  locality: node.locality || null,
  resolvedLevel: node.level,
  confidence,
  source,
  linkedAt: new Date(),
});
