// BusinessDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  getBusinessDetailsById,
  getBusinessDetailsBySlug,
} from "../../../redux/actions/businessListAction";

import "./cardDetails.css";

import UserRatingWidget from "../rating/rating";
import CardsSearch from "../../clientComponent/CardsSearch/CardsSearch";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpaIcon from "@mui/icons-material/Spa";
import EditIcon from "@mui/icons-material/Edit";
import ShareIcon from "@mui/icons-material/Share";
import PhoneIcon from "@mui/icons-material/Phone";
import DirectionsIcon from "@mui/icons-material/Directions";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import EmailIcon from "@mui/icons-material/Email";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LanguageIcon from "@mui/icons-material/Language";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CloseIcon from "@mui/icons-material/Close";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkIcon from "@mui/icons-material/Link";
import Tooltip from "@mui/material/Tooltip";

import Footer from "../footer/footer";
import ReviewList from "../rating/reviewList";
import { getBusinessReviews } from "../../../redux/actions/reviewAction.js";

const SimpleModal = ({ children, onClose, title }) => (
  <div
    className="business-CardDetails-modalOverlay"
    onClick={onClose}
  >
    <div
      className="business-CardDetails-modalContent"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="business-CardDetails-modalHeader">
        <h3 className="business-CardDetails-modalTitle">{title}</h3>
        <CloseIcon
          className="business-CardDetails-modalClose"
          onClick={onClose}
        />
      </div>
      <div className="business-CardDetails-modalBody">{children}</div>
    </div>
  </div>
);

const FullScreenGallery = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex || 0);

  useEffect(() => {
    setIndex(initialIndex || 0);
  }, [initialIndex]);

  if (!images || images.length === 0) return null;

  const currentImage = images[index];

  const nextSlide = () =>
    setIndex((prev) => (prev + 1) % images.length);
  const prevSlide = () =>
    setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div
      className="business-CardDetails-galleryOverlay"
      onClick={onClose}
    >
      <div
        className="business-CardDetails-galleryContent"
        onClick={(e) => e.stopPropagation()}
      >
        <CloseIcon
          className="business-CardDetails-galleryClose"
          onClick={onClose}
        />
        <div className="business-CardDetails-galleryHeader">
          {index + 1}/{images.length}
        </div>

        <div className="business-CardDetails-galleryMain">
          <button
            className="business-CardDetails-galleryNav business-CardDetails-galleryNav--prev"
            onClick={prevSlide}
          >
            {"<"}
          </button>
          <img
            src={
              currentImage ||
              "https://via.placeholder.com/1200x600?text=No+Image"
            }
            alt={`Business Media ${index + 1}`}
            className="business-CardDetails-galleryImage"
          />
          <button
            className="business-CardDetails-galleryNav business-CardDetails-galleryNav--next"
            onClick={nextSlide}
          >
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
};

const BusinessDetail = () => {
  const { location, businessSlug, id } = useParams();

  const dispatch = useDispatch();

  const { businessDetails, businessDetailsLoading, businessDetailsError } =
    useSelector(state => state.businessListReducer);

  const reviewState = useSelector(state => state.reviews || {});
  const totalReview = reviewState.total || 0;
  const [mainImage, setMainImage] = useState(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showFullHours, setShowFullHours] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [reviewLimit, setReviewLimit] = useState(3);

  const overviewRef = useRef(null);
  const quickInfoRef = useRef(null);
  const servicesRef = useRef(null);
  const photosRef = useRef(null);
  const reviewsRef = useRef(null);
  const business = businessDetails;

  useEffect(() => {
    if (id) {
      dispatch(getBusinessDetailsById(id));
    } else if (location && businessSlug) {
      dispatch(
        getBusinessDetailsBySlug({
          location,
          slug: businessSlug,
        })
      );
    }
  }, [dispatch, id, location, businessSlug]);

  useEffect(() => {
    if (business?._id) {
      dispatch(getBusinessReviews(business._id));
    }
  }, [dispatch, business?._id]);


  if (businessDetailsLoading) {
    return (
      <>
        <CardsSearch />
        <div className="business-CardDetails-pageWrapper">
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (businessDetailsError) {
    return (
      <>
        <CardsSearch />
        <div className="business-CardDetails-pageWrapper">
          <p style={{ color: "red" }}>{businessDetailsError}</p>
        </div>
        <Footer />
      </>
    );
  }



  if (!business) {
    return (
      <>
        <CardsSearch />
        <div className="business-CardDetails-pageWrapper">
          <p>No business found for this ID.</p>
        </div>
        <Footer />
      </>
    );
  }

  const galleryImageSrcs = business.businessImages || [];
  const fallbackImage =
    "https://via.placeholder.com/1200x400?text=Business+Image";

  const firstImage =
    business.bannerImage || galleryImageSrcs[0] || null;
  const bannerImageSrc = mainImage || firstImage || fallbackImage;

  const bannerIndex = mainImage
    ? Math.max(galleryImageSrcs.indexOf(mainImage), 0)
    : 0;

  const website = business.website;

  const addressParts = [
    business.plotNumber,
    business.street,
    business.location,
  ].filter(Boolean);
  const fullAddress =
    addressParts.length > 0
      ? addressParts.join(", ")
      : "Address not available";

  const displayedAverageRating = business.averageRating
    ? business.averageRating.toFixed(1)
    : "0.0";
  // const totalRatings = business?.reviews?.length || 0;

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const getTodayHours = () => {
    if (!business.openingHours || business.openingHours.length === 0)
      return "Open hours not available";
    const todayIndex = new Date().getDay();
    const todayName = daysOfWeek[todayIndex];
    const todayHour = business.openingHours.find(
      (h) => h.day === todayName
    );
    if (!todayHour) return "Open hours not available";
    return todayHour.isClosed
      ? "Closed today"
      : `${todayHour.open} - ${todayHour.close}`;
  };

  const getCollapsedHoursSummary = () => {
    if (!business.openingHours || business.openingHours.length === 0)
      return "Open hours not available";
    const openDays = business.openingHours.filter(
      (h) => !h.isClosed && h.open && h.close
    );
    const summary = openDays
      .slice(0, 2)
      .map(
        (h) =>
          `${h.day.substring(0, 3)}: ${h.open} - ${h.close}`
      )
      .join(", ");
    return summary || getTodayHours();
  };

  const getFullHoursList = () => {
    if (!business.openingHours) return [];
    return business.openingHours
      .slice()
      .sort(
        (a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day)
      );
  };

  const quickFactsRaw = [
    fullAddress,
    getTodayHours(),
    business.experience
      ? `${business.experience}+ Years in Business`
      : null,
    business.restaurantOptions || null,
  ];
  const quickFacts = quickFactsRaw.filter(Boolean);

  const getQuickFactIcon = (index) => {
    switch (index) {
      case 0:
        return <LocationOnIcon />;
      case 1:
        return <AccessTimeIcon />;
      case 3:
        return <SpaIcon />;
      default:
        return null;
    }
  };


  const getGoogleMapSrc = (iframeString) => {
    if (!iframeString) return null;
    const match = iframeString.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  };

  const handleCopyAddress = () => {
    if (!fullAddress) return;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(fullAddress)
        .then(() => alert("Address copied to clipboard!"))
        .catch((err) => console.error("Failed to copy:", err));
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = fullAddress;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Address copied to clipboard!");
    }
  };

  const handleCopyLink = (e) => {
    e.preventDefault();
    const linkToCopy = window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(linkToCopy)
        .then(() => {
          alert("Link copied!");
          setShowShareOptions(false);
        })
        .catch((err) =>
          console.error("Failed to copy link:", err)
        );
    } else {
      alert("Copy failed. Browser does not support clipboard.");
    }
  };

  const handleShowNumberClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowContactModal(true);
  };

  const handleCopyContact = () => {
    const contact = business.contact || "";
    if (!contact) return;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(contact)
        .then(() => {
          alert("Phone number copied!");
          setShowContactModal(false);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy. Please copy manually.");
        });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = contact;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Phone number copied!");
      setShowContactModal(false);
    }
  };

  const sectionRefMap = {
    Overview: overviewRef,
    "Quick Info": quickInfoRef,
    Services: servicesRef,
    Photos: photosRef,
    Reviews: reviewsRef,
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    const ref = sectionRefMap[tabName];
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleRateClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setActiveTab("Reviews");
    if (reviewsRef.current) {
      reviewsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleViewMoreReviews = () =>
    setReviewLimit((prev) => prev + 3);

  const currentUrl = encodeURIComponent(window.location.href);
  const currentTitle = encodeURIComponent(
    `Check out ${business.businessName}`
  );

  const allReviews = business.reviews || [];
  const reviewsToDisplay = allReviews.slice(0, reviewLimit);
  const hasMoreReviews = allReviews.length > reviewLimit;

  const overviewHtml = business.businessDetails;

  const normalizeOverviewHtml = (html = "") => {
    return html
      .replace(/<p>\s*(<br\s*\/?>|&nbsp;)?\s*<\/p>/gi, "")
      .replace(/<div>\s*(<br\s*\/?>|&nbsp;)?\s*<\/div>/gi, "")
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
      .replace(/ style="[^"]*"/gi, "")
      .trim();
  };

  return (
    <>
      <CardsSearch /><br /><br /><br /><br />
      <div className="business-CardDetails-pageWrapper">
        <section className="business-CardDetails-heroSection">
          <div
            className="business-CardDetails-mainImageContainer"
            onClick={() => {
              if (galleryImageSrcs.length > 0) {
                setCurrentSlideIndex(bannerIndex);
                setShowFullGallery(true);
              }
            }}
          >
            <img
              key={business?._id || business?.bannerImage}
              src={business?.bannerImage || "/placeholder.jpg"}
              alt={business?.businessName}
              className="business-CardDetails-bannerImage"
              loading="eager"
            />
            <div className="business-CardDetails-heroGradient" />
            <div className="business-CardDetails-heroMeta">
              <div className="business-CardDetails-heroMetaPrimary">
                <h1 className="business-CardDetails-heroName">
                  {business.businessName}
                </h1>
                <div className="business-CardDetails-heroRatingChip">
                  <span className="business-CardDetails-heroRatingScore">
                    {displayedAverageRating}
                  </span>
                  <span className="business-CardDetails-heroRatingStar">
                    ★
                  </span>
                  <span className="business-CardDetails-heroRatingCount">
                    {totalReview} rating
                    {totalReview !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <p className="business-CardDetails-heroAddress">
                {fullAddress}
              </p>
            </div>
          </div>

          {galleryImageSrcs.length > 0 && (
            <div className="business-CardDetails-thumbnails">
              {galleryImageSrcs.map((src, index) => (
                <img
                  key={index}
                  src={
                    src ||
                    "https://via.placeholder.com/80x80?text=No+Image"
                  }
                  alt={`${business.businessName} ${index + 1}`}
                  className={
                    "business-CardDetails-thumbnail" +
                    (bannerIndex === index
                      ? " business-CardDetails-thumbnail--active"
                      : "")
                  }
                  onClick={() => {
                    setMainImage(src);
                    setCurrentSlideIndex(index);
                    setShowFullGallery(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <div className="business-CardDetails-mainGrid">
          <div className="business-CardDetails-leftColumn">
            <div className="business-CardDetails-headerCard">
              <h2 className="business-CardDetails-businessName">
                {business.businessName}
              </h2>

              <div className="business-CardDetails-ratingRow">
                <span className="business-CardDetails-ratingBadge">
                  {displayedAverageRating} ★
                </span>
                <span className="business-CardDetails-ratingText">
                  {totalReview} ratings •{" "}
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Claim this business
                  </a>
                </span>
              </div>

              <div className="business-CardDetails-quickFactsRow">
                {quickFacts.map((fact, index) => (
                  <span
                    key={index}
                    className="business-CardDetails-quickFactItem"
                  >
                    {getQuickFactIcon(index)}
                    <span>{fact}</span>
                  </span>
                ))}
              </div>

              <div className="business-CardDetails-actionBar">
                <div className="business-CardDetails-actionLeft">
                  <button
                    onClick={handleShowNumberClick}
                    className="business-CardDetails-btn business-CardDetails-btn--primary"
                  >
                    <PhoneIcon style={{ fontSize: 20 }} />
                    Show Number
                  </button>

                  {business.whatsappNumber && (
                    <a
                      className="business-CardDetails-btn business-CardDetails-btn--whatsapp"
                      href={`https://wa.me/${business.whatsappNumber}?text=${currentTitle}%20${currentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon style={{ fontSize: 20 }} />
                      WhatsApp
                    </a>
                  )}

                  <span
                    className="business-CardDetails-iconBtn"
                    title="Edit Business"
                  >
                    <EditIcon style={{ fontSize: 20 }} />
                  </span>

                  <span
                    className="business-CardDetails-iconBtn business-CardDetails-shareBtn"
                    title="Share"
                    onClick={() =>
                      setShowShareOptions((prev) => !prev)
                    }
                  >
                    <ShareIcon style={{ fontSize: 20 }} />
                    {showShareOptions && (
                      <div className="business-CardDetails-sharePopup">
                        <a
                          href={`https://wa.me/?text=${currentTitle}%20${currentUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <WhatsAppIcon style={{ color: "#25D366" }} />
                        </a>
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FacebookIcon style={{ color: "#1877F2" }} />
                        </a>
                        <a
                          href="https://www.instagram.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <InstagramIcon style={{ color: "#E4405F" }} />
                        </a>
                        <button onClick={handleCopyLink}>
                          <LinkIcon />
                        </button>
                      </div>
                    )}
                  </span>
                </div>

                <div className="business-CardDetails-ratingInput">
                  <Tooltip
                    title="Click to rate this business"
                    arrow
                    placement="top"
                  >
                    <div>
                      <UserRatingWidget
                        businessId={business._id}
                        initialValue={business.averageRating || 0}
                        currentRatings={business.ratings || []}
                      />
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="business-CardDetails-tabsWrapper">
              <div className="business-CardDetails-tabs">
                {[
                  "Overview",
                  "Quick Info",
                  "Services",
                  "Photos",
                  "Reviews",
                ].map((tab) => (
                  <span
                    key={tab}
                    className={
                      "business-CardDetails-tab" +
                      (activeTab === tab
                        ? " business-CardDetails-tab--active"
                        : "")
                    }
                    onClick={() => handleTabClick(tab)}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="business-CardDetails-tabContent">
              <section
                ref={overviewRef}
                className="business-CardDetails-overviewCard"
              >
                <h2>Overview</h2>
                <div
                  className="business-CardDetails-overviewText"
                  dangerouslySetInnerHTML={{
                    __html: normalizeOverviewHtml(overviewHtml),
                  }}
                />
              </section>

              <section
                ref={quickInfoRef}
                className="business-CardDetails-infoBlock"
              >
                <h2>Quick Info</h2>
                <div className="business-CardDetails-infoGrid">
                  <div className="business-CardDetails-infoItem">
                    <span className="business-CardDetails-infoLabel">
                      Business
                    </span>
                    <span className="business-CardDetails-infoValue">
                      {business.businessName}
                    </span>
                  </div>
                  <div className="business-CardDetails-infoItem">
                    <span className="business-CardDetails-infoLabel">
                      Experience
                    </span>
                    <span className="business-CardDetails-infoValue">
                      {business.experience
                        ? `${business.experience}+ Years`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="business-CardDetails-infoItem">
                    <span className="business-CardDetails-infoLabel">
                      Category
                    </span>
                    <span className="business-CardDetails-infoValue">
                      {business.category || "N/A"}
                    </span>
                  </div>
                  <div className="business-CardDetails-infoItem">
                    <span className="business-CardDetails-infoLabel">
                      Address
                    </span>
                    <span className="business-CardDetails-infoValue">
                      {fullAddress}
                    </span>
                  </div>
                </div>
              </section>

              <section
                ref={servicesRef}
                className="business-CardDetails-infoBlock"
              >
                <h2>Services</h2>
                {business.services && business.services.length > 0 ? (
                  <ul className="business-CardDetails-servicesList">
                    {business.services.map((service, idx) => (
                      <li
                        key={idx}
                        className="business-CardDetails-servicePill"
                      >
                        {service}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Services information is not available.</p>
                )}
              </section>

              <section
                ref={photosRef}
                className="business-CardDetails-photosSection"
              >
                <h2>Photos</h2>
                {galleryImageSrcs.length > 0 ? (
                  <div className="business-CardDetails-photoGrid">
                    {galleryImageSrcs.map((src, index) => (
                      <img
                        key={index}
                        src={
                          src ||
                          "https://via.placeholder.com/300x200?text=No+Image"
                        }
                        alt={`${business.businessName} photo ${index + 1
                          }`}
                        className="business-CardDetails-photoItem"
                        onClick={() => {
                          setCurrentSlideIndex(index);
                          setShowFullGallery(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p>No photos uploaded yet.</p>
                )}
              </section>
              <section
                ref={reviewsRef}
                className="business-CardDetails-reviewsSection"
              >
                <h2>Reviews & Ratings</h2>

                <div className="business-CardDetails-startReview">
                  <UserRatingWidget
                    businessId={business._id}
                    initialValue={business.averageRating || 0}
                  />
                </div>

                <ReviewList businessId={business._id} />
              </section>

              {/* <section
                ref={reviewsRef}
                className="business-CardDetails-reviewsSection"
              >
                <div className="business-CardDetails-ratingsSummary">
                  <h2 className="business-CardDetails-sectionTitle">
                    Reviews &amp; Ratings
                  </h2>
                  <div className="business-CardDetails-averageRating">
                    <span className="business-CardDetails-averageScore">
                      {displayedAverageRating}
                    </span>
                    <span className="business-CardDetails-averageCount">
                      {totalRatings} Rating
                      {totalRatings !== 1 ? "s" : ""}
                    </span>
                    <p className="business-CardDetails-ratingSource">
                      MassClick rating index based on {totalRatings}{" "}
                      ratings across the web
                    </p>
                  </div>
                </div>

                <div className="business-CardDetails-startReview">
                  <h3>Start your Review</h3>
                  <UserRatingWidget
                    businessId={business._id}
                    initialValue={business.averageRating || 0}
                    currentRatings={business.ratings || []}
                  />
                </div>

                <div className="business-CardDetails-ratingTrend">
                  <h3>Recent rating trend</h3>
                  <div className="business-CardDetails-ratingTrendBar" />
                </div>

                <div className="business-CardDetails-userReviews">
                  <h3>User Reviews</h3>
                  <div className="business-CardDetails-reviewFilters">
                    <button className="business-CardDetails-filter business-CardDetails-filter--active">
                      Relevant
                    </button>
                    <button className="business-CardDetails-filter">
                      Latest
                    </button>
                    <button className="business-CardDetails-filter">
                      High to Low
                    </button>
                  </div>

                  {reviewsToDisplay.length > 0 ? (
                    reviewsToDisplay.map((review, index) => (
                      <div
                        key={review._id || index}
                        className="business-CardDetails-reviewCard"
                      >
                        <div className="business-CardDetails-reviewHeader">
                          <img
                            src={
                              review.userProfileImage
                                ? review.userProfileImage
                                : "https://via.placeholder.com/40"
                            }
                            alt={
                              review.userName || "Anonymous User"
                            }
                            className="business-CardDetails-reviewAvatar"
                          />
                          <div className="business-CardDetails-reviewUser">
                            <p className="business-CardDetails-reviewName">
                              {review.userName ||
                                "Anonymous User"}
                            </p>
                          </div>
                          <span className="business-CardDetails-reviewDate">
                            {review.createdAt
                              ? new Date(
                                review.createdAt
                              ).toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                              : "N/A"}
                          </span>
                        </div>

                        <div className="business-CardDetails-reviewStars">
                          {Array.from({ length: 5 }).map(
                            (_, starIndex) => (
                              <StarIcon
                                key={starIndex}
                                style={{
                                  fontSize: 20,
                                  color:
                                    starIndex < review.rating
                                      ? "#ffb300"
                                      : "#e0e0e0",
                                }}
                              />
                            )
                          )}
                        </div>

                        <p className="business-CardDetails-reviewText">
                          {review.ratingExperience ||
                            "No comment provided."}
                        </p>

                        <div className="business-CardDetails-reviewMeta">
                          {review.ratingLove &&
                            review.ratingLove.length > 0 && (
                              <p>
                                <strong>Likes:</strong>{" "}
                                {review.ratingLove.join(", ")}
                              </p>
                            )}
                          {review.ratingPhotos &&
                            review.ratingPhotos.length > 0 && (
                              <p>
                                <strong>
                                  Photos(
                                  {review.ratingPhotos.length})
                                </strong>{" "}
                                – View Photos
                              </p>
                            )}
                        </div>

                        <div className="business-CardDetails-reviewActions">
                          <span>
                            <CheckCircleIcon
                              style={{
                                fontSize: 18,
                                marginRight: 4,
                              }}
                            />
                            Helpful (0)
                          </span>
                          <span>
                            <NoteAltIcon
                              style={{
                                fontSize: 18,
                                marginRight: 4,
                              }}
                            />
                            Comment
                          </span>
                          <span>
                            <ShareIcon
                              style={{
                                fontSize: 18,
                                marginRight: 4,
                              }}
                            />
                            Share
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Be the first to leave a review!</p>
                  )}

                  {hasMoreReviews && (
                    <div className="business-CardDetails-viewMore">
                      <button
                        className="business-CardDetails-viewMoreBtn"
                        onClick={handleViewMoreReviews}
                      >
                        View More Reviews (
                        {allReviews.length - reviewLimit} remaining)
                      </button>
                    </div>
                  )}
                </div>
              </section> */}

            </div>

            {business.googleMap && (
              <div className="business-CardDetails-mapWrapper">
                <iframe
                  src={getGoogleMapSrc(business.googleMap)}
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Business Location"
                />
              </div>
            )}
          </div>

          <aside className="business-CardDetails-rightSidebar">
            <div className="business-CardDetails-sidebarCard">
              <h3 className="business-CardDetails-sidebarTitle">
                Contact
              </h3>
              <div className="business-CardDetails-contactRow">
                <PhoneIcon className="business-CardDetails-sidebarIcon" />
                <button
                  onClick={handleShowNumberClick}
                  className="business-CardDetails-contactLink"
                >
                  Show Number
                </button>
              </div>

              <h3 className="business-CardDetails-sidebarTitle">
                Address
              </h3>
              <p className="business-CardDetails-addressText">
                {fullAddress}
              </p>

              <div className="business-CardDetails-addressActions">
                {fullAddress && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="business-CardDetails-addressBtn"
                  >
                    <DirectionsIcon fontSize="small" />
                    Get Directions
                  </a>
                )}

                <button
                  className="business-CardDetails-addressBtn"
                  onClick={handleCopyAddress}
                >
                  <ContentCopyIcon fontSize="small" />
                  Copy
                </button>
              </div>

              {/* HOURS */}
              <div
                className="business-CardDetails-sidebarItem business-CardDetails-sidebarItem--expandable"
                onClick={() => setShowFullHours(!showFullHours)}
              >
                <div className="business-CardDetails-sidebarItemRow">
                  <AccessTimeIcon className="business-CardDetails-sidebarIcon" />
                  <span className="business-CardDetails-hoursSummary">
                    {getCollapsedHoursSummary()}
                  </span>
                  <span className="business-CardDetails-sidebarArrow">
                    {showFullHours ? (
                      <ArrowDropUpIcon />
                    ) : (
                      <ArrowDropDownIcon />
                    )}
                  </span>
                </div>
              </div>

              {showFullHours && (
                <div className="business-CardDetails-hoursList">
                  {getFullHoursList().map((hour) => (
                    <div
                      key={hour.day}
                      className="business-CardDetails-hoursRow"
                    >
                      <span>{hour.day}</span>
                      <span
                        className={
                          hour.isClosed
                            ? "business-CardDetails-hoursValue--closed"
                            : "business-CardDetails-hoursValue--open"
                        }
                      >
                        {hour.isClosed
                          ? "Closed"
                          : `${hour.open} - ${hour.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* OTHER ACTIONS */}
              <ul className="business-CardDetails-sidebarList">
                <li className="business-CardDetails-sidebarItem">
                  <NoteAltIcon className="business-CardDetails-sidebarIcon" />
                  Suggest New Timings
                </li>
                <li className="business-CardDetails-sidebarItem">
                  <EmailIcon className="business-CardDetails-sidebarIcon" />
                  Send Enquiry by Email
                </li>
                <li className="business-CardDetails-sidebarItem business-CardDetails-sidebarItem--highlight">
                  <InsertDriveFileIcon className="business-CardDetails-sidebarIcon" />
                  Get info via SMS/Email
                </li>
                <li className="business-CardDetails-sidebarItem">
                  <ShareIcon className="business-CardDetails-sidebarIcon" />
                  Share
                </li>
                <li
                  className="business-CardDetails-sidebarItem"
                  onClick={handleRateClick}
                >
                  <StarIcon className="business-CardDetails-sidebarIcon" />
                  Tap to rate
                </li>
                <li className="business-CardDetails-sidebarItem">
                  <EditIcon className="business-CardDetails-sidebarIcon" />
                  Edit this Listing
                </li>
                <li className="business-CardDetails-sidebarItem">
                  <CheckCircleIcon className="business-CardDetails-sidebarIcon" />
                  Claim this business
                </li>
                <li className="business-CardDetails-sidebarItem">
                  <LanguageIcon className="business-CardDetails-sidebarIcon" />
                  {website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="business-CardDetails-websiteLink"
                    >
                      Website
                    </a>
                  ) : (
                    <span className="business-CardDetails-websiteLink business-CardDetails-websiteLink--disabled">
                      Website not added
                    </span>
                  )}
                </li>
              </ul>
            </div>

            <div className="business-CardDetails-sidebarCard business-CardDetails-tagsCard">
              <h3 className="business-CardDetails-tagsTitle">
                Also listed in
              </h3>
              <div className="business-CardDetails-tags">
                <span className="business-CardDetails-tag">
                  Mangalorean Restaurants
                </span>
                <span className="business-CardDetails-tag">
                  Restaurants
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showContactModal && (
        <SimpleModal
          title={`Contact for ${business.businessName}`}
          onClose={() => setShowContactModal(false)}
        >
          <p>{business.contact || "N/A"}</p>
          <div className="business-CardDetails-modalActions">
            {business.contact && (
              <a
                href={`tel:${business.contact}`}
                className="business-CardDetails-btn business-CardDetails-btn--primary"
              >
                <PhoneIcon />
                Call Now
              </a>
            )}
            <button
              className="business-CardDetails-btn business-CardDetails-btn--secondary"
              onClick={handleCopyContact}
            >
              <ContentCopyIcon />
              Copy
            </button>
          </div>
        </SimpleModal>
      )}

      {showFullGallery && (
        <FullScreenGallery
          images={galleryImageSrcs}
          initialIndex={currentSlideIndex}
          onClose={() => setShowFullGallery(false)}
        />
      )}

      <Footer />
    </>
  );
};

export default BusinessDetail;
