import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useDispatch, useSelector } from "react-redux";
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
import {
  MASSCLICK_PRODUCT_ITEM,
  MASSCLICK_GST_RATE,
  DEFAULT_TERMS,
  DEFAULT_NOTES,
  DEFAULT_QUOTATION_NAME,
  paymentMethodOptions,
  normalizeFormItems,
  money,
  formatDate,
  calculateTotals,
  paymentStatusLabel,
  paymentMethodLabel,
} from "./quotationUtils";
import { buildQrTarget, generateQuotationPdf } from "./pdfExport";
import { QuotationPdfPage1, QuotationPdfPage2 } from "./QuotationPdfDocument";

const cx = createScopedClassNames(styles);

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const durationOptions = Array.from({ length: 24 }, (_, index) => index + 1);
const videoCountOptions = Array.from({ length: 20 }, (_, index) => index + 1);

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

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

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

const PDF_PAGE_WIDTH = 1050;
const PDF_PAGE_HEIGHT = 1485;

function ScaledPdfPage({ children }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return undefined;
    const updateScale = () => setScale(element.clientWidth / PDF_PAGE_WIDTH);
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        overflow: "hidden",
        height: scale ? PDF_PAGE_HEIGHT * scale : "auto",
      }}
    >
      <div
        style={{
          width: PDF_PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

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
  const paymentProgress = totals.total > 0
    ? Math.min(100, Math.round((totals.advancePayment / totals.total) * 100))
    : 0;

  const [previewQr, setPreviewQr] = useState({ src: "", caption: "" });
  useEffect(() => {
    let isActive = true;
    const target = buildQrTarget(preview);
    QRCode.toDataURL(target.url, {
      margin: 1,
      width: 300,
      color: { dark: "#0b1f3f", light: "#ffffff" },
    })
      .then((src) => {
        if (isActive) setPreviewQr({ src, caption: target.caption });
      })
      .catch(() => {
        if (isActive) setPreviewQr({ src: "", caption: target.caption });
      });
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.businessPhone, preview.quotationNo]);

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
      const pdf = await generateQuotationPdf({
        ...savedQuotation,
        discount: 0,
        items: normalizeFormItems(savedQuotation.items),
      });
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
      const pdf = await generateQuotationPdf({
        ...quotation,
        quotationName: DEFAULT_QUOTATION_NAME,
        notes: DEFAULT_NOTES,
        terms: DEFAULT_TERMS,
        discount: 0,
        items: normalizeFormItems(quotation.items),
      });
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
            <ScaledPdfPage>
              <QuotationPdfPage1
                quotation={preview}
                logoSrc={massclickLogo}
                signatureSrc={authorizedSignature}
                qrSrc={previewQr.src}
                qrCaption={previewQr.caption}
              />
            </ScaledPdfPage>
            <div style={{ height: 24 }} />
            <ScaledPdfPage>
              <QuotationPdfPage2 quotation={preview} logoSrc={massclickLogo} />
            </ScaledPdfPage>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
