import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoPageContentBlogsMeta } from "../../../redux/actions/seoPageContentBlogAction";
import "./relatedBlogs.css";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

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
          <h2>Related Articles</h2>
        </div>

        <div className="carousel-container">

          <button className="nav-btn left" onClick={() => scroll("left")}>
            <ArrowBackIosIcon />
          </button>

          <div className="carousel" ref={scrollRef}>

            {loading && <p style={{ padding: 20 }}>Loading...</p>}

            {!loading && error && (
              <p style={{ padding: 20, color: "red" }}>
                {String(error)}
              </p>
            )}

            {!loading && !error && list.length === 0 && (
              <p style={{ padding: 20 }}>No blogs found</p>
            )}

            {!loading &&
              !error &&
              list.map((item) => (
                <div
                  className="card"
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
                    <span>Explore</span>
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