import { useCallback, useMemo, useState } from "react";
import { Button, Chip } from "@mui/material";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  FileQuestion,
  PauseCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import CustomizedTable from "../../components/Table/CustomizedTable";
import { fetchRewardClaims, reviewRewardClaim } from "../../services/rewardService";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./RewardClaimsAdmin.module.css";

const cx = createScopedClassNames(styles);
const statuses = {
  pending: "Pending",
  approved: "Accepted",
  rejected: "Rejected",
  needs_information: "Hold",
};
const statusOptions = [
  { value: "all", label: "All claims" },
  { value: "pending", label: "Pending" },
  { value: "needs_information", label: "Hold" },
  { value: "approved", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";

export default function RewardClaimsAdmin() {
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async (page, limit, filters = {}) => {
    setLoading(true);
    try {
      const result = await fetchRewardClaims({
        page,
        limit,
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      setClaims(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      setMessage(error.response?.data?.message || "Claims could not be loaded.");
      setClaims([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const decide = useCallback(async (claim, status) => {
    let rejectionReason = "";
    if (status === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this claim:") || "";
      if (!rejectionReason.trim()) return;
    }
    if (status === "needs_information") {
      rejectionReason = window.prompt("What information is required from the customer?") || "";
      if (!rejectionReason.trim()) return;
    }
    try {
      await reviewRewardClaim(claim._id, { status, rejectionReason });
      window.dispatchEvent(new Event("reward-claims:changed"));
      setMessage(
        status === "approved"
          ? `${claim.projectedPoints} points credited for ${claim.claimNumber}.`
          : `${claim.claimNumber} moved to ${statuses[status]}.`
      );
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Claim could not be updated.");
    }
  }, []);

  const columns = useMemo(() => [
    {
      id: "claimNumber",
      label: "Claim reference",
      renderCell: (_, claim) => <div className={cx("cell-stack")}><b>{claim.claimNumber}</b><span><Clock3 size={13} /> {formatDateTime(claim.createdAt)}</span></div>,
    },
    {
      id: "businessName",
      label: "Customer & selected business",
      renderCell: (_, claim) => <div className={cx("cell-stack")}><b>{claim.businessName}</b><span>{claim.categoryName} · {claim.locationName || "—"}</span><span>{claim.customerName || "Customer"} · {claim.customerKey}</span></div>,
    },
    {
      id: "transactionAmount",
      label: "Purchase details",
      renderCell: (_, claim) => <div className={cx("cell-stack")}><b>₹{Number(claim.transactionAmount || 0).toLocaleString("en-IN")}</b><span>{String(claim.paymentMethod || "—").replaceAll("_", " ")} · {formatDate(claim.transactionAt)}</span>{claim.invoiceNumber && <span><ReceiptText size={13} /> {claim.invoiceNumber}</span>}</div>,
    },
    {
      id: "projectedPoints",
      label: "Points",
      renderCell: (_, claim) => <strong className={cx("points")}><BadgeIndianRupee size={15} />{claim.status === "approved" ? claim.awardedPoints : claim.projectedPoints} pts</strong>,
    },
    {
      id: "status",
      label: "Status",
      renderCell: (_, claim) => <Chip size="small" label={statuses[claim.status] || claim.status} className={cx(`status status-${claim.status}`)} />,
    },
    {
      id: "reviewedAt",
      label: "Review details",
      renderCell: (_, claim) => claim.status === "pending" || claim.status === "needs_information" ? (
        <div className={cx("actions")}>
          <Button size="small" color="success" startIcon={<CheckCircle2 size={15} />} onClick={() => decide(claim, "approved")}>Accept</Button>
          <Button size="small" color="warning" startIcon={<PauseCircle size={15} />} onClick={() => decide(claim, "needs_information")}>Hold</Button>
          <Button size="small" color="error" startIcon={<XCircle size={15} />} onClick={() => decide(claim, "rejected")}>Reject</Button>
        </div>
      ) : <div className={cx("cell-stack review-copy")}><b>{claim.awardedPoints ? `${claim.awardedPoints} points credited` : claim.rejectionReason || "Reviewed"}</b><span>{formatDateTime(claim.reviewedAt)}{claim.reviewedBy ? ` · ${claim.reviewedBy}` : ""}</span></div>,
    },
  ], [decide]);

  return <main className={cx("page")}>
    <header>
      <div><span><ShieldCheck size={16} /> REWARD OPERATIONS</span><h1>Customer reward claims</h1><p>Review every transaction in one place. Accepted, rejected and held claims remain available as a complete audit history.</p></div>
      <Button startIcon={<RefreshCw size={17} />} onClick={() => setRefreshKey((value) => value + 1)}>Refresh</Button>
    </header>
    {message && <div className={cx("message")} role="status">{message}</div>}
    <section className={cx("claims-table")}>
      <CustomizedTable
        title="Transaction claim history"
        columns={columns}
        data={claims}
        total={total}
        fetchData={load}
        loading={loading}
        initialStatusFilter="all"
        statusOptions={statusOptions}
        searchPlaceholder="Search claim, customer, business or invoice"
        refreshKey={refreshKey}
        renderEmpty={() => <div className={cx("empty")}><FileQuestion size={30} /><b>No claims found</b><span>Claims matching the selected status and search will appear here.</span></div>}
      />
    </section>
  </main>;
}
