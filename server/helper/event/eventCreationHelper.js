import { ObjectId } from "mongodb";
import eventCreationModel from "../../model/event/eventCreationModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";

const formatEventCreationImages = (event) => {
  if (!event) return event;

  const result =
    typeof event.toObject === "function"
      ? event.toObject()
      : event;

  result.eventImage = result.eventImageKey
    ? getSignedUrlByKey(result.eventImageKey)
    : "";

  result.bannerImage = result.bannerImageKey
    ? getSignedUrlByKey(result.bannerImageKey)
    : "";

  return result;
};

const handleEventCreationImageUploads = async (data = {}) => {
  if (typeof data.eventImage === "string" && data.eventImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.eventImage,
      `event/creations/images/image-${Date.now()}`
    );
    data.eventImageKey = uploadResult.key;
  } else if (data.eventImage === null || data.eventImage === "") {
    data.eventImageKey = "";
  }

  if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:")) {
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `event/creations/banners/banner-${Date.now()}`
    );
    data.bannerImageKey = uploadResult.key;
  } else if (data.bannerImage === null || data.bannerImage === "") {
    data.bannerImageKey = "";
  }

  delete data.eventImage;
  delete data.bannerImage;
};

export const createEventCreation = async (reqBody = {}) => {
  try {
    const eventName = reqBody.eventName?.trim();
    if (!eventName) throw new Error("Event name is required");

    if (!reqBody.startDate) throw new Error("Start date is required");
    if (!reqBody.endDate) throw new Error("End date is required");

    if (!ObjectId.isValid(reqBody.eventCategory)) {
      throw new Error("Invalid event category ID");
    }

    if (!ObjectId.isValid(reqBody.eventLocation)) {
      throw new Error("Invalid event location ID");
    }

    await handleEventCreationImageUploads(reqBody);

    const eventCreation = new eventCreationModel({
      eventName: reqBody.eventName,
      eventCategory: reqBody.eventCategory,
      eventLocation: reqBody.eventLocation,
      description: reqBody.description || "",
      eventImageKey: reqBody.eventImageKey || "",
      bannerImageKey: reqBody.bannerImageKey || "",
      startDate: reqBody.startDate,
      endDate: reqBody.endDate,
      startTime: reqBody.startTime || "",
      endTime: reqBody.endTime || "",
      eventType: reqBody.eventType || "physical",
      organizer: reqBody.organizer || "",
      organizerEmail: reqBody.organizerEmail || "",
      organizerPhone: reqBody.organizerPhone || "",
      capacity: reqBody.capacity || 0,
      registeredParticipants: reqBody.registeredParticipants || 0,
      ticketPrice: reqBody.ticketPrice || 0,
      registrationUrl: reqBody.registrationUrl || "",
      keywords: reqBody.keywords || [],
      seoTitle: reqBody.seoTitle || "",
      seoDescription: reqBody.seoDescription || "",
      status: reqBody.status || "upcoming",
      isActive: reqBody.isActive !== undefined ? reqBody.isActive : true,
      isPublished: reqBody.isPublished !== undefined ? reqBody.isPublished : false,
      createdBy: reqBody.createdBy || null,
    });

    await eventCreation.save();
    const populatedEvent = await eventCreation.populate([
      { path: "eventCategory", select: "categoryName slug" },
      { path: "eventLocation", select: "locationName city" }
    ]);
    return formatEventCreationImages(populatedEvent);
  } catch (error) {
    throw error;
  }
};

export const viewEventCreation = async (eventId) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel
      .findById(eventId)
      .populate([
        { path: "eventCategory", select: "categoryName slug" },
        { path: "eventLocation", select: "locationName city" }
      ]);

    if (!event) {
      throw new Error("Event not found");
    }

    // Increment views
    await eventCreationModel.findByIdAndUpdate(
      eventId,
      { $inc: { views: 1 } }
    );

    return formatEventCreationImages(event);
  } catch (error) {
    throw error;
  }
};

export const viewAllEventCreation = async (options = {}) => {
  try {
    const { pageNo = 1, pageSize = 10, search = "", status = "all", sortBy = "createdAt", sortOrder = -1, isActive = true } = options;

    const skip = (pageNo - 1) * pageSize;
    const query = { isActive: isActive === "true" };

    if (search) {
      query.$or = [
        { eventName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { organizer: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const list = await eventCreationModel
      .find(query)
      .populate([
        { path: "eventCategory", select: "categoryName slug" },
        { path: "eventLocation", select: "locationName city" }
      ])
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(pageSize))
      .lean();

    const total = await eventCreationModel.countDocuments(query);

    return { list: list.map(formatEventCreationImages), total };
  } catch (error) {
    throw error;
  }
};

export const updateEventCreation = async (eventId, updateData) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel.findById(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (updateData.eventCategory && !ObjectId.isValid(updateData.eventCategory)) {
      throw new Error("Invalid event category ID");
    }

    if (updateData.eventLocation && !ObjectId.isValid(updateData.eventLocation)) {
      throw new Error("Invalid event location ID");
    }

    await handleEventCreationImageUploads(updateData);

    const updatedEvent = await eventCreationModel.findByIdAndUpdate(
      eventId,
      {
        ...updateData,
        updatedBy: updateData.updatedBy || null,
      },
      { new: true, runValidators: true }
    ).populate([
      { path: "eventCategory", select: "categoryName slug" },
      { path: "eventLocation", select: "locationName city" }
    ]);

    return formatEventCreationImages(updatedEvent);
  } catch (error) {
    throw error;
  }
};

export const deleteEventCreation = async (eventId) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel.findByIdAndUpdate(
      eventId,
      { isActive: false },
      { new: true }
    );

    if (!event) {
      throw new Error("Event not found");
    }

    return formatEventCreationImages(event);
  } catch (error) {
    throw error;
  }
};

export const hardDeleteEventCreation = async (eventId) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel.findByIdAndDelete(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    return formatEventCreationImages(event);
  } catch (error) {
    throw error;
  }
};

export const publishEventCreation = async (eventId) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel.findByIdAndUpdate(
      eventId,
      { isPublished: true },
      { new: true }
    );

    return formatEventCreationImages(event);
  } catch (error) {
    throw error;
  }
};

export const unpublishEventCreation = async (eventId) => {
  try {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid event ID");
    }

    const event = await eventCreationModel.findByIdAndUpdate(
      eventId,
      { isPublished: false },
      { new: true }
    );

    return formatEventCreationImages(event);
  } catch (error) {
    throw error;
  }
};
