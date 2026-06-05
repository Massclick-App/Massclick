import { ObjectId } from "mongodb";
import eventAdvertisementModel from "../../model/event/eventAdvertisementModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";

const formatEventAdvertisementImages = (advertisement) => {
  if (!advertisement) return advertisement;

  const result =
    typeof advertisement.toObject === "function"
      ? advertisement.toObject()
      : advertisement;

  result.advertisementImage = result.advertisementImageKey
    ? getSignedUrlByKey(result.advertisementImageKey)
    : "";

  result.bannerImage = result.bannerImageKey
    ? getSignedUrlByKey(result.bannerImageKey)
    : "";

  return result;
};

const handleEventAdvertisementImageUploads = async (data = {}) => {
  if (typeof data.advertisementImage === "string" && data.advertisementImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.advertisementImage,
      `event/advertisements/images/image-${Date.now()}`
    );
    data.advertisementImageKey = uploadResult.key;
  } else if (data.advertisementImage === null || data.advertisementImage === "") {
    data.advertisementImageKey = "";
  }

  if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `event/advertisements/banners/banner-${Date.now()}`
    );
    data.bannerImageKey = uploadResult.key;
  } else if (data.bannerImage === null || data.bannerImage === "") {
    data.bannerImageKey = "";
  }

  delete data.advertisementImage;
  delete data.bannerImage;
};

export const createEventAdvertisement = async (reqBody = {}) => {
  try {
    const title = reqBody.title?.trim();
    if (!title) throw new Error("Title is required");

    if (!ObjectId.isValid(reqBody.eventCategory)) {
      throw new Error("Invalid event category ID");
    }

    if (!ObjectId.isValid(reqBody.eventLocation)) {
      throw new Error("Invalid event location ID");
    }

    await handleEventAdvertisementImageUploads(reqBody);

    const eventAdvertisement = new eventAdvertisementModel({
      title: reqBody.title,
      description: reqBody.description || "",
      eventCategory: reqBody.eventCategory,
      eventLocation: reqBody.eventLocation,
      advertisementImageKey: reqBody.advertisementImageKey || "",
      bannerImageKey: reqBody.bannerImageKey || "",
      advertiserName: reqBody.advertiserName || "",
      advertiserContact: reqBody.advertiserContact || "",
      advertiserEmail: reqBody.advertiserEmail || "",
      redirectUrl: reqBody.redirectUrl || "",
      startDate: reqBody.startDate || null,
      endDate: reqBody.endDate || null,
      displayPosition: reqBody.displayPosition || "middle",
      isActive: reqBody.isActive !== undefined ? reqBody.isActive : true,
      createdBy: reqBody.createdBy || null,
    });

    await eventAdvertisement.save();
    const populatedAdvertisement = await eventAdvertisement.populate([
      { path: "eventCategory", select: "categoryName slug" },
      { path: "eventLocation", select: "locationName city" }
    ]);
    return formatEventAdvertisementImages(populatedAdvertisement);
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
      .findById(advertisementId)
      .populate([
        { path: "eventCategory", select: "categoryName slug" },
        { path: "eventLocation", select: "locationName city" }
      ]);

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
    const { pageNo = 1, pageSize = 10, search = "", status = "all", sortBy = "createdAt", sortOrder = -1 } = options;

    const skip = (pageNo - 1) * pageSize;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { advertiserName: { $regex: search, $options: "i" } },
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
      .populate([
        { path: "eventCategory", select: "categoryName slug" },
        { path: "eventLocation", select: "locationName city" }
      ])
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

    if (updateData.eventCategory && !ObjectId.isValid(updateData.eventCategory)) {
      throw new Error("Invalid event category ID");
    }

    if (updateData.eventLocation && !ObjectId.isValid(updateData.eventLocation)) {
      throw new Error("Invalid event location ID");
    }

    await handleEventAdvertisementImageUploads(updateData);

    const updatedAdvertisement = await eventAdvertisementModel.findByIdAndUpdate(
      advertisementId,
      {
        ...updateData,
        updatedBy: updateData.updatedBy || null,
      },
      { new: true, runValidators: true }
    ).populate([
      { path: "eventCategory", select: "categoryName slug" },
      { path: "eventLocation", select: "locationName city" }
    ]);

    return formatEventAdvertisementImages(updatedAdvertisement);
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
