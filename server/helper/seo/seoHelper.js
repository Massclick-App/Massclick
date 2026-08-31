import seoModel from "../../model/seoModel/seoModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import locationModel from "../../model/locationModel/locationModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import { createLogger } from "../../utils/logger.js";
import { slugify } from "../../slugify.js";
import { renderSeoMetaFromTemplate } from "./seoTemplateHelper.js";
import { buildLocationCategoryPath } from "../location/locationUrl.js";
const logger = createLogger("SEO");
const SEO_META_CACHE_VERSION = "v2";
const titleCase = (text = "") =>
  text
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeCanonicalPath = (canonicalPath = "") => {
  const cleanPath = String(canonicalPath || "").split(/[?#]/)[0];
  const path = cleanPath
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean)
    .join("/");
  return path ? `/${path}` : "";
};

const buildCanonicalUrl = ({ category = "", location = "", district = "", locationPath = "", canonicalPath = "" } = {}) => {
  const routeCanonicalPath = normalizeCanonicalPath(canonicalPath);
  if (routeCanonicalPath) return `https://massclick.in${routeCanonicalPath}`;

  const districtSlug = slugify(district || "");
  const locationSlug = slugify(location || "");
  const categorySlug = slugify(category || "");
  const canonicalLocationPath = String(locationPath || "")
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean)
    .join("/");

  if (districtSlug && categorySlug) {
    return `https://massclick.in${buildLocationCategoryPath({
      districtSlug,
      locationSlug,
      locationPath: canonicalLocationPath,
      categorySlug,
    })}`;
  }

  if (districtSlug && (canonicalLocationPath || locationSlug)) {
    const districtLocationPath = `/${[districtSlug, canonicalLocationPath || (locationSlug !== districtSlug ? locationSlug : "")]
      .filter(Boolean)
      .join("/")}`;
    return `https://massclick.in${districtLocationPath}`;
  }

  if (districtSlug) return `https://massclick.in/${districtSlug}`;

  const parts = [locationSlug, categorySlug].filter(Boolean);
  return parts.length ? `https://massclick.in/${parts.join("/")}` : "https://massclick.in";
};

// Builds accurate SEO meta for the exact requested category/location when no
// curated entry exists — never guesses with a mismatched category/location record,
// since that produces a wrong canonical URL and wrong on-page copy (e.g. showing
// "Thanjavur" content on a Trichy page). This is the fallback used for the
// majority of long-tail pages (most don't have a curated seodatas row), so it
// is the highest-traffic canonical builder in the migration, not a minor one.
//
// `district`, when supplied, is already a URL slug ("trichy") — the caller
// resolved it, this function just prepends it. Falls back to the
// pre-migration 2-segment canonical when omitted, so existing callers that
// don't pass a district yet (anything before ssrMiddleware.js is rewired in
// Phase 6) keep producing the exact canonical they always have.
const buildDynamicSeoMeta = ({ category, location, district, locationPath, canonicalPath }) => {
  const categoryTitle = category ? titleCase(category) : null;
  const locationTitle = location ? titleCase(location) : null;

  if (categoryTitle && locationTitle) {
    return {
      title: `Best ${categoryTitle} in ${locationTitle} | Massclick`,
      description: `Find trusted ${categoryTitle} in ${locationTitle}. Compare ratings, reviews and contact details to find the best near you.`,
      keywords: `${categoryTitle}, ${categoryTitle} in ${locationTitle}, best ${categoryTitle} ${locationTitle}`,
      canonical: buildCanonicalUrl({ location, category, district, locationPath, canonicalPath }),
      robots: "index, follow",
      generated: true,
    };
  }

  if (categoryTitle) {
    return {
      title: `Best ${categoryTitle} | Massclick`,
      description: `Find trusted ${categoryTitle} near you on Massclick.`,
      keywords: `${categoryTitle}, best ${categoryTitle}`,
      canonical: buildCanonicalUrl({ category, district, canonicalPath }),
      robots: "index, follow",
      generated: true,
    };
  }

  if (locationTitle) {
    return {
      title: `Local Businesses in ${locationTitle} | Massclick`,
      description: `Discover trusted local businesses and services in ${locationTitle} on Massclick.`,
      keywords: `businesses in ${locationTitle}, ${locationTitle} local services`,
      canonical: buildCanonicalUrl({ location, district, locationPath, canonicalPath }),
      robots: "index, follow",
      generated: true,
    };
  }

  return {
    title: "Massclick - Local Business Search Platform",
    description: "Find trusted local businesses, services, and professionals near you on Massclick.",
    canonical: buildCanonicalUrl({ district, canonicalPath }),
    robots: "index, follow",
    generated: true,
  };
};

// Locations collection has two historical document shapes (city/district vs
// location/name) — match against all of them so validation works regardless
// of which shape a given record was created under.
const findMatchingLocation = async (locationValue = "") => {
  const normalized = locationValue.toLowerCase().trim();
  if (!normalized) return null;

  const regex = new RegExp(
    `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i"
  );

  return await locationModel
    .findOne({
      isActive: true,
      $or: [
        { city: regex },
        { district: regex },
        { location: regex },
        { name: regex }
      ]
    })
    .lean();
};

const ensureCategoryExists = async (categorySlug) => {
  const exists = await categoryModel
    .findOne({ slug: categorySlug, isActive: true })
    .lean();

  if (!exists) {
    throw new Error(
      `Category "${categorySlug}" does not exist. Please select a category from the suggestions.`
    );
  }
};

// Resolves free-typed location text to the canonical name of a real,
// existing location record (rather than trusting whatever casing/spelling
// was typed) — prevents both duplicate seodatas rows and orphaned location
// docs that used to get silently auto-created for typos/one-off text.
const resolveLocation = async (locationValue) => {
  const matched = await findMatchingLocation(locationValue);

  if (!matched) {
    throw new Error(
      `Location "${locationValue}" does not exist. Please add it via Location Management first, then select it here.`
    );
  }

  const canonicalName =
    matched.city || matched.district || matched.location || matched.name || locationValue;

  const location = slugify(canonicalName);
  return { location, locationKey: location.replace(/[^a-z0-9]/g, "") };
};

export const createSeo = async (data) => {
  try {

    if (!data.category || data.category.trim() === "") {
      throw new Error("Category is required");
    }

    if (data.pageType)
      data.pageType = data.pageType.toLowerCase().trim();

    data.category = slugify(data.category);

    if (data.pageType === "category") {
      await ensureCategoryExists(data.category);
    }

    if (data.location) {
      const { location, locationKey } = await resolveLocation(data.location);
      data.location = location;
      data.locationKey = locationKey;
    }

    // Ensure district is normalized if provided
    if (data.district) {
      data.district = String(data.district).toLowerCase().trim();
    }

    const seo = await seoModel.create(data);

    return seo;

  } catch (error) {

    if (error.code === 11000)
      throw new Error(
        "SEO already exists for this category and location"
      );

    throw error;
  }
};

export const getSeo = async ({ pageType, category, location }) => {
  try {
    const query = {
      pageType,
      isActive: true,
    };

    if (category) query.category = category;
    if (location) query.location = location;

    return await seoModel.findOne(query).lean();
  } catch (error) {
    console.error("SEO fetch error:", error);
    throw error;
  }
};

export const getSeoMeta = async ({ pageType, category, location, district, locationPath, canonicalPath }) => {
  try {
    const normalize = (v = "") =>
      v.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const safePageType = normalize(pageType);
    const safeCategory = category ? normalize(category) : null;
    const safeLocation = location ? normalize(location) : null;
    const safeLocationPath = locationPath ? String(locationPath).toLowerCase().trim() : null;
    const safeCanonicalPath = normalizeCanonicalPath(canonicalPath);
    // Not run through the free-text `normalize` above — district is a URL
    // slug ("trichy"), not free text. Kept as-is for the cache key and for
    // buildDynamicSeoMeta's canonical building.
    const safeDistrict = district ? String(district).toLowerCase().trim() : null;
    const applyResolvedCanonical = (seoDoc) => {
      if (!seoDoc || safePageType !== "category" || !safeDistrict || !safeCategory) {
        return seoDoc;
      }

      return {
        ...seoDoc,
        canonical: buildCanonicalUrl({
          category: safeCategory,
          location: safeLocation,
          district: safeDistrict,
          locationPath: safeLocationPath,
          canonicalPath: safeCanonicalPath,
        }),
      };
    };

    await logger.seoDebug('Query:', { pageType, category, location, district, locationPath, canonicalPath, safePageType, safeCategory, safeLocation, safeDistrict, safeLocationPath, safeCanonicalPath });

    // Generate cache key based on query parameters. `district` MUST be part
    // of this key: without it, two districts sharing a location/category
    // text (e.g. "Anna Nagar" in 4 districts) would read and write the same
    // cached canonical for 24h, handing one district's URL to another's page.
    const cacheKey = `seo-meta:${SEO_META_CACHE_VERSION}:${safePageType}${safeCategory ? `:${safeCategory}` : ""}${safeLocation ? `:${safeLocation}` : ""}${safeDistrict ? `:${safeDistrict}` : ""}${safeLocationPath ? `:${safeLocationPath}` : ""}${safeCanonicalPath ? `:${safeCanonicalPath}` : ""}`;

    // Try to get from cache first
    const cachedSeo = await getCache(cacheKey);
    if (cachedSeo) {
      await logger.seoDebug('Cache HIT for key:', { cacheKey });
      return applyResolvedCanonical(cachedSeo);
    }
    await logger.seoDebug('Cache MISS for key:', { cacheKey });

    const escapeRegex = (str = "") =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 🔥 allow space + hyphen
    const makeFlexible = (str = "") =>
      escapeRegex(str).replace(/\s+/g, "[-\\s]+");

    let seo = null;

    const flexibleCategory = safeCategory
      ? `^${makeFlexible(safeCategory)}$`
      : null;

    const flexibleLocation = safeLocation
      ? `^${makeFlexible(safeLocation)}$`
      : null;

    // ===============================
    // 🔥 1. EXACT MATCH (CATEGORY + LOCATION + DISTRICT)
    // ===============================
    if (safeCategory && safeLocation) {
      const query1 = {
        pageType: safePageType,
        category: safeCategory,
        location: safeLocation,
        isActive: true,
      };
      if (safeDistrict) query1.district = safeDistrict;

      await logger.seoDebug('Step 1: Trying EXACT match', { pageType: safePageType, category: safeCategory, location: safeLocation, district: safeDistrict });
      seo = await seoModel.findOne(query1).lean();

      if (seo) {
        await logger.seoDebug('Step 1: FOUND', { title: seo.title, category: seo.category, location: seo.location, district: seo.district });
        const resolvedSeo = applyResolvedCanonical(seo);
        await setCache(cacheKey, resolvedSeo, 86400); // Cache for 24 hours
        return resolvedSeo;
      }
      await logger.seoDebug('Step 1: NOT found');
    }

    // ===============================
    // 🔥 2. FLEXIBLE MATCH (CATEGORY + LOCATION + DISTRICT)
    // ===============================
    if (safeCategory && safeLocation) {
      const query2 = {
        pageType: safePageType,
        category: { $regex: flexibleCategory, $options: "i" },
        location: { $regex: flexibleLocation, $options: "i" },
        isActive: true,
      };
      if (safeDistrict) query2.district = safeDistrict;

      await logger.seoDebug('Step 2: Trying FLEXIBLE match', { pageType: safePageType, categoryRegex: flexibleCategory, locationRegex: flexibleLocation, district: safeDistrict });
      seo = await seoModel.findOne(query2).lean();

      if (seo) {
        await logger.seoDebug('Step 2: FOUND', { title: seo.title, category: seo.category, location: seo.location, district: seo.district });
        const resolvedSeo = applyResolvedCanonical(seo);
        await setCache(cacheKey, resolvedSeo, 86400); // Cache for 24 hours
        return resolvedSeo;
      }
      await logger.seoDebug('Step 2: NOT found');
    }

    // ===============================
    // 🔥 3. CATEGORY ONLY (ONLY if NO location given, but WITH district if provided)
    // ===============================
    if (safeCategory && !safeLocation) {
      const query3 = {
        pageType: safePageType,
        category: safeCategory,
        isActive: true,
      };
      if (safeDistrict) query3.district = safeDistrict;

      await logger.seoDebug('Step 3: Trying CATEGORY ONLY (no location given)', { pageType: safePageType, category: safeCategory, district: safeDistrict });
      seo = await seoModel.findOne(query3).lean();

      if (seo) {
        await logger.seoDebug('Step 3: FOUND', { title: seo.title, category: seo.category, location: seo.location, district: seo.district });
        const resolvedSeo = applyResolvedCanonical(seo);
        await setCache(cacheKey, resolvedSeo, 86400); // Cache for 24 hours
        return resolvedSeo;
      }
      await logger.seoDebug('Step 3: NOT found');
    }

    // ===============================
    // 🔥 4. FLEXIBLE CATEGORY ONLY (WITH district if provided)
    // ===============================
    if (safeCategory && !safeLocation) {
      const query4 = {
        pageType: safePageType,
        category: { $regex: flexibleCategory, $options: "i" },
        isActive: true,
      };
      if (safeDistrict) query4.district = safeDistrict;

      await logger.seoDebug('Step 4: Trying FLEXIBLE CATEGORY ONLY (no location given)', { pageType: safePageType, categoryRegex: flexibleCategory, district: safeDistrict });
      seo = await seoModel.findOne(query4).lean();

      if (seo) {
        await logger.seoDebug('Step 4: FOUND', { title: seo.title, category: seo.category, location: seo.location, district: seo.district });
        const resolvedSeo = applyResolvedCanonical(seo);
        await setCache(cacheKey, resolvedSeo, 86400); // Cache for 24 hours
        return resolvedSeo;
      }
      await logger.seoDebug('Step 4: NOT found');
    }

    // ===============================
    // 🔥 5. NO CURATED MATCH — GENERATE DYNAMICALLY
    // ===============================
    // Deliberately does NOT fall back to a record for a different category or
    // location (e.g. returning a Thanjavur "fire service" entry for a Trichy
    // search) — that produces a wrong canonical URL and wrong on-page copy.
    // Instead, build accurate SEO for the exact category/location requested.
    await logger.seoDebug('Step 5: No curated match — generating dynamic SEO', { category: safeCategory, location: safeLocation, district: safeDistrict, locationPath: safeLocationPath, canonicalPath: safeCanonicalPath });
    const templateSeo = safeCategory
      ? await renderSeoMetaFromTemplate({ category: safeCategory, location: safeLocation, district: safeDistrict })
      : null;
    const dynamicSeo = applyResolvedCanonical(
      templateSeo || buildDynamicSeoMeta({
        category: safeCategory,
        location: safeLocation,
        district: safeDistrict,
        locationPath: safeLocationPath,
        canonicalPath: safeCanonicalPath,
      }),
    );

    await setCache(cacheKey, dynamicSeo, 86400); // Cache for 24 hours
    return dynamicSeo;

  } catch (error) {
    await logger.error("[SEO META ERROR]", error);

    return {
      title: "Massclick",
      description: "Massclick - India's local business search platform",
    };
  }
};

export const viewAllSeo = async ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
  sortBy = "createdAt",
  sortOrder = -1
}) => {

  const query = {};

  if (status === "active")
    query.isActive = true;

  if (status === "inactive")
    query.isActive = false;

  if (search && search.trim() !== "") {

    const regex = new RegExp(search.trim(), "i");

    query.$or = [
      { title: regex },
      { category: regex },
      { location: regex }
    ];
  }

  const total = await seoModel.countDocuments(query);

  const sortQuery = {
    [sortBy]: sortOrder,
    _id: sortOrder  
  };

  const list = await seoModel
    .find(query)
    .sort(sortQuery)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { list, total };
};

export const updateSeo = async (id, data) => {

  if (data.pageType)
    data.pageType = data.pageType.toLowerCase().trim();

  if (data.category) {
    data.category = slugify(data.category);

    if (data.pageType === "category") {
      await ensureCategoryExists(data.category);
    }
  }

  if (data.location) {
    const { location, locationKey } = await resolveLocation(data.location);
    data.location = location;
    data.locationKey = locationKey;
  }

  // Ensure district is normalized if provided
  if (data.district) {
    data.district = String(data.district).toLowerCase().trim();
  }

  const duplicateQuery = {
    _id: { $ne: id },
    pageType: data.pageType,
    category: data.category,
    locationKey: data.locationKey
  };

  if (data.district) {
    duplicateQuery.district = data.district;
  }

  const exists = await seoModel.findOne(duplicateQuery);

  if (exists)
    throw new Error("SEO already exists for this category and location");

  const seo = await seoModel.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );

  if (!seo)
    throw new Error("SEO not found");

  return seo;
};

export const deleteSeo = async (id) => {

  const seo = await seoModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!seo)
    throw new Error("SEO not found");

  return seo;
};

export const categorySuggestion = async (search = "", limit = 10) => {
  try {
    const regex = new RegExp(search, "i");

    const categories = await categoryModel
      .find(
        {
          isActive: true,
          category: { $regex: regex }
        },
        {
          category: 1,
          slug: 1,
          categoryImageKey: 1
        }
      )
      .limit(limit)
      .lean();

    return categories.map((cat) => {
      if (cat.categoryImageKey) {
        cat.categoryImage = getSignedUrlByKey(cat.categoryImageKey);
      }
      return cat;
    });

  } catch (error) {
    console.error("categorySuggestion helper error:", error);
    throw error;
  }
};
