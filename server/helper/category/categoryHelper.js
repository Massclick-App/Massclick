import { ObjectId } from "mongodb";
import categoryModel from "../../model/category/categoryModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";


export const createCategory = async (reqBody = {}) => {
  try {
    const categoryName = reqBody.category?.trim().toLowerCase();
    if (!categoryName) throw new Error("Category is required");

    let existing = await categoryModel.findOne({
      category: { $regex: `^${categoryName}$`, $options: "i" }
    });

    if (existing) {
      const updates = {};

      if (reqBody.keywords?.length) {
        const newKeywords = reqBody.keywords
          .map((k) => k.trim().toLowerCase())
          .filter((k) => !existing.keywords.map((e) => e.trim().toLowerCase()).includes(k));

        if (newKeywords.length > 0) {
          updates.keywords = [...existing.keywords, ...newKeywords];
        }
      }

      ["slug", "seoTitle", "seoDescription", "title", "description"].forEach((field) => {
        if (reqBody[field] && reqBody[field] !== existing[field]) {
          updates[field] = reqBody[field];
        }
      });

      // Handle new categoryImages object (6 variants)
      // Frontend should send S3 keys only (no data URLs, no signed URLs)
      if (reqBody.categoryImages && typeof reqBody.categoryImages === "object") {
        const categoryImages = {};

        for (const [variant, imageData] of Object.entries(reqBody.categoryImages)) {
          if (!imageData || imageData === "" || imageData === null) {
            categoryImages[variant] = "";
          } else if (typeof imageData === "string") {
            if (imageData.startsWith("data:image")) {
              console.error(`${variant}: Data URLs should be uploaded via /api/category/upload-images first`);
              categoryImages[variant] = "";
            } else if (imageData.startsWith("http")) {
              console.error(`${variant}: Cannot store full URLs, must be S3 keys`);
              categoryImages[variant] = "";
            } else {
              categoryImages[variant] = imageData;
            }
          }
        }
        updates.categoryImages = categoryImages;
      }

      // Legacy support: handle old categoryImage and liveImage fields
      if (reqBody.categoryImage) {
        const uploadResult = await uploadImageToS3(
          reqBody.categoryImage,
          `category/images/category-${Date.now()}`
        );
        updates.categoryImageKey = uploadResult.key;
      }

      if (reqBody.liveImage) {
        const uploadResult = await uploadImageToS3(
          reqBody.liveImage,
          `category/live-images/category-${Date.now()}`
        );
        updates.liveImageKey = uploadResult.key;
      }

      await categoryModel.findByIdAndUpdate(existing._id, updates);
      return {
        message: "Category updated",
        category: await categoryModel.findById(existing._id).lean(),
      };
    }

    // Handle new categoryImages object (6 variants)
    // Frontend should send S3 keys only (no data URLs, no signed URLs)
    if (reqBody.categoryImages && typeof reqBody.categoryImages === "object") {
      const categoryImages = {};

      for (const [variant, imageData] of Object.entries(reqBody.categoryImages)) {
        if (!imageData || imageData === "" || imageData === null) {
          categoryImages[variant] = "";
        } else if (typeof imageData === "string") {
          if (imageData.startsWith("data:image")) {
            console.error(`${variant}: Data URLs should be uploaded via /api/category/upload-images first`);
            categoryImages[variant] = "";
          } else if (imageData.startsWith("http")) {
            console.error(`${variant}: Cannot store full URLs, must be S3 keys`);
            categoryImages[variant] = "";
          } else {
            categoryImages[variant] = imageData;
          }
        }
      }
      reqBody.categoryImages = categoryImages;
    }

    // Legacy support: handle old categoryImage and liveImage fields
    if (reqBody.categoryImage) {
      const uploadResult = await uploadImageToS3(
        reqBody.categoryImage,
        `category/images/category-${Date.now()}`
      );
      delete reqBody.categoryImage;
      reqBody.categoryImageKey = uploadResult.key;
    }

    if (reqBody.liveImage) {
      const uploadResult = await uploadImageToS3(
        reqBody.liveImage,
        `category/live-images/category-${Date.now()}`
      );
      delete reqBody.liveImage;
      reqBody.liveImageKey = uploadResult.key;
    }

    reqBody.category = categoryName;

    const categoryDocument = new categoryModel(reqBody);
    const result = await categoryDocument.save();

    if (result.categoryImageKey) {
      result.categoryImage = getSignedUrlByKey(result.categoryImageKey);
    }

    return { message: "Category created", category: result };

  } catch (error) {
    console.error("Error saving category:", error);
    throw error;
  }
};


export const viewCategory = async (id) => {
  try {
    if (!ObjectId.isValid(id)) throw new Error("Invalid category ID");

    const category = await categoryModel.findById(id).lean();
    if (!category) throw new Error("Category not found");

    // Convert categoryImages S3 keys to signed URLs
    if (category.categoryImages && typeof category.categoryImages === "object") {
      const convertedImages = {};
      for (const [variant, key] of Object.entries(category.categoryImages)) {
        if (key && typeof key === "string") {
          convertedImages[variant] = getSignedUrlByKey(key);
        } else {
          convertedImages[variant] = key;
        }
      }
      category.categoryImages = convertedImages;
    }

    if (category.categoryImageKey) {
      category.categoryImage = getSignedUrlByKey(category.categoryImageKey);
    }
    if (category.liveImageKey) {
      category.liveImage = getSignedUrlByKey(category.liveImageKey);
    }

    return category;
  } catch (error) {
    console.error("Error fetching category:", error);
    throw error;
  }
};


export const viewAllCategory = async ({
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
      query.category = { $regex: search.trim(), $options: "i" };
    }

    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const total = await categoryModel.countDocuments(query);

    const categories = await categoryModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const list = categories.map((c) => {
      // Convert categoryImages S3 keys to signed URLs
      if (c.categoryImages && typeof c.categoryImages === "object") {
        const convertedImages = {};
        for (const [variant, key] of Object.entries(c.categoryImages)) {
          if (key && typeof key === "string") {
            convertedImages[variant] = getSignedUrlByKey(key);
          } else {
            convertedImages[variant] = key;
          }
        }
        c.categoryImages = convertedImages;
      }

      if (c.categoryImageKey) {
        c.categoryImage = getSignedUrlByKey(c.categoryImageKey);
      }
      if (c.liveImageKey) {
        c.liveImage = getSignedUrlByKey(c.liveImageKey);
      }
      return c;
    });

    return { list, total };
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};


export const updateCategory = async (id, data) => {
  try {
    if (!ObjectId.isValid(id)) throw new Error("Invalid category ID");

    if (data.parentCategoryId === "" || data.parentCategoryId === undefined) {
      data.parentCategoryId = null;
    }

    if (typeof data.keywords === "string") {
      data.keywords = data.keywords
        .split(",")
        .map((kw) => kw.trim())
        .filter(Boolean);
    }

    // Handle new categoryImages object (6 variants)
    // Frontend should send S3 keys only (no data URLs, no signed URLs)
    if (data.categoryImages && typeof data.categoryImages === "object") {
      const categoryImages = {};

      for (const [variant, imageData] of Object.entries(data.categoryImages)) {
        if (!imageData || imageData === "" || imageData === null) {
          // Clear if empty
          categoryImages[variant] = "";
        } else if (typeof imageData === "string") {
          // Should be S3 key (e.g., "category/images/variant-123.webp")
          // Reject data URLs and full URLs
          if (imageData.startsWith("data:image")) {
            console.error(`${variant}: Data URLs should be uploaded via /api/category/upload-images first`);
            categoryImages[variant] = "";
          } else if (imageData.startsWith("http")) {
            // Reject full URLs (signed or unsigned)
            console.error(`${variant}: Cannot store full URLs, must be S3 keys`);
            categoryImages[variant] = "";
          } else {
            // Store S3 key as-is
            categoryImages[variant] = imageData;
          }
        }
      }
      data.categoryImages = categoryImages;
    }

    // Legacy support: handle old categoryImage and liveImage fields
    if (
      data.categoryImage &&
      typeof data.categoryImage === "string" &&
      data.categoryImage.startsWith("data:image")
    ) {
      const uploadResult = await uploadImageToS3(
        data.categoryImage,
        `category/images/category-${Date.now()}`
      );
      data.categoryImageKey = uploadResult.key;
    } else if (data.categoryImage === null || data.categoryImage === "") {
      data.categoryImageKey = "";
    }
    delete data.categoryImage;

    if (
      data.liveImage &&
      typeof data.liveImage === "string" &&
      data.liveImage.startsWith("data:image")
    ) {
      const uploadResult = await uploadImageToS3(
        data.liveImage,
        `category/live-images/category-${Date.now()}`
      );
      data.liveImageKey = uploadResult.key;
    } else if (data.liveImage === null || data.liveImage === "") {
      data.liveImageKey = "";
    }
    delete data.liveImage;

    const category = await categoryModel.findByIdAndUpdate(id, data, { new: true });
    if (!category) throw new Error("Category not found");

    // Convert categoryImages S3 keys to signed URLs
    if (category.categoryImages && typeof category.categoryImages === "object") {
      const convertedImages = {};
      for (const [variant, key] of Object.entries(category.categoryImages)) {
        if (key && typeof key === "string") {
          convertedImages[variant] = getSignedUrlByKey(key);
        } else {
          convertedImages[variant] = key;
        }
      }
      category.categoryImages = convertedImages;
    }

    if (category.categoryImageKey) {
      category.categoryImage = getSignedUrlByKey(category.categoryImageKey);
    }
    if (category.liveImageKey) {
      category.liveImage = getSignedUrlByKey(category.liveImageKey);
    }

    return category;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};


export const deleteCategory = async (id) => {
  try {
    if (!ObjectId.isValid(id)) throw new Error("Invalid category ID");

    const deletedCategory = await categoryModel.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    if (!deletedCategory) throw new Error("Category not found");

    return deletedCategory;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

export const hardDeleteCategory = async (id) => {
  try {
    if (!ObjectId.isValid(id)) throw new Error("Invalid category ID");

    const deleted = await categoryModel.findByIdAndDelete(id);
    if (!deleted) throw new Error("Category not found");

    return deleted;
  } catch (error) {
    console.error("Error hard-deleting category:", error);
    throw error;
  }
};

export const businessSearchCategory = async (query, limit) => {
  try {
    const regex = new RegExp(query, "i");

    const results = await categoryModel
      .find(
        {
          isActive: true,
          category: { $regex: regex } 
        },
        {
          category: 1,
          keywords: 1,
          slug: 1,
          seoTitle: 1,
          seoDescription: 1,
          title: 1,
          description: 1,
          categoryImageKey: 1
        }
      )
      .limit(limit)
      .lean();

    return results.map((cat) => {
      if (cat.categoryImageKey) {
        cat.categoryImage = getSignedUrlByKey(cat.categoryImageKey);
      }
      if (cat.liveImageKey) {
        cat.liveImage = getSignedUrlByKey(cat.liveImageKey);
      }
      return cat;
    });

  } catch (error) {
    console.error("Error searching categories:", error);
    throw error;
  }
};
