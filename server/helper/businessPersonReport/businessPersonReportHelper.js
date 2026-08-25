import mongoose from "mongoose";
import message91UserModel from "../../model/msg91Model/usersModels.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import webEventModel from "../../model/webAnalytics/webEventModel.js";
import whatsappMessageAuditModel from "../../model/msg91Model/whatsappMessageAuditModel.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IST_OFFSET = "+05:30";
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digits = (value = "") => String(value).replace(/\D/g, "");

const dateRange = (from, to) => {
  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "")) throw new Error("Valid from and to dates are required");
  const start = new Date(`${from}T00:00:00.000${IST_OFFSET}`);
  const end = new Date(`${to}T00:00:00.000${IST_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) throw new Error("Invalid date range");
  if ((end - start) / 86400000 > 366) throw new Error("Date range cannot exceed 366 days");
  return { start, end };
};

const mobilePattern = (mobile) => {
  const last10 = digits(mobile).slice(-10);
  if (last10.length !== 10) return /a^/;
  return new RegExp(last10.split("").join("\\D*"));
};

export const listBusinessPeople = async (query = "") => {
  const filter = { businessPeople: true };
  const q = String(query).trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ userName: regex }, { businessName: regex }, { mobileNumber1: regex }, { "businessCategory.category": regex }];
  }
  const rows = await message91UserModel.find(filter)
    .select("userName businessName mobileNumber1 email businessLocation businessCategory createdAt")
    .sort({ userName: 1, businessName: 1 }).limit(500).lean();
  return rows.map((row) => ({
    id: String(row._id), name: row.userName || "", businessName: row.businessName || "",
    mobile: row.mobileNumber1 || "", email: row.email || "", location: row.businessLocation || "",
    category: row.businessCategory?.category || "", registeredAt: row.createdAt,
  }));
};

export const getBusinessReportFilters = async ({ category = "", search = "" } = {}) => {
  const searchText = String(search).trim();
  const canonicalQuery = searchText ? {
    $or: ["category", "subcategory", "title", "slug", "keywords"].map((field) => ({ [field]: { $regex: escapeRegex(searchText), $options: "i" } })),
  } : {};
  const businessCategoryRegex = searchText ? new RegExp(escapeRegex(searchText), "i") : /.+/;
  const [canonicalCategories, businessCategoryRows] = await Promise.all([
    categoryModel.find(canonicalQuery).select("category subcategory title slug isActive").sort({ category: 1 }).limit(100).lean(),
    businessListModel.aggregate([
      { $project: { values: ["$category", "$subcategory"] } },
      { $unwind: "$values" },
      { $match: { values: { $type: "string", $regex: businessCategoryRegex } } },
      { $group: { _id: { $trim: { input: "$values" } }, businessCount: { $sum: 1 } } },
      { $match: { _id: { $ne: "" } } },
      { $sort: { _id: 1 } },
      { $limit: 100 },
    ]),
  ]);
  const categoryNames = [...new Set([
    ...canonicalCategories.map((row) => row.category || row.title || row.subcategory),
    ...businessCategoryRows.map((row) => row._id),
  ].filter(Boolean))].slice(0, 100);
  const businessCounts = new Map(businessCategoryRows.map((row) => [String(row._id).toLocaleLowerCase(), row.businessCount]));
  const categories = categoryNames.map((name) => {
    const businessCount = businessCounts.get(String(name).toLocaleLowerCase()) || 0;
    const source = canonicalCategories.find((row) => (row.category || row.title || row.subcategory) === name);
    return { id: String(source?._id || name), name, slug: source?.slug || "", active: source?.isActive !== false, businessCount };
  });
  let locations = [];
  if (category) {
    const exact = new RegExp(`^\\s*${escapeRegex(category)}\\s*$`, "i");
    const rows = await businessListModel.aggregate([
      { $match: { $or: [{ category: exact }, { subcategory: exact }] } },
      { $project: { reportDistrict: { $ifNull: ["$masterLocation.district", "$location"] } } },
      { $match: { reportDistrict: { $type: "string", $ne: "" } } },
      { $group: { _id: { $trim: { input: "$reportDistrict" } }, businessCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 500 },
    ]);
    locations = rows.map((row) => ({ name: row._id, businessCount: row.businessCount }));
  }
  return {
    categories,
    locations,
  };
};

export const listReportBusinesses = async ({ category = "", location = "", search = "" } = {}) => {
  if (!category || !location) return { data: [], total: 0 };
  const exactCategory = new RegExp(`^\\s*${escapeRegex(category)}\\s*$`, "i");
  const exactLocation = new RegExp(`^\\s*${escapeRegex(location)}\\s*$`, "i");
  const filter = { $and: [
    { $or: [{ category: exactCategory }, { subcategory: exactCategory }] },
    { $or: [{ "masterLocation.district": exactLocation }, { location: exactLocation }] },
  ] };
  const q = String(search).trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$and.push({ $or: [{ businessName: regex }, { name: regex }, { contact: regex }, { contactList: regex }, { whatsappNumber: regex }, { clientId: regex }] });
  }
  const [rows, total] = await Promise.all([
    businessListModel.find(filter).select("businessName name category subcategory location contact contactList whatsappNumber clientId businessesLive activeBusinesses isActive").sort({ businessName: 1, name: 1 }).limit(100).lean(),
    businessListModel.countDocuments(filter),
  ]);
  return {
    total,
    data: rows.map((row) => ({ id: String(row._id), name: row.businessName || row.name || "Unnamed business", category: row.category || "", subcategory: row.subcategory || "", location: row.location || "", contact: row.contact || row.contactList || "", whatsapp: row.whatsappNumber || "", clientId: row.clientId || "", live: Boolean(row.businessesLive && row.activeBusinesses && row.isActive) })),
  };
};

export const getBusinessPersonReport = async ({ personId, businessId, from, to }) => {
  const selectedId = businessId || personId;
  if (!mongoose.isValidObjectId(selectedId)) throw new Error("A valid business is required");
  const { start, end } = dateRange(from, to);
  const selectedBusiness = await businessListModel.findById(selectedId).select("businessName name category subcategory location masterLocation contact contactList whatsappNumber email clientId businessesLive activeBusinesses isActive createdAt").lean();
  if (!selectedBusiness) throw new Error("Business not found");
  const primaryMobile = selectedBusiness.whatsappNumber || selectedBusiness.contactList || selectedBusiness.contact;
  const phoneRegex = mobilePattern(primaryMobile);
  const person = await message91UserModel.findOne({ mobileNumber1: phoneRegex }).lean();
  const businesses = [selectedBusiness];
  const businessIds = businesses.map((row) => row._id);
  const categoryTerms = [...new Set([
    selectedBusiness.category,
    ...businesses.flatMap((row) => [row.category, row.subcategory]),
  ].filter(Boolean).map((value) => String(value).trim()))];
  const categoryRegex = categoryTerms.length
    ? new RegExp(categoryTerms.map(escapeRegex).join("|"), "i")
    : /a^/;
  const baseTime = { ts: { $gte: start, $lt: end } };
  const reportDistrict = selectedBusiness.masterLocation?.district || selectedBusiness.location || "";
  const bizMatch = businessIds.length ? { "biz.businessId": { $in: businessIds } } : { _id: null };
  const districtKey = reportDistrict.toLocaleLowerCase().trim();
  const districtAliases = districtKey === "tiruchirappalli" || districtKey === "trichy"
    ? ["tiruchirappalli", "trichy"]
    : [reportDistrict];
  const auditLocationRegex = new RegExp(`^\\s*(?:${districtAliases.map(escapeRegex).join("|")})\\s*$`, "i");
  const searchDemandMatch = { ...baseTime, type: "search", "search.query": categoryRegex, "search.location": auditLocationRegex };
  const auditIdentityMatch = { $or: [{ businessId: selectedBusiness._id }, { recipientMobile: phoneRegex }] };
  const strictBusinessLeadMatch = {
    createdAt: { $gte: start, $lt: end },
    sourceType: { $in: ["search_lead", "mni", "enquiry"] },
    ...auditIdentityMatch,
    category: categoryRegex,
    location: auditLocationRegex,
  };

  const [metricRows, daily, categorySearches, businessLeadDeliveries, identityAuditCount] = await Promise.all([
    webEventModel.aggregate([
      { $match: { ...baseTime, ...bizMatch, type: { $in: ["business_view", "business_click", "search_result_click"] } } },
      { $group: {
        _id: null,
        visits: { $sum: { $cond: [{ $eq: ["$type", "business_view"] }, 1, 0] } },
        uniqueVisitors: { $addToSet: { $cond: [{ $eq: ["$type", "business_view"] }, "$deviceId", "$$REMOVE"] } },
        resultClicks: { $sum: { $cond: [{ $eq: ["$type", "search_result_click"] }, 1, 0] } },
        calls: { $sum: { $cond: [{ $eq: ["$biz.action", "call"] }, 1, 0] } },
        whatsapp: { $sum: { $cond: [{ $eq: ["$biz.action", "whatsapp"] }, 1, 0] } },
        enquiries: { $sum: { $cond: [{ $eq: ["$biz.action", "enquiry"] }, 1, 0] } },
        directions: { $sum: { $cond: [{ $eq: ["$biz.action", "direction"] }, 1, 0] } },
        numberReveals: { $sum: { $cond: [{ $eq: ["$biz.action", "show_number"] }, 1, 0] } },
      } },
    ]),
    webEventModel.aggregate([
      { $match: { ...baseTime, ...bizMatch, type: { $in: ["business_view", "business_click", "search_result_click"] } } },
      { $group: { _id: { $dateToString: { date: "$ts", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } }, visits: { $sum: { $cond: [{ $eq: ["$type", "business_view"] }, 1, 0] } }, visitors: { $addToSet: "$deviceId" }, calls: { $sum: { $cond: [{ $eq: ["$biz.action", "call"] }, 1, 0] } }, whatsapp: { $sum: { $cond: [{ $eq: ["$biz.action", "whatsapp"] }, 1, 0] } }, enquiries: { $sum: { $cond: [{ $eq: ["$biz.action", "enquiry"] }, 1, 0] } } } },
      { $project: { _id: 0, date: "$_id", visits: 1, uniqueVisitors: { $size: "$visitors" }, calls: 1, whatsapp: 1, enquiries: 1 } }, { $sort: { date: 1 } },
    ]),
    webEventModel.aggregate([
      { $match: searchDemandMatch },
      { $group: { _id: { query: "$search.query", location: "$search.location" }, searches: { $sum: 1 }, visitors: { $addToSet: "$deviceId" }, firstAt: { $min: "$ts" }, lastAt: { $max: "$ts" } } },
      { $project: { _id: 0, query: "$_id.query", location: "$_id.location", searches: 1, uniqueVisitors: { $size: "$visitors" }, firstAt: 1, lastAt: 1 } }, { $sort: { searches: -1 } }, { $limit: 500 },
    ]),
    whatsappMessageAuditModel.find(strictBusinessLeadMatch)
      .select("createdAt sourceType status customerName customerMobile category location businessName recipientMobile failureReason sourceId").sort({ createdAt: -1 }).limit(5000).lean(),
    whatsappMessageAuditModel.countDocuments({ createdAt: { $gte: start, $lt: end }, sourceType: { $in: ["search_lead", "mni", "enquiry"] }, ...auditIdentityMatch }),
  ]);

  const relatedSearchIds = businessLeadDeliveries.filter((row) => row.sourceType === "search_lead" && row.sourceId).map((row) => row.sourceId);
  const customerLeadClauses = [{
    sourceType: "business_detail_info",
    businessId: selectedBusiness._id,
    category: categoryRegex,
    location: auditLocationRegex,
  }];
  if (relatedSearchIds.length) customerLeadClauses.push({ sourceType: "customer_list", sourceId: { $in: relatedSearchIds } });
  const customerLeadDeliveries = await whatsappMessageAuditModel.find({
    createdAt: { $gte: start, $lt: end }, $or: customerLeadClauses,
  }).select("createdAt sourceType status customerName customerMobile category location businessName recipientMobile failureReason sourceId").sort({ createdAt: -1 }).limit(5000).lean();

  const raw = metricRows[0] || {};
  const searchTotals = categorySearches.reduce((acc, row) => { acc.searches += row.searches || 0; return acc; }, { searches: 0 });
  const searchVisitors = await webEventModel.distinct("deviceId", searchDemandMatch);
  const successfulLeadStatuses = new Set(["sent", "delivered", "read"]);
  const deliveredBusinessLeads = businessLeadDeliveries.filter((row) => successfulLeadStatuses.has(row.status));
  const deliveredCustomerLeads = customerLeadDeliveries.filter((row) => successfulLeadStatuses.has(row.status));
  const allLeadDeliveries = [...businessLeadDeliveries, ...customerLeadDeliveries];
  const leadsBySource = allLeadDeliveries.filter((row) => successfulLeadStatuses.has(row.status)).reduce((acc, row) => { acc[row.sourceType] = (acc[row.sourceType] || 0) + 1; return acc; }, {});

  return {
    generatedAt: new Date(), range: { from, to, timezone: "Asia/Kolkata" },
    retention: { siteAnalyticsDays: 90, messageAuditDays: 180 },
    person: { id: person?._id ? String(person._id) : "", name: person?.userName || selectedBusiness.name || selectedBusiness.businessName || "", businessName: selectedBusiness.businessName || selectedBusiness.name || "", mobile: primaryMobile || "", email: person?.email || selectedBusiness.email || "", location: selectedBusiness.location || person?.businessLocation || "", category: selectedBusiness.category || person?.businessCategory?.category || "", registeredAt: selectedBusiness.createdAt || person?.createdAt },
    businesses: businesses.map((row) => ({ id: String(row._id), name: row.businessName || row.name || "", category: row.category || "", subcategory: row.subcategory || "", location: row.location || "", contact: row.contact || row.contactList || "", whatsapp: row.whatsappNumber || "", live: Boolean(row.businessesLive && row.activeBusinesses && row.isActive) })),
    metrics: { categorySearches: searchTotals.searches, categorySearchers: searchVisitors.length, businessVisits: raw.visits || 0, uniqueBusinessVisitors: raw.uniqueVisitors?.length || 0, searchResultClicks: raw.resultClicks || 0, calls: raw.calls || 0, whatsappClicks: raw.whatsapp || 0, enquiries: raw.enquiries || 0, directions: raw.directions || 0, numberReveals: raw.numberReveals || 0, interactionLeads: (raw.calls || 0) + (raw.whatsapp || 0) + (raw.enquiries || 0), businessLeadsSent: deliveredBusinessLeads.length, businessLeadsAttempted: businessLeadDeliveries.length, customerLeadsSent: deliveredCustomerLeads.length, customerLeadsAttempted: customerLeadDeliveries.length, excludedUnrelatedLeadAudits: Math.max(0, identityAuditCount - businessLeadDeliveries.length), publicLeadsSent: deliveredBusinessLeads.length + deliveredCustomerLeads.length, publicLeadsAttempted: allLeadDeliveries.length, publicLeadsFailed: allLeadDeliveries.filter((row) => row.status === "failed").length },
    leadsBySource, daily, categorySearches,
    businessLeadDeliveries: businessLeadDeliveries.map((row) => ({ id: String(row._id), date: row.createdAt, leadType: "business", direction: "Customer details sent to business", source: row.sourceType, status: row.status, customerName: row.customerName || "", customerMobile: row.customerMobile || "", category: row.category || "", location: row.location || "", businessName: row.businessName || selectedBusiness.businessName || "", recipientMobile: row.recipientMobile || "", failureReason: row.failureReason || "" })),
    customerLeadDeliveries: customerLeadDeliveries.map((row) => ({ id: String(row._id), date: row.createdAt, leadType: "customer", direction: "Business list sent to customer", source: row.sourceType, status: row.status, customerName: row.customerName || "", customerMobile: row.customerMobile || "", category: row.category || "", location: row.location || "", businessName: selectedBusiness.businessName || selectedBusiness.name || "", recipientMobile: row.recipientMobile || "", failureReason: row.failureReason || "" })),
    leadDeliveries: allLeadDeliveries.map((row) => ({ id: String(row._id), date: row.createdAt, source: row.sourceType, status: row.status, customerName: row.customerName || "", customerMobile: row.customerMobile || "", category: row.category || "", location: row.location || "", businessName: row.businessName || "", recipientMobile: row.recipientMobile || "", failureReason: row.failureReason || "" })),
  };
};
