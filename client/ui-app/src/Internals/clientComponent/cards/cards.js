import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import styles from "./cards.module.css";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendIcon from "@mui/icons-material/Send";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import WorkHistoryRoundedIcon from "@mui/icons-material/WorkHistoryRounded";
import { addFavorite, removeFavorite, fetchFavorites, getAuthUser } from "../../../redux/actions/favoriteAction";
import OTPLoginModal from "../AddBusinessModel.js";

const cx = createScopedClassNames(styles);

const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
let favoritesInitialized = false;

const MAX_FILTER_BADGES = 4;

function getFilterBadges(filters) {
  if (!filters || typeof filters !== "object") return [];
  const badges = [];
  for (const val of Object.values(filters)) {
    if (badges.length >= MAX_FILTER_BADGES) break;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (badges.length >= MAX_FILTER_BADGES) break;
        if (v && typeof v === "string") badges.push(v);
      }
    } else if (val === true) {
      // skip plain boolean toggles — no label without key context
    } else if (val && typeof val === "string") {
      badges.push(val);
    }
  }
  return badges;
}

const Cards = ({
  imageSrc,
  title,
  rating,
  reviews,
  address,
  experience,
  phone,
  whatsappNumber,
  category,
  contactList,
  price,
  priceType = "day",
  to,
  index = 0,
  businessId,
  isVerified = false,
  isFeatured = false,
  filters,
  ...props
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const favoriteIds = useSelector(state => state.favorites.favoriteIds);
  const togglingIds = useSelector(state => state.favorites.togglingIds);
  const user = getAuthUser();
  const isLoggedIn = !!user?._id;
  const isFavorited = businessId ? favoriteIds.includes(businessId) : false;
  const isToggling = businessId ? togglingIds.includes(businessId) : false;

  useEffect(() => {
    if (isLoggedIn && businessId && !favoritesInitialized) {
      favoritesInitialized = true;
      dispatch(fetchFavorites());
    }
  }, [isLoggedIn, businessId, dispatch]);

  const safeRating = typeof rating === "object"
    ? Array.isArray(rating) ? rating.length : 0
    : rating || 0;
  const safeReviews = typeof reviews === "object"
    ? Array.isArray(reviews) ? reviews.length : 0
    : reviews || 0;
  const filterBadges = getFilterBadges(filters);

  const handlePhoneClick = e => {
    e.preventDefault();
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppClick = e => {
    e.preventDefault();
    e.stopPropagation();
    if (!whatsappNumber) { alert("WhatsApp number not available"); return; }
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const handleEnquiryClick = e => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/business-enquiry");
  };

  const handleFavClick = e => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    if (isToggling) return;
    isFavorited ? dispatch(removeFavorite(businessId)) : dispatch(addFavorite(businessId));
  };

  return (
    <>
      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
      <Link to={to} state={props.state} className={cx("card-link")}>
        <div className={cx("base-card")}>

          {/* Image */}
          <div className={cx("card-image-wrapper")}>
            <div className={cx("card-image-container")}>
              <LazyLoadImage
                src={imageSrc || EMPTY_PIXEL}
                placeholderSrc={EMPTY_PIXEL}
                alt={title}
                decoding="async"
                loading={index < 3 ? "eager" : "lazy"}
                effect="opacity"
                width="100%"
                height="100%"
                className={cx("card-image")}
              />
            </div>

            {/* Verified / Featured overlays */}
            {(isVerified || isFeatured) && (
              <div className={cx("image-badges")}>
                {isVerified && (
                  <span className={cx("badge-verified")}>
                    <VerifiedRoundedIcon style={{ fontSize: 10 }} />
                    Verified
                  </span>
                )}
                {isFeatured && (
                  <span className={cx("badge-featured")}>
                    <WorkspacePremiumRoundedIcon style={{ fontSize: 10 }} />
                    Featured
                  </span>
                )}
              </div>
            )}

            {/* Fav button */}
            {businessId && (
              <button
                className={cx(`fav-btn${isFavorited ? " fav-btn--active" : ""}${isToggling ? " fav-btn--loading" : ""}`)}
                onClick={handleFavClick}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorited
                  ? <FavoriteIcon style={{ fontSize: 18, color: "#ef4444" }} />
                  : <FavoriteBorderIcon style={{ fontSize: 18, color: "#ef4444" }} />}
              </button>
            )}
          </div>

          {/* Content */}
          <div className={cx("card-content")}>

            {/* TOP — title + meta */}
            <div className={cx("card-top")}>
              <div className={cx("card-header-row")}>
                <h2 className={cx("card-title")}>{title}</h2>
                {category?.toLowerCase().includes("hotel") && price && (
                  <div className={cx("price-box")}>
                    ₹{price}
                    <span className={cx("price-type")}>/{priceType}</span>
                  </div>
                )}
              </div>
              <div className={cx("card-meta")}>
                <span className={cx("rating-badge")}>
                  <StarRoundedIcon style={{ fontSize: 13 }} />
                  {safeRating}
                </span>
                <span className={cx("reviews-text")}>{safeReviews} ratings</span>
                {category && (
                  <span className={cx("category-pill")}>{category}</span>
                )}
              </div>
            </div>

            {/* MID — address, experience, filter badges */}
            <div className={cx("card-info")}>
              {address && (
                <p className={cx("card-address-inline")}>
                  <LocationOnIcon className={cx("icon")} />
                  <span>{address}</span>
                </p>
              )}
              {category?.toLowerCase().includes("bank") && contactList && (
                <p className={cx("card-ifsc")}>IFSC: {contactList}</p>
              )}
              {experience != null && experience !== "" && (
                <p className={cx("card-details")}>
                  <WorkHistoryRoundedIcon className={cx("icon")} />
                  {experience}+ yrs experience
                </p>
              )}
              {filterBadges.length > 0 && (
                <div className={cx("filter-badges")}>
                  {filterBadges.map((badge) => (
                    <span key={badge} className={cx("filter-badge")}>{badge}</span>
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM — actions */}
            <div className={cx("cardpage-actions")}>
              <button className={cx("card-action-button phone-button")} onClick={handlePhoneClick}>
                <PhoneIcon />
                Call
              </button>
              <button className={cx("card-action-button whatsapp-button")} onClick={handleWhatsAppClick}>
                <WhatsAppIcon />
                WhatsApp
              </button>
              <button className={cx("card-action-button enquiry-button")} onClick={handleEnquiryClick}>
                <SendIcon />
                Enquiry
              </button>
            </div>

          </div>
        </div>
      </Link>
    </>
  );
};

export default Cards;
