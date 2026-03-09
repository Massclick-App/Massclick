import { ObjectId } from "mongodb";
import mrpModel from "../../model/MRP/mrpModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { sendMniBusinessLead, sendCustomerBusinessList  } from "../msg91/smsGatewayHelper.js";

export const createMRP = async function (reqBody = {}) {
  try {
    const { organizationId, contactDetails } = reqBody;

    if (!ObjectId.isValid(organizationId)) {
      throw new Error("Invalid organizationId");
    }

    const business = await businessListModel
      .findOne({ contactList: contactDetails })
      .lean();

    if (!business) {
      throw new Error("Business not found in business list");
    }

    const { _id, __v, createdAt, updatedAt, ...cleanBusiness } = business;

    const mrpDocument = new mrpModel({
      organizationId,
      contactDetails,
      categoryId: reqBody.categoryId,
      location: reqBody.location,
      description: reqBody.description,
      businessSnapshot: cleanBusiness
    });

    return await mrpDocument.save();

  } catch (error) {
    console.error("Error saving MRP:", error);
    throw error;
  }
};

export const viewMRP = async (id) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("Invalid mrp ID");
        }

        const mrp = await mrpModel.findById(id).lean();
        if (!mrp) {
            throw new Error("mrp not found");
        }

        return mrp;
    } catch (error) {
        console.error("Error in getMRPById:", error);
        throw error;
    }
};

export const viewAllMRP = async ({
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder
}) => {
  try {
    const query = {};

    if (search) {
      query.$or = [
        { categoryId: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const sortQuery = { [sortBy]: sortOrder };

    const total = await mrpModel.countDocuments(query);

    const list = await mrpModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list, total };

  } catch (error) {
    console.error("Error fetching MRP:", error);
    throw error;
  }
};

export const updateMRP = async (id, data) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid MRP ID");

    const mrp = await mrpModel.findByIdAndUpdate(id, data, { new: true });
    if (!mrp) throw new Error("MRP not found");
    return mrp;
};

export const deleteMRP = async (id) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid deleteMRP ID");

    const deletedMRP = await mrpModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
    ); if (!deletedMRP) throw new Error("MRP not found");
    return deletedMRP;
};

export const searchMrpBusinesses = async ({ search, pageSize }) => {
  const query = {
    isActive: true,
    businessesLive: true,
    ...(search && {
      businessName: { $regex: search, $options: "i" }
    })
  };

  const list = await businessListModel
    .find(query)
    .select("_id businessName location category")
    .limit(pageSize)
    .lean();

  return list;
};

export const searchMrpCategories = async (search, limit) => {
  const list = await categoryModel
    .find({
      isActive: true,
      category: { $regex: `^${search}`, $options: "i" }
    })
    .select("category -_id")   
    .limit(limit)
    .lean();

  return list.map(item => item.category);
};


export const sendMrpLeads = async (mrpId) => {


  if (!ObjectId.isValid(mrpId)) {
    throw new Error("Invalid MRP ID");
  }

  const mrp = await mrpModel.findById(mrpId).lean();

  if (!mrp) {
    throw new Error("MRP not found");
  }


  const businesses = await businessListModel.find({
    category: mrp.categoryId,
    location: mrp.location,
    isActive: true,
    businessesLive: true
  })
  .limit(5) 
  .lean();


  if (!businesses.length) {
    return {
      totalBusinesses: 0,
      message: "No businesses found for this requirement"
    };
  }

  const leadData = {
    businessName: mrp.businessSnapshot.businessName,
    location: mrp.location,
    category: mrp.categoryId,
    description: mrp.description,
    customerMobile: mrp.contactDetails
  };

  for (const biz of businesses) {

    const mobile = (biz.contactList || biz.whatsappNumber || "")
      .toString()
      .replace(/\D/g, "")
      .slice(-10);

    if (!mobile) continue;

    try {

      await sendMniBusinessLead(mobile, leadData);

    } catch (err) {

      console.error("❌ WhatsApp failed for:", mobile, err.message);

    }
  }

  try {

    const customerMobile = mrp.contactDetails
      .toString()
      .replace(/\D/g, "")
      .slice(-10);

    await sendCustomerBusinessList(
      customerMobile,
      mrp.businessSnapshot.businessName,
      mrp.location,
      mrp.categoryId,
      businesses
    );

  } catch (err) {

    console.error("❌ Customer WhatsApp failed:", err.message);

  }

  return {
    totalBusinesses: businesses.length
  };
};