import { uploadImageToS3 } from "../../s3Uploder.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import { invalidateCategoryCache } from "../../utils/cacheInvalidation.js";

export const uploadCategoryImagesAction = async (req, res) => {
  try {
    const { variant, imageData } = req.body;

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

    // Invalidate category caches in case this image is used immediately
    await invalidateCategoryCache();

    res.send({
      success: true,
      imageKey: uploadResult.key,
      variant
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
