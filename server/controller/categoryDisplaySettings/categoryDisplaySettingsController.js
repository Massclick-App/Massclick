import categoryDisplaySettingsModel from "../../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { categoriesData } from "../../utils/sub-categoriesData.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";
import { invalidateCategoryDisplaySettingsCache } from "../../utils/cacheInvalidation.js";
import { s3Keys } from "../../utils/s3ObjectKeys.js";
import { assetUrl } from "../../utils/assetUrl.js";
import { ulid } from "../../utils/idGen.js";
import {
  resolveDistrictBySlug,
  resolveLocationSearchScope,
  resolveRouteLocation,
} from "../../helper/location/locationResolver.js";
import {
  getSubCategoryNameSet,
  invalidateSubCategoryNameCache,
  invalidateSubCategoryGroupCache,
} from "../../helper/category/categoryHierarchyHelper.js";
import { subCategoryGroupsData } from "../../utils/sub-category-groups-data.js";

// ─── Fallback arrays (copied from categoryController.js) ──────────────────────

const FALLBACK_HOME_DESKTOP = [
  "Hotels", "Rent And Hire", "Restaurants", "Education", "Hospitals",
  "Dentist", "Dermatologist", "Sexologist", "Contractors", "Gym",
  "Furnitures", "Florists", "Packers and Movers", "House Keeping Service",
  "Security System", "Wedding Mahal", "Photographer", "Matrimony", "Hostel",
  "Popular Categories",
];

const FALLBACK_HOME_MOBILE = [
  "Hotels", "Rent And Hire", "Restaurants", "Education", "Hospitals",
  "Contractors", "Gym", "Furnitures", "House Keeping Service",
  "Security System", "Photographer", "Popular Categories",
];

const FALLBACK_POPULAR = [
  "Architect", "Astrology", "Automobiles", "Beauty Parlour", "Beauty Spa",
  "Body Massage", "Book Shop", "Boutique", "Car Hire", "Ceramic",
  "Chartered Accountant", "Clinical Lab", "Coaching",
  "Computer Training Institutes", "Cosmetics", "Courier Services",
  "Electrician Services", "Event Organisers", "Export & Import", "Fabricators",
  "Fancy Shop", "Footwear Shop", "Geologist", "Hearing Aid", "Hobbies",
  "Homeo Clinic", "Internet Website Designer", "Jewellery Showroom",
  "Kids School", "Lawyer", "Loans", "Mosquito Net", "Numerology",
  "Nursery Garden", "Nursing Service", "Opticals", "Organic Shop",
  "Painting Contractor", "Physiotherapy", "Placement Service",
  "printing & publishing service", "Real Estate", "Registration Consultant",
  "Salon", "Scrap Dealer", "Special School", "Sports", "Tailoring",
  "Tattoo Artist", "Textile", "Vastu Consultant", "Vocational training",
];

const FALLBACK_SERVICE_SECTIONS_DESKTOP = [
  { section: "Repair and Services", desktopItems: ["Car Service", "TV Service", "Bike Service"], mobileItems: [] },
  { section: "Services",            desktopItems: ["Pest Control Service", "AC Service", "Computer And Laptop Service"], mobileItems: [] },
  { section: "Hot Categories",      desktopItems: ["Catering Services", "Transporters", "Driving School"], mobileItems: [] },
  { section: "Building Materials",  desktopItems: ["Fencing", "Interlock Bricks", "Steel Dealers"], mobileItems: [] },
];

const FALLBACK_SERVICE_SECTIONS_MOBILE = [
  { section: "Repair and Services", mobileItems: ["Car Service", "TV Service", "Bike Service", "Crane Service", "Electrician Services"] },
  { section: "Services",            mobileItems: ["Pest Control Service", "AC Service", "Computer And Laptop Service", "Courier Services", "Mobile Service"] },
  { section: "Hot Categories",      mobileItems: ["Catering Services", "Transporters", "Driving School"] },
  { section: "Building Materials",  mobileItems: ["Fencing", "Interlock Bricks", "Steel Dealers"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (name) => name.toLowerCase().replace(/s$/, "").trim();


/** Build a parentSlug → [{ name }] lookup from DB settings or fall back to hardcoded. */
const buildSubCatLookup = (settings) => {
  if (settings?.subCategoryMapping?.length > 0) {
    const lookup = {};
    settings.subCategoryMapping.forEach(({ parentSlug, subCategoryNames }) => {
      lookup[parentSlug] = subCategoryNames.map((name) => ({ name }));
    });
    return lookup;
  }
  return categoriesData;
};

/** Build a parentSlug → [{groupSlug, groupName, groupIcon, subCategoryNames}] lookup, same settings-first-then-hardcoded resolution as buildSubCatLookup. */
const buildSubCatGroupLookup = (settings) => {
  if (settings?.subCategoryGroupMapping?.length > 0) {
    const lookup = {};
    settings.subCategoryGroupMapping.forEach(({ parentSlug, groupSlug, groupName, groupIcon, subCategoryNames }) => {
      if (!lookup[parentSlug]) lookup[parentSlug] = [];
      lookup[parentSlug].push({ groupSlug, groupName, groupIcon: groupIcon || "", subCategoryNames: subCategoryNames || [] });
    });
    return lookup;
  }
  const lookup = {};
  Object.entries(subCategoryGroupsData).forEach(([parentSlug, groups]) => {
    lookup[parentSlug] = groups || [];
  });
  return lookup;
};

// ─── Admin: GET ───────────────────────────────────────────────────────────────

export const getCategoryDisplaySettingsAction = async (req, res) => {
  try {
    let settings = await categoryDisplaySettingsModel.findOne().lean();
    if (!settings) {
      settings = await categoryDisplaySettingsModel.create({});
      settings = settings.toObject();
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("getCategoryDisplaySettingsAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: PUT ───────────────────────────────────────────────────────────────

export const updateCategoryDisplaySettingsAction = async (req, res) => {
  try {
    const {
      homeFeaturedDesktop,
      homeFeaturedMobile,
      popularCategories,
      serviceCardSections,
      subCategoryMapping,
      subCategoryGroupMapping,
      popularSearchCards,
      topTouristPlaces,
      popularCategoryTabs,
      popularCategoryServices,
      popularCategoryLinkSections,
    } = req.body;

    const updates = {};
    const adminEmail = req.authUser?.email || "admin";

    if (homeFeaturedDesktop !== undefined) {
      if (!Array.isArray(homeFeaturedDesktop))
        return res.status(400).json({ success: false, message: "homeFeaturedDesktop must be an array" });
      updates.homeFeaturedDesktop = homeFeaturedDesktop;
    }

    if (homeFeaturedMobile !== undefined) {
      if (!Array.isArray(homeFeaturedMobile))
        return res.status(400).json({ success: false, message: "homeFeaturedMobile must be an array" });
      updates.homeFeaturedMobile = homeFeaturedMobile;
    }

    if (popularCategories !== undefined) {
      if (!Array.isArray(popularCategories))
        return res.status(400).json({ success: false, message: "popularCategories must be an array" });
      updates.popularCategories = popularCategories;
    }

    if (serviceCardSections !== undefined) {
      if (!Array.isArray(serviceCardSections))
        return res.status(400).json({ success: false, message: "serviceCardSections must be an array" });
      updates.serviceCardSections = serviceCardSections;
    }

    if (subCategoryMapping !== undefined) {
      if (!Array.isArray(subCategoryMapping))
        return res.status(400).json({ success: false, message: "subCategoryMapping must be an array" });
      updates.subCategoryMapping = subCategoryMapping;
    }

    if (subCategoryGroupMapping !== undefined) {
      if (!Array.isArray(subCategoryGroupMapping))
        return res.status(400).json({ success: false, message: "subCategoryGroupMapping must be an array" });
      // groupSlug is load-bearing for routing (unlike the purely
      // presentational sibling fields above) — two groups under the same
      // parent colliding on slug would make two different admin-authored
      // groups resolve to the same URL, so this one field gets a deeper
      // check than the shallow Array.isArray every other field gets.
      const seenPairs = new Set();
      for (const row of subCategoryGroupMapping) {
        const pairKey = `${row?.parentSlug || ""}::${row?.groupSlug || ""}`;
        if (seenPairs.has(pairKey)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate group slug "${row?.groupSlug}" under parent "${row?.parentSlug}" — group slugs must be unique per parent category.`,
          });
        }
        seenPairs.add(pairKey);
      }
      updates.subCategoryGroupMapping = subCategoryGroupMapping;
    }

    if (popularSearchCards !== undefined) {
      if (!Array.isArray(popularSearchCards))
        return res.status(400).json({ success: false, message: "popularSearchCards must be an array" });
      updates.popularSearchCards = popularSearchCards;
    }

    if (topTouristPlaces !== undefined) {
      if (!Array.isArray(topTouristPlaces))
        return res.status(400).json({ success: false, message: "topTouristPlaces must be an array" });
      updates.topTouristPlaces = topTouristPlaces;
    }

    if (popularCategoryTabs !== undefined) {
      if (!Array.isArray(popularCategoryTabs))
        return res.status(400).json({ success: false, message: "popularCategoryTabs must be an array" });
      updates.popularCategoryTabs = popularCategoryTabs;
    }

    if (popularCategoryServices !== undefined) {
      if (!Array.isArray(popularCategoryServices))
        return res.status(400).json({ success: false, message: "popularCategoryServices must be an array" });
      updates.popularCategoryServices = popularCategoryServices;
    }

    if (popularCategoryLinkSections !== undefined) {
      if (!Array.isArray(popularCategoryLinkSections))
        return res.status(400).json({ success: false, message: "popularCategoryLinkSections must be an array" });
      updates.popularCategoryLinkSections = popularCategoryLinkSections;
    }

    if (!Object.keys(updates).length)
      return res.status(400).json({ success: false, message: "No valid fields provided" });

    updates.updatedBy = adminEmail;

    const saved = await categoryDisplaySettingsModel.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    await invalidateCategoryDisplaySettingsCache();
    invalidateSubCategoryNameCache();
    invalidateSubCategoryGroupCache();

    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error("updateCategoryDisplaySettingsAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── V2: Home Featured (Desktop) ──────────────────────────────────────────────

export const getV2HomeCategoriesAction = async (req, res) => {
  try {
    const cacheKey = "home-categories:desktop:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const order = settings?.homeFeaturedDesktop?.length > 0
      ? settings.homeFeaturedDesktop
      : FALLBACK_HOME_DESKTOP;

    const subCatLookup = buildSubCatLookup(settings);
    const subCatGroupLookup = buildSubCatGroupLookup(settings);
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = found?.slug || normalize(name).toLowerCase().replace(/\s+/g, "-");
      const groups = subCatGroupLookup[categoryKey] || [];
      // A group-only parent (no flat subCategoryMapping row) still drills
      // down — without the groups OR here, CategoryRouter would send it
      // straight to SearchResults and the group tier would never render.
      const hasSubcategories = !!subCatLookup[categoryKey] || groups.length > 0;
      const subCategoryCount = (subCatLookup[categoryKey]?.length || 0)
        + groups.reduce((sum, g) => sum + (g.subCategoryNames?.length || 0), 0);

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? assetUrl(found.categoryImageKey, { version: found.updatedAt }) : null,
            liveImage: found.liveImageKey ? assetUrl(found.liveImageKey, { version: found.updatedAt }) : null,
            hasSubcategories,
            subCategoryCount,
          }
        : { name, slug: name.toLowerCase().replace(/ /g, "-"), icon: null, liveImage: null, hasSubcategories, subCategoryCount };
    });

    await setCache(cacheKey, ordered, 86400);
    return res.send(ordered);
  } catch (error) {
    console.error("getV2HomeCategoriesAction error:", error);
    return res.status(400).send({ message: error.message });
  }
};

// ─── V2: Home Featured (Mobile) ───────────────────────────────────────────────

export const getV2MobileHomeCategoriesAction = async (req, res) => {
  try {
    const cacheKey = "home-categories:mobile:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const order = settings?.homeFeaturedMobile?.length > 0
      ? settings.homeFeaturedMobile
      : FALLBACK_HOME_MOBILE;

    const subCatLookup = buildSubCatLookup(settings);
    const subCatGroupLookup = buildSubCatGroupLookup(settings);
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = found?.slug || normalize(name).toLowerCase().replace(/\s+/g, "-");
      const groups = subCatGroupLookup[categoryKey] || [];
      const hasSubcategories = !!subCatLookup[categoryKey] || groups.length > 0;
      const subCategoryCount = (subCatLookup[categoryKey]?.length || 0)
        + groups.reduce((sum, g) => sum + (g.subCategoryNames?.length || 0), 0);

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? assetUrl(found.categoryImageKey, { version: found.updatedAt }) : null,
            liveImage: found.liveImageKey ? assetUrl(found.liveImageKey, { version: found.updatedAt }) : null,
            hasSubcategories,
            subCategoryCount,
          }
        : {
            name,
            slug: name.toLowerCase().replace(/ /g, "-"),
            icon: null,
            liveImage: null,
            hasSubcategories,
            subCategoryCount,
          };
    });

    await setCache(cacheKey, ordered, 86400);
    return res.send(ordered);
  } catch (error) {
    console.error("getV2MobileHomeCategoriesAction error:", error);
    return res.status(400).send({ message: error.message });
  }
};

// ─── V2: Popular Categories ───────────────────────────────────────────────────

export const getV2PopularCategoriesAction = async (req, res) => {
  try {
    const cacheKey = "popular-categories:home:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const order = settings?.popularCategories?.length > 0
      ? settings.popularCategories
      : FALLBACK_POPULAR;

    const subCatLookup = buildSubCatLookup(settings);
    const subCatGroupLookup = buildSubCatGroupLookup(settings);
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = found?.slug || normalize(name).toLowerCase().replace(/\s+/g, "-");
      const groups = subCatGroupLookup[categoryKey] || [];
      const hasSubcategories = !!subCatLookup[categoryKey] || groups.length > 0;
      const subCategoryCount = (subCatLookup[categoryKey]?.length || 0)
        + groups.reduce((sum, g) => sum + (g.subCategoryNames?.length || 0), 0);

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? assetUrl(found.categoryImageKey, { version: found.updatedAt }) : null,
            liveImage: found.liveImageKey ? assetUrl(found.liveImageKey, { version: found.updatedAt }) : null,
            hasSubcategories,
            subCategoryCount,
          }
        : {
            name,
            slug: name.toLowerCase().replace(/ /g, "-"),
            icon: null,
            liveImage: null,
            hasSubcategories,
            subCategoryCount,
          };
    });

    await setCache(cacheKey, ordered, 86400);
    return res.send(ordered);
  } catch (error) {
    console.error("getV2PopularCategoriesAction error:", error);
    return res.status(400).send({ message: error.message });
  }
};

// ─── V2: Service Cards (Desktop) ─────────────────────────────────────────────

export const getV2ServiceCardsAction = async (req, res) => {
  try {
    const cacheKey = "service-cards:home:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const sections = settings?.serviceCardSections?.length > 0
      ? settings.serviceCardSections
      : FALLBACK_SERVICE_SECTIONS_DESKTOP;

    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const result = [];
    sections.forEach(({ section, desktopItems = [] }) => {
      desktopItems.forEach((name) => {
        const found = map.get(normalize(name));
        result.push(
          found
            ? {
                _id: found._id,
                name: found.category,
                slug: found.slug,
                section,
                categoryImageKey: found.categoryImageKey ? assetUrl(found.categoryImageKey, { version: found.updatedAt }) : "",
                liveImageKey: found.liveImageKey ? assetUrl(found.liveImageKey, { version: found.updatedAt }) : "",
                categoryImages: {
                  webHero:         found.categoryImages?.webHero         ? assetUrl(found.categoryImages.webHero, { version: found.updatedAt })         : "",
                  webCard:         found.categoryImages?.webCard         ? assetUrl(found.categoryImages.webCard, { version: found.updatedAt })         : "",
                  webThumbnail:    found.categoryImages?.webThumbnail    ? assetUrl(found.categoryImages.webThumbnail, { version: found.updatedAt })    : "",
                  mobileVertical:  found.categoryImages?.mobileVertical  ? assetUrl(found.categoryImages.mobileVertical, { version: found.updatedAt })  : "",
                  mobileCard:      found.categoryImages?.mobileCard      ? assetUrl(found.categoryImages.mobileCard, { version: found.updatedAt })      : "",
                  mobileThumbnail: found.categoryImages?.mobileThumbnail ? assetUrl(found.categoryImages.mobileThumbnail, { version: found.updatedAt }) : "",
                },
              }
            : {
                name,
                slug: name.toLowerCase().replace(/ /g, "-"),
                section,
                categoryImageKey: "",
                liveImageKey: "",
                categoryImages: { webHero: "", webCard: "", webThumbnail: "", mobileVertical: "", mobileCard: "", mobileThumbnail: "" },
              }
        );
      });
    });

    await setCache(cacheKey, result, 86400);
    return res.send(result);
  } catch (error) {
    console.error("getV2ServiceCardsAction error:", error);
    return res.status(400).send({ message: error.message });
  }
};

// ─── V2: Service Cards (Mobile) ───────────────────────────────────────────────

export const getV2MobileServiceCardsAction = async (req, res) => {
  try {
    const cacheKey = "service-cards:mobile:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const sections = settings?.serviceCardSections?.length > 0
      ? settings.serviceCardSections
      : FALLBACK_SERVICE_SECTIONS_MOBILE;

    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const result = [];
    sections.forEach(({ section, mobileItems = [] }) => {
      mobileItems.forEach((name) => {
        const found = map.get(normalize(name));
        result.push(
          found
            ? {
                _id: found._id,
                name: found.category,
                slug: found.slug,
                section,
                categoryImageKey: found.categoryImageKey ? assetUrl(found.categoryImageKey, { version: found.updatedAt }) : "",
                liveImageKey: found.liveImageKey ? assetUrl(found.liveImageKey, { version: found.updatedAt }) : "",
                categoryImages: {
                  webHero:         found.categoryImages?.webHero         ? assetUrl(found.categoryImages.webHero, { version: found.updatedAt })         : "",
                  webCard:         found.categoryImages?.webCard         ? assetUrl(found.categoryImages.webCard, { version: found.updatedAt })         : "",
                  webThumbnail:    found.categoryImages?.webThumbnail    ? assetUrl(found.categoryImages.webThumbnail, { version: found.updatedAt })    : "",
                  mobileVertical:  found.categoryImages?.mobileVertical  ? assetUrl(found.categoryImages.mobileVertical, { version: found.updatedAt })  : "",
                  mobileCard:      found.categoryImages?.mobileCard      ? assetUrl(found.categoryImages.mobileCard, { version: found.updatedAt })      : "",
                  mobileThumbnail: found.categoryImages?.mobileThumbnail ? assetUrl(found.categoryImages.mobileThumbnail, { version: found.updatedAt }) : "",
                },
              }
            : {
                name,
                slug: name.toLowerCase().replace(/ /g, "-"),
                section,
                categoryImageKey: "",
                liveImageKey: "",
                categoryImages: { webHero: "", webCard: "", webThumbnail: "", mobileVertical: "", mobileCard: "", mobileThumbnail: "" },
              }
        );
      });
    });

    await setCache(cacheKey, result, 86400);
    return res.send(result);
  } catch (error) {
    console.error("getV2MobileServiceCardsAction error:", error);
    return res.status(400).send({ message: error.message });
  }
};

// ─── V2: Sub-Categories ───────────────────────────────────────────────────────────

export const getV2SubCategoriesAction = async (req, res) => {
  try {
    const { parentSlug } = req.params;

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const subCatLookup = buildSubCatLookup(settings);


    const normalizeSlug = (text = "") =>
      text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const cleanText = (text = "") =>
      text.toLowerCase().trim()
        .replace(/[-_\s]+/g, " ")
        .replace(/\bcontractors\b/g, "contractor")
        .replace(/\s+/g, " ");

    const matchedKey = Object.keys(subCatLookup).find((key) => {
      const current = normalizeSlug(key);
      const incoming = normalizeSlug(parentSlug);
      return current === incoming || current === incoming + "s" || current + "s" === incoming;
    });

    const selectedCategories = matchedKey ? subCatLookup[matchedKey] : [];
    const allowedNames = selectedCategories.map((i) => cleanText(i.name));

    const data = await categoryModel.find({ isActive: true }).lean();
    const filtered = data.filter((item) => allowedNames.includes(cleanText(item.category)));

    const uniqueMap = new Map();
    filtered.forEach((item) => {
      const key = cleanText(item.category);
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });

    const uniqueData = [...uniqueMap.values()].sort((a, b) =>
      a.category.localeCompare(b.category)
    );

    if (uniqueData.length > 0) {
      return res.json(
        uniqueData.map((item) => ({
          _id: item._id,
          name: item.category,
          slug: item.slug,
          icon: item.categoryImageKey ? assetUrl(item.categoryImageKey, { version: item.updatedAt }) : "",
          liveImage: item.liveImageKey ? assetUrl(item.liveImageKey, { version: item.updatedAt }) : null,
        }))
      );
    }

    const fallback = selectedCategories
      .map((item, index) => ({
        _id: index + 1,
        name: item.name,
        slug: item.name.toLowerCase().replace(/\s+/g, "-"),
        icon: "",
        liveImage: null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json(fallback);
  } catch (error) {
    console.error("getV2SubCategoriesAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─── V2: Sub-Category Groups (3rd tier) ────────────────────────────────────────
// Given a parent's slug, returns its groups (if any), each with its
// subcategory names resolved the same way getV2SubCategoriesAction resolves
// a flat list — DB-backed where a matching categoryModel doc exists, else a
// same-shaped fallback item built from the admin-entered name. Returns []
// (not an error) for any parent with no group data — the response a 2-level
// category gets today, and every existing caller of GET /v2/category/sub/
// is completely untouched by this endpoint's existence.
export const getV2SubCategoryGroupsAction = async (req, res) => {
  try {
    const { parentSlug } = req.params;

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const groupLookup = buildSubCatGroupLookup(settings);

    const normalizeSlug = (text = "") =>
      text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const cleanText = (text = "") =>
      text.toLowerCase().trim()
        .replace(/[-_\s]+/g, " ")
        .replace(/\bcontractors\b/g, "contractor")
        .replace(/\s+/g, " ");

    const matchedKey = Object.keys(groupLookup).find((key) => {
      const current = normalizeSlug(key);
      const incoming = normalizeSlug(parentSlug);
      return current === incoming || current === incoming + "s" || current + "s" === incoming;
    });

    const groups = matchedKey ? groupLookup[matchedKey] : [];
    if (!groups.length) return res.json({ parent: {}, groups: [] });

    const allowedKeys = new Set(groups.flatMap((g) => g.subCategoryNames || []).map(cleanText));
    const data = await categoryModel.find({ isActive: true }).lean();
    const docByCleanKey = new Map();
    data.forEach((item) => {
      const key = cleanText(item.category);
      if (allowedKeys.has(key) && !docByCleanKey.has(key)) docByCleanKey.set(key, item);
    });

    const resolveNames = (names) => {
      const items = (names || []).map((name, index) => {
        const doc = docByCleanKey.get(cleanText(name));
        return doc
          ? {
              _id: doc._id,
              name: doc.category,
              slug: doc.slug,
              icon: doc.categoryImageKey ? assetUrl(doc.categoryImageKey, { version: doc.updatedAt }) : "",
              liveImage: doc.liveImageKey ? assetUrl(doc.liveImageKey, { version: doc.updatedAt }) : null,
            }
          : {
              _id: index + 1,
              name,
              slug: name.toLowerCase().replace(/\s+/g, "-"),
              icon: "",
              liveImage: null,
            };
      });
      const seenSlugs = new Set();
      return items
        .filter((item) => (seenSlugs.has(item.slug) ? false : (seenSlugs.add(item.slug), true)))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    const result = groups.map((g) => ({
      groupSlug: g.groupSlug,
      groupName: g.groupName,
      groupIcon: g.groupIcon ? assetUrl(g.groupIcon, { version: settings?.updatedAt }) : "",
      subCategories: resolveNames(g.subCategoryNames),
    }));

    // Parent's own hero/title/description — carried alongside the groups so
    // the tier-2 (group-listing) page can show a real banner instead of a
    // dedicated banner field the admin would have to fill in separately.
    // webHero already exists on every category (categorySchema.js's
    // "1200x400 horizontal banner" field) and is editable today via the
    // admin Category.js form — this just gives it a consumer here.
    const parentDoc = data.find((d) => d.slug === matchedKey);
    const parent = parentDoc
      ? {
          title: parentDoc.title || parentDoc.category,
          description: parentDoc.description || "",
          webHero: parentDoc.categoryImages?.webHero
            ? assetUrl(parentDoc.categoryImages.webHero, { version: parentDoc.updatedAt })
            : "",
        }
      : {};

    return res.json({ parent, groups: result });
  } catch (error) {
    console.error("getV2SubCategoryGroupsAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─── V2: Parent-of-subcategory (reverse lookup) ────────────────────────────────
// Given a subcategory slug, resolves the parentSlug it actually belongs to
// per the same dynamic subCategoryMapping used above. Used to validate
// /:location/:category/:subcategory URLs so a bogus :category segment
// (e.g. "beauty-and-spa/chairs-on-rent") can be redirected to the real
// pairing ("rent-and-hire/chairs-on-rent") instead of silently rendering.
export const getV2ParentOfSubCategoryAction = async (req, res) => {
  try {
    const { subcategorySlug } = req.params;

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const subCatLookup = buildSubCatLookup(settings);
    const subCatGroupLookup = buildSubCatGroupLookup(settings);

    const cleanText = (text = "") =>
      text.toLowerCase().trim()
        .replace(/[-_\s]+/g, " ")
        .replace(/\bcontractors\b/g, "contractor")
        .replace(/\s+/g, " ");

    const category = await categoryModel.findOne({ slug: subcategorySlug, isActive: true }).lean();
    const targetName = category ? cleanText(category.category) : cleanText(subcategorySlug.replace(/-/g, " "));

    let parentSlug = Object.keys(subCatLookup).find((key) =>
      subCatLookup[key].some((item) => cleanText(item.name) === targetName)
    ) || null;

    // A subcategory that lives only inside a group (not the flat mapping)
    // isn't found above — search the group lookup too, additive: only runs
    // when the flat search missed, and only ever adds groupSlug/groupName,
    // never changes parentSlug's meaning for the existing flat case.
    let groupSlug = null;
    let groupName = null;
    if (!parentSlug) {
      for (const [pSlug, groups] of Object.entries(subCatGroupLookup)) {
        const match = groups.find((g) => (g.subCategoryNames || []).some((n) => cleanText(n) === targetName));
        if (match) {
          parentSlug = pSlug;
          groupSlug = match.groupSlug;
          groupName = match.groupName;
          break;
        }
      }
    }

    // parentSlug alone isn't enough to render a breadcrumb crumb — title-
    // casing the slug client-side breaks on "&", "and", and acronyms
    // (see the district URL migration's breadcrumb phase). subCategoryMapping
    // only stores the parent's slug, not its display name, so look up the
    // actual category doc for it — additive, only runs when parentSlug was
    // found, and null (not an error) when that category doc doesn't exist,
    // matching this endpoint's existing "best-effort, never throws" contract.
    const parentCategoryDoc = parentSlug
      ? await categoryModel.findOne({ slug: parentSlug, isActive: true }).lean()
      : null;

    return res.json({
      parentSlug,
      parentName: parentCategoryDoc?.category || null,
      groupSlug,
      groupName,
    });
  } catch (error) {
    console.error("getV2ParentOfSubCategoryAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─── V2: District-scoped category explorer ─────────────────────────────────
// Categories that actually have live businesses in a given district — unlike
// getHomeCategoriesAction's FEATURED_ORDER list above, which is a fixed,
// curated 20-item set shown identically everywhere regardless of place, with
// no relationship to what's actually available anywhere. Paginated for
// infinite scroll: 443 categories carry categoryType "Primary Category"
// alone, and a well-established district can plausibly have several dozen
// with real listings — more than fits one screen, unlike the fixed home list.
//
// Top-level filtering deliberately does NOT use categoryType — verified
// against massClick_dev that it's set inconsistently (8 of 23 categories the
// rest of the app already treats as top-level, including "Hotels", are
// tagged "Sub Category"). Uses isTopLevelCategoryName instead — see
// helper/category/categoryHierarchyHelper.js for why that's the
// authoritative source (subCategoryMapping, the same data
// getV2ParentOfSubCategoryAction uses for the inverse question) and
// helper/location/urlSegmentClassifier.js for the same fix applied to the
// district-URL segment classifier, which had the identical bug.
//
// Counts are direct matches only: a business tagged with a genuine
// subcategory name does not roll up into its parent's count here. This grid
// is explicitly the top-level "explore" surface — matching the existing
// page's own semantics, where subcategories are reached by drilling into a
// primary category via categoryRouter.js's hasSubcategories branch, not
// shown at this level.
export const getV2DistrictCategoriesAction = async (req, res) => {
  try {
    const { district, location = "", search = "" } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(req.query.pageSize, 10) || 24));

    if (!district) {
      return res.status(400).json({ message: "district is required" });
    }

    const districtDoc = await resolveDistrictBySlug(district);
    if (!districtDoc) {
      return res.status(404).json({ message: "District not found" });
    }
    const locationDoc = location
      ? (await resolveRouteLocation({ districtSlug: district, locationSlug: location }).catch(() => null))?.locationDoc
      : null;
    const locationScope = locationDoc
      ? await resolveLocationSearchScope(locationDoc).catch(() => null)
      : null;
    const locationMatch = locationScope?.slugPrefixRegex
      ? { "masterLocation.slug": locationScope.slugPrefixRegex }
      : {};

    // Three independent, cheap lookups rather than a cross-collection
    // $lookup: business.category and categoryModel.category aren't reliably
    // the same case (spot-checked against massClick_dev: both happen to be
    // lowercase today, but categoryModel.category has no `lowercase: true`
    // constraint, so an admin-entered mixed-case name is valid data), and a
    // case-insensitive $lookup needs a $toLower on both sides via an
    // aggregation pipeline anyway. Joining in application code over a few
    // hundred small category docs is simpler and just as fast.
    const [counts, allCategories, subCategoryNames] = await Promise.all([
      businessListModel.aggregate([
        {
          $match: {
            businessesLive: true,
            isActive: true,
            "masterLocation.district": districtDoc.district,
            ...locationMatch,
          },
        },
        { $group: { _id: { $toLower: "$category" }, count: { $sum: 1 } } },
      ]),
      categoryModel
        .find({ isActive: true }, { category: 1, slug: 1, categoryImageKey: 1 })
        .lean(),
      getSubCategoryNameSet(),
    ]);

    const countByCategory = new Map(counts.map((c) => [c._id, c.count]));
    const searchText = search.trim().toLowerCase();
    const primaryCategories = allCategories.filter(
      (cat) => !subCategoryNames.has(String(cat.category || "").toLowerCase().trim())
    );

    const withCounts = primaryCategories
      .map((cat) => ({
        _id: cat._id,
        name: cat.category,
        slug: cat.slug,
        icon: cat.categoryImageKey ? assetUrl(cat.categoryImageKey, { version: cat.updatedAt }) : null,
        count: countByCategory.get(String(cat.category || "").toLowerCase().trim()) || 0,
      }))
      // Only categories with real presence in this district — an empty tile
      // ("0 businesses") is not a useful "explore" result.
      .filter((cat) => cat.count > 0 && (!searchText || cat.name.toLowerCase().includes(searchText)))
      // Most-represented first: the natural ordering for "what's actually
      // available here". Alphabetical only breaks count ties.
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const total = withCounts.length;
    const start = (page - 1) * pageSize;
    const categories = withCounts.slice(start, start + pageSize);

    return res.json({
      categories,
      total,
      page,
      pageSize,
      hasMore: start + categories.length < total,
    });
  } catch (error) {
    console.error("getV2DistrictCategoriesAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─── V2: Popular Search Cards ─────────────────────────────────────────────────

const FALLBACK_POPULAR_SEARCHES = [
  { title: "CCTV",        imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "CCTV camera installation" },
  { title: "Hotels",      imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Modern hotel room" },
  { title: "Photography", imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Photographer with camera" },
  { title: "Education",   imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Graduation scroll" },
  { title: "Logistics",   imageKey: "", buttonText: "Enquire Now", accent: "#5dade2", alt: "Logistics and delivery" },
  { title: "Consulting",  imageKey: "", buttonText: "Enquire Now", accent: "#2ecc71", alt: "Business consulting" },
];

export const getV2PopularSearchesAction = async (req, res) => {
  try {
    const cacheKey = "popular-searches:home:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const cards = settings?.popularSearchCards?.length > 0
      ? settings.popularSearchCards
      : FALLBACK_POPULAR_SEARCHES;

    const result = cards.map((card) => ({
      title:      card.title,
      imageUrl:   card.imageKey ? getSignedUrlByKey(card.imageKey) : "",
      buttonText: card.buttonText || "Enquire Now",
      accent:     card.accent || "#e67e22",
      alt:        card.alt || card.title,
    }));

    await setCache(cacheKey, result, 86400);
    return res.send(result);
  } catch (error) {
    console.error("getV2PopularSearchesAction error:", error);
    return res.status(500).send({ message: error.message });
  }
};

// ─── V2: Top Tourist Places ───────────────────────────────────────────────────

const FALLBACK_TOP_TOURIST = [
  { name: "Ooty",      imageKey: "", alt: "Ooty Hills",     path: "/trending/ooty" },
  { name: "Bangalore", imageKey: "", alt: "Bangalore City", path: "/trending/bangalore" },
  { name: "Chennai",   imageKey: "", alt: "Chennai City",   path: "/trending/chennai" },
  { name: "Hyderabad", imageKey: "", alt: "Hyderabad City", path: "/trending/hyderabad" },
];

export const getV2TopTouristAction = async (req, res) => {
  try {
    const cacheKey = "top-tourist:home:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const places = settings?.topTouristPlaces?.length > 0
      ? settings.topTouristPlaces
      : FALLBACK_TOP_TOURIST;

    const result = places.map((place) => ({
      name:     place.name,
      imageUrl: place.imageKey ? getSignedUrlByKey(place.imageKey) : "",
      alt:      place.alt || place.name,
      path:     place.path || `/trending/${place.name.toLowerCase()}`,
    }));

    await setCache(cacheKey, result, 86400);
    return res.send(result);
  } catch (error) {
    console.error("getV2TopTouristAction error:", error);
    return res.status(500).send({ message: error.message });
  }
};

// ─── V2: Popular Category Content (tabs + services + link sections) ───────────

const FALLBACK_POPULAR_CATEGORY_SERVICES = [
  { title: "MNI",                 icon: "handshake", route: "/user_mni",      description: "Experience the ultimate MNI portal by MassClick. Explore diverse categories, connect with vendors, and discover wholesale opportunities through a simple local discovery experience." },
  { title: "Packers and Movers",  icon: "package",   routeSlug: "packers-and-movers",  searchName: "Packers and Movers",  description: "Find reliable relocation partners, compare movers for your location, get quotes from providers, and check ratings before making your selection." },
  { title: "Order Food Online",   icon: "food",      routeSlug: "restaurants",         searchName: "Restaurants",         description: "Find restaurants, explore cuisines, view reviews and ratings, discover offers, and get your favourite food delivered to your doorstep." },
  { title: "Movies",              icon: "movies",    routeSlug: "theaters",            searchName: "Theaters",            description: "Access movie information, discover theatres, view show details, and make a better choice for the movie you would like to watch." },
  { title: "Spa & Salon",         icon: "spa",       routeSlug: "beauty-spa",          searchName: "Beauty Spa",          description: "Find salons and spas near you, compare options, and book pampering, grooming, beauty, and wellness services with confidence." },
  { title: "Repair & Services",   icon: "repair",    routeSlug: "bike-service",        searchName: "Bike Service",        description: "Find trusted help for appliance repair, car service, cleaning, water purifier service, utility maintenance, and daily home service needs." },
  { title: "Doctor Appointment",  icon: "doctor",    routeSlug: "hospitals",           searchName: "Hospitals",           description: "Find suitable medical specialists near you and connect with healthcare providers for everyday health and well-being needs." },
  { title: "Real Estate Agents",  icon: "realEstate",routeSlug: "real-estate",         searchName: "Real Estate",         description: "Discover agents and developers for PG, rentals, buying, selling, and local property updates across residential and commercial projects." },
];

const FALLBACK_POPULAR_CATEGORY_LINK_SECTIONS = [
  {
    title: "Trending Searches",
    keywords: [
      "English Medium Schools","Packers And Movers (Within City)","Home Delivery Restaurants","Estate Agents For Land","Wedding Photographers","Income Tax Consultants","Newspaper Advertising Agencies","Hepatologist Doctors","Search Engine Optimization Services","Motorcycle Repair & Services-TVS","Tyre Dealers-JK","Tutorials For SSC Cgl","Bitcoin Services","Tour Packages For Goa","Transporters For Kolkata","Tour Packages For Manali","Transporters For Bihar","Pet Food Dealers","Event Organisers For Jagran","Tutorials For UGC Net Exam","Battery Operated Scooter Dealers-Ather Energy","Courier Services For USA","Transporters For Rajasthan","MCA Institutes","Tutorials For Ctet","Share Brokers-Angel One","Transporters For Punjab","LPG Conversion Kit Dealers","Event Organisers For Bhajan Sandhya","Bhojpuri Film Producers","Courier Services For Dubai","Khatu Shyam Bhajan Singers","Dairy Product Retailers-Amul","Bengali Sweet Retailers","Ayurvedic Doctors For Hair Fall Treatment","Overseas Education Consultants For Luxembourg","Tutorials For NIOS Class XII","Packers And Movers For Hyderabad","Dish Antenna Installation Services-Tata Sky","Event Organisers For DJ","Personal Loans-Axis Bank","Car Rental-Toyota","Marathi Books","Women Top Retailers","HD Makeup Artists","Cricket T Shirt Manufacturers","Ad Film Makers","ABC Fire Extinguisher Dealers","Solar Panel Dealers-Vikram Solar","Kick Scooter Dealers",
    ],
  },
];

export const getV2PopularCategoryContentAction = async (req, res) => {
  try {
    const cacheKey = "popular-category-content:home:v2";
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const settings = await categoryDisplaySettingsModel.findOne().lean();

    const tabs = settings?.popularCategoryTabs?.length > 0
      ? settings.popularCategoryTabs.map((t) => ({ category: t.category, keywords: t.keywords || [] }))
      : [];

    const services = settings?.popularCategoryServices?.length > 0
      ? settings.popularCategoryServices.map((s) => ({
          title:       s.title,
          description: s.description || "",
          icon:        s.icon || "",
          route:       s.route || "",
          searchName:  s.searchName || "",
          routeSlug:   s.routeSlug || "",
        }))
      : FALLBACK_POPULAR_CATEGORY_SERVICES;

    const linkSections = settings?.popularCategoryLinkSections?.length > 0
      ? settings.popularCategoryLinkSections.map((l) => ({ title: l.title, keywords: l.keywords || [] }))
      : FALLBACK_POPULAR_CATEGORY_LINK_SECTIONS;

    const result = { tabs, services, linkSections };
    await setCache(cacheKey, result, 86400);
    return res.send(result);
  } catch (error) {
    console.error("getV2PopularCategoryContentAction error:", error);
    return res.status(500).send({ message: error.message });
  }
};

// ─── Admin: single-category group assignment (Category.js UX) ─────────────────
// Lets the category edit page assign/move a category's hierarchy placement
// (flat subCategoryMapping, or a subCategoryGroupMapping group) without
// opening the big Category Display Settings panel. Writes use targeted Mongo
// update operators ($pull / $addToSet / $push on specific array paths)
// instead of a whole-document GET+PUT, so this can't clobber — or be
// clobbered by — an admin concurrently editing that panel's full settings
// document.

export const getCategoryGroupAssignmentAction = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await categoryModel.findOne({ slug, isActive: true }).lean();
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const settings = await categoryDisplaySettingsModel.findOne().lean();
    const name = category.category;

    const flatRow = (settings?.subCategoryMapping || []).find((row) =>
      (row.subCategoryNames || []).includes(name)
    );
    if (flatRow) {
      return res.json({ success: true, data: { parentSlug: flatRow.parentSlug, groupSlug: null, groupName: null } });
    }

    const groupRow = (settings?.subCategoryGroupMapping || []).find((row) =>
      (row.subCategoryNames || []).includes(name)
    );
    if (groupRow) {
      return res.json({
        success: true,
        data: { parentSlug: groupRow.parentSlug, groupSlug: groupRow.groupSlug, groupName: groupRow.groupName },
      });
    }

    return res.json({ success: true, data: null });
  } catch (error) {
    console.error("getCategoryGroupAssignmentAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategoryGroupAssignmentAction = async (req, res) => {
  try {
    const { slug } = req.params;
    const { parentSlug, groupSlug = "", groupName = "" } = req.body;

    if (!parentSlug) {
      return res.status(400).json({ success: false, message: "parentSlug is required" });
    }

    const category = await categoryModel.findOne({ slug, isActive: true }).lean();
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    const name = category.category;

    // Ensure the singleton settings doc exists before any array op below —
    // mirrors getCategoryDisplaySettingsAction's create-if-missing behavior.
    await categoryDisplaySettingsModel.findOneAndUpdate({}, {}, { upsert: true });

    // Clear any prior placement first — a subcategory belongs to exactly one
    // parent/group at a time, so reassigning must remove the old placement
    // before adding the new one. $[] applies to every array element, so this
    // is one atomic op per field regardless of how many rows exist.
    await categoryDisplaySettingsModel.updateOne(
      {},
      {
        $pull: {
          "subCategoryMapping.$[].subCategoryNames": name,
          "subCategoryGroupMapping.$[].subCategoryNames": name,
        },
      }
    );

    if (groupSlug) {
      const pushed = await categoryDisplaySettingsModel.updateOne(
        { subCategoryGroupMapping: { $elemMatch: { parentSlug, groupSlug } } },
        { $addToSet: { "subCategoryGroupMapping.$.subCategoryNames": name } }
      );
      if (pushed.matchedCount === 0) {
        if (!groupName) {
          return res.status(400).json({ success: false, message: "groupName is required to create a new group" });
        }
        await categoryDisplaySettingsModel.updateOne(
          {},
          { $push: { subCategoryGroupMapping: { parentSlug, groupSlug, groupName, groupIcon: "", subCategoryNames: [name] } } }
        );
      }
    } else {
      const pushed = await categoryDisplaySettingsModel.updateOne(
        { "subCategoryMapping.parentSlug": parentSlug },
        { $addToSet: { "subCategoryMapping.$.subCategoryNames": name } }
      );
      if (pushed.matchedCount === 0) {
        await categoryDisplaySettingsModel.updateOne(
          {},
          { $push: { subCategoryMapping: { parentSlug, subCategoryNames: [name] } } }
        );
      }
    }

    await categoryDisplaySettingsModel.updateOne({}, { $set: { updatedBy: req.authUser?.email || "admin" } });

    await invalidateCategoryDisplaySettingsCache();
    invalidateSubCategoryNameCache();
    invalidateSubCategoryGroupCache();

    return res.json({ success: true, data: { parentSlug, groupSlug: groupSlug || null } });
  } catch (error) {
    console.error("updateCategoryGroupAssignmentAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Upload home-section image ─────────────────────────────────────────

export const uploadHomeSectionImageAction = async (req, res) => {
  try {
    const { imageData, folder = "home-sections" } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, message: "imageData is required" });
    }
    if (!imageData.startsWith("data:image")) {
      return res.status(400).json({ success: false, message: "imageData must be a base64 data URL" });
    }

    // `folder` distinguishes which card array this belongs to (the client sends
    // "home-sections/popular-search" or "home-sections/top-tourist"); cards/places
    // have no id of their own, so scope by the one settings document's _id, or a
    // ULID if it doesn't exist yet (this endpoint runs before any settings save).
    const settingsDoc = await categoryDisplaySettingsModel.findOne().select("_id").lean();
    const entityId = settingsDoc?._id || ulid();
    const uploadPath = String(folder).includes("top-tourist")
      ? s3Keys.homeSection.topTourist(entityId)
      : s3Keys.homeSection.popularSearch(entityId);
    const { key: imageKey } = await uploadImageToS3(imageData, uploadPath);

    return res.status(200).json({
      success: true,
      imageKey,
      imageUrl: getSignedUrlByKey(imageKey),
    });
  } catch (error) {
    console.error("uploadHomeSectionImageAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
