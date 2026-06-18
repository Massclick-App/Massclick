import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import { useState } from "react";
import Rating from "@mui/material/Rating";
import VerifiedIcon from "@mui/icons-material/Verified";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ReportOutlinedIcon from "@mui/icons-material/ReportOutlined";
import { useDispatch } from "react-redux";
import { markReviewHelpful, reportReview } from "../../../redux/actions/reviewAction";
import ReplyBox from "./reviewReplayBox";
import OTPLoginModal from "../AddBusinessModel";
import { useSnackbar } from "notistack";
import styles from "./reviewReplayBox.module.css";
const cx = createScopedClassNames(styles);
const normalizeMobile = value => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};
export default function ReviewCard({
  review,
  businessId,
  business
}) {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const displayName = review.userName || "Anonymous User";
  const isLoggedIn = !!authUser?._id && authUser?.mobileNumber1Verified;
  const alreadyHelpful = review.helpfulBy?.some(id => String(id) === String(authUser._id));
  const ownerBusinessIds = [authUser?.businessId, authUser?.business?._id, authUser?.business, authUser?.managedBusinessId].filter(Boolean).map(String);
  const userMobile = localStorage.getItem("mobileNumber") || authUser.mobileNumber1 || authUser.mobileNumber2 || "";
  const normalizedUserMobile = normalizeMobile(userMobile);
  const businessMobiles = [business?.contactList, business?.contact, business?.whatsappNumber].map(normalizeMobile).filter(Boolean);
  const isOwner = authUser?.businessPeople === true && (ownerBusinessIds.includes(String(businessId)) || authUser?.businessName === business?.businessName || businessMobiles.includes(normalizedUserMobile));
  const handleHelpful = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (alreadyHelpful) return;
    dispatch(markReviewHelpful(businessId, review._id, authUser._id));
  };
  const handleReplyClick = () => {
    if (!isOwner) {
      enqueueSnackbar("Only the business owner can reply to reviews.", { variant: "warning" });
      return;
    }
    setShowReplyBox(prev => !prev);
  };
  const handleReport = async () => {
    if (!isOwner) {
      enqueueSnackbar("Only the business owner can report reviews for this listing.", { variant: "warning" });
      return;
    }
    try {
      await dispatch(reportReview(businessId, review._id, { userMobile }));
      enqueueSnackbar("Review reported.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Failed to report review.", { variant: "error" });
    }
  };
  return <div className={cx("review-card")}>

      <div className={cx("review-header")}>
        <div className={cx("review-avatar")} aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className={cx("review-author-block")}>
          <div className={cx("review-author-row")}>
            <strong>{displayName}</strong>

            {review.isVerifiedUser && <VerifiedIcon fontSize="small" className={cx("review-verified-icon")} />}
          </div>
          <span className={cx("review-subtitle")}>Customer review</span>
        </div>
      </div>

      <div className={cx("review-rating-row")}>
        <Rating value={review.rating} precision={0.5} readOnly />
        <span className={cx("review-score")}>{Number(review.rating || 0).toFixed(1)}</span>
      </div>

      <p className={cx("review-text")}>{review.ratingExperience}</p>

      <div className={cx("review-actions-row")}>

        <button className={cx(`review-action-btn helpful ${alreadyHelpful ? "active" : ""}`)} disabled={alreadyHelpful} title={alreadyHelpful ? "You already marked this helpful" : "Mark helpful"} onClick={handleHelpful}>
          {alreadyHelpful ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
          Helpful ({review.helpfulCount || 0})
        </button>

        <button className={cx("review-action-btn")} onClick={handleReplyClick}>
            <ChatBubbleOutlineIcon fontSize="small" />
            Reply
          </button>

        <button className={cx("review-action-btn report")} onClick={handleReport}>
            <ReportOutlinedIcon fontSize="small" />
            Report
          </button>
      </div>

      {review.replies?.length > 0 && <div className={cx("owner-reply")}>
          <strong>Response from the owner</strong>

          {review.replies.map((reply, index) => <p key={index}>{reply.message}</p>)}
        </div>}

      {isOwner && showReplyBox && <ReplyBox businessId={businessId} reviewId={review._id} userMobile={userMobile} onClose={() => setShowReplyBox(false)} />}
      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
    </div>;
}
