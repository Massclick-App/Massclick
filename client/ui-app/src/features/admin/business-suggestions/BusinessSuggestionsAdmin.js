import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Button, Chip, MenuItem, Snackbar, TextField } from "@mui/material";
import { Clock3, ExternalLink, MessageSquareText, RefreshCw, UserRound } from "lucide-react";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { buildBusinessPath } from "shared/utils/searchResultNavigation.js";
import { fetchBusinessSuggestions } from "state/actions/businessSuggestionAction.js";
import SuggestionReviewDialog, { FIELD_LABELS } from "features/admin/business-suggestions/SuggestionReviewDialog.js";
import UserFeedbackTable from "features/admin/business-suggestions/UserFeedbackTable.js";
import styles from "features/admin/business-suggestions/BusinessSuggestionsAdmin.module.css";

const cx = createScopedClassNames(styles);

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
const publicPath = (item) => buildBusinessPath({ location: item.location || "business", businessName: item.businessName, id: item.businessId });

export default function BusinessSuggestionsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewing, setReviewing] = useState(null);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("suggestions");
  const showFeedbackError = useCallback((text) => setToast({ severity: "error", text }), []);
  const fieldRef = useRef(field);

  const changeField = (value) => {
    fieldRef.current = value;
    setField(value);
    setRefreshKey((key) => key + 1);
  };

  const load = useCallback(async (page, limit, filters = {}) => {
    setLoading(true);
    try {
      const result = await fetchBusinessSuggestions({
        page, limit,
        status: filters.status === "all" ? "" : filters.status,
        field: fieldRef.current,
        search: filters.search,
      });
      setItems(result.items || []);
      setTotal(result.total || 0);
      setPendingCount(result.pendingCount || 0);
    } catch (error) {
      setToast({ severity: "error", text: error.response?.data?.message || "Suggestions could not be loaded." });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const onReviewed = (updated, mode) => {
    setReviewing(null);
    setToast({ severity: "success", text: mode === "approve" ? `Approved. ${updated.appliedFields?.length ? "The listing was updated." : "Suggestion closed."}` : "Suggestion rejected." });
    setRefreshKey((key) => key + 1);
  };

  const columns = useMemo(() => [
    {
      id: "businessName", label: "Business", sortable: false,
      renderCell: (_, item) => <div className={cx("cell-stack")}>
        <b>{item.businessName || "—"}</b>
        <span>{item.businessCategory}</span>
        {item.businessExists
          ? <a href={publicPath(item)} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> View listing</a>
          : <span className={cx("gone")}>Listing deleted</span>}
      </div>,
    },
    { id: "field", label: "Field", sortable: false, renderCell: (value) => <Chip size="small" label={FIELD_LABELS[value] || value} className={cx("field-chip")} /> },
    {
      id: "suggestedValue", label: "Current → Suggested", sortable: false,
      renderCell: (_, item) => <div className={cx("value-pair")}>
        <span className={cx("value-old")}>{item.liveValue || "Empty"}</span>
        <span className={cx("value-new")}>{item.suggestedValue}</span>
        {item.note && <em>&ldquo;{item.note}&rdquo;</em>}
      </div>,
    },
    {
      id: "userName", label: "Suggested by", sortable: false,
      renderCell: (_, item) => <div className={cx("cell-stack")}>
        <b><UserRound size={13} /> {item.userName || "Customer"}</b>
        <span>{item.userMobile}</span>
        <span><Clock3 size={12} /> {formatDateTime(item.createdAt)}</span>
      </div>,
    },
    {
      id: "status", label: "Status", sortable: false,
      renderCell: (value, item) => <div className={cx("cell-stack")}>
        <Chip size="small" label={value} className={cx(`status-${value}`)} />
        {item.reviewedByName && <span>by {item.reviewedByName}</span>}
        {item.rejectReason && <span>{item.rejectReason}</span>}
      </div>,
    },
    {
      id: "action", label: "Action", sortable: false,
      renderCell: (_, item) => item.status === "pending" && item.businessExists
        ? <Button size="small" variant="contained" onClick={() => setReviewing(item)}>Review</Button>
        : <span className={cx("muted")}>—</span>,
    },
  ], []);

  return <main className={cx("page")}>
    <header className={cx("header")}>
      <div>
        <span className={cx("eyebrow")}><MessageSquareText size={16} /> CUSTOMER CORRECTIONS</span>
        <h1>Listing suggestions</h1>
        <p>Customers suggest corrections from the business page. Approving a phone, WhatsApp, email or website suggestion updates the listing.</p>
      </div>
      <div className={cx("header-side")}>
        <div className={cx("pending-count")}><b>{pendingCount}</b><span>pending</span></div>
        <Button startIcon={<RefreshCw size={17} />} onClick={() => setRefreshKey((key) => key + 1)}>Refresh</Button>
      </div>
    </header>
    <nav className={cx("tabs")} aria-label="Suggestion views">
      <button type="button" className={cx("tab", tab === "suggestions" && "tab-active")} onClick={() => setTab("suggestions")}>Listing suggestions</button>
      <button type="button" className={cx("tab", tab === "feedback" && "tab-active")} onClick={() => setTab("feedback")}>Claims &amp; feedback</button>
    </nav>
    {tab === "suggestions" ? <>
      <section className={cx("filters")}>
        <TextField select size="small" label="Field" value={field} onChange={(e) => changeField(e.target.value)} className={cx("field-filter")}>
          <MenuItem value="">All fields</MenuItem>
          {Object.entries(FIELD_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
        </TextField>
      </section>
      <section className={cx("table")}>
        <CustomizedTable
          title="Suggestions"
          columns={columns}
          data={items}
          total={total}
          fetchData={load}
          loading={loading}
          initialStatusFilter="pending"
          statusOptions={statusOptions}
          searchPlaceholder="Search business, value, customer or note"
          refreshKey={refreshKey}
          renderEmpty={() => <div className={cx("empty")}><MessageSquareText size={30} /><b>No suggestions here</b><span>Customer corrections matching these filters will appear here.</span></div>}
        />
      </section>
    </> : <section className={cx("table")}><UserFeedbackTable onError={showFeedbackError} /></section>}
    {reviewing && <SuggestionReviewDialog key={reviewing._id} suggestion={reviewing} onClose={() => setReviewing(null)} onReviewed={onReviewed} />}
    <Snackbar open={Boolean(toast)} autoHideDuration={toast?.severity === "error" ? null : 5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert severity={toast?.severity || "info"} variant="filled" onClose={() => setToast(null)}>{toast?.text}</Alert>
    </Snackbar>
  </main>;
}
