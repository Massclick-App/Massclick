import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useMemo, useRef, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import html2canvas from "html2canvas";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import styles from "./VoucherPage.module.css";

const cx = createScopedClassNames(styles);
const STORAGE_KEY = "massclick_voucher_draft_v1";

const templates = [
  { id: "corporate", name: "Corporate Blue", primary: "#12356b", accent: "#2f6feb", soft: "#eef4ff" },
  { id: "classic", name: "Classic Emerald", primary: "#064e3b", accent: "#0f9f6e", soft: "#ecfdf5" },
  { id: "premium", name: "Premium Charcoal", primary: "#18181b", accent: "#c49336", soft: "#fffbeb" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const defaultDraft = () => ({
  voucherType: "Payment Voucher",
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
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

function VoucherPreview({ draft, template, previewRef }) {
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

export default function VoucherPage() {
  const [draft, setDraft] = useState(readDraft);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);
  const template = useMemo(() => templates.find((item) => item.id === draft.templateId) || templates[0], [draft.templateId]);
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
  const reset = () => { setDraft(defaultDraft()); localStorage.removeItem(STORAGE_KEY); setMessage("Voucher draft reset."); };
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
      <BusinessDocumentsNav />
      <header className={cx("hero")}><span>FINANCE DOCUMENT</span><h1>Professional Voucher Builder</h1><p>Complete the essential accounting, payment and approval fields, add your logo, then choose one of three international-ready designs.</p></header>
      <div className={cx("workspace")}>
        <form className={cx("form-panel")} onSubmit={(event) => event.preventDefault()}>
          <section><h2>Voucher identity</h2><div className={cx("field-grid")}>
            <Field label="Voucher type" name="voucherType" value={draft.voucherType} onChange={update}><select name="voucherType" value={draft.voucherType} onChange={update}><option>Payment Voucher</option><option>Receipt Voucher</option><option>Cash Voucher</option><option>Bank Voucher</option><option>Journal Voucher</option><option>Expense Voucher</option></select></Field>
            <Field label="Voucher number" name="voucherNo" value={draft.voucherNo} onChange={update} required />
            <Field label="Voucher date" name="date" type="date" value={draft.date} onChange={update} required />
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
        </form>
        <aside className={cx("preview-panel")}>
          <div className={cx("toolbar")}><button type="button" onClick={save}><SaveIcon />Save Draft</button><button type="button" onClick={reset}><RestartAltIcon />Reset</button><button type="button" className={cx("download")} onClick={download} disabled={downloading}><DownloadIcon />{downloading ? "Preparing..." : "Download PNG"}</button></div>
          {message && <p className={cx("message")} role="status">{message}</p>}
          <div className={cx("preview-scroll")}><VoucherPreview draft={draft} template={template} previewRef={previewRef} /></div>
          <section className={cx("designs")}><div><span>3 DESIGNS</span><h2>Choose Voucher Style</h2></div><div className={cx("design-grid")}>{templates.map((item) => <button type="button" key={item.id} className={cx(draft.templateId === item.id ? "design-active" : "design-card")} onClick={() => setDraft((current) => ({ ...current, templateId: item.id }))}><i style={{ background: `linear-gradient(135deg, ${item.primary} 65%, ${item.accent} 65%)` }} /><strong>{item.name}</strong><span>{draft.templateId === item.id ? "Selected" : "Select design"}</span></button>)}</div></section>
        </aside>
      </div>
    </main>
    <Footer />
  </div>;
}
