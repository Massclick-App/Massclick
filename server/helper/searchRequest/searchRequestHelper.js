import { ObjectId } from "mongodb";
import searchRequestModel from "../../model/searchRequest/searchRequestModel.js";

const clean = (value) => String(value || "").trim();

export const createSearchRequest = async (body = {}) => {
  return searchRequestModel.create({
    fullName: clean(body.fullName),
    contactNumber: clean(body.contactNumber),
    email: clean(body.email),
    category: clean(body.category),
    location: clean(body.location),
    details: clean(body.details),
    source: clean(body.source) || "search-no-results",
  });
};

export const listSearchRequests = async ({ status, page = 1, limit = 25 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([
    searchRequestModel.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    searchRequestModel.countDocuments(filter),
  ]);
  return { items, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
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
