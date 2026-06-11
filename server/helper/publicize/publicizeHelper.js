import { ObjectId } from "mongodb";
import publicizeModel from "../../model/publicize/publicizeModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";

const buildBusinessFromPublicize = (publicize) => ({
  sourcePublicizeId: publicize._id,
  name: publicize.businessName,
  businessName: publicize.businessName,
  pincode: publicize.pincode,
  contact: publicize.mobileNumber,
  contactList: publicize.mobileNumber,
  whatsappNumber: publicize.mobileNumber,
  category: publicize.category,
  location: publicize.city,
  street: publicize.businessAddress,
  globalAddress: publicize.businessAddress,
  description: publicize.category,
  activeBusinesses: false,
  businessesLive: false,
  amountPaid: false,
  isActive: true,
});

export const createPublicize = async (reqBody = {}) => {
  try {
    const publicizeDocument = new publicizeModel(reqBody);
    const savedPublicize = await publicizeDocument.save();

    const businessDocument = new businessListModel(
      buildBusinessFromPublicize(savedPublicize)
    );
    const savedBusiness = await businessDocument.save();

    return {
      publicize: savedPublicize.toObject(),
      business: savedBusiness.toObject(),
    };
  } catch (error) {
    console.error("Error saving publicize and business:", error);
    throw error;
  }
};


export const viewPublicize = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Publicize ID");
    }

    const publicize = await publicizeModel
      .findOne({ _id: id, isActive: true })
      .lean();

    if (!publicize) {
      throw new Error("Publicize not found");
    }

    return publicize;
  } catch (error) {
    console.error("Error fetching publicize:", error);
    throw error;
  }
};


export const viewAllPublicize = async () => {
  try {
    return await publicizeModel
      .find({ isActive: true })
      .sort({ createdAt: -1 }) 
      .lean();
  } catch (error) {
    console.error("Error fetching all publicize:", error);
    throw error;
  }
};


export const updatePublicize = async (id, data) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Publicize ID");
    }

    const updateData = { ...data };

    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.isActive;

    const publicize = await publicizeModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true, 
      }
    );

    if (!publicize) {
      throw new Error("Publicize not found");
    }

    return publicize;
  } catch (error) {
    console.error("Error updating publicize:", error);
    throw error;
  }
};


export const deletePublicize = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Publicize ID");
    }

    const deletedPublicize = await publicizeModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deletedPublicize) {
      throw new Error("Publicize not found");
    }

    return deletedPublicize;
  } catch (error) {
    console.error("Error deleting publicize:", error);
    throw error;
  }
};
