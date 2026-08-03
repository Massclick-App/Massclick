import categoryModel from "../../model/category/categoryModel.js";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { slugify } from "../../slugify.js";
import {
  getDistrictUrlSlug,
  getLocationUrlPath,
  getLocationUrlSegment,
} from "./locationSlug.js";

export const LOCATION_CATEGORY_SEPARATOR = "-in-";

const LOCATION_LEVEL_BY_PATH_LENGTH = {
  1: "zone",
  2: "ward",
  3: "locality",
};

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

  if (!resolvedLocationSlug) {
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
  if (cached && now - cached.builtAt < CACHE_TTL_MS) return cached.entriesByPath;

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
  for (const doc of docs) {
    const path = getLocationUrlPath(doc);
    if (!path) continue;
    if (!entriesByPath.has(path)) entriesByPath.set(path, []);
    entriesByPath.get(path).push(doc);
  }

  locationUrlCache.set(cacheKey, { builtAt: now, entriesByPath });
  return entriesByPath;
};

export const invalidateLocationUrlCache = () => {
  locationUrlCache = new Map();
};

export const resolveLocationPathWithinDistrict = async (districtDoc, locationPath = "") => {
  const segments = pathSegments(locationPath);
  if (segments.length === 0 || segments.length > 3) return null;

  const expectedLevel = LOCATION_LEVEL_BY_PATH_LENGTH[segments.length];
  if (!expectedLevel) return null;

  const entriesByPath = await getLocationUrlEntriesForDistrict(districtDoc);
  const candidates = (entriesByPath.get(segments.join("/")) || [])
    .filter((doc) => doc.level === expectedLevel);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  return [...candidates].sort((a, b) => String(a._id).localeCompare(String(b._id)))[0];
};

export const classifyLocationRouteSegments = async ({ districtDoc, segments = [] } = {}) => {
  const parts = pathSegments(segments).slice(0, 3);
  if (!districtDoc) return { type: "unknown", attemptedText: parts.join("/") };
  if (parts.length === 0) return { type: "district" };

  const lastSegment = parts[parts.length - 1];
  const categoryInLocation = await splitLocationCategorySegment(lastSegment);

  if (categoryInLocation) {
    const locationDoc = await resolveLocationPathWithinDistrict(
      districtDoc,
      [...parts.slice(0, -1), categoryInLocation.locationSlug],
    );

    if (locationDoc) {
      return {
        type: "location",
        locationDoc,
        categorySlug: categoryInLocation.categorySlug,
      };
    }

    return {
      type: "unresolvedLocation",
      attemptedLocationText: categoryInLocation.locationSlug,
      categorySlug: categoryInLocation.categorySlug,
    };
  }

  if (parts.length === 1 && (await isKnownCategorySlug(parts[0]))) {
    return { type: "districtCategory", categorySlug: parts[0], subcategorySlug: null };
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

  const locationDoc = await resolveLocationPathWithinDistrict(districtDoc, parts);
  if (locationDoc) {
    return { type: "locationLanding", locationDoc };
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
