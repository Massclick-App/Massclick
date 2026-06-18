import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Rating from '@mui/material/Rating';
import StarIcon from '@mui/icons-material/Star';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { getBusinessDetailsById } from '../../../redux/actions/businessListAction';
import { createReview } from '../../../redux/actions/reviewAction';
import styles from "./submitReview.module.css";
import CardsSearch from '../CardsSearch/CardsSearch';
import Footer from '../footer/footer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OTPLoginModal from '../AddBusinessModel';
import Tooltip from "@mui/material/Tooltip";
import { useSnackbar } from "notistack";
const cx = createScopedClassNames(styles);
const labels = {
  0.5: 'Useless',
  1: 'Poor',
  1.5: 'Bad',
  2: 'Weak',
  2.5: 'Average',
  3: 'Good',
  3.5: 'Very Good',
  4: 'Excellent',
  4.5: 'Outstanding',
  5: 'Amazing'
};
const WriteReviewPage = () => {
  const {
    businessId,
    ratingValue
  } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const initialRating = parseFloat(ratingValue) || 0;
  const {
    businessDetails,
    businessDetailsLoading,
    businessDetailsError
  } = useSelector(state => state.businessListReducer);
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [ratingPhotos, setRatingPhotos] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  useEffect(() => {
    dispatch(getBusinessDetailsById(businessId));
  }, [dispatch, businessId]);
  if (businessDetailsLoading) {
    return <>
      <CardsSearch />
      <Footer />
    </>;
  }
  if (businessDetailsError) {
    return <>
      <CardsSearch />
      <p style={{
        textAlign: "center",
        marginTop: "50px",
        color: "red"
      }}>
        {businessDetailsError}
      </p>
      <Footer />
    </>;
  }
  const business = businessDetails;
  if (!business) {
    return <>
      <CardsSearch />
      <p style={{
        textAlign: "center",
        marginTop: "50px"
      }}>Business not found.</p>
      <Footer />
    </>;
  }

  // const businessNameSlug = business.businessName.toLowerCase().replace(/\s+/g, '-');
  // const locationSlug = business.location.toLowerCase().replace(/\s+/g, '-');

  const handleModalClose = () => {
    const businessNameSlug = business.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const addressSlug = business.street?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "unknown";
    const locationSlug = business.location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const businessSlug = `${businessNameSlug}-${addressSlug}`;
    setShowSuccessModal(false);
    navigate(`/business/${locationSlug}/${businessSlug}/${businessId}`);
  };
  const handlePhotoUpload = event => {
    const files = Array.from(event.target.files);
    setRatingPhotos(files);
  };
  const handleTagClick = tag => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const handleSubmitReview = async () => {
    const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userMobile = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.mobileNumber2 || "";
    if (!storedUser?._id) {
      setShowLoginModal(true);
      return;
    }
    if (!userMobile) {
      enqueueSnackbar("Verified mobile number is required to submit a review.", { variant: "warning" });
      return;
    }
    if (!rating || reviewText.length < 5) {
      enqueueSnackbar("Please provide a rating and at least 5 characters.", { variant: "warning" });
      return;
    }
    setIsSubmitting(true);
    const base64Photos = await Promise.all(ratingPhotos.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    })));
    const newReview = {
      userId: storedUser._id,
      userName: storedUser.userName,
      userMobile,
      rating,
      ratingExperience: reviewText,
      ratingLove: selectedTags || [],
      ratingPhotos: base64Photos || []
    };
    try {
      await dispatch(createReview(businessId, newReview));
      setShowSuccessModal(true);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to submit review", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const isSubmitDisabled = isSubmitting || !rating || reviewText.length < 5;
  return <>
      <CardsSearch /><br /><br /><br />

      <div className={cx("write-review-container")}>

        <h1 className={cx("review-page-title")}>Write Review</h1>

        <div className={cx("review-business-header")}>
          <img src={business.bannerImage || 'placeholder.jpg'} alt={business.businessName} />
          <div>
            <h2>{business.businessName}</h2>
            <p>{business.location}</p>
          </div>
        </div>

        <div className={cx("review-form-body")}>
          <div className={cx("rating-column")}>
            <div className={cx("rating-section")}>
              <h3>How would you rate your experience?</h3>
              <Tooltip title={labels[rating] || "Select your rating"} arrow placement="top">
                <Rating value={rating} precision={0.5} onChange={(e, newValue) => setRating(newValue || 0)} emptyIcon={<StarIcon style={{
                opacity: 0.2
              }} />} sx={{
                "& .MuiSvgIcon-root": {
                  fontSize: "2.2rem"
                },
                "& .MuiRating-iconFilled": {
                  color: "#ffc107"
                },
                "& .MuiRating-iconHover": {
                  color: "#ffb300"
                }
              }} />
              </Tooltip>
              <p className={cx("rating-label")}>
                {labels[rating] || 'Select your rating...'}
                <span>{rating >= 4 ? '🤩' : rating >= 2.5 ? '🙂' : '😔'}</span>
              </p>
            </div>

            <div className={cx("photo-upload-section")}>
              <h3>Upload Photos (Optional)</h3>

              <input type="file" id="photo-upload-input" multiple accept="image/*" onChange={handlePhotoUpload} style={{
              display: 'none'
            }} />

              <label htmlFor="photo-upload-input" className={cx("custom-upload-btn")}>
                <PhotoCameraIcon style={{
                marginRight: '8px',
                fontSize: '1.2rem'
              }} />
                {ratingPhotos.length > 0 ? `${ratingPhotos.length} photo(s) selected` : 'Choose Photo Files'}
              </label>

              {ratingPhotos.length > 0 && <ul className={cx("selected-files-list")}>
                  {ratingPhotos.map((file, index) => <li key={index}>{file.name}</li>)}
                </ul>}
            </div>
          </div>

          <div className={cx("content-column")}>
            <div className={cx("tags-section")}>
              <h3>What did you like or dislike?</h3>
              <div className={cx("tag-list")}>
                {['Quick service', 'Great service', 'Impolite staff', 'Worth the money', 'Long wait time', 'Reasonably priced'].map(tag => <span key={tag} className={cx(`review-tag ${selectedTags.includes(tag) ? 'selected' : ''}`)} onClick={() => handleTagClick(tag)}>
                    {tag}
                  </span>)}
              </div>
            </div>

            <div className={cx("text-section")}>
              <h3>Tell us about your experience</h3>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Please say a little something about (Minimum 5 characters)" rows="5"></textarea>
            </div>
          </div>

        </div>

        <div className={cx("submit-action-container")}>
          <button className={cx("submit-review-btn")} onClick={handleSubmitReview} disabled={isSubmitDisabled}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>

      <Dialog open={showSuccessModal} onClose={handleModalClose}>
        <DialogTitle style={{
        textAlign: 'center',
        color: '#16a085',
        paddingTop: '20px'
      }}>
          <CheckCircleIcon style={{
          fontSize: 60,
          color: '#16a085'
        }} />
        </DialogTitle>

        <DialogContent style={{
        textAlign: 'center'
      }}>
          <h2>Review Submitted!</h2>
          <p>Thank you for sharing your experience at <strong>{business.businessName}</strong>.</p>
          <p>Your review will be live shortly.</p>
        </DialogContent>

        <DialogActions style={{
        justifyContent: 'center',
        paddingBottom: '20px'
      }}>
          <Button onClick={handleModalClose} variant="contained" style={{
          backgroundColor: '#FF8C00',
          color: 'white'
        }} autoFocus>
            View Business Page
          </Button>
        </DialogActions>
      </Dialog>

      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} onSuccess={() => {
      setShowLoginModal(false);
      handleSubmitReview();
    }} />

      <Footer />
    </>;
};
export default WriteReviewPage;
