import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Rating from "@mui/material/Rating";
import StarIcon from "@mui/icons-material/Star";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import NearMeOutlinedIcon from "@mui/icons-material/NearMeOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getBusinessDetailsById } from "../../../redux/actions/businessListAction";
import { createReview, getBusinessReviews, markReviewHelpful } from "../../../redux/actions/reviewAction";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import Footer from "../footer/footer";
import OTPLoginModal from "../AddBusinessModel";
import { useSnackbar } from "../../../components/snackbar/SnackbarProvider.js";
import { AUTH_STATE_EVENT, getAuthSnapshot } from "../../../auth/authStore.js";
import { buildBusinessPath, createDistrictSlug } from "../../../utils/searchResultNavigation";
import styles from "./submitReview.module.css";

const cx = createScopedClassNames(styles);
const likedTags = ["Food Quality", "Service", "Cleanliness", "Ambience", "Value for Money", "Staff Behavior", "Waiting Time", "Parking"];
const dislikedTags = ["High Price", "Long Wait Time", "Crowded", "Limited Menu", "Poor Service", "Noise"];
const labels = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

const WriteReviewPage = () => {
  const { businessId, ratingValue } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const stepTargets = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const { enqueueSnackbar } = useSnackbar();
  const { businessDetails: business, businessDetailsLoading, businessDetailsError } = useSelector(state => state.businessListReducer);
  const reviewState = useSelector(state => state.reviews);
  const reviews = Array.isArray(reviewState?.reviews) ? reviewState.reviews : [];
  const [rating, setRating] = useState(Math.min(5, Math.max(0, Math.round(Number(ratingValue) || 0))));
  const [reviewText, setReviewText] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [ratingPhotos, setRatingPhotos] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reviewGallery, setReviewGallery] = useState({ photos: [], index: -1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewAuthenticated, setIsReviewAuthenticated] = useState(() => Boolean(getAuthSnapshot().customer.token && getAuthSnapshot().customer.user?._id));
  const [showLoginModal, setShowLoginModal] = useState(() => !isReviewAuthenticated);

  useEffect(() => {
    const sync = () => {
      const customer = getAuthSnapshot().customer;
      const authenticated = Boolean(customer.token && customer.user?._id);
      setIsReviewAuthenticated(authenticated);
      if (authenticated) setShowLoginModal(false);
    };
    window.addEventListener(AUTH_STATE_EVENT, sync);
    window.addEventListener("authChange", sync);
    return () => { window.removeEventListener(AUTH_STATE_EVENT, sync); window.removeEventListener("authChange", sync); };
  }, []);

  useEffect(() => {
    dispatch(getBusinessDetailsById(businessId));
    dispatch(getBusinessReviews(businessId, "latest"));
  }, [dispatch, businessId]);

  const photoPreviews = useMemo(() => ratingPhotos.map(file => ({ file, url: URL.createObjectURL(file) })), [ratingPhotos]);
  useEffect(() => () => photoPreviews.forEach(item => URL.revokeObjectURL(item.url)), [photoPreviews]);

  if (!isReviewAuthenticated) return <><StickySearchBar /><main className={cx("review-login-gate")}><LockOutlinedIcon /><h1>Sign in to share your experience</h1><p>Verify your mobile number to write a trusted review.</p><button type="button" onClick={() => setShowLoginModal(true)}>Login / Sign Up</button></main><OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} onSuccess={() => setIsReviewAuthenticated(true)} /><Footer /></>;
  if (businessDetailsLoading || !business) return <><StickySearchBar /><main className={cx("page-state")}>{businessDetailsError || (businessDetailsLoading ? "Loading review page…" : "Business not found.")}</main><Footer /></>;

  const images = [business.bannerImage, ...(business.businessImages || [])].filter(Boolean);
  const heroImage = images[0] || "/placeholder.jpg";
  const totalReviews = Math.max(Number(business.totalReviews) || 0, Number(reviewState?.total) || 0, reviews.length);
  const average = Number(business.averageRating) || (reviews.length ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length : 0);
  const displayAverage = average > 0 ? average.toFixed(1) : "New";
  const categories = [business.categoryName, business.subCategoryName, business.businessCategory, ...(business.services || [])].flat().filter(Boolean).slice(0, 4);
  const address = business.address || business.businessAddress || [business.location, business.district].filter(Boolean).join(", ");
  const phone = business.mobileNumber || business.mobileNumber1 || business.phoneNumber || "";
  const website = business.website || business.businessWebsite || "";
  const ratingCounts = [5, 4, 3, 2, 1].map(value => ({ value, count: reviews.filter(item => Math.round(Number(item.rating)) === value).length }));
  const distributionTotal = ratingCounts.reduce((sum, item) => sum + item.count, 0);

  const businessPath = buildBusinessPath({ districtSlug: createDistrictSlug(business.masterLocation?.district || business.district || ""), location: business.location, businessName: business.businessName, publicId: business.publicId, id: businessId });
  const toggleTag = tag => setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]);
  const addPhotos = event => {
    const incoming = Array.from(event.target.files || []);
    setRatingPhotos(current => [...current, ...incoming].slice(0, 10));
    event.target.value = "";
  };
  const removePhoto = index => setRatingPhotos(current => current.filter((_, itemIndex) => itemIndex !== index));
  const experienceComplete = rating > 0;
  const detailsComplete = reviewText.trim().length >= 10;
  const photosComplete = detailsComplete;
  const currentStep = !experienceComplete ? 1 : !detailsComplete ? 2 : !photosComplete ? 3 : 4;
  const completedSteps = [experienceComplete, detailsComplete, photosComplete, showSuccessModal];
  const goToStep = step => {
    window.requestAnimationFrame(() => stepTargets[step - 1].current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const submitReview = async () => {
    const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userMobile = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.mobileNumber2 || "";
    if (!storedUser?._id || !userMobile) { setShowLoginModal(true); return; }
    if (!rating || reviewText.trim().length < 10) { enqueueSnackbar("Choose a rating and write at least 10 characters.", { variant: "warning" }); return; }
    setIsSubmitting(true);
    try {
      const base64Photos = await Promise.all(ratingPhotos.map(file => new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file); })));
      await dispatch(createReview(businessId, { userId: storedUser._id, userName: isAnonymous ? "Anonymous" : storedUser.userName, userMobile, rating, ratingExperience: reviewText.trim(), ratingLove: selectedTags, ratingPhotos: base64Photos }));
      setShowSuccessModal(true);
    } catch (error) { enqueueSnackbar(error.response?.data?.message || "Failed to submit review", { variant: "error" }); }
    finally { setIsSubmitting(false); }
  };
  const markHelpful = review => {
    const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    if (!storedUser?._id) { setShowLoginModal(true); return; }
    const alreadyHelpful = review.helpfulBy?.some(id => String(id) === String(storedUser._id));
    if (alreadyHelpful) { enqueueSnackbar("You already marked this review as helpful.", { variant: "info" }); return; }
    dispatch(markReviewHelpful(businessId, review._id, storedUser._id));
  };
  const shareReview = async review => {
    const shareData = { title: `${business.businessName} review`, text: review.ratingExperience, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        enqueueSnackbar("Review link copied to clipboard.", { variant: "success" });
      }
    } catch (error) {
      if (error?.name !== "AbortError") enqueueSnackbar("Unable to share this review.", { variant: "warning" });
    }
  };
  const openDiscussion = () => {
    navigate(`${businessPath}#customer-reviews`);
    enqueueSnackbar("Business owners can reply from the customer reviews section.", { variant: "info" });
  };

  return <div className={cx("review-page")}>
    <StickySearchBar />
    <main className={cx("review-shell")}>
      <nav className={cx("breadcrumbs")} aria-label="Breadcrumb"><button onClick={() => navigate("/")}>Home</button><span>›</span>{(business.masterLocation?.district || business.district) && <><button onClick={() => navigate(-1)}>{business.masterLocation?.district || business.district}</button><span>›</span></>}<button onClick={() => navigate(-1)}>{business.location || "Business"}</button><span>›</span><button onClick={() => navigate(businessPath)}>{business.businessName}</button><span>›</span><strong>Write Review</strong></nav>

      <section className={cx("business-hero")}>
        <div className={cx("hero-image-wrap")}><img src={heroImage} alt={business.businessName} /><span className={cx("viewed-pill")}>◆ People viewed this business today</span><button className={cx("save-button")} aria-label="Save business"><FavoriteBorderIcon /></button></div>
        <div className={cx("hero-content")}><h1>{business.businessName}</h1><span className={cx("verified")}><CheckCircleIcon /> Verified Business</span>
          {categories.length > 0 && <div className={cx("category-list")}>{categories.map(item => <span key={item}>{item}</span>)}</div>}
          <div className={cx("hero-rating")}><strong>{displayAverage}</strong><Rating value={average || 0} precision={0.1} readOnly /><span>({totalReviews} Reviews)</span><i>•</i><span>{business.happyCustomers || "Trusted by local customers"}</span></div>
          <p className={cx("address")}><LocationOnOutlinedIcon />{address || "Location information unavailable"}</p>
          <div className={cx("hero-actions")}><button className={cx("primary")} onClick={() => phone && (window.location.href = `tel:${phone}`)}><PhoneInTalkOutlinedIcon /> Call Now</button><button><span className={cx("whatsapp")}>◉</span> WhatsApp</button>{website && <button onClick={() => window.open(website.startsWith("http") ? website : `https://${website}`, "_blank")}><LanguageOutlinedIcon /> Website</button>}<button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank")}><NearMeOutlinedIcon /> Directions</button></div>
        </div>
      </section>

      <div className={cx("content-grid")}>
        <div className={cx("main-column")}>
          <section className={cx("review-form-card")}>
            <div className={cx("form-heading")}><div><h2>Share your experience</h2><p>Your review helps others make the right choice!</p></div><span><ShieldOutlinedIcon /> Your review is safe and<br />100% confidential</span></div>
            <div className={cx("steps")} aria-label="Review completion">{["Experience", "Details", "Photos (optional)", "Submit"].map((step, index) => <button type="button" onClick={() => goToStep(index + 1)} className={cx(currentStep === index + 1 ? "active" : completedSteps[index] ? "complete" : "")} aria-current={currentStep === index + 1 ? "step" : undefined} key={step}><b>{completedSteps[index] ? "✓" : index + 1}</b><span>{step}</span></button>)}</div>
            <div className={cx("experience-grid")} ref={stepTargets[0]}>
              <div className={cx("rating-picker")}><h3>How would you rate your overall experience?</h3><Rating value={rating} onChange={(_, value) => setRating(value || 0)} icon={<StarIcon />} emptyIcon={<StarIcon />} /><p>{rating ? `${rating}.0 – ${labels[rating]}` : "Select a rating"}</p></div>
              <div className={cx("tag-picker")}><h3>What did you like or dislike? <small>(Select all that apply)</small></h3><label>Liked 👍</label><div>{likedTags.map(tag => <button type="button" className={cx(selectedTags.includes(tag) ? "selected-good" : "")} onClick={() => toggleTag(tag)} key={tag}>{tag}</button>)}</div><label className={cx("disliked")}>Disliked 👎</label><div>{dislikedTags.map(tag => <button type="button" className={cx(selectedTags.includes(tag) ? "selected-bad" : "bad-tag")} onClick={() => toggleTag(tag)} key={tag}>{tag}</button>)}</div></div>
            </div>
            <div className={cx("editor")} ref={stepTargets[1]}><h3>Write your review</h3><p>Tell others about your experience…</p><div><textarea maxLength="1500" value={reviewText} onChange={event => setReviewText(event.target.value)} placeholder="Share details of your experience… (Minimum 10 characters)" /><span>{reviewText.length}/1500</span></div><aside><LightbulbOutlinedIcon /> Tip: Be specific about what you liked or disliked. Your detailed review is more helpful!</aside></div>
            <div className={cx("photo-area")} ref={stepTargets[2]}><div><h3>Add photos <small>(Optional, up to 10)</small></h3><p>Select several images together, or add more images in multiple selections.</p></div><input ref={fileRef} hidden multiple accept="image/*" type="file" onChange={addPhotos} /><button type="button" onClick={() => fileRef.current?.click()}><PhotoCameraOutlinedIcon /> Add photos {ratingPhotos.length > 0 && `(${ratingPhotos.length})`}</button>{photoPreviews.length > 0 && <div className={cx("photo-previews")}>{photoPreviews.map((item, index) => <figure key={item.url}><img src={item.url} alt={item.file.name} /><button onClick={() => removePhoto(index)} aria-label="Remove photo"><CloseIcon /></button></figure>)}</div>}</div>
            <div className={cx("form-actions")} ref={stepTargets[3]}><button type="button" onClick={() => navigate(businessPath)}>Cancel</button><button type="button" className={cx("next-button")} disabled={isSubmitting || !experienceComplete || !detailsComplete} onClick={submitReview}>{isSubmitting ? "Submitting…" : "Submit Review →"}</button></div>
          </section>

          <section className={cx("recent-reviews")}><div className={cx("section-title")}><h2>Recent Reviews</h2><span>{totalReviews} customer experiences</span></div>{reviews.length === 0 ? <div className={cx("empty-reviews")}><StarIcon /><strong>Be the first to review</strong><p>Your experience can help the next customer.</p></div> : reviews.slice(0, 6).map(review => { const photos = Array.isArray(review.ratingPhotos) ? review.ratingPhotos.filter(Boolean) : []; const storedUserId = JSON.parse(localStorage.getItem("authUser") || "{}")?._id; const alreadyHelpful = review.helpfulBy?.some(id => String(id) === String(storedUserId)); return <article key={review._id}><div className={cx("avatar")}>{(review.userName || "A").charAt(0).toUpperCase()}</div><div className={cx("review-copy")}><div><strong>{review.userName || "Anonymous User"}</strong><span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "Recent"}</span></div><Rating value={Number(review.rating) || 0} readOnly /><p>{review.ratingExperience}</p>{photos.length > 0 && <div className={cx("review-photos")}>{photos.slice(0, 4).map((photo, index) => <button type="button" onClick={() => setReviewGallery({ photos, index })} key={index}><img src={photo} alt={`Review ${index + 1}`} />{index === 3 && photos.length > 4 && <span>+{photos.length - 4}</span>}</button>)}</div>}<footer><button type="button" className={cx(alreadyHelpful ? "helpful-active" : "")} onClick={() => markHelpful(review)}>{alreadyHelpful ? "♥" : "♡"} Helpful ({review.helpfulCount || 0})</button><button type="button" onClick={openDiscussion}>◇ Reply</button><button type="button" onClick={() => shareReview(review)}>↗ Share</button></footer></div></article>; })}</section>
        </div>

        <aside className={cx("sidebar")}>
          <section><h2>Rating Summary ⓘ</h2><div className={cx("summary-score")}><strong>{displayAverage}</strong><div><Rating value={average || 0} precision={0.1} readOnly /><span>Based on {totalReviews} reviews</span></div></div><div className={cx("rating-bars")}>{ratingCounts.map(item => { const percent = distributionTotal ? Math.round(item.count / distributionTotal * 100) : (item.value === 5 ? 68 : item.value === 4 ? 20 : 4); return <div key={item.value}><span>{item.value} ★</span><i><b style={{ width: `${percent}%` }} /></i><em>{percent}%</em></div>; })}</div><p className={cx("rated-by")}>👤👤👤 <strong>{totalReviews || "Local"} people rated this business</strong></p></section>
          <section><h2>Review Tips</h2>{[["✓", "Be honest and helpful", "Share your genuine experience"], ["!", "Focus on details", "Mention specific things you liked or disliked"], ["♢", "Keep it respectful", "Use polite and constructive language"], ["▣", "Add photos", "Photos help others understand better"]].map(item => <div className={cx("tip")} key={item[1]}><b>{item[0]}</b><p><strong>{item[1]}</strong><span>{item[2]}</span></p></div>)}</section>
          <section className={cx("impact-card")}><div>♥</div><p><strong>Your Impact</strong><span>Your review helps thousands of people every day.</span></p></section>
          <section className={cx("trust-card")}><h2>Verified & Trusted</h2><p>✓ All reviews are manually verified</p><p>✓ No fake reviews</p><p>✓ Strict spam protection</p><p>✓ 100% authentic experiences</p><ShieldOutlinedIcon /></section>
          <section><h2>Write review as</h2><label className={cx("radio-row")}><input type="radio" checked={!isAnonymous} onChange={() => setIsAnonymous(false)} /><span><strong>Public</strong><small>Your name will be displayed</small></span></label><label className={cx("radio-row")}><input type="radio" checked={isAnonymous} onChange={() => setIsAnonymous(true)} /><span><strong>Anonymous</strong><small>Your name will not be displayed</small></span></label><div className={cx("privacy-note")}><LockOutlinedIcon /><span><strong>We value your privacy</strong>Your information will never be shared with third parties.</span></div></section>
        </aside>
      </div>
    </main>

    <Dialog open={showSuccessModal} onClose={() => { setShowSuccessModal(false); navigate(businessPath); }}><DialogTitle className={cx("success-title")}><CheckCircleIcon /></DialogTitle><DialogContent className={cx("success-content")}><h2>Review Submitted!</h2><p>Thank you for sharing your experience at <strong>{business.businessName}</strong>.</p></DialogContent><DialogActions className={cx("success-actions")}><Button onClick={() => navigate(businessPath)} variant="contained">View Business Page</Button></DialogActions></Dialog>
    <Dialog open={reviewGallery.index >= 0} onClose={() => setReviewGallery({ photos: [], index: -1 })} maxWidth={false} className={cx("photo-dialog")}><div className={cx("photo-lightbox")}><button className={cx("lightbox-close")} onClick={() => setReviewGallery({ photos: [], index: -1 })}><CloseIcon /></button>{reviewGallery.photos.length > 1 && <button className={cx("lightbox-prev")} onClick={() => setReviewGallery(state => ({ ...state, index: (state.index - 1 + state.photos.length) % state.photos.length }))}><ChevronLeftIcon /></button>}{reviewGallery.index >= 0 && <img src={reviewGallery.photos[reviewGallery.index]} alt="Review gallery" />}{reviewGallery.photos.length > 1 && <button className={cx("lightbox-next")} onClick={() => setReviewGallery(state => ({ ...state, index: (state.index + 1) % state.photos.length }))}><ChevronRightIcon /></button>}<span>{reviewGallery.index + 1} / {reviewGallery.photos.length}</span></div></Dialog>
    <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} onSuccess={() => { setIsReviewAuthenticated(true); setShowLoginModal(false); }} />
    <Footer />
  </div>;
};

export default WriteReviewPage;
