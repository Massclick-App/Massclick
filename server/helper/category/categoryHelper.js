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
      if (reqBody.categoryImages && typeof reqBody.categoryImages === "object") {
        const categoryImages = {};
        const timestamp = Date.now();

        for (const [variant, data] of Object.entries(reqBody.categoryImages)) {
          if (data && typeof data === "string" && data.startsWith("data:image")) {
            try {
              const uploadResult = await uploadImageToS3(
                data,
                `category/images/${variant}-${timestamp}`
              );
              categoryImages[variant] = uploadResult.key;
            } catch (err) {
              console.error(`Failed to upload ${variant}:`, err);
            }
          } else if (data && !data.startsWith("data:image")) {
            // Keep existing S3 key if it's not a data URL
            categoryImages[variant] = data;
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
    if (reqBody.categoryImages && typeof reqBody.categoryImages === "object") {
      const categoryImages = {};
      const timestamp = Date.now();

      for (const [variant, data] of Object.entries(reqBody.categoryImages)) {
        if (data && typeof data === "string" && data.startsWith("data:image")) {
          try {
            console.log(`[CreateCategory] Uploading ${variant} image...`);
            const uploadResult = await uploadImageToS3(
              data,
              `category/images/${variant}-${timestamp}`
            );
            categoryImages[variant] = uploadResult.key;
            console.log(`[CreateCategory] ✓ Uploaded ${variant}: ${uploadResult.key}`);
          } catch (err) {
            console.error(`[CreateCategory] ✗ Failed to upload ${variant}:`, err.message);
          }
        } else if (data && !data.startsWith("data:image")) {
          // Keep existing S3 key if it's not a data URL
          console.log(`[CreateCategory] Keeping existing ${variant} key: ${data.substring(0, 40)}...`);
          categoryImages[variant] = data;
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
          try {
            const signedUrl = getSignedUrlByKey(key);
            convertedImages[variant] = signedUrl;
            console.log(`[ViewCategory] Converted ${variant}: ${key.substring(0, 30)}... → ${signedUrl.substring(0, 50)}...`);
          } catch (err) {
            console.error(`[ViewCategory] Failed to convert ${variant}:`, err.message);
            convertedImages[variant] = key;
          }
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
            try {
              const signedUrl = getSignedUrlByKey(key);
              convertedImages[variant] = signedUrl;
              console.log(`[CategoryHelper] Converted ${variant}: ${key.substring(0, 30)}... → ${signedUrl.substring(0, 50)}...`);
            } catch (err) {
              console.error(`[CategoryHelper] Failed to convert ${variant}:`, err.message);
              convertedImages[variant] = key;
            }
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
    if (data.categoryImages && typeof data.categoryImages === "object") {
      const categoryImages = {};
      const timestamp = Date.now();

      for (const [variant, imageData] of Object.entries(data.categoryImages)) {
        if (imageData && typeof imageData === "string" && imageData.startsWith("data:image")) {
          try {
            console.log(`[UpdateCategory] Uploading ${variant} image...`);
            const uploadResult = await uploadImageToS3(
              imageData,
              `category/images/${variant}-${timestamp}`
            );
            categoryImages[variant] = uploadResult.key;
            console.log(`[UpdateCategory] ✓ Uploaded ${variant}: ${uploadResult.key}`);
          } catch (err) {
            console.error(`[UpdateCategory] ✗ Failed to upload ${variant}:`, err.message);
          }
        } else if (imageData && !imageData.startsWith("data:image")) {
          // Keep existing S3 key if it's not a data URL
          console.log(`[UpdateCategory] Keeping existing ${variant} key: ${imageData.substring(0, 40)}...`);
          categoryImages[variant] = imageData;
        } else if (imageData === null || imageData === "") {
          // Clear if empty
          categoryImages[variant] = "";
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
          try {
            const signedUrl = getSignedUrlByKey(key);
            convertedImages[variant] = signedUrl;
            console.log(`[UpdateCategory] Converted ${variant}: ${key.substring(0, 30)}... → ${signedUrl.substring(0, 50)}...`);
          } catch (err) {
            console.error(`[UpdateCategory] Failed to convert ${variant}:`, err.message);
            convertedImages[variant] = key;
          }
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
