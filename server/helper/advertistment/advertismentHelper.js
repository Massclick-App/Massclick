import { ObjectId } from "mongodb";
import sharp from "sharp";
import advertismentModel from "../../model/advertistment/advertismentModel.js";
import eventAdvertisementModel from "../../model/event/eventAdvertisementModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";

const TOP_BANNER_RULES = {
  targetWidth: 1720,
  targetHeight: 168,
  aspectTolerance: 0.03,
};
const MOBILE_TOP_BANNER_RULES = {
  targetWidth: 720,
  targetHeight: 240,
  aspectTolerance: 0.03,
};
const COMMON_TOP_BANNER_CATEGORY = "ALL_CATEGORIES";
const TOP_BANNER_RATIO =
  TOP_BANNER_RULES.targetWidth / TOP_BANNER_RULES.targetHeight;
const MOBILE_TOP_BANNER_RATIO =
  MOBILE_TOP_BANNER_RULES.targetWidth / MOBILE_TOP_BANNER_RULES.targetHeight;
const escapeRegExp = (value = "") =>
  value.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getBase64ImageBuffer = (imageData = "") => {
  if (typeof imageData !== "string" || !imageData.startsWith("data:image")) {
    return null;
  }

  const matches = imageData.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data");

  return Buffer.from(matches[2], "base64");
};

const cropBannerImage = async (imageData, rules, targetRatio) => {
  const buffer = getBase64ImageBuffer(imageData);
  if (!buffer) throw new Error("Banner image data is invalid");

  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read banner image dimensions");
  }

  if (
    metadata.width === rules.targetWidth &&
    metadata.height === rules.targetHeight
  ) {
    return imageData;
  }

  if (
    metadata.width < rules.targetWidth ||
    metadata.height < rules.targetHeight
  ) {
    throw new Error(
      `Banner image must be at least ${rules.targetWidth} x ${rules.targetHeight} px`
    );
  }

  const sourceRatio = metadata.width / metadata.height;
  const ratioDifference =
    Math.abs(sourceRatio - targetRatio) / targetRatio;
  if (ratioDifference > rules.aspectTolerance) {
    throw new Error(
      `Banner image ratio must match ${rules.targetWidth} x ${rules.targetHeight} px`
    );
  }

  const outputBuffer = await sharp(buffer)
    .resize(rules.targetWidth, rules.targetHeight, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 92 })
    .toBuffer();

  return `data:image/webp;base64,${outputBuffer.toString("base64")}`;
};

const cropTopBannerImage = (imageData) =>
  cropBannerImage(imageData, TOP_BANNER_RULES, TOP_BANNER_RATIO);

const cropMobileTopBannerImage = (imageData) =>
  cropBannerImage(imageData, MOBILE_TOP_BANNER_RULES, MOBILE_TOP_BANNER_RATIO);

const HOME_POPUP_RULES = {
  targetWidth: 800,
  targetHeight: 600,
  aspectTolerance: 0.05,
};
const MOBILE_HOME_POPUP_RULES = {
  targetWidth: 480,
  targetHeight: 640,
  aspectTolerance: 0.05,
};
const HOME_POPUP_RATIO = HOME_POPUP_RULES.targetWidth / HOME_POPUP_RULES.targetHeight;
const MOBILE_HOME_POPUP_RATIO = MOBILE_HOME_POPUP_RULES.targetWidth / MOBILE_HOME_POPUP_RULES.targetHeight;

const cropHomePopupImage = (imageData) =>
  cropBannerImage(imageData, HOME_POPUP_RULES, HOME_POPUP_RATIO);

const cropMobileHomePopupImage = (imageData) =>
  cropBannerImage(imageData, MOBILE_HOME_POPUP_RULES, MOBILE_HOME_POPUP_RATIO);

const addAdvertisementImageUrls = (ad) => {
  if (ad.bannerImageKey) {
    ad.bannerImage = getSignedUrlByKey(ad.bannerImageKey);
  }
  if (ad.mobileBannerImageKey) {
    ad.mobileBannerImage = getSignedUrlByKey(ad.mobileBannerImageKey);
  }
  return ad;
};

export const createAdvertisement = async (reqBody = {}) => {
  try {
    if (!reqBody.title) throw new Error("Title is required");
    if (!reqBody.category) throw new Error("Category is required");
    if (!reqBody.startTime || !reqBody.endTime)
      throw new Error("Start time and end time are required");
    if (
      (reqBody.position === "TOP_BANNER" || reqBody.position === "HOME_POPUP") &&
      !reqBody.bannerImage
    )
      throw new Error("Banner image is required for this position");

    if (reqBody.bannerImage) {
      if (reqBody.position === "TOP_BANNER") {
        reqBody.bannerImage = await cropTopBannerImage(reqBody.bannerImage);
      } else if (reqBody.position === "HOME_POPUP") {
        reqBody.bannerImage = await cropHomePopupImage(reqBody.bannerImage);
      }
      const uploadResult = await uploadImageToS3(
        reqBody.bannerImage,
        `advertisements/banners/ad-${Date.now()}`,
        (reqBody.position === "TOP_BANNER" || reqBody.position === "HOME_POPUP")
          ? { skipImageConversion: true }
          : {}
      );
      reqBody.bannerImageKey = uploadResult.key;
    }
    if (
      (reqBody.position === "TOP_BANNER" || reqBody.position === "HOME_POPUP") &&
      reqBody.mobileBannerImage
    ) {
      const mobileCropFn =
        reqBody.position === "HOME_POPUP"
          ? cropMobileHomePopupImage
          : cropMobileTopBannerImage;
      reqBody.mobileBannerImage = await mobileCropFn(reqBody.mobileBannerImage);
      const mobileUploadResult = await uploadImageToS3(
        reqBody.mobileBannerImage,
        `advertisements/banners/mobile-ad-${Date.now()}`,
        { skipImageConversion: true }
      );
      reqBody.mobileBannerImageKey = mobileUploadResult.key;
    }
    delete reqBody.bannerImage;
    delete reqBody.mobileBannerImage;

    const ad = new advertismentModel(reqBody);
    const result = await ad.save();

    return { message: "Advertisement created", advertisement: addAdvertisementImageUrls(result) };
  } catch (error) {
    console.error("Error creating advertisement:", error);
    throw error;
  }
};


export const viewAdvertisement = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid advertisement ID");

  const ad = await advertismentModel.findById(id).lean();
  if (!ad) throw new Error("Advertisement not found");

  return addAdvertisementImageUrls(ad);
};

export const findAdvertisementByCategory = async (category) => {
  const now = new Date();

  const query = {
    $or: [
      { category: { $regex: `^${escapeRegExp(category)}$`, $options: "i" } },
      { category: COMMON_TOP_BANNER_CATEGORY },
    ],
    position: "TOP_BANNER",
    isActive: true,
    isDeleted: false,
    startTime: { $lte: now },
    endTime: { $gte: now },   
  };

  const advertisementList = await advertismentModel.find(query).lean();

  if (!advertisementList || advertisementList.length === 0) {
    return [];
  }

  return advertisementList.map((ad) => {
    return addAdvertisementImageUrls(ad);
  });
};

export const viewAllAdvertisement = async ({
  pageNo,
  pageSize,
  search,
  status,
  category,
  sortBy,
  sortOrder,
}) => {
  let query = { isDeleted: false };

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (category) query.category = category;

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const total = await advertismentModel.countDocuments(query);

  const ads = await advertismentModel
    .find(query)
    .sort({ [sortBy]: sortOrder })
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const list = ads.map((ad) => {
    return addAdvertisementImageUrls(ad);
  });

  return { list, total };
};


export const updateAdvertisement = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid advertisement ID");

  const existingAd = await advertismentModel.findById(id).lean();
  if (!existingAd) throw new Error("Advertisement not found");

  const hasNewImage =
    data.bannerImage &&
    typeof data.bannerImage === "string" &&
    data.bannerImage.startsWith("data:image");
  if (
    (data.position === "TOP_BANNER" || data.position === "HOME_POPUP") &&
    existingAd.position !== data.position &&
    !hasNewImage
  ) {
    throw new Error("A valid banner image is required for this position");
  }

  if (hasNewImage) {
    if (data.position === "TOP_BANNER") {
      data.bannerImage = await cropTopBannerImage(data.bannerImage);
    } else if (data.position === "HOME_POPUP") {
      data.bannerImage = await cropHomePopupImage(data.bannerImage);
    }
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `advertisements/banners/ad-${Date.now()}`,
      (data.position === "TOP_BANNER" || data.position === "HOME_POPUP")
        ? { skipImageConversion: true }
        : {}
    );
    data.bannerImageKey = uploadResult.key;
  }
  if (
    (data.position === "TOP_BANNER" || data.position === "HOME_POPUP") &&
    data.mobileBannerImage &&
    typeof data.mobileBannerImage === "string" &&
    data.mobileBannerImage.startsWith("data:image")
  ) {
    const mobileCropFn =
      data.position === "HOME_POPUP"
        ? cropMobileHomePopupImage
        : cropMobileTopBannerImage;
    data.mobileBannerImage = await mobileCropFn(data.mobileBannerImage);
    const mobileUploadResult = await uploadImageToS3(
      data.mobileBannerImage,
      `advertisements/banners/mobile-ad-${Date.now()}`,
      { skipImageConversion: true }
    );
    data.mobileBannerImageKey = mobileUploadResult.key;
  }
  delete data.bannerImage;
  delete data.mobileBannerImage;

  const updatedAd = await advertismentModel.findByIdAndUpdate(
    id,
    data,
    { new: true }
  );

  if (!updatedAd) throw new Error("Advertisement not found");

  return addAdvertisementImageUrls(updatedAd);
};


export const deleteAdvertisement = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid advertisement ID");

  const deleted = await advertismentModel.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false, updatedAt: new Date() },
    { new: true }
  );

  if (!deleted) throw new Error("Advertisement not found");

  return deleted;
};


export const findHomePopupAdvertisement = async () => {
  const now = new Date();

  const ad = await eventAdvertisementModel
    .findOne({
      displayPosition: "popup",
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .populate([
      { path: "eventCategory", select: "categoryName slug" },
      { path: "eventLocation", select: "locationName city" }
    ])
    .sort({ createdAt: -1 })
    .lean();

  if (!ad) return null;

  const result = typeof ad.toObject === "function" ? ad.toObject() : ad;

  result.popupImage = result.popupImageKey
    ? getSignedUrlByKey(result.popupImageKey)
    : "";

  result.mobilePopupImage = result.mobilePopupImageKey
    ? getSignedUrlByKey(result.mobilePopupImageKey)
    : "";

  return result;
};

export const getActiveCategoryAdvertisements = async (
  category,
  position = "LIST_INLINE"
) => {
  const now = new Date();

  const ads = await advertismentModel
    .find({
      category,
      position,
      isActive: true,
      isDeleted: false,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return ads.map((ad) => {
    return addAdvertisementImageUrls(ad);
  });
};
