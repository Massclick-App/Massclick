import categoryModel from "../../model/category/categoryModel.js";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { slugify } from "../../slugify.js";
import {
  getDistrictUrlSlug,
  getLocationUrlPath,
  getLocationUrlSegment,
} from "./locationSlug.js";
import { matchGroupBySlug } from "../category/categoryHierarchyHelper.js";

export const LOCATION_CATEGORY_SEPARATOR = "-in-";

// Segment count -> level still holds for the common case (locationSlug.js's
// computeLocationUrlParts only ever SHORTENS a path, never reorders one),
// and resolveLocationPathWithinDistrict below prefers it first — this is
// what keeps a ward and a same-named child locality resolving to their own
// separate pages even though their bare text can coincide (a ward-target
// path is always 1 segment shorter than the matching locality's). It's only
// a PREFERENCE, not a hard requirement: a zone matching its own district
// folds away entirely (see computeLocationUrlParts), which shortens every
// path beneath that zone by one segment, so a folded ward's own path is 1
// segment instead of the normal 2 — resolveLocationPathWithinDistrict falls
// back to matching any level once the expected one comes up empty.
const MAX_LOCATION_PATH_SEGMENTS = 3;

let categorySlugSetCache = null;
let categorySlugSetCacheAt = 0;
let locationUrlCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const pathSegments = (value = "") => {
  const values = Array.isArray(value) ? value : String(value || "").split("/");
  return values.map((part) => slugify(decodeURIComponent(String(part || "")))).filter(Boolean);
};

const getCategorySlugSet = async () => {
  const now = Date.now();
  if (categorySlugSetCache && now - categorySlugSetCacheAt < CACHE_TTL_MS) {
    return categorySlugSetCache;
  }

  const categories = await categoryModel
    .find({ isActive: true }, { category: 1, slug: 1 })
    .lean();

  const slugs = new Set(
    categories
      .flatMap((category) => [category.slug, slugify(category.category || "")])
      .map((slug) => slugify(slug || ""))
      .filter(Boolean),
  );

  categorySlugSetCache = slugs;
  categorySlugSetCacheAt = now;
  return slugs;
};

export const isKnownCategorySlug = async (slug = "") => {
  const normalized = slugify(slug);
  if (!normalized) return false;
  const categorySlugs = await getCategorySlugSet();
  return categorySlugs.has(normalized);
};

export const splitLocationCategorySegment = async (segment = "") => {
  const normalized = slugify(segment);
  if (!normalized.includes(LOCATION_CATEGORY_SEPARATOR)) return null;

  const categorySlugs = await getCategorySlugSet();
  let bestMatch = null;

  for (const categorySlug of categorySlugs) {
    const prefix = `${categorySlug}${LOCATION_CATEGORY_SEPARATOR}`;
    if (!normalized.startsWith(prefix)) continue;
    const locationSlug = normalized.slice(prefix.length);
    if (!locationSlug) continue;
    if (!bestMatch || categorySlug.length > bestMatch.categorySlug.length) {
      bestMatch = { categorySlug, locationSlug };
    }
  }

  if (bestMatch) return bestMatch;

  const separatorIndex = normalized.lastIndexOf(LOCATION_CATEGORY_SEPARATOR);
  if (separatorIndex <= 0) return null;

  const categorySlug = normalized.slice(0, separatorIndex);
  const locationSlug = normalized.slice(separatorIndex + LOCATION_CATEGORY_SEPARATOR.length);
  if (!categorySlug || !locationSlug) return null;
  return { categorySlug, locationSlug };
};

export const buildLocationCategorySegment = ({
  categorySlug = "",
  subcategorySlug = "",
  locationSlug = "",
} = {}) => {
  const finalCategorySlug = slugify(subcategorySlug || categorySlug);
  const targetSlug = slugify(locationSlug);
  if (!finalCategorySlug || !targetSlug) return "";
  return `${finalCategorySlug}${LOCATION_CATEGORY_SEPARATOR}${targetSlug}`;
};

export const buildLocationPath = ({ districtDoc = null, districtSlug = "", locationDoc = null } = {}) => {
  const resolvedDistrictSlug = slugify(districtSlug) || (districtDoc ? getDistrictUrlSlug(districtDoc) : "");
  if (!resolvedDistrictSlug) return "/";
  const locationPath = locationDoc ? getLocationUrlPath(locationDoc) : "";
  return `/${[resolvedDistrictSlug, locationPath].filter(Boolean).join("/")}`;
};

export const buildLocationCategoryPath = ({
  districtDoc = null,
  districtSlug = "",
  locationDoc = null,
  locationPath = "",
  locationSlug = "",
  categorySlug = "",
  subcategorySlug = "",
} = {}) => {
  const resolvedDistrictSlug =
    slugify(districtSlug) ||
    (districtDoc ? getDistrictUrlSlug(districtDoc) : "") ||
    (locationDoc ? slugify(locationDoc.district || "") : "");
  const finalCategorySlug = slugify(subcategorySlug || categorySlug);
  if (!resolvedDistrictSlug || !finalCategorySlug) return "/";

  const locationPathParts = pathSegments(locationPath);
  const resolvedLocationPath = locationDoc
    ? getLocationUrlPath(locationDoc, { includeTarget: false })
    : locationPathParts.slice(0, -1).join("/");
  const resolvedLocationSlug = locationDoc
    ? getLocationUrlSegment(locationDoc)
    : slugify(locationPathParts.slice(-1)[0] || locationSlug || "");

  if (!resolvedLocationSlug || resolvedLocationSlug === resolvedDistrictSlug) {
    return `/${[resolvedDistrictSlug, finalCategorySlug].filter(Boolean).join("/")}`;
  }

  const categoryInLocation = buildLocationCategorySegment({
    categorySlug: finalCategorySlug,
    locationSlug: resolvedLocationSlug,
  });

  return `/${[resolvedDistrictSlug, resolvedLocationPath, categoryInLocation]
    .filter(Boolean)
    .join("/")}`;
};

const getLocationUrlEntriesForDistrict = async (districtDoc) => {
  if (!districtDoc?.district) return new Map();

  const cacheKey = String(districtDoc._id || districtDoc.district);
  const now = Date.now();
  const cached = locationUrlCache.get(cacheKey);
  if (cached && now - cached.builtAt < CACHE_TTL_MS) return cached.entries;

  const docs = await masterLocationModel
    .find(
      {
        district: districtDoc.district,
        level: { $in: ["zone", "ward", "locality"] },
        isActive: true,
      },
      {
        district: 1,
        zone: 1,
        ward: 1,
        locality: 1,
        level: 1,
        publicLocationSlug: 1,
        alternateNames: 1,
        slug: 1,
      },
    )
    .lean();

  const entriesByPath = new Map();
  const entriesByTarget = new Map();
  for (const doc of docs) {
    const path = getLocationUrlPath(doc);
    if (path) {
      if (!entriesByPath.has(path)) entriesByPath.set(path, []);
      entriesByPath.get(path).push(doc);
    }

    const target = getLocationUrlSegment(doc);
    if (target) {
      if (!entriesByTarget.has(target)) entriesByTarget.set(target, []);
      entriesByTarget.get(target).push(doc);
    }
  }

  const entries = { entriesByPath, entriesByTarget };
  locationUrlCache.set(cacheKey, { builtAt: now, entries });
  return entries;
};

export const invalidateLocationUrlCache = () => {
  locationUrlCache = new Map();
};

const LOCATION_LEVEL_BY_PATH_LENGTH = {
  1: "zone",
  2: "ward",
  3: "locality",
};

const pickCandidate = (candidates = []) => {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // More than one active node collapsed to the identical path at the same
  // level — a genuine data collision. Prefer the deepest level, consistent
  // with this resolver's tie-break elsewhere
  // (resolveLegacyLocationSlugWithinDistrict), then _id for stability.
  const depth = { locality: 3, ward: 2, zone: 1 };
  return [...candidates].sort(
    (a, b) => (depth[b.level] || 0) - (depth[a.level] || 0) || String(a._id).localeCompare(String(b._id)),
  )[0];
};

export const resolveLocationPathWithinDistrict = async (districtDoc, locationPath = "") => {
  const segments = pathSegments(locationPath);
  if (segments.length === 0 || segments.length > MAX_LOCATION_PATH_SEGMENTS) return null;

  const { entriesByPath } = await getLocationUrlEntriesForDistrict(districtDoc);
  const allCandidates = entriesByPath.get(segments.join("/")) || [];
  if (allCandidates.length === 0) return null;

  const expectedLevel = LOCATION_LEVEL_BY_PATH_LENGTH[segments.length];
  const atExpectedLevel = allCandidates.filter((doc) => doc.level === expectedLevel);
  if (atExpectedLevel.length) return pickCandidate(atExpectedLevel);

  // No candidate at the length-implied level -- this path was shortened by
  // district-collision folding (see computeLocationUrlParts in
  // locationSlug.js), so the actual level no longer matches segment count.
  // Fall back to whichever level the folded node actually is.
  return pickCandidate(allCandidates);
};

export const resolveUniqueLocationTargetWithinDistrict = async (districtDoc, locationSlug = "") => {
  const targetSlug = slugify(locationSlug);
  if (!districtDoc?.district || !targetSlug) return null;

  const { entriesByTarget } = await getLocationUrlEntriesForDistrict(districtDoc);
  const candidates = entriesByTarget.get(targetSlug) || [];
  return candidates.length === 1 ? candidates[0] : null;
};

export const buildCanonicalLocationCategoryPath = async ({
  districtDoc = null,
  districtSlug = "",
  locationDoc = null,
  locationPath = "",
  locationSlug = "",
  categorySlug = "",
  subcategorySlug = "",
} = {}) => {
  const fullPath = buildLocationCategoryPath({
    districtDoc,
    districtSlug,
    locationDoc,
    locationPath,
    locationSlug,
    categorySlug,
    subcategorySlug,
  });

  if (!districtDoc || !locationDoc) return fullPath;

  const targetSlug = getLocationUrlSegment(locationDoc);
  if (!targetSlug) return fullPath;

  const uniqueTargetDoc = await resolveUniqueLocationTargetWithinDistrict(districtDoc, targetSlug);
  if (!uniqueTargetDoc || String(uniqueTargetDoc._id) !== String(locationDoc._id)) {
    return fullPath;
  }

  return buildLocationCategoryPath({
    districtDoc,
    districtSlug,
    locationSlug: targetSlug,
    categorySlug,
    subcategorySlug,
  });
};

/**
 * Resolves a location path, tolerating SUPERSEDED longer forms of a URL that
 * used to repeat a name locationSlug.js no longer emits.
 *
 * Two rules there retired live paths on massClick_dev, and both leave indexed
 * URLs behind that a bare miss would 404:
 *
 *   isWardNameSameAsZone  1,538 localities lost a redundant zone segment
 *                         ("/andanallur/andanallur/mukkompu" -> "/andanallur/mukkompu")
 *   foldsIntoZonePage       231 wards and 184 localities lost their page
 *                         entirely ("/ariyamangalam/ariyamangalam" and
 *                         "/ariyamangalam/ariyamangalam/ariyamangalam" both
 *                         now belong to the "/ariyamangalam" zone page)
 *
 * Collapsing runs of consecutive identical segments and retrying covers both,
 * since every retired form differs from its replacement only by a repeat.
 *
 * The exact path is ALWAYS tried first, so a legitimately repeating path — a
 * locality matching only its ward, which is deliberately never folded — keeps
 * resolving directly and never reaches this fallback. Any level is accepted
 * from the retry, because a folded node's replacement is its ZONE.
 */
const dedupeAdjacentSegments = (segments = []) =>
  segments.filter((segment, index) => index === 0 || segment !== segments[index - 1]);

const resolveLocationPathAllowingLegacyDuplicateZone = async (districtDoc, parts = []) => {
  const direct = await resolveLocationPathWithinDistrict(districtDoc, parts);
  if (direct) return { locationDoc: direct, canonicalize: false };

  const segments = pathSegments(parts);
  const deduped = dedupeAdjacentSegments(segments);
  if (deduped.length !== segments.length) {
    const shortened = await resolveLocationPathWithinDistrict(districtDoc, deduped);
    if (shortened) return { locationDoc: shortened, canonicalize: true };
  }

  return { locationDoc: null, canonicalize: false };
};

export const classifyLocationRouteSegments = async ({ districtDoc, segments = [] } = {}) => {
  const parts = pathSegments(segments).slice(0, 3);
  if (!districtDoc) return { type: "unknown", attemptedText: parts.join("/") };
  if (parts.length === 0) return { type: "district" };

  const lastSegment = parts[parts.length - 1];
  const categoryInLocation = await splitLocationCategorySegment(lastSegment);

  if (categoryInLocation) {
    const { locationDoc, canonicalize } = await resolveLocationPathAllowingLegacyDuplicateZone(
      districtDoc,
      [...parts.slice(0, -1), categoryInLocation.locationSlug],
    );

    if (locationDoc) {
      return {
        type: "location",
        locationDoc,
        categorySlug: categoryInLocation.categorySlug,
        ...(canonicalize ? { canonicalize: true } : {}),
      };
    }

    const shortLocationDoc = await resolveUniqueLocationTargetWithinDistrict(
      districtDoc,
      categoryInLocation.locationSlug,
    );

    if (shortLocationDoc) {
      return {
        type: "location",
        locationDoc: shortLocationDoc,
        categorySlug: categoryInLocation.categorySlug,
      };
    }

    return {
      type: "unresolvedLocation",
      attemptedLocationText: categoryInLocation.locationSlug,
      categorySlug: categoryInLocation.categorySlug,
    };
  }

  if (parts.length === 1) {
    if (await isKnownCategorySlug(parts[0])) {
      return { type: "districtCategory", categorySlug: parts[0], subcategorySlug: null };
    }

    // Not a category slug — check whether it's a GROUP's own slug (e.g.
    // /trichy/indian-flavours). Groups have no multi-segment URL shape of
    // their own (this app's URL scheme never carries both a category and a
    // subcategory as separate segments — see buildCategoryPath's
    // finalCategorySlug collapsing), so a group is addressed by exactly the
    // same single flat slug a top-level category or a subcategory is.
    // Resolving it here rewrites the bare group slug into its real parent's
    // categorySlug + a groupSlug, so every downstream consumer (CategoryRouter's
    // hasSubcategories gate, CategoriesPage's group-listing/detail render)
    // works off the real parent exactly as it already does for a plain
    // 2-level category — no new render path needed for this case.
    const group = await matchGroupBySlug(parts[0]);
    if (group) {
      return {
        type: "districtCategory",
        categorySlug: group.parentSlug,
        groupSlug: group.groupSlug,
        subcategorySlug: null,
      };
    }
  }

  if (
    parts.length === 2 &&
    (await isKnownCategorySlug(parts[0])) &&
    (await isKnownCategorySlug(parts[1]))
  ) {
    return {
      type: "districtCategory",
      categorySlug: parts[1],
      subcategorySlug: null,
      legacyParentSlug: parts[0],
      canonicalize: true,
    };
  }

  const { locationDoc, canonicalize: landingCanonicalize } =
    await resolveLocationPathAllowingLegacyDuplicateZone(districtDoc, parts);
  if (locationDoc) {
    return {
      type: "locationLanding",
      locationDoc,
      ...(landingCanonicalize ? { canonicalize: true } : {}),
    };
  }

  if (parts.length >= 2 && (await isKnownCategorySlug(parts[parts.length - 1]))) {
    const legacyLocationDoc = await resolveLegacyLocationSlugWithinDistrict(districtDoc, parts[0]);
    return legacyLocationDoc
      ? {
          type: "location",
          locationDoc: legacyLocationDoc,
          categorySlug: parts[parts.length - 1],
          legacyParentSlug: parts.length === 3 ? parts[1] : null,
          canonicalize: true,
        }
      : {
          type: "unresolvedLocation",
          attemptedLocationText: parts[0],
          categorySlug: parts[parts.length - 1],
        };
  }

  return { type: "unknown", attemptedText: parts.join("/") };
};

export async function resolveLegacyLocationSlugWithinDistrict(districtDoc, locationSlug = "") {
  if (!districtDoc?.district || !locationSlug) return null;
  const slug = slugify(locationSlug);
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

  const depth = { locality: 3, ward: 2, zone: 1 };
  return [...candidates].sort(
    (a, b) =>
      (depth[b.level] || 0) - (depth[a.level] || 0) ||
      String(a._id).localeCompare(String(b._id)),
  )[0];
}
