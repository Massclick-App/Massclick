import { ObjectId } from "mongodb";
import eventLocationModel from "../../model/event/eventLocationModel.js";

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const optionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

export const createEventLocation = async (reqBody = {}) => {
  try {
    const locationName = reqBody.locationName?.trim().toLowerCase();
    if (!locationName) throw new Error("Location name is required");

    const existing = await eventLocationModel.findOne({
      locationName: { $regex: `^${locationName}$`, $options: "i" }
    });

    if (existing) {
      throw new Error("Event location with this name already exists");
    }

    const eventLocation = new eventLocationModel({
      locationName: reqBody.locationName,
      address: reqBody.address || "",
      city: reqBody.city || "",
      state: reqBody.state || "",
      country: reqBody.country || "",
      zipCode: reqBody.zipCode || "",
      latitude: optionalNumber(reqBody.latitude),
      longitude: optionalNumber(reqBody.longitude),
      locationImage: reqBody.locationImage || "",
      description: reqBody.description || "",
      keywords: reqBody.keywords || [],
      seoTitle: reqBody.seoTitle || "",
      seoDescription: reqBody.seoDescription || "",
      isActive: reqBody.isActive !== undefined ? reqBody.isActive : true,
      capacity: reqBody.capacity || 0,
      createdBy: reqBody.createdBy || null,
    });

    const result = await eventLocation.save();
    return { message: "Event location created", location: result };
  } catch (error) {
    throw error;
  }
};

export const viewEventLocation = async (locationId) => {
  try {
    if (!ObjectId.isValid(locationId)) {
      throw new Error("Invalid location ID");
    }

    const location = await eventLocationModel.findById(locationId);
    if (!location) {
      throw new Error("Event location not found");
    }

    return { message: "Event location retrieved", location };
  } catch (error) {
    throw error;
  }
};

export const viewAllEventLocation = async (options = {}) => {
  try {
    const { pageNo = 1, pageSize = 10, search = "", status = "all", sortBy = "createdAt", sortOrder = -1 } = options;

    const skip = (pageNo - 1) * pageSize;
    const query = {};

    if (search) {
      query.$or = [
        { locationName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
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

    const list = await eventLocationModel
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await eventLocationModel.countDocuments(query);

    return { list, total };
  } catch (error) {
    throw error;
  }
};

export const updateEventLocation = async (locationId, updateData) => {
  try {
    if (!ObjectId.isValid(locationId)) {
      throw new Error("Invalid location ID");
    }

    const location = await eventLocationModel.findById(locationId);
    if (!location) {
      throw new Error("Event location not found");
    }

    // Check for duplicate name (excluding current document)
    if (updateData.locationName && updateData.locationName !== location.locationName) {
      const existing = await eventLocationModel.findOne({
        locationName: { $regex: `^${updateData.locationName.trim()}$`, $options: "i" },
        _id: { $ne: locationId }
      });

      if (existing) {
        throw new Error("Event location with this name already exists");
      }
    }

    const payload = {
      ...updateData,
      updatedBy: updateData.updatedBy || null,
    };

    if (payload.locationName) {
      payload.slug = slugify(payload.locationName);
    }

    if ("latitude" in payload) {
      payload.latitude = optionalNumber(payload.latitude);
    }

    if ("longitude" in payload) {
      payload.longitude = optionalNumber(payload.longitude);
    }

    const updatedLocation = await eventLocationModel.findByIdAndUpdate(
      locationId,
      payload,
      { new: true, runValidators: true }
    );

    return { message: "Event location updated", location: updatedLocation };
  } catch (error) {
    throw error;
  }
};

export const deleteEventLocation = async (locationId) => {
  try {
    if (!ObjectId.isValid(locationId)) {
      throw new Error("Invalid location ID");
    }

    const location = await eventLocationModel.findByIdAndUpdate(
      locationId,
      { isActive: false },
      { new: true }
    );

    if (!location) {
      throw new Error("Event location not found");
    }

    return { message: "Event location deleted", location };
  } catch (error) {
    throw error;
  }
};

export const hardDeleteEventLocation = async (locationId) => {
  try {
    if (!ObjectId.isValid(locationId)) {
      throw new Error("Invalid location ID");
    }

    const location = await eventLocationModel.findByIdAndDelete(locationId);
    if (!location) {
      throw new Error("Event location not found");
    }

    return { message: "Event location permanently deleted", location };
  } catch (error) {
    throw error;
  }
};
