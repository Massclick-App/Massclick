import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import UploadIcon from "@mui/icons-material/Upload";
import html2canvas from "html2canvas";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import BusinessDocumentsNav from "features/user/marketing-materials/BusinessDocumentsNav.js";
import { findBusinessByMobile } from "state/actions/businessListAction.js";
import { formatFullBusinessAddress } from "shared/utils/formatBusinessAddress.js";
import { getBusinessLogo } from "features/user/marketing-materials/documentImageUtils.js";
import styles from "features/user/marketing-materials/VoucherPage.module.css";

const cx = createScopedClassNames(styles);
const STORAGE_KEY = "massclick_voucher_draft_v1";

const templates = [
  { id: "corporate", name: "Elegant Blue", primary: "#061b3b", accent: "#d9a83d", soft: "#fffaf0", category: "Elegant" },
  { id: "premium", name: "Luxury Gold", primary: "#211604", accent: "#d5a52d", soft: "#fff8e7", category: "Elegant", premium: true },
  { id: "classic", name: "Modern Green", primary: "#053b31", accent: "#18a873", soft: "#effcf7", category: "Modern" },
  { id: "purple", name: "Premium Purple", primary: "#321061", accent: "#a53ee8", soft: "#f9efff", category: "Creative", premium: true },
  { id: "orange-festive", name: "Orange Festive", primary: "#7c2d12", accent: "#f97316", soft: "#fff7ed", category: "Colorful" },
  { id: "minimal-slate", name: "Clean Minimal", primary: "#334155", accent: "#94a3b8", soft: "#f8fafc", category: "Minimal" },
  { id: "royal-red", name: "Royal Red", primary: "#701a24", accent: "#e11d48", soft: "#fff1f2", category: "Classic" },
  { id: "teal-business", name: "Teal Business", primary: "#115e59", accent: "#2dd4bf", soft: "#f0fdfa", category: "Corporate" },
  { id: "midnight-gold", name: "Midnight Gold", primary: "#111827", accent: "#fbbf24", soft: "#fffbeb", category: "Professional", premium: true },
  { id: "ocean-blue", name: "Ocean Blue", primary: "#0c4a6e", accent: "#38bdf8", soft: "#f0f9ff", category: "Modern" },
  { id: "rose-beauty", name: "Rose Beauty", primary: "#831843", accent: "#f472b6", soft: "#fdf2f8", category: "Colorful" },
  { id: "emerald-classic", name: "Emerald Classic", primary: "#14532d", accent: "#4ade80", soft: "#f0fdf4", category: "Classic" },
  { id: "indigo-tech", name: "Indigo Tech", primary: "#312e81", accent: "#818cf8", soft: "#eef2ff", category: "Corporate" },
  { id: "coral-creative", name: "Coral Creative", primary: "#7f1d1d", accent: "#fb7185", soft: "#fff1f2", category: "Creative" },
  { id: "black-white", name: "Black & White", primary: "#171717", accent: "#737373", soft: "#fafafa", category: "Minimal" },
  { id: "aqua-modern", name: "Aqua Modern", primary: "#164e63", accent: "#22d3ee", soft: "#ecfeff", category: "Modern" },
  { id: "maroon-classic", name: "Maroon Classic", primary: "#4c0519", accent: "#be123c", soft: "#fff1f2", category: "Classic" },
  { id: "violet-agency", name: "Violet Agency", primary: "#4c1d95", accent: "#c084fc", soft: "#faf5ff", category: "Creative" },
  { id: "navy-corporate", name: "Navy Corporate", primary: "#172554", accent: "#3b82f6", soft: "#eff6ff", category: "Corporate" },
  { id: "champagne", name: "Champagne Elegance", primary: "#57422f", accent: "#d6b98c", soft: "#fdfaf5", category: "Elegant" },
  { id: "crimson-pro", name: "Crimson Professional", primary: "#450a0a", accent: "#dc2626", soft: "#fef2f2", category: "Professional" },
  { id: "lime-fresh", name: "Fresh Lime", primary: "#365314", accent: "#84cc16", soft: "#f7fee7", category: "Colorful" },
  { id: "steel-pro", name: "Steel Professional", primary: "#1e293b", accent: "#64748b", soft: "#f1f5f9", category: "Professional" },
  { id: "sunset", name: "Sunset Celebration", primary: "#7e22ce", accent: "#fb923c", soft: "#fff7ed", category: "Colorful" },
  { id: "forest-luxury", name: "Forest Luxury", primary: "#052e16", accent: "#ca8a04", soft: "#fefce8", category: "Elegant", premium: true },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const firstValue = (...values) => values.find((value) => String(value || "").trim()) || "";

const getBusinessDetails = (business = {}, storedUser = {}) => ({
  businessName: firstValue(business.businessName, business.name, storedUser.businessName),
  tagline: firstValue(business.title, business.category),
  address: firstValue(formatFullBusinessAddress(business), business.globalAddress, business.location),
  phone: firstValue(business.contact, business.whatsappNumber, storedUser.mobileNumber1, storedUser.contact),
  email: firstValue(business.email, storedUser.email),
  website: firstValue(business.website),
  taxId: firstValue(business.gstin),
  registrationNo: firstValue(business.registrationNo, business.companyRegistrationNo),
  logo: getBusinessLogo(business),
});

const defaultDraft = () => ({
  voucherType: "Discount Voucher",
  voucherTitle: "Festive Special Discount",
  voucherCode: "FESTIVE25",
  validUntil: todayIso(),
  discountValue: "25",
  maximumDiscount: "5000",
  minimumPurchase: "1000",
  usageLimit: "1 Per Customer",
  applicableTo: "All Products & Services",
  offerDescription: "Thank you for being our valued customer. Use this voucher to get an exclusive discount on your purchase.",
  voucherTerms: "This voucher is applicable on all products and services.\nThis voucher cannot be combined with other offers.\nValid only for purchases made on our website.\nThis voucher is non-transferable and cannot be redeemed for cash.\nCompany reserves the right to change or cancel this voucher anytime.",
  voucherNo: `VCH-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  date: todayIso(),
  currency: "INR",
  businessName: "Your Business Name",
  tagline: "Professional Business Services",
  address: "Business address, City, State, Postal code, Country",
  phone: "+91 98765 43210",
  email: "accounts@business.com",
  website: "www.business.com",
  taxId: "",
  registrationNo: "",
  payeeName: "",
  payeeAddress: "",
  payeePhone: "",
  payeeTaxId: "",
  accountName: "",
  amount: "",
  amountWords: "",
  paymentMode: "Bank Transfer",
  bankName: "",
  transactionRef: "",
  instrumentDate: todayIso(),
  purpose: "",
  expenseCategory: "",
  projectCode: "",
  costCenter: "",
  invoiceRef: "",
  narration: "",
  notes: "Payment acknowledged subject to realization. This computer-generated voucher is valid with authorized approval.",
  preparedBy: "",
  checkedBy: "",
  approvedBy: "",
  receivedBy: "",
  logo: "",
  templateId: "corporate",
});

const readDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...defaultDraft(), ...saved } : defaultDraft();
  } catch {
    return defaultDraft();
  }
};

const money = (value, currency) => {
  const amount = Number(value || 0);
  try {
    return new window.Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

function Field({ label, name, value, onChange, type = "text", required = false, children, wide = false }) {
  return (
    <label className={cx(wide ? "field-wide" : "field")}>
      <span>{label}{required && <b> *</b>}</span>
      {children || <input type={type} name={name} value={value} onChange={onChange} required={required} />}
    </label>
  );
}

// Kept temporarily for compatibility with saved accounting-voucher drafts.
// eslint-disable-next-line no-unused-vars
function AccountingVoucherPreview({ draft, template, previewRef }) {
  const initials = draft.businessName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <article ref={previewRef} className={cx("voucher")} style={{ "--primary": template.primary, "--accent": template.accent, "--soft": template.soft }}>
      <div className={cx("top-line")} />
      <header className={cx("voucher-header")}>
        <div className={cx("brand")}>
          <div className={cx("logo")}>{draft.logo ? <img src={draft.logo} alt="Business logo" /> : initials || "VB"}</div>
          <div><h2>{draft.businessName || "Your Business Name"}</h2><p>{draft.tagline}</p></div>
        </div>
        <div className={cx("document-title")}><span>{draft.voucherType}</span><strong>{draft.voucherNo}</strong></div>
      </header>
      <div className={cx("company-strip")}>
        <span>{draft.address}</span><span>{draft.phone}</span><span>{draft.email}</span>
      </div>
      <section className={cx("meta-grid")}>
        <div><small>Voucher date</small><strong>{draft.date || "—"}</strong></div>
        <div><small>Currency</small><strong>{draft.currency}</strong></div>
        <div><small>Payment mode</small><strong>{draft.paymentMode}</strong></div>
        <div><small>Reference</small><strong>{draft.transactionRef || "—"}</strong></div>
      </section>
      <section className={cx("payee-box")}>
        <div><small>Paid / Received By</small><h3>{draft.payeeName || "Payee or recipient name"}</h3><p>{draft.payeeAddress || "Payee address"}</p><p>{draft.payeePhone}{draft.payeeTaxId && ` · Tax ID: ${draft.payeeTaxId}`}</p></div>
        <div className={cx("amount-box")}><small>Total amount</small><strong>{money(draft.amount, draft.currency)}</strong></div>
      </section>
      <section className={cx("amount-words")}><small>Amount in words</small><strong>{draft.amountWords || "Amount in words"}</strong></section>
      <table className={cx("details-table")}><tbody>
        <tr><th>Purpose / Particulars</th><td>{draft.purpose || "Purpose of payment"}</td></tr>
        <tr><th>Account / Ledger</th><td>{draft.accountName || "—"}</td></tr>
        <tr><th>Expense category</th><td>{draft.expenseCategory || "—"}</td></tr>
        <tr><th>Project / Cost centre</th><td>{[draft.projectCode, draft.costCenter].filter(Boolean).join(" / ") || "—"}</td></tr>
        <tr><th>Invoice / Bill reference</th><td>{draft.invoiceRef || "—"}</td></tr>
        <tr><th>Bank / Instrument date</th><td>{[draft.bankName, draft.instrumentDate].filter(Boolean).join(" · ") || "—"}</td></tr>
        <tr><th>Narration</th><td>{draft.narration || "—"}</td></tr>
      </tbody></table>
      <section className={cx("notes")}><strong>Notes & declaration</strong><p>{draft.notes}</p></section>
      <section className={cx("signatures")}>
        {[['Prepared by', draft.preparedBy], ['Checked by', draft.checkedBy], ['Approved by', draft.approvedBy], ['Received by', draft.receivedBy]].map(([label, name]) => <div key={label}><span>{name || " "}</span><small>{label}</small></div>)}
      </section>
      <footer className={cx("voucher-footer")}><span>{draft.website}</span><span>{draft.taxId && `Tax ID: ${draft.taxId}`}</span><span>{draft.registrationNo && `Reg: ${draft.registrationNo}`}</span></footer>
    </article>
  );
}

function VoucherPreview({ draft, template, previewRef }) {
  const initials = draft.businessName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const terms = String(draft.voucherTerms || "").split("\n").filter(Boolean);
  return (
    <article ref={previewRef} className={cx("voucher discount-voucher")} style={{ "--primary": template.primary, "--accent": template.accent, "--soft": template.soft }}>
      <header className={cx("discount-hero")}>
        <div className={cx("gift-ribbon")}><i /><b>✦</b></div>
        <div className={cx("discount-copy")}><span>{draft.voucherType}</span><h2>{draft.voucherTitle}</h2><p>{draft.offerDescription}</p></div>
        <div className={cx("voucher-business")}><div className={cx("discount-logo")}>{draft.logo ? <img src={draft.logo} alt="Business logo" /> : initials || "YB"}</div><div><strong>{draft.businessName}</strong><small>{draft.tagline}</small></div></div>
        <div className={cx("discount-badge")}><strong>{draft.discountValue || "0"}%</strong><span>OFF</span></div>
      </header>
      <section className={cx("voucher-detail-panel")}>
        <div className={cx("voucher-code-column")}><small>Voucher Code</small><strong>{draft.voucherCode || "VOUCHER"}</strong><div className={cx("voucher-barcode")} aria-label="Voucher barcode">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ width: index % 5 === 0 ? 4 : index % 2 === 0 ? 2 : 1 }} />)}</div><span>{draft.voucherNo}</span></div>
        <div className={cx("voucher-validity-column")}><div><small>Valid From</small><strong>{draft.date}</strong></div><div><small>Valid Until</small><strong>{draft.validUntil}</strong></div><div><small>Minimum Purchase</small><strong>{money(draft.minimumPurchase, draft.currency)}</strong></div><div><small>Maximum Discount</small><strong>{money(draft.maximumDiscount, draft.currency)}</strong></div><div><small>Usage Limit</small><strong>{draft.usageLimit}</strong></div></div>
        <div className={cx("voucher-terms-column")}><h3>Terms & Conditions</h3>{terms.map((term) => <p key={term}><b>✓</b><span>{term}</span></p>)}</div>
      </section>
      <footer className={cx("discount-footer")}><span>☎ {draft.phone}</span><span>✉ {draft.email}</span><span>◉ {draft.website}</span><span>⌖ {draft.address}</span></footer>
    </article>
  );
}

function VoucherThumbnail({ draft, template }) {
  return <div className={cx("voucher-catalogue-sheet")} style={{ "--thumb-primary": template.primary, "--thumb-accent": template.accent, "--thumb-soft": template.soft }}>
    <header><i>V</i><div><strong>{draft.voucherType || "DISCOUNT VOUCHER"}</strong><small>{draft.businessName || "Your Business Name"}</small></div><b>{draft.discountValue || "0"}%<span>OFF</span></b></header>
    <section><strong>{draft.voucherTitle || "Special Discount"}</strong><small>{draft.offerDescription || "Exclusive savings for valued customers."}</small></section>
    <div className={cx("voucher-thumbnail-details")}><div><small>Voucher Code</small><b>{draft.voucherCode || "VOUCHER"}</b><i /></div><div><small>Valid Until</small><b>{draft.validUntil}</b><small>Minimum Purchase</small><b>{money(draft.minimumPurchase, draft.currency)}</b></div><div><small>TERMS &amp; CONDITIONS</small><span>Applicable on selected products</span><span>One use per customer</span><span>Offer terms apply</span></div></div>
    <footer>{draft.phone}<span>{draft.website}</span></footer>
  </div>;
}

export default function VoucherPage() {
  const dispatch = useDispatch();
  const { matchedBusiness } = useSelector((state) => state.businessListReducer || {});
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const businessDetails = useMemo(() => getBusinessDetails(matchedBusiness || {}, storedUser), [matchedBusiness, storedUser]);
  const [draft, setDraft] = useState(readDraft);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("All");
  const [templateSearch, setTemplateSearch] = useState("");
  const previewRef = useRef(null);
  const previewPanelRef = useRef(null);
  const template = useMemo(() => templates.find((item) => item.id === draft.templateId) || templates[0], [draft.templateId]);
  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((item) => (templateCategory === "All" || item.category === templateCategory) && (!query || `${item.name} ${item.category}`.toLowerCase().includes(query)));
  }, [templateCategory, templateSearch]);
  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
  }, [dispatch, mobileNumber]);

  useEffect(() => {
    if (!businessDetails.businessName) return;
    setDraft((current) => {
      const defaults = defaultDraft();
      const next = { ...current };
      Object.entries(businessDetails).forEach(([field, value]) => {
        if (value && (!current[field] || current[field] === defaults[field])) next[field] = value;
      });
      return next;
    });
  }, [businessDetails]);

  const applyTemplate = (item) => {
    setDraft((current) => ({ ...current, templateId: item.id }));
    setMessage(`${item.name} template applied.`);
    window.requestAnimationFrame(() => {
      previewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const update = (event) => setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please select a valid image file.");
    if (file.size > 2 * 1024 * 1024) return setMessage("Logo must be smaller than 2 MB.");
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, logo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); setMessage("Voucher draft saved on this device."); };
  const reset = () => { setDraft({ ...defaultDraft(), ...Object.fromEntries(Object.entries(businessDetails).filter(([, value]) => value)) }); localStorage.removeItem(STORAGE_KEY); setMessage("Voucher draft reset."); };
  useEffect(() => {
    if (!isFormOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === "Escape" && setIsFormOpen(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFormOpen]);
  const download = async () => {
    if (!previewRef.current) return;
    setDownloading(true); setMessage("");
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      canvas.toBlob((blob) => blob && downloadBlob(blob, `${draft.voucherNo || "voucher"}.png`), "image/png", 1);
      setMessage("Voucher downloaded as a high-resolution PNG.");
    } catch { setMessage("Unable to download the voucher. Please try again."); }
    finally { setDownloading(false); }
  };

  return <div className={cx("page")}>
    <StickySearchBar />
    <main className={cx("main")}>
      <div className={cx("document-back-row")}><BusinessDocumentsNav /></div>
      <div className={cx("workspace")}>
        {isFormOpen && createPortal(<><div className={cx("voucher-modal-backdrop")} onMouseDown={() => setIsFormOpen(false)} aria-hidden="true" /><form className={cx("form-panel voucher-form-modal")} role="dialog" aria-modal="true" aria-labelledby="voucher-form-title" onSubmit={(event) => event.preventDefault()}>
          <header className={cx("voucher-modal-header")}><div><span>Voucher Details</span><h2 id="voucher-form-title">Create or Edit Voucher</h2><p>Enter the offer, validity, branding and redemption details.</p></div><button type="button" onClick={() => setIsFormOpen(false)} aria-label="Close voucher editor"><CloseIcon /></button></header>
          <div className={cx("voucher-modal-content")}>
          <section><h2>Voucher identity</h2><div className={cx("field-grid")}>
            <Field label="Voucher type" name="voucherType" value={draft.voucherType} onChange={update}><select name="voucherType" value={draft.voucherType} onChange={update}><option>Discount Voucher</option><option>Gift Voucher</option><option>Service Voucher</option><option>Promotional Voucher</option></select></Field>
            <Field label="Voucher number" name="voucherNo" value={draft.voucherNo} onChange={update} required />
            <Field label="Voucher date" name="date" type="date" value={draft.date} onChange={update} required />
            <Field label="Valid until" name="validUntil" type="date" value={draft.validUntil} onChange={update} required />
            <Field label="Currency" name="currency" value={draft.currency} onChange={update}><select name="currency" value={draft.currency} onChange={update}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>SGD</option></select></Field>
          </div></section>
          <section><h2>Business & branding</h2><div className={cx("field-grid")}>
            <Field label="Business name" name="businessName" value={draft.businessName} onChange={update} required />
            <Field label="Tagline" name="tagline" value={draft.tagline} onChange={update} />
            <Field label="Business address" name="address" value={draft.address} onChange={update} wide />
            <Field label="Phone" name="phone" value={draft.phone} onChange={update} />
            <Field label="Email" name="email" type="email" value={draft.email} onChange={update} />
            <Field label="Website" name="website" value={draft.website} onChange={update} />
            <Field label="Tax / GST / VAT ID" name="taxId" value={draft.taxId} onChange={update} />
            <Field label="Company registration no." name="registrationNo" value={draft.registrationNo} onChange={update} />
            <label className={cx("upload-field")}><span>Business logo (PNG/JPG, max 2 MB)</span><input type="file" accept="image/*" onChange={uploadLogo} /><i><UploadIcon fontSize="small" /> {draft.logo ? "Change logo" : "Upload logo"}</i></label>
          </div></section>
          <section><h2>Payee / recipient</h2><div className={cx("field-grid")}>
            <Field label="Payee / recipient name" name="payeeName" value={draft.payeeName} onChange={update} required />
            <Field label="Phone" name="payeePhone" value={draft.payeePhone} onChange={update} />
            <Field label="Address" name="payeeAddress" value={draft.payeeAddress} onChange={update} wide />
            <Field label="Payee tax ID" name="payeeTaxId" value={draft.payeeTaxId} onChange={update} />
          </div></section>
          <section><h2>Payment & accounting</h2><div className={cx("field-grid")}>
            <Field label="Amount" name="amount" type="number" value={draft.amount} onChange={update} required />
            <Field label="Amount in words" name="amountWords" value={draft.amountWords} onChange={update} wide />
            <Field label="Payment mode" name="paymentMode" value={draft.paymentMode} onChange={update}><select name="paymentMode" value={draft.paymentMode} onChange={update}><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Card</option><option>UPI / Digital Wallet</option><option>Other</option></select></Field>
            <Field label="Bank name" name="bankName" value={draft.bankName} onChange={update} />
            <Field label="Transaction / cheque ref." name="transactionRef" value={draft.transactionRef} onChange={update} />
            <Field label="Instrument date" name="instrumentDate" type="date" value={draft.instrumentDate} onChange={update} />
            <Field label="Purpose / particulars" name="purpose" value={draft.purpose} onChange={update} wide required />
            <Field label="Account / ledger name" name="accountName" value={draft.accountName} onChange={update} />
            <Field label="Expense category" name="expenseCategory" value={draft.expenseCategory} onChange={update} />
            <Field label="Project / job code" name="projectCode" value={draft.projectCode} onChange={update} />
            <Field label="Cost centre / department" name="costCenter" value={draft.costCenter} onChange={update} />
            <Field label="Invoice / bill reference" name="invoiceRef" value={draft.invoiceRef} onChange={update} />
            <Field label="Narration" name="narration" value={draft.narration} onChange={update} wide />
            <Field label="Notes & declaration" name="notes" value={draft.notes} onChange={update} wide><textarea name="notes" value={draft.notes} onChange={update} rows="3" /></Field>
          </div></section>
          <section><h2>Approval & acknowledgement</h2><div className={cx("field-grid")}>
            <Field label="Prepared by" name="preparedBy" value={draft.preparedBy} onChange={update} /><Field label="Checked by" name="checkedBy" value={draft.checkedBy} onChange={update} /><Field label="Approved by" name="approvedBy" value={draft.approvedBy} onChange={update} /><Field label="Received by" name="receivedBy" value={draft.receivedBy} onChange={update} />
          </div></section>
          <section className={cx("offer-fields")}><h2>Discount offer</h2><div className={cx("field-grid")}>
            <Field label="Voucher title" name="voucherTitle" value={draft.voucherTitle} onChange={update} required />
            <Field label="Voucher code" name="voucherCode" value={draft.voucherCode} onChange={update} required />
            <Field label="Discount percentage" name="discountValue" type="number" value={draft.discountValue} onChange={update} required />
            <Field label="Minimum purchase" name="minimumPurchase" type="number" value={draft.minimumPurchase} onChange={update} />
            <Field label="Maximum discount" name="maximumDiscount" type="number" value={draft.maximumDiscount} onChange={update} />
            <Field label="Usage limit" name="usageLimit" value={draft.usageLimit} onChange={update} />
            <Field label="Applicable products / services" name="applicableTo" value={draft.applicableTo} onChange={update} wide />
            <Field label="Offer description" name="offerDescription" value={draft.offerDescription} onChange={update} wide><textarea name="offerDescription" value={draft.offerDescription} onChange={update} rows="3" /></Field>
            <Field label="Terms & conditions (one per line)" name="voucherTerms" value={draft.voucherTerms} onChange={update} wide><textarea name="voucherTerms" value={draft.voucherTerms} onChange={update} rows="6" /></Field>
          </div></section>
          </div>
          <footer className={cx("voucher-modal-actions")}><button type="button" className={cx("reset-action")} onClick={reset}><RestartAltIcon /> Reset</button><button type="button" onClick={save}><SaveIcon /> Save Draft</button><button type="button" className={cx("primary-action")} onClick={() => { save(); setIsFormOpen(false); }}>Save & View Voucher</button></footer>
        </form></>, document.body)}
        <aside ref={previewPanelRef} className={cx("preview-panel")}>
          <div className={cx("toolbar")}><button type="button" onClick={() => setIsFormOpen(true)}><AddIcon />Edit Details</button><button type="button" onClick={save}><SaveIcon />Save Draft</button><button type="button" onClick={reset}><RestartAltIcon />Reset</button><button type="button" className={cx("download")} onClick={download} disabled={downloading}><DownloadIcon />{downloading ? "Preparing..." : "Download PNG"}</button></div>
          {message && <p className={cx("message")} role="status">{message}</p>}
          <div className={cx("preview-scroll")}><VoucherPreview draft={draft} template={template} previewRef={previewRef} /></div>
        </aside>
      </div>
      <section className={cx("voucher-catalogue")}>
        <div className={cx("voucher-catalogue-title")}><h2>Voucher Templates</h2><p>Choose from 25 professional designs and apply one to the voucher above.</p></div>
        <header className={cx("voucher-catalogue-head")}><nav>{["All", "Modern", "Minimal", "Professional", "Corporate", "Creative", "Elegant", "Classic", "Colorful"].map((category) => <button type="button" key={category} className={cx(templateCategory === category && "category-active")} onClick={() => setTemplateCategory(category)}>{category === "All" ? "All 25" : category}</button>)}</nav><label className={cx("template-search")}><SearchIcon /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates..." /></label></header>
        <div className={cx("voucher-catalogue-grid")}>{filteredTemplates.map((item) => <button type="button" key={item.id} className={cx("voucher-catalogue-card", draft.templateId === item.id && "voucher-catalogue-active")} onClick={() => applyTemplate(item)}><VoucherThumbnail draft={draft} template={item} /><span>{templates.findIndex((entry) => entry.id === item.id) + 1}. {item.name}{item.premium && <b>♛ PRO</b>}</span></button>)}</div>
        {!filteredTemplates.length && <p className={cx("empty-templates")}>No voucher templates match your search.</p>}
      </section>
    </main>
    <Footer />
  </div>;
}
