import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./testimonials.module.css";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Footer from "../footer";
import StickySearchBar from '../../StickySearchBar/StickySearchBar';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";

const cx = createScopedClassNames(styles);

const clientTestimonials = [
  {
    id: 1,
    name: "Sri Balaji",
    quote:
      "Mr. Murugan and team have been very professional since day one. They answered all my queries, shared reports every morning, and always kept the next action plan clear.",
  },
  {
    id: 2,
    name: "Raja Kumaran",
    quote:
      "Service is good and customer care gives a quick response to any queries.",
  },
  {
    id: 3,
    name: "Arifa Banu",
    quote:
      "I searched for a special school on Google and found MassClick on the first page. The process was simple and I could complete the admission easily.",
  },
  {
    id: 4,
    name: "Shiva G",
    quote:
      "We are very grateful to MassClick. Because of them we have more customers and our business is expanding faster than we expected.",
  },
  {
    id: 5,
    name: "Don VJ",
    quote:
      "We are getting great reach to people because of MassClick. The team is cooperative, supportive, and energetic.",
  },
  {
    id: 6,
    name: "Jaiganesh B",
    quote: "Amazing, nice, excellent, super support.",
  },
];

const TestimonialCard = React.forwardRef(({ testimonial }, ref) => {
  const avatarLabel = testimonial.name.trim().charAt(0).toUpperCase();

  return (
    <article className={cx("testimonial-card")} ref={ref}>
      <div className={cx("testimonial-top")}> 
        <div className={cx("testimonial-avatar")} aria-hidden="true">
          {avatarLabel}
        </div>
        <div className={cx("testimonial-meta")}> 
          <h3 className={cx("author-name")}>{testimonial.name}</h3>
          <p className={cx("author-source")}>Client testimonial</p>
        </div>
      </div>

      <p className={cx("testimonial-quote")}>{testimonial.quote}</p>
      <div className={cx("testimonial-accent")} aria-hidden="true" />
    </article>
  );
});

TestimonialCard.displayName = "TestimonialCard";

const Testimonials = () => {
  const dispatch = useDispatch();
  const { meta: seoMetaData } = useSelector((state) => state.seoReducer);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);
  const cardRefs = useRef([]);
  const scrollRafRef = useRef(null);
  const autoScrollInterval = 20000;

  useEffect(() => {
    dispatch(fetchSeoMeta({ pageType: "testimonial" }));
  }, [dispatch]);

  const fallbackSeo = {
    title: "Testimonials - Massclick",
    description:
      "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "testimonial massclick, business directory, local search",
    canonical: "https://massclick.in/testimonial",
    robots: "index, follow",
  };

  const scrollToIndex = useCallback((index, behavior = "smooth") => {
    const slider = sliderRef.current;
    const targetCard = cardRefs.current[index];

    if (!slider || !targetCard) return;

    const nextLeft =
      targetCard.offsetLeft - (slider.clientWidth - targetCard.clientWidth) / 2;

    slider.scrollTo({
      left: Math.max(0, nextLeft),
      behavior,
    });

    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const nextIndex =
        prevIndex === clientTestimonials.length - 1 ? 0 : prevIndex + 1;
      window.requestAnimationFrame(() => scrollToIndex(nextIndex));
      return nextIndex;
    });
  }, [scrollToIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const nextIndex =
        prevIndex === 0 ? clientTestimonials.length - 1 : prevIndex - 1;
      window.requestAnimationFrame(() => scrollToIndex(nextIndex));
      return nextIndex;
    });
  }, [scrollToIndex]);

  const syncCurrentIndexFromScroll = useCallback(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const viewportCenter = slider.scrollLeft + slider.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setCurrentIndex(closestIndex);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncCurrentIndexFromScroll();
    });
  }, [syncCurrentIndexFromScroll]);

  useEffect(() => {
    const timer = window.setInterval(handleNext, autoScrollInterval);
    return () => window.clearInterval(timer);
  }, [handleNext, autoScrollInterval]);

  useEffect(
    () => () => {
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    },
    []
  );

  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
      <StickySearchBar />

      <section className={cx("section-testimonials")}> 
        <div className={cx("section-shell")}>
          <div className={cx("section-heading")}>
            <p className={cx("section-eyebrow")}>Trusted feedback</p>
            <h2 className={cx("section-title-testimonials")}>
              Our Clients Say{" "}
              <span className={cx("highlight-text-testimonials")}>About Us</span>
            </h2>
            <p className={cx("section-description")}>
              Real stories from businesses that partnered with MassClick to improve
              reach, visibility, and customer response.
            </p>
          </div>

          <div className={cx("slider-container")}>
            <div
              className={cx("slider-track")}
              ref={sliderRef}
              onScroll={handleScroll}
              aria-label="Client testimonials"
            >
              {clientTestimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                />
              ))}
            </div>

            <button
              className={cx("slider-control", "prev")}
              onClick={handlePrev}
              aria-label="Previous testimonial"
              type="button"
            >
              <ChevronLeftIcon className={cx("control-icon")} />
            </button>
            <button
              className={cx("slider-control", "next")}
              onClick={handleNext}
              aria-label="Next testimonial"
              type="button"
            >
              <ChevronRightIcon className={cx("control-icon")} />
            </button>
          </div>

          <div className={cx("slider-indicators")}>
            {clientTestimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                className={cx("indicator-dot", index === currentIndex && "active")}
                onClick={() => scrollToIndex(index)}
                aria-label={`Go to testimonial ${index + 1}`}
                aria-current={index === currentIndex ? "true" : "false"}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Testimonials;
