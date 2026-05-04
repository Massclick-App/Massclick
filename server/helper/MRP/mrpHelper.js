import { ObjectId } from "mongodb";
import mrpModel from "../../model/MRP/mrpModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { sendMniBusinessLead, sendCustomerBusinessList } from "../msg91/smsGatewayHelper.js";
import { getSettings } from "../systemSettings/settingsService.js";

export const createMRP = async function (reqBody = {}) {
  try {
    const { organizationId, contactDetails } = reqBody;


    const normalizeMobile = (num) =>
      num?.toString().replace(/\D/g, "").slice(-10);

    const mobile = normalizeMobile(contactDetails);

    const business = await businessListModel.findOne({
      $or: [
        { contactList: mobile },
        { whatsappNumber: mobile }
      ]
    }).lean();

    if (!business) {
      throw new Error("Business not found using contactDetails");
    }

    const { _id, __v, createdAt, updatedAt, ...cleanBusiness } = business;

    const mrpDocument = new mrpModel({
      organizationId: business._id,
      contactDetails: mobile,
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
  if (!mrp) throw new Error("MRP not found");

  const normalizeMobile = (num) =>
    num?.toString().replace(/\D/g, "").slice(-10);

  const mobile = normalizeMobile(mrp.contactDetails);

  const sourceBusiness = await businessListModel.findOne({
    $or: [
      { contactList: mobile },
      { whatsappNumber: mobile }
    ]
  }).lean();

  if (!sourceBusiness) {
    return {
      totalBusinesses: 0,
      message: "Source business not found"
    };
  }

  const group = sourceBusiness?.mniDetails?.[0]?.categoryGroup;
  const location = (sourceBusiness?.location || "").toLowerCase().trim();

  if (!group) {
    throw new Error("No group assigned to business");
  }

  const businesses = await businessListModel.find({
    _id: { $ne: sourceBusiness._id },
    location: new RegExp(`^${location}$`, "i"),
    category: mrp.categoryId,
    "mniDetails.categoryGroup": group,
    amountPaid: true,
    isActive: true,
    businessesLive: true
  })
    .limit(1)
    .lean();

  if (!businesses.length) {
    return {
      totalBusinesses: 0,
      message: "No matching businesses in same group"
    };
  }

  const mrpSettings = await getSettings();

  const leadData = {
    businessName: sourceBusiness.businessName,
    location: location,
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
      if (mrpSettings.whatsapp_mni_lead_alert) {
        await sendMniBusinessLead(mobile, leadData);
      }

      await businessListModel.updateOne(
        { _id: biz._id, "mniDetails.0": { $exists: true } },
        [
          {
            $set: {
              "mniDetails.0.leadsCount": {
                $add: [
                  { $ifNull: ["$mniDetails.0.leadsCount", 0] },
                  1
                ]
              },
              "mniDetails.0.lastLeadsUpdate": new Date(),
              "mniDetails.0.leadsCategory": {
                $concatArrays: [
                  { $ifNull: ["$mniDetails.0.leadsCategory", []] },
                  [mrp.categoryId]
                ]
              }
            }
          }
        ]
      );

    } catch (err) {
      console.error("❌ WhatsApp failed:", mobile, err.message);
    }
  }

  if (mrpSettings.whatsapp_mni_customer_list) {
    try {
      const customerMobile = mrp.contactDetails
        .toString()
        .replace(/\D/g, "")
        .slice(-10);

      await sendCustomerBusinessList(
        customerMobile,
        sourceBusiness.businessName,
        location,
        mrp.categoryId,
        businesses
      );

    } catch (err) {
      console.error("❌ Customer WhatsApp failed:", err.message);
    }
  }

  return {
    totalBusinesses: businesses.length
  };
};

export const fetchMniLeadsData = async ({ location, group }) => {

  const normalizedLocation = location.toLowerCase().trim();

  const businesses = await businessListModel.find({
    location: new RegExp(`^${normalizedLocation}$`, "i"),
    "mniDetails.categoryGroup": group,
    amountPaid: true,
    isActive: true,
    businessesLive: true
  })
    .select("businessName category mniDetails")
    .lean();

  const formattedData = businesses.map(biz => {
    const mni = biz.mniDetails?.[0] || {};

    return {
      businessId: biz._id,
      businessName: biz.businessName,
      category: biz.category,
      leadsCount: mni.leadsCount || 0,
      lastLeadsUpdate: mni.lastLeadsUpdate || null,
      leadsCategory: mni.leadsCategory || []
    };
  });

  formattedData.sort((a, b) => b.leadsCount - a.leadsCount);

  return {
    location: normalizedLocation,
    group,
    totalBusinesses: formattedData.length,
    data: formattedData
  };
};