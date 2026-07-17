import { createScopedClassNames } from "../../../utils/createScopedClassNames";
// BusinessDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getPlaceholderImage } from "../../../utils/placeholderImage";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { getBusinessDetailsById, getBusinessDetailsBySlug, editBusinessList, sendEnquiryLead, sendBusinessInfo } from "../../../redux/actions/businessListAction";
import { createUserFeedback } from "../../../redux/actions/userFeedbackAction";
import styles from "./cardDetails.module.css";
import UserRatingWidget from "../rating/rating";
import StickySearchBar from '../StickySearchBar/StickySearchBar';
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs.js";
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
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LanguageIcon from "@mui/icons-material/Language";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CloseIcon from "@mui/icons-material/Close";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkIcon from "@mui/icons-material/Link";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Tooltip from "@mui/material/Tooltip";
import Footer from "../footer/footer";
import ReviewList from "../rating/reviewList";
import { getBusinessReviews } from "../../../redux/actions/reviewAction.js";
import GlobalSkeleton from "../globalSkeleton.js";
import { addFavorite, removeFavorite, fetchFavorites, getAuthUser } from "../../../redux/actions/favoriteAction";
import { generateLocalBusinessSchema, generateBreadcrumbSchema } from "../../../utils/seoSchemaGenerators";
import OTPLoginModal from "../AddBusinessModel.js";
import PopularCategoriesLink from "../popularCategories/popularCategories.js";
import massClickLogo from "../../../assets/mclogo.webp";
const cx = createScopedClassNames(styles);
const toSlug = (text = "") => String(text).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
const SimpleModal = ({
  children,
  onClose,
  title
}) => <div className={cx("business-CardDetails-modalOverlay")} onClick={onClose}>
    <div className={cx("business-CardDetails-modalContent")} onClick={e => e.stopPropagation()}>
      <div className={cx("business-CardDetails-modalHeader")}>
        <h3 className={cx("business-CardDetails-modalTitle")}>{title}</h3>
        <CloseIcon className={cx("business-CardDetails-modalClose")} onClick={onClose} />
      </div>
      <div className={cx("business-CardDetails-modalBody")}>{children}</div>
    </div>
  </div>;
const FullScreenGallery = ({
  images,
  initialIndex,
  onClose
}) => {
  const [index, setIndex] = useState(initialIndex || 0);
  useEffect(() => {
    setIndex(initialIndex || 0);
  }, [initialIndex]);
  if (!images || images.length === 0) return null;
  const currentImage = images[index];
  const nextSlide = () => setIndex(prev => (prev + 1) % images.length);
  const prevSlide = () => setIndex(prev => (prev - 1 + images.length) % images.length);
  return <div className={cx("business-CardDetails-galleryOverlay")} onClick={onClose}>
      <div className={cx("business-CardDetails-galleryContent")} onClick={e => e.stopPropagation()}>
        <CloseIcon className={cx("business-CardDetails-galleryClose")} onClick={onClose} />
        <div className={cx("business-CardDetails-galleryHeader")}>
          {index + 1}/{images.length}
        </div>

        <div className={cx("business-CardDetails-galleryMain")}>
          <button className={cx("business-CardDetails-galleryNav business-CardDetails-galleryNav--prev")} onClick={prevSlide}>
            {"<"}
          </button>
          <img src={currentImage || getPlaceholderImage()} alt={`Business Media ${index + 1}`} className={cx("business-CardDetails-galleryImage")} loading="lazy" decoding="async" />
          <button className={cx("business-CardDetails-galleryNav business-CardDetails-galleryNav--next")} onClick={nextSlide}>
            {">"}
          </button>
        </div>
      </div>
    </div>;
};
const BusinessDetail = React.memo(() => {
  const {
    location,
    businessSlug,
    id
  } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    businessDetails,
    businessDetailsLoading,
    businessDetailsError
  } = useSelector(state => state.businessListReducer);
  const reviewState = useSelector(state => state.reviews || {});
  const totalReview = reviewState.total || 0;
  const loadedReviews = Array.isArray(reviewState.reviews) ? reviewState.reviews : [];
  const favoriteIds = useSelector(state => state.favorites.favoriteIds);
  const togglingIds = useSelector(state => state.favorites.togglingIds);
  const favUser = getAuthUser();
  const isFavLoggedIn = !!favUser?._id;
  const business = businessDetails;
  const {
    enqueueSnackbar
  } = useSnackbar();
  const normalizePhone = value => String(value || "").replace(/\D/g, "");
  const storedMobileNumber = localStorage.getItem("mobileNumber") || "";
  const authUser = getAuthUser();
  const currentUserPhone = normalizePhone(storedMobileNumber) || normalizePhone(authUser?.mobileNumber1) || normalizePhone(authUser?.mobileNumber2);
  const businessOwnerPhone = normalizePhone(business?.contactList || business?.contact || "");
  const isBusinessImageUploadAllowed = !!authUser && !!currentUserPhone && currentUserPhone === businessOwnerPhone;
  useEffect(() => {
    if (isFavLoggedIn && business?._id && favoriteIds.length === 0) {
      dispatch(fetchFavorites());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFavLoggedIn, business?._id]);
  const [mainImage, setMainImage] = useState(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showFullHours, setShowFullHours] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [sidebarModal, setSidebarModal] = useState(null);
  const [sidebarSubmitting, setSidebarSubmitting] = useState(false);
  const [pendingSidebarAction, setPendingSidebarAction] = useState(null);
  const [timingSuggestion, setTimingSuggestion] = useState({
    days: "",
    openingTime: "",
    closingTime: "",
    note: ""
  });
  const [enquiryForm, setEnquiryForm] = useState({
    name: authUser?.userName || authUser?.name || "",
    mobile: authUser?.mobileNumber1 || storedMobileNumber || "",
    email: authUser?.email || authUser?.emailId || "",
    message: ""
  });
  const [infoForm, setInfoForm] = useState({
    name: authUser?.userName || authUser?.name || "",
    mobile: authUser?.mobileNumber1 || storedMobileNumber || "",
    email: authUser?.email || authUser?.emailId || ""
  });
  const [requestNote, setRequestNote] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState("verified");
  const [activeTab, setActiveTab] = useState("Overview");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const overviewRef = useRef(null);
  const quickInfoRef = useRef(null);
  const servicesRef = useRef(null);
  const photosRef = useRef(null);
  const reviewsRef = useRef(null);
  useEffect(() => {
    if (!showCertificate) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCertificate]);
  useEffect(() => {
    if (id) {
      dispatch(getBusinessDetailsById(id));
    } else if (location && businessSlug) {
      dispatch(getBusinessDetailsBySlug({
        location,
        slug: businessSlug
      }));
    }
  }, [dispatch, id, location, businessSlug]);
  useEffect(() => {
    if (business?._id) {
      dispatch(getBusinessReviews(business._id));
    }
  }, [dispatch, business?._id]);
  useEffect(() => {
    const resumeSidebarAction = () => {
      if (!pendingSidebarAction || !getAuthUser()?._id) return;
      const action = pendingSidebarAction;
      setPendingSidebarAction(null);
      setShowLoginModal(false);
      setSidebarModal(action);
    };
    window.addEventListener("authChange", resumeSidebarAction);
    return () => window.removeEventListener("authChange", resumeSidebarAction);
  }, [pendingSidebarAction]);
  if (businessDetailsLoading) {
    return <>
        <StickySearchBar />
        <GlobalSkeleton type="details" />
        <Footer />
      </>;
  }
  if (businessDetailsError) {
    return <>
        <StickySearchBar />
        <div className={cx("business-CardDetails-pageWrapper")}>
          <p style={{
          color: "red"
        }}>{businessDetailsError}</p>
        </div>
        <Footer />
      </>;
  }
  if (!business) {
    return <>
        <StickySearchBar />
        <div className={cx("business-CardDetails-pageWrapper")}>
          <p>No business found for this ID.</p>
        </div>
        <Footer />
      </>;
  }
  const galleryImageSrcs = business.businessImages || [];
  const fallbackImage = getPlaceholderImage();
  const firstImage = business.bannerImage || galleryImageSrcs[0] || null;
  const bannerImageSrc = mainImage || firstImage || fallbackImage;
  const businessLogoSrc = business.logoImage || firstImage || "";
  const bannerIndex = mainImage ? Math.max(galleryImageSrcs.indexOf(mainImage), 0) : 0;
  const website = business.website;
  const formattedWebsite = website && website.startsWith("http") ? website : `https://${website}`;
  const addressParts = [business.plotNumber, business.street, business.location].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "Address not available";
  const loadedReviewRatings = loadedReviews
    .map(review => Number(review.rating))
    .filter(value => Number.isFinite(value) && value > 0);
  const loadedAverageRating = loadedReviewRatings.length > 0
    ? loadedReviewRatings.reduce((sum, value) => sum + value, 0) / loadedReviewRatings.length
    : null;
  const storedAverageRating = Number(business.averageRating);
  const averageRatingValue = Number.isFinite(storedAverageRating) && storedAverageRating > 0
    ? storedAverageRating
    : loadedAverageRating;
  const displayedAverageRating = averageRatingValue ? averageRatingValue.toFixed(1) : "New";
  const effectiveTotalReview = Math.max(Number(business.totalReviews) || 0, totalReview, loadedReviewRatings.length);
  const ratingSummaryLabel = effectiveTotalReview > 0
    ? `${effectiveTotalReview} rating${effectiveTotalReview !== 1 ? "s" : ""}`
    : "No ratings yet";
  // const totalRatings = business?.reviews?.length || 0;

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const getTodayHours = () => {
    if (!business.openingHours || business.openingHours.length === 0) return "Open hours not available";
    const todayIndex = new Date().getDay();
    const todayName = daysOfWeek[todayIndex];
    const todayHour = business.openingHours.find(h => h.day === todayName);
    if (!todayHour) return "Open hours not available";
    return todayHour.isClosed ? "Closed today" : `${todayHour.open} - ${todayHour.close}`;
  };
  const getCollapsedHoursSummary = () => {
    if (!business.openingHours || business.openingHours.length === 0) return "Open hours not available";
    const openDays = business.openingHours.filter(h => !h.isClosed && h.open && h.close);
    const summary = openDays.slice(0, 2).map(h => `${h.day.substring(0, 3)}: ${h.open} - ${h.close}`).join(", ");
    return summary || getTodayHours();
  };
  const getFullHoursList = () => {
    if (!business.openingHours) return [];
    return business.openingHours.slice().sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));
  };
  const quickFactsRaw = [fullAddress, getTodayHours(), business.experience ? `${business.experience}+ Years in Business` : null, business.restaurantOptions || null];
  const quickFacts = quickFactsRaw.filter(Boolean);
  const isVerified = !!business.verification?.isVerified;
  const certificateType = business.verification?.certificateType || business.verification?.verificationType;
  const isTrusted = !!(business.badges?.isTrusted || business.badges?.isTrust || business.verification?.isTrusted || certificateType === "trust");
  const statusBadges = [
    isVerified && { key: "verified", label: "Verified", icon: <VerifiedRoundedIcon />, className: "business-CardDetails-statusBadge--verified", certificateKey: "verified" },
    isTrusted && { key: "trust", label: "Trust Certificate", icon: <WorkspacePremiumRoundedIcon />, className: "business-CardDetails-statusBadge--trust", certificateKey: "trust" },
    business.badges?.isFeatured && { key: "featured", label: "Featured", icon: <WorkspacePremiumRoundedIcon />, className: "business-CardDetails-statusBadge--featured" },
    business.badges?.isSponsored && { key: "sponsored", label: "Sponsored", icon: <DiamondRoundedIcon />, className: "business-CardDetails-statusBadge--sponsored" },
    business.badges?.isTrending && { key: "trending", label: "Trending", icon: <LocalFireDepartmentRoundedIcon />, className: "business-CardDetails-statusBadge--trending" }
  ].filter(Boolean);
  const currentCertificate = activeCertificate === "trust"
    ? {
        key: "trust",
        eyebrow: "Certificate of",
        label: "Trust",
        copy: "has been certified as a trusted member of MassClick",
        detailWord: "trusted",
        icon: <WorkspacePremiumRoundedIcon />
      }
    : {
        key: "verified",
        eyebrow: "",
        label: "Verified",
        copy: "has been verified by MassClick",
        detailWord: "verified",
        icon: <VerifiedRoundedIcon />
      };
  const savedCertificateUrl = activeCertificate === "trust"
    ? business.certificates?.trustCertificateUrl
    : business.certificates?.verifiedCertificateUrl;
  const certificateLabels = statusBadges
    .filter(item => item.key === "verified" || item.key === "trust")
    .map(item => item.label);
  const heroHighlights = [
    business.category,
    isVerified ? "Verified" : null,
    isTrusted ? "Trust Certificate" : null,
    getTodayHours(),
    business.experience ? `${business.experience}+ years experience` : null
  ].filter(Boolean);
  const rawKeywords = Array.isArray(business.keywords) ? business.keywords : typeof business.keywords === "string" ? business.keywords.split(",") : [];
  const businessKeywords = Array.from(new Set(rawKeywords.map(keyword => String(keyword).trim()).filter(Boolean)));
  const visibleKeywords = showAllKeywords ? businessKeywords : businessKeywords.slice(0, 10);
  const hasMoreKeywords = businessKeywords.length > visibleKeywords.length;
  const keywordLocationSlug = toSlug(business.location || location || "all");
  const keywordCategory = business.category || business.slug || "";
  const keywordCategorySlug = toSlug(keywordCategory);
  const handleGalleryFileSelection = async event => {
    if (!isBusinessImageUploadAllowed) {
      enqueueSnackbar("You are not the owner of this business. Upload is not allowed.", {
        variant: "error"
      });
      if (event.target) event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    try {
      const images = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      setNewGalleryImages(prev => [...prev, ...images]);
      setUploadError("");
    } catch (error) {
      setUploadError("Unable to read selected images. Please try again.");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };
  const openGalleryFileDialog = () => {
    if (!isBusinessImageUploadAllowed) {
      enqueueSnackbar("You are not the owner of this business. Upload is not allowed.", {
        variant: "error"
      });
      return;
    }
    fileInputRef.current?.click();
  };
  const handleUploadBusinessImages = async () => {
    if (!isBusinessImageUploadAllowed) {
      enqueueSnackbar("You are not the owner of this business. Upload is not allowed.", {
        variant: "error"
      });
      return;
    }
    if (!newGalleryImages.length || !business?._id) return;
    setIsUploadingImages(true);
    setUploadError("");
    try {
      await dispatch(editBusinessList(business._id, {
        businessImages: newGalleryImages
      }));
      setNewGalleryImages([]);
      await dispatch(getBusinessDetailsById(business._id));
      enqueueSnackbar("Images uploaded successfully", {
        variant: "success"
      });
    } catch (error) {
      setUploadError(error?.response?.data?.message || error?.message || "Upload failed. Please try again.");
      enqueueSnackbar(error?.response?.data?.message || error?.message || "Upload failed. Please try again.", {
        variant: "error"
      });
    } finally {
      setIsUploadingImages(false);
    }
  };
  const getQuickFactIcon = index => {
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
  const getGoogleMapSrc = iframeString => {
    if (!iframeString) return null;
    const match = iframeString.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  };
  const handleCopyAddress = () => {
    if (!fullAddress) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullAddress).then(() => alert("Address copied to clipboard!")).catch(() => {});
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = fullAddress;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Address copied to clipboard!");
    }
  };
  const handleCopyLink = e => {
    e.preventDefault();
    const linkToCopy = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(linkToCopy).then(() => {
        alert("Link copied!");
        setShowShareOptions(false);
      }).catch(() => {});
    } else {
      alert("Copy failed. Browser does not support clipboard.");
    }
  };
  const handleCertificateClick = type => e => {
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
  const renderStatusBadge = badge => {
    const className = cx("business-CardDetails-statusBadge", badge.className);
    if (badge.certificateKey) {
      return <button key={badge.key} type="button" className={className} onClick={handleCertificateClick(badge.certificateKey)} aria-label={`Open MassClick ${badge.label} certificate for ${business.businessName}`}>
          {badge.icon}
          {badge.label}
        </button>;
    }
    return <span key={badge.key} className={className}>
        {badge.icon}
        {badge.label}
      </span>;
  };
  const handleShowNumberClick = e => {
    if (e && e.preventDefault) e.preventDefault();
    setShowContactModal(true);
  };
  const handleCopyContact = () => {
    const contact = business.contact || "";
    if (!contact) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(contact).then(() => {
        alert("Phone number copied!");
        setShowContactModal(false);
      }).catch(err => {
        alert("Failed to copy. Please copy manually.");
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = contact;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
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
    Reviews: reviewsRef
  };
  const handleTabClick = tabName => {
    setActiveTab(tabName);
    const ref = sectionRefMap[tabName];
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  const handleRateClick = e => {
    if (e && e.stopPropagation) e.stopPropagation();
    setActiveTab("Reviews");
    if (reviewsRef.current) {
      reviewsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  const openSidebarAction = action => {
    const user = getAuthUser();
    if (!user?._id) {
      setPendingSidebarAction(action);
      setShowLoginModal(true);
      enqueueSnackbar("Please log in to continue.", { variant: "info" });
      return;
    }
    setSidebarModal(action);
    if (action === "enquiry" || action === "info") {
      setEnquiryForm(current => ({
        ...current,
        name: current.name || user.userName || user.name || "",
        mobile: current.mobile || user.mobileNumber1 || storedMobileNumber || "",
        email: current.email || user.email || user.emailId || ""
      }));
      setInfoForm(current => ({
        name: current.name || user.userName || user.name || "",
        mobile: current.mobile || user.mobileNumber1 || storedMobileNumber || "",
        email: current.email || user.email || user.emailId || ""
      }));
    }
  };
  const handleShare = async () => {
    const shareData = {
      title: business.businessName,
      text: `Check out ${business.businessName} on MassClick`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    setSidebarModal("share");
  };
  const handleEditListing = () => {
    const user = getAuthUser();
    if (!user?._id) {
      setPendingSidebarAction("edit");
      setShowLoginModal(true);
      enqueueSnackbar("Please log in to edit this listing.", { variant: "info" });
      return;
    }
    if (isBusinessImageUploadAllowed) {
      navigate("/user_edit-profile");
      return;
    }
    setSidebarModal("edit");
  };
  const handleTimingSuggestionSubmit = async e => {
    e.preventDefault();
    if (!timingSuggestion.days || !timingSuggestion.openingTime || !timingSuggestion.closingTime) {
      enqueueSnackbar("Please select the days, opening time, and closing time.", { variant: "warning" });
      return;
    }
    if (timingSuggestion.openingTime >= timingSuggestion.closingTime) {
      enqueueSnackbar("Closing time must be later than opening time.", { variant: "warning" });
      return;
    }
    setSidebarSubmitting(true);
    try {
      await dispatch(createUserFeedback({
        rating: 5,
        type: "Business timing correction",
        area: business.businessName,
        journey: `Business ID: ${business._id}`,
        message: `${timingSuggestion.days}: ${timingSuggestion.openingTime} - ${timingSuggestion.closingTime}${timingSuggestion.note ? `. Note: ${timingSuggestion.note}` : ""}`,
        source: "business_detail_timing_suggestion",
        allowContact: true
      }));
      enqueueSnackbar("Thank you. Your timing suggestion was submitted for review.", { variant: "success" });
      setSidebarModal(null);
      setTimingSuggestion({ days: "", openingTime: "", closingTime: "", note: "" });
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "Unable to submit the timing suggestion.", { variant: "error" });
    } finally {
      setSidebarSubmitting(false);
    }
  };
  const handleEnquirySubmit = async e => {
    e.preventDefault();
    const mobile = normalizePhone(enquiryForm.mobile);
    const email = enquiryForm.email.trim();
    if (!enquiryForm.name.trim() || mobile.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !enquiryForm.message.trim()) {
      enqueueSnackbar("Please enter your name, valid mobile number, email, and enquiry.", { variant: "warning" });
      return;
    }
    setSidebarSubmitting(true);
    try {
      await dispatch(sendEnquiryLead({
        businessId: business._id,
        category: business.category || "",
        location: business.location || "",
        customerName: enquiryForm.name.trim(),
        customerMobile: mobile,
        customerEmail: email,
        message: enquiryForm.message.trim()
      }));
      enqueueSnackbar(`Your enquiry was sent to ${business.businessName}.`, { variant: "success" });
      setSidebarModal(null);
      setEnquiryForm(current => ({ ...current, message: "" }));
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "Unable to send your enquiry.", { variant: "error" });
    } finally {
      setSidebarSubmitting(false);
    }
  };
  const handleInfoSubmit = async e => {
    e.preventDefault();
    const mobile = normalizePhone(infoForm.mobile);
    const email = infoForm.email.trim();
    if (!infoForm.name.trim() || (mobile.length < 10 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      enqueueSnackbar("Enter your name and a valid email or mobile number.", { variant: "warning" });
      return;
    }
    setSidebarSubmitting(true);
    try {
      const result = await dispatch(sendBusinessInfo({
        businessId: business._id,
        customerName: infoForm.name.trim(),
        customerMobile: mobile.length >= 10 ? mobile : "",
        customerEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
      }));
      enqueueSnackbar(result.message || "Business information sent.", { variant: "success" });
      setSidebarModal(null);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "Unable to send business information.", { variant: "error" });
    } finally {
      setSidebarSubmitting(false);
    }
  };
  const handleListingRequestSubmit = action => async e => {
    e.preventDefault();
    if (!requestNote.trim()) {
      enqueueSnackbar("Please add a short note for our review team.", { variant: "warning" });
      return;
    }
    setSidebarSubmitting(true);
    try {
      await dispatch(createUserFeedback({
        rating: 5,
        type: action === "claim" ? "Business ownership claim" : "Business listing correction",
        area: business.businessName,
        journey: `Business ID: ${business._id}`,
        message: requestNote.trim(),
        source: action === "claim" ? "business_detail_claim" : "business_detail_edit_request",
        allowContact: true
      }));
      enqueueSnackbar(action === "claim" ? "Your ownership claim was submitted for verification." : "Your listing correction was submitted for review.", { variant: "success" });
      setRequestNote("");
      setSidebarModal(null);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "Unable to submit your request.", { variant: "error" });
    } finally {
      setSidebarSubmitting(false);
    }
  };
  const copyBusinessLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      enqueueSnackbar("Business link copied.", { variant: "success" });
      setSidebarModal(null);
    } catch {
      enqueueSnackbar("Unable to copy the link.", { variant: "error" });
    }
  };
  const currentUrl = encodeURIComponent(window.location.href);
  const currentTitle = encodeURIComponent(`Check out ${business.businessName}`);
  const overviewHtml = business.businessDetails;
  const normalizeOverviewHtml = (html = "") => {
    return html.replace(/<p>\s*(<br\s*\/?>|&nbsp;)?\s*<\/p>/gi, "").replace(/<div>\s*(<br\s*\/?>|&nbsp;)?\s*<\/div>/gi, "").replace(/(<br\s*\/?>\s*){2,}/gi, "<br>").replace(/ style="[^"]*"/gi, "").replace(/width="[^"]*"/gi, "").replace(/height="[^"]*"/gi, "").trim();
  };
  const whatsappNumber = business.whatsappNumber || business.contactList || business.contact;
  const locationSlug = location || "";
  // Use DB location field for canonical to stay consistent regardless of how the user arrived
  const canonicalLocationSlug = toSlug(business.location || location);
  const businessUrl = `https://massclick.in/business/${locationSlug}/${business.slug || businessSlug}/${business._id || id}`;
  const canonicalUrl = `https://massclick.in/business/${canonicalLocationSlug}/${business.slug || businessSlug}/${business._id || id}`;

  // Generate LocalBusiness schema with all available data
  const localBusinessSchema = generateLocalBusinessSchema({
    _id: business._id,
    businessName: business.businessName,
    description: business.description || business.businessDetails,
    images: [business.bannerImage, ...(galleryImageSrcs || [])].filter(Boolean),
    telephone: business.contact,
    email: business.email,
    website: business.website,
    address: {
      street: [business.plotNumber, business.street].filter(Boolean).join(", "),
      locality: business.location,
      postalCode: business.pincode,
      country: "IN"
    },
    category: business.category,
    averageRating: averageRatingValue,
    totalReviews: effectiveTotalReview,
    openingHours: business.openingHours,
    socialProfiles: {
      facebook: business.facebook,
      instagram: business.instagram,
      youtube: business.youtube,
      twitter: business.twitter,
      linkedin: business.linkedin
    },
    geo: business.geoLocation?.coordinates ? {
      latitude: business.geoLocation.coordinates[1],
      longitude: business.geoLocation.coordinates[0]
    } : null,
    areaServed: business.location
  });

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: business.location || locationSlug,
    url: `https://massclick.in/${locationSlug}`
  }, {
    name: business.businessName,
    url: businessUrl
  }]);
  return <>
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />
        {localBusinessSchema && <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>}
        {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
      </Helmet>
      <StickySearchBar />
      {showCertificate && createPortal(
        <div
          className={cx("business-CardDetails-certificateOverlay", `business-CardDetails-certificateOverlay--${currentCertificate.key}`)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`business-carddetails-certificate-${business._id || id}`}
          onClick={handleCloseCertificate}
        >
          <div className={cx("business-CardDetails-certificateFrame")} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={cx("business-CardDetails-certificateClose")}
              aria-label="Close certificate"
              onClick={handleCloseCertificate}
            >
              <CloseIcon />
            </button>
            {savedCertificateUrl ? (
              <div className={cx("business-CardDetails-certificateImageShell")}>
                <img
                  src={savedCertificateUrl}
                  alt={`MassClick ${currentCertificate.label} certificate for ${business.businessName}`}
                  className={cx("business-CardDetails-certificateSavedImage")}
                />
              </div>
            ) : (
            <div className={cx("business-CardDetails-certificatePaper", `business-CardDetails-certificatePaper--${currentCertificate.key}`)}>
              {currentCertificate.eyebrow && <p className={cx("business-CardDetails-certificateEyebrow")}>{currentCertificate.eyebrow}</p>}
              <div className={cx("business-CardDetails-certificateMark")}>
                {currentCertificate.icon}
                <span>{currentCertificate.label}</span>
              </div>
              <div className={cx("business-CardDetails-certificateIdentity")}>
                <div className={cx("business-CardDetails-certificateBusinessLogo")}>
                  {businessLogoSrc ? (
                    <img src={businessLogoSrc} alt={`${business.businessName} logo`} />
                  ) : (
                    <span>{String(business.businessName || "MC").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h2 id={`business-carddetails-certificate-${business._id || id}`} className={cx("business-CardDetails-certificateTitle")}>
                  {business.businessName}
                </h2>
                <p className={cx("business-CardDetails-certificateLocation")}>{fullAddress}</p>
              </div>
              <p className={cx("business-CardDetails-certificateStatus")}>{currentCertificate.copy}</p>
              {currentCertificate.key === "trust" && <div className={cx("business-CardDetails-certificateStars")} aria-label="Trusted rating">
                  <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                </div>}
              <div className={cx("business-CardDetails-certificateDivider")} />
              <p className={cx("business-CardDetails-certificateCopy")}>
                Following details of the company have been <strong>{currentCertificate.detailWord}</strong>
              </p>
              <div className={cx("business-CardDetails-certificateChecks")}>
                {["Business Proof", "Business Address", "Mobile Number", "Email ID"].map(item => <div key={item} className={cx("business-CardDetails-certificateCheck")}>
                    <CheckCircleIcon />
                    <span>{item}</span>
                  </div>)}
              </div>
              <div className={cx("business-CardDetails-certificateBrand")}>
                <img src={massClickLogo} alt="MassClick" />
              </div>
            </div>
            )}
          </div>
        </div>,
        document.body
      )}
      <div className={cx("business-CardDetails-pageWrapper")}>
        <Breadcrumbs items={[{
        label: "Home",
        link: "/"
      }, {
        label: business.location || locationSlug,
        onClick: () => navigate(-1)
      }, {
        label: business.businessName
      }]} />
        <main>
        <section className={cx("business-CardDetails-heroSection")}>
          <div className={cx("business-CardDetails-mainImageContainer")} onClick={() => {
            if (galleryImageSrcs.length > 0) {
              setCurrentSlideIndex(bannerIndex);
              setShowFullGallery(true);
            }
          }}>
            <img key={business?._id || business?.bannerImage} src={bannerImageSrc} alt={business?.businessName} className={cx("business-CardDetails-bannerImage")} loading="eager" fetchpriority="high" width="1200" height="600" />
            <div className={cx("business-CardDetails-heroGradient")} />
            <div className={cx("business-CardDetails-heroMeta")}>
              <div className={cx("business-CardDetails-heroMetaPrimary")}>
                <h1 className={cx("business-CardDetails-heroName")}>
                  {business.businessName}
                </h1>
                <div className={cx("business-CardDetails-heroRatingChip")}>
                  <span className={cx("business-CardDetails-heroRatingScore")}>
                    {displayedAverageRating}
                  </span>
                  <StarIcon className={cx("business-CardDetails-heroRatingStar")} />
                  <span className={cx("business-CardDetails-heroRatingCount")}>
                    {ratingSummaryLabel}
                  </span>
                </div>
              </div>
              {statusBadges.length > 0 && <div className={cx("business-CardDetails-statusRow business-CardDetails-statusRow--hero")}>
                  {statusBadges.map(renderStatusBadge)}
                </div>}
              <p className={cx("business-CardDetails-heroAddress")}>
                {fullAddress}
              </p>
              {heroHighlights.length > 0 && <div className={cx("business-CardDetails-heroHighlights")}>
                  {heroHighlights.map((item, index) => <span key={`${item}-${index}`} className={cx("business-CardDetails-heroHighlight")}>
                      {item}
                    </span>)}
                </div>}
            </div>
          </div>

          {galleryImageSrcs.length > 0 && <div className={cx("business-CardDetails-thumbnails")}>
              {galleryImageSrcs.map((src, index) => <img key={index} src={src || getPlaceholderImage()} alt={`${business.businessName} ${index + 1}`} className={cx("business-CardDetails-thumbnail" + (bannerIndex === index ? " business-CardDetails-thumbnail--active" : ""))} onClick={() => {
              setMainImage(src);
              setCurrentSlideIndex(index);
              setShowFullGallery(true);
            }} />)}
            </div>}
        </section>

        <div className={cx("business-CardDetails-mainGrid")}>
          <div className={cx("business-CardDetails-leftColumn")}>
            <div className={cx("business-CardDetails-headerCard")}>
              <h2 className={cx("business-CardDetails-businessName")}>
                {business.businessName}
              </h2>

              <div className={cx("business-CardDetails-ratingRow")}>
                <span className={cx("business-CardDetails-ratingBadge", displayedAverageRating === "New" && "business-CardDetails-ratingBadge--new")}>
                  {displayedAverageRating} <StarIcon />
                </span>
                <span className={cx("business-CardDetails-ratingText")}>
                  {ratingSummaryLabel} ·{" "}
                  <button type="button">
                    Claim this business
                  </button>
                </span>
              </div>

              {statusBadges.length > 0 && <div className={cx("business-CardDetails-statusRow")}>
                  {statusBadges.map(renderStatusBadge)}
                </div>}

              <div className={cx("business-CardDetails-quickFactsRow")}>
                {quickFacts.map((fact, index) => <span key={index} className={cx("business-CardDetails-quickFactItem")}>
                    {getQuickFactIcon(index)}
                    <span>{fact}</span>
                  </span>)}
              </div>

              <div className={cx("business-CardDetails-actionBar")}>
                <div className={cx("business-CardDetails-actionLeft")}>
                  <button onClick={handleShowNumberClick} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>
                    <PhoneIcon style={{
                      fontSize: 20
                    }} />
                    Show Number
                  </button>

                  {whatsappNumber && <a className={cx("business-CardDetails-btn business-CardDetails-btn--whatsapp")} href={`https://wa.me/${whatsappNumber}?text=${currentTitle}%20${currentUrl}`} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon style={{
                      fontSize: 20
                    }} />
                      WhatsApp
                    </a>}

                  <button className={cx(`business-CardDetails-iconBtn business-CardDetails-favBtn${favoriteIds.includes(business._id) ? " business-CardDetails-favBtn--active" : ""}${togglingIds.includes(business._id) ? " business-CardDetails-favBtn--loading" : ""}`)} title={favoriteIds.includes(business._id) ? "Remove from favorites" : "Add to favorites"} onClick={e => {
                    e.stopPropagation();
                    if (!isFavLoggedIn) {
                      setShowLoginModal(true);
                      return;
                    }
                    if (togglingIds.includes(business._id)) return;
                    if (favoriteIds.includes(business._id)) {
                      dispatch(removeFavorite(business._id));
                    } else {
                      dispatch(addFavorite(business._id));
                    }
                  }}>
                    {favoriteIds.includes(business._id) ? <FavoriteIcon style={{
                      fontSize: 20,
                      color: "#ef4444"
                    }} /> : <FavoriteBorderIcon style={{
                      fontSize: 20,
                      color: "#ef4444"
                    }} />}
                  </button>

                  <span className={cx("business-CardDetails-iconBtn business-CardDetails-shareBtn")} title="Share" onClick={() => setShowShareOptions(prev => !prev)}>
                    <ShareIcon style={{
                      fontSize: 20
                    }} />
                    {showShareOptions && <div className={cx("business-CardDetails-sharePopup")}>
                        <a href={`https://wa.me/?text=${currentTitle}%20${currentUrl}`} target="_blank" rel="noopener noreferrer">
                          <WhatsAppIcon style={{
                          color: "#25D366"
                        }} />
                        </a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`} target="_blank" rel="noopener noreferrer">
                          <FacebookIcon style={{
                          color: "#1877F2"
                        }} />
                        </a>
                        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                          <InstagramIcon style={{
                          color: "#E4405F"
                        }} />
                        </a>
                        <button onClick={handleCopyLink}>
                          <LinkIcon />
                        </button>
                      </div>}
                  </span>
                </div>

                <div className={cx("business-CardDetails-ratingInput")}>
                  <Tooltip title="Click to rate this business" arrow placement="top">
                    <div>
                      <UserRatingWidget businessId={business._id} initialValue={averageRatingValue || 0} currentRatings={business.ratings || []} />
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className={cx("business-CardDetails-tabsWrapper")}>
              <div className={cx("business-CardDetails-tabs")}>
                {["Overview", "Quick Info", "Services", "Photos", "Reviews"].map(tab => <span key={tab} className={cx("business-CardDetails-tab" + (activeTab === tab ? " business-CardDetails-tab--active" : ""))} onClick={() => handleTabClick(tab)}>
                    {tab}
                  </span>)}
              </div>
            </div>

            <div className={cx("business-CardDetails-tabContent")}>
              <section ref={overviewRef} className={cx("business-CardDetails-overviewCard")}>
                <h2>Overview</h2>
                <div className={cx("business-CardDetails-overviewText")} dangerouslySetInnerHTML={{
                  __html: normalizeOverviewHtml(overviewHtml)
                }} />
              </section>
              <section ref={quickInfoRef} className={cx("business-CardDetails-infoBlock")}>
                <h2>Quick Info</h2>
                <div className={cx("business-CardDetails-infoGrid")}>
                  <div className={cx("business-CardDetails-infoItem")}>
                    <span className={cx("business-CardDetails-infoLabel")}>
                      Business
                    </span>
                    <span className={cx("business-CardDetails-infoValue")}>
                      {business.businessName}
                    </span>
                  </div>
                  <div className={cx("business-CardDetails-infoItem")}>
                    <span className={cx("business-CardDetails-infoLabel")}>
                      Experience
                    </span>
                    <span className={cx("business-CardDetails-infoValue")}>
                      {business.experience ? `${business.experience}+ Years` : "N/A"}
                    </span>
                  </div>
                  <div className={cx("business-CardDetails-infoItem")}>
                    <span className={cx("business-CardDetails-infoLabel")}>
                      Category
                    </span>
                    <span className={cx("business-CardDetails-infoValue")}>
                      {business.category || "N/A"}
                    </span>
                  </div>
                  <div className={cx("business-CardDetails-infoItem")}>
                    <span className={cx("business-CardDetails-infoLabel")}>
                      Certificates
                    </span>
                    <span className={cx("business-CardDetails-infoValue")}>
                      {certificateLabels.length > 0 ? certificateLabels.join(", ") : "Not verified yet"}
                    </span>
                  </div>
                  {business.category?.toLowerCase().includes("bank") && business.contactList && <div className={cx("business-CardDetails-infoItem")}>
                      <span className={cx("business-CardDetails-infoLabel")}>
                        IFSC Code
                      </span>
                      <span className={cx("business-CardDetails-infoValue")}>
                        {business.contactList}
                      </span>
                    </div>}
                  <div className={cx("business-CardDetails-infoItem")}>
                    <span className={cx("business-CardDetails-infoLabel")}>
                      Address
                    </span>
                    <span className={cx("business-CardDetails-infoValue")}>
                      {fullAddress}
                    </span>
                  </div>
                </div>
              </section>

              <section ref={servicesRef} className={cx("business-CardDetails-infoBlock")}>
                <h2>Services</h2>
                {business.services && business.services.length > 0 ? <ul className={cx("business-CardDetails-servicesList")}>
                    {business.services.map((service, idx) => <li key={idx} className={cx("business-CardDetails-servicePill")}>
                        {service}
                      </li>)}
                  </ul> : <p>Services information is not available.</p>}
              </section>

              <section ref={photosRef} className={cx("business-CardDetails-photosSection")}>
                <h2>Photos</h2>
                <div className={cx("business-CardDetails-uploadSection")}>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" style={{
                    display: "none"
                  }} onChange={handleGalleryFileSelection} />
                  <button type="button" className={cx("business-CardDetails-btn business-CardDetails-btn--secondary")} onClick={openGalleryFileDialog}>
                    Select Images
                  </button>
                  <button type="button" className={cx("business-CardDetails-btn business-CardDetails-btn--primary")} onClick={handleUploadBusinessImages} disabled={newGalleryImages.length === 0 || isUploadingImages}>
                    {isUploadingImages ? "Uploading..." : "Upload Images"}
                  </button>
                </div>
                {!isBusinessImageUploadAllowed && <p className={cx("business-CardDetails-uploadNote")}>
                    Upload allowed only if you are the owner of this business.
                  </p>}
                {newGalleryImages.length > 0 && <div className={cx("business-CardDetails-uploadPreview")}>
                    {newGalleryImages.map((src, idx) => <img key={idx} src={src} alt={`Selected upload ${idx + 1}`} className={cx("business-CardDetails-uploadPreviewItem")} />)}
                  </div>}
                {uploadError && <p className={cx("business-CardDetails-uploadError")}>{uploadError}</p>}
                {galleryImageSrcs.length > 0 ? <div className={cx("business-CardDetails-photoGrid")}>
                    {galleryImageSrcs.map((src, index) => <img key={index} src={src || getPlaceholderImage()} alt={`${business.businessName} ${index + 1}`} className={cx("business-CardDetails-photoItem")} onClick={() => {
                    setCurrentSlideIndex(index);
                    setShowFullGallery(true);
                  }} />)}
                  </div> : <p>No photos uploaded yet.</p>}
              </section>
              <section ref={reviewsRef} className={cx("business-CardDetails-reviewsSection")}>
                <h2>Reviews & Ratings</h2>

                <div className={cx("business-CardDetails-startReview")}>
                  <UserRatingWidget businessId={business._id} initialValue={averageRatingValue || 0} />
                </div>

                <ReviewList businessId={business._id} />
              </section>
            </div>

            {business.googleMap && <div className={cx("business-CardDetails-mapWrapper")}>
                <iframe src={getGoogleMapSrc(business.googleMap)} width="100%" height="320" style={{
                border: 0
              }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Business Location" />
              </div>}
          </div>

          <aside className={cx("business-CardDetails-rightSidebar")}>
            <div className={cx("business-CardDetails-sidebarCard")}>
              <div className={cx("business-CardDetails-sidebarHero")}>
                <span className={cx("business-CardDetails-sidebarKicker")}>
                  Business contact
                </span>
                <h3>{business.businessName}</h3>
                <p>{business.category || "Local business"}</p>
                {statusBadges.length > 0 && <div className={cx("business-CardDetails-statusRow business-CardDetails-statusRow--sidebar")}>
                    {statusBadges.map(renderStatusBadge)}
                  </div>}
                <button onClick={handleShowNumberClick} className={cx("business-CardDetails-sidebarPrimaryBtn")}>
                  <PhoneIcon />
                  Show Number
                </button>
                {whatsappNumber && <a className={cx("business-CardDetails-sidebarWhatsAppBtn")} href={`https://wa.me/${whatsappNumber}?text=${currentTitle}%20${currentUrl}`} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon />
                    WhatsApp
                  </a>}
              </div>

              <h3 className={cx("business-CardDetails-sidebarTitle")}>
                Contact
              </h3>
              <div className={cx("business-CardDetails-contactRow")}>
                <PhoneIcon className={cx("business-CardDetails-sidebarIcon")} />
                <button onClick={handleShowNumberClick} className={cx("business-CardDetails-contactLink")}>
                  Show Number
                </button>
              </div>

              <h3 className={cx("business-CardDetails-sidebarTitle")}>
                Address
              </h3>
              <p className={cx("business-CardDetails-addressText")}>
                {fullAddress}
              </p>

              <div className={cx("business-CardDetails-addressActions")}>
                {fullAddress && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-addressBtn")}>
                    <DirectionsIcon fontSize="small" />
                    Get Directions
                  </a>}

                <button className={cx("business-CardDetails-addressBtn")} onClick={handleCopyAddress}>
                  <ContentCopyIcon fontSize="small" />
                  Copy
                </button>
              </div>

              <div className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--expandable")} onClick={() => setShowFullHours(!showFullHours)}>
                <div className={cx("business-CardDetails-sidebarItemRow")}>
                  <AccessTimeIcon className={cx("business-CardDetails-sidebarIcon")} />
                  <span className={cx("business-CardDetails-hoursSummary")}>
                    {getCollapsedHoursSummary()}
                  </span>
                  <span className={cx("business-CardDetails-sidebarArrow")}>
                    {showFullHours ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                  </span>
                </div>
              </div>

              {showFullHours && <div className={cx("business-CardDetails-hoursList")}>
                  {getFullHoursList().map(hour => <div key={hour.day} className={cx("business-CardDetails-hoursRow")}>
                      <span>{hour.day}</span>
                      <span className={cx(hour.isClosed ? "business-CardDetails-hoursValue--closed" : "business-CardDetails-hoursValue--open")}>
                        {hour.isClosed ? "Closed" : `${hour.open} - ${hour.close}`}
                      </span>
                    </div>)}
                </div>}

              <ul className={cx("business-CardDetails-sidebarList")}>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={() => openSidebarAction("timings")} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && openSidebarAction("timings")}>
                  <NoteAltIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Suggest New Timings
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={() => openSidebarAction("enquiry")} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && openSidebarAction("enquiry")}>
                  <EmailIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Send Enquiry by Email
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--highlight business-CardDetails-sidebarItem--action")} onClick={() => openSidebarAction("info")} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && openSidebarAction("info")}>
                  <InsertDriveFileIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Get info via SMS/Email
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={handleShare} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleShare()}>
                  <ShareIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Share
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={handleRateClick} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleRateClick(e)}>
                  <StarIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Tap to rate
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={handleEditListing} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleEditListing()}>
                  <EditIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Edit this Listing
                </li>
                <li className={cx("business-CardDetails-sidebarItem business-CardDetails-sidebarItem--action")} onClick={() => openSidebarAction("claim")} role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && openSidebarAction("claim")}>
                  <CheckCircleIcon className={cx("business-CardDetails-sidebarIcon")} />
                  Claim this business
                </li>
                <li className={cx("business-CardDetails-sidebarItem")}>
                  <LanguageIcon className={cx("business-CardDetails-sidebarIcon")} />
                  {website ? <a href={formattedWebsite} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-websiteLink")}>
                      Visit Website
                    </a> : <span className={cx("business-CardDetails-websiteLink business-CardDetails-websiteLink--disabled")}>
                      Website not added
                    </span>}
                  {business.facebook && <a href={business.facebook} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-socialLink")}>
                      <FacebookIcon /> Facebook
                    </a>}

                  {business.instagram && <a href={business.instagram} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-socialLink")}>
                      <InstagramIcon /> Instagram
                    </a>}
                </li>
              </ul>
            </div>

            {businessKeywords.length > 0 && <div className={cx("business-CardDetails-keywordsCard")}>
                <div className={cx("business-CardDetails-keywordsHeader")}>
                  <span className={cx("business-CardDetails-keywordsIcon")}>
                    <LocalOfferIcon />
                  </span>
                  <div>
                    <h3 className={cx("business-CardDetails-keywordsTitle")}>
                      Also listed in
                    </h3>
                    <p className={cx("business-CardDetails-keywordsSubtitle")}>
                      Popular searches for this business
                    </p>
                  </div>
                </div>

                <div className={cx("business-CardDetails-keywordPills")}>
                  {visibleKeywords.map(keyword => <Link key={keyword} to={`/${keywordLocationSlug}/${keywordCategorySlug || toSlug(keyword)}`} state={{
                  category: keywordCategory || keyword
                }} className={cx("business-CardDetails-keywordPill")}>
                      {keyword}
                    </Link>)}
                  {hasMoreKeywords && <button type="button" className={cx("business-CardDetails-keywordMoreBtn")} onClick={() => setShowAllKeywords(true)}>
                      More
                    </button>}
                </div>
              </div>}
          </aside>
        </div>
        </main>

        <div className={cx("business-CardDetails-lowerSections")}>
          <PopularCategoriesLink />
        </div>
      </div>

      {showContactModal && <SimpleModal title={`Contact for ${business.businessName}`} onClose={() => setShowContactModal(false)}>
          <p>{business.contact || "N/A"}</p>
          <div className={cx("business-CardDetails-modalActions")}>
            {business.contact && <a href={`tel:${business.contact}`} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>
                <PhoneIcon />
                Call Now
              </a>}
            <button className={cx("business-CardDetails-btn business-CardDetails-btn--secondary")} onClick={handleCopyContact}>
              <ContentCopyIcon />
              Copy
            </button>
          </div>
        </SimpleModal>}

      {sidebarModal === "timings" && <SimpleModal title="Suggest New Timings" onClose={() => !sidebarSubmitting && setSidebarModal(null)}>
          <form className={cx("business-CardDetails-actionForm")} onSubmit={handleTimingSuggestionSubmit}>
            <p className={cx("business-CardDetails-formIntro")}>Help us keep {business.businessName}'s opening hours accurate.</p>
            <label>Days
              <input value={timingSuggestion.days} onChange={e => setTimingSuggestion({ ...timingSuggestion, days: e.target.value })} placeholder="Example: Monday to Friday" maxLength={80} required />
            </label>
            <div className={cx("business-CardDetails-formGrid")}>
              <label>Opens
                <input type="time" value={timingSuggestion.openingTime} onChange={e => setTimingSuggestion({ ...timingSuggestion, openingTime: e.target.value })} required />
              </label>
              <label>Closes
                <input type="time" value={timingSuggestion.closingTime} onChange={e => setTimingSuggestion({ ...timingSuggestion, closingTime: e.target.value })} required />
              </label>
            </div>
            <label>Additional note (optional)
              <textarea value={timingSuggestion.note} onChange={e => setTimingSuggestion({ ...timingSuggestion, note: e.target.value })} maxLength={300} rows={3} placeholder="Closed for lunch, weekend hours, etc." />
            </label>
            <button type="submit" disabled={sidebarSubmitting} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>{sidebarSubmitting ? "Submitting..." : "Submit Timings"}</button>
          </form>
        </SimpleModal>}

      {sidebarModal === "enquiry" && <SimpleModal title={`Enquire with ${business.businessName}`} onClose={() => !sidebarSubmitting && setSidebarModal(null)}>
          <form className={cx("business-CardDetails-actionForm")} onSubmit={handleEnquirySubmit}>
            <p className={cx("business-CardDetails-formIntro")}>Enter your contact details and the business will receive your enquiry.</p>
            <label>Your name
              <input value={enquiryForm.name} onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })} maxLength={120} required />
            </label>
            <label>Mobile number
              <input type="tel" inputMode="numeric" value={enquiryForm.mobile} onChange={e => setEnquiryForm({ ...enquiryForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 15) })} required />
            </label>
            <label>Email address
              <input type="email" value={enquiryForm.email} onChange={e => setEnquiryForm({ ...enquiryForm, email: e.target.value })} maxLength={180} required />
            </label>
            <label>Your enquiry
              <textarea value={enquiryForm.message} onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })} maxLength={500} rows={4} placeholder="Tell the business what service you need." required />
            </label>
            <button type="submit" disabled={sidebarSubmitting} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>{sidebarSubmitting ? "Sending..." : "Send Enquiry"}</button>
          </form>
        </SimpleModal>}

      {sidebarModal === "info" && <SimpleModal title="Get Business Information" onClose={() => !sidebarSubmitting && setSidebarModal(null)}>
          <form className={cx("business-CardDetails-actionForm")} onSubmit={handleInfoSubmit}>
            <p className={cx("business-CardDetails-formIntro")}>We will send {business.businessName}'s contact information to you.</p>
            <label>Your name
              <input value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} maxLength={120} required />
            </label>
            <label>WhatsApp mobile
              <input type="tel" inputMode="numeric" value={infoForm.mobile} onChange={e => setInfoForm({ ...infoForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 15) })} placeholder="Optional when email is provided" />
            </label>
            <label>Email address
              <input type="email" value={infoForm.email} onChange={e => setInfoForm({ ...infoForm, email: e.target.value })} maxLength={180} placeholder="Optional when mobile is provided" />
            </label>
            <button type="submit" disabled={sidebarSubmitting} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>{sidebarSubmitting ? "Sending..." : "Send Business Info"}</button>
          </form>
        </SimpleModal>}

      {sidebarModal === "share" && <SimpleModal title="Share this business" onClose={() => setSidebarModal(null)}>
          <div className={cx("business-CardDetails-shareActions")}>
            <a href={`https://wa.me/?text=${currentTitle}%20${currentUrl}`} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-btn business-CardDetails-btn--whatsapp")}><WhatsAppIcon /> WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`} target="_blank" rel="noopener noreferrer" className={cx("business-CardDetails-btn business-CardDetails-btn--secondary")}><FacebookIcon /> Facebook</a>
            <a href={`mailto:?subject=${currentTitle}&body=${currentUrl}`} className={cx("business-CardDetails-btn business-CardDetails-btn--secondary")}><EmailIcon /> Email</a>
            <button type="button" onClick={copyBusinessLink} className={cx("business-CardDetails-btn business-CardDetails-btn--secondary")}><LinkIcon /> Copy Link</button>
          </div>
        </SimpleModal>}

      {(sidebarModal === "edit" || sidebarModal === "claim") && <SimpleModal title={sidebarModal === "claim" ? "Claim this business" : "Suggest a listing correction"} onClose={() => !sidebarSubmitting && setSidebarModal(null)}>
          <form className={cx("business-CardDetails-actionForm")} onSubmit={handleListingRequestSubmit(sidebarModal)}>
            <p className={cx("business-CardDetails-formIntro")}>{sidebarModal === "claim" ? "Tell us your role and how we can verify your connection to this business. Our team will review the claim before granting edit access." : "Only the verified owner can directly edit this listing. Tell our review team what should be corrected."}</p>
            <label>{sidebarModal === "claim" ? "Ownership details" : "Correction details"}
              <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)} maxLength={800} rows={5} placeholder={sidebarModal === "claim" ? "Example: I am the proprietor. Please verify me using the registered business mobile." : "Describe the incorrect information and the correct value."} required />
            </label>
            <button type="submit" disabled={sidebarSubmitting} className={cx("business-CardDetails-btn business-CardDetails-btn--primary")}>{sidebarSubmitting ? "Submitting..." : sidebarModal === "claim" ? "Submit Claim" : "Submit Correction"}</button>
          </form>
        </SimpleModal>}

      {showFullGallery && <FullScreenGallery images={galleryImageSrcs} initialIndex={currentSlideIndex} onClose={() => setShowFullGallery(false)} />}

      <Footer />
      <OTPLoginModal open={showLoginModal} handleClose={() => setShowLoginModal(false)} />
    </>;
});
export default BusinessDetail;
