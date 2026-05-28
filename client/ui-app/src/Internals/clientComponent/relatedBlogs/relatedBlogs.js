import React, { useRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoPageContentBlogsMeta } from "../../../redux/actions/seoPageContentBlogAction";
import { getPlaceholderImage } from "../../../utils/placeholderImage";
import "./relatedBlogs.css";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { Skeleton } from "@mui/material";

const BlogsSkeleton = () => (
  <div className="blogs-skeleton">
    {[...Array(4)].map((_, i) => (
      <div className="blog-skeleton-card" key={i}>
        <Skeleton variant="rounded" width="100%" height={260} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.08)", borderRadius: "14px 14px 0 0" }} />
        <div className="skeleton-content">
          <Skeleton variant="rounded" width="85%" height={20} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.08)" }} />
          <Skeleton variant="rounded" width="60%" height={16} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.08)", mt: 1 }} />
          <Skeleton variant="rounded" width="40%" height={14} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.08)", mt: 1.2 }} />
        </div>
      </div>
    ))}
  </div>
);

const BlogCard = ({ item, createSlug }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imageSrc = item.profileImage || getPlaceholderImage();

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div
      className="related-card"
      onClick={() =>
        window.open(`/blog/${item.slug || createSlug(item.heading)}`, "_blank")
      }
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          window.open(`/blog/${item.slug || createSlug(item.heading)}`, "_blank");
        }
      }}
      aria-label={`Read article: ${item.heading}`}
    >
      <div className="card-image-wrapper">
        <img
          src={imageSrc}
          alt={item.heading}
          className={`card-image ${imageLoaded ? "loaded" : "loading"}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          width="600"
          height="400"
        />
        {!imageLoaded && (
          <div className="image-placeholder">
            <div className="placeholder-shimmer"></div>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="content-top">
          <h4 className="card-title">{item.heading}</h4>
          {item.description && <p className="card-description">{item.description}</p>}
        </div>
        <div className="card-footer">
          <span className="explore-link">
            <span>Explore Article</span>
            <ArrowOutwardIcon className="arrow-icon" />
          </span>
        </div>
      </div>
    </div>
  );
};

const RelatedBlogs = ({ location }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const cardWidthRef = useRef(320);

  const {
    list = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.seoPageContentBlogReducer);

  useEffect(() => {
    const cleanLocation = (location || "").toLowerCase().trim();

    if (!cleanLocation) return;

    dispatch(
      fetchSeoPageContentBlogsMeta({
        pageType: "category",
        location: cleanLocation,
      })
    );
  }, [dispatch, location]);

  // Cache card width using ResizeObserverEntry (no forced reflows)
  useEffect(() => {
    const box = scrollRef.current;
    if (!box?.firstChild) return;

    const updateWidth = (entry) => {
      cardWidthRef.current = entry.contentRect.width || 320;
    };

    const observer = new ResizeObserver((entries) => {
      entries.forEach(entry => updateWidth(entry));
    });

    observer.observe(box.firstChild);

    return () => observer.disconnect();
  }, [list]);

  const scroll = (dir) => {
    const box = scrollRef.current;
    if (!box) return;

    box.scrollBy({
      left: dir === "left" ? -cardWidthRef.current : cardWidthRef.current,
      behavior: "smooth",
    });
  };

  const createSlug = (text = "") =>
    text.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  if (!loading && !error && list.length === 0) {
    return null;
  }

  return (
    <div className="related-wrapper">
      <div className="related-container">

        <div className="related-header">
          <div>
            <span className="related-eyebrow">Curated reads</span>
            <h2>Related Articles</h2>
          </div>
        </div>

        <div className="carousel-container">

          <button className="nav-btn left" onClick={() => scroll("left")}>
            <ArrowBackIosIcon />
          </button>

          <div className="carousel" ref={scrollRef}>

            {loading && <BlogsSkeleton />}

            {!loading && error && (
              <p className="related-state related-state-error">
                {String(error)}
              </p>
            )}

            {!loading &&
              !error &&
              list.map((item) => (
                <BlogCard key={item._id} item={item} createSlug={createSlug} />
              ))}

          </div>

          <button className="nav-btn right" onClick={() => scroll("right")}>
            <ArrowForwardIosIcon />
          </button>

        </div>
      </div>
    </div>
  );
};

export default RelatedBlogs;
