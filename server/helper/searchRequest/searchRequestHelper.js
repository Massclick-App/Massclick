import { ObjectId } from "mongodb";
import searchRequestModel from "../../model/searchRequest/searchRequestModel.js";
import {
  getMsg91ErrorMessage,
  SEARCH_REQUEST_COMPLETED_CONTACT,
  sendSearchRequestCompletedMessage,
} from "../msg91/smsGatewayHelper.js";
import { normalizeWhatsAppMobile } from "../msg91/whatsappReliabilityHelper.js";

const clean = (value) => String(value || "").trim();
const cleanLine = (value) => clean(value).replace(/\s+/g, " ");
const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const INVALID_MOBILE_MESSAGE = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.";
// Skip reasons thrown by getValidMobileOrSkip, translated for the admin who has to act on them.
const SEND_SKIP_MESSAGES = {
  missing_mobile: "Add the customer's WhatsApp number before sending.",
  invalid_indian_mobile: INVALID_MOBILE_MESSAGE,
  recipient_admin_blocked: "This number is blocked for WhatsApp. Unblock it in MSG91 Analytics → Recipient Health, or use a different number.",
  customer_admin_blocked: "This customer is blocked for WhatsApp in MSG91 Analytics → Recipient Health.",
};
const COMPLETED_MESSAGE_FIELDS = [
  { key: "fullName", label: "Customer name", max: 100 },
  { key: "category", label: "Service", max: 120 },
  { key: "location", label: "Location", max: 180 },
  { key: "supportContact", label: "Support contact", max: 150 },
];

export const createSearchRequest = async (body = {}) => {
  return searchRequestModel.create({
    fullName: cleanLine(body.fullName),
    contactNumber: normalizeWhatsAppMobile(body.contactNumber).national || clean(body.contactNumber),
    email: clean(body.email),
    category: cleanLine(body.category),
    location: cleanLine(body.location),
    details: clean(body.details),
    source: clean(body.source) || "search-no-results",
  });
};

// The admin can correct any template value before sending; anything not sent falls
// back to what the customer submitted, so an empty body behaves like the old one-click send.
const resolveCompletedMessageValues = (item, overrides = {}) => {
  const values = {
    fullName: cleanLine(overrides.fullName ?? item.fullName),
    category: cleanLine(overrides.category ?? item.category),
    location: cleanLine(overrides.location ?? item.location),
    supportContact: cleanLine(overrides.supportContact ?? SEARCH_REQUEST_COMPLETED_CONTACT),
  };
  for (const { key, label, max } of COMPLETED_MESSAGE_FIELDS) {
    if (!values[key]) throw httpError(`${label} is required.`, 422);
    if (values[key].length > max) throw httpError(`${label} must be ${max} characters or fewer.`, 422);
  }
  const mobile = normalizeWhatsAppMobile(overrides.contactNumber ?? item.contactNumber);
  if (!mobile.valid) throw httpError(SEND_SKIP_MESSAGES[mobile.reason] || INVALID_MOBILE_MESSAGE, 422);
  return { ...values, contactNumber: mobile.national };
};

const describeSendFailure = (error) => {
  if (SEND_SKIP_MESSAGES[error?.message]) return SEND_SKIP_MESSAGES[error.message];
  // Axios keeps MSG91's own explanation in the response body; its message is just "status code 4xx".
  const reason = (error?.response?.data && getMsg91ErrorMessage(error.response.data, "")) || error?.message;
  return `WhatsApp message was not sent: ${reason || "MSG91 returned no reason"}`;
};

export const listSearchRequests = async ({ status, read, search, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 25 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const filter = status ? { status } : {};
  if (read === "true") filter.isRead = true;
  if (read === "false") filter.isRead = { $ne: true };
  const query = clean(search);
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["fullName", "contactNumber", "email", "category", "location", "details"]
      .map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
  }
  const allowedSortFields = ["fullName", "category", "location", "status", "isRead", "createdAt"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const direction = sortOrder === "asc" ? 1 : -1;
  const [items, total] = await Promise.all([
    searchRequestModel.find(filter).sort({ [safeSortBy]: direction }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    searchRequestModel.countDocuments(filter),
  ]);
  return {
    items, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit),
    completedMessageDefaults: { supportContact: SEARCH_REQUEST_COMPLETED_CONTACT },
  };
};

export const markSearchRequestRead = async (id, overrides = {}) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid search request ID");
  const currentItem = await searchRequestModel.findById(id).lean();
  if (!currentItem) throw new Error("Search request not found");
  if (currentItem.isRead) return currentItem;

  const values = resolveCompletedMessageValues(currentItem, overrides);
  try {
    await sendSearchRequestCompletedMessage({ ...currentItem, ...values }, {
      sourceId: currentItem._id?.toString?.(),
    });
  } catch (error) {
    throw httpError(describeSendFailure(error), SEND_SKIP_MESSAGES[error?.message] ? 422 : 502);
  }

  // Store the number that was actually messaged, so a corrected number isn't lost.
  const update = { isRead: true };
  if (values.contactNumber !== currentItem.contactNumber) update.contactNumber = values.contactNumber;
  const item = await searchRequestModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  if (!item) throw new Error("Search request not found");
  return item;
};

export const getSearchRequest = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid search request ID");
  const item = await searchRequestModel.findById(id).lean();
  if (!item) throw new Error("Search request not found");
  return item;
};

export const updateSearchRequestStatus = async (id, status) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid search request ID");
  const allowed = ["new", "contacted", "completed", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const item = await searchRequestModel.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).lean();
  if (!item) throw new Error("Search request not found");
  return item;
};

export const deleteSearchRequest = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid search request ID");
  const item = await searchRequestModel.findByIdAndDelete(id).lean();
  if (!item) throw new Error("Search request not found");
  return item;
};
