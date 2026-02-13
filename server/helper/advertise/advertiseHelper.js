import { ObjectId } from "mongodb";
import advertiseModel from "../../model/advertise/advertiseModel.js";


export const createAdvertise = async (reqBody = {}) => {
  try {
    const advertiseDocument = new advertiseModel(reqBody);
    return await advertiseDocument.save();
  } catch (error) {
    console.error("Error saving advertise:", error);
    throw error;
  }
};


export const viewAdvertise = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Advertise ID");
    }

    const advertise = await advertiseModel
      .findOne({ _id: id, isActive: true })
      .lean();

    if (!advertise) {
      throw new Error("Advertise not found");
    }

    return advertise;
  } catch (error) {
    console.error("Error fetching advertise:", error);
    throw error;
  }
};


export const viewAllAdvertise = async () => {
  try {
    return await advertiseModel
      .find({ isActive: true })
      .sort({ createdAt: -1 }) 
      .lean();
  } catch (error) {
    console.error("Error fetching all advertise:", error);
    throw error;
  }
};


export const updateAdvertise = async (id, data) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Advertise ID");
    }

    const updateData = { ...data };

    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.isActive;

    const advertise = await advertiseModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true, 
      }
    );

    if (!advertise) {
      throw new Error("Advertise not found");
    }

    return advertise;
  } catch (error) {
    console.error("Error updating advertise:", error);
    throw error;
  }
};


export const deleteAdvertise = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Advertise ID");
    }

    const deletedAdvertise = await advertiseModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deletedAdvertise) {
      throw new Error("Advertise not found");
    }

    return deletedAdvertise;
  } catch (error) {
    console.error("Error deleting advertise:", error);
    throw error;
  }
};
