import { useState } from "react";
import Rating from "@mui/material/Rating";
import VerifiedIcon from "@mui/icons-material/Verified";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ReportOutlinedIcon from "@mui/icons-material/ReportOutlined";
import { useDispatch } from "react-redux";
import { markReviewHelpful, reportReview } from "../../../redux/actions/reviewAction";
import ReplyBox from "./reviewReplayBox";
import "./reviewReplayBox.css";

export default function ReviewCard({ review, businessId, business }) {
  const dispatch = useDispatch();
  const [showReplyBox, setShowReplyBox] = useState(false);


const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

const displayName = review.userName || "Anonymous User";
console.log("displayName", displayName);



 
  const alreadyHelpful = review.helpfulBy?.some(
    id => id.toString() === authUser?._id
  );

 
  const isOwner =
    authUser?.businessPeople === true &&
    authUser?.businessName === business?.businessName;

  
  const handleHelpful = () => {
    if (alreadyHelpful) return;
    dispatch(markReviewHelpful(businessId, review._id));
  };

  const handleReport = () => {
    dispatch(reportReview(businessId, review._id));
  };

  return (
    <div className="review-card">

      <div className="review-header">
        <strong>{displayName}</strong>

        {review.isVerifiedUser && (
          <VerifiedIcon
            fontSize="small"
            style={{ color: "#1d9bf0", marginLeft: 6 }}
          />
        )}
      </div>

      <Rating value={review.rating} precision={0.5} readOnly />

      <p className="review-text">{review.ratingExperience}</p>

      <div className="review-actions-row">

        <button
          className={`review-action-btn ${alreadyHelpful ? "disabled" : ""}`}
          disabled={alreadyHelpful}
          title={alreadyHelpful ? "You already marked this helpful" : "Mark helpful"}
          onClick={handleHelpful}
        >
          <ThumbUpAltOutlinedIcon fontSize="small" />
          Helpful ({review.helpfulCount || 0})
        </button>

        {isOwner && (
          <button
            className="review-action-btn"
            onClick={() => setShowReplyBox(prev => !prev)}
          >
            <ChatBubbleOutlineIcon fontSize="small" />
            Reply
          </button>
        )}

        <button
          className="review-action-btn report"
          onClick={handleReport}
        >
          <ReportOutlinedIcon fontSize="small" />
          Report
        </button>
      </div>

      {review.replies?.length > 0 && (
        <div className="owner-reply">
          <strong>Response from the owner</strong>

          {review.replies.map((reply, index) => (
            <p key={index}>{reply.message}</p>
          ))}
        </div>
      )}

      {isOwner && showReplyBox && (
        <ReplyBox
          businessId={businessId}
          reviewId={review._id}
          onClose={() => setShowReplyBox(false)}
        />
      )}
    </div>
  );
}
