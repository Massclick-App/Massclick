import { ObjectId } from "mongodb";
import advertismentModel from "../../model/advertistment/advertismentModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";


export const createAdvertisement = async (reqBody = {}) => {
  try {
    if (!reqBody.title) throw new Error("Title is required");
    if (!reqBody.category) throw new Error("Category is required");
    if (!reqBody.startTime || !reqBody.endTime)
      throw new Error("Start time and end time are required");

    if (reqBody.bannerImage) {
      const uploadResult = await uploadImageToS3(
        reqBody.bannerImage,
        `advertisements/banners/ad-${Date.now()}`
      );
      reqBody.bannerImageKey = uploadResult.key;
    }
    delete reqBody.bannerImage;

    const ad = new advertismentModel(reqBody);
    const result = await ad.save();

    if (result.bannerImageKey) {
      result.bannerImage = getSignedUrlByKey(result.bannerImageKey);
    }

    return { message: "Advertisement created", advertisement: result };
  } catch (error) {
    console.error("Error creating advertisement:", error);
    throw error;
  }
};


export const viewAdvertisement = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid advertisement ID");

  const ad = await advertismentModel.findById(id).lean();
  if (!ad) throw new Error("Advertisement not found");

  if (ad.bannerImageKey) {
    ad.bannerImage = getSignedUrlByKey(ad.bannerImageKey);
  }

  return ad;
};

export const findAdvertisementByCategory = async (category) => {
  const now = new Date();

  const query = {
    category: { $regex: category, $options: "i" },
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
    if (ad.bannerImageKey) {
      ad.bannerImage = getSignedUrlByKey(ad.bannerImageKey);
    }
    return ad;
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
    if (ad.bannerImageKey) {
      ad.bannerImage = getSignedUrlByKey(ad.bannerImageKey);
    }
    return ad;
  });

  return { list, total };
};


export const updateAdvertisement = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid advertisement ID");

  if (
    data.bannerImage &&
    typeof data.bannerImage === "string" &&
    data.bannerImage.startsWith("data:image")
  ) {
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `advertisements/banners/ad-${Date.now()}`
    );
    data.bannerImageKey = uploadResult.key;
  }
  delete data.bannerImage;

  const updatedAd = await advertismentModel.findByIdAndUpdate(
    id,
    data,
    { new: true }
  );

  if (!updatedAd) throw new Error("Advertisement not found");

  if (updatedAd.bannerImageKey) {
    updatedAd.bannerImage = getSignedUrlByKey(updatedAd.bannerImageKey);
  }

  return updatedAd;
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
    if (ad.bannerImageKey) {
      ad.bannerImage = getSignedUrlByKey(ad.bannerImageKey);
    }
    return ad;
  });
};
