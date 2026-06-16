import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  MapPin,
  Users,
} from "lucide-react";

import { getAllEventCreation } from "../../../../redux/actions/eventAction.js";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames.js";
import styles from "./eventCarousel.module.css";

const cx = createScopedClassNames(styles);

const formatDateParts = (value) => {
  if (!value) return { day: "--", month: "---", full: "Date to be announced" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "---", full: "Date to be announced" };
  }

  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    full: date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
};

const getCategoryName = (event) =>
  event?.eventCategory?.categoryName || event?.eventCategory || "Featured Event";

const getLocationName = (event) => {
  const location = event?.eventLocation;
  if (!location) return "Location to be announced";
  if (typeof location === "string") return location;
  return [location.locationName, location.city].filter(Boolean).join(", ");
};

const getEventImage = (event) => event?.eventImage || event?.bannerImage || "";

const normalizeLocation = (value = "") => {
  const normalized = value.toString().toLowerCase().trim();

  if (["trichy", "tiruchirappalli"].includes(normalized)) {
    return "tiruchirappalli";
  }

  return normalized;
};

const getLocationValues = (event) => {
  const location = event?.eventLocation;

  if (!location) return [];
  if (typeof location === "string") return [location];

  return [
    location.locationName,
    location.city,
    location.address,
    location.state,
    location.country,
  ].filter(Boolean);
};

const isSameLocation = (event, locationLabel) => {
  const selectedLocation = normalizeLocation(locationLabel);
  if (!selectedLocation) return true;

  return getLocationValues(event).some(
    (value) => normalizeLocation(value) === selectedLocation
  );
};

const isCurrentOrUpcomingEvent = (event) => {
  if (!event?.endDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(event.endDate);
  if (Number.isNaN(endDate.getTime())) return true;
  endDate.setHours(23, 59, 59, 999);

  return endDate >= today;
};

const toSlug = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const getCategorySlug = (event) =>
  event?.eventCategory?.slug || toSlug(getCategoryName(event)) || "featured-event";

const getEventSlug = (event) =>
  event?.slug ||
  toSlug(event?.eventName) ||
  "event";

export default function EventCarousel({
  heading = "Today's Events",
  subheading = "Category wise handpicked events and experiences",
  locationLabel = "Trichy",
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const railRef = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const {
    data = [],
    loading,
    error,
  } = useSelector((state) => state.event.eventCreation);

  useEffect(() => {
    dispatch(
      getAllEventCreation({
        pageNo: 1,
        pageSize: 60,
        options: {
          isActive: true,
          status: "all",
          sortBy: "startDate",
          sortOrder: "asc",
        },
      })
    );
  }, [dispatch]);

  const events = useMemo(
    () =>
      data.filter(
        (event) =>
          event?.isActive !== false &&
          event?.isPublished !== false &&
          event?.status !== "cancelled" &&
          event?.status !== "completed" &&
          isCurrentOrUpcomingEvent(event) &&
          isSameLocation(event, locationLabel)
      ),
    [data, locationLabel]
  );

  const categories = useMemo(() => {
    const categoryMap = new Map();

    events.forEach((event) => {
      const name = getCategoryName(event);
      const slug = getCategorySlug(event);

      if (!categoryMap.has(slug)) {
        categoryMap.set(slug, {
          slug,
          name,
          count: 0,
          events: [],
          image: getEventImage(event),
          nextDate: event.startDate,
        });
      }

      const category = categoryMap.get(slug);
      category.count += 1;
      category.events.push(event);

      const currentDate = new Date(category.nextDate || 0).getTime();
      const eventDate = new Date(event.startDate || 0).getTime();
      if (!category.nextDate || (eventDate && eventDate < currentDate)) {
        category.nextDate = event.startDate;
      }

      if (!category.image && getEventImage(event)) {
        category.image = getEventImage(event);
      }
    });

    return [
      { slug: "all", name: "All Categories", count: categoryMap.size },
      ...Array.from(categoryMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    ];
  }, [events]);

  const visibleEvents = useMemo(() => {
    const filteredEvents = events.filter(
      (event) => getCategorySlug(event) === selectedCategory
    );

    return [...filteredEvents].sort((a, b) => {
      const firstDate = new Date(a.startDate || 0).getTime();
      const secondDate = new Date(b.startDate || 0).getTime();
      return firstDate - secondDate;
    });
  }, [events, selectedCategory]);

  const selectedCategoryDetails = useMemo(
    () =>
      categories.find((category) => category.slug === selectedCategory) ||
      categories[0],
    [categories, selectedCategory]
  );

  const categoryCards = useMemo(
    () => categories.filter((category) => category.slug !== "all"),
    [categories]
  );

  useEffect(() => {
    if (
      selectedCategory !== "all" &&
      categories.length > 0 &&
      !categories.some((category) => category.slug === selectedCategory)
    ) {
      setSelectedCategory("all");
    }
  }, [categories, selectedCategory]);

  const handleCategorySelect = (categorySlug) => {
    setSelectedCategory(categorySlug);
    requestAnimationFrame(() => {
      railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  };

  const scrollCards = (direction) => {
    if (!railRef.current) return;

    const card = railRef.current.querySelector(`.${styles["eventCarousel-card"]}`);
    const cardWidth = card?.clientWidth || 280;
    railRef.current.scrollBy({
      left: direction * (cardWidth + 18) * 2,
      behavior: "smooth",
    });
  };

  const openDetails = (event) => {
    navigate(`/events/${getEventSlug(event)}/${event._id}`, {
      state: { event },
    });
  };

  if (!loading && !error && events.length === 0) {
    return null;
  }

  return (
    <section className={cx("eventCarousel-shell")} aria-label="Events carousel">
      <div className={cx("eventCarousel-header")}>
        <div>
          <div className={cx("eventCarousel-kicker")}>
            <Flame size={18} aria-hidden="true" />
            <span>{heading} in {locationLabel}</span>
          </div>
          <p>{subheading}</p>
        </div>

        {/* <button
          type="button"
          className={cx("eventCarousel-viewAll")}
          onClick={() => navigate("/events")}
        >
          View All Events
          <ArrowRight size={16} aria-hidden="true" />
        </button> */}
      </div>

      <div className={cx("eventCarousel-categories")} aria-label="Event categories">
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            className={cx(`eventCarousel-categoryPill ${
              selectedCategory === category.slug
                ? "eventCarousel-categoryPill--active"
                : ""
            }`)}
            onClick={() => handleCategorySelect(category.slug)}
          >
            <span>{category.name}</span>
            <strong>{category.count}</strong>
          </button>
        ))}
      </div>

      {!loading && !error && (
        <div className={cx("eventCarousel-listHeader")}>
          <div>
            <strong>
              {selectedCategoryDetails?.slug === "all"
                ? "Browse Event Categories"
                : `${selectedCategoryDetails?.name} Events`}
            </strong>
            <span>
              {selectedCategoryDetails?.slug === "all"
                ? `${categoryCards.length} categor${
                    categoryCards.length === 1 ? "y" : "ies"
                  } available`
                : `${visibleEvents.length} event${
                    visibleEvents.length === 1 ? "" : "s"
                  } inside`}
            </span>
          </div>
        </div>
      )}

      <div className={cx("eventCarousel-stage")}>
        <button
          type="button"
          className={cx("eventCarousel-arrow eventCarousel-arrow--left")}
          onClick={() => scrollCards(-1)}
          aria-label="Previous events"
        >
          <ChevronLeft size={22} />
        </button>

        <div className={cx("eventCarousel-rail")} ref={railRef}>
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className={cx("eventCarousel-card eventCarousel-card--loading")} />
            ))}

          {!loading &&
            !error &&
            selectedCategory === "all" &&
            categoryCards.map((category) => {
              const date = formatDateParts(category.nextDate);

              return (
                <article
                  key={category.slug}
                  className={cx("eventCarousel-card eventCarousel-categoryCard")}
                >
                  <button
                    type="button"
                    className={cx("eventCarousel-categoryCardButton")}
                    onClick={() => handleCategorySelect(category.slug)}
                    aria-label={`View ${category.name} events`}
                  >
                    <div className={cx("eventCarousel-media")}>
                      {category.image ? (
                        <img src={category.image} alt={category.name} loading="lazy" />
                      ) : (
                        <div className={cx("eventCarousel-mediaFallback")}>
                          {category.name}
                        </div>
                      )}

                      <span className={cx("eventCarousel-badge")}>{category.name}</span>

                      <time className={cx("eventCarousel-date")} dateTime={category.nextDate}>
                        <strong>{date.day}</strong>
                        <span>{date.month}</span>
                      </time>
                    </div>

                    <div className={cx("eventCarousel-body")}>
                      <h3>{category.name}</h3>

                      <div className={cx("eventCarousel-meta")}>
                        <span>
                          <Layers size={14} aria-hidden="true" />
                          {category.count} event{category.count === 1 ? "" : "s"}
                        </span>
                        <span>
                          <CalendarDays size={14} aria-hidden="true" />
                          Next event: {date.full}
                        </span>
                      </div>

                      <div className={cx("eventCarousel-footer")}>
                        <span className={cx("eventCarousel-interest")}>
                          Open category list
                        </span>

                        <span className={cx("eventCarousel-detailsButton")}>
                          View Events
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}

          {!loading &&
            !error &&
            selectedCategory !== "all" &&
            visibleEvents.map((event) => {
              const date = formatDateParts(event.startDate);
              const image = getEventImage(event);
              const categoryName = getCategoryName(event);
              const locationName = getLocationName(event);
              const interestCount = event.registeredParticipants || event.views || 0;

              return (
                <article key={event._id} className={cx("eventCarousel-card")}>
                  <div className={cx("eventCarousel-media")}>
                    {image ? (
                      <img src={image} alt={event.eventName} loading="lazy" />
                    ) : (
                      <div className={cx("eventCarousel-mediaFallback")}>
                        {categoryName}
                      </div>
                    )}

                    <span className={cx("eventCarousel-badge")}>{categoryName}</span>

                    <time className={cx("eventCarousel-date")} dateTime={event.startDate}>
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </time>
                  </div>

                  <div className={cx("eventCarousel-body")}>
                    <h3>{event.eventName}</h3>

                    <div className={cx("eventCarousel-meta")}>
                      <span>
                        <CalendarDays size={14} aria-hidden="true" />
                        {date.full}
                      </span>
                      <span>
                        <Clock size={14} aria-hidden="true" />
                        {event.startTime || "Time to be announced"}
                      </span>
                      <span>
                        <MapPin size={14} aria-hidden="true" />
                        {locationName}
                      </span>
                    </div>

                    <div className={cx("eventCarousel-footer")}>
                      <span className={cx("eventCarousel-interest")}>
                        <Users size={14} aria-hidden="true" />
                        {interestCount.toLocaleString("en-IN")} Interested
                      </span>

                      <button
                        type="button"
                        className={cx("eventCarousel-detailsButton")}
                        onClick={() => openDetails(event)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

          {!loading &&
            !error &&
            selectedCategory !== "all" &&
            visibleEvents.length === 0 && (
            <div className={cx("eventCarousel-empty")}>
              <h3>No events found</h3>
              <p>Try another category or check back for new event listings.</p>
            </div>
          )}

          {!loading && error && (
            <div className={cx("eventCarousel-empty eventCarousel-empty--error")}>
              <h3>Events unavailable</h3>
              <p>{error}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          className={cx("eventCarousel-arrow eventCarousel-arrow--right")}
          onClick={() => scrollCards(1)}
          aria-label="Next events"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </section>
  );
}
