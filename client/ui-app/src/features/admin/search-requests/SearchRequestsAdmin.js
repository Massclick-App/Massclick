import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Chip, Snackbar } from "@mui/material";
import { CheckCircle2, Clock3, Copy, Mail, MapPin, Phone, RefreshCw, Search, UserRound } from "lucide-react";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import { useDispatch } from "react-redux";
import { getSearchRequests, markSearchRequestRead } from "state/actions/searchRequestAction.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { formatIndianMobile } from "shared/utils/indianMobile.js";
import SendCompletedMessageDialog from "features/admin/search-requests/SendCompletedMessageDialog.js";
import styles from "features/admin/search-requests/SearchRequestsAdmin.module.css";

const cx = createScopedClassNames(styles);
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
const readOptions = [
  { value: "all", label: "All requests" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];
const requestDoneTemplateName = "search_request_completed_v1";
const requestDoneTemplate = [
  "Hello {{1}},",
  "",
  "Your request for \"{{2}}\" services in {{3}} has been completed by Massclick.",
  "",
  "For more details or further assistance, please contact us at {{4}}.",
  "",
  "Thank you,",
  "Massclick",
].join("\n");

export default function SearchRequestsAdmin() {
  const dispatch = useDispatch();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [readingId, setReadingId] = useState("");
  const [toast, setToast] = useState(null);
  // `key` remounts the dialog on every open so it starts from the request's own values.
  const [sendDialog, setSendDialog] = useState({ open: false, request: null, key: 0 });
  const [messageDefaults, setMessageDefaults] = useState({});
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const notify = useCallback((severity, text) => setToast({ key: Date.now(), severity, text, open: true }), []);
  const closeToast = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setToast((current) => current && { ...current, open: false });
  }, []);

  const copyRequestDoneTemplate = useCallback(async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(requestDoneTemplate);
      setCopiedTemplate(true);
      window.setTimeout(() => setCopiedTemplate(false), 1800);
    } catch {
      notify("error", "Template could not be copied. Please select and copy it manually.");
    }
  }, [notify]);

  const load = useCallback(async (page, limit, filters = {}) => {
    setLoading(true);
    try {
      const result = await dispatch(getSearchRequests({
        page,
        limit,
        read: filters.status === "read" ? "true" : filters.status === "unread" ? "false" : "",
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }));
      setRequests(result?.items || []);
      setTotal(result?.total || 0);
      if (result?.completedMessageDefaults) setMessageDefaults(result.completedMessageDefaults);
    } catch (error) {
      notify("error", error.response?.data?.message || "Search requests could not be loaded.");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, notify]);

  const openSendDialog = useCallback((request) => {
    setSendDialog((current) => ({ open: true, request, key: current.key + 1 }));
  }, []);
  const closeSendDialog = useCallback(() => setSendDialog((current) => ({ ...current, open: false })), []);

  const sendCompletedMessage = useCallback(async (values) => {
    const { request } = sendDialog;
    if (!request || request.isRead) return;
    setReadingId(request._id);
    try {
      const updated = await dispatch(markSearchRequestRead(request._id, values));
      setRequests((current) => current.map((item) => item._id === updated._id ? updated : item));
      closeSendDialog();
      notify("success", `Completed message sent to ${values.fullName} on ${formatIndianMobile(values.contactNumber)}.`);
      window.dispatchEvent(new Event("search-requests:changed"));
    } catch (error) {
      // The dialog stays open so the admin can correct the values and retry.
      notify("error", error.response?.data?.message || error.message || "The completed message could not be sent.");
    } finally {
      setReadingId("");
    }
  }, [closeSendDialog, dispatch, notify, sendDialog]);

  const columns = useMemo(() => [
    {
      id: "fullName",
      label: "Customer",
      renderCell: (_, request) => <div className={cx("cell-stack")}><b><UserRound size={14} /> {request.fullName}</b><span><Mail size={13} /> {request.email}</span><span><Phone size={13} /> {request.contactNumber}</span></div>,
    },
    {
      id: "category",
      label: "Search details",
      renderCell: (_, request) => <div className={cx("cell-stack")}><b><Search size={14} /> {request.category}</b><span><MapPin size={13} /> {request.location}</span></div>,
    },
    { id: "details", label: "Requirement", renderCell: (value) => <p className={cx("requirement")}>{value || "—"}</p> },
    { id: "source", label: "Source", renderCell: (value) => <span className={cx("source")}>{String(value || "—").replaceAll("-", " ")}</span> },
    { id: "createdAt", label: "Submitted", renderCell: (value) => <span className={cx("date")}><Clock3 size={14} /> {formatDateTime(value)}</span> },
    { id: "isRead", label: "Message status", renderCell: (value) => <Chip size="small" label={value ? "Sent" : "Pending"} className={cx(value ? "read" : "unread")} /> },
    {
      id: "action",
      label: "Action",
      renderCell: (_, request) => request.isRead ? (
        <span className={cx("completed")}><CheckCircle2 size={16} /> Message sent</span>
      ) : (
        <Button size="small" variant="contained" startIcon={<CheckCircle2 size={15} />} disabled={readingId === request._id} onClick={() => openSendDialog(request)}>
          {readingId === request._id ? "Sending..." : "Send completed message"}
        </Button>
      ),
    },
  ], [openSendDialog, readingId]);

  return <main className={cx("page")}>
    <header>
      <div><span><Search size={16} /> CUSTOMER SEARCH OPERATIONS</span><h1>Search requests</h1><p>Send the completed WhatsApp message after a customer request has been handled.</p></div>
      <Button startIcon={<RefreshCw size={17} />} onClick={() => setRefreshKey((value) => value + 1)}>Refresh</Button>
    </header>
    <section className={cx("template-panel")} aria-label="MSG91 request completed template">
      <div className={cx("template-meta")}>
        <span className={cx("template-eyebrow")}>MSG91 TEMPLATE</span>
        <h2 className={cx("template-title")}>Request completed</h2>
        <p className={cx("template-name")}>Name: {requestDoneTemplateName}</p>
      </div>
      <textarea className={cx("template-copy")} value={requestDoneTemplate} readOnly aria-label="Request completed MSG91 template" />
      <Button className={cx("template-action")} variant="outlined" startIcon={<Copy size={16} />} onClick={copyRequestDoneTemplate}>
        {copiedTemplate ? "Copied" : "Copy template"}
      </Button>
    </section>
    <section className={cx("table")}>
      <CustomizedTable
        title="Customer search request history"
        columns={columns}
        data={requests}
        total={total}
        fetchData={load}
        loading={loading}
        initialStatusFilter="all"
        statusOptions={readOptions}
        searchPlaceholder="Search customer, contact, category, location or requirement"
        refreshKey={refreshKey}
        renderEmpty={() => <div className={cx("empty")}><Search size={30} /><b>No search requests found</b><span>Requests matching your search and read filter will appear here.</span></div>}
      />
    </section>
    {sendDialog.request && (
      <SendCompletedMessageDialog
        key={sendDialog.key}
        open={sendDialog.open}
        request={sendDialog.request}
        defaults={messageDefaults}
        template={requestDoneTemplate}
        sending={readingId === sendDialog.request._id}
        onClose={closeSendDialog}
        onSend={sendCompletedMessage}
      />
    )}
    {/* Errors stay until dismissed so a failed send can't vanish before it is read. */}
    <Snackbar
      key={toast?.key}
      open={Boolean(toast?.open)}
      autoHideDuration={toast?.severity === "error" ? null : 5000}
      onClose={closeToast}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={toast?.severity || "info"} variant="filled" onClose={closeToast}>{toast?.text}</Alert>
    </Snackbar>
  </main>;
}
