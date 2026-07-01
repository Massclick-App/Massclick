import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useRef, useState, useEffect, useMemo } from "react";
import styles from "./CardCarousel.module.css";
import { useDispatch, useSelector } from "react-redux";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import Cctv from "../../../assets/popular/cctv.webp";
import Education from "../../../assets/popular/education.webp";
import HotelRoom from "../../../assets/popular/hotelroom.webp";
import Photography from "../../../assets/popular/photography.webp";
import { createEnquiryNow } from "../../../redux/actions/popularSearchesAction";
import { fetchPopularSearches } from "../../../redux/actions/categoryAction";
import { logSearchActivity, sendEnquiryLead } from "../../../redux/actions/businessListAction";
import OTPLoginModal from "../AddBusinessModel";
const cx = createScopedClassNames(styles);
const defaultCards = [{
  title: "CCTV",
  image: Cctv,
  alt: "CCTV installation",
  buttonText: "Enquire Now",
  accent: "#e67e22"
}, {
  title: "Hotels",
  image: HotelRoom,
  alt: "Hotel room",
  buttonText: "Enquire Now",
  accent: "#2f80ed"
}, {
  title: "Photography",
  image: Photography,
  alt: "Photography service",
  buttonText: "Enquire Now",
  accent: "#9b51e0"
}, {
  title: "Education",
  image: Education,
  alt: "Education service",
  buttonText: "Enquire Now",
  accent: "#27ae60"
}];
const staticFallbackMap = {
  CCTV: Cctv,
  Hotels: HotelRoom,
  Photography,
  Education,
  Logistics: Cctv,
  Consulting: HotelRoom
};
const getAuthUser = () => JSON.parse(localStorage.getItem("authUser") || "null");
const getErrorMessage = error => error?.response?.data?.message || error?.response?.data?.error || error?.response?.data || error?.message || "Something went wrong";
const CardCarousel = () => {
  const containerRef = useRef(null);
  const cardWidthRef = useRef(300);
  const dispatch = useDispatch();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [submittingCard, setSubmittingCard] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedDistrict = useSelector(state => state.locationReducer.selectedDistrict);
  const popularSearchCards = useSelector(state => state.categoryReducer.popularSearchCards || []);
  const sendEnquiryError = useSelector(state => state.businessListReducer.sendEnquiryError);
  const cards = useMemo(() => {
    const source = popularSearchCards.length ? popularSearchCards : defaultCards;
    return source.map(card => ({
      ...card,
      title: card.title || card.categoryName || card.category || "",
      buttonText: card.buttonText || "Enquire Now",
      alt: card.alt || card.title || "Popular search",
      image: card.imageUrl || card.image || staticFallbackMap[card.title] || null,
      accent: card.accent || "#e67e22"
    }));
  }, [popularSearchCards]);
  useEffect(() => {
    dispatch(fetchPopularSearches());
  }, [dispatch]);
  useEffect(() => {
    if (!sendEnquiryError) return;
    setErrorMessage(getErrorMessage(sendEnquiryError));
    setShowError(true);
  }, [sendEnquiryError]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const card = container.querySelector(".popular-search__card");
    if (!card) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === card) {
          cardWidthRef.current = entry.contentRect.width + 20;
        }
      }
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [cards.length]);
  const scrollByCard = direction => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({
      left: direction === "right" ? cardWidthRef.current : -cardWidthRef.current,
      behavior: "smooth"
    });
  };
  const handleEnquireClick = card => {
    const authUser = getAuthUser();
    if (!authUser?._id) {
      setPendingCard(card);
      setIsLoginOpen(true);
      return;
    }
    proceedEnquiry(card, authUser);
  };
  const proceedEnquiry = async (card, user = getAuthUser()) => {
    try {
      if (!user?._id) return;
      setSubmittingCard(card.title);
      const categoryName = card.title;
      const locationName = selectedDistrict || "Global";
      const userDetails = {
        userName: user.userName,
        mobileNumber1: user.mobileNumber1,
        mobileNumber2: user.mobileNumber2 || "",
        email: user.email || ""
      };
      dispatch(logSearchActivity(categoryName, locationName, userDetails, categoryName, true));
      const enquiryPayload = {
        category: categoryName,
        categorySlug: categoryName.toLowerCase().replace(/\s+/g, "-"),
        enquirySource: "Popular Searches",
        userId: user._id,
        userName: user.userName,
        mobileNumber1: user.mobileNumber1,
        mobileNumber2: user.mobileNumber2 || "",
        email: user.email || "",
        businessName: user.businessName || ""
      };
      await dispatch(createEnquiryNow(enquiryPayload));
      const leadPayload = {
        category: categoryName,
        location: locationName,
        customerName: user.userName,
        customerMobile: user.mobileNumber1,
        customerEmail: user.email || ""
      };
      await dispatch(sendEnquiryLead(leadPayload));
      setShowSuccess(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setShowError(true);
    } finally {
      setSubmittingCard(null);
    }
  };
  useEffect(() => {
    const onAuthChange = () => {
      const authUser = getAuthUser();
      if (pendingCard && authUser?._id) {
        proceedEnquiry(pendingCard, authUser);
        setPendingCard(null);
        setIsLoginOpen(false);
      }
    };
    window.addEventListener("authChange", onAuthChange);
    return () => window.removeEventListener("authChange", onAuthChange);
  }, [pendingCard, selectedDistrict]);
  return <>
      <section className={cx("popular-search")}>
        <div className={cx("popular-search__inner")}>
          <div className={cx("popular-search__header")}>
            <div>
              <h2 className={cx("popular-search__title")}>Popular Searches</h2>
              <p className={cx("popular-search__subtitle")}>
                Quick access to the most in-demand services around you.
              </p>
            </div>
            <div className={cx("popular-search__controls")}>
              <button type="button" className={cx("popular-search__control popular-search__control--left")} onClick={() => scrollByCard("left")} aria-label="Scroll popular searches left">
                <KeyboardDoubleArrowLeftIcon />
              </button>
              <button type="button" className={cx("popular-search__control popular-search__control--right")} onClick={() => scrollByCard("right")} aria-label="Scroll popular searches right">
                <KeyboardDoubleArrowRightIcon />
              </button>
            </div>
          </div>

          <div className={cx("popular-search__viewport")}>
            <div className={cx("popular-search__track")} ref={containerRef}>
              {cards.map((card, index) => <article className={cx("popular-search__card")} key={`${card.title}-${index}`} style={{
              "--accent-color": card.accent
            }}>
                  {card.image ? <div className={cx("popular-search__card-image-wrapper")}>
                      <img src={card.image} alt={card.alt} className={cx("popular-search__card-image")} width="640" height="360" loading="lazy" decoding="async" />
                      <div className={cx("popular-search__card-overlay")} />
                    </div> : <div className={cx("popular-search__card-image-wrapper popular-search__card-image-wrapper--empty")}>
                    </div>}
                  <div className={cx("popular-search__card-body")}>
                    <div className={cx("popular-search__card-badge")}>Popular</div>
                    <h3 className={cx("popular-search__card-title")}>{card.title}</h3>
                    <p className={cx("popular-search__card-description")}>
                      {card.description || "Find verified services"}
                    </p>
                    <button type="button" className={cx("popular-search__card-button")} onClick={() => handleEnquireClick(card)} disabled={submittingCard === card.title}>
                      {submittingCard === card.title ? "Sending..." : card.buttonText}
                    </button>
                  </div>
                </article>)}
            </div>
          </div>
        </div>
      </section>

      <OTPLoginModal open={isLoginOpen} handleClose={() => setIsLoginOpen(false)} />

      <Snackbar open={showSuccess} autoHideDuration={5000} onClose={() => setShowSuccess(false)} anchorOrigin={{
      vertical: "top",
      horizontal: "center"
    }} sx={{
      zIndex: 1400
    }}>
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{
        fontSize: "0.95rem",
        fontWeight: 500,
        borderRadius: "12px"
      }}>
          Your enquiry has been submitted successfully. Please wait - our team
          will contact you within 24 hours.
        </Alert>
      </Snackbar>
      <Snackbar open={showError} autoHideDuration={7000} onClose={() => setShowError(false)} anchorOrigin={{
      vertical: "top",
      horizontal: "center"
    }} sx={{
      zIndex: 1400
    }}>
        <Alert onClose={() => setShowError(false)} severity="error" sx={{
        fontSize: "0.95rem",
        fontWeight: 500,
        borderRadius: "12px"
      }}>
          Failed to send enquiry: {errorMessage}
        </Alert>
      </Snackbar>
    </>;
};
export default CardCarousel;
