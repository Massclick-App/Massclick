import {
  createSearchRequest, deleteSearchRequest, getSearchRequest,
  listSearchRequests, markSearchRequestRead, updateSearchRequestStatus,
} from "../../helper/searchRequest/searchRequestHelper.js";
import { normalizeWhatsAppMobile } from "../../helper/msg91/whatsappReliabilityHelper.js";

const requiredFields = ["fullName", "contactNumber", "email", "category", "location", "details"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const namePattern = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const hasLetter = /\p{L}/u;
const singleLine = (value) => String(value || "").trim().replace(/\s+/g, " ");

// Keep in step with fieldRules in client NoResultsRequestForm.js.
const validationError = (body = {}) => {
  const missing = requiredFields.filter((field) => !String(body[field] || "").trim());
  if (missing.length) return `Required fields missing: ${missing.join(", ")}`;
  const fullName = singleLine(body.fullName);
  if (fullName.length < 2 || fullName.length > 100) return "Name must be between 2 and 100 characters";
  if (!namePattern.test(fullName)) return "Name can only contain letters, spaces, dots, apostrophes and hyphens";
  // The completed-message WhatsApp goes to this number, so it must be one MSG91 can deliver to.
  if (!normalizeWhatsAppMobile(body.contactNumber).valid) return "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9";
  const email = singleLine(body.email);
  if (email.length > 150 || !emailPattern.test(email)) return "Please enter a valid email address";
  const category = singleLine(body.category);
  if (category.length < 2 || category.length > 120 || !hasLetter.test(category)) return "Category must be between 2 and 120 characters";
  const location = singleLine(body.location);
  if (location.length < 2 || location.length > 180) return "Location must be between 2 and 180 characters";
  const details = String(body.details).trim();
  if (details.length < 10 || details.length > 2000) return "Details must be between 10 and 2000 characters";
  if (!hasLetter.test(details)) return "Details must describe what you need in words";
  return null;
};

export const createSearchRequestAction = async (req, res) => {
  try {
    const error = validationError(req.body);
    if (error) return res.status(400).send({ success: false, message: error });
    const data = await createSearchRequest(req.body);
    return res.status(201).send({ success: true, message: "Search request submitted successfully", data });
  } catch (error) {
    return res.status(400).send({ success: false, message: error.message });
  }
};

export const listSearchRequestsAction = async (req, res) => {
  try { return res.send({ success: true, data: await listSearchRequests(req.query) }); }
  catch (error) { return res.status(400).send({ success: false, message: error.message }); }
};
export const getSearchRequestAction = async (req, res) => {
  try { return res.send({ success: true, data: await getSearchRequest(req.params.id) }); }
  catch (error) { return res.status(404).send({ success: false, message: error.message }); }
};
export const updateSearchRequestAction = async (req, res) => {
  try { return res.send({ success: true, message: "Status updated", data: await updateSearchRequestStatus(req.params.id, req.body.status) }); }
  catch (error) { return res.status(400).send({ success: false, message: error.message }); }
};
export const markSearchRequestReadAction = async (req, res) => {
  try { return res.send({ success: true, message: "Search request marked as read", data: await markSearchRequestRead(req.params.id, req.body || {}) }); }
  catch (error) { return res.status(error.statusCode || 400).send({ success: false, message: error.message }); }
};
export const deleteSearchRequestAction = async (req, res) => {
  try { await deleteSearchRequest(req.params.id); return res.send({ success: true, message: "Search request deleted" }); }
  catch (error) { return res.status(400).send({ success: false, message: error.message }); }
};
