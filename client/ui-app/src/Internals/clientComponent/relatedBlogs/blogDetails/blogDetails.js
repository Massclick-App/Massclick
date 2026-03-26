import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoBlogBySlug } from "../../../../redux/actions/seoPageContentBlogAction";
import "./blogDetails.css";
import Navbar from "../relatedBlogNavbar/relatedBlogNavbar";

const BlogDetail = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();

  const { blog, loading, error } = useSelector(
    (state) => state.seoPageContentBlogReducer
  );

  /* ================= FETCH BLOG ================= */
  useEffect(() => {
    if (slug) {
      dispatch(fetchSeoBlogBySlug(slug));
    }
  }, [dispatch, slug]);

  /* ================= CLEAN CONTENT ================= */
  const cleanContent = useMemo(() => {
    if (!blog?.pageContent) return "<p>No content available</p>";

    return blog.pageContent
      .replace(/<p><br><\/p>/g, "")       // remove empty lines
      .replace(/(<br>\s*){2,}/g, "");     // remove extra breaks
  }, [blog]);

  /* ================= LINK CLICK HANDLER ================= */
  const handleContentClick = (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    e.preventDefault();

    const href = link.getAttribute("href");

    /* -------- INTERNAL LINK -------- */
    if (href && href.startsWith("/")) {
      const parts = href.split("/").filter(Boolean);

      let location = "";
      let category = "";

      if (parts.length === 1) {
        category = parts[0];
      } else {
        category = parts[parts.length - 1];
        location = parts[parts.length - 2];
      }

      if (!location) {
        location = (blog?.location || "trichy")
          .toLowerCase()
          .replace(/\s+/g, "-");
      }

      const url = `https://massclick.in/${location}/${category}`;
      window.open(url, "_blank");
      return;
    }

    /* -------- TEXT BASED LINK -------- */
    let text = link.innerText.toLowerCase().trim();

    let category = "";
    let location = "";

    if (text.includes(" in ")) {
      const parts = text.split(" in ");
      category = parts[0].trim();
      location = parts[1].trim();
    }

    category = category
      .replace(/near.*$/g, "")
      .replace(/best|top|cheap|low|price/g, "")
      .trim();

    if (!category) category = blog?.category || "services";
    if (!location) location = blog?.location || "trichy";

    category = category.replace(/\s+/g, "-");
    location = location.replace(/\s+/g, "-");

    const url = `https://massclick.in/${location}/${category}`;
    window.open(url, "_blank");
  };

  /* ================= STATES ================= */
  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">Error loading blog</div>;
  if (!blog) return null;

  return (
    <>
      <Navbar />

      <div className="blog-container">

        {/* ================= BREADCRUMB ================= */}
        <div className="breadcrumb">
          Home › {blog.category} › {blog.heading}
        </div>

        {/* ================= HEADER ================= */}
        <div className="blog-header">
          <h1>{blog.heading}</h1>

          <div className="blog-meta">
            <span>👁 {blog.views || 48} views</span>
            <span>⏱ {blog.readTime || "5 min read"}</span>
          </div>
        </div>

        <div className="blog-grid">

          {/* ================= LEFT CONTENT ================= */}
          <div className="blog-content-area">

            {/* HERO IMAGE (FIXED) */}
            {blog.pageImageKey?.[0] && (
              <img
                src={blog.pageImageKey[0]}
                className="hero-img"
                alt={blog.heading}
              />
            )}

            {/* BLOG CONTENT (CLEANED) */}
            <div
              className="blog-content"
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />

            {/* IMAGE GRID (FIXED) */}
            {blog.pageImageKey?.length > 1 && (
              <div className="image-grid">
                {blog.pageImageKey.slice(1).map((img, i) => (
                  <img key={i} src={img} alt="gallery" />
                ))}
              </div>
            )}

            {/* ================= BUSINESS DETAILS ================= */}
            {blog.businessDetails?.length > 0 && (
              <div className="business-section">

                <h2 className="business-title">Popular Businesses</h2>

                {blog.businessDetails.map((b, index) => (
                  <div className="business-card" key={index}>

                    <div className="business-header">
                      <h3>{b.businessName}</h3>

                      <a href={`tel:${b.contact}`} className="call-btn">
                        Call Now
                      </a>
                    </div>

                    {b.bannerImage && (
                      <img
                        src={`https://your-s3-url/${b.bannerImage}`}
                        alt={b.businessName}
                        className="business-img"
                      />
                    )}

                    <p className="business-desc">
                      {b.businessName} is one of the best {b.category} in {b.location}.
                    </p>

                    <div className="business-info">

                      <div>
                        <strong>Experience</strong>
                        <p>{b.experience || "-"}</p>
                      </div>

                      <div>
                        <strong>Category</strong>
                        <p>{b.category}</p>
                      </div>

                      <div>
                        <strong>Contact</strong>
                        <p>{b.contact}</p>
                      </div>

                    </div>

                    <div className="business-address">
                      <strong>Address</strong>
                      <p>{b.street}</p>
                    </div>

                  </div>
                ))}

              </div>
            )}

            {/* ================= COMMENT BOX ================= */}
            <div className="comment-box">
              <h3>Comments (0)</h3>

              <textarea placeholder="Share your thoughts..." />

              <div className="comment-actions">
                <button className="cancel-btn">Cancel</button>
                <button className="submit-btn">Submit</button>
              </div>
            </div>

          </div>

          {/* ================= RIGHT SIDEBAR ================= */}
          <div className="sidebar">

            <div className="author-card">
              <img
                src={blog.profileImageKey || "https://via.placeholder.com/80"}
                alt="author"
              />
              <div>
                <h4>{blog.author || "Admin"}</h4>
                <p>Content Creator</p>
              </div>
            </div>

            <div className="toc">
              <h4>List of Contents</h4>
              <ul>
                <li>Introduction</li>
                <li>Overview</li>
                <li>Top Picks</li>
              </ul>
            </div>

            <div className="tags">
              <h4>Related Tags</h4>
              <div className="tag-list">
                <span>{blog.category}</span>
                <span>{blog.location}</span>
                <span>trending</span>
                <span>popular</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default BlogDetail;