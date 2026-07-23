import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Images, MapPin, Play, Sparkles, X } from "lucide-react";
import { viewMassclickEvent } from "../../../redux/actions/massclickEventAction.js";
import styles from "./MassclickEventDetails.module.css";

export default function MassclickEventDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeMedia, setActiveMedia] = useState(null);
  const { selectedEvent: event, loading, error } = useSelector((state) => state.massclickEvents);

  useEffect(() => { dispatch(viewMassclickEvent(id)).catch(() => {}); }, [dispatch, id]);

  if (loading && !event) return <main className={styles.state}>Loading event story…</main>;
  if (error && !event) return <main className={styles.state}><h1>Event unavailable</h1><p>{error}</p></main>;
  if (!event) return null;

  const mediaItems = event.mediaItems?.length ? event.mediaItems : [event.media].filter(Boolean);
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
          {event.media?.mediaType === "video" ? (
            <video src={event.media.mediaUrl} poster={event.media.thumbnailUrl || undefined} controls />
          ) : <img src={event.media?.mediaUrl} alt={event.title} />}
          <div className={styles.heroShade}>
            <div className={styles.eyebrow}>
              <Sparkles size={14} />
              {event.featured ? "Featured MassClick event" : "Inside MassClick"}
            </div>
            <h1>{event.title}</h1>
            {event.description && <p>{event.description}</p>}
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
            <div><span>Captured moments</span><h2>Event gallery</h2><p>Explore the people, energy and moments that made this event special.</p></div>
            <strong>{mediaItems.length} items</strong>
          </div>
          <div className={styles.grid}>
            {mediaItems.map((media, index) => (
              <button className={index === 0 && mediaItems.length > 2 ? styles.galleryLead : ""} type="button" key={`${media.mediaKey}-${index}`} onClick={() => setActiveMedia(media)}>
                {media.mediaType === "video" ? (
                  <>
                    <video src={media.mediaUrl} poster={media.thumbnailUrl || undefined} muted preload="metadata" />
                    <Play className={styles.play} fill="currentColor" />
                  </>
                ) : <img src={media.mediaUrl} alt={`${event.title} ${index + 1}`} loading="lazy" />}
              </button>
            ))}
          </div>
        </section>
        </article>
      </div>

      {activeMedia && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Event media viewer">
          <button type="button" onClick={() => setActiveMedia(null)} aria-label="Close viewer"><X /></button>
          {activeMedia.mediaType === "video"
            ? <video src={activeMedia.mediaUrl} controls autoPlay />
            : <img src={activeMedia.mediaUrl} alt={event.title} />}
        </div>
      )}
    </main>
  );
}
