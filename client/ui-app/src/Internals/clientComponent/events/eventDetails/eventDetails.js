import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Eye,
  Globe,
  Mail,
  MapPin,
  Phone,
  Share2,
  Tag,
  Ticket,
  Users,
} from "lucide-react";

import { viewEventCreation } from "../../../../redux/actions/eventAction.js";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";

import styles from "./eventDetails.module.css";

const cx = createScopedClassNames(styles);

const formatDate = (value) => {
  if (!value) return "To be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getCategoryName = (event) => {
  const category = event?.eventCategory;
  if (!category) return "Featured Event";
  if (typeof category === "string") return category;
  return category.categoryName || category.slug || "Featured Event";
};

const getLocationName = (event) => {
  const location = event?.eventLocation;
  if (!location) return "Location to be announced";
  if (typeof location === "string") return location;
  return [location.locationName, location.city].filter(Boolean).join(", ");
};

const getImage = (event) => event?.bannerImage || event?.eventImage || "";

const DetailItem = ({ icon: Icon, label, value }) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className={cx("eventDetails-infoItem")}>
      <span className={cx("eventDetails-infoIcon")}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

export default function EventDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    data: detailEvent,
    loading,
    error,
  } = useSelector((state) => state.event.eventCreationDetail);

  const event = detailEvent || location.state?.event || null;

  useEffect(() => {
    if (id) {
      dispatch(viewEventCreation(id)).catch(() => {});
    }
  }, [dispatch, id]);

  const keywords = useMemo(
    () => (Array.isArray(event?.keywords) ? event.keywords.filter(Boolean) : []),
    [event]
  );

  if (loading && !event) {
    return (
      <main className={cx("eventDetails-page")}>
        <div className={cx("eventDetails-loading")} />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className={cx("eventDetails-page")}>
        <section className={cx("eventDetails-empty")}>
          <h1>Event details unavailable</h1>
          <p>{error || "This event could not be found."}</p>
          <button type="button" onClick={() => navigate("/events")}>
            Back to Events
          </button>
        </section>
      </main>
    );
  }

  const image = getImage(event);
  const categoryName = getCategoryName(event);
  const locationName = getLocationName(event);

  return (
    <main className={cx("eventDetails-page")}>
      <section className={cx("eventDetails-hero")}>
        {image ? (
          <img src={image} alt={event.eventName} className={cx("eventDetails-heroImage")} />
        ) : (
          <div className={cx("eventDetails-heroFallback")} />
        )}

        <div className={cx("eventDetails-heroOverlay")}>
          <button
            type="button"
            className={cx("eventDetails-backButton")}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </button>

          <div className={cx("eventDetails-titleBlock")}>
            <span className={cx("eventDetails-category")}>{categoryName}</span>
            <h1>{event.eventName}</h1>
            <p>{event.description || "Explore complete event details, schedule and registration information."}</p>
          </div>
        </div>
      </section>

      <section className={cx("eventDetails-content")}>
        <div className={cx("eventDetails-main")}>
          <div className={cx("eventDetails-summaryGrid")}>
            <DetailItem icon={CalendarDays} label="Start Date" value={formatDate(event.startDate)} />
            <DetailItem icon={CalendarDays} label="End Date" value={formatDate(event.endDate)} />
            <DetailItem icon={Clock} label="Start Time" value={event.startTime || "To be announced"} />
            <DetailItem icon={Clock} label="End Time" value={event.endTime || "To be announced"} />
            <DetailItem icon={MapPin} label="Venue" value={locationName} />
            <DetailItem icon={Tag} label="Event Type" value={event.eventType || "physical"} />
          </div>

          <article className={cx("eventDetails-section")}>
            <h2>About This Event</h2>
            <p>
              {event.description ||
                "Detailed information for this event will be updated by the organizer."}
            </p>
          </article>

          <article className={cx("eventDetails-section eventDetails-twoColumn")}>
            <div>
              <h2>Organizer</h2>
              <DetailItem icon={Users} label="Organizer" value={event.organizer || "Organizer team"} />
              <DetailItem icon={Mail} label="Email" value={event.organizerEmail} />
              <DetailItem icon={Phone} label="Phone" value={event.organizerPhone} />
            </div>

            <div>
              <h2>Attendance</h2>
              <DetailItem icon={Users} label="Capacity" value={`${event.capacity || 0} seats`} />
              <DetailItem
                icon={Users}
                label="Registered"
                value={`${event.registeredParticipants || 0} participants`}
              />
              <DetailItem icon={Eye} label="Views" value={`${event.views || 0} views`} />
            </div>
          </article>

          {keywords.length > 0 && (
            <article className={cx("eventDetails-section")}>
              <h2>Keywords</h2>
              <div className={cx("eventDetails-keywords")}>
                {keywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </article>
          )}
        </div>

        <aside className={cx("eventDetails-aside")}>
          <div className={cx("eventDetails-ticketCard")}>
            <span className={cx("eventDetails-ticketIcon")}>
              <Ticket size={22} aria-hidden="true" />
            </span>
            <small>Ticket Price</small>
            <strong>
              {Number(event.ticketPrice || 0) > 0
                ? `₹${Number(event.ticketPrice).toLocaleString("en-IN")}`
                : "Free Entry"}
            </strong>

            {event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noreferrer"
                className={cx("eventDetails-primaryAction")}
              >
                Register Now
                <Globe size={16} aria-hidden="true" />
              </a>
            ) : (
              <button type="button" className={cx("eventDetails-primaryAction")} disabled>
                Registration Opens Soon
              </button>
            )}

            <button
              type="button"
              className={cx("eventDetails-secondaryAction")}
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
            >
              Share Event
              <Share2 size={16} aria-hidden="true" />
            </button>
          </div>

          <div className={cx("eventDetails-statusCard")}>
            <span>Status</span>
            <strong>{event.status || "upcoming"}</strong>
            <span>Publishing</span>
            <strong>{event.isPublished ? "Published" : "Draft"}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
