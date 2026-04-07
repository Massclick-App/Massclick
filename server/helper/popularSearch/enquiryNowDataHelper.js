import enquiryNowDataModel from "../../model/popularSearches/enquiryNowDataModel.js";

export const createEnquiryNowData = async function (reqBody = {}) {
  try {
    const data = {
      ...reqBody,
    };

    const enquiryDocument = new enquiryNowDataModel(data);
    const result = await enquiryDocument.save();
    return result;

  } catch (error) {
    console.error("Error saving Enquiry Now:", error);
    throw error;
  }
};

export const viewAllEnquiryNowData = async ({ pageNo, pageSize }) => {
  try {
    const total = await enquiryNowDataModel.countDocuments();

    const list = await enquiryNowDataModel
      .find()
      .sort({ createdAt: -1 })
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list, total };
  } catch (error) {
    console.error("Error fetching enquiry list:", error);
    throw error;
  }
};
