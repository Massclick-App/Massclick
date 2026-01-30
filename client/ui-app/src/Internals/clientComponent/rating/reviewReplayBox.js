import { useState } from "react";
import { useDispatch } from "react-redux";
import { replyToReview } from "../../../redux/actions/reviewAction";
import "./reviewReplayBox.css";

export default function ReplyBox({ businessId, reviewId, onClose }) {
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();

  const handleReply = async () => {
    if (!message.trim()) return;

    const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    await dispatch(
      replyToReview(businessId, reviewId, {
        userId: storedUser._id,
        userName: storedUser.userName,
        role: "OWNER",
        message
      })
    );

    setMessage("");
    onClose();
  };


  return (
     <div className="reply-input">
      <textarea
        placeholder="Reply as the business owner..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleReply}>Post Reply</button>
        <button onClick={onClose} className="cancel-reply-btn">
          Cancel
        </button>
      </div>
    </div>
  );
}
