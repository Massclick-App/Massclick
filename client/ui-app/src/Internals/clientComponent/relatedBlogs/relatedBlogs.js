import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoPageContentBlogsMeta } from "../../../redux/actions/seoPageContentBlogAction";
import "./relatedBlogs.css";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { Skeleton } from "@mui/material";

const BlogsSkeleton = () => (
  <div className="blogs-skeleton">
    {[...Array(4)].map((_, i) => (
      <div className="blog-skeleton-card" key={i}>
        <Skeleton variant="rounded" width="100%" height={190} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.07)", borderRadius: 2 }} />
        <Skeleton variant="rounded" width="78%" height={18} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.07)", mt: 1.5 }} />
        <Skeleton variant="rounded" width="54%" height={14} animation="wave" sx={{ bgcolor: "rgba(255,107,0,0.07)", mt: 0.8 }} />
      </div>
    ))}
  </div>
);

const RelatedBlogs = ({ location }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef(null);

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


  const scroll = (dir) => {
    const box = scrollRef.current;
    if (!box) return;

    const width = box.firstChild?.offsetWidth || 320;

    box.scrollBy({
      left: dir === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  const createSlug = (text = "") =>
    text.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

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

            {!loading && !error && list.length === 0 && (
              <p className="related-state">No blogs found</p>
            )}

            {!loading &&
              !error &&
              list.map((item) => (
                <div
                  className="related-card"
                  key={item._id}
                  onClick={() =>
                    window.open(`/blog/${item.slug || createSlug(item.heading)}`, "_blank")
                  }
                >
                  <img
                    src={item.profileImage || "https://via.placeholder.com/300x200"}
                    alt={item.heading}
                  />

                  <div className="card-content">
                    <h4>{item.heading}</h4>
                    <span>
                      Explore
                      <ArrowOutwardIcon />
                    </span>
                  </div>
                </div>
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
