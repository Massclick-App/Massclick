import { ObjectId } from "mongodb";
import eventAdvertisementModel from "../../model/event/eventAdvertisementModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";

const formatEventAdvertisementImages = (advertisement) => {
  if (!advertisement) return advertisement;

  const result =
    typeof advertisement.toObject === "function"
      ? advertisement.toObject()
      : advertisement;

  result.bannerImage = result.bannerImageKey
    ? getSignedUrlByKey(result.bannerImageKey)
    : "";

  result.mobileBannerImage = result.mobileBannerImageKey
    ? getSignedUrlByKey(result.mobileBannerImageKey)
    : "";

  return result;
};

const handleEventAdvertisementImageUploads = async (data = {}) => {
  if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `event/advertisements/banners/banner-${Date.now()}`
    );
    data.bannerImageKey = uploadResult.key;
  } else if (data.bannerImage === null) {
    data.bannerImageKey = "";
  }

  if (typeof data.mobileBannerImage === "string" && data.mobileBannerImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.mobileBannerImage,
      `event/advertisements/banners/mobile-banner-${Date.now()}`
    );
    data.mobileBannerImageKey = uploadResult.key;
  } else if (data.mobileBannerImage === null) {
    data.mobileBannerImageKey = "";
  }

  delete data.bannerImage;
  delete data.mobileBannerImage;
};

export const createEventAdvertisement = async (reqBody = {}) => {
  try {
    const title = reqBody.title?.trim();
    if (!title) throw new Error("Title is required");

    await handleEventAdvertisementImageUploads(reqBody);

    const eventAdvertisement = new eventAdvertisementModel({
      title: reqBody.title,
      description: reqBody.description || "",
      bannerImageKey: reqBody.bannerImageKey || "",
      mobileBannerImageKey: reqBody.mobileBannerImageKey || "",
      redirectUrl: reqBody.redirectUrl || "",
      startDate: reqBody.startDate || null,
      endDate: reqBody.endDate || null,
      displayPosition: "HOME_POPUP",
      displayDuration: reqBody.displayDuration ?? 0,
      showConfetti: reqBody.showConfetti ?? false,
      isActive: reqBody.isActive !== undefined ? reqBody.isActive : true,
      createdBy: reqBody.createdBy || null,
    });

    await eventAdvertisement.save();
    return formatEventAdvertisementImages(eventAdvertisement);
  } catch (error) {
    throw error;
  }
};

export const viewEventAdvertisement = async (advertisementId) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel
      .findById(advertisementId);

    if (!advertisement) {
      throw new Error("Event advertisement not found");
    }

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const viewAllEventAdvertisement = async (options = {}) => {
  try {
    const { pageNo = 1, pageSize = 10, search = "", status = "active", sortBy = "createdAt", sortOrder = -1 } = options;

    const skip = (pageNo - 1) * pageSize;
    const query = { displayPosition: "HOME_POPUP" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const list = await eventAdvertisementModel
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(pageSize))
      .lean();

    const total = await eventAdvertisementModel.countDocuments(query);

    return { list: list.map(formatEventAdvertisementImages), total };
  } catch (error) {
    throw error;
  }
};

export const updateEventAdvertisement = async (advertisementId, updateData) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel.findById(advertisementId);
    if (!advertisement) {
      throw new Error("Event advertisement not found");
    }

    updateData.displayPosition = "HOME_POPUP";

    await handleEventAdvertisementImageUploads(updateData);

    Object.assign(advertisement, {
      ...updateData,
      updatedBy: updateData.updatedBy || null,
    });

    await advertisement.save();

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const deleteEventAdvertisement = async (advertisementId) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel.findByIdAndUpdate(
      advertisementId,
      { isActive: false },
      { new: true }
    );

    if (!advertisement) {
      throw new Error("Event advertisement not found");
    }

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const hardDeleteEventAdvertisement = async (advertisementId) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel.findByIdAndDelete(advertisementId);
    if (!advertisement) {
      throw new Error("Event advertisement not found");
    }

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const trackAdvertisementClick = async (advertisementId) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel.findByIdAndUpdate(
      advertisementId,
      { $inc: { clicks: 1 } },
      { new: true }
    );

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const trackAdvertisementImpression = async (advertisementId) => {
  try {
    if (!ObjectId.isValid(advertisementId)) {
      throw new Error("Invalid advertisement ID");
    }

    const advertisement = await eventAdvertisementModel.findByIdAndUpdate(
      advertisementId,
      { $inc: { impressions: 1 } },
      { new: true }
    );

    return formatEventAdvertisementImages(advertisement);
  } catch (error) {
    throw error;
  }
};

export const findEventHomePopupAdvertisement = async () => {
  const now = new Date();
  const query = {
    displayPosition: "HOME_POPUP",
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
    ],
  };

  const ads = await eventAdvertisementModel
    .find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(1)
    .lean();

  return ads.map(formatEventAdvertisementImages);
};
