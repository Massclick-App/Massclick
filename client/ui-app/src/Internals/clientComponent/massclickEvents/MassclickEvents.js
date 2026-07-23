import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { getAllMassclickEvents } from "../../../redux/actions/massclickEventAction.js";
import styles from "./MassclickEvents.module.css";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function MassclickEvents() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const railRef = useRef(null);
  const { data, loading } = useSelector((state) => state.massclickEvents);

  useEffect(() => { dispatch(getAllMassclickEvents({ pageSize: 20 })); }, [dispatch]);

  if (!loading && !data.length) return null;
  const featured = data.find((event) => event.featured) || data[0];
  const cards = data.filter((event) => event._id !== featured?._id);
  const scroll = (direction) => railRef.current?.scrollBy({ left: direction * 560, behavior: "smooth" });

  return (
    <section className={styles.shell} aria-labelledby="massclick-events-title">
      <header className={styles.header}>
        <div>
          <h2 id="massclick-events-title">MassClick Events &amp; Updates <span>✦</span></h2>
          <p>Moments that make us stronger together</p>
        </div>
        <button type="button" className={styles.viewAll}>View All Events <ArrowRight size={16} /></button>
      </header>

      <div className={`${styles.content} ${cards.length ? "" : styles.single}`}>
        {featured && (
          <article
            className={styles.featured}
            role="link"
            tabIndex="0"
            onClick={() => navigate(`/massclick-events/${featured._id}`)}
            onKeyDown={(event) => event.key === "Enter" && navigate(`/massclick-events/${featured._id}`)}
          >
            {featured.media?.mediaType === "video" ? (
              <video src={featured.media.mediaUrl} poster={featured.media.thumbnailUrl || undefined} muted playsInline preload="metadata" />
            ) : <img src={featured.media?.mediaUrl} alt={featured.title} />}
            <div className={styles.overlay}>
              <span>Featured event</span>
              <h3>{featured.title}</h3>
              <p>{featured.description}</p>
              <time><CalendarDays size={16} /> {formatDate(featured.eventDate)}</time>
            </div>
          </article>
        )}

        <div className={styles.cards} ref={railRef}>
          {(loading ? Array.from({ length: 4 }) : cards).map((event, index) =>
            event ? (
              <article className={styles.card} key={event._id} onClick={() => navigate(`/massclick-events/${event._id}`)}>
                <div className={styles.media}>
                  {event.media?.mediaType === "video" ? (
                    <>
                      <video src={event.media.mediaUrl} poster={event.media.thumbnailUrl || undefined} muted playsInline preload="metadata" />
                      <Play className={styles.play} fill="currentColor" />
                    </>
                  ) : <img src={event.media?.mediaUrl} alt={event.title} loading="lazy" />}
                  <time>{formatDate(event.eventDate)}</time>
                </div>
                <div className={styles.body}>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <button type="button" onClick={() => navigate(`/massclick-events/${event._id}`)}>View Story <ArrowRight size={14} /></button>
                </div>
              </article>
            ) : <div className={styles.skeleton} key={index} />
          )}
        </div>
        <button type="button" className={`${styles.arrow} ${styles.left}`} onClick={() => scroll(-1)} aria-label="Previous updates"><ChevronLeft /></button>
        <button type="button" className={`${styles.arrow} ${styles.right}`} onClick={() => scroll(1)} aria-label="Next updates"><ChevronRight /></button>
      </div>
    </section>
  );
}
