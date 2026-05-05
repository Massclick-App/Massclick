import seoPageContentModel from "../../model/seoModel/seoPageContentModel.js";

export const createPageContentSeo = async (reqBody = {}) => {
  try {
    const seoDoc = new seoPageContentModel(reqBody);
    return await seoDoc.save();
  } catch (error) {
    console.error("SEO create error:", error);
    throw error;
  }
};

export const getSeoPageContent = async ({ pageType, category, location }) => {
  try {
    const query = {
      pageType,
      isActive: true,
    };

    if (category) query.category = category;
    if (location) query.location = location;

    return await seoPageContentModel.findOne(query).lean();
  } catch (error) {
    console.error("SEOPageContent fetch error:", error);
    throw error;
  }
};


export const getSeoPageContentMetaService = async ({
  pageType,
  category,
  location,
}) => {
  try {
    // 🔹 Normalize
    const safePageType = normalizeSeoText(pageType);
    const safeCategory = category ? normalizeSeoText(category) : null;
    const safeLocation = location ? normalizeSeoText(location) : null;

    // 🔹 Escape regex special chars
    const escapeRegex = (str = "") =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 🔹 Flexible spacing (fix double-space issue)
    const makeFlexible = (str = "") =>
      escapeRegex(str).replace(/\s+/g, "\\s+");

    let seo = null;

    // ===============================
    // 🔥 1. EXACT MATCH (FAST)
    // ===============================
    if (safeCategory && safeLocation) {
      seo = await seoPageContentModel.findOne({
        pageType: safePageType,
        category: safeCategory,
        location: safeLocation,
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    // ===============================
    // 🔥 2. EXACT CATEGORY ONLY
    // ===============================
    if (safeCategory) {
      seo = await seoPageContentModel.findOne({
        pageType: safePageType,
        category: safeCategory,
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    // Prepare flexible regex
    const flexibleCategory = safeCategory
      ? `^${makeFlexible(safeCategory)}$`
      : null;

    const flexibleLocation = safeLocation
      ? `^${makeFlexible(safeLocation)}$`
      : null;

    // ===============================
    // 🔥 3. FLEXIBLE STRICT MATCH
    // ===============================
    if (safeCategory && safeLocation) {
      seo = await seoPageContentModel.findOne({
        pageType: safePageType,
        category: { $regex: flexibleCategory, $options: "i" },
        location: { $regex: flexibleLocation, $options: "i" },
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    // ===============================
    // 🔥 4. FLEXIBLE CATEGORY ONLY
    // ===============================
    if (safeCategory) {
      seo = await seoPageContentModel.findOne({
        pageType: safePageType,
        category: { $regex: flexibleCategory, $options: "i" },
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    return null;
  } catch (error) {
    console.error("SEO PAGE CONTENT FETCH ERROR:", error);
    return null;
  }
};


export const normalizeSeoText = (v = "") =>
  v
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[-_\s]+/g, " ")   // collapse spaces + dash/underscore
    .replace(/\s+/g, " ");      // extra safety

export const viewAllSeoPageContent = async ({
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder,
}) => {
  try {
    let query = {};

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    if (search && search.trim()) {
      const safeSearch = normalizeSeoText(search);

      query.$or = [
        { pageType: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { location: { $regex: safeSearch, $options: "i" } },
        { headerContent: { $regex: safeSearch, $options: "i" } },
        { pageContent: { $regex: safeSearch, $options: "i" } },
      ];
    }

    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const total = await seoPageContentModel.countDocuments(query);

    const list = await seoPageContentModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list, total };
  } catch (error) {
    console.error("viewAllSeoPageContent error:", error);
    throw error;
  }
};


export const updateSeoPageContent = async (id, data) => {
  const seo = await seoPageContentModel.findByIdAndUpdate(id, data, { new: true });
  if (!seo) throw new Error("SEOPageContent not found");
  return seo;
};

export const deleteSeoPageContent = async (id) => {
  const seo = await seoPageContentModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!seo) throw new Error("SEOPageContent not found");
  return seo;
};
