import { uploadImageToS3 } from "../../s3Uploder.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import { invalidateCategoryCache } from "../../utils/cacheInvalidation.js";
import { ObjectId } from "mongodb";
import categoryModel from "../../model/category/categoryModel.js";
import { s3Keys } from "../../utils/s3ObjectKeys.js";
import { assetUrl } from "../../utils/assetUrl.js";
import { ulid } from "../../utils/idGen.js";

export const uploadCategoryImagesAction = async (req, res) => {
  try {
    const { variant, imageData, categoryId } = req.body;

    if (!variant || !imageData) {
      return res.status(BAD_REQUEST.code).send({ message: "variant and imageData are required" });
    }

    if (!imageData.startsWith("data:image")) {
      return res.status(BAD_REQUEST.code).send({ message: "Invalid image format. Must be base64." });
    }

    const hasCategory = categoryId && ObjectId.isValid(categoryId);
    // s3Keys.category.variant() validates `variant` against the registry's 6 named
    // variants and throws on anything else — this endpoint had no such check before.
    // No category may exist yet (a create-category form uploads variants before the
    // category itself), so fall back to a ULID, same pattern as every other
    // decoupled-upload endpoint in 1.4.
    const uploadResult = await uploadImageToS3(
      imageData,
      s3Keys.category.variant(hasCategory ? categoryId : ulid(), variant),
    );

    const imageKey = uploadResult.key;
    let version = new Date();

    // Auto-update category if categoryId is provided
    if (hasCategory) {
      // Use dot notation to update only this variant, not replace entire categoryImages
      const updateData = {};
      updateData[`categoryImages.${variant}`] = imageKey;

      const updated = await categoryModel.findByIdAndUpdate(
        categoryId,
        { $set: updateData },
        { new: true }
      );
      if (updated?.updatedAt) version = updated.updatedAt;
    }

    // Invalidate category caches
    await invalidateCategoryCache();

    res.send({
      success: true,
      imageKey,
      variant,
      imageUrl: assetUrl(imageKey, { version }),
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
