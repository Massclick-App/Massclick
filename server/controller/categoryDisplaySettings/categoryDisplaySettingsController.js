import categoryDisplaySettingsModel from "../../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { categoriesData } from "../../utils/sub-categoriesData.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import { invalidateCategoryDisplaySettingsCache } from "../../utils/cacheInvalidation.js";

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

const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

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

    if (!Object.keys(updates).length)
      return res.status(400).json({ success: false, message: "No valid fields provided" });

    updates.updatedBy = adminEmail;

    const saved = await categoryDisplaySettingsModel.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    await invalidateCategoryDisplaySettingsCache();

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
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = normalize(name).toLowerCase().replace(/\s+/g, "-");
      const hasSubcategories = !!subCatLookup[categoryKey];
      const subCategoryCount = subCatLookup[categoryKey]?.length || 0;

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? `${S3_BASE_URL}${found.categoryImageKey}` : null,
            liveImage: found.liveImageKey ? `${S3_BASE_URL}${found.liveImageKey}` : null,
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
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = normalize(name).toLowerCase().replace(/\s+/g, "-");
      const hasSubcategories = !!subCatLookup[categoryKey];
      const subCategoryCount = subCatLookup[categoryKey]?.length || 0;

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? `${S3_BASE_URL}${found.categoryImageKey}` : null,
            liveImage: found.liveImageKey ? `${S3_BASE_URL}${found.liveImageKey}` : null,
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
    const categories = await categoryModel.find({ isActive: true }).lean();
    const map = new Map(categories.map((cat) => [normalize(cat.category), cat]));

    const ordered = order.map((name) => {
      const found = map.get(normalize(name));
      const categoryKey = normalize(name).toLowerCase().replace(/\s+/g, "-");
      const hasSubcategories = !!subCatLookup[categoryKey];
      const subCategoryCount = subCatLookup[categoryKey]?.length || 0;

      return found
        ? {
            _id: found._id,
            name: found.category,
            slug: found.slug,
            icon: found.categoryImageKey ? `${S3_BASE_URL}${found.categoryImageKey}` : null,
            liveImage: found.liveImageKey ? `${S3_BASE_URL}${found.liveImageKey}` : null,
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
                categoryImageKey: found.categoryImageKey ? getSignedUrlByKey(found.categoryImageKey) : "",
                liveImageKey: found.liveImageKey ? getSignedUrlByKey(found.liveImageKey) : "",
                categoryImages: {
                  webHero:         found.categoryImages?.webHero         ? getSignedUrlByKey(found.categoryImages.webHero)         : "",
                  webCard:         found.categoryImages?.webCard         ? getSignedUrlByKey(found.categoryImages.webCard)         : "",
                  webThumbnail:    found.categoryImages?.webThumbnail    ? getSignedUrlByKey(found.categoryImages.webThumbnail)    : "",
                  mobileVertical:  found.categoryImages?.mobileVertical  ? getSignedUrlByKey(found.categoryImages.mobileVertical)  : "",
                  mobileCard:      found.categoryImages?.mobileCard      ? getSignedUrlByKey(found.categoryImages.mobileCard)      : "",
                  mobileThumbnail: found.categoryImages?.mobileThumbnail ? getSignedUrlByKey(found.categoryImages.mobileThumbnail) : "",
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
                categoryImageKey: found.categoryImageKey ? getSignedUrlByKey(found.categoryImageKey) : "",
                liveImageKey: found.liveImageKey ? getSignedUrlByKey(found.liveImageKey) : "",
                categoryImages: {
                  webHero:         found.categoryImages?.webHero         ? getSignedUrlByKey(found.categoryImages.webHero)         : "",
                  webCard:         found.categoryImages?.webCard         ? getSignedUrlByKey(found.categoryImages.webCard)         : "",
                  webThumbnail:    found.categoryImages?.webThumbnail    ? getSignedUrlByKey(found.categoryImages.webThumbnail)    : "",
                  mobileVertical:  found.categoryImages?.mobileVertical  ? getSignedUrlByKey(found.categoryImages.mobileVertical)  : "",
                  mobileCard:      found.categoryImages?.mobileCard      ? getSignedUrlByKey(found.categoryImages.mobileCard)      : "",
                  mobileThumbnail: found.categoryImages?.mobileThumbnail ? getSignedUrlByKey(found.categoryImages.mobileThumbnail) : "",
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

    const BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

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
          icon: item.categoryImageKey ? `${BASE_URL}${item.categoryImageKey}` : "/icons/default.webp",
          liveImage: item.liveImageKey ? `${BASE_URL}${item.liveImageKey}` : null,
        }))
      );
    }

    const fallback = selectedCategories
      .map((item, index) => ({
        _id: index + 1,
        name: item.name,
        slug: item.name.toLowerCase().replace(/\s+/g, "-"),
        icon: "/icons/default.webp",
        liveImage: null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json(fallback);
  } catch (error) {
    console.error("getV2SubCategoriesAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};
