import { useCallback, useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileQuestion,
  FileText,
  MapPin,
  PauseCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
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
const reviewerLabel = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim()) ? "Administrator" : value || "Not reviewed";

export default function RewardClaimsAdmin() {
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewDialog, setReviewDialog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [reviewing, setReviewing] = useState(false);

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

  const openReview = useCallback((claim, status) => {
    setReviewDialog({ claim, status, reason: "" });
  }, []);

  const decide = async () => {
    if (!reviewDialog) return;
    const { claim, status, reason } = reviewDialog;
    const requiresReason = status === "rejected" || status === "needs_information";
    if (requiresReason && !reason.trim()) return;
    setReviewing(true);
    try {
      await reviewRewardClaim(claim._id, { status, rejectionReason: reason.trim() });
      window.dispatchEvent(new Event("reward-claims:changed"));
      setMessage(
        status === "approved"
          ? `${claim.projectedPoints} points credited for ${claim.claimNumber}.`
          : `${claim.claimNumber} moved to ${statuses[status]}.`
      );
      setReviewDialog(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error.response?.data?.message || "Claim could not be updated.");
    } finally {
      setReviewing(false);
    }
  };

  const columns = useMemo(() => [
    {
      id: "view",
      label: "View",
      renderCell: (_, claim) => <Button className={cx("view-action")} size="small" variant="outlined" startIcon={<Eye size={15} />} onClick={() => setDetailDialog(claim)}>View</Button>,
    },
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
          <Button size="small" color="success" startIcon={<CheckCircle2 size={15} />} onClick={() => openReview(claim, "approved")}>Accept</Button>
          <Button size="small" color="warning" startIcon={<PauseCircle size={15} />} onClick={() => openReview(claim, "needs_information")}>Hold</Button>
          <Button size="small" color="error" startIcon={<XCircle size={15} />} onClick={() => openReview(claim, "rejected")}>Reject</Button>
        </div>
      ) : <div className={cx("cell-stack review-copy")}><b>{claim.awardedPoints ? `${claim.awardedPoints} points credited` : claim.rejectionReason || "Reviewed"}</b><span>{formatDateTime(claim.reviewedAt)}{claim.reviewedBy ? ` · ${reviewerLabel(claim.reviewedBy)}` : ""}</span></div>,
    },
  ], [openReview]);

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
    <Dialog open={Boolean(detailDialog)} onClose={() => setDetailDialog(null)} maxWidth="md" fullWidth PaperProps={{ className: cx("detail-dialog") }}>
      <DialogTitle className={cx("detail-dialog-title")}>
        <div><span><ShieldCheck size={15} /> VERIFIED CLAIM RECORD</span><h2>Transaction claim details</h2><p>Complete customer submission and administrative audit information.</p></div>
        <Button onClick={() => setDetailDialog(null)} aria-label="Close claim details">Close</Button>
      </DialogTitle>
      <DialogContent className={cx("detail-dialog-content")}>
        <div className={cx("detail-reference")}><div><small>Claim reference</small><strong>{detailDialog?.claimNumber}</strong><span>{formatDateTime(detailDialog?.createdAt)}</span></div><Chip size="small" label={statuses[detailDialog?.status] || detailDialog?.status} className={cx(`status status-${detailDialog?.status}`)} /></div>
        <section className={cx("detail-section")}><div className={cx("detail-section-title")}><UserRound size={18} /><div><h3>Customer and business</h3><p>Who submitted the claim and where the purchase occurred.</p></div></div><div className={cx("detail-grid")}><div><small>Customer name</small><strong>{detailDialog?.customerName || "Customer"}</strong></div><div><small>Customer mobile / ID</small><strong>{detailDialog?.customerKey || "—"}</strong></div><div><small>Business</small><strong><Store size={15} /> {detailDialog?.businessName || "—"}</strong></div><div><small>Category and location</small><strong><MapPin size={15} /> {detailDialog?.categoryName || "—"} · {detailDialog?.locationName || "—"}</strong></div></div></section>
        <section className={cx("detail-section")}><div className={cx("detail-section-title")}><ReceiptText size={18} /><div><h3>Purchase information</h3><p>The transaction information supplied by the customer.</p></div></div><div className={cx("detail-grid")}><div><small>Amount paid</small><strong>₹{Number(detailDialog?.transactionAmount || 0).toLocaleString("en-IN")}</strong></div><div><small>Transaction date</small><strong>{formatDateTime(detailDialog?.transactionAt)}</strong></div><div><small>Payment method</small><strong><CreditCard size={15} /> {String(detailDialog?.paymentMethod || "—").replaceAll("_", " ")}</strong></div><div><small>Invoice / receipt number</small><strong>{detailDialog?.invoiceNumber || "Not provided"}</strong></div><div className={cx("detail-wide")}><small>Additional details</small><p>{detailDialog?.notes || "No additional details were provided."}</p></div></div></section>
        <section className={cx("detail-section")}><div className={cx("detail-section-title")}><FileText size={18} /><div><h3>Supporting evidence</h3><p>Bills, receipts or payment proof uploaded with this claim.</p></div></div>{detailDialog?.evidenceFiles?.length ? <div className={cx("detail-evidence-grid")}>{detailDialog.evidenceFiles.map((file, index) => <button type="button" key={file.key || index} onClick={() => setEvidencePreview(file)} aria-label={`Preview ${file.fileName || `evidence ${index + 1}`}`}><FileText size={19} /><span><b>{file.fileName || `Evidence ${index + 1}`}</b><small>{file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Open secure preview"}</small></span><Eye size={16} /></button>)}</div> : <div className={cx("detail-empty")}><FileQuestion size={21} /><span>No supporting files were uploaded.</span></div>}</section>
        <section className={cx("detail-section")}><div className={cx("detail-section-title")}><ShieldCheck size={18} /><div><h3>Points and review audit</h3><p>Expected award and the latest administrative decision.</p></div></div><div className={cx("detail-grid")}><div><small>Expected points</small><strong>{Number(detailDialog?.projectedPoints || 0).toLocaleString("en-IN")} pts</strong></div><div><small>Awarded points</small><strong>{Number(detailDialog?.awardedPoints || 0).toLocaleString("en-IN")} pts</strong></div><div><small>Reviewed by</small><strong>{reviewerLabel(detailDialog?.reviewedBy)}</strong></div><div><small>Reviewed at</small><strong>{formatDateTime(detailDialog?.reviewedAt)}</strong></div>{detailDialog?.rejectionReason && <div className={cx("detail-wide")}><small>Decision notes</small><p>{detailDialog.rejectionReason}</p></div>}</div></section>
      </DialogContent>
      <DialogActions className={cx("detail-dialog-actions")}><Button onClick={() => setDetailDialog(null)}>Close</Button>{(detailDialog?.status === "pending" || detailDialog?.status === "needs_information") && <Button variant="contained" onClick={() => { const claim = detailDialog; setDetailDialog(null); openReview(claim, "approved"); }} startIcon={<CheckCircle2 size={16} />}>Review claim</Button>}</DialogActions>
    </Dialog>
    <Dialog open={Boolean(evidencePreview)} onClose={() => setEvidencePreview(null)} maxWidth="lg" fullWidth PaperProps={{ className: cx("preview-dialog") }}>
      <DialogTitle className={cx("preview-dialog-title")}><div><span>EVIDENCE PREVIEW</span><h2>{evidencePreview?.fileName || "Supporting evidence"}</h2></div><Button onClick={() => setEvidencePreview(null)}>Close</Button></DialogTitle>
      <DialogContent className={cx("preview-dialog-content")}>
        {evidencePreview?.fileType === "application/pdf" || evidencePreview?.key?.toLowerCase().endsWith(".pdf") ? <iframe title={evidencePreview?.fileName || "PDF evidence"} src={evidencePreview?.url} /> : <img src={evidencePreview?.url} alt={evidencePreview?.fileName || "Claim evidence"} />}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(reviewDialog)} onClose={() => !reviewing && setReviewDialog(null)} maxWidth="sm" fullWidth PaperProps={{ className: cx("review-dialog") }}>
      <DialogTitle className={cx("review-dialog-title")}>
        <span className={cx(`decision-icon decision-${reviewDialog?.status}`)}>{reviewDialog?.status === "approved" ? <CheckCircle2 /> : reviewDialog?.status === "rejected" ? <XCircle /> : <PauseCircle />}</span>
        <div><small>CLAIM DECISION</small><h2>{reviewDialog?.status === "approved" ? "Accept and credit points" : reviewDialog?.status === "rejected" ? "Reject this claim" : "Place claim on hold"}</h2><p>{reviewDialog?.status === "approved" ? "Confirm the transaction and release points to the customer wallet." : reviewDialog?.status === "rejected" ? "Record a clear reason so this decision remains auditable." : "Explain what information the customer must provide before review continues."}</p></div>
      </DialogTitle>
      <DialogContent className={cx("review-dialog-content")}>
        <section className={cx("evidence-review")}>
          <div><FileText size={18} /><span><b>Supporting evidence</b><small>{reviewDialog?.claim.evidenceFiles?.length ? `${reviewDialog.claim.evidenceFiles.length} file(s) uploaded by the customer` : "No bill or payment proof was uploaded"}</small></span></div>
          {reviewDialog?.claim.evidenceFiles?.length > 0 && <div className={cx("evidence-links")}>{reviewDialog.claim.evidenceFiles.map((file, index) => <a key={file.key || index} href={file.url} target="_blank" rel="noreferrer"><FileText size={15} /><span>{file.fileName || `Evidence ${index + 1}`}</span></a>)}</div>}
        </section>
        <section className={cx("claim-summary")}>
          <div><span>Claim reference</span><strong>{reviewDialog?.claim.claimNumber}</strong></div>
          <div><span>Customer</span><strong>{reviewDialog?.claim.customerName || reviewDialog?.claim.customerKey}</strong></div>
          <div><span>Business</span><strong>{reviewDialog?.claim.businessName}</strong></div>
          <div><span>Points</span><strong>{formatDate(reviewDialog?.claim.transactionAt)} · {Number(reviewDialog?.claim.projectedPoints || 0).toLocaleString("en-IN")} pts</strong></div>
        </section>
        {reviewDialog?.status === "approved" ? <div className={cx("decision-notice success-notice")}><ShieldCheck size={19} /><span><b>This action credits points immediately.</b> The wallet transaction is protected against duplicate awards.</span></div> : <TextField autoFocus fullWidth multiline minRows={3} label={reviewDialog?.status === "rejected" ? "Rejection reason" : "Information required"} placeholder={reviewDialog?.status === "rejected" ? "Explain why this transaction cannot be approved" : "Example: Please upload a readable invoice showing the business name and date"} value={reviewDialog?.reason || ""} onChange={(event) => setReviewDialog((current) => ({ ...current, reason: event.target.value }))} helperText="Required · This message is saved in the claim review history" inputProps={{ maxLength: 300 }} />}
      </DialogContent>
      <DialogActions className={cx("review-dialog-actions")}>
        <Button onClick={() => setReviewDialog(null)} disabled={reviewing}>Cancel</Button>
        <Button variant="contained" color={reviewDialog?.status === "rejected" ? "error" : reviewDialog?.status === "needs_information" ? "warning" : "success"} onClick={decide} disabled={reviewing || ((reviewDialog?.status === "rejected" || reviewDialog?.status === "needs_information") && !reviewDialog?.reason.trim())} startIcon={reviewDialog?.status === "approved" ? <CheckCircle2 size={17} /> : reviewDialog?.status === "rejected" ? <XCircle size={17} /> : <PauseCircle size={17} />}>{reviewing ? "Saving decision…" : reviewDialog?.status === "approved" ? "Accept and credit points" : reviewDialog?.status === "rejected" ? "Reject claim" : "Place on hold"}</Button>
      </DialogActions>
    </Dialog>
  </main>;
}
