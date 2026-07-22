import {
  createSearchRequest, deleteSearchRequest, getSearchRequest,
  listSearchRequests, updateSearchRequestStatus,
} from "../../helper/searchRequest/searchRequestHelper.js";

const requiredFields = ["fullName", "contactNumber", "email", "category", "location", "details"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+() -]{7,15}$/;

const validationError = (body = {}) => {
  const missing = requiredFields.filter((field) => !String(body[field] || "").trim());
  if (missing.length) return `Required fields missing: ${missing.join(", ")}`;
  if (!emailPattern.test(String(body.email).trim())) return "Please enter a valid email address";
  if (!phonePattern.test(String(body.contactNumber).trim())) return "Please enter a valid mobile number";
  if (String(body.details).trim().length < 10) return "Details must contain at least 10 characters";
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
export const deleteSearchRequestAction = async (req, res) => {
  try { await deleteSearchRequest(req.params.id); return res.send({ success: true, message: "Search request deleted" }); }
  catch (error) { return res.status(400).send({ success: false, message: error.message }); }
};
