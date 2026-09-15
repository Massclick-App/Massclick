import { ObjectId } from "mongodb";
import agreementModel from "../../model/agreement/agreementModel.js";
import agreementCounterModel from "../../model/agreement/agreementCounterModel.js";

export const buildAgreementNo = (issueDate, sequence) => {
  if (
    typeof issueDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) ||
    !Number.isFinite(Date.parse(issueDate)) ||
    new Date(issueDate).toISOString().slice(0, 10) !== issueDate
  ) {
    throw new Error("A valid agreement date is required");
  }
  if (!/^\d{1,6}$/.test(String(sequence)) || Number(sequence) < 1) {
    throw new Error("Agreement sequence must be between 000001 and 999999");
  }
  const [year, month, day] = issueDate.split("-");
  return `MC/${day}${month}${year.slice(-2)}/${String(sequence).padStart(6, "0")}`;
};

export const nextAgreementNo = async (issueDate) => {
  buildAgreementNo(issueDate, 1);
  const counter = await agreementCounterModel
    .findOne({ key: "agreement" })
    .lean();
  const sequence = Number(counter?.sequence || 0) + 1;
  return {
    agreementNo: buildAgreementNo(issueDate, sequence),
    agreementSequence: String(sequence).padStart(6, "0"),
  };
};

const reserveAgreementNo = async (issueDate, requestedSequence) => {
  const manual =
    requestedSequence !== undefined &&
    requestedSequence !== null &&
    requestedSequence !== "";
  buildAgreementNo(issueDate, manual ? requestedSequence : 1);
  const counter = await agreementCounterModel.findOneAndUpdate(
    { key: "agreement" },
    manual
      ? { $max: { sequence: Number(requestedSequence) } }
      : { $inc: { sequence: 1 } },
    { new: true, upsert: true },
  );
  return buildAgreementNo(
    issueDate,
    manual ? requestedSequence : counter.sequence,
  );
};

export const normalizeAgreementPayload = (body = {}) => {
  const payload = {};
  for (const field of [
    "agreementNo",
    "place",
    "businessName",
    "clientName",
    "clientAddress",
    "clientPlace",
    "companyName",
    "companyDesignation",
    "companyPlace",
  ]) {
    payload[field] = typeof body[field] === "string" ? body[field].trim() : "";
  }
  for (const field of ["issueDate", "clientDate", "companyDate"]) {
    const value = body[field];
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    ) {
      throw new Error(`${field} must be a valid date (YYYY-MM-DD)`);
    }
    payload[field] = value;
  }
  for (const field of ["amount", "taxRate"]) {
    const value = body[field];
    if (
      (typeof value !== "number" && typeof value !== "string") ||
      String(value).trim() === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0 ||
      Number(value) > (field === "taxRate" ? 100 : 100000000)
    ) {
      throw new Error(`${field} is invalid`);
    }
    payload[field] = Math.round(Number(value) * 100) / 100;
  }
  payload.isActive = body.isActive ?? true;
  if (typeof payload.isActive !== "boolean")
    throw new Error("Status must be active or inactive");
  return payload;
};

export const createAgreement = async (data = {}, actor = {}) => {
  const payload = normalizeAgreementPayload(data);
  // The server owns the prefix and date. A missing suffix requests the next number.
  payload.agreementNo = await reserveAgreementNo(
    payload.issueDate,
    data.agreementSequence,
  );
  const agreement = new agreementModel({
    ...payload,
    createdBy: actor?.subjectId || null,
  });
  try {
    const result = await agreement.save();
    return {
      message: "Agreement created successfully",
      agreement: result.toObject(),
    };
  } catch (error) {
    if (error.code === 11000)
      throw new Error("Agreement number already exists");
    throw error;
  }
};

export const viewAgreement = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid agreement ID");
  const agreement = await agreementModel
    .findOne({ _id: id, isDeleted: { $ne: true } })
    .lean();
  if (!agreement) throw new Error("Agreement not found");
  return agreement;
};

export const viewAllAgreements = async ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
  sortBy = "createdAt",
  sortOrder = -1,
} = {}) => {
  // Include agreements saved before soft deletion was introduced.
  const query = { isDeleted: { $ne: true } };
  if (status === "active") query.isActive = { $ne: false };
  if (status === "inactive") query.isActive = false;
  if (search) {
    const safeSearch = String(search)
      .slice(0, 120)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["agreementNo", "businessName", "clientName"].map((field) => ({
      [field]: { $regex: safeSearch, $options: "i" },
    }));
  }
  const allowedSortFields = [
    "createdAt",
    "agreementNo",
    "businessName",
    "clientName",
    "issueDate",
    "place",
    "amount",
    "isActive",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const total = await agreementModel.countDocuments(query);
  const list = await agreementModel
    .find(query)
    .sort({ [sortField]: sortOrder === 1 ? 1 : -1, _id: -1 })
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();
  return { list, total };
};

export const updateAgreement = async (id, data = {}) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid agreement ID");
  const payload = normalizeAgreementPayload(data);
  if (data.agreementSequence !== undefined) {
    payload.agreementNo = await reserveAgreementNo(
      payload.issueDate,
      data.agreementSequence,
    );
  } else {
    const existing = await viewAgreement(id);
    const sequence = /^MC\/\d{6}\/(\d{6})$/.exec(existing.agreementNo)?.[1];
    payload.agreementNo = sequence
      ? buildAgreementNo(payload.issueDate, sequence)
      : existing.agreementNo;
  }
  try {
    const agreement = await agreementModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { ...payload, updatedAt: new Date() },
        { new: true, runValidators: true },
      )
      .lean();
    if (!agreement) throw new Error("Agreement not found");
    return agreement;
  } catch (error) {
    if (error.code === 11000)
      throw new Error("Agreement number already exists");
    throw error;
  }
};

export const deleteAgreement = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid agreement ID");
  const agreement = await agreementModel
    .findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, isActive: false, updatedAt: new Date() },
      { new: true },
    )
    .lean();
  if (!agreement) throw new Error("Agreement not found");
  return agreement;
};
