import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import "./cards.css";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendIcon from "@mui/icons-material/Send";
import StarIcon from "@mui/icons-material/Star";
import CategoryIcon from "@mui/icons-material/Category";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

import {
  addFavorite,
  removeFavorite,
  fetchFavorites,
  getAuthUser,
} from "../../../redux/actions/favoriteAction";
import OTPLoginModal from "../AddBusinessModel.js";

const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

let favoritesInitialized = false;

const Cards = ({
  imageSrc,
  title,
  rating,
  reviews,
  address,
  details,
  phone,
  whatsappNumber,
  category,
  price,
  priceType = "day",
  to,
  index = 0,
  businessId,
  ...props
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const favoriteIds = useSelector((state) => state.favorites.favoriteIds);
  const togglingIds = useSelector((state) => state.favorites.togglingIds);

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

  const safeRating =
    typeof rating === "object"
      ? Array.isArray(rating)
        ? rating.length
        : 0
      : rating || 0;

  const safeReviews =
    typeof reviews === "object"
      ? Array.isArray(reviews)
        ? reviews.length
        : 0
      : reviews || 0;

  const handlePhoneClick = (e) => {
    e.preventDefault();
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!whatsappNumber) {
      alert("WhatsApp number not available");
      return;
    }
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const handleEnquiryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/business-enquiry");
  };

  const handleFavClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (isToggling) return;
    if (isFavorited) {
      dispatch(removeFavorite(businessId));
    } else {
      dispatch(addFavorite(businessId));
    }
  };

  return (
    <>
    <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
    <Link to={to} state={props.state} className="card-link">
      <div className="base-card">

        <div className="card-image-wrapper">
          <div className="card-image-container">
            <LazyLoadImage
              src={imageSrc || EMPTY_PIXEL}
              placeholderSrc={EMPTY_PIXEL}
              alt={title}
              decoding="async"
              loading={index < 3 ? "eager" : "lazy"}
              effect="opacity"
              width="100%"
              height="100%"
              className="card-image"
            />
          </div>

          {businessId && (
            <button
              className={`fav-btn${isFavorited ? " fav-btn--active" : ""}${isToggling ? " fav-btn--loading" : ""}`}
              onClick={handleFavClick}
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorited
                ? <FavoriteIcon style={{ fontSize: 20, color: "#ef4444" }} />
                : <FavoriteBorderIcon style={{ fontSize: 20, color: "#ef4444" }} />}
            </button>
          )}
        </div>

        <div className="card-content">

          <div className="card-header-row">
            <h2 className="card-title">{title}</h2>

            {category?.toLowerCase().includes("hotel") && price && (
              <div className="price-box">
                ₹ {price}
                <span className="price-type">/ {priceType}</span>
              </div>
            )}
          </div>

          <div className="card-meta">
            <div className="rating-badge">
              <StarIcon style={{ fontSize: "16px" }} />
              {safeRating}
            </div>
            <span className="reviews-text">{safeReviews} Ratings</span>
          </div>

          <div className="card-row">
            {category && (
              <p className="card-category">
                <CategoryIcon className="icon" />
                {category}
              </p>
            )}
            {address && (
              <p className="card-address-inline">
                <LocationOnIcon className="icon" />
                {address}
              </p>
            )}
          </div>

          {details && (
            <p className="card-details">
              <InfoOutlinedIcon className="icon" />
              {details}
            </p>
          )}

          <div className="cardpage-actions">
            <button
              className="card-action-button phone-button"
              onClick={handlePhoneClick}
            >
              <PhoneIcon />
              Call
            </button>

            <button
              className="card-action-button whatsapp-button"
              onClick={handleWhatsAppClick}
            >
              <WhatsAppIcon />
              WhatsApp
            </button>

            <button
              className="card-action-button enquiry-button"
              onClick={handleEnquiryClick}
            >
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
