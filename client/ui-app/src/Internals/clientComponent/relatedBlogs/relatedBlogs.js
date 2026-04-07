import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoPageContentBlogsMeta } from "../../../redux/actions/seoPageContentBlogAction";
import "./relatedBlogs.css";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

const RelatedBlogs = ({ location }) => {
  const scrollRef = useRef(null);
  const dispatch = useDispatch();

  const {
    list = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.seoPageContentBlogReducer);

  useEffect(() => {

    if (!location) return;

    dispatch(
      fetchSeoPageContentBlogsMeta({
        pageType: "category",
        location: location,
      })
    );
  }, [dispatch, location]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;

    const cardWidth = container.firstChild?.offsetWidth || 320;

    container.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  const createSlug = (text = "") =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleClick = (item) => {
    if (!item?.heading) return;

    const slug = createSlug(item.heading);
    window.open(`/blog/${slug}`, "_blank");
  };

  return (
    <div className="related-wrapper">
      <div className="related-container">

        <div className="related-header">
          <h2>Related Articles</h2>
        </div>

        <div className="carousel-container">

          <button className="nav-btn left" onClick={() => scroll("left")}>
            <ArrowBackIosIcon />
          </button>

          <div className="carousel" ref={scrollRef}>

            {loading && <p style={{ padding: "20px" }}>Loading...</p>}

            {!loading && error && (
              <p style={{ padding: "20px", color: "red" }}>
                Error loading blogs
              </p>
            )}

            {!loading && !error && list.length > 0 &&
              list.map((item) => (
                <div
                  className="card"
                  key={item._id}
                  onClick={() => handleClick(item)}
                >
                  <img
                    src={
                      item.profileImage ||
                      "https://via.placeholder.com/300x200"
                    }
                    alt={item.heading}
                    loading="lazy"
                  />

                  <div className="card-content">
                    <h4>{item.heading}</h4>
                    <span>Explore</span>
                  </div>
                </div>
              ))
            }

            {!loading && !error && list.length === 0 && (
              <p style={{ padding: "20px" }}>
                No blogs found
              </p>
            )}

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