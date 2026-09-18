import mongoose from "mongoose";
import { BAD_REQUEST, NOT_FOUND } from "../../errorCodes.js";
import businessSuggestionModel from "../../model/businessSuggestion/businessSuggestionModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { updateBusinessList } from "../../helper/businessList/businessListHelper.js";
import { invalidateSearchCache, invalidateDashboardCache, invalidateCategoryCache } from "../../utils/cacheInvalidation.js";
import {
  AUTO_APPLY_FIELDS,
  SUGGESTION_FIELDS,
  SUGGESTION_STATUSES,
} from "../../schema/businessSuggestion/businessSuggestionSchema.js";

const DAILY_LIMIT_PER_USER = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clampPageSize = (value) => Math.min(Math.max(parseInt(value) || 20, 1), 100);
const clean = (value) => String(value ?? "").trim();

// Accepts "98765 43210", "+91 9876543210", "09876543210"; returns the bare
// 10-digit Indian mobile, or "" when it isn't one.
const normalizeMobile = (value) => {
  let digits = clean(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const isValidWebsite = (value) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(value);

// Returns the cleaned value or throws a customer-readable message.
const validateSuggestedValue = (field, rawValue) => {
  const value = clean(rawValue);
  if (!value) throw new Error("Please enter the correct information.");

  if (field === "phone" || field === "whatsapp") {
    const mobile = normalizeMobile(value);
    if (!mobile) throw new Error("Please enter a valid 10-digit mobile number.");
    return mobile;
  }
  if (field === "email") {
    if (!isValidEmail(value)) throw new Error("Please enter a valid email address.");
    return value.toLowerCase();
  }
  if (field === "website") {
    if (!isValidWebsite(value)) throw new Error("Please enter a valid website address.");
    return value;
  }
  if (value.length < 3) throw new Error("Please add a little more detail.");
  return value.slice(0, 1000);
};

const formatAddress = (business) =>
  [business.plotNumber, business.street, business.location, business.pincode]
    .map(clean)
    .filter((part) => part && part !== "-")
    .join(", ");

// What the listing currently shows for a suggestion field.
const readCurrentValue = (business, field) => {
  switch (field) {
    case "phone": return clean(business.contact);
    case "whatsapp": return clean(business.whatsappNumber);
    case "email": return clean(business.email);
    case "website": return clean(business.website);
    case "address": return formatAddress(business);
    default: return "";
  }
};

const BUSINESS_PROJECTION = {
  businessName: 1, category: 1, contact: 1, contactList: 1, whatsappNumber: 1,
  email: 1, website: 1, plotNumber: 1, street: 1, location: 1, pincode: 1,
};

const getActor = (req) => req.authActor || {};

// ─── Customer ──────────────────────────────────────────────────────────────

export const createBusinessSuggestionAction = async (req, res) => {
  try {
    const actor = getActor(req);
    const { id } = req.params;
    const field = clean(req.body.field);

    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid business.");
    if (!SUGGESTION_FIELDS.includes(field)) throw new Error("Please choose what you want to correct.");

    const business = await businessListModel.findById(id, BUSINESS_PROJECTION).lean();
    if (!business) {
      return res.status(NOT_FOUND.code).send({ success: false, message: "Business not found." });
    }

    const suggestedValue = validateSuggestedValue(field, req.body.value);
    const currentValue = readCurrentValue(business, field);
    if (currentValue && currentValue.toLowerCase() === suggestedValue.toLowerCase()) {
      throw new Error("The listing already shows this information.");
    }

    const userId = actor.subjectId;
    const duplicate = await businessSuggestionModel.findOne({
      businessId: id, userId, field, suggestedValue, status: "pending",
    }).lean();
    if (duplicate) {
      return res.send({ success: true, duplicate: true, suggestion: duplicate });
    }

    const recentCount = await businessSuggestionModel.countDocuments({
      userId, createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    });
    if (recentCount >= DAILY_LIMIT_PER_USER) {
      return res.status(429).send({
        success: false,
        message: "You have reached today's limit for suggestions. Please try again tomorrow.",
      });
    }

    const suggestion = await businessSuggestionModel.create({
      businessId: id,
      businessName: business.businessName || "",
      businessCategory: business.category || "",
      field,
      currentValue,
      suggestedValue,
      note: clean(req.body.note).slice(0, 800),
      userId,
      userName: actor.userName || "",
      userMobile: actor.mobileNumber1 || actor.mobile || "",
      userEmail: actor.emailId || "",
      source: clean(req.body.source).slice(0, 80) || "business_detail",
      pageUrl: clean(req.body.pageUrl).slice(0, 500),
      ipAddress: req.ip || req.socket?.remoteAddress || "",
    });

    res.status(201).send({ success: true, suggestion });
  } catch (error) {
    console.error("createBusinessSuggestionAction error:", error.message);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────

export const listBusinessSuggestionsAction = async (req, res) => {
  try {
    const pageNo = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = clampPageSize(req.query.limit);
    const status = clean(req.query.status);
    const field = clean(req.query.field);
    const businessId = clean(req.query.businessId);
    const search = clean(req.query.search);

    const query = {};
    if (SUGGESTION_STATUSES.includes(status)) query.status = status;
    if (SUGGESTION_FIELDS.includes(field)) query.field = field;
    if (mongoose.Types.ObjectId.isValid(businessId)) query.businessId = businessId;
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [
        { businessName: pattern }, { businessCategory: pattern }, { suggestedValue: pattern },
        { userName: pattern }, { userMobile: pattern }, { note: pattern },
      ];
    }

    const [items, total, pendingCount] = await Promise.all([
      businessSuggestionModel.find(query).sort({ createdAt: -1 }).skip((pageNo - 1) * pageSize).limit(pageSize).lean(),
      businessSuggestionModel.countDocuments(query),
      businessSuggestionModel.countDocuments({ status: "pending" }),
    ]);

    // Attach what the listing shows *now*, so the reviewer compares against the
    // live value rather than the snapshot taken at submit time.
    const businessIds = [...new Set(items.map((item) => String(item.businessId)))];
    const businesses = await businessListModel
      .find({ _id: { $in: businessIds } }, { ...BUSINESS_PROJECTION, slug: 1, publicId: 1, isActive: 1 })
      .lean();
    const byId = new Map(businesses.map((business) => [String(business._id), business]));
    const enriched = items.map((item) => {
      const business = byId.get(String(item.businessId));
      return {
        ...item,
        businessExists: Boolean(business),
        location: business?.location || "",
        liveValue: business ? readCurrentValue(business, item.field) : "",
        liveWhatsapp: business ? clean(business.whatsappNumber) : "",
        autoApply: AUTO_APPLY_FIELDS.includes(item.field),
      };
    });

    res.send({ success: true, items: enriched, total, pageNo, pageSize, pendingCount });
  } catch (error) {
    console.error("listBusinessSuggestionsAction error:", error);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const pendingSuggestionCountAction = async (_req, res) => {
  try {
    const pendingCount = await businessSuggestionModel.countDocuments({ status: "pending" });
    res.send({ success: true, pendingCount });
  } catch (error) {
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

// Body: { value?, applyWhatsapp?, force? }
//   value          the admin's (possibly edited) value; defaults to the suggestion
//   applyWhatsapp  phone suggestions only — also set whatsappNumber
//   force          overwrite even though the listing changed since submission
export const approveBusinessSuggestionAction = async (req, res) => {
  try {
    const actor = getActor(req);
    const suggestion = await businessSuggestionModel.findById(req.params.id);
    if (!suggestion) {
      return res.status(NOT_FOUND.code).send({ success: false, message: "Suggestion not found." });
    }
    if (suggestion.status !== "pending") throw new Error(`This suggestion was already ${suggestion.status}.`);

    const business = await businessListModel.findById(suggestion.businessId, BUSINESS_PROJECTION).lean();
    if (!business) throw new Error("The business for this suggestion no longer exists.");

    const autoApply = AUTO_APPLY_FIELDS.includes(suggestion.field);
    const appliedValue = autoApply
      ? validateSuggestedValue(suggestion.field, req.body.value ?? suggestion.suggestedValue)
      : clean(req.body.value ?? suggestion.suggestedValue);
    let appliedFields = [];

    if (autoApply) {
      const liveValue = readCurrentValue(business, suggestion.field);
      if (liveValue !== suggestion.currentValue && !req.body.force) {
        return res.status(409).send({
          success: false,
          stale: true,
          liveValue,
          message: "The listing changed after this suggestion was made. Review the current value and approve again to overwrite it.",
        });
      }

      const updates = {};
      if (suggestion.field === "phone") {
        updates.contact = appliedValue;
        updates.contactList = appliedValue;
        if (req.body.applyWhatsapp) updates.whatsappNumber = appliedValue;
      } else if (suggestion.field === "whatsapp") {
        updates.whatsappNumber = appliedValue;
      } else {
        updates[suggestion.field] = appliedValue;
      }
      appliedFields = Object.keys(updates);

      await updateBusinessList(String(suggestion.businessId), { ...updates, updatedBy: actor.subjectId });
      await invalidateSearchCache();
      await invalidateDashboardCache();
      await invalidateCategoryCache();
    }

    suggestion.status = "approved";
    suggestion.appliedValue = appliedValue;
    suggestion.appliedFields = appliedFields;
    suggestion.reviewedBy = mongoose.Types.ObjectId.isValid(actor.subjectId) ? actor.subjectId : null;
    suggestion.reviewedByName = actor.userName || "";
    suggestion.reviewedAt = new Date();
    await suggestion.save();

    res.send({ success: true, suggestion });
  } catch (error) {
    console.error("approveBusinessSuggestionAction error:", error.message);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const rejectBusinessSuggestionAction = async (req, res) => {
  try {
    const actor = getActor(req);
    const suggestion = await businessSuggestionModel.findById(req.params.id);
    if (!suggestion) {
      return res.status(NOT_FOUND.code).send({ success: false, message: "Suggestion not found." });
    }
    if (suggestion.status !== "pending") throw new Error(`This suggestion was already ${suggestion.status}.`);

    suggestion.status = "rejected";
    suggestion.rejectReason = clean(req.body.reason).slice(0, 500);
    suggestion.reviewedBy = mongoose.Types.ObjectId.isValid(actor.subjectId) ? actor.subjectId : null;
    suggestion.reviewedByName = actor.userName || "";
    suggestion.reviewedAt = new Date();
    await suggestion.save();

    res.send({ success: true, suggestion });
  } catch (error) {
    console.error("rejectBusinessSuggestionAction error:", error.message);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};
