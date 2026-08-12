import { useCallback, useMemo, useState } from "react";
import { Button, Chip } from "@mui/material";
import { CheckCircle2, Clock3, Copy, Mail, MapPin, Phone, RefreshCw, Search, UserRound } from "lucide-react";
import CustomizedTable from "../../components/Table/CustomizedTable";
import { useDispatch } from "react-redux";
import { getSearchRequests, markSearchRequestRead } from "../../redux/actions/searchRequestAction.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./SearchRequestsAdmin.module.css";

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
  const [message, setMessage] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const copyRequestDoneTemplate = useCallback(async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(requestDoneTemplate);
      setCopiedTemplate(true);
      window.setTimeout(() => setCopiedTemplate(false), 1800);
    } catch {
      setMessage("Template could not be copied. Please select and copy it manually.");
    }
  }, []);

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
    } catch (error) {
      setMessage(error.response?.data?.message || "Search requests could not be loaded.");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const markRead = useCallback(async (request) => {
    if (request.isRead) return;
    setReadingId(request._id);
    setMessage("");
    try {
      const updated = await dispatch(markSearchRequestRead(request._id));
      setRequests((current) => current.map((item) => item._id === updated._id ? updated : item));
      setMessage(`${request.fullName}'s request was marked as read.`);
      window.dispatchEvent(new Event("search-requests:changed"));
    } catch (error) {
      setMessage(error.response?.data?.message || "The request could not be marked as read.");
    } finally {
      setReadingId("");
    }
  }, [dispatch]);

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
    { id: "isRead", label: "Read status", renderCell: (value) => <Chip size="small" label={value ? "Read" : "Unread"} className={cx(value ? "read" : "unread")} /> },
    {
      id: "action",
      label: "Action",
      renderCell: (_, request) => request.isRead ? (
        <span className={cx("completed")}><CheckCircle2 size={16} /> Read</span>
      ) : (
        <Button size="small" variant="contained" startIcon={<CheckCircle2 size={15} />} disabled={readingId === request._id} onClick={() => markRead(request)}>
          {readingId === request._id ? "Saving…" : "Mark as read"}
        </Button>
      ),
    },
  ], [markRead, readingId]);

  return <main className={cx("page")}>
    <header>
      <div><span><Search size={16} /> CUSTOMER SEARCH OPERATIONS</span><h1>Search requests</h1><p>View every no-results request and mark it as read after it has been reviewed.</p></div>
      <Button startIcon={<RefreshCw size={17} />} onClick={() => setRefreshKey((value) => value + 1)}>Refresh</Button>
    </header>
    {message && <div className={cx("message")} role="status">{message}</div>}
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
  </main>;
}
