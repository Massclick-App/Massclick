import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import "./cards.css";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendIcon from "@mui/icons-material/Send";
import StarIcon from "@mui/icons-material/Star";
import CategoryIcon from '@mui/icons-material/Category';

const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

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
  ...props
}) => {

  const navigate = useNavigate();

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

  return (
    <Link to={to} state={props.state} className="card-link">
      <div className="base-card">

        <div className="card-image-container">
          <LazyLoadImage
            src={imageSrc || EMPTY_PIXEL}
            placeholderSrc={EMPTY_PIXEL}
            alt={title}
            decoding="async"
            loading={index < 3 ? "eager" : "lazy"}
            effect="opacity"
            className="card-image"
          />
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

            <span className="reviews-text">
              {safeReviews} Ratings
            </span>

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
  );
};

export default Cards;