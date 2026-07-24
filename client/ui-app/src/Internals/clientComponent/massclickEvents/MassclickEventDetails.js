import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  Maximize2,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { viewMassclickEvent } from "../../../redux/actions/massclickEventAction.js";
import styles from "./MassclickEventDetails.module.css";

export default function MassclickEventDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(null);
  const { selectedEvent: event, loading, error } = useSelector((state) => state.massclickEvents);

  useEffect(() => { dispatch(viewMassclickEvent(id)).catch(() => {}); }, [dispatch, id]);

  const mediaItems = event?.mediaItems?.length ? event.mediaItems : [event?.media].filter(Boolean);
  const activeMedia = activeIndex === null ? null : mediaItems[activeIndex];
  const showPrevious = () => setActiveIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % mediaItems.length);

  useEffect(() => {
    if (activeIndex === null) return undefined;
    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") setActiveIndex(null);
      if (keyboardEvent.key === "ArrowLeft") setActiveIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);
      if (keyboardEvent.key === "ArrowRight") setActiveIndex((current) => (current + 1) % mediaItems.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, mediaItems.length]);

  if (loading && !event) return <main className={styles.state}>Loading event story…</main>;
  if (error && !event) return <main className={styles.state}><h1>Event unavailable</h1><p>{error}</p></main>;
  if (!event) return null;

  const date = new Date(event.eventDate).toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar} aria-label="Event navigation">
          <button className={styles.back} type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back to events
          </button>
          <div className={styles.brandMark}><span>MC</span> Events &amp; Updates</div>
        </nav>

        <article className={styles.document}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <Sparkles size={14} />
              {event.featured ? "Featured story" : "Inside MassClick"}
            </div>
            <h1>{event.title}</h1>
            {event.description && <p>{event.description}</p>}
            <div className={styles.heroMeta}>
              <time><CalendarDays size={17} /> {date}</time>
              {event.venue && <span><MapPin size={17} /> {event.venue}</span>}
            </div>
          </div>
          <div className={styles.heroMedia}>
            {event.media?.mediaType === "video" ? (
              <video src={event.media.mediaUrl} poster={event.media.thumbnailUrl || undefined} controls />
            ) : <img src={event.media?.mediaUrl} alt={event.title} />}
            <span>MassClick event archive</span>
          </div>
        </header>

        <section className={styles.overview}>
          <div className={styles.story}>
            <div className={styles.storyLabel}>Our story</div>
            <h2>About this event</h2>
            <p className={styles.lead}>{event.fullDescription || event.description || "A memorable moment from the MassClick journey."}</p>
          </div>
          <aside className={styles.facts} aria-label="Event information">
            <h2>Event information</h2>
            <div>
              <span><CalendarDays /></span>
              <p><small>Date</small><strong>{date}</strong></p>
            </div>
            {event.venue && (
              <div>
                <span><MapPin /></span>
                <p><small>Venue</small><strong>{event.venue}</strong></p>
              </div>
            )}
            <div>
              <span><Images /></span>
              <p><small>Gallery</small><strong>{mediaItems.length} photo{mediaItems.length === 1 ? "" : "s"} &amp; video{mediaItems.length === 1 ? "" : "s"}</strong></p>
            </div>
          </aside>
        </section>

        <section className={styles.gallery}>
          <div className={styles.sectionHeading}>
            <div><span>Captured moments</span><h2>Event gallery</h2><p>A visual record of the people, energy, and highlights from the day.</p></div>
            <strong><Images size={15} /> {mediaItems.length} {mediaItems.length === 1 ? "moment" : "moments"}</strong>
          </div>
          <div className={styles.grid}>
            {mediaItems.map((media, index) => (
              <button
                className={index === 0 && mediaItems.length > 2 ? styles.galleryLead : ""}
                type="button"
                key={`${media.mediaKey || media.mediaUrl}-${index}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Open ${media.mediaType === "video" ? "video" : "photo"} ${index + 1} of ${mediaItems.length}`}
              >
                {media.mediaType === "video" ? (
                  <>
                    <video src={media.mediaUrl} poster={media.thumbnailUrl || undefined} muted preload="metadata" />
                    <Play className={styles.play} fill="currentColor" />
                  </>
                ) : <img src={media.mediaUrl} alt={`${event.title} ${index + 1}`} loading="lazy" />}
                <span className={styles.mediaMeta}>
                  <span>{media.mediaType === "video" ? "Watch video" : `Photo ${String(index + 1).padStart(2, "0")}`}</span>
                  <Maximize2 size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
        </article>
      </div>

      {activeMedia && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Event media viewer" onClick={() => setActiveIndex(null)}>
          <div className={styles.viewerTop}>
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(mediaItems.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => setActiveIndex(null)} aria-label="Close viewer"><X /></button>
          </div>
          {mediaItems.length > 1 && (
            <button className={styles.previous} type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); showPrevious(); }} aria-label="Previous media"><ChevronLeft /></button>
          )}
          <div className={styles.viewerMedia} onClick={(clickEvent) => clickEvent.stopPropagation()}>
            {activeMedia.mediaType === "video"
              ? <video src={activeMedia.mediaUrl} controls autoPlay />
              : <img src={activeMedia.mediaUrl} alt={`${event.title} ${activeIndex + 1}`} />}
          </div>
          {mediaItems.length > 1 && (
            <button className={styles.next} type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); showNext(); }} aria-label="Next media"><ChevronRight /></button>
          )}
        </div>
      )}
    </main>
  );
}
