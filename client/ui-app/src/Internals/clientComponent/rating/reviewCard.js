import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import { useState } from "react";
import Rating from "@mui/material/Rating";
import VerifiedIcon from "@mui/icons-material/Verified";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ReportOutlinedIcon from "@mui/icons-material/ReportOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Dialog from "@mui/material/Dialog";
import { useDispatch } from "react-redux";
import { markReviewHelpful, reportReview } from "../../../redux/actions/reviewAction";
import ReplyBox from "./reviewReplayBox";
import OTPLoginModal from "../AddBusinessModel";
import { useSnackbar } from "../../../components/snackbar/SnackbarProvider.js";
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
  const [galleryIndex, setGalleryIndex] = useState(-1);
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const displayName = review.userName || "Anonymous User";
  const isLoggedIn = !!authUser?._id && authUser?.mobileNumber1Verified;
  const alreadyHelpful = review.helpfulBy?.some(id => String(id) === String(authUser._id));
  const ownerBusinessIds = [authUser?.businessId, authUser?.business?._id, authUser?.business, authUser?.managedBusinessId].filter(Boolean).map(String);
  const userMobile = localStorage.getItem("mobileNumber") || authUser.mobileNumber1 || authUser.mobileNumber2 || "";
  const normalizedUserMobile = normalizeMobile(userMobile);
  const businessMobiles = [business?.contactList, business?.contact, business?.whatsappNumber].map(normalizeMobile).filter(Boolean);
  const isOwner = authUser?.businessPeople === true && (ownerBusinessIds.includes(String(businessId)) || authUser?.businessName === business?.businessName || businessMobiles.includes(normalizedUserMobile));
  const reviewPhotos = Array.isArray(review.ratingPhotos) ? review.ratingPhotos.filter(Boolean) : [];
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

      {reviewPhotos.length > 0 && <div className={cx("review-photo-grid")}>
        {reviewPhotos.slice(0, 4).map((photo, index) => <button type="button" key={`${photo}-${index}`} onClick={() => setGalleryIndex(index)} aria-label={`Open review photo ${index + 1} of ${reviewPhotos.length}`}>
          <img src={photo} alt={`Customer review ${index + 1}`} loading="lazy" />
          {index === 3 && reviewPhotos.length > 4 && <span>+{reviewPhotos.length - 4}</span>}
        </button>)}
      </div>}

      <div className={cx("review-actions-row")}>

        <button className={cx(`review-action-btn helpful ${alreadyHelpful ? "active" : ""}`)} disabled={alreadyHelpful} title={alreadyHelpful ? "You already marked this helpful" : "Mark helpful"} onClick={handleHelpful}>
          {alreadyHelpful ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
          Helpful ({review.helpfulCount || 0})
        </button>

        <button className={cx("review-action-btn")} onClick={handleReplyClick}>
            <ChatBubbleOutlineIcon fontSize="small" />
            Reply
          </button>

        <button className={cx("review-action-btn")} onClick={() => navigator.share?.({ title: business?.businessName || "Business review", text: review.ratingExperience, url: window.location.href })}>
          <ShareOutlinedIcon fontSize="small" />
          Share
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
      <Dialog open={galleryIndex >= 0} onClose={() => setGalleryIndex(-1)} maxWidth={false} className={cx("review-gallery-dialog")}>
        <div className={cx("review-gallery")}>
          <button className={cx("gallery-close")} onClick={() => setGalleryIndex(-1)} aria-label="Close gallery"><CloseIcon /></button>
          {reviewPhotos.length > 1 && <button className={cx("gallery-previous")} onClick={() => setGalleryIndex(index => (index - 1 + reviewPhotos.length) % reviewPhotos.length)} aria-label="Previous photo"><ChevronLeftIcon /></button>}
          {galleryIndex >= 0 && <img src={reviewPhotos[galleryIndex]} alt={`Review gallery ${galleryIndex + 1}`} />}
          {reviewPhotos.length > 1 && <button className={cx("gallery-next")} onClick={() => setGalleryIndex(index => (index + 1) % reviewPhotos.length)} aria-label="Next photo"><ChevronRightIcon /></button>}
          <span>{galleryIndex + 1} / {reviewPhotos.length}</span>
        </div>
      </Dialog>
      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
    </div>;
}
