import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { replyToReview } from "../../../redux/actions/reviewAction";
import { useSnackbar } from "notistack";
import styles from "./reviewReplayBox.module.css";
const cx = createScopedClassNames(styles);
export default function ReplyBox({
  businessId,
  reviewId,
  userMobile,
  onClose
}) {
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const handleReply = async () => {
    if (!message.trim()) return;
    const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    try {
      await dispatch(replyToReview(businessId, reviewId, {
        userId: storedUser._id,
        userName: storedUser.userName,
        userMobile,
        role: "OWNER",
        message
      }));
      enqueueSnackbar("Owner response posted.", { variant: "success" });
      setMessage("");
      onClose();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Failed to post reply.", { variant: "error" });
    }
  };
  return <div className={cx("reply-input")}>
      <textarea placeholder="Reply as the business owner..." value={message} onChange={e => setMessage(e.target.value)} rows={3} />
      <div style={{
      display: "flex",
      gap: "8px"
    }}>
        <button onClick={handleReply}>Post Reply</button>
        <button onClick={onClose} className={cx("cancel-reply-btn")}>
          Cancel
        </button>
      </div>
    </div>;
}
