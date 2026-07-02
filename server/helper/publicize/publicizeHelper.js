import { ObjectId } from "mongodb";
import publicizeModel from "../../model/publicize/publicizeModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { createPhonePePayment } from "../PhonePay/phonePayHelper.js";

const normalizePublicizeKeywords = (keywords) => {
  if (!Array.isArray(keywords)) return [];

  return [
    ...new Set(
      keywords
        .map((keyword) => String(keyword || "").trim())
        .filter(Boolean)
    ),
  ];
};

const buildBusinessFromPublicize = (publicize) => ({
  sourcePublicizeId: publicize._id,
  name: publicize.businessName,
  businessName: publicize.businessName,
  pincode: publicize.pincode,
  contact: publicize.mobileNumber,
  contactList: publicize.mobileNumber,
  whatsappNumber: publicize.mobileNumber,
  category: publicize.category,
  keywords: normalizePublicizeKeywords(publicize.keywords),
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
    const publicizeDocument = new publicizeModel({
      ...reqBody,
      keywords: normalizePublicizeKeywords(reqBody.keywords),
    });
    const savedPublicize = await publicizeDocument.save();

    const businessData = buildBusinessFromPublicize(savedPublicize);

    // Check if business already exists
    const existingBusiness = await businessListModel.findOne({
      businessName: businessData.businessName,
      category: businessData.category,
      location: businessData.location,
    });

    if (existingBusiness) {
      throw new Error(
        `Business "${businessData.businessName}" in "${businessData.category}" at "${businessData.location}" already exists. Please use a different business name, category, or location.`
      );
    }

    const businessDocument = new businessListModel(businessData);
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

    if (Object.prototype.hasOwnProperty.call(updateData, "keywords")) {
      updateData.keywords = normalizePublicizeKeywords(updateData.keywords);
    }

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

export const initiatePublicizePayment = async (publicizeData = {}) => {
  try {
    const { listingType, mobileNumber, businessName } = publicizeData;

    if (listingType === "free") {
      const result = await createPublicize(publicizeData);
      return {
        success: true,
        message: "Free listing created successfully",
        data: result,
      };
    }

    if (listingType === "paid") {
      const publicizeDocument = new publicizeModel({
        ...publicizeData,
        keywords: normalizePublicizeKeywords(publicizeData.keywords),
        paymentPending: true,
      });
      const savedPublicize = await publicizeDocument.save();

      const businessDocument = new businessListModel(
        buildBusinessFromPublicize(savedPublicize)
      );
      const savedBusiness = await businessDocument.save();

      const amount = 24000;
      let paymentResult;

      try {
        paymentResult = await createPhonePePayment(
          amount,
          mobileNumber,
          savedBusiness._id.toString()
        );
      } catch (paymentError) {
        console.error("Payment initiation failed:", paymentError.message);
        throw new Error(`Payment initiation failed: ${paymentError.message}`);
      }

      if (!paymentResult || !paymentResult.paymentUrl) {
        throw new Error("Payment URL not received from gateway");
      }

      return {
        success: true,
        message: "Payment initiated successfully",
        publicizeId: savedPublicize._id,
        businessId: savedBusiness._id,
        redirectUrl: paymentResult.paymentUrl,
        transactionId: paymentResult.transactionId,
      };
    }

    throw new Error("Invalid listing type. Must be 'free' or 'paid'");
  } catch (error) {
    console.error("Error initiating publicize payment:", error);
    throw error;
  }
};
