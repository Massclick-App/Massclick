import { ObjectId } from "mongodb";
import mrpModel from "../../model/MRP/mrpModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { sendMniBusinessLead, sendCustomerBusinessList } from "../msg91/smsGatewayHelper.js";
import { getSettings } from "../systemSettings/settingsService.js";

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeMniLocation = (location = "") => {
  const normalizedLocation = String(location).toLowerCase().trim();

  if (["trichy", "tiruchirappalli"].includes(normalizedLocation)) {
    return "tiruchirappalli";
  }

  return normalizedLocation;
};

const getMniLocationQuery = (location = "") => {
  const normalizedLocation = normalizeMniLocation(location);

  if (normalizedLocation === "tiruchirappalli") {
    return {
      $in: [
        new RegExp(`^${escapeRegex("trichy")}$`, "i"),
        new RegExp(`^${escapeRegex("tiruchirappalli")}$`, "i"),
      ],
    };
  }

  return new RegExp(`^${escapeRegex(normalizedLocation)}$`, "i");
};

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
  const location = normalizeMniLocation(sourceBusiness?.location);

  if (!group) {
    throw new Error("No group assigned to business");
  }

  const businesses = await businessListModel.find({
    _id: { $ne: sourceBusiness._id },
    location: getMniLocationQuery(location),
    category: mrp.categoryId,
    "mniDetails.categoryGroup": group,
    amountPaid: true,
    isActive: true,
    businessesLive: true
  })
    .limit(2)
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
                  {
                    $cond: [
                      {
                        $in: [
                          { $type: "$mniDetails.0.leadsCount" },
                          ["int", "long", "double", "decimal"]
                        ]
                      },
                      "$mniDetails.0.leadsCount",
                      0
                    ]
                  },
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

  // Update source business sentLeads
  if (businesses.length > 0) {
    await businessListModel.updateOne(
      { _id: sourceBusiness._id, "mniDetails.0": { $exists: true } },
      {
        $push: {
          "mniDetails.0.sentLeads": {
            $each: businesses.map(biz => ({
              to: biz._id,
              businessName: biz.businessName,
              location: biz.location,
              category: mrp.categoryId,
              date: new Date()
            }))
          }
        }
      }
    );
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
    totalBusinesses: businesses.length,
    sentTo: businesses.map(biz => biz._id)
  };
};

export const fetchMniLeadsData = async ({ location, group }) => {

  const normalizedLocation = normalizeMniLocation(location);

  const businesses = await businessListModel.find({
    location: getMniLocationQuery(normalizedLocation),
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

export const fetchSentLeadsData = async ({ businessId }) => {
  const business = await businessListModel.findById(businessId).select("businessName mniDetails").lean();

  if (!business) throw new Error("Business not found");

  const sentLeads = business.mniDetails?.[0]?.sentLeads || [];

  // Enrich sentLeads with full business details
  const enrichedSentLeads = await Promise.all(
    sentLeads.map(async (lead) => {
      const receivingBusiness = await businessListModel.findById(lead.to)
        .select("businessName location contact whatsappNumber")
        .lean();
      
      return {
        to: lead.to,
        businessName: lead.businessName || receivingBusiness?.businessName,
        location: lead.location || receivingBusiness?.location,
        category: lead.category,
        date: lead.date,
        receiverDetails: {
          contact: receivingBusiness?.contact,
          whatsappNumber: receivingBusiness?.whatsappNumber
        }
      };
    })
  );

  return {
    businessId,
    businessName: business.businessName,
    totalSentLeads: enrichedSentLeads.length,
    sentLeads: enrichedSentLeads
  };
};

export const getBusinessProfileByPhone = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const normalizeMobile = (num) =>
      num?.toString().replace(/\D/g, "").slice(-10);

    const mobile = normalizeMobile(phoneNumber);

    const business = await businessListModel.findOne({
      $or: [
        { contactList: mobile },
        { whatsappNumber: mobile }
      ]
    })
      .select(
        "businessName location category contact whatsappNumber email bannerImageKey businessImagesKey openingHours mniDetails analytics averageRating"
      )
      .lean();

    if (!business) {
      throw new Error("Business not found with this phone number");
    }

    // Get sentLeads data
    const sentLeads = business.mniDetails?.[0]?.sentLeads || [];
    const mniDetails = business.mniDetails?.[0] || {};

    // Enrich sentLeads with full business details
    const enrichedSentLeads = await Promise.all(
      sentLeads.map(async (lead) => {
        const receivingBusiness = await businessListModel.findById(lead.to)
          .select("businessName location contact whatsappNumber")
          .lean();

        return {
          to: lead.to,
          businessName: lead.businessName || receivingBusiness?.businessName,
          location: lead.location || receivingBusiness?.location,
          category: lead.category,
          date: lead.date,
          receiverDetails: {
            contact: receivingBusiness?.contact,
            whatsappNumber: receivingBusiness?.whatsappNumber
          }
        };
      })
    );

    return {
      _id: business._id,
      businessName: business.businessName,
      location: business.location,
      category: business.category,
      contact: business.contact,
      whatsappNumber: business.whatsappNumber,
      email: business.email,
      bannerImageKey: business.bannerImageKey,
      businessImagesKey: business.businessImagesKey,
      openingHours: business.openingHours,
      analytics: business.analytics,
      averageRating: business.averageRating,
      mniDetails: {
        categoryGroup: mniDetails.categoryGroup,
        categoryGroupLocation: mniDetails.categoryGroupLocation,
        leadsCount: mniDetails.leadsCount || 0,
        leadsCategory: mniDetails.leadsCategory || []
      },
      sentLeads: enrichedSentLeads,
      totalSentLeads: enrichedSentLeads.length
    };
  } catch (error) {
    console.error("Error fetching business profile by phone:", error);
    throw error;
  }
};

export const getGlobalLeadReport = async ({ location, group, category }) => {
  try {
    if (!location || !group) {
      throw new Error("location and group are required");
    }

    const normalizedLocation = normalizeMniLocation(location);

    const query = {
      location: getMniLocationQuery(normalizedLocation),
      "mniDetails.categoryGroup": group,
      amountPaid: true,
      isActive: true,
      businessesLive: true
    };

    if (category) {
      query.category = category;
    }

    const businesses = await businessListModel.find(query)
      .select("businessName location category contact whatsappNumber mniDetails")
      .lean();

    const data = await Promise.all(
      businesses.map(async (biz) => {
        const mni = biz.mniDetails?.[0] || {};
        const sentLeads = mni.sentLeads || [];

        const enrichedSentLeads = await Promise.all(
          sentLeads.map(async (lead) => {
            const receiver = lead.to
              ? await businessListModel.findById(lead.to)
                  .select("businessName location contact whatsappNumber category")
                  .lean()
              : null;

            return {
              to: lead.to,
              senderBusinessId: biz._id,
              senderBusinessName: biz.businessName,
              senderCategory: biz.category,
              senderLocation: biz.location,
              receiverBusinessName: lead.businessName || receiver?.businessName,
              receiverLocation: lead.location || receiver?.location,
              receiverCategory: receiver?.category || lead.category,
              receiverContact: receiver?.contact || null,
              receiverWhatsapp: receiver?.whatsappNumber || null,
              sentDate: lead.date,
              leadCategory: lead.category
            };
          })
        );

        return {
          senderBusinessId: biz._id,
          senderBusinessName: biz.businessName,
          senderCategory: biz.category,
          senderLocation: biz.location,
          group: mni.categoryGroup || group,
          categoryGroupLocation: mni.categoryGroupLocation || normalizedLocation,
          sentLeads: enrichedSentLeads,
          totalSentLeads: enrichedSentLeads.length
        };
      })
    );

    return {
      location: normalizedLocation,
      group,
      category: category || null,
      totalSenders: data.length,
      data
    };
  } catch (error) {
    console.error("Error fetching global lead report:", error);
    throw error;
  }
};
