import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { searchMasterLocation } from "./masterLocationHelper.js";
import { slugify as publicSlugify } from "../../slugify.js";

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ownNameOfLocation = (doc = {}) =>
  doc.locality || doc.ward || doc.zone || doc.district || doc.state || "";

const removeCoveredSlugPrefixes = (slugs = []) => {
  const sorted = [...new Set(slugs.filter(Boolean))]
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  const roots = [];

  for (const slug of sorted) {
    if (!roots.some((root) => slug === root || slug.startsWith(`${root}-`))) {
      roots.push(slug);
    }
  }

  return roots;
};

const buildSlugPrefixRegex = (slugs = []) => {
  const roots = removeCoveredSlugPrefixes(slugs);
  if (roots.length === 0) return null;
  const alternatives = roots.map(escapeRegex).join("|");
  return new RegExp(`^(?:${alternatives})(?:-|$)`);
};

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

// Expand a resolved location into its business-search scope. Most locations
// use their normal descendant slug prefix. A related search group can span
// sibling nodes (for example Thillai Nagar East/Main), in which case every
// member contributes its slug, broad address names, and pincodes.
export const resolveLocationSearchScope = async (resolvedLocation) => {
  if (!resolvedLocation?.slug) {
    return {
      slugPrefixRegex: null,
      slugPrefixes: [],
      addressNames: [],
      pincodes: [],
      searchGroupSlug: null,
    };
  }

  let locations = [resolvedLocation];
  const searchGroupSlug = resolvedLocation.searchGroupSlug || null;

  if (searchGroupSlug) {
    const groupedLocations = await masterLocationModel
      .find({ searchGroupSlug, isActive: true })
      .lean();
    if (groupedLocations.length > 0) locations = groupedLocations;
  }

  const slugPrefixes = removeCoveredSlugPrefixes(
    locations.map((location) => location.slug),
  );
  const groupNames = locations.flatMap((location) =>
    Array.isArray(location.searchGroupNames) ? location.searchGroupNames : [],
  );
  const fallbackNames = searchGroupSlug
    ? groupNames
    : [
        ownNameOfLocation(resolvedLocation),
        ...(resolvedLocation.alternateNames || []),
      ];
  const addressNames = [
    ...new Set(
      fallbackNames
        .map((name) => String(name || "").trim())
        .filter(Boolean),
    ),
  ];
  const pincodes = [
    ...new Set(
      locations
        .flatMap((location) => [
          location.pincode,
          ...(Array.isArray(location.pincodes) ? location.pincodes : []),
        ])
        .map((pincode) => String(pincode || "").trim())
        .filter((pincode) => /^\d{6}$/.test(pincode)),
    ),
  ];

  return {
    slugPrefixRegex: buildSlugPrefixRegex(slugPrefixes),
    slugPrefixes,
    addressNames,
    pincodes,
    searchGroupSlug,
  };
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

// ─── District-prefixed URL resolution ──────────────────────────────────────
// Resolves the /:district/:location segments of the district-prefixed URL
// scheme (/:district/:location/:category) against the `urlAlias` and
// `publicLocationSlug` fields written by
// server/scripts/backfillPublicLocationSlug.js. Distinct from
// resolveLocationForSearch() above: that function does fuzzy free-text
// matching for the search bar and accepts anything; these are strict,
// exact-match lookups for parsing an already-URL-shaped segment, and return
// null on no match rather than falling back to a fuzzy guess — a URL segment
// either names a real place or it doesn't.
//
// Uses `publicSlugify` (server/slugify.js), NOT the free-text `slugify` at
// the top of this file. The two disagree on punctuation and ampersands (see
// helper/location/locationSlug.js for examples), and `urlAlias` /
// `publicLocationSlug` were written using server/slugify.js — comparing
// against them with the wrong slugify would silently fail to match.

let districtDocsCache = null;
let districtDocsCacheAt = 0;
const DISTRICT_CACHE_TTL_MS = 5 * 60 * 1000;

// All active district-level docs, cached in-memory for a short TTL. Cheap to
// hold entirely in memory — there are only ~38 — and this is read on every
// request that touches a district-prefixed URL.
export const getAllDistrictDocs = async () => {
  const now = Date.now();
  if (districtDocsCache && now - districtDocsCacheAt < DISTRICT_CACHE_TTL_MS) {
    return districtDocsCache;
  }
  const docs = await masterLocationModel
    .find({ level: "district", isActive: true })
    .lean();
  districtDocsCache = docs;
  districtDocsCacheAt = now;
  return docs;
};

// Call after any admin edit to a district doc (urlAlias change, activation
// toggle) so the change is visible immediately instead of waiting out the TTL.
export const invalidateDistrictDocsCache = () => {
  districtDocsCache = null;
  districtDocsCacheAt = 0;
};

// Matches `urlAlias` first (e.g. "trichy" -> Tiruchirappalli), then falls
// back to the slugified district name. Re-slugifies the stored `urlAlias` at
// comparison time rather than trusting it's already in canonical form —
// cheap over ~38 in-memory docs, and protects against a hand-edited admin
// value that isn't perfectly slugified.
export const resolveDistrictBySlug = async (districtSlug) => {
  const slug = publicSlugify(districtSlug || "");
  if (!slug) return null;

  const districts = await getAllDistrictDocs();
  return (
    districts.find((d) => d.urlAlias && publicSlugify(d.urlAlias) === slug) ||
    districts.find((d) => publicSlugify(d.district) === slug) ||
    null
  );
};

// Depth used only to break a WITHIN-district, cross-level tie (a zone and an
// unrelated locality elsewhere in the district happening to share a
// publicLocationSlug — same-level collisions are already resolved by
// computePublicLocationSlugs at write time, see locationSlug.js). Locality
// wins as the most specific: someone typing a specific place name almost
// always means the specific place, not the broader area that happens to
// share its name.
const WITHIN_DISTRICT_LEVEL_DEPTH = { locality: 3, ward: 2, zone: 1 };

// One indexed query on {district, publicLocationSlug}. `districtDoc` must be
// a resolved district doc (from resolveDistrictBySlug), not a raw slug — the
// query matches on `district` (the plain name), not a slug, so the caller
// having already resolved the district is what makes this safe.
export const resolveLocationWithinDistrict = async (districtDoc, locationSlug) => {
  if (!districtDoc?.district || !locationSlug) return null;
  const slug = publicSlugify(locationSlug);
  if (!slug) return null;

  const candidates = await masterLocationModel
    .find({
      district: districtDoc.district,
      publicLocationSlug: slug,
      level: { $in: ["zone", "ward", "locality"] },
      isActive: true,
    })
    .lean();

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  candidates.sort(
    (a, b) =>
      (WITHIN_DISTRICT_LEVEL_DEPTH[b.level] || 0) -
      (WITHIN_DISTRICT_LEVEL_DEPTH[a.level] || 0)
  );
  return candidates[0];
};

// Composes the two above: resolves /:districtSlug[/:locationSlug] to their
// docs in one call. `locationSlug` is optional — omit it to resolve just the
// district (the /:district and /:district/:category route shapes).
// `locationDoc` resolves to null both when locationSlug was omitted AND when
// it was supplied but didn't match anything; callers that need to
// distinguish "no location in the URL" from "location segment didn't
// resolve" should check locationSlug truthiness themselves before calling.
export const resolveRouteLocation = async ({ districtSlug, locationSlug } = {}) => {
  const districtDoc = await resolveDistrictBySlug(districtSlug);
  if (!districtDoc) return { districtDoc: null, locationDoc: null };

  const locationDoc = locationSlug
    ? await resolveLocationWithinDistrict(districtDoc, locationSlug)
    : null;

  return { districtDoc, locationDoc };
};
