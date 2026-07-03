import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import jsPDF from "jspdf";
import {
  Alert,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import {
  createQuotation as createQuotationAction,
  deleteQuotation as deleteQuotationAction,
  editQuotation as editQuotationAction,
  getAllQuotations,
  getNextQuotationNo,
} from "../../redux/actions/quotationAction.js";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import massclickLogo from "../../assets/MassClick_pvt_ltd.png";
import authorizedSignature from "../../assets/signature1.jpg";
import styles from "./quotation.module.css";

const cx = createScopedClassNames(styles);

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const MASSCLICK_PRODUCT_ITEM = {
  description: "MassClick Product",
  quantity: 1,
  unitPrice: 24000,
};

const MASSCLICK_GST_RATE = 18;

const PRODUCT_INCLUSION_TEXT =
  "Local business discovery, lead generation, service cards, MNI network access, and one free basic website.";

const DEFAULT_TERMS =
  "MassClick product quotation. The listed product amount and GST are fixed. This quotation includes one free basic website.";

const whyChooseMassClick = [
  {
    title: "Google Search Lead Generation",
    text: "MassClick indexed category pages help your business get discovered when customers search relevant keywords on Google. Customers can log in and connect directly, enabling two-way lead generation between customers and businesses.",
  },
  
  {
    title: "Instant Lead Notifications",
    text: "Customer enquiries and search activities are delivered as notifications, allowing businesses to receive potential customer details quickly and respond without delay.",
  },

  {
    title: "Two-Way Lead Generation System",
    text: "MassClick connects both customers and businesses. Customers discover suitable businesses, while businesses receive verified enquiries through a transparent two-way lead generation process.",
  },

  {
    title: "MNI - MassClick Network Intelligence",
    text: "MNI enables business-to-business networking by connecting businesses with relevant categories, referral opportunities, partnerships, and local business communities.",
  },

  {
    title: "Enquiry-Based Lead Generation",
    text: "The Enquiry Now feature allows customers to submit requirements directly. These enquiries are matched with relevant businesses to create quality two-way leads and improve conversions.",
  },
  
  {
    title: "Service Card Lead Generation",
    text: "Businesses can showcase services through dedicated service cards. Customers can enquire directly from these cards, generating targeted leads and improving customer engagement.",
  },
];

const importantNote =
  "All customer enquiries and lead notifications are delivered through WhatsApp. Businesses are advised to maintain an active and regularly monitored WhatsApp number to ensure timely responses and maximize lead conversion opportunities.";

const DEFAULT_NOTES =
  `${importantNote} One free basic website is included with this quotation.`;

const DEFAULT_QUOTATION_NAME = "Massclick";

const paymentMethodOptions = [
  { value: "not_selected", label: "Not selected" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "phonepe", label: "PhonePe" },
  { value: "other", label: "Other" },
];

const normalizeFormItems = (items = []) => {
  const sourceItems = Array.isArray(items) && items.length ? items : [MASSCLICK_PRODUCT_ITEM];
  return sourceItems.map((item) => ({
    description: String(item.description || MASSCLICK_PRODUCT_ITEM.description),
    quantity: item.quantity ?? MASSCLICK_PRODUCT_ITEM.quantity,
    unitPrice: item.unitPrice ?? MASSCLICK_PRODUCT_ITEM.unitPrice,
  }));
};

const normalizePayloadItems = (items = []) =>
  normalizeFormItems(items).map((item) => ({
    description: String(item.description || MASSCLICK_PRODUCT_ITEM.description).trim(),
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
  }));

const createEmptyForm = () => ({
  quotationName: DEFAULT_QUOTATION_NAME,
  quotationNo: "Auto generated",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  businessName: "MassClick",
  businessPhone: "",
  businessEmail: "support@massclick.in",
  businessAddress: "Tamil Nadu, India",
  issueDate: todayIso(),
  validUntil: addDaysIso(15),
  taxRate: MASSCLICK_GST_RATE,
  discount: 0,
  advancePayment: 0,
  paymentMethod: "not_selected",
  paymentReference: "",
  paymentDueDate: addDaysIso(7),
  status: "draft",
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  items: [MASSCLICK_PRODUCT_ITEM],
});

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const calculateTotals = (quotation) => {
  const subtotal = (quotation.items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  const discount = Number(quotation.discount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = taxable * (Number(quotation.taxRate || 0) / 100);
  const total = taxable + tax;
  const advancePayment = Math.min(Math.max(Number(quotation.advancePayment || 0), 0), total);
  const balanceDue = Math.max(total - advancePayment, 0);
  const paymentStatus =
    advancePayment <= 0 ? "unpaid" : balanceDue <= 0 ? "paid" : "part_paid";
  return { subtotal, discount, taxable, tax, total, advancePayment, balanceDue, paymentStatus };
};

const paymentStatusLabel = (status) => {
  if (status === "paid") return "Paid";
  if (status === "part_paid") return "Part Paid";
  return "Unpaid";
};

const paymentMethodLabel = (value) =>
  paymentMethodOptions.find((option) => option.value === value)?.label || "Not selected";

const paymentStatusClass = (status) => {
  if (status === "paid") return "payment-status-paid";
  if (status === "part_paid") return "payment-status-part-paid";
  return "payment-status-unpaid";
};

const mapQuotationToForm = (quotation) => ({
  ...createEmptyForm(),
  ...quotation,
  issueDate: toDateInput(quotation.issueDate),
  validUntil: toDateInput(quotation.validUntil),
  taxRate: MASSCLICK_GST_RATE,
  discount: 0,
  advancePayment: Number(quotation.advancePayment || 0),
  paymentMethod: quotation.paymentMethod || "not_selected",
  paymentReference: quotation.paymentReference || "",
  paymentDueDate: toDateInput(quotation.paymentDueDate),
  quotationName: DEFAULT_QUOTATION_NAME,
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  items: normalizeFormItems(quotation.items),
});

const buildQuotationPayload = (source, quotationNo = "") => ({
  ...source,
  quotationName: DEFAULT_QUOTATION_NAME,
  quotationNo,
  taxRate: MASSCLICK_GST_RATE,
  discount: 0,
  advancePayment: Number(source.advancePayment || 0),
  paymentMethod: source.paymentMethod || "not_selected",
  paymentReference: String(source.paymentReference || "").trim(),
  paymentDueDate: source.paymentDueDate || null,
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  items: normalizePayloadItems(source.items),
});

const drawWrappedText = (pdf, text, x, y, maxWidth, lineHeight = 5) => {
  const lines = pdf.splitTextToSize(String(text || "-"), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const splitPdfText = (pdf, text, maxWidth) =>
  pdf.splitTextToSize(String(text || "-"), maxWidth);

const cachedImageDataUrls = {};

const imageUrlToDataUrl = async (url) => {
  if (cachedImageDataUrls[url]) return cachedImageDataUrls[url];
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    cachedImageDataUrls[url] = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedImageDataUrls[url];
  } catch (error) {
    console.warn("Unable to load quotation image for PDF:", error);
    return "";
  }
};

const drawQuotationPdf = (quotation, logoDataUrl = "", signatureDataUrl = "") => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const navy = [6, 18, 47];
  const deepNavy = [3, 10, 30];
  const orange = [243, 107, 16];
  const muted = [71, 85, 105];
  const border = [190, 202, 218];
  const soft = [247, 250, 252];
  const paleOrange = [255, 247, 237];
  const teal = [0, 107, 95];
  const quotationItems = normalizeFormItems(quotation.items);
  const quoteItem = quotationItems[0] || MASSCLICK_PRODUCT_ITEM;
  const totals = calculateTotals(quotation);

  pdf.setProperties({
    title: quotation.quotationNo || "MassClick Quotation",
    subject: "MassClick product quotation",
  });

  pdf.setFillColor(250, 252, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(...navy);
  pdf.rect(0, 0, pageWidth, 18, "F");
  pdf.setFillColor(...orange);
  pdf.rect(0, 18, pageWidth, 1.8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("MASSCLICK PRODUCT QUOTATION", margin, 11.5);
  pdf.text(quotation.quotationNo || "-", pageWidth - margin, 11.5, { align: "right" });

  let y = 33;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", margin, y - 8, 78, 25, undefined, "FAST");
  } else {
    pdf.setTextColor(...orange);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text("Massclick", margin, y);
    pdf.setTextColor(...navy);
    pdf.setFontSize(14);
    pdf.text("Technologies Pvt Ltd", margin, y + 8);
  }
  pdf.setTextColor(...muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text(quotation.businessAddress || "Tamil Nadu, India", margin, y + 24);
  pdf.text(quotation.businessEmail || "support@massclick.in", margin, y + 30);

  const metaX = 130;
  pdf.setDrawColor(...border);
  pdf.setFillColor(...soft);
  pdf.roundedRect(metaX, 29, 66, 36, 3, 3, "FD");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(metaX + 3, 32, 60, 30, 2, 2, "F");
  pdf.setFontSize(7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...muted);
  pdf.text("Quotation No", metaX + 7, 41);
  pdf.text("Issue Date", metaX + 7, 50);
  pdf.text("Valid Until", metaX + 7, 59);
  pdf.setTextColor(...deepNavy);
  pdf.text(quotation.quotationNo || "-", metaX + 58, 41, { align: "right" });
  pdf.text(formatDate(quotation.issueDate), metaX + 58, 50, { align: "right" });
  pdf.text(formatDate(quotation.validUntil), metaX + 58, 59, { align: "right" });

  pdf.setDrawColor(...orange);
  pdf.setLineWidth(1);
  pdf.line(margin, 73, pageWidth - margin, 73);

  y = 85;
  const boxGap = 6;
  const boxWidth = (contentWidth - boxGap) / 2;
  const boxPaddingX = 5;
  const boxHeaderHeight = 10;
  const boxLineHeight = 5.5;
  const boxTextWidth = boxWidth - boxPaddingX * 2;
  const addressLines = splitPdfText(pdf, quotation.customerAddress || "-", boxTextWidth);
  const billToContentHeight =
    13 + boxLineHeight * 3 + Math.max(addressLines.length, 1) * 4.5;
  const summaryContentHeight = 13 + boxLineHeight * 4;
  const partyBoxHeight = Math.max(48, boxHeaderHeight + 8 + billToContentHeight, boxHeaderHeight + 8 + summaryContentHeight);
  pdf.setDrawColor(219, 226, 237);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, y, boxWidth, partyBoxHeight, 3, 3, "FD");
  pdf.roundedRect(margin + boxWidth + boxGap, y, boxWidth, partyBoxHeight, 3, 3, "FD");
  pdf.setFillColor(...paleOrange);
  pdf.rect(margin + 0.6, y + 0.6, boxWidth - 1.2, boxHeaderHeight, "F");
  pdf.rect(margin + boxWidth + boxGap + 0.6, y + 0.6, boxWidth - 1.2, boxHeaderHeight, "F");

  pdf.setTextColor(...orange);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("BILL TO", margin + boxPaddingX, y + 8);
  pdf.text("COMMERCIAL SUMMARY", margin + boxWidth + boxGap + boxPaddingX, y + 8);

  pdf.setTextColor(...deepNavy);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  const billToX = margin + boxPaddingX;
  let billToY = y + 19;
  pdf.text(quotation.customerName || "Customer Name", billToX, billToY);
  pdf.setFont("helvetica", "normal");
  billToY += boxLineHeight;
  pdf.text(quotation.customerPhone || "-", billToX, billToY);
  billToY += boxLineHeight;
  pdf.text(quotation.customerEmail || "-", billToX, billToY);
  billToY += 6;
  pdf.setTextColor(31, 41, 55);
  pdf.text(addressLines, billToX, billToY);

  const summaryX = margin + boxWidth + boxGap + boxPaddingX;
  let summaryY = y + 19;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...deepNavy);
  pdf.text(quotation.quotationName || DEFAULT_QUOTATION_NAME, summaryX, summaryY);
  pdf.setFont("helvetica", "normal");
  summaryY += boxLineHeight;
  pdf.text(`Product: ${quoteItem.description}`, summaryX, summaryY);
  summaryY += boxLineHeight;
  pdf.text("Includes: 1 free website", summaryX, summaryY);
  summaryY += 7;
  pdf.setTextColor(...teal);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Balance Due: ${money(totals.balanceDue)}`, summaryX, summaryY);

  y += partyBoxHeight + 16;
  pdf.setFillColor(...navy);
  pdf.roundedRect(margin, y, contentWidth, 13, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("PRODUCT / DESCRIPTION", margin + 4, y + 8.5);
  pdf.text("QTY", 139, y + 8.5, { align: "right" });
  pdf.text("UNIT PRICE", 168, y + 8.5, { align: "right" });
  pdf.text("AMOUNT", 194, y + 8.5, { align: "right" });

  y += 13;
  pdf.setDrawColor(220, 226, 235);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, "FD");
  y += 10;
  pdf.setTextColor(...deepNavy);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(quoteItem.description, margin + 4, y);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(51, 65, 85);
  drawWrappedText(
    pdf,
    PRODUCT_INCLUSION_TEXT,
    margin + 4,
    y + 6,
    100,
    4
  );
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...deepNavy);
  pdf.text(String(Number(quoteItem.quantity || 0)), 139, y, { align: "right" });
  pdf.text(money(quoteItem.unitPrice), 168, y, { align: "right" });
  pdf.text(money(Number(quoteItem.quantity || 0) * Number(quoteItem.unitPrice || 0)), 194, y, { align: "right" });

  y += 40;
  const totalX = 128;
  pdf.setDrawColor(...border);
  pdf.setFillColor(...soft);
  pdf.roundedRect(totalX, y, 68, 72, 3, 3, "FD");
  pdf.setFontSize(9);
  pdf.setTextColor(...deepNavy);
  pdf.text("Subtotal", totalX + 5, y + 9);
  pdf.text(money(totals.subtotal), totalX + 62, y + 9, { align: "right" });
  pdf.text("Tax", totalX + 5, y + 18);
  pdf.text(money(totals.tax), totalX + 62, y + 18, { align: "right" });
  pdf.text("Grand Total", totalX + 5, y + 27);
  pdf.text(money(totals.total), totalX + 62, y + 27, { align: "right" });
  pdf.text("Advance Paid", totalX + 5, y + 36);
  pdf.text(money(totals.advancePayment), totalX + 62, y + 36, { align: "right" });
  pdf.text("Payment Status", totalX + 5, y + 45);
  pdf.text(paymentStatusLabel(totals.paymentStatus), totalX + 62, y + 45, { align: "right" });
  pdf.text("Due Date", totalX + 5, y + 54);
  pdf.text(formatDate(quotation.paymentDueDate), totalX + 62, y + 54, { align: "right" });
  pdf.setDrawColor(226, 232, 240);
  pdf.line(totalX + 5, y + 59, totalX + 63, y + 59);
  pdf.setTextColor(...teal);
  pdf.setFontSize(11);
  pdf.text("Balance Due", totalX + 5, y + 67);
  pdf.text(money(totals.balanceDue), totalX + 62, y + 67, { align: "right" });

  pdf.setDrawColor(...border);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, y, 100, 36, 3, 3, "FD");
  pdf.setTextColor(...orange);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("PAYMENT DETAILS", margin + 5, y + 8);
  pdf.setTextColor(...deepNavy);
  pdf.setFontSize(8.3);
  pdf.text(`Method: ${paymentMethodLabel(quotation.paymentMethod)}`, margin + 5, y + 17);
  pdf.text(`Paid / Advance: ${money(totals.advancePayment)}`, margin + 5, y + 25);
  drawWrappedText(pdf, `Reference: ${quotation.paymentReference || "-"}`, margin + 5, y + 33, 88, 3.7);

  y += 86;
  pdf.setTextColor(...deepNavy);
  pdf.setFontSize(9);
  pdf.setDrawColor(...border);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, y, contentWidth, 38, 2.5, 2.5, "FD");
  pdf.text("Terms:", margin + 5, y + 9);
  drawWrappedText(pdf, quotation.terms || "-", margin + 22, y + 9, 156, 4);
  pdf.text("Notes:", margin + 5, y + 22);
  drawWrappedText(pdf, quotation.notes || "-", margin + 22, y + 22, 156, 4);

  pdf.addPage();
  pdf.setFillColor(250, 252, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(...navy);
  pdf.rect(0, 0, pageWidth, 18, "F");
  pdf.setFillColor(...orange);
  pdf.rect(0, 18, pageWidth, 1.8, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("MASSCLICK VALUE SUMMARY", margin, 11.5);
  pdf.text(quotation.quotationNo || "-", pageWidth - margin, 11.5, { align: "right" });

  y = 34;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", margin, y - 9, 48, 15.5, undefined, "FAST");
  }
  
  pdf.setDrawColor(...orange);
  pdf.setLineWidth(1);
  pdf.line(margin, y + 13, pageWidth - margin, y + 13);
  pdf.setTextColor(...navy);
  pdf.setFontSize(18);
  pdf.text("Why Choose MassClick?", margin, y + 26);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...muted);
  pdf.text("Lead generation, digital presence, discovery, and business network advantages included with the quotation.", margin, y + 34);
  y += 48;

  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 36;
  whyChooseMassClick.forEach((point, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardX = margin + column * (cardWidth + cardGap);
    const cardY = y + row * (cardHeight + 6);
    pdf.setDrawColor(216, 224, 236);
    pdf.setFillColor(...soft);
    pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "FD");
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cardX + 1.5, cardY + 1.5, cardWidth - 3, cardHeight - 3, 2.2, 2.2, "F");
    pdf.setFillColor(...paleOrange);
    pdf.circle(cardX + 7, cardY + 8, 4, "F");
    pdf.setTextColor(...navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(String(index + 1), cardX + 7, cardY + 9.2, { align: "center" });
    pdf.text(point.title, cardX + 14, cardY + 8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(7.6);
    drawWrappedText(pdf, point.text, cardX + 6, cardY + 17, cardWidth - 12, 3.8);
  });

  y += 3 * (cardHeight + 6) + 4;
  pdf.setDrawColor(...orange);
  pdf.setFillColor(...paleOrange);
  pdf.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");
  pdf.setTextColor(124, 45, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Important Note", margin + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  drawWrappedText(pdf, importantNote, margin + 5, y + 15, contentWidth - 10, 3.7);

  y += 48;
  pdf.setFont("helvetica", "bold");
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.7);
  pdf.line(margin, y, 86, y);
  pdf.line(120, y, pageWidth - margin, y);
  pdf.setTextColor(...muted);
  pdf.setFontSize(8);
  pdf.text("Accepted By", margin, y + 7);
  pdf.text("Authorized Signature", 120, y + 7);
  if (signatureDataUrl) {
    pdf.addImage(signatureDataUrl, "JPEG", 120, y + 9, 42, 16, undefined, "FAST");
  }
  pdf.setTextColor(...navy);
  pdf.setFontSize(9);
  pdf.text(quotation.customerName || "Customer Name", margin, y + 14);
  pdf.text("Authorized Representative", 120, y + 30);

  pdf.setFontSize(8);
  pdf.setTextColor(...muted);
  pdf.text("Massclick Technologies Pvt Ltd", margin, pageHeight - 8);

  return pdf;
};

export default function Quotation() {
  const dispatch = useDispatch();
  const {
    quotations = [],
    total = 0,
    loading = false,
  } = useSelector((state) => state.quotationReducer || {});

  const [form, setForm] = useState(createEmptyForm);
  const [activeView, setActiveView] = useState("form");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);

  const preview = useMemo(
    () => ({
      ...form,
      quotationName: DEFAULT_QUOTATION_NAME,
      quotationNo: form.quotationNo || "Auto generated",
      taxRate: MASSCLICK_GST_RATE,
      discount: 0,
      items: normalizeFormItems(form.items),
      notes: DEFAULT_NOTES,
      terms: DEFAULT_TERMS,
    }),
    [form]
  );
  const totals = useMemo(() => calculateTotals(preview), [preview]);
  const previewProductItem = preview.items[0] || MASSCLICK_PRODUCT_ITEM;
  const paymentProgress = totals.total > 0
    ? Math.min(100, Math.round((totals.advancePayment / totals.total) * 100))
    : 0;

  const fetchQuotations = async (pageNo = 1, pageSize = 25, options = {}) => {
    try {
      const response = await dispatch(getAllQuotations({
        pageNo,
        pageSize,
        search: options.search || "",
      }));
      const list = response?.data || [];
      if (!selectedQuotation && list.length) {
        setSelectedQuotation(list[0]);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to load quotations.",
      });
    }
  };

  useEffect(() => {
    fetchQuotations(1, 25, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingId) return undefined;

    let isActive = true;
    const loadNextQuotationNo = async () => {
      try {
        const response = await dispatch(getNextQuotationNo(form.issueDate));
        if (!isActive || !response?.quotationNo) return;
        setForm((current) => ({
          ...current,
          quotationNo: response.quotationNo,
        }));
      } catch (error) {
        setForm((current) => ({
          ...current,
          quotationNo: current.quotationNo || "Auto generated",
        }));
      }
    };

    loadNextQuotationNo();
    return () => {
      isActive = false;
    };
  }, [dispatch, editingId, form.issueDate]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (index, name, value) => {
    setForm((current) => {
      const items = normalizeFormItems(current.items);
      items[index] = { ...items[index], [name]: value };
      return { ...current, items };
    });
  };

  const resetForm = () => {
    const nextForm = createEmptyForm();
    setForm(nextForm);
    setEditingId("");
    setSelectedQuotation(nextForm);
    setActiveView("form");
  };

  const submitQuotation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...buildQuotationPayload(form, editingId ? form.quotationNo : ""),
      };

      const savedQuotation = editingId
        ? await dispatch(editQuotationAction(editingId, payload))
        : await dispatch(createQuotationAction(payload));

      setSelectedQuotation(savedQuotation);
      setEditingId(savedQuotation._id);
      setForm(mapQuotationToForm(savedQuotation));
      setMessage({ type: "success", text: "Quotation saved successfully." });
      await fetchQuotations(1, 25, {});
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to save quotation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const editQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setEditingId(quotation._id);
    setForm(mapQuotationToForm(quotation));
    setActiveView("form");
  };

  const deleteQuotation = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await dispatch(deleteQuotationAction(editingId));
      setMessage({ type: "success", text: "Quotation deleted successfully." });
      resetForm();
      await fetchQuotations(1, 25, {});
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to delete quotation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuotationById = async (quotationId) => {
    if (!quotationId) return;
    const confirmed = window.confirm("Delete this quotation?");
    if (!confirmed) return;

    setSaving(true);
    try {
      await dispatch(deleteQuotationAction(quotationId));
      if (editingId === quotationId) {
        resetForm();
      }
      setMessage({ type: "success", text: "Quotation deleted successfully." });
      await fetchQuotations(1, 25, {});
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to delete quotation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveQuotationForPdf = async () => {
    const payload = buildQuotationPayload(form, editingId ? form.quotationNo : "");
    const savedQuotation = editingId
      ? await dispatch(editQuotationAction(editingId, payload))
      : await dispatch(createQuotationAction(payload));

    setSelectedQuotation(savedQuotation);
    setEditingId(savedQuotation._id);
    setForm(mapQuotationToForm(savedQuotation));
    setMessage(null);

    return savedQuotation;
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const savedQuotation = await saveQuotationForPdf();
      const [logoDataUrl, signatureDataUrl] = await Promise.all([
        imageUrlToDataUrl(massclickLogo),
        imageUrlToDataUrl(authorizedSignature),
      ]);
      const pdf = drawQuotationPdf({
        ...savedQuotation,
        taxRate: MASSCLICK_GST_RATE,
        discount: 0,
        items: normalizeFormItems(savedQuotation.items),
      }, logoDataUrl, signatureDataUrl);
      const fileSafeNo = String(savedQuotation.quotationNo || preview.quotationNo || "quotation").replace(/[^a-z0-9-]+/gi, "-");
      pdf.save(`${fileSafeNo}.pdf`);
      setMessage({ type: "success", text: "Quotation PDF downloaded successfully." });
      await fetchQuotations(1, 25, {});
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to download PDF. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadQuotationFromRow = async (quotation) => {
    if (!quotation) return;
    setDownloading(true);
    try {
      const [logoDataUrl, signatureDataUrl] = await Promise.all([
        imageUrlToDataUrl(massclickLogo),
        imageUrlToDataUrl(authorizedSignature),
      ]);
      const pdf = drawQuotationPdf({
        ...quotation,
        quotationName: DEFAULT_QUOTATION_NAME,
        notes: DEFAULT_NOTES,
        terms: DEFAULT_TERMS,
        taxRate: MASSCLICK_GST_RATE,
        discount: 0,
        items: normalizeFormItems(quotation.items),
      }, logoDataUrl, signatureDataUrl);
      const fileSafeNo = String(quotation.quotationNo || "quotation").replace(/[^a-z0-9-]+/gi, "-");
      pdf.save(`${fileSafeNo}.pdf`);
      setMessage({ type: "success", text: "Quotation PDF downloaded successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Unable to download PDF. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const quotationRows = useMemo(
    () =>
      quotations.map((quotation) => ({
        ...quotation,
        issueDateLabel: formatDate(quotation.issueDate),
        totalLabel: money(calculateTotals({
          ...quotation,
          taxRate: MASSCLICK_GST_RATE,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).total),
        balanceLabel: money(calculateTotals({
          ...quotation,
          taxRate: MASSCLICK_GST_RATE,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).balanceDue),
        advanceLabel: money(calculateTotals({
          ...quotation,
          taxRate: MASSCLICK_GST_RATE,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).advancePayment),
        paymentStatusLabel: paymentStatusLabel(calculateTotals({
          ...quotation,
          taxRate: MASSCLICK_GST_RATE,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).paymentStatus),
        paymentDueDateLabel: formatDate(quotation.paymentDueDate),
      })),
    [quotations]
  );

  const quotationColumns = [
    { id: "quotationNo", label: "Quotation No" },
    { id: "quotationName", label: "Quotation Name" },
    { id: "customerName", label: "Customer" },
    { id: "customerPhone", label: "Phone" },
    { id: "issueDateLabel", label: "Issue Date" },
    { id: "totalLabel", label: "Total" },
    { id: "advanceLabel", label: "Paid" },
    { id: "balanceLabel", label: "Balance" },
    { id: "paymentDueDateLabel", label: "Due Date" },
    { id: "paymentStatusLabel", label: "Payment" },
    {
      id: "actions",
      label: "Actions",
      renderCell: (_, row) => (
        <div className={cx("table-actions")} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Edit quotation">
            <IconButton
              size="small"
              className={cx("action-button", "action-button-edit")}
              onClick={() => editQuotation(row)}
              aria-label={`Edit quotation ${row.quotationNo || ""}`}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download quotation">
            <IconButton
              size="small"
              className={cx("action-button", "action-button-download")}
              onClick={() => downloadQuotationFromRow(row)}
              disabled={downloading}
              aria-label={`Download quotation ${row.quotationNo || ""}`}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete quotation">
            <IconButton
              size="small"
              className={cx("action-button", "action-button-delete")}
              onClick={() => deleteQuotationById(row._id)}
              aria-label={`Delete quotation ${row.quotationNo || ""}`}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("quotation-page")}>
      <div className={cx("toolbar")}>
        <div className={cx("title-block")}>
          <h1 className={cx("title")}>Quotations</h1>
          <p className={cx("subtitle")}>
            Create customer quotations, save them in massclick_quotation, and download a PDF copy.
          </p>
        </div>
        <Button startIcon={<AddIcon />} variant="contained" onClick={resetForm}>
          New Quotation
        </Button>
      </div>

      <AdminViewTabs
        activeView={activeView}
        onChange={setActiveView}
        isEditing={Boolean(editingId)}
        createLabel="Quotation"
        listLabel="Catalogue"
        listCount={total}
      />

      {message && (
        <Alert severity={message.type} className={cx("status-message")}>
          {message.text}
        </Alert>
      )}

      {activeView === "list" ? (
        <div className={cx("catalogue-panel")}>
          <CustomizedTable
            title="Quotation Catalogue"
            columns={quotationColumns}
            data={quotationRows}
            total={total}
            fetchData={fetchQuotations}
            enableStatusFilter={false}
            loading={loading}
            onRowClick={editQuotation}
          />
        </div>
      ) : (
      <div className={cx("layout")}>
        <div>
          <form className={cx("panel")} onSubmit={submitQuotation}>
            <h2 className={cx("section-title")}>Quotation Details</h2>
            <div className={cx("form-grid")}>
              <label className={cx("field")}>
                <span className={cx("label")}>Customer Name</span>
                <input
                  className={cx("input")}
                  value={form.customerName}
                  onChange={(event) => updateField("customerName", event.target.value)}
                  required
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Customer Phone</span>
                <input
                  className={cx("input")}
                  value={form.customerPhone}
                  onChange={(event) => updateField("customerPhone", event.target.value)}
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Customer Email</span>
                <input
                  className={cx("input")}
                  value={form.customerEmail}
                  onChange={(event) => updateField("customerEmail", event.target.value)}
                />
              </label>
              <label className={cx("field", "field-wide")}>
                <span className={cx("label")}>Customer Address</span>
                <textarea
                  className={cx("textarea")}
                  value={form.customerAddress}
                  onChange={(event) => updateField("customerAddress", event.target.value)}
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Issue Date</span>
                <input
                  className={cx("input")}
                  type="date"
                  value={form.issueDate}
                  onChange={(event) => updateField("issueDate", event.target.value)}
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Valid Until</span>
                <input
                  className={cx("input")}
                  type="date"
                  value={form.validUntil}
                  onChange={(event) => updateField("validUntil", event.target.value)}
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Tax %</span>
                <input
                  className={cx("input")}
                  type="number"
                  min="0"
                  value={form.taxRate}
                  readOnly
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Advance Paid</span>
                <input
                  className={cx("input")}
                  type="number"
                  min="0"
                  value={form.advancePayment}
                  onChange={(event) => updateField("advancePayment", event.target.value)}
                />
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Payment Method</span>
                <select
                  className={cx("select")}
                  value={form.paymentMethod}
                  onChange={(event) => updateField("paymentMethod", event.target.value)}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={cx("field")}>
                <span className={cx("label")}>Payment Due Date</span>
                <input
                  className={cx("input")}
                  type="date"
                  value={form.paymentDueDate}
                  onChange={(event) => updateField("paymentDueDate", event.target.value)}
                />
              </label>
              <label className={cx("field", "field-wide")}>
                <span className={cx("label")}>Payment Reference / Notes</span>
                <input
                  className={cx("input")}
                  value={form.paymentReference}
                  onChange={(event) => updateField("paymentReference", event.target.value)}
                  placeholder="Transaction ID, receipt number, cheque number, or internal note"
                />
              </label>
            </div>

            <section className={cx("payment-overview")} aria-label="Payment overview">
              <div className={cx("payment-overview-header")}>
                <div>
                  <span className={cx("payment-kicker")}>Payment Concept</span>
                  <h3 className={cx("payment-heading")}>Amount paid and pending details</h3>
                </div>
                <span className={cx("payment-status", paymentStatusClass(totals.paymentStatus))}>
                  {paymentStatusLabel(totals.paymentStatus)}
                </span>
              </div>
              <div className={cx("payment-metrics")}>
                <div className={cx("payment-metric")}>
                  <span className={cx("payment-metric-label")}>Grand Total</span>
                  <strong className={cx("payment-metric-value")}>{money(totals.total)}</strong>
                </div>
                <div className={cx("payment-metric")}>
                  <span className={cx("payment-metric-label")}>Paid / Advance</span>
                  <strong className={cx("payment-metric-value")}>{money(totals.advancePayment)}</strong>
                </div>
                <div className={cx("payment-metric")}>
                  <span className={cx("payment-metric-label")}>Pending Amount</span>
                  <strong className={cx("payment-metric-value", "payment-metric-pending")}>{money(totals.balanceDue)}</strong>
                </div>
              </div>
              <div className={cx("payment-progress-track")}>
                <span
                  className={cx("payment-progress-fill")}
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <div className={cx("payment-detail-grid")}>
                <div className={cx("payment-detail")}>
                  <span className={cx("payment-detail-label")}>Method</span>
                  <strong className={cx("payment-detail-value")}>{paymentMethodLabel(form.paymentMethod)}</strong>
                </div>
                <div className={cx("payment-detail")}>
                  <span className={cx("payment-detail-label")}>Due Date</span>
                  <strong className={cx("payment-detail-value")}>{formatDate(form.paymentDueDate)}</strong>
                </div>
                <div className={cx("payment-detail")}>
                  <span className={cx("payment-detail-label")}>Reference</span>
                  <strong className={cx("payment-detail-value")}>{form.paymentReference || "-"}</strong>
                </div>
              </div>
            </section>

            <div className={cx("items")}>
              <h2 className={cx("section-title")}>Commercial Product</h2>
              {normalizeFormItems(form.items).map((item, index) => (
                <div className={cx("item-row")} key={`${index}-${item.description}`}>
                  <input
                    className={cx("input")}
                    placeholder="Description"
                    value={item.description}
                    onChange={(event) => updateItem(index, "description", event.target.value)}
                    required
                  />
                  <input
                    className={cx("input")}
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  />
                  <input
                    className={cx("input")}
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                  />
                </div>
              ))}
              <div className={cx("product-note")}>
                Default product values are prefilled. This quotation includes one free basic website.
              </div>
            </div>

            <div className={cx("form-actions")}>
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Quotation" : "Save Quotation"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={deleteQuotation}
                  disabled={saving}
                >
                  Delete
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className={cx("preview-shell")}>
          <div className={cx("preview-actions")}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadPdf} disabled={downloading}>
              {downloading ? "Preparing PDF..." : "Download PDF"}
            </Button>
          </div>
          <div id="quotation-print-root" className={cx("panel", "print-panel", "preview")}>
            <div className={cx("preview-document")}>
              <div className={cx("document-header")}>
                <div className={cx("brand")}>
                  <img className={cx("brand-logo")} src={massclickLogo} alt="MassClick" />
                  <span className={cx("brand-detail")}>{preview.businessAddress || "Tamil Nadu, India"}</span>
                  <span className={cx("brand-detail")}>{preview.businessEmail || "support@massclick.in"}</span>
                </div>
                <div className={cx("document-title")}>
                  <dl className={cx("quote-meta")}>
                    <div><dt>Quotation No</dt><dd>{preview.quotationNo}</dd></div>
                    <div><dt>Issue Date</dt><dd>{formatDate(preview.issueDate)}</dd></div>
                    <div><dt>Valid Until</dt><dd>{formatDate(preview.validUntil)}</dd></div>
                  </dl>
                </div>
              </div>

              <div className={cx("party-grid")}>
                <div className={cx("party-box")}>
                  <h3>Bill To</h3>
                  <p><strong>{preview.customerName || "Customer Name"}</strong></p>
                  <p>{preview.customerPhone || "-"}</p>
                  <p>{preview.customerEmail || "-"}</p>
                  <p>{preview.customerAddress || "-"}</p>
                </div>
                <div className={cx("party-box")}>
                  <h3>Commercial Summary</h3>
                  <p><strong>{preview.quotationName || DEFAULT_QUOTATION_NAME}</strong></p>
                  <p>Product: {previewProductItem.description}</p>
                  <p>Includes: 1 free website</p>
                  <p>GST: {Number(preview.taxRate || 0)}%</p>
                  <p>Grand Total: <strong>{money(totals.total)}</strong></p>
                  <p>Advance Paid: <strong>{money(totals.advancePayment)}</strong></p>
                  <p>Balance Due: <strong>{money(totals.balanceDue)}</strong></p>
                  <p>Payment Status: <strong>{paymentStatusLabel(totals.paymentStatus)}</strong></p>
                  <p>Payment Due: <strong>{formatDate(preview.paymentDueDate)}</strong></p>
                </div>
              </div>

              <table className={cx("document-table")}>
                <thead>
                  <tr>
                    <th>Product / Description</th>
                    <th className={cx("number-cell")}>Qty</th>
                    <th className={cx("number-cell")}>Unit Price</th>
                    <th className={cx("number-cell")}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.items || []).map((item, index) => (
                    <tr key={`${index}-${item.description}`}>
                      <td>
                        <strong>{item.description || "-"}</strong>
                        <span className={cx("line-description")}>
                          {PRODUCT_INCLUSION_TEXT}
                        </span>
                      </td>
                      <td className={cx("number-cell")}>{Number(item.quantity || 0)}</td>
                      <td className={cx("number-cell")}>{money(item.unitPrice)}</td>
                      <td className={cx("number-cell")}>
                        {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={cx("totals")}>
                <div className={cx("totals-box")}>
                  <div className={cx("total-row")}><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
                  <div className={cx("total-row")}><span>Tax</span><strong>{money(totals.tax)}</strong></div>
                  <div className={cx("total-row")}><span>Grand Total</span><strong>{money(totals.total)}</strong></div>
                  <div className={cx("total-row")}><span>Advance Paid</span><strong>{money(totals.advancePayment)}</strong></div>
                  <div className={cx("total-row")}><span>Payment Status</span><strong>{paymentStatusLabel(totals.paymentStatus)}</strong></div>
                  <div className={cx("total-row", "grand-total")}><span>Balance Due</span><strong>{money(totals.balanceDue)}</strong></div>
                </div>
              </div>

              <section className={cx("document-payment")}>
                <div className={cx("document-payment-card")}>
                  <span className={cx("document-payment-label")}>Payment Method</span>
                  <strong className={cx("document-payment-value")}>{paymentMethodLabel(preview.paymentMethod)}</strong>
                </div>
                <div className={cx("document-payment-card")}>
                  <span className={cx("document-payment-label")}>Payment Due Date</span>
                  <strong className={cx("document-payment-value")}>{formatDate(preview.paymentDueDate)}</strong>
                </div>
                <div className={cx("document-payment-card")}>
                  <span className={cx("document-payment-label")}>Reference</span>
                  <strong className={cx("document-payment-value")}>{preview.paymentReference || "-"}</strong>
                </div>
              </section>

              <div className={cx("notes")}>
                <p><strong>Terms:</strong> {preview.terms || "-"}</p>
                <p><strong>Notes:</strong> {preview.notes || "-"}</p>
              </div>

              <div className={cx("why-section")}>
                <h3>Why Choose MassClick?</h3>
                <div className={cx("why-grid")}>
                  {whyChooseMassClick.map((point, index) => (
                    <div className={cx("why-item")} key={point.title}>
                      <strong>{index + 1}. {point.title}</strong>
                      <p>{point.text}</p>
                    </div>
                  ))}
                </div>
                <div className={cx("important-note")}>
                  <strong>Important Note:</strong> {importantNote}
                </div>
              </div>

              <div className={cx("acceptance-grid")}>
                <div>
                  <span>Accepted By</span>
                  <strong>{preview.customerName || "Customer Name"}</strong>
                </div>
                <div>
                  <span>Authorized Signature</span>
                  <img
                    className={cx("signature-image")}
                    src={authorizedSignature}
                    alt="Authorized signature"
                  />
                  <strong>Authorized Representative</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
