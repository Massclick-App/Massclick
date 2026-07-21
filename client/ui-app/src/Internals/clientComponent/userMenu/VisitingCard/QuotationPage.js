import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import PaletteIcon from "@mui/icons-material/Palette";
import SaveIcon from "@mui/icons-material/Save";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { findBusinessByMobile } from "../../../../redux/actions/businessListAction";
import { getAllCategory } from "../../../../redux/actions/categoryAction";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import { getBusinessLogo, imageToDataUrl } from "./documentImageUtils";
import styles from "./VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);
const STORAGE_KEY = "massclick_quotation_draft_v1";

const quotationThemes = [
  { id: "executive", name: "Executive Blue", primary: "#102a56", accent: "#2563eb", soft: "#eff6ff" },
  { id: "massclick", name: "MassClick Orange", primary: "#07122f", accent: "#ff6b16", soft: "#fff7ed" },
  { id: "emerald", name: "Emerald Trust", primary: "#063b35", accent: "#10b981", soft: "#ecfdf5" },
  { id: "gold", name: "Black Gold", primary: "#15110a", accent: "#c7972e", soft: "#fffbeb" },
  { id: "rose", name: "Rose Premium", primary: "#4a0f1c", accent: "#e11d48", soft: "#fff1f2" },
  { id: "teal", name: "Teal Global", primary: "#083344", accent: "#06b6d4", soft: "#ecfeff" },
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

const getBusinessAddress = (business = {}) =>
  compact(business.plotNumber, business.street, business.pincode, business.location) ||
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
  items: [
    newItem("Wedding hall rental package", 75000),
    newItem("Decoration and stage setup", 25000),
    newItem("Dining and service arrangement", 18000),
  ],
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
    <rect x="0" y="1650" width="1240" height="104" fill="${theme.primary}" />
    ${svgLine(limitText(profile.businessName, 44), 82, 1708, 22, "#ffffff", 850)}
    ${svgLine(limitText([phones, profile.email, profile.website].filter(Boolean).join(" | "), 72), 560, 1708, 17, "#ffffff", 650)}
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
          <strong>{draft.quotationNo}</strong>
          <span>Date: {draft.date}</span>
          <span>Valid: {draft.validUntil}</span>
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
          <h3>{phones}</h3>
          <p>{profile.email}</p>
          <p>{profile.website}</p>
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
    </article>
  );
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

  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
    dispatch(getAllCategory({ pageNo: 1, pageSize: 600, options: { status: "active" } }));
  }, [dispatch, mobileNumber]);

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

  const addItem = () => {
    setDraft((current) => ({ ...current, items: [...current.items, newItem(`${current.category} item`, 0)] }));
  };

  const removeItem = (id) => {
    setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  };

  const saveDraft = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setStatusMessage("Quotation draft saved.");
  };

  const resetDraft = () => {
    const nextDraft = createDefaultDraft();
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
        <section className={cx("page-header")}>
          <BusinessDocumentsNav />
          <span>Business Document</span>
          <h1>Quotation Builder</h1>
          <p>Select a category, fill client details and pricing, save the draft, then download a branded quotation.</p>
        </section>

        <section className={cx("quotation-workspace")}>
          <div className={cx("quotation-form-panel")}>
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
          </div>

          <div className={cx("quotation-preview-panel")}>
            <div className={cx("document-output-toolbar")}>
              <button type="button" className={cx("secondary-action")} onClick={() => setIsDesignModalOpen(true)}>
                <PaletteIcon />
                Theme
              </button>
              <button type="button" className={cx("secondary-action")} onClick={saveDraft}><SaveIcon /> Save Draft</button>
              <button type="button" className={cx("secondary-action quotation-danger-action")} onClick={resetDraft}><DeleteOutlineIcon /> Reset Draft</button>
              <button type="button" className={cx("primary-action")} onClick={handleDownload}><DownloadIcon /> Download PNG</button>
            </div>

            <QuotationPreview draft={draft} profile={profile} theme={selectedTheme} />
            {statusMessage && <p className={cx("status-message")}>{statusMessage}</p>}
          </div>
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
