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
import massclickLogo from "../../assets/MassClick_pvt_ltd.webp";
import authorizedSignature from "../../assets/signature1.webp";
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
  "Local business discovery, lead generation, service cards, and MNI network access.";

const durationOptions = Array.from({ length: 24 }, (_, index) => index + 1);
const videoCountOptions = Array.from({ length: 20 }, (_, index) => index + 1);

const serviceAdvantagesText = (quotation) => {
  const months = Number(quotation.digitalMarketingMonths || 0);
  const videos = Number(quotation.youtubeVideoCount || 0);
  const websites = Number(quotation.websiteCount || 0);
  const values = [
    months ? `Digital marketing: ${months} ${months === 1 ? "month" : "months"}` : null,
    videos ? `YouTube: ${videos} ${videos === 1 ? "video" : "videos"}` : null,
    websites ? `Websites: ${websites}` : null,
  ].filter(Boolean);
  return values.length ? values.join(" | ") : "No additional services selected";
};

const DEFAULT_TERMS =
  "MassClick product quotation. The listed product amount and GST are fixed. This quotation includes one free basic website.";

const whyChooseMassClick = [
  {
    title: "Google Generated WhatsApp Leads",
    text: "Receive genuine customer enquiries directly on your WhatsApp from users who discover your business through Google and MassClick.",
    tamilText: "Google மற்றும் MassClick மூலம் உங்கள் வணிகத்தை கண்டுபிடிக்கும் வாடிக்கையாளர்களின் உண்மையான Lead-கள் நேரடியாக உங்கள் WhatsApp-க்கு வரும்.",
  },
  {
    title: "Website Search Based Generated Leads",
    text: "When customers search for products or services on MassClick, matching businesses instantly receive qualified customer leads.",
    tamilText: "MassClick-ல் வாடிக்கையாளர்கள் தேடும்போது, அதற்கு பொருந்தும் வணிகங்களுக்கு உடனடியாக Lead-கள் அனுப்பப்படும்.",
  },
  {
    title: "Popular Categories & Trending Search Leads",
    text: "Businesses listed in popular categories and trending searches gain more visibility and receive more customer enquiries.",
    tamilText: "Popular Categories மற்றும் Trending Searches-ல் இடம்பெறும் வணிகங்களுக்கு அதிக பார்வையும் அதிக Lead-களும் கிடைக்கும்.",
  },
  {
    title: "MNI (MassClick Network India)",
    text: "Connect with verified businesses across industries to create partnerships, referrals, and new business opportunities.",
    tamilText: "பல்வேறு துறைகளில் உள்ள சரிபார்க்கப்பட்ட வணிகர்களுடன் இணைந்து புதிய வணிக வாய்ப்புகள் மற்றும் Referral-களை உருவாக்கலாம்.",
  },
  {
    title: "Marketing Materials",
    text: "Access ready-to-use marketing tools such as posters, brochures, digital visiting cards, and branding materials.",
    tamilText: "Poster, Brochure, Digital Visiting Card போன்ற தொழில்முறை Marketing Materials-ஐ எளிதாக பயன்படுத்தலாம்.",
  },
  {
    title: "MassClick Feed",
    text: "Share daily offers, discounts, updates, photos, and videos to engage customers and increase business visibility.",
    tamilText: "தினசரி Offers, Discounts, Updates, Photos மற்றும் Videos-ஐ பகிர்ந்து அதிக வாடிக்கையாளர்களை ஈர்க்கலாம்.",
  },
  {
    title: "Publicize",
    text: "Promote your business profile across the MassClick platform to increase brand awareness and customer reach.",
    tamilText: "MassClick முழுவதும் உங்கள் வணிகத்தை முன்னிலைப்படுத்தி Brand Awareness மற்றும் Customer Reach-ஐ அதிகரிக்கலாம்.",
  },
  {
    title: "Enquiry Now Leads",
    text: "Customers can send enquiries instantly through the Enquiry Now button, helping businesses respond quickly.",
    tamilText: "\"Enquiry Now\" பொத்தான் மூலம் வாடிக்கையாளர்கள் உடனடியாக தொடர்புகொள்ளலாம்; வணிகர்கள் விரைவாக பதிலளிக்கலாம்.",
  },
  {
    title: "Direct Customer Chats",
    text: "Chat directly with customers to answer questions, share details, and close deals faster.",
    tamilText: "வாடிக்கையாளர்களுடன் நேரடியாக Chat செய்து தகவல்களை பகிர்ந்து விரைவாக விற்பனையை நிறைவேற்றலாம்.",
  },
  {
    title: "Knowledge Hub",
    text: "Learn business strategies, marketing tips, and industry updates to grow your business with confidence.",
    tamilText: "வணிக வளர்ச்சிக்கான Marketing Tips, Business Strategies மற்றும் Industry Updates-ஐ ஒரே இடத்தில் அறிந்து கொள்ளலாம்.",
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
  digitalMarketingMonths: 1,
  youtubeVideoCount: 1,
  websiteCount: 1,
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
  taxRate: Number(quotation.taxRate ?? MASSCLICK_GST_RATE),
  discount: 0,
  advancePayment: Number(quotation.advancePayment || 0),
  paymentMethod: quotation.paymentMethod || "not_selected",
  paymentReference: quotation.paymentReference || "",
  paymentDueDate: toDateInput(quotation.paymentDueDate),
  digitalMarketingMonths: Number(quotation.digitalMarketingMonths ?? 1),
  youtubeVideoCount: Number(quotation.youtubeVideoCount ?? 1),
  websiteCount: Number(quotation.websiteCount ?? 1),
  quotationName: DEFAULT_QUOTATION_NAME,
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  items: normalizeFormItems(quotation.items),
});

const buildQuotationPayload = (source, quotationNo = "") => ({
  ...source,
  quotationName: DEFAULT_QUOTATION_NAME,
  quotationNo,
  taxRate: Math.min(Math.max(Number(source.taxRate || 0), 0), 100),
  discount: 0,
  advancePayment: Number(source.advancePayment || 0),
  paymentMethod: source.paymentMethod || "not_selected",
  paymentReference: String(source.paymentReference || "").trim(),
  paymentDueDate: source.paymentDueDate || null,
  digitalMarketingMonths: Number(source.digitalMarketingMonths || 0),
  youtubeVideoCount: Number(source.youtubeVideoCount || 0),
  websiteCount: Number(source.websiteCount || 0),
  notes: DEFAULT_NOTES,
  terms: DEFAULT_TERMS,
  items: normalizePayloadItems(source.items),
});

const cachedImageDataUrls = {};

const imageBlobToPngDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Unable to prepare image for PDF.");
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image for PDF."));
    };
    image.src = objectUrl;
  });

const imageUrlToDataUrl = async (url) => {
  if (cachedImageDataUrls[url]) return cachedImageDataUrls[url];
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    cachedImageDataUrls[url] = await imageBlobToPngDataUrl(blob);
    return cachedImageDataUrls[url];
  } catch {
    return "";
  }
};

const PDF_COLORS = {
  navy: [10, 24, 56],
  navyDeep: [4, 12, 32],
  orange: [243, 107, 16],
  amber: [180, 83, 9],
  ink: [30, 41, 59],
  muted: [100, 116, 139],
  border: [222, 229, 240],
  soft: [248, 250, 252],
  paleOrange: [255, 246, 235],
  paleOrangeBorder: [253, 224, 193],
  teal: [4, 106, 92],
  white: [255, 255, 255],
};

const drawQuotationPdf = (quotation, logoDataUrl = "", signatureDataUrl = "") => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const headerHeight = 20;
  const footerLimit = pageHeight - 14;
  const c = PDF_COLORS;
  const LINE_FACTOR = 1.18;
  pdf.setLineHeightFactor(LINE_FACTOR);
  const lineHeightFor = (fontSizePt) => fontSizePt * LINE_FACTOR * 0.3528;
  const wrapText = (text, maxWidth) => pdf.splitTextToSize(String(text ?? "").trim() || "-", maxWidth);

  const quotationItems = normalizeFormItems(quotation.items);
  const quoteItem = quotationItems[0] || MASSCLICK_PRODUCT_ITEM;
  const totals = calculateTotals(quotation);
  const colAmountX = pageWidth - margin;
  const colPriceX = colAmountX - 26;
  const colQtyX = colPriceX - 24;

  pdf.setProperties({
    title: quotation.quotationNo || "MassClick Quotation",
    subject: "MassClick product quotation",
  });

  const card = (x, cardY, w, h, opts = {}) => {
    const { fill = c.white, stroke = c.border, radius = 2.6 } = opts;
    pdf.setDrawColor(...stroke);
    pdf.setFillColor(...fill);
    pdf.roundedRect(x, cardY, w, h, radius, radius, "FD");
  };

  const drawChrome = (subtitle) => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setFillColor(...c.navy);
    pdf.rect(0, 0, pageWidth, headerHeight, "F");
    pdf.setFillColor(...c.orange);
    pdf.rect(0, headerHeight, pageWidth, 1.4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text("MASSCLICK", margin, 12.2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.6);
    pdf.setTextColor(199, 210, 231);
    pdf.text(subtitle, margin, 16.6);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(quotation.quotationNo || "-", pageWidth - margin, 12.2, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.4);
    pdf.setTextColor(199, 210, 231);
    pdf.text("PRODUCT QUOTATION", pageWidth - margin, 16.6, { align: "right" });

    pdf.setDrawColor(...c.border);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...c.muted);
    pdf.text("Massclick Technologies Pvt Ltd  |  support@massclick.in", margin, pageHeight - 7.5);
  };

  let y = headerHeight;
  let pageSubtitle = "MASSCLICK PRODUCT QUOTATION";
  const newPage = (subtitle) => {
    pdf.addPage();
    pageSubtitle = subtitle || pageSubtitle;
    drawChrome(pageSubtitle);
    y = headerHeight + 14;
  };
  const ensureSpace = (height) => {
    if (y + height > footerLimit) newPage(pageSubtitle);
  };

  drawChrome(pageSubtitle);
  y = 27;

  // Brand block + meta card
  const brandTop = y;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", margin, brandTop - 4, 54, 17, undefined, "FAST");
  } else {
    pdf.setTextColor(...c.orange);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Massclick", margin, brandTop + 4);
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.7);
  pdf.setTextColor(...c.muted);
  pdf.text(quotation.businessAddress || "Tamil Nadu, India", margin, brandTop + 16.5);
  pdf.text(quotation.businessEmail || "support@massclick.in", margin, brandTop + 21);

  const metaW = 62;
  const metaX = pageWidth - margin - metaW;
  const metaH = 27;
  card(metaX, brandTop - 4, metaW, metaH, { fill: c.soft });
  const metaRows = [
    ["Quote No", quotation.quotationNo || "-"],
    ["Issue Date", formatDate(quotation.issueDate)],
    ["Valid Until", formatDate(quotation.validUntil)],
  ];
  let metaY = brandTop + 1;
  metaRows.forEach(([label, value], index) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.1);
    pdf.setTextColor(...c.muted);
    pdf.text(label.toUpperCase(), metaX + 5, metaY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(index === 0 ? 7.1 : 8);
    pdf.setTextColor(...c.navyDeep);
    pdf.text(value, metaX + metaW - 5, metaY, { align: "right" });
    metaY += 7.7;
  });

  y = brandTop + 27;

  // Bill To / Commercial Summary cards
  const colGap = 6;
  const colW = (contentWidth - colGap) / 2;
  const padX = 6;
  const textW = colW - padX * 2;
  const bodyFont = 8;
  const rowLh = lineHeightFor(bodyFont);

  const customerNameLines = wrapText(quotation.customerName || "Customer Name", textW);
  const addressLines = wrapText(quotation.customerAddress || "-", textW);
  const billRowsBeforeAddress = 2; // phone, email (name is the header line)
  const billContentH =
    (customerNameLines.length + billRowsBeforeAddress + addressLines.length) * rowLh + 3;
  const billCardH = 12 + billContentH + 4;

  const productSummaryLines = wrapText(`Product: ${quoteItem.description}`, textW);
  const summaryContentH =
    rowLh + productSummaryLines.length * rowLh + rowLh + rowLh + 2 + 7.5;
  const summaryCardH = 12 + summaryContentH + 4;

  const partyH = Math.max(43, billCardH, summaryCardH);
  ensureSpace(partyH + 6);

  const billX = margin;
  const summaryX = margin + colW + colGap;
  card(billX, y, colW, partyH);
  card(summaryX, y, colW, partyH);
  pdf.setFillColor(...c.orange);
  pdf.rect(billX, y, 2, partyH, "F");
  pdf.rect(summaryX, y, 2, partyH, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...c.orange);
  pdf.text("BILL TO", billX + padX, y + 8);
  pdf.text("COMMERCIAL SUMMARY", summaryX + padX, y + 8);

  let billY = y + 15.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(bodyFont);
  pdf.setTextColor(...c.navyDeep);
  pdf.text(customerNameLines, billX + padX, billY);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...c.ink);
  billY += customerNameLines.length * rowLh;
  pdf.text(quotation.customerPhone || "-", billX + padX, billY);
  billY += rowLh;
  pdf.text(quotation.customerEmail || "-", billX + padX, billY);
  billY += rowLh + 1;
  pdf.text(addressLines, billX + padX, billY);

  let summaryY = y + 15.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(bodyFont);
  pdf.setTextColor(...c.navyDeep);
  pdf.text(quotation.quotationName || DEFAULT_QUOTATION_NAME, summaryX + padX, summaryY);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...c.ink);
  summaryY += rowLh;
  pdf.text(productSummaryLines, summaryX + padX, summaryY);
  summaryY += productSummaryLines.length * rowLh;
  pdf.text(`Websites included: ${Number(quotation.websiteCount || 0)}`, summaryX + padX, summaryY);
  summaryY += rowLh;
  pdf.text(`GST: ${Number(quotation.taxRate || 0)}%`, summaryX + padX, summaryY);
  summaryY += rowLh + 3;
  pdf.setDrawColor(...c.border);
  pdf.setLineWidth(0.2);
  pdf.line(summaryX + padX, summaryY - rowLh + 2, summaryX + colW - padX, summaryY - rowLh + 2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.2);
  pdf.setTextColor(...c.teal);
  pdf.text("Balance Due", summaryX + padX, summaryY + 3);
  pdf.text(money(totals.balanceDue), summaryX + colW - padX, summaryY + 3, { align: "right" });

  y += partyH + 6;

  // Added advantages row
  const advItems = [
    {
      label: "Digital Marketing",
      value: `${Number(quotation.digitalMarketingMonths || 0)} ${Number(quotation.digitalMarketingMonths || 0) === 1 ? "month" : "months"}`,
    },
    {
      label: "YouTube Videos",
      value: `${Number(quotation.youtubeVideoCount || 0)} ${Number(quotation.youtubeVideoCount || 0) === 1 ? "video" : "videos"}`,
    },
    { label: "Websites", value: `${Number(quotation.websiteCount || 0)}` },
  ];
  const advGap = 4.5;
  const advW = (contentWidth - advGap * 2) / 3;
  const advH = 16;
  ensureSpace(advH + 6);
  advItems.forEach((item, index) => {
    const x = margin + index * (advW + advGap);
    card(x, y, advW, advH, { fill: c.paleOrange, stroke: c.paleOrangeBorder });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...c.amber);
    pdf.text(item.label.toUpperCase(), x + 5, y + 6.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.4);
    pdf.setTextColor(...c.navyDeep);
    pdf.text(item.value, x + 5, y + 13);
  });
  y += advH + 6;

  // Product table
  ensureSpace(20);
  pdf.setFillColor(...c.navy);
  pdf.rect(margin, y, contentWidth, 8.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.2);
  pdf.setTextColor(255, 255, 255);
  pdf.text("PRODUCT / DESCRIPTION", margin + 4, y + 5.8);
  pdf.text("QTY", colQtyX, y + 5.8, { align: "right" });
  pdf.text("UNIT PRICE", colPriceX, y + 5.8, { align: "right" });
  pdf.text("AMOUNT", colAmountX, y + 5.8, { align: "right" });
  y += 8.5;

  const descLines = wrapText(`${PRODUCT_INCLUSION_TEXT} ${serviceAdvantagesText(quotation)}`, contentWidth - 8);
  const descLh = lineHeightFor(7.3);
  const rowH = Math.max(20, 8 + descLines.length * descLh + 4);
  ensureSpace(rowH + 6);
  card(margin, y, contentWidth, rowH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.6);
  pdf.setTextColor(...c.navyDeep);
  pdf.text(quoteItem.description, margin + 4, y + 7);
  pdf.text(String(Number(quoteItem.quantity || 0)), colQtyX, y + 7, { align: "right" });
  pdf.text(money(quoteItem.unitPrice), colPriceX, y + 7, { align: "right" });
  pdf.text(money(Number(quoteItem.quantity || 0) * Number(quoteItem.unitPrice || 0)), colAmountX, y + 7, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.3);
  pdf.setTextColor(...c.muted);
  pdf.text(descLines, margin + 4, y + 12.5);
  y += rowH + 6;

  // Totals + payment details
  const totalsW = 72;
  const totalsX = pageWidth - margin - totalsW;
  const payW = contentWidth - totalsW - 6;
  const payRefLines = wrapText(`Reference: ${quotation.paymentReference || "-"}`, payW - 12);
  const payLh = lineHeightFor(7.5);
  const payH = 39 + payRefLines.length * payLh + 5;
  const totalsH = Math.max(52, payH);
  ensureSpace(totalsH + 6);

  card(margin, y, payW, totalsH, { fill: c.soft });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.8);
  pdf.setTextColor(...c.orange);
  pdf.text("PAYMENT DETAILS", margin + 6, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.7);
  pdf.setTextColor(...c.ink);
  pdf.text(`Method: ${paymentMethodLabel(quotation.paymentMethod)}`, margin + 6, y + 17);
  pdf.text(`Due date: ${formatDate(quotation.paymentDueDate)}`, margin + 6, y + 25);
  pdf.text(`Paid / Advance: ${money(totals.advancePayment)}`, margin + 6, y + 33);
  pdf.text(payRefLines, margin + 6, y + 41);

  card(totalsX, y, totalsW, totalsH, { fill: c.soft });
  const totalRows = [
    ["Subtotal", money(totals.subtotal)],
    [`GST (${Number(quotation.taxRate || 0)}%)`, money(totals.tax)],
    ["Grand Total", money(totals.total)],
    ["Advance Paid", money(totals.advancePayment)],
    ["Payment Status", paymentStatusLabel(totals.paymentStatus)],
  ];
  let totalsY = y + 8.5;
  pdf.setFontSize(7.7);
  totalRows.forEach(([label, value]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...c.ink);
    pdf.text(label, totalsX + 6, totalsY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...c.navyDeep);
    pdf.text(value, totalsX + totalsW - 6, totalsY, { align: "right" });
    totalsY += 6.8;
  });
  pdf.setDrawColor(...c.border);
  pdf.setLineWidth(0.3);
  pdf.line(totalsX + 6, totalsY - 2.8, totalsX + totalsW - 6, totalsY - 2.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.3);
  pdf.setTextColor(...c.teal);
  pdf.text("Balance Due", totalsX + 6, totalsY + 4.5);
  pdf.text(money(totals.balanceDue), totalsX + totalsW - 6, totalsY + 4.5, { align: "right" });

  y += totalsH + 6;

  // Terms & notes
  const termsLh = lineHeightFor(7.3);
  const termsLines = wrapText(quotation.terms || "-", contentWidth - 30);
  const notesLines = wrapText(quotation.notes || "-", contentWidth - 30);
  const notesCardH = 8 + termsLines.length * termsLh + 3 + notesLines.length * termsLh + 5;
  ensureSpace(notesCardH + 6);
  card(margin, y, contentWidth, notesCardH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.3);
  pdf.setTextColor(...c.navyDeep);
  pdf.text("Terms:", margin + 6, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...c.ink);
  pdf.text(termsLines, margin + 24, y + 8);
  let notesY = y + 8 + termsLines.length * termsLh + 3;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...c.navyDeep);
  pdf.text("Notes:", margin + 6, notesY);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...c.ink);
  pdf.text(notesLines, margin + 24, notesY);
  y += notesCardH + 5;

  // Keep acceptance and authorization with the commercial quotation.
  const signatureH = 24.5;
  ensureSpace(signatureH);
  const signatureGap = 6;
  const signatureW = (contentWidth - signatureGap) / 2;
  const signatureRightX = margin + signatureW + signatureGap;
  card(margin, y, signatureW, signatureH, { fill: c.soft });
  card(signatureRightX, y, signatureW, signatureH, { fill: c.soft });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.8);
  pdf.setTextColor(...c.muted);
  pdf.text("CUSTOMER ACCEPTANCE", margin + 6, y + 6.5);
  pdf.text("AUTHORIZED SIGNATURE", signatureRightX + 6, y + 6.5);
  pdf.setFontSize(8.7);
  pdf.setTextColor(...c.navy);
  pdf.text(quotation.customerName || "Customer Name", margin + 6, y + 14);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.35);
  pdf.line(margin + 6, y + 19.5, margin + signatureW - 6, y + 19.5);
  if (signatureDataUrl) {
    pdf.addImage(signatureDataUrl, "PNG", signatureRightX + 6, y + 8, 32, 10.5, undefined, "FAST");
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(...c.navy);
  pdf.text("Authorized Representative", signatureRightX + 6, y + 21.5);

  // Features page
  newPage("WHY CHOOSE MASSCLICK");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(...c.navy);
  pdf.text("10 Key MassClick Features", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.6);
  pdf.setTextColor(...c.muted);
  pdf.text(
    "Lead generation, digital presence, discovery, and business network advantages included with the quotation.",
    margin,
    y + 7
  );
  y += 16;

  const cardGap = 6;
  const cardW = (contentWidth - cardGap) / 2;
  const cardPadX = 6;
  const cardTextW = cardW - cardPadX * 2 - 6;
  const titleLh = lineHeightFor(8.3);
  const bodyLh = lineHeightFor(7.4);

  const measureFeatureCard = (point) => {
    const titleLines = wrapText(point.title, cardTextW);
    const bodyLines = wrapText(point.text, cardTextW);
    return {
      titleLines,
      bodyLines,
      height: Math.max(30, 9 + titleLines.length * titleLh + 2 + bodyLines.length * bodyLh + 6),
    };
  };

  for (let i = 0; i < whyChooseMassClick.length; i += 2) {
    const left = whyChooseMassClick[i];
    const right = whyChooseMassClick[i + 1];
    const leftMeasure = measureFeatureCard(left);
    const rightMeasure = right ? measureFeatureCard(right) : null;
    const rowH = Math.max(leftMeasure.height, rightMeasure ? rightMeasure.height : 0);
    ensureSpace(rowH + 6);

    [
      { point: left, measure: leftMeasure, col: 0, index: i },
      right ? { point: right, measure: rightMeasure, col: 1, index: i + 1 } : null,
    ]
      .filter(Boolean)
      .forEach(({ measure, col, index }) => {
        const cardX = margin + col * (cardW + cardGap);
        card(cardX, y, cardW, rowH, { fill: c.soft });
        pdf.setFillColor(...c.paleOrange);
        pdf.circle(cardX + 8, cardX ? y + 8 : y + 8, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(...c.navy);
        pdf.text(String(index + 1), cardX + 8, y + 9.3, { align: "center" });
        pdf.setFontSize(8.3);
        pdf.text(measure.titleLines, cardX + 16, y + 8.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.4);
        pdf.setTextColor(...c.ink);
        const bodyStartY = y + 8.5 + measure.titleLines.length * titleLh + 1;
        pdf.text(measure.bodyLines, cardX + cardPadX, bodyStartY);
      });

    y += rowH + 6;
  }

  y += 4;
  const noteLines = wrapText(importantNote, contentWidth - 12);
  const noteLh = lineHeightFor(7.8);
  const noteH = 10 + noteLines.length * noteLh + 6;
  ensureSpace(noteH + 14);
  card(margin, y, contentWidth, noteH, { fill: c.paleOrange, stroke: c.paleOrangeBorder });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.4);
  pdf.setTextColor(124, 45, 18);
  pdf.text("Important Note", margin + 6, y + 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.8);
  pdf.text(noteLines, margin + 6, y + 16);

  const totalPages = pdf.internal.getNumberOfPages();
  for (let pageNo = 1; pageNo <= totalPages; pageNo += 1) {
    pdf.setPage(pageNo);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...c.muted);
    pdf.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin, pageHeight - 7.5, { align: "right" });
  }

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
      taxRate: Number(form.taxRate || 0),
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
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).total),
        balanceLabel: money(calculateTotals({
          ...quotation,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).balanceDue),
        advanceLabel: money(calculateTotals({
          ...quotation,
          discount: 0,
          items: normalizeFormItems(quotation.items),
        }).advancePayment),
        paymentStatusLabel: paymentStatusLabel(calculateTotals({
          ...quotation,
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
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(event) => updateField("taxRate", event.target.value)}
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

            <section className={cx("advantages")}>
              <div>
                <span className={cx("payment-kicker")}>Added Advantage</span>
                <h2 className={cx("section-title")}>Included Digital Services</h2>
              </div>
              <div className={cx("form-grid")}>
                <label className={cx("field")}>
                  <span className={cx("label")}>Digital Marketing Duration</span>
                  <select
                    className={cx("select")}
                    value={form.digitalMarketingMonths}
                    onChange={(event) => updateField("digitalMarketingMonths", event.target.value)}
                  >
                    <option value="0">Not included</option>
                    {durationOptions.map((months) => (
                      <option key={months} value={months}>
                        {months} {months === 1 ? "month" : "months"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cx("field")}>
                  <span className={cx("label")}>YouTube Videos</span>
                  <select
                    className={cx("select")}
                    value={form.youtubeVideoCount}
                    onChange={(event) => updateField("youtubeVideoCount", event.target.value)}
                  >
                    <option value="0">Not included</option>
                    {videoCountOptions.map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? "video" : "videos"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cx("field", "field-wide")}>
                  <span className={cx("label")}>Number of Websites</span>
                  <input
                    className={cx("input")}
                    type="number"
                    min="0"
                    max="100"
                    value={form.websiteCount}
                    onChange={(event) => updateField("websiteCount", event.target.value)}
                  />
                </label>
              </div>
            </section>

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
                  <p>Websites included: {Number(preview.websiteCount || 0)}</p>
                  <p>GST: {Number(preview.taxRate || 0)}%</p>
                  <p>Grand Total: <strong>{money(totals.total)}</strong></p>
                  <p>Advance Paid: <strong>{money(totals.advancePayment)}</strong></p>
                  <p>Balance Due: <strong>{money(totals.balanceDue)}</strong></p>
                  <p>Payment Status: <strong>{paymentStatusLabel(totals.paymentStatus)}</strong></p>
                  <p>Payment Due: <strong>{formatDate(preview.paymentDueDate)}</strong></p>
                </div>
              </div>

              <section className={cx("document-advantages")}>
                <h3>Added Advantages</h3>
                <div className={cx("advantage-grid")}>
                  <div><span>Digital Marketing</span><strong>{Number(preview.digitalMarketingMonths || 0)} {Number(preview.digitalMarketingMonths || 0) === 1 ? "month" : "months"}</strong></div>
                  <div><span>YouTube Videos</span><strong>{Number(preview.youtubeVideoCount || 0)} {Number(preview.youtubeVideoCount || 0) === 1 ? "video" : "videos"}</strong></div>
                  <div><span>Websites</span><strong>{Number(preview.websiteCount || 0)}</strong></div>
                </div>
              </section>

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
                          {PRODUCT_INCLUSION_TEXT} {serviceAdvantagesText(preview)}
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
                <h3>10 Key MassClick Features</h3>
                <div className={cx("why-grid")}>
                  {whyChooseMassClick.map((point, index) => (
                    <div className={cx("why-item")} key={point.title}>
                      <strong>{index + 1}. {point.title}</strong>
                      <p><span className={cx("language-label")}>English</span>{point.text}</p>
                      <p className={cx("tamil-text")} lang="ta">
                        <span className={cx("language-label")}>தமிழ்</span>{point.tamilText}
                      </p>
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
