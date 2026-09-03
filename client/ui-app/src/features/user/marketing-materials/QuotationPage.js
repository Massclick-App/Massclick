import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import PaletteIcon from "@mui/icons-material/Palette";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import { findBusinessByMobile } from "state/actions/businessListAction.js";
import { getAllCategory } from "state/actions/categoryAction.js";
import BusinessDocumentsNav from "features/user/marketing-materials/BusinessDocumentsNav.js";
import { getBusinessLogo, imageToDataUrl } from "features/user/marketing-materials/documentImageUtils.js";
import { formatFullBusinessAddress } from "shared/utils/formatBusinessAddress.js";
import styles from "features/user/marketing-materials/VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);
const STORAGE_KEY = "massclick_quotation_draft_v1";

const quotationThemes = [
  { id:"modern-blue", name:"Modern Blue", primary:"#123c82", accent:"#2767db", soft:"#eff5ff", category:"Modern" },
  { id:"elegant-minimal", name:"Elegant Minimal", primary:"#765c45", accent:"#b99572", soft:"#faf6f1", category:"Elegant" },
  { id:"corporate-professional", name:"Corporate Professional", primary:"#133d77", accent:"#377ccc", soft:"#eef5ff", category:"Corporate" },
  { id:"orange-modern", name:"Orange Modern", primary:"#732810", accent:"#ff6418", soft:"#fff2e9", category:"Modern" },
  { id:"green-business", name:"Green Business", primary:"#155e2f", accent:"#35a852", soft:"#effbf2", category:"Corporate" },
  { id:"dark-executive", name:"Dark Executive", primary:"#111b29", accent:"#d8a82e", soft:"#fff9e8", category:"Professional", dark:true, premium:true },
  { id:"purple-creative", name:"Purple Creative", primary:"#5229a0", accent:"#8b5cf6", soft:"#f5f0ff", category:"Creative" },
  { id:"clean-minimal", name:"Clean Minimal", primary:"#334155", accent:"#94a3b8", soft:"#f8fafc", category:"Minimal" },
  { id:"red-professional", name:"Red Professional", primary:"#7f1118", accent:"#dc2935", soft:"#fff1f2", category:"Professional" },
  { id:"teal-modern", name:"Teal Modern", primary:"#075c59", accent:"#14a99f", soft:"#ecfffc", category:"Modern" },
  { id:"black-white", name:"Black & White", primary:"#171717", accent:"#555", soft:"#f5f5f5", category:"Minimal" },
  { id:"gradient-blue", name:"Gradient Blue", primary:"#1258a5", accent:"#24c5e8", soft:"#edfbff", category:"Colorful" },
  { id:"luxury-gold", name:"Luxury Gold", primary:"#151515", accent:"#d4a62a", soft:"#fff9e6", category:"Elegant", dark:true, premium:true },
  { id:"creative-agency", name:"Creative Agency", primary:"#4438a0", accent:"#e948a4", soft:"#fff0fa", category:"Creative" },
  { id:"construction", name:"Construction Quote", primary:"#272727", accent:"#f4b000", soft:"#fff9e6", category:"Professional" },
  { id:"tech-quote", name:"Tech Quote", primary:"#062a3b", accent:"#04bfd8", soft:"#eafcff", category:"Corporate", dark:true },
  { id:"pink-beauty", name:"Pink Beauty", primary:"#9d3658", accent:"#ff668f", soft:"#fff1f5", category:"Colorful" },
  { id:"corporate-clean", name:"Corporate Clean", primary:"#123c82", accent:"#2459ad", soft:"#f1f5fb", category:"Corporate" },
  { id:"simple-classic", name:"Simple Classic", primary:"#146b64", accent:"#159b8c", soft:"#effbf9", category:"Classic" },
  { id:"finance", name:"Finance Quote", primary:"#225d2c", accent:"#45a452", soft:"#f0faf1", category:"Professional" },
  { id:"maroon", name:"Maroon Classic", primary:"#62121a", accent:"#9f2835", soft:"#fff1f2", category:"Classic" },
  { id:"aqua", name:"Aqua Professional", primary:"#17636b", accent:"#47b9bd", soft:"#edfbfb", category:"Colorful" },
  { id:"event", name:"Event Management", primary:"#77123f", accent:"#c01d66", soft:"#fff0f7", category:"Creative" },
  { id:"interior", name:"Interior Quote", primary:"#312c26", accent:"#a78b6d", soft:"#faf7f2", category:"Elegant" },
  { id:"premium-black", name:"Premium Black Gold", primary:"#111822", accent:"#cda33b", soft:"#fff9e8", category:"Elegant", dark:true, premium:true },
];

const fallbackCategories = [
  "Wedding Mahal",
  "Sports Academy",
  "Interior Design",
  "Digital Marketing",
  "Photography",
  "Event Management",
  "Construction",
  "Hotel",
];

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const readDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const createSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const compact = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "-")
    .join(", ");

const normalizeList = (...values) =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return String(value || "").split(/[,/|]+/);
    })
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "-");

const uniqueValues = (values = []) =>
  values.filter((value, index, list) => {
    const normalized = String(value).replace(/\D/g, "") || String(value).toLowerCase();
    return list.findIndex((item) => {
      const itemNormalized = String(item).replace(/\D/g, "") || String(item).toLowerCase();
      return itemNormalized === normalized;
    }) === index;
  });

// Printed on a customer-facing quotation, so it goes through the same
// formatter the site renders with: the raw fields duplicate the plot number
// whenever the street already starts with it, and end on the free-text
// `location` label rather than the resolved locality.
const getBusinessAddress = (business = {}) =>
  formatFullBusinessAddress(business) ||
  compact(business.globalAddress, business.location) ||
  "Tamil Nadu";

const getBusinessProfile = (business = {}, storedUser = {}) => {
  const phones = uniqueValues(
    normalizeList(
      business.contact,
      business.contactList,
      business.whatsappNumber,
      storedUser.mobileNumber1,
      storedUser.mobileNumber2,
      storedUser.contact
    )
  ).slice(0, 2);

  return {
    businessName: business.businessName || business.name || storedUser.businessName || "Your Business Name",
    tagLine: business.title || business.category || "Professional Business Services",
    phones,
    email: business.email || storedUser.email || "info@business.com",
    website: business.website || "massclick.in",
    location: getBusinessAddress(business),
    category: business.category || "",
    gst: business.gstin || "",
    logoImage: getBusinessLogo(business),
  };
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const newItem = (description = "", price = 0) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description,
  details: "",
  quantity: 1,
  unitPrice: price,
});

const createDefaultDraft = () => ({
  quotationNo: `MC-QTN-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  date: todayIso(),
  validUntil: addDaysIso(15),
  category: "Wedding Mahal",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  projectTitle: "Wedding Mahal Booking Quotation",
  taxRate: 18,
  discount: 0,
  terms: "Prices are valid until the mentioned date. Final booking is subject to advance payment and availability.",
  notes: "Payment acknowledged subject to realization. This computer-generated quotation is valid with authorized approval.",
  preparedBy: "",
  checkedBy: "",
  approvedBy: "",
  receivedBy: "",
  items: [
    newItem("Wedding hall rental package", 75000),
    newItem("Decoration and stage setup", 25000),
    newItem("Dining and service arrangement", 18000),
  ],
});

const createResetDraft = () => ({
  ...createDefaultDraft(),
  category: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  projectTitle: "",
  terms: "",
  notes: "",
  preparedBy: "",
  checkedBy: "",
  approvedBy: "",
  receivedBy: "",
  items: [],
});

const categoryLabel = (category) =>
  category?.category || category?.categoryName || category?.title || category?.name || "";

const buildCategoryItems = (categoryName, categoryObject) => {
  const filters = Array.isArray(categoryObject?.filterConfig) ? categoryObject.filterConfig : [];
  const filterItems = filters
    .map((filter) => filter.label || filter.key)
    .filter(Boolean)
    .slice(0, 4);
  const keywordItems = normalizeList(categoryObject?.keywords).slice(0, 4);
  const source = filterItems.length ? filterItems : keywordItems;
  const cleanCategory = categoryName || "Business service";

  if (source.length) {
    return source.map((label, index) => newItem(`${cleanCategory} - ${label}`, index === 0 ? 10000 : 5000));
  }

  return [
    newItem(`${cleanCategory} consultation and planning`, 5000),
    newItem(`${cleanCategory} service package`, 15000),
    newItem(`${cleanCategory} execution and support`, 8000),
  ];
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  });

const calculateTotals = (draft) => {
  const subtotal = draft.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  const discount = Number(draft.discount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = taxable * (Number(draft.taxRate || 0) / 100);
  return { subtotal, discount, taxable, tax, total: taxable + tax };
};

const svgText = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const limitText = (value = "", max = 70) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const svgLine = (text, x, y, size, color, weight = 500, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${svgText(text)}</text>`;

const svgQuotationLogo = (profile, theme) => {
  if (profile.logoImage) {
    return `
      <defs>
        <clipPath id="quotationLogoClip">
          <circle cx="112" cy="104" r="38" />
        </clipPath>
      </defs>
      <circle cx="112" cy="104" r="48" fill="#ffffff" opacity="0.98" />
      <circle cx="112" cy="104" r="38" fill="#ffffff" />
      <image href="${svgText(profile.logoImage)}" x="74" y="66" width="76" height="76" preserveAspectRatio="xMidYMid meet" clip-path="url(#quotationLogoClip)" />
    `;
  }

  const initials = String(profile.businessName || "M")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return `
    <circle cx="112" cy="104" r="48" fill="#ffffff" opacity="0.98" />
    <circle cx="112" cy="104" r="38" fill="${theme.primary}" />
    ${svgLine(initials || "M", 88, 118, 30, "#ffffff", 850)}
  `;
};

const buildQuotationSvg = (draft, profile, theme) => {
  const totals = calculateTotals(draft);
  const phones = profile.phones.length ? profile.phones.join(" / ") : "+91 98765 43210";
  const itemRows = draft.items.slice(0, 8);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
    <rect width="1240" height="1754" fill="#ffffff" />
    <rect x="0" y="0" width="1240" height="226" fill="${theme.primary}" />
    <rect x="0" y="0" width="1240" height="16" fill="${theme.accent}" />
    <path d="M0 226 H1240 V294 C1004 254 856 316 638 270 C426 226 248 238 0 306 Z" fill="${theme.accent}" opacity="0.96" />
    ${svgQuotationLogo(profile, theme)}
    ${svgLine("QUOTATION", 178, 96, 30, "#ffffff", 850)}
    ${svgLine(limitText(profile.businessName, 36), 178, 146, 28, "#ffffff", 800)}
    ${svgLine(limitText(profile.location, 62), 178, 184, 18, "#f8fafc", 600)}
    <rect x="800" y="62" width="340" height="116" rx="18" fill="#ffffff" opacity="0.12" />
    ${svgLine(`No: ${draft.quotationNo}`, 832, 105, 19, "#ffffff", 800)}
    ${svgLine(`Date: ${draft.date}`, 832, 136, 18, "#ffffff", 650)}
    ${svgLine(`Valid: ${draft.validUntil}`, 832, 166, 18, "#ffffff", 650)}

    <rect x="82" y="328" width="1076" height="156" rx="20" fill="${theme.soft}" stroke="#e2e8f0" />
    ${svgLine("Prepared For", 118, 374, 18, theme.accent, 850)}
    ${svgLine(limitText(draft.customerName || "Customer Name", 42), 118, 414, 28, "#0f172a", 850)}
    ${svgLine(limitText(draft.customerPhone || "Phone number", 44), 118, 448, 18, "#475569", 650)}
    ${svgLine(limitText(draft.customerAddress || "Customer address", 64), 118, 478, 18, "#475569", 650)}
    ${svgLine("Business Contact", 750, 374, 18, theme.accent, 850)}
    ${svgLine(limitText(phones, 36), 750, 414, 20, "#0f172a", 800)}
    ${svgLine(limitText(profile.email, 36), 750, 448, 18, "#475569", 650)}
    ${svgLine(limitText(profile.website, 36), 750, 478, 18, "#475569", 650)}

    ${svgLine(limitText(draft.projectTitle, 58), 82, 570, 32, "#0f172a", 850)}
    ${svgLine(`Category: ${limitText(draft.category, 54)}`, 82, 608, 18, "#475569", 700)}

    <rect x="82" y="660" width="1076" height="54" rx="12" fill="${theme.primary}" />
    ${svgLine("#", 112, 696, 18, "#ffffff", 850)}
    ${svgLine("Description", 168, 696, 18, "#ffffff", 850)}
    ${svgLine("Qty", 750, 696, 18, "#ffffff", 850)}
    ${svgLine("Rate", 850, 696, 18, "#ffffff", 850)}
    ${svgLine("Amount", 1010, 696, 18, "#ffffff", 850)}
    ${itemRows.map((item, index) => {
      const y = 762 + index * 76;
      const amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      return `
        <rect x="82" y="${y - 42}" width="1076" height="64" rx="10" fill="${index % 2 ? "#ffffff" : "#f8fafc"}" stroke="#e2e8f0" />
        ${svgLine(String(index + 1), 112, y, 17, "#334155", 800)}
        ${svgLine(limitText(item.description, 54), 168, y - 8, 18, "#0f172a", 800)}
        ${item.details ? svgLine(limitText(item.details, 62), 168, y + 18, 14, "#64748b", 550) : ""}
        ${svgLine(String(item.quantity || 0), 752, y, 17, "#334155", 700)}
        ${svgLine(`Rs. ${money(item.unitPrice)}`, 850, y, 17, "#334155", 700)}
        ${svgLine(`Rs. ${money(amount)}`, 1010, y, 17, "#0f172a", 850)}
      `;
    }).join("")}

    <rect x="712" y="1370" width="446" height="190" rx="18" fill="${theme.soft}" stroke="#e2e8f0" />
    ${svgLine("Subtotal", 748, 1418, 18, "#475569", 700)}
    ${svgLine(`Rs. ${money(totals.subtotal)}`, 1008, 1418, 18, "#0f172a", 800)}
    ${svgLine("Discount", 748, 1456, 18, "#475569", 700)}
    ${svgLine(`Rs. ${money(totals.discount)}`, 1008, 1456, 18, "#0f172a", 800)}
    ${svgLine(`GST (${draft.taxRate || 0}%)`, 748, 1494, 18, "#475569", 700)}
    ${svgLine(`Rs. ${money(totals.tax)}`, 1008, 1494, 18, "#0f172a", 800)}
    <line x1="748" y1="1518" x2="1118" y2="1518" stroke="${theme.accent}" stroke-width="3" />
    ${svgLine("Grand Total", 748, 1550, 22, theme.primary, 850)}
    ${svgLine(`Rs. ${money(totals.total)}`, 970, 1550, 22, theme.primary, 850)}

    ${svgLine("Terms", 82, 1408, 18, theme.accent, 850)}
    ${svgLine(limitText(draft.terms, 74), 82, 1442, 16, "#475569", 600)}
    ${svgLine("NOTES & DECLARATION", 82, 1588, 16, theme.primary, 850)}
    ${svgLine(limitText(draft.notes, 100), 82, 1615, 14, "#475569", 550)}
    ${[[82,"Prepared By",draft.preparedBy],[372,"Checked By",draft.checkedBy],[662,"Approved By",draft.approvedBy],[952,"Received By",draft.receivedBy]].map(([x,label,value]) => `<line x1="${x}" y1="1652" x2="${x + 205}" y2="1652" stroke="#64748b" />${value ? svgLine(limitText(value,20),x,1644,13,"#334155",650) : ""}${svgLine(label.toUpperCase(),x + 52,1678,12,"#475569",800)}`).join("")}
    <rect x="0" y="1700" width="1240" height="54" fill="${theme.primary}" />
    ${svgLine(limitText(profile.businessName, 44), 82, 1733, 18, "#ffffff", 850)}
    ${svgLine(limitText([phones, profile.email, profile.website].filter(Boolean).join(" | "), 72), 560, 1733, 14, "#ffffff", 650)}
  </svg>`;
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const createQuotationPng = async (draft, profile, theme) => {
  const exportProfile = {
    ...profile,
    logoImage: await imageToDataUrl(profile.logoImage),
  };

  return (
  new Promise((resolve, reject) => {
    const svg = buildQuotationSvg(draft, exportProfile, theme);
    const image = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create quotation image."));
      }, "image/png", 0.96);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to render quotation image."));
    };

    image.src = url;
  })
  );
};

const QuotationPreview = ({ draft, profile, theme }) => {
  const totals = calculateTotals(draft);
  const phones = profile.phones.length ? profile.phones.join(" / ") : "+91 98765 43210";

  return (
    <article
      className={cx("quotation-sheet")}
      style={{
        "--quotation-primary": theme.primary,
        "--quotation-accent": theme.accent,
        "--quotation-soft": theme.soft,
      }}
    >
      <header className={cx("quotation-header")}>
        <div className={cx("quotation-brand-row")}>
          <div className={cx("quotation-logo")}>
            {profile.logoImage ? (
              <img src={profile.logoImage} alt={`${profile.businessName} logo`} />
            ) : (
              String(profile.businessName || "M").trim().slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <span>Quotation</span>
            <h2>{profile.businessName}</h2>
            <p>{profile.location}</p>
          </div>
        </div>
        <div className={cx("quotation-meta-card")}>
          <span>Business Contact</span>
          <strong>{profile.businessName}</strong>
          <small>{profile.location}</small>
          <small>{phones}</small>
          <small>{profile.email}</small>
          <small>{profile.website}</small>
        </div>
      </header>

      <section className={cx("quotation-party-grid")}>
        <div>
          <span>Prepared For</span>
          <h3>{draft.customerName || "Customer Name"}</h3>
          <p>{draft.customerPhone || "Phone number"}</p>
          <p>{draft.customerAddress || "Customer address"}</p>
        </div>
        <div>
          <span>Business Contact</span>
          <h3>{draft.projectTitle}</h3>
          <p>Category: {draft.category}</p>
        </div>
        <div>
          <span>Quotation Details</span>
          <h3>{draft.quotationNo}</h3>
          <p>Date: {draft.date}</p>
          <p>Valid until: {draft.validUntil}</p>
        </div>
      </section>

      <section className={cx("quotation-title-row")}>
        <h3>{draft.projectTitle}</h3>
        <span>{draft.category}</span>
      </section>

      <table className={cx("quotation-table")}>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {draft.items.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>
                <strong>{item.description}</strong>
                {item.details && <span>{item.details}</span>}
              </td>
              <td>{item.quantity}</td>
              <td>Rs. {money(item.unitPrice)}</td>
              <td>Rs. {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className={cx("quotation-bottom")}>
        <div>
          <span>Terms</span>
          <p>{draft.terms}</p>
        </div>
        <div className={cx("quotation-total-card")}>
          <p><span>Subtotal</span><strong>Rs. {money(totals.subtotal)}</strong></p>
          <p><span>Discount</span><strong>Rs. {money(totals.discount)}</strong></p>
          <p><span>GST ({draft.taxRate || 0}%)</span><strong>Rs. {money(totals.tax)}</strong></p>
          <h3><span>Total</span><strong>Rs. {money(totals.total)}</strong></h3>
        </div>
      </section>
      <section className={cx("quotation-authorization")}>
        <div className={cx("quotation-notes-box")}>
          <span>Notes &amp; Declaration</span>
          <p>{draft.notes || "No additional notes."}</p>
        </div>
        <div className={cx("quotation-signature-grid")}>
          {[
            ["Prepared By", draft.preparedBy],
            ["Checked By", draft.checkedBy],
            ["Approved By", draft.approvedBy],
            ["Received By", draft.receivedBy],
          ].map(([label, value]) => <div key={label}><strong>{value || " "}</strong><span>{label}</span></div>)}
        </div>
        <footer><span>{profile.website}</span><span>{profile.email}</span></footer>
      </section>
    </article>
  );
};

const QuotationThumbnail = ({ draft, profile, theme }) => {
  const totals = calculateTotals(draft);
  return <div className={cx("quotation-catalogue-sheet", theme.dark && "quotation-catalogue-dark")} style={{"--qt-primary":theme.primary,"--qt-accent":theme.accent,"--qt-soft":theme.soft}}>
    <header><span>{profile.logoImage ? <img src={profile.logoImage} alt="" /> : "Q"}</span><div><strong>QUOTATION</strong><small>{profile.businessName}</small></div><i /></header>
    <section><div><b>{draft.quotationNo}</b><small>{draft.customerName || "Customer Name"}</small></div><em>{draft.date}</em></section>
    <div className={cx("quotation-mini-table")}><strong><i>#</i><i>Description</i><i>Qty</i><i>Amount</i></strong>{draft.items.slice(0,4).map((item,index) => <span key={item.id}><i>{index+1}</i><i>{item.description}</i><i>{item.quantity}</i><i>{money(Number(item.quantity||0)*Number(item.unitPrice||0))}</i></span>)}</div>
    <footer><span>Total</span><b>Rs. {money(totals.total)}</b></footer>
  </div>;
};

export default function QuotationPage() {
  const dispatch = useDispatch();
  const { matchedBusiness } = useSelector((state) => state.businessListReducer || {});
  const { category: categories = [], loading: categoryLoading } = useSelector((state) => state.categoryReducer || {});
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const [draft, setDraft] = useState(() => readDraft() || createDefaultDraft());
  const [selectedThemeId, setSelectedThemeId] = useState(quotationThemes[0].id);
  const [customColors, setCustomColors] = useState({
    primary: quotationThemes[0].primary,
    accent: quotationThemes[0].accent,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [themeCategory, setThemeCategory] = useState("All");
  const [themeSearch, setThemeSearch] = useState("");

  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
    dispatch(getAllCategory({ pageNo: 1, pageSize: 600, options: { status: "active" } }));
  }, [dispatch, mobileNumber]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!isFormModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsFormModalOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFormModalOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const profile = getBusinessProfile(matchedBusiness || {}, storedUser);
  const categoryOptions = useMemo(() => {
    const names = categories.map(categoryLabel).filter(Boolean);
    return Array.from(new Set([...names, ...fallbackCategories])).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const baseTheme = quotationThemes.find((theme) => theme.id === selectedThemeId) || quotationThemes[0];
  const selectedTheme = { ...baseTheme, primary: customColors.primary, accent: customColors.accent };
  const filteredThemes = quotationThemes.filter((theme) =>
    (themeCategory === "All" || theme.category === themeCategory) &&
    theme.name.toLowerCase().includes(themeSearch.trim().toLowerCase())
  );

  const selectedCategoryObject = categories.find((category) => categoryLabel(category) === draft.category);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const updateItem = (id, field, value) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const handleCategoryChange = (categoryName) => {
    const categoryObject = categories.find((category) => categoryLabel(category) === categoryName);
    setDraft((current) => ({
      ...current,
      category: categoryName,
      projectTitle: `${categoryName || "Business"} Quotation`,
      items: buildCategoryItems(categoryName, categoryObject),
    }));
  };

  const handleThemeSelect = (theme) => {
    setSelectedThemeId(theme.id);
    setCustomColors({ primary: theme.primary, accent: theme.accent });
  };

  const openThemeInBuilder = (theme) => {
    handleThemeSelect(theme);
    window.requestAnimationFrame(() => document.getElementById("quotation-builder")?.scrollIntoView({ behavior:"smooth", block:"start" }));
  };

  const addItem = () => {
    setDraft((current) => ({
      ...current,
      items: [...current.items, newItem(current.category ? `${current.category} item` : "", 0)],
    }));
  };

  const removeItem = (id) => {
    setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  };

  const saveDraft = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setStatusMessage("Quotation draft saved.");
  };

  const resetDraft = () => {
    const nextDraft = createResetDraft();
    setDraft(nextDraft);
    localStorage.removeItem(STORAGE_KEY);
    setStatusMessage("Quotation draft reset.");
  };

  const handleDownload = async () => {
    setStatusMessage("");
    try {
      const blob = await createQuotationPng(draft, profile, selectedTheme);
      downloadBlob(blob, `${createSlug(draft.quotationNo || "quotation")}.png`);
      setStatusMessage("Quotation downloaded.");
    } catch (error) {
      setStatusMessage(error.message || "Download failed.");
    }
  };

  return (
    <>
      <StickySearchBar />
      <main className={cx("visiting-card-page")}>
        <div className={cx("document-back-row")}><BusinessDocumentsNav /></div>

        <section className={cx("quotation-workspace quotation-workspace-preview-only")} id="quotation-builder">
          {isFormModalOpen && createPortal(<>
          <div className={cx("quotation-form-backdrop")} onMouseDown={() => setIsFormModalOpen(false)} aria-hidden="true" />
          <div className={cx("quotation-form-panel quotation-form-modal")} role="dialog" aria-modal="true" aria-labelledby="quotation-form-title">
            <header className={cx("quotation-form-modal-header")}><div><span>Quotation Details</span><h2 id="quotation-form-title">Create or Edit Quotation</h2><p>Complete the customer, project, pricing and terms information.</p></div><button type="button" className={cx("icon-action")} onClick={() => setIsFormModalOpen(false)} aria-label="Close quotation editor"><CloseIcon /></button></header>
            <div className={cx("quotation-form-modal-content")}>
            <section className={cx("quotation-form-section")}>
              <span>Quote Setup</span>
              <div className={cx("quotation-fields-grid")}>
                <label>
                  Category
                  <input
                    list="quotation-category-options"
                    value={draft.category}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                    placeholder={categoryLoading ? "Loading categories..." : "Select or type category"}
                  />
                  <datalist id="quotation-category-options">
                    {categoryOptions.map((category) => <option key={category} value={category} />)}
                  </datalist>
                </label>
                <label>
                  Quotation No
                  <input value={draft.quotationNo} onChange={(event) => updateDraft("quotationNo", event.target.value)} />
                </label>
                <label>
                  Date
                  <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
                </label>
                <label>
                  Valid Until
                  <input type="date" value={draft.validUntil} onChange={(event) => updateDraft("validUntil", event.target.value)} />
                </label>
                <label className={cx("quotation-wide-field")}>
                  Project Title
                  <input value={draft.projectTitle} onChange={(event) => updateDraft("projectTitle", event.target.value)} />
                </label>
              </div>
              {selectedCategoryObject?.description && (
                <p className={cx("quotation-category-hint")}>{selectedCategoryObject.description}</p>
              )}
            </section>

            <section className={cx("quotation-form-section")}>
              <span>Customer Details</span>
              <div className={cx("quotation-fields-grid")}>
                <label>
                  Name
                  <input value={draft.customerName} onChange={(event) => updateDraft("customerName", event.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={draft.customerPhone} onChange={(event) => updateDraft("customerPhone", event.target.value)} />
                </label>
                <label>
                  Email
                  <input value={draft.customerEmail} onChange={(event) => updateDraft("customerEmail", event.target.value)} />
                </label>
                <label className={cx("quotation-wide-field")}>
                  Address
                  <textarea value={draft.customerAddress} onChange={(event) => updateDraft("customerAddress", event.target.value)} />
                </label>
              </div>
            </section>

            <section className={cx("quotation-form-section")}>
              <div className={cx("quotation-section-heading")}>
                <span>Items and Pricing</span>
                <button type="button" onClick={addItem}><AddIcon /> Add Item</button>
              </div>
              <div className={cx("quotation-item-editor")}>
                {draft.items.map((item, index) => (
                  <div className={cx("quotation-item-row")} key={item.id}>
                    <strong>{index + 1}</strong>
                    <input
                      value={item.description}
                      onChange={(event) => updateItem(item.id, "description", event.target.value)}
                      placeholder="Item description"
                    />
                    <input
                      value={item.details}
                      onChange={(event) => updateItem(item.id, "details", event.target.value)}
                      placeholder="Notes/details"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                      placeholder="Qty"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)}
                      placeholder="Rate"
                    />
                    <button type="button" onClick={() => removeItem(item.id)} aria-label="Remove quotation item">
                      <DeleteOutlineIcon />
                    </button>
                  </div>
                ))}
              </div>
              <div className={cx("quotation-fields-grid quotation-money-grid")}>
                <label>
                  Discount
                  <input type="number" min="0" value={draft.discount} onChange={(event) => updateDraft("discount", event.target.value)} />
                </label>
                <label>
                  GST %
                  <input type="number" min="0" value={draft.taxRate} onChange={(event) => updateDraft("taxRate", event.target.value)} />
                </label>
              </div>
            </section>

            <section className={cx("quotation-form-section")}>
              <span>Terms</span>
              <textarea value={draft.terms} onChange={(event) => updateDraft("terms", event.target.value)} />
            </section>
            <section className={cx("quotation-form-section quotation-authorization-fields")}>
              <span>Notes &amp; Authorization</span>
              <label>Notes &amp; Declaration<textarea value={draft.notes || ""} onChange={(event) => updateDraft("notes", event.target.value)} /></label>
              <div className={cx("quotation-fields-grid")}>
                <label>Prepared By<input value={draft.preparedBy || ""} onChange={(event) => updateDraft("preparedBy", event.target.value)} /></label>
                <label>Checked By<input value={draft.checkedBy || ""} onChange={(event) => updateDraft("checkedBy", event.target.value)} /></label>
                <label>Approved By<input value={draft.approvedBy || ""} onChange={(event) => updateDraft("approvedBy", event.target.value)} /></label>
                <label>Received By<input value={draft.receivedBy || ""} onChange={(event) => updateDraft("receivedBy", event.target.value)} /></label>
              </div>
            </section>
            </div>
            <footer className={cx("quotation-form-modal-actions")}><button type="button" className={cx("secondary-action quotation-danger-action")} onClick={resetDraft}><DeleteOutlineIcon /> Reset</button><button type="button" className={cx("secondary-action")} onClick={saveDraft}><SaveIcon /> Save Draft</button><button type="button" className={cx("primary-action")} onClick={() => { saveDraft(); setIsFormModalOpen(false); }}>Save & View Quotation</button></footer>
          </div>
          </>, document.body)}

          <div className={cx("quotation-preview-panel")}>
            <div className={cx("document-output-toolbar")}>
              <button type="button" className={cx("secondary-action")} onClick={() => setIsFormModalOpen(true)}><AddIcon /> Edit Details</button>
              <button type="button" className={cx("secondary-action")} onClick={() => setIsDesignModalOpen(true)}>
                <PaletteIcon />
                Theme
              </button>
              <button type="button" className={cx("secondary-action")} onClick={saveDraft}><SaveIcon /> Save Draft</button>
              <button type="button" className={cx("secondary-action quotation-danger-action")} onClick={resetDraft}><DeleteOutlineIcon /> Reset Draft</button>
              <button type="button" className={cx("primary-action")} onClick={handleDownload}><DownloadIcon /> Download PNG</button>
            </div>

            <QuotationPreview draft={draft} profile={profile} theme={selectedTheme} />
            {statusMessage && <p className={cx("status-message")} role="status" aria-live="polite">{statusMessage}</p>}
          </div>

          <aside className={cx("quotation-customizer-panel")}>
            <header><strong>Customize Quotation</strong><button type="button" onClick={resetDraft}>↻ Reset</button></header>
            <section><h3>Brand & Logo</h3><p>Business branding is loaded automatically.</p></section>
            <section><h3>Color Theme</h3><div className={cx("quotation-theme-swatches")}>{quotationThemes.slice(0,8).map((theme) => <button type="button" key={theme.id} aria-label={`Use ${theme.name} theme`} title={theme.name} className={cx(selectedThemeId === theme.id && "quotation-swatch-active")} style={{background:theme.accent}} onClick={() => handleThemeSelect(theme)} />)}</div><div className={cx("quotation-inline-colors")}><label>Header<input type="color" value={customColors.primary} aria-label="Quotation header color" onChange={(event) => setCustomColors((current) => ({...current,primary:event.target.value}))} /></label><label>Accent<input type="color" value={customColors.accent} aria-label="Quotation accent color" onChange={(event) => setCustomColors((current) => ({...current,accent:event.target.value}))} /></label></div></section>
            {["Header Style","Table Style","Tax & Currency","Terms & Notes","Footer & Signature"].map((label) => <button type="button" className={cx("quotation-setting-row")} key={label} onClick={() => setIsDesignModalOpen(true)}><span>{label}</span><b>⌄</b></button>)}
            <section><h3>Smart Features</h3>{["Auto Calculate","Tax Calculation","Discount","QR Code"].map((label) => <label className={cx("quotation-toggle")} key={label}><span>{label}</span><input type="checkbox" defaultChecked /></label>)}</section>
            <button type="button" className={cx("save-preview")} onClick={handleDownload}><DownloadIcon /> Download Quotation</button>
          </aside>
        </section>

        <section className={cx("quotation-catalogue")}>
          <div className={cx("quotation-catalogue-title")}><div><h2>Quotation Templates</h2><p>Choose from 25 professional designs and apply one to the quotation above.</p></div></div>
          <header className={cx("quotation-catalogue-head")}><nav>{["All","Modern","Minimal","Professional","Corporate","Creative","Elegant","Classic","Colorful"].map((category) => <button type="button" key={category} className={cx(themeCategory === category && "category-active")} onClick={() => setThemeCategory(category)}>{category === "All" ? "All 25" : category}</button>)}</nav><label className={cx("template-search")}><SearchIcon /><input value={themeSearch} onChange={(event) => setThemeSearch(event.target.value)} placeholder="Search templates..." /></label></header>
          <div className={cx("quotation-catalogue-grid")}>{filteredThemes.map((theme) => <button type="button" key={theme.id} className={cx("quotation-catalogue-card",selectedThemeId === theme.id && "quotation-catalogue-active")} onClick={() => openThemeInBuilder(theme)}><QuotationThumbnail draft={draft} profile={profile} theme={theme} /><span>{quotationThemes.findIndex((item) => item.id === theme.id)+1}. {theme.name}{theme.premium && <b>♛ PRO</b>}</span></button>)}</div>
          {!filteredThemes.length && <p className={cx("empty-templates")}>No quotation templates match your search.</p>}
        </section>

        {isDesignModalOpen && (
          <div className={cx("document-modal-overlay")} role="presentation">
            <section className={cx("document-modal")} role="dialog" aria-modal="true" aria-labelledby="quotation-design-title">
              <header className={cx("document-modal-header")}>
                <div>
                  <span>Business Document</span>
                  <h2 id="quotation-design-title">Quotation Theme</h2>
                </div>
                <button type="button" className={cx("icon-action")} onClick={() => setIsDesignModalOpen(false)} aria-label="Close design settings">
                  <CloseIcon />
                </button>
              </header>

              <div className={cx("document-modal-body")}>
                <div className={cx("quotation-theme-list")}>
                  {quotationThemes.map((theme) => (
                    <button
                      type="button"
                      key={theme.id}
                      className={cx("quotation-theme-option", selectedThemeId === theme.id && "quotation-theme-option-active")}
                      onClick={() => handleThemeSelect(theme)}
                    >
                      <i style={{ "--quotation-primary": theme.primary, "--quotation-accent": theme.accent }} />
                      {theme.name}
                    </button>
                  ))}
                </div>

                <div className={cx("quotation-color-controls")}>
                  <label>
                    Header
                    <input
                      type="color"
                      value={customColors.primary}
                      onChange={(event) => setCustomColors((current) => ({ ...current, primary: event.target.value }))}
                    />
                  </label>
                  <label>
                    Accent
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(event) => setCustomColors((current) => ({ ...current, accent: event.target.value }))}
                    />
                  </label>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
