import { uploadImageToS3 } from "../../s3Uploder.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import { invalidateCategoryCache } from "../../utils/cacheInvalidation.js";
import { ObjectId } from "mongodb";
import categoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";

export const uploadCategoryImagesAction = async (req, res) => {
  try {
    const { variant, imageData, categoryId } = req.body;

    if (!variant || !imageData) {
      return res.status(BAD_REQUEST.code).send({ message: "variant and imageData are required" });
    }

    if (!imageData.startsWith("data:image")) {
      return res.status(BAD_REQUEST.code).send({ message: "Invalid image format. Must be base64." });
    }

    const uploadResult = await uploadImageToS3(
      imageData,
      `category/images/${variant}-${Date.now()}`
    );

    const imageKey = uploadResult.key;

    // Auto-update category if categoryId is provided
    if (categoryId && ObjectId.isValid(categoryId)) {
      // Use dot notation to update only this variant, not replace entire categoryImages
      const updateData = {};
      updateData[`categoryImages.${variant}`] = imageKey;

      await categoryModel.findByIdAndUpdate(
        categoryId,
        { $set: updateData },
        { new: true }
      );
    }

    // Invalidate category caches
    await invalidateCategoryCache();

    res.send({
      success: true,
      imageKey,
      variant,
      imageUrl: getSignedUrlByKey(imageKey)
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
