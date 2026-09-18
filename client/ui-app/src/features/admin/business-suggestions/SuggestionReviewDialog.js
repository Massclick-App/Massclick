import { useState } from "react";
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField,
} from "@mui/material";
import { Check, MessageSquareText, UserRound, X } from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import {
  SUGGESTIONS_CHANGED_EVENT, approveBusinessSuggestion, rejectBusinessSuggestion,
} from "state/actions/businessSuggestionAction.js";
import styles from "features/admin/business-suggestions/SuggestionReviewDialog.module.css";

const cx = createScopedClassNames(styles);

export const FIELD_LABELS = {
  phone: "Phone", whatsapp: "WhatsApp", email: "Email", website: "Website",
  address: "Address", timings: "Timings", other: "Other",
};
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";

// Approve/reject dialog, shared with the pending-suggestions banner on the
// business edit form so both places review the same way.
export default function SuggestionReviewDialog({ suggestion, onClose, onReviewed }) {
  const [value, setValue] = useState(suggestion.suggestedValue);
  const [applyWhatsapp, setApplyWhatsapp] = useState(false);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState("approve");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [staleValue, setStaleValue] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = mode === "approve"
        ? await approveBusinessSuggestion(suggestion._id, { value, applyWhatsapp, force: staleValue !== null })
        : await rejectBusinessSuggestion(suggestion._id, reason);
      window.dispatchEvent(new Event(SUGGESTIONS_CHANGED_EVENT));
      onReviewed(updated, mode);
    } catch (err) {
      const data = err.response?.data || {};
      if (data.stale) setStaleValue(data.liveValue || "");
      setError(data.message || err.message || "Could not save the review.");
    } finally {
      setBusy(false);
    }
  };

  const isNumber = suggestion.field === "phone" || suggestion.field === "whatsapp";
  return <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
    <DialogTitle>Review {FIELD_LABELS[suggestion.field]?.toLowerCase()} suggestion</DialogTitle>
    <DialogContent>
      <div className={cx("dialog-business")}>
        <b>{suggestion.businessName}</b>
        <span>{suggestion.businessCategory}</span>
      </div>
      <div className={cx("compare")}>
        <div><span>Listing shows now</span><p>{suggestion.liveValue || <em>Empty</em>}</p></div>
        <div className={cx("compare-new")}><span>Customer suggests</span><p>{suggestion.suggestedValue}</p></div>
      </div>
      {suggestion.note && <p className={cx("note")}><MessageSquareText size={14} /> {suggestion.note}</p>}
      <p className={cx("submitter")}><UserRound size={14} /> {suggestion.userName || "Customer"} · {suggestion.userMobile || "no mobile"} · {formatDateTime(suggestion.createdAt)}</p>

      <div className={cx("mode-switch")}>
        <Button variant={mode === "approve" ? "contained" : "outlined"} color="success" startIcon={<Check size={16} />} onClick={() => setMode("approve")}>Approve</Button>
        <Button variant={mode === "reject" ? "contained" : "outlined"} color="error" startIcon={<X size={16} />} onClick={() => setMode("reject")}>Reject</Button>
      </div>

      {mode === "approve" ? (
        suggestion.autoApply ? <>
          <TextField
            fullWidth size="small" margin="dense"
            label={`Value to save as ${FIELD_LABELS[suggestion.field]}`}
            helperText="Edit before approving if the customer's value needs correcting."
            value={value}
            onChange={(e) => setValue(isNumber ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)}
          />
          {suggestion.field === "phone" && (
            <FormControlLabel
              control={<Checkbox checked={applyWhatsapp} onChange={(e) => setApplyWhatsapp(e.target.checked)} />}
              label={`Also set as WhatsApp number${suggestion.liveWhatsapp ? ` (replaces ${suggestion.liveWhatsapp})` : ""}`}
            />
          )}
          <p className={cx("hint")}>Approving saves this value to the listing immediately.</p>
        </> : (
          <Alert severity="info" className={cx("hint-alert")}>
            {FIELD_LABELS[suggestion.field]} changes aren&apos;t applied automatically. Update the listing from the Business page first, then approve here to close the suggestion.
          </Alert>
        )
      ) : (
        <TextField fullWidth size="small" margin="dense" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 500 }} />
      )}

      {staleValue !== null && mode === "approve" && (
        <Alert severity="warning" className={cx("hint-alert")}>
          The listing changed since this was suggested. It now shows &ldquo;{staleValue || "empty"}&rdquo;. Approve again to overwrite it.
        </Alert>
      )}
      {error && staleValue === null && <Alert severity="error" className={cx("hint-alert")}>{error}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant="contained" color={mode === "approve" ? "success" : "error"} onClick={submit} disabled={busy || (mode === "approve" && suggestion.autoApply && !value.trim())}>
        {busy ? "Saving..." : mode === "approve" ? (staleValue !== null ? "Overwrite and approve" : suggestion.autoApply ? "Approve and update listing" : "Mark as done") : "Reject suggestion"}
      </Button>
    </DialogActions>
  </Dialog>;
}
