import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { getTrendingCategories } from "../../../redux/actions/businessListAction";
import { getEffectiveSearchLocation } from "../../../utils/searchResultNavigation";
import styles from "./trendingSearch.module.css";
const cx = createScopedClassNames(styles);
const formatDisplayName = text => {
  if (!text) return "";
  return text.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};
const createSlug = text => {
  if (!text) return "unknown";
  if (typeof text === "object") {
    text = text.slug || text.name || text.categoryName || "";
  }
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};
const TrendingSearchesCarousel = () => {
  const carouselRef = useRef(null);
  const autoScrollRef = useRef(null);
  const cardWidthRef = useRef(210);
  const userInteractedRef = useRef(false);
  const scrollDimensionsRef = useRef({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0
  });
  const dispatch = useDispatch();
  const [activeIndex, setActiveIndex] = useState(0);
  const {
    trendingList = []
  } = useSelector(s => s.businessListReducer);
  const {
    selectedDistrict
  } = useSelector(s => s.locationReducer);
  const districtSlug = selectedDistrict?.slug || createSlug(selectedDistrict) || localStorage.getItem("selectedDistrictSlug") || "tiruchirappalli";
  // Trending links route to the specific location the user picked (falls back
  // to the district scope only when the location field is empty).
  const { location: effectiveLocation } = getEffectiveSearchLocation(selectedDistrict);
  const locationSlug = createSlug(effectiveLocation) || districtSlug;
  useEffect(() => {
    dispatch(getTrendingCategories());
  }, [dispatch]);

  // Batch DOM reads: cache card width + scroll dimensions using ResizeObserver
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const firstCard = el.querySelector(".ts__card");
    if (!firstCard) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === firstCard) {
          // Use entry.contentRect to avoid re-querying offsetWidth (forced reflow)
          cardWidthRef.current = entry.contentRect.width + 16;
        } else if (entry.target === el) {
          scrollDimensionsRef.current.clientWidth = entry.contentRect.width;
          // scrollWidth requires a DOM read but layout is already stable here
          scrollDimensionsRef.current.scrollWidth = el.scrollWidth;
        }
      }
    });

    // Defer initial geometry read past React's commit phase to avoid forced reflow
    const rafId = requestAnimationFrame(() => {
      cardWidthRef.current = firstCard.getBoundingClientRect().width + 16;
      scrollDimensionsRef.current = {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollLeft: el.scrollLeft
      };
    });

    observer.observe(firstCard);
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [trendingList]);

  /* ── scroll-state tracker (uses cached dimensions) ── */
  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    scrollDimensionsRef.current.scrollLeft = scrollLeft;
    setActiveIndex(Math.round(scrollLeft / cardWidthRef.current));
  }, []);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, {
      passive: true
    });
    // Defer initial read past React's commit phase to avoid forced reflow
    const raf = requestAnimationFrame(updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      cancelAnimationFrame(raf);
    };
  }, [updateScrollState, trendingList]);

  /* ── auto-scroll (uses cached dimensions) ── */
  const startAutoScroll = useCallback(() => {
    if (userInteractedRef.current) return;
    stopAutoScroll();
    autoScrollRef.current = setInterval(() => {
      const el = carouselRef.current;
      if (!el) return;
      const {
        scrollWidth,
        clientWidth,
        scrollLeft
      } = scrollDimensionsRef.current;
      if (scrollLeft >= scrollWidth - clientWidth - 8) {
        el.scrollTo({
          left: 0,
          behavior: "smooth"
        });
      } else {
        el.scrollBy({
          left: cardWidthRef.current,
          behavior: "smooth"
        });
      }
    }, 3200);
  }, []);
  function stopAutoScroll() {
    clearInterval(autoScrollRef.current);
  }
  const stopAutoScrollAfterUserInteraction = useCallback(() => {
    userInteractedRef.current = true;
    stopAutoScroll();
  }, []);
  useEffect(() => {
    if (trendingList.length > 1) startAutoScroll();
    return stopAutoScroll;
  }, [trendingList, startAutoScroll]);

  /* ── navigation ── */
  const scrollBy = dir => {
    stopAutoScrollAfterUserInteraction();
    carouselRef.current?.scrollBy({
      left: dir * cardWidthRef.current,
      behavior: "smooth"
    });
  };
  const scrollToIndex = idx => {
    stopAutoScrollAfterUserInteraction();
    const el = carouselRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(".ts__card");
    cards[idx]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start"
    });
  };
  const DOT_LIMIT = 10;
  const dotCount = Math.min(trendingList.length, DOT_LIMIT);
  return <section className={cx("ts")}>

      <div className={cx("ts__inner")}>

        {/* ── header ── */}
        <div className={cx("ts__header")}>

          <div>
            <h2 className={cx("ts__title")}>Trending Near You</h2>
            <p className={cx("ts__subtitle")}>
              Discover what people around you are searching for right now.
            </p>
          </div>

          {/* <Link to={`/${districtSlug}`} className="ts__view-all">
            View All <ChevronRightIcon fontSize="small" />
           </Link> */}

        </div>

        {/* ── carousel wrap ── */}
        <div className={cx("ts__wrap")}>

          {/* left arrow */}
          <button className={cx("ts__arrow ts__arrow--left ts__arrow--visible")} onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <ArrowBackIosNewIcon fontSize="small" />
          </button>


          {/* track */}
          <div className={cx("ts__track")} ref={carouselRef} onWheel={stopAutoScrollAfterUserInteraction} onTouchStart={stopAutoScrollAfterUserInteraction} onPointerDown={stopAutoScrollAfterUserInteraction} onMouseEnter={stopAutoScroll} onMouseLeave={startAutoScroll}>
            {trendingList.map((service, index) => {
            const categorySlug = createSlug(service.categoryName);
            return <Link key={index} to={`/${locationSlug}/${categorySlug}`} className={cx("ts__card")}>

                  <div className={cx("ts__card-img-wrap")}>
                    <img src={service.categoryImageKey || service.categoryImages?.webCard || service.categoryImages?.webHero || ""} alt={formatDisplayName(service.categoryName)} className={cx("ts__card-img")} loading="lazy" decoding="async" width="144" height="144" />
                    <div className={cx("ts__card-img-overlay")} />
                  </div>

                  <div className={cx("ts__card-body")}>
                    <p className={cx("ts__card-name")}>{formatDisplayName(service.categoryName)}</p>
                    <span className={cx("ts__card-cta")}>
                      Explore <ChevronRightIcon className={cx("ts__cta-icon")} />
                    </span>
                  </div>

                </Link>;
          })}
          </div>

          {/* right arrow */}
          <button className={cx("ts__arrow ts__arrow--right ts__arrow--visible")} onClick={() => scrollBy(1)} aria-label="Scroll right">
            <ArrowForwardIosIcon fontSize="small" />
          </button>

        </div>


        {/* ── dot indicators ── */}
        {dotCount > 1 && <div className={cx("ts__dots")}>
            {Array.from({
          length: dotCount
        }).map((_, i) => <button key={i} className={cx(`ts__dot${i === activeIndex % dotCount ? " ts__dot--active" : ""}`)} onClick={() => scrollToIndex(i)} aria-label={`Go to item ${i + 1}`} />)}
          </div>}

      </div>
    </section>;
};
export default TrendingSearchesCarousel;
