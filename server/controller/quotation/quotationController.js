import quotationModel from "../../model/quotation/quotationModel.js";
import quotationCounterModel from "../../model/quotation/quotationCounterModel.js";
import { BAD_REQUEST } from "../../errorCodes.js";

const MASSCLICK_PRODUCT_ITEM = {
  description: "MassClick Product",
  quantity: 1,
  unitPrice: 24000,
};
const MASSCLICK_GST_RATE = 18;
const QUOTATION_SEQUENCE_PAD = 6;
const DEFAULT_QUOTATION_NAME = "Massclick";
const DEFAULT_TERMS =
  "MassClick product quotation. The listed product amount and GST are fixed. This quotation includes one free basic website.";
const DEFAULT_NOTES =
  "All customer enquiries and lead notifications are delivered through WhatsApp. Businesses are advised to maintain an active and regularly monitored WhatsApp number to ensure timely responses and maximize lead conversion opportunities. One free basic website is included with this quotation.";

const buildQuotationNo = (year, sequence) =>
  `MC-QTN-${year}-${String(sequence).padStart(QUOTATION_SEQUENCE_PAD, "0")}`;

const generateNextQuotationNo = async (issueDate = new Date()) => {
  const date = new Date(issueDate);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const counter = await quotationCounterModel.findOneAndUpdate(
    { key: `quotation-${year}`, year },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  return buildQuotationNo(year, counter.sequence);
};

const previewNextQuotationNo = async (issueDate = new Date()) => {
  const date = new Date(issueDate);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const counter = await quotationCounterModel.findOne({ key: `quotation-${year}`, year }).lean();
  return buildQuotationNo(year, Number(counter?.sequence || 0) + 1);
};

const normalizeQuotationItems = (items = []) => {
  const sourceItems = Array.isArray(items) && items.length ? items : [MASSCLICK_PRODUCT_ITEM];
  return sourceItems
    .map((item) => ({
      description: String(item.description || MASSCLICK_PRODUCT_ITEM.description).trim(),
      quantity: Math.max(Number(item.quantity || 0), 0),
      unitPrice: Math.max(Number(item.unitPrice || 0), 0),
    }))
    .filter((item) => item.description);
};

const normalizeQuotationPayload = (body = {}) => ({
  quotationName: DEFAULT_QUOTATION_NAME,
  quotationNo: String(body.quotationNo || "").trim(),
  customerName: String(body.customerName || "").trim(),
  customerPhone: String(body.customerPhone || "").trim(),
  customerEmail: String(body.customerEmail || "").trim(),
  customerAddress: String(body.customerAddress || "").trim(),
  businessName: String(body.businessName || "MassClick").trim(),
  businessPhone: String(body.businessPhone || "").trim(),
  businessEmail: String(body.businessEmail || "").trim(),
  businessAddress: String(body.businessAddress || "").trim(),
  issueDate: body.issueDate || new Date(),
  validUntil: body.validUntil || null,
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  taxRate: MASSCLICK_GST_RATE,
  discount: 0,
  items: normalizeQuotationItems(body.items),
  status: body.status || "draft",
});

const validateQuotation = (payload, { requireQuotationNo = true } = {}) => {
  if (!payload.quotationName) return "Quotation name is required";
  if (requireQuotationNo && !payload.quotationNo) return "Quotation number is required";
  if (!payload.customerName) return "Customer name is required";
  if (!payload.items.length) return "Add at least one quotation item";
  return null;
};

export const createQuotationAction = async (req, res) => {
  try {
    const payload = normalizeQuotationPayload(req.body);
    payload.quotationNo = await generateNextQuotationNo(payload.issueDate);
    const validationError = validateQuotation(payload);
    if (validationError) {
      return res.status(400).send({ message: validationError });
    }

    const quotation = await quotationModel.create({
      ...payload,
      createdBy: req.authActor?.subjectId || null,
    });

    return res.status(201).send(quotation);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).send({ message: "Quotation number already exists" });
    }
    console.error("createQuotationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const nextQuotationNoAction = async (req, res) => {
  try {
    const quotationNo = await previewNextQuotationNo(req.query.issueDate || new Date());
    return res.send({ quotationNo });
  } catch (error) {
    console.error("nextQuotationNoAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllQuotationAction = async (req, res) => {
  try {
    const pageNo = Math.max(1, parseInt(req.query.pageNo, 10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize, 10) || 10), 100);
    const search = String(req.query.search || "").trim();

    const filter = search
      ? {
          $or: [
            { quotationName: { $regex: search, $options: "i" } },
            { quotationNo: { $regex: search, $options: "i" } },
            { customerName: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      quotationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      quotationModel.countDocuments(filter),
    ]);

    return res.send({
      data,
      total,
      pageNo,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("viewAllQuotationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewQuotationAction = async (req, res) => {
  try {
    const quotation = await quotationModel.findById(req.params.id).lean();
    if (!quotation) {
      return res.status(404).send({ message: "Quotation not found" });
    }
    return res.send(quotation);
  } catch (error) {
    console.error("viewQuotationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateQuotationAction = async (req, res) => {
  try {
    const payload = normalizeQuotationPayload(req.body);
    const validationError = validateQuotation(payload);
    if (validationError) {
      return res.status(400).send({ message: validationError });
    }

    const quotation = await quotationModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!quotation) {
      return res.status(404).send({ message: "Quotation not found" });
    }

    return res.send(quotation);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).send({ message: "Quotation number already exists" });
    }
    console.error("updateQuotationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteQuotationAction = async (req, res) => {
  try {
    const quotation = await quotationModel.findByIdAndDelete(req.params.id);
    if (!quotation) {
      return res.status(404).send({ message: "Quotation not found" });
    }
    return res.send({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error("deleteQuotationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
