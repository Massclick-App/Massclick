import React, { useRef, useState, useEffect } from "react";
import "./CardCarousel.css";
import { useDispatch, useSelector } from "react-redux";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";

import Cctv from "../../../assets/Popular/CCTV.png";
import Education from "../../../assets/Popular/Education.png";
import HotelRoom from "../../../assets/Popular/HotelRoom.png";
import Photography from "../../../assets/Popular/Photography.png";
import { createEnquiryNow } from "../../../redux/actions/popularSearchesAction";

import OTPLoginModal from "../AddBusinessModel";

const cardsData = [
  { title: "CCTV", image: Cctv, buttonText: "Enquire Now", accent: "#e67e22", alt: "CCTV camera installation" },
  { title: "Hotels", image: HotelRoom, buttonText: "Enquire Now", accent: "#e67e22", alt: "Modern hotel room" },
  { title: "Photography", image: Photography, buttonText: "Enquire Now", accent: "#e67e22", alt: "Photographer with camera" },
  { title: "Education", image: Education, buttonText: "Enquire Now", accent: "#e67e22", alt: "Graduation scroll" },
  { title: "Logistics", image: Cctv, buttonText: "Enquire Now", accent: "#5dade2", alt: "Logistics and delivery" },
  { title: "Consulting", image: HotelRoom, buttonText: "Enquire Now", accent: "#2ecc71", alt: "Business consulting" },
];

const CardCarousel = () => {
  const containerRef = useRef(null);
  const dispatch = useDispatch();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const authUser = JSON.parse(localStorage.getItem("authUser") || "null");

  const scrollByCard = (direction) => {
    if (!containerRef.current) return;
    const cardWidth = containerRef.current.querySelector(".popular-search__card")?.offsetWidth || 280;
    const gap = 20;
    containerRef.current.scrollBy({
      left: direction === "right" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    });
  };

  const handleEnquireClick = (card) => {
    if (!authUser?._id) {
      setPendingCard(card);
      setIsLoginOpen(true);
      return;
    }
    proceedEnquiry(card);
  };

  const proceedEnquiry = async (card) => {
    try {
      if (!authUser?._id) return;

      const enquiryPayload = {
        category: card.title,
        categorySlug: card.title.toLowerCase().replace(/\s+/g, "-"),
        enquirySource: "Popular Searches",
        userId: authUser._id,
        userName: authUser.userName,
        mobileNumber1: authUser.mobileNumber1,
        mobileNumber2: authUser.mobileNumber2 || "",
        email: authUser.email || "",
        businessName: authUser.businessName || "",
      };

      await dispatch(createEnquiryNow(enquiryPayload));
      setShowSuccess(true);

    } catch (error) {
      console.error("❌ Enquiry failed:", error);
    }
  };

  useEffect(() => {
    const onAuthChange = () => {
      if (pendingCard && localStorage.getItem("authToken")) {
        proceedEnquiry(pendingCard);
        setPendingCard(null);
      }
    };

    window.addEventListener("authChange", onAuthChange);
    return () => window.removeEventListener("authChange", onAuthChange);
  }, [pendingCard]);

  return (
    <>
      <section className="popular-search">
        <div className="popular-search__inner">
          <div className="popular-search__header">
            <div>
              <h2 className="popular-search__title">Popular Searches</h2>
              <p className="popular-search__subtitle">
                Quick access to the most in-demand services around you.
              </p>
            </div>
            <div className="popular-search__controls">
              <button
                type="button"
                className="popular-search__control popular-search__control--left"
                onClick={() => scrollByCard("left")}
              >
                <KeyboardDoubleArrowLeftIcon />
              </button>
              <button
                type="button"
                className="popular-search__control popular-search__control--right"
                onClick={() => scrollByCard("right")}
              >
                <KeyboardDoubleArrowRightIcon />
              </button>
            </div>
          </div>

          <div className="popular-search__viewport">
            <div className="popular-search__fade popular-search__fade--left" />
            <div className="popular-search__fade popular-search__fade--right" />

            <div className="popular-search__track" ref={containerRef}>
              {cardsData.map((card, index) => (
                <article
                  className="popular-search__card"
                  key={index}
                  style={{ "--accent-color": card.accent }}
                >
                  <div className="popular-search__card-image-wrapper">
                    <img src={card.image} alt={card.alt} className="popular-search__card-image" />
                  </div>
                  <div className="popular-search__card-body">
                    <div className="popular-search__card-tag">Popular</div>
                    <h3 className="popular-search__card-title">{card.title}</h3>
                    <button
                      className="popular-search__card-button"
                      onClick={() => handleEnquireClick(card)}
                    >
                      {card.buttonText}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OTPLoginModal
        open={isLoginOpen}
        handleClose={() => setIsLoginOpen(false)}
      />

      <Snackbar
        open={showSuccess}
        autoHideDuration={5000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 1400 }} 
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{
            fontSize: "0.95rem",
            fontWeight: 500,
            borderRadius: "12px",
          }}
        >
          ✅ Your enquiry has been submitted successfully.
          Please wait — our team will contact you within 24 hours.
        </Alert>
      </Snackbar>
    </>
  );
};

export default CardCarousel;
