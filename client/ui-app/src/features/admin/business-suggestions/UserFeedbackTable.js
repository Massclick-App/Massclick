import { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { MenuItem, TextField } from "@mui/material";
import { Clock3, UserRound } from "lucide-react";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { getUserFeedback, updateUserFeedbackStatus } from "state/actions/userFeedbackAction.js";
import styles from "features/admin/business-suggestions/UserFeedbackTable.module.css";

const cx = createScopedClassNames(styles);
const STATUSES = ["new", "reviewing", "resolved", "archived"];
const statusOptions = [{ value: "all", label: "All" }, ...STATUSES.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))];
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";

// Ownership claims and general feedback (user_feedbacks). The admin API existed
// but nothing in the dashboard read it, so these were never seen.
export default function UserFeedbackTable({ onError }) {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (page, limit, filters = {}) => {
    setLoading(true);
    try {
      const result = await dispatch(getUserFeedback({
        pageNo: page, pageSize: limit, search: filters.search || "",
        status: filters.status === "all" ? "" : filters.status,
      }));
      setRows(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      onError(error.response?.data?.message || "Feedback could not be loaded.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, onError]);

  const changeStatus = useCallback(async (row, status) => {
    try {
      const updated = await dispatch(updateUserFeedbackStatus(row._id, { status }));
      setRows((current) => current.map((item) => item._id === row._id ? { ...item, ...updated } : item));
    } catch (error) {
      onError(error.response?.data?.message || "Status could not be updated.");
    }
  }, [dispatch, onError]);

  const columns = useMemo(() => [
    { id: "feedbackType", label: "Type", sortable: false, renderCell: (value, row) => <div className={cx("stack")}><b>{value}</b><span>{row.improvementArea}</span></div> },
    { id: "message", label: "Message", sortable: false, renderCell: (value, row) => <div className={cx("stack", "message")}><p>{value}</p>{row.journey && <span>{row.journey}</span>}</div> },
    { id: "userName", label: "From", sortable: false, renderCell: (value, row) => <div className={cx("stack")}><b><UserRound size={13} /> {value || "—"}</b><span>{row.userEmail}</span><span><Clock3 size={12} /> {formatDateTime(row.createdAt)}</span></div> },
    {
      id: "status", label: "Status", sortable: false,
      renderCell: (value, row) => <TextField select size="small" value={value} onChange={(e) => changeStatus(row, e.target.value)} className={cx("status")}>
        {STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
      </TextField>,
    },
  ], [changeStatus]);

  return <CustomizedTable
    title="Claims & feedback"
    columns={columns}
    data={rows}
    total={total}
    fetchData={load}
    loading={loading}
    initialStatusFilter="new"
    statusOptions={statusOptions}
    searchPlaceholder="Search type, message, name or email"
    renderEmpty={() => <div className={cx("empty")}><b>No feedback here</b></div>}
  />;
}
