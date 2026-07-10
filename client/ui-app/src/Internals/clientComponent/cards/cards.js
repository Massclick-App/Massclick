import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import WorkHistoryRoundedIcon from "@mui/icons-material/WorkHistoryRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { addFavorite, removeFavorite, fetchFavorites, getAuthUser } from "../../../redux/actions/favoriteAction";
import OTPLoginModal from "../AddBusinessModel.js";
import massClickLogo from "../../../assets/mclogo.png";

const cx = createScopedClassNames(styles);

const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
let favoritesInitialized = false;

const MAX_FILTER_BADGES = 3;

function getDisplayRating(value) {
  const ratingValue = Number(value);
  if (!Number.isFinite(ratingValue) || ratingValue <= 0) return "New";
  return ratingValue.toFixed(1);
}

function getReviewCount(value) {
  if (Array.isArray(value)) return value.length;
  const reviewValue = Number(value);
  return Number.isFinite(reviewValue) && reviewValue > 0 ? reviewValue : 0;
}

function formatDistance(km) {
  if (typeof km !== "number" || isNaN(km)) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function getFilterBadges(filters, filterConfig) {
  if (!filters || typeof filters !== "object") return [];

  // When filterConfig is available, use it to produce labelled badges in config order.
  if (Array.isArray(filterConfig) && filterConfig.length > 0) {
    const badges = [];
    for (const fc of filterConfig) {
      if (badges.length >= MAX_FILTER_BADGES) break;
      if (fc.enabled === false) continue;
      const val = filters[fc.key];
      if (val === null || val === undefined || val === "" || val === false) continue;
      if (Array.isArray(val) && val.length > 0) {
        badges.push(`${fc.label}: ${val[0]}${val.length > 1 ? ` +${val.length - 1}` : ""}`);
      } else if (val === true) {
        badges.push(fc.label);
      } else if (typeof val === "string" || typeof val === "number") {
        badges.push(`${fc.label}: ${val}`);
      }
    }
    return badges;
  }

  // Fallback: raw value dump when no filterConfig (backward compat / other pages).
  const badges = [];
  for (const val of Object.values(filters)) {
    if (badges.length >= MAX_FILTER_BADGES) break;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (badges.length >= MAX_FILTER_BADGES) break;
        if (v && typeof v === "string") badges.push(v);
      }
    } else if (val === true) {
      // skip boolean toggles without label context
    } else if (val && typeof val === "string") {
      badges.push(val);
    }
  }
  return badges;
}

const Cards = ({
  imageSrc,
  logoImage,
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
  isTrusted = false,
  certificateType = "verified",
  isFeatured = false,
  isSponsored = false,
  isTrending = false,
  filters,
  filterConfig = [],
  distance = null,
  viewMode = "list",
  cardVariant = "",
  compact = false,
  ...props
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState(
    certificateType === "trust" || isTrusted ? "trust" : "verified"
  );
  const [chipsExpanded, setChipsExpanded] = useState(false);
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

  const safeRating = getDisplayRating(rating);
  const safeReviews = getReviewCount(reviews);
  const reviewsLabel = safeReviews > 0
    ? `${safeReviews} rating${safeReviews !== 1 ? "s" : ""}`
    : "No ratings yet";
  const filterBadges = getFilterBadges(filters, filterConfig);
  const distanceLabel = formatDistance(distance);
  const priceFilterDisabled = filterConfig.some(
    fc => (fc.key === "price" || fc.key === "priceRange") && fc.enabled === false
  );
  const certificateLocation = address || "Business location verified by MassClick";
  const businessLogo = logoImage || imageSrc || "";
  const hasTrustCertificate = isTrusted || certificateType === "trust" || isFeatured;
  const currentCertificate = activeCertificate === "trust"
    ? {
        key: "trust",
        eyebrow: "Certificate of",
        label: "Trust",
        copy: "has been certified as a trusted member of MassClick",
        detailWord: "trusted",
        icon: <WorkspacePremiumRoundedIcon />,
      }
    : {
        key: "verified",
        eyebrow: "",
        label: "Verified",
        copy: "has been verified by MassClick",
        detailWord: "verified",
        icon: <VerifiedRoundedIcon />,
      };

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

  useEffect(() => {
    if (!showCertificate) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCertificate]);

  const handleCertificateClick = (type = "verified") => e => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCertificate(type);
    setShowCertificate(true);
  };

  const handleCloseCertificate = e => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowCertificate(false);
  };

  const renderTitle = () => (
    <span>{title}</span>
  );

  const renderStatusBadges = () => (
    <>
      {hasTrustCertificate && (
        <button
          type="button"
          className={cx("status-badge", "status-badge--trust")}
          onClick={handleCertificateClick("trust")}
          aria-label={`Open MassClick trust certificate for ${title}`}
        >
          <WorkspacePremiumRoundedIcon />
          <span>Trust</span>
        </button>
      )}
      {isVerified && (
        <button
          type="button"
          className={cx("status-badge", "status-badge--verified")}
          onClick={handleCertificateClick("verified")}
          aria-label={`Open MassClick verified certificate for ${title}`}
        >
          <VerifiedRoundedIcon />
          <span>Verified</span>
        </button>
      )}
      {isSponsored && (
        <span className={cx("status-badge", "status-badge--sponsored")}>
          <DiamondRoundedIcon />
          <span>Sponsored</span>
        </span>
      )}
      {isTrending && (
        <span className={cx("status-badge", "status-badge--trending")}>
          <LocalFireDepartmentRoundedIcon />
          <span>Trending</span>
        </span>
      )}
    </>
  );

  return (
    <>
      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
      {showCertificate && createPortal(
        <div
          className={cx("certificate-overlay", `certificate-overlay--${currentCertificate.key}`)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`massclick-certificate-${businessId || index}`}
          onClick={handleCloseCertificate}
        >
          <div className={cx("certificate-frame")} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={cx("certificate-close")}
              aria-label="Close certificate"
              onClick={handleCloseCertificate}
            >
              <CloseRoundedIcon />
            </button>
            <div className={cx("certificate-paper", `certificate-paper--${currentCertificate.key}`)}>
              {currentCertificate.eyebrow && (
                <p className={cx("certificate-eyebrow")}>{currentCertificate.eyebrow}</p>
              )}
              <div className={cx("certificate-mark")}>
                {currentCertificate.icon}
                <span>{currentCertificate.label}</span>
              </div>
              <div className={cx("certificate-identity")}>
                <div className={cx("certificate-business-logo")}>
                  {businessLogo ? (
                    <img src={businessLogo} alt={`${title} logo`} />
                  ) : (
                    <span>{String(title || "MC").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h3 id={`massclick-certificate-${businessId || index}`} className={cx("certificate-title")}>
                  {title}
                </h3>
                <p className={cx("certificate-location")}>{certificateLocation}</p>
              </div>
              <p className={cx("certificate-status-copy")}>{currentCertificate.copy}</p>
              {currentCertificate.key === "trust" && (
                <div className={cx("certificate-stars")} aria-label="Trusted rating">
                  <StarRoundedIcon />
                  <StarRoundedIcon />
                  <StarRoundedIcon />
                  <StarRoundedIcon />
                  <StarRoundedIcon />
                </div>
              )}
              <div className={cx("certificate-divider")} />
              <p className={cx("certificate-copy")}>
                Following details of the company have been <strong>{currentCertificate.detailWord}</strong>
              </p>
              <div className={cx("certificate-checks")}>
                <div className={cx("certificate-check")}>
                  <CheckBoxRoundedIcon />
                  <span>Business Proof</span>
                </div>
                <div className={cx("certificate-check")}>
                  <CheckBoxRoundedIcon />
                  <span>Business Address</span>
                </div>
                <div className={cx("certificate-check")}>
                  <CheckBoxRoundedIcon />
                  <span>Mobile Number</span>
                </div>
                <div className={cx("certificate-check")}>
                  <CheckBoxRoundedIcon />
                  <span>Email ID</span>
                </div>
              </div>
              <div className={cx("certificate-brand")}>
                <img src={massClickLogo} alt="MassClick" />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <Link to={to} state={props.state} className={cx("card-link")}>
        <div className={cx("base-card", `base-card--${viewMode}`, cardVariant && `base-card--${cardVariant}`, compact && "base-card--compact")}>
      
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

          {/* Content — list mode uses a completely separate row layout */}
          {viewMode === "list" ? (
            <div className={cx("list-content")}>
              <div className={cx("list-info")}>
                <div className={cx("card-header-row")}>
                  <h3 className={cx("card-title")}>{renderTitle()}</h3>
                  {(() => {
                    const displayPrice = !priceFilterDisabled && (filters?.price || filters?.priceRange || price || null);
                    return displayPrice ? (
                      <div className={cx("price-box")}>₹{displayPrice}<span className={cx("price-type")}>/{priceType}</span></div>
                    ) : null;
                  })()}
                </div>
                <div className={cx("card-meta")}>
                  <span className={cx("rating-badge", safeRating === "New" && "rating-badge--new")}><StarRoundedIcon style={{ fontSize: 13 }} />{safeRating}</span>
                  <span className={cx("reviews-text")}>{reviewsLabel}</span>
                  {category && <span className={cx("category-pill")}>{category}</span>}
                  {distanceLabel && <span className={cx("distance-chip")}>{distanceLabel}</span>}
                </div>
                {(isVerified || hasTrustCertificate || isSponsored || isTrending) && (
                  <div className={cx("card-status-row")}>{renderStatusBadges()}</div>
                )}
                <div className={cx("card-info")}>
                  {address && <p className={cx("card-address-inline")}><LocationOnIcon className={cx("icon")} /><span>{address}</span></p>}
                  {category?.toLowerCase().includes("bank") && contactList && <p className={cx("card-ifsc")}>IFSC: {contactList}</p>}
                  {experience != null && experience !== "" && <p className={cx("card-details")}><WorkHistoryRoundedIcon className={cx("icon")} />{experience}+ yrs experience</p>}
                  {filterBadges.length > 0 && (
                    <div className={cx("filter-badges")}>
                      {filterBadges.map(badge => <span key={badge} className={cx("filter-badge")}>{badge}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className={cx("list-actions")}>
                <button className={cx("card-action-button phone-button")} onClick={handlePhoneClick}><PhoneIcon />Call</button>
                <button className={cx("card-action-button whatsapp-button")} onClick={handleWhatsAppClick}><WhatsAppIcon />WhatsApp</button>
                <button className={cx("card-action-button enquiry-button")} onClick={handleEnquiryClick}><SendIcon />Enquiry</button>
              </div>
            </div>
          ) : (
            <div className={cx("card-content")}>
              <div className={cx("card-top")}>
                <div className={cx("card-header-row")}>
                  <h3 className={cx("card-title")}>{renderTitle()}</h3>
                  {(() => {
                    const displayPrice = !priceFilterDisabled && (filters?.price || filters?.priceRange || price || null);
                    return displayPrice ? (
                      <div className={cx("price-box")}>₹{displayPrice}<span className={cx("price-type")}>/{priceType}</span></div>
                    ) : null;
                  })()}
                </div>
                <div className={cx("card-meta")}>
                  <span className={cx("rating-badge", safeRating === "New" && "rating-badge--new")}><StarRoundedIcon style={{ fontSize: 13 }} />{safeRating}</span>
                  <span className={cx("reviews-text")}>{reviewsLabel}</span>
                  {category && <span className={cx("category-pill")}>{category}</span>}
                  {distanceLabel && <span className={cx("distance-chip")}>{distanceLabel}</span>}
                </div>
                {(isVerified || hasTrustCertificate || isSponsored || isTrending) && (
                  <div className={cx("card-status-row")}>{renderStatusBadges()}</div>
                )}
              </div>
              <div className={cx("card-info")}>
                {address && <p className={cx("card-address-inline")}><LocationOnIcon className={cx("icon")} /><span>{address}</span></p>}
                {category?.toLowerCase().includes("bank") && contactList && <p className={cx("card-ifsc")}>IFSC: {contactList}</p>}
                {experience != null && experience !== "" && <p className={cx("card-details")}><WorkHistoryRoundedIcon className={cx("icon")} />{experience}+ yrs experience</p>}
                {filterBadges.length > 0 && (() => {
                  const isGrid = viewMode === "grid" || viewMode === "large";
                  const LIMIT = 2;
                  const shown = isGrid && !chipsExpanded ? filterBadges.slice(0, LIMIT) : filterBadges;
                  const remaining = filterBadges.length - LIMIT;
                  return (
                    <div className={cx("filter-badges", isGrid && "filter-badges--nowrap")}>
                      {shown.map(badge => <span key={badge} className={cx("filter-badge")}>{badge}</span>)}
                      {isGrid && !chipsExpanded && remaining > 0 && (
                        <span className={cx("filter-badge", "filter-badge-more")} onClick={e => { e.preventDefault(); e.stopPropagation(); setChipsExpanded(true); }}>+{remaining} more</span>
                      )}
                      {isGrid && chipsExpanded && (
                        <span className={cx("filter-badge", "filter-badge-more")} onClick={e => { e.preventDefault(); e.stopPropagation(); setChipsExpanded(false); }}>less</span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className={cx("cardpage-actions")}>
                <button className={cx("card-action-button phone-button")} onClick={handlePhoneClick}><PhoneIcon />Call</button>
                <button className={cx("card-action-button whatsapp-button")} onClick={handleWhatsAppClick}><WhatsAppIcon />WhatsApp</button>
                <button className={cx("card-action-button enquiry-button")} onClick={handleEnquiryClick}><SendIcon />Enquiry</button>
              </div>
            </div>
          )}
        </div>
      </Link>
    </>
  );
};

export default Cards;
