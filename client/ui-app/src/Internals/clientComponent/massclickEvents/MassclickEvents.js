import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { getAllMassclickEvents } from "../../../redux/actions/massclickEventAction.js";
import styles from "./MassclickEvents.module.css";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function MassclickEvents() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const railRef = useRef(null);
  const { data, loading } = useSelector((state) => state.massclickEvents);

  useEffect(() => {
    dispatch(getAllMassclickEvents({ pageSize: 20 }));
  }, [dispatch]);

  if (!loading && !data.length) return null;

  const featured = data.find((event) => event.featured) || data[0];
  const cards = data.filter((event) => event._id !== featured?._id);
  const openEvent = (event) => navigate(`/massclick-events/${event._id}`);
  const scroll = (direction) =>
    railRef.current?.scrollBy({
      left: direction * Math.min(railRef.current.clientWidth * 0.8, 720),
      behavior: "smooth",
    });

  return (
    <section className={styles.section} aria-labelledby="massclick-events-title">
      <header className={styles.header}>
        <div>
          <h2 id="massclick-events-title">MassClick Events &amp; Updates <Sparkles size={18} /></h2>
          <p>Moments that make us stronger together</p>
        </div>
        {cards.length > 0 && (
          <button type="button" className={styles.viewAll} onClick={() => scroll(1)}>
            View all events <ArrowRight size={15} />
          </button>
        )}
      </header>

      <div className={`${styles.carousel} ${cards.length ? "" : styles.single}`}>
        {featured && (
          <article
            className={styles.featured}
            role="link"
            tabIndex="0"
            onClick={() => openEvent(featured)}
            onKeyDown={(keyboardEvent) => keyboardEvent.key === "Enter" && openEvent(featured)}
          >
            {featured.media?.mediaType === "video" ? (
              <video src={featured.media.mediaUrl} poster={featured.media.thumbnailUrl || undefined} muted playsInline preload="metadata" />
            ) : <img src={featured.media?.mediaUrl} alt={featured.title} />}
            <div className={styles.featureOverlay}>
              <span>Featured event</span>
              <h3>{featured.title}</h3>
              <p>{featured.description}</p>
              <time><CalendarDays size={15} /> {formatDate(featured.eventDate)}</time>
            </div>
          </article>
        )}

        {(loading || cards.length > 0) && (
          <div className={styles.rail} ref={railRef}>
            {(loading && !cards.length ? Array.from({ length: 4 }) : cards).map((event, index) =>
              event ? (
                <article
                  className={styles.card}
                  key={event._id}
                  role="link"
                  tabIndex="0"
                  onClick={() => openEvent(event)}
                  onKeyDown={(keyboardEvent) => keyboardEvent.key === "Enter" && openEvent(event)}
                >
                  <div className={styles.cardMedia}>
                    {event.media?.mediaType === "video" ? (
                      <>
                        <video src={event.media.mediaUrl} poster={event.media.thumbnailUrl || undefined} muted playsInline preload="metadata" />
                        <Play className={styles.play} fill="currentColor" />
                      </>
                    ) : <img src={event.media?.mediaUrl} alt={event.title} loading="lazy" />}
                    <time>{formatDate(event.eventDate)}</time>
                  </div>
                  <div className={styles.cardBody}>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <span>View story <ArrowRight size={14} /></span>
                  </div>
                </article>
              ) : <div className={styles.skeleton} key={index} />
            )}
          </div>
        )}

        {cards.length > 0 && (
          <>
            <button type="button" className={`${styles.arrow} ${styles.previous}`} onClick={() => scroll(-1)} aria-label="Previous events"><ChevronLeft /></button>
            <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => scroll(1)} aria-label="Next events"><ChevronRight /></button>
          </>
        )}
      </div>
    </section>
  );
}
