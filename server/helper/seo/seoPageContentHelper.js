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
    const safePageType = normalizeSeoText(pageType);
    const safeCategory = category
      ? category.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : null;
    const safeLocation = location ? normalizeSeoText(location) : null;

    if (safeCategory && safeLocation) {
      return await seoPageContentModel.findOne({
        pageType: safePageType,
        category: {
          $regex: `^${safeCategory.replace(/-/g, " ")}$|^${safeCategory}$`,
          $options: "i"
        },
        location: { $regex: `^${safeLocation}$`, $options: "i" },
        isActive: true,
      }).lean();
    }

    if (safeCategory && !safeLocation) {
      return await seoPageContentModel.findOne({
        pageType: safePageType,
        category: { $regex: `^${safeCategory}$`, $options: "i" },
        isActive: true,
      }).lean();
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
    .replace(/[-_\s]+/g, " ");

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
