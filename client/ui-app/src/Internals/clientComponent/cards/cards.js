import React from "react";
import { Link } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import "./cards.css";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendIcon from "@mui/icons-material/Send";
import StarIcon from "@mui/icons-material/Star";
import ReviewsIcon from "@mui/icons-material/Reviews";
import { useNavigate } from "react-router-dom";

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

  window.open(`https://wa.me/${cleanNumber}`, "_blank", "noopener,noreferrer");
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

          <h2 className="card-title">{title}</h2>

          <div className="card-meta">

            <div className="meta-item">
              <StarIcon style={{ color: "#FFD700", fontSize: "18px" }} />
              <span>{safeRating}</span>
            </div>

            <div className="meta-item">
              <ReviewsIcon style={{ color: "#0288d1", fontSize: "18px" }} />
              <span>{safeReviews} Reviews</span>
            </div>

          </div>

          {category && (
            <p className="card-category">
              <InfoOutlinedIcon className="icon" />
              {category}
            </p>
          )}

          <p className="card-address">
            <LocationOnIcon className="icon" />
            {address}
          </p>

          <p className="card-details">
            <InfoOutlinedIcon className="icon" />
            {details}
          </p>

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
