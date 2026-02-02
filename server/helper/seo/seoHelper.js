import seoModel from "../../model/seoModel/seoModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";


export const createSeo = async (reqBody = {}) => {
  try {
    const seoDoc = new seoModel(reqBody);
    return await seoDoc.save();
  } catch (error) {
    console.error("SEO create error:", error);
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
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder
}) => {
  try {
    let query = {};

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    if (search && search.trim() !== "") {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
        { location: { $regex: search.trim(), $options: "i" } }
      ];
    }

    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const total = await seoModel.countDocuments(query);

    const list = await seoModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list, total };

  } catch (error) {
    console.error("Error fetching SEO list:", error);
    throw error;
  }
};


export const updateSeo = async (id, data) => {
  const seo = await seoModel.findByIdAndUpdate(id, data, { new: true });
  if (!seo) throw new Error("SEO not found");
  return seo;
};

export const deleteSeo = async (id) => {
  const seo = await seoModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!seo) throw new Error("SEO not found");
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