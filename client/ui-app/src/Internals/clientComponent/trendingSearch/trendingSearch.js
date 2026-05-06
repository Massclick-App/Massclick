import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import { getTrendingCategories } from "../../../redux/actions/businessListAction";

import "./trendingSearch.css";


const formatDisplayName = (text) => {
  if (!text) return "";
  return text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const createSlug = (text) => {
  if (!text) return "unknown";
  if (typeof text === "object") {
    text = text.slug || text.name || text.categoryName || "";
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};


const TrendingSearchesCarousel = () => {

  const carouselRef  = useRef(null);
  const autoScrollRef = useRef(null);
  const dispatch = useDispatch();

  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex,    setActiveIndex]    = useState(0);

  const { trendingList = [] } = useSelector((s) => s.businessListReducer);
  const { selectedDistrict }  = useSelector((s) => s.locationReducer);

  const districtSlug =
    selectedDistrict?.slug ||
    createSlug(selectedDistrict) ||
    localStorage.getItem("selectedDistrictSlug") ||
    "tiruchirappalli";


  useEffect(() => {
    dispatch(getTrendingCategories());
  }, [dispatch]);


  /* ── scroll-state tracker ── */
  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;

    const atStart = el.scrollLeft <= 8;
    const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;

    setCanScrollLeft(!atStart);
    setCanScrollRight(!atEnd);

    const firstCard = el.querySelector(".trending-search__card");
    if (firstCard) {
      const cardStep = firstCard.offsetWidth + 16; // gap = 16
      setActiveIndex(Math.round(el.scrollLeft / cardStep));
    }
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, trendingList]);


  /* ── auto-scroll ── */
  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    autoScrollRef.current = setInterval(() => {
      const el = carouselRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 210, behavior: "smooth" });
      }
    }, 3200);
  }, []); // eslint-disable-line

  function stopAutoScroll() {
    clearInterval(autoScrollRef.current);
  }

  useEffect(() => {
    if (trendingList.length > 1) startAutoScroll();
    return stopAutoScroll;
  }, [trendingList, startAutoScroll]);


  /* ── navigation ── */
  const scrollBy = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 210, behavior: "smooth" });
  };

  const scrollToIndex = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(".trending-search__card");
    cards[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  const DOT_LIMIT = 10;
  const dotCount  = Math.min(trendingList.length, DOT_LIMIT);


  return (

    <section className="ts">

      <div className="ts__inner">


        {/* ── header ── */}
        <div className="ts__header">

          <div>
            <h2 className="ts__title">Trending Near You</h2>
            <p  className="ts__subtitle">
              Discover what people around you are searching for right now.
            </p>
          </div>

          <Link to={`/${districtSlug}`} className="ts__view-all">
            View All <ChevronRightIcon fontSize="small" />
          </Link>

        </div>


        {/* ── carousel wrap ── */}
        <div className="ts__wrap">

          {/* left arrow */}
          <button
            className={`ts__arrow ts__arrow--left${canScrollLeft ? " ts__arrow--visible" : ""}`}
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </button>


          {/* track */}
          <div
            className="ts__track"
            ref={carouselRef}
            onMouseEnter={stopAutoScroll}
            onMouseLeave={startAutoScroll}
          >
            {trendingList.map((service, index) => {

              const categorySlug = createSlug(service.categoryName);

              return (
                <Link
                  key={index}
                  to={`/${districtSlug}/${categorySlug}`}
                  className="ts__card"
                >

                  <div className="ts__card-img-wrap">
                    <img
                      src={service.categoryImage}
                      alt={formatDisplayName(service.categoryName)}
                      className="ts__card-img"
                      loading="lazy"
                    />
                    <div className="ts__card-img-overlay" />
                  </div>

                  <div className="ts__card-body">
                    <p className="ts__card-name">{formatDisplayName(service.categoryName)}</p>
                    <span className="ts__card-cta">
                      Explore <ChevronRightIcon className="ts__cta-icon" />
                    </span>
                  </div>

                </Link>
              );

            })}
          </div>


          {/* right arrow */}
          <button
            className={`ts__arrow ts__arrow--right${canScrollRight ? " ts__arrow--visible" : ""}`}
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
          >
            <ArrowForwardIosIcon fontSize="small" />
          </button>

        </div>


        {/* ── dot indicators ── */}
        {dotCount > 1 && (
          <div className="ts__dots">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                className={`ts__dot${i === activeIndex % dotCount ? " ts__dot--active" : ""}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to item ${i + 1}`}
              />
            ))}
          </div>
        )}


      </div>
    </section>

  );

};


export default TrendingSearchesCarousel;
