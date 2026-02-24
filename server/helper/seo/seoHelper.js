import seoModel from "../../model/seoModel/seoModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";

export const createSeo = async (data) => {
  try {

    data.locationKey =
      data.location
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

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

export const getSeoMeta = async ({ pageType, category, location }) => {
  try {
    const normalize = (v = "") =>
      v.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const safePageType = normalize(pageType);
    const safeCategory = category ? normalize(category) : null;
    const safeLocation = location ? normalize(location) : null;

    let seo = null;

    if (safeCategory && safeLocation) {
      seo = await seoModel.findOne({
        pageType: safePageType,
        category: { $regex: safeCategory, $options: "i" },
        location: { $regex: safeLocation, $options: "i" },
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    if (safeCategory) {
      seo = await seoModel.findOne({
        pageType: safePageType,
        category: { $regex: safeCategory, $options: "i" },
        isActive: true,
      }).lean();

      if (seo) return seo;
    }

    seo = await seoModel.findOne({
      pageType: safePageType,
      isActive: true,
    }).lean();

    if (seo) return seo;

    return {
      title: "Massclick - Local Business Search Platform",
      description:
        "Find trusted local businesses, services, and professionals near you on Massclick.",
      canonical: "https://massclick.in",
      robots: "index, follow",
    };

  } catch (error) {
    console.error("SEO META FETCH ERROR:", error);
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

  // status filter
  if (status === "active")
    query.isActive = true;

  if (status === "inactive")
    query.isActive = false;

  // search filter
  if (search && search.trim() !== "") {

    const regex = new RegExp(search.trim(), "i");

    query.$or = [
      { title: regex },
      { category: regex },
      { location: regex }
    ];
  }

  // total count
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

  try {

    if (data.location) {
      data.locationKey =
        data.location
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");
    }

    const seo = await seoModel.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true
      }
    );

    if (!seo)
      throw new Error("SEO not found");

    return seo;

  } catch (error) {

    if (error.code === 11000)
      throw new Error(
        "SEO already exists for this category and location"
      );

    throw error;
  }
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