import { ObjectId } from "mongodb";
import locationModel from "../../model/locationModel/locationModel.js"
import fetch from "node-fetch";

export const createLocation = async function (reqBody = {}) {
  try {

    const data = {
      ...reqBody,
    };
    const locationDocument = new locationModel(data);
    const result = await locationDocument.save();
    return result;
  } catch (error) {
    if (error.message && error.message.duplicateKey) {
      throw error;
    }
    console.error('Error saving location:', error);
    throw error;
  }
};

export const viewLocation = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid user ID");
    }

    const location = await locationModel.findById(id).lean();
    if (!location) {
      throw new Error("location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw error;
  }
};
export const viewAllLocation = async ({
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
      query.$or = [
        { country: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { pincode: { $regex: search, $options: "i" } },
        { addressLine1: { $regex: search, $options: "i" } },
        { addressLine2: { $regex: search, $options: "i" } }

      ];
    }

    let sortQuery = {};
    if (sortBy) sortQuery[sortBy] = sortOrder;

    const total = await locationModel.countDocuments(query);

    const list = await locationModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list, total };
  } catch (error) {
    console.error("Location fetch failed:", error);
    throw error;
  }
};

export const updateLocation = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid user ID");

  const location = await locationModel.findByIdAndUpdate(id, data, { new: true });
  if (!location) throw new Error("location not found");
  return location;
};

export const deleteLocation = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid deletelocation ID");

  const deletedLocation = await locationModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ); if (!deletedLocation) throw new Error("Location not found");
  return deletedLocation;
};

export const detectDistrictFromLatLng = async (latitude, longitude) => {
  if (!process.env.GOOGLE_MAPS_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("Google Geocode response:", data.status);

  if (data.status !== "OK") {
    throw new Error(data.error_message || "Google Geocoding failed");
  }

  const components = data.results[0].address_components;

  const get = (type) =>
    components.find((c) => c.types.includes(type))?.long_name || null;

  return {
    district:
      get("administrative_area_level_3") ||
      get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    country: get("country"),
  };
};