import { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { MessageSquareText } from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { fetchBusinessSuggestions } from "state/actions/businessSuggestionAction.js";
import SuggestionReviewDialog, { FIELD_LABELS } from "features/admin/business-suggestions/SuggestionReviewDialog.js";
import styles from "features/admin/business-suggestions/PendingSuggestionsBanner.module.css";

const cx = createScopedClassNames(styles);

// Shown on the business edit form so pending customer corrections can be
// reviewed without leaving the listing. onApplied receives the fields an
// approval wrote (e.g. { contact, contactList }) so the open form doesn't save
// the old values back over them.
export default function PendingSuggestionsBanner({ businessId, onApplied }) {
  const [items, setItems] = useState([]);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const result = await fetchBusinessSuggestions({ businessId, status: "pending", limit: 20 });
      setItems(result.items || []);
    } catch {
      setItems([]);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  if (!items.length) return null;

  const onReviewed = (updated) => {
    setReviewing(null);
    if (updated?.appliedFields?.length && onApplied) {
      onApplied(Object.fromEntries(updated.appliedFields.map((field) => [field, updated.appliedValue])));
    }
    load();
  };

  return <section className={cx("banner")} aria-label="Pending customer suggestions">
    <div className={cx("banner-head")}>
      <MessageSquareText size={18} />
      <b>{items.length} pending customer suggestion{items.length === 1 ? "" : "s"}</b>
    </div>
    <ul className={cx("banner-list")}>
      {items.map((item) => <li key={item._id}>
        <span className={cx("banner-field")}>{FIELD_LABELS[item.field]}</span>
        <span className={cx("banner-value")}>{item.suggestedValue}</span>
        <span className={cx("banner-by")}>by {item.userName || "Customer"}</span>
        <Button size="small" variant="outlined" onClick={() => setReviewing(item)}>Review</Button>
      </li>)}
    </ul>
    {reviewing && <SuggestionReviewDialog key={reviewing._id} suggestion={reviewing} onClose={() => setReviewing(null)} onReviewed={onReviewed} />}
  </section>;
}
