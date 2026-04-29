import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { fetchSeoBlogBySlug } from "../../../../redux/actions/seoPageContentBlogAction";
import "./blogDetails.css";
import Navbar from "../relatedBlogNavbar/relatedBlogNavbar";

const BlogDetail = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();

  const { blog, loading, error } = useSelector(
    (state) => state.seoPageContentBlogReducer
  );

  useEffect(() => {
    if (slug) {
      dispatch(fetchSeoBlogBySlug(slug));
    }
  }, [dispatch, slug]);

const normalizeMassclickUrl = (rawUrl = "") => {
  try {
    const urlObj = new URL(rawUrl);
    const parts = urlObj.pathname.split("/").filter(Boolean);

    if (parts.length >= 3) {
      const last = parts[parts.length - 1];
      const prev = parts[parts.length - 2];

      if (last.toLowerCase() === prev.toLowerCase()) {
        parts.pop();
      }
    }

    urlObj.pathname = "/" + parts.join("/");
    return urlObj.toString();
  } catch (error) {
    return rawUrl;
  }
};

const linkifyText = (text = "") => {
  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) => {
      const cleanUrl = normalizeMassclickUrl(url);

      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
    }
  );
};

  const makeSlug = (text = "") =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  
  const formattedContent = useMemo(() => {
    if (!blog?.pageContent) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.pageContent, "text/html");

    const headings = doc.querySelectorAll("h2, h3");

    headings.forEach((item) => {
      const text = item.textContent.trim();
      item.setAttribute("id", makeSlug(text));
    });

    const firstStrong = doc.querySelector("p strong");

    if (firstStrong) {
      const text = firstStrong.textContent.trim();

      if (text.toLowerCase() === "introduction") {
        const parent = firstStrong.closest("p");

        if (parent) {
          parent.innerHTML = `<h2 id="${makeSlug(text)}">${text}</h2>`;
        }
      }
    }

    return doc.body.innerHTML;
  }, [blog]);

  const tocItems = useMemo(() => {
    if (!blog?.pageContent) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.pageContent, "text/html");

    const items = [];

    const skipWords = [
      "features",
      "best for",
      "price",
      "includes",
      "services include"
    ];

    const firstStrong = doc.querySelector("p strong");

    if (firstStrong) {
      const text = firstStrong.textContent.trim();

      if (text.toLowerCase() === "introduction") {
        items.push({
          title: text,
          id: makeSlug(text),
        });
      }
    }

    const headings = doc.querySelectorAll("h2, h3");

    headings.forEach((item) => {
      const text = item.textContent.trim();
      const lower = text.toLowerCase();

      const shouldSkip = skipWords.some((word) =>
        lower === word || lower.startsWith(word)
      );

      if (!shouldSkip) {
        items.push({
          title: text,
          id: makeSlug(text),
        });
      }
    });

    if (blog?.faq?.length > 0) {
      items.push({
        title: "Frequently Asked Questions",
        id: "frequently-asked-questions",
      });
    }

    return items;
  }, [blog]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);

    if (el) {
      const top =
        el.getBoundingClientRect().top +
        window.pageYOffset -
        90;

      window.scrollTo({
        top,
        behavior: "smooth",
      });
    }
  };

  const handleContentClick = (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    e.preventDefault();

    const href = link.getAttribute("href");

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

  const ssrMeta = typeof window !== "undefined" ? window.__SSR_SEO__ : null;
  const metaTitle       = blog?.metaTitle       || ssrMeta?.title       || "Massclick Blog";
  const metaDescription = blog?.metaDescription || ssrMeta?.description || "Read expert guides and local business tips on the Massclick blog.";
  const metaKeywords    = blog?.metaKeywords    || ssrMeta?.keywords    || "massclick blog, local business tips";
  const canonical       = `https://massclick.in/blog/${slug}`;
  const formatDate = (value) => {
    if (!value) return null;

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return null;

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const publishedDate = formatDate(blog?.createdAt);
  const updatedDate = formatDate(blog?.updatedAt);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">Error loading blog</div>;
  if (!blog) return null;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description"        content={metaDescription} />
        <meta name="keywords"           content={metaKeywords} />
        <link rel="canonical"           href={canonical} />
        <meta property="og:title"       content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url"         content={canonical} />
        <meta name="twitter:title"      content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
      </Helmet>
      <Navbar />

      <div className="blog-container">

        <div className="breadcrumb">
          Home › {blog.category} › {blog.heading}
        </div>

        <div className="blog-header">
          <h1>{blog.heading}</h1>

          <div className="blog-meta">
            {publishedDate && <span>Published {publishedDate}</span>}
            {updatedDate && <span>Updated {updatedDate}</span>}
            <span>{blog.views || 48} views</span>
            <span>• {blog.readTime || "5 min read"}</span>
          </div>
        </div>

        <div className="blog-grid">

          <div className="blog-content-area">

            {blog.pageImages?.[0] && (
              <img
                src={blog.pageImages[0]}
                className="hero-img"
                alt={blog.heading}
              />
            )}

            <div
              className="blog-content"
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{
                __html: formattedContent || "<p>No content available</p>",
              }}
            />

            {blog.pageImages?.length > 1 && (
              <div className="image-grid">
                {blog.pageImages.slice(1).map((img, i) => (
                  <img key={i} src={img} alt={`${blog.heading} supporting image ${i + 2}`} />
                ))}
              </div>
            )}

            {blog.businessDetails?.length > 0 && (
              <div className="business-section">

                <h2 className="business-title">Popular Businesses</h2>

                {blog.businessDetails.map((b, index) => (
                  <div className="business-card" key={index}>

                    <div className="business-header">
                      <h3>{b.businessName}</h3>

                      <a
                        href={`tel:${b.contact}`}
                        className="call-btn"
                      >
                        Call Now
                      </a>
                    </div>

                    {b.bannerImage && (
                      <img
                        src={b.bannerImage || "https://via.placeholder.com/300x200"}
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

            {blog.faq?.length > 0 && (
              <div className="faq-section">

                <h2
                  className="faq-title"
                  id="frequently-asked-questions"
                >
                  Frequently Asked Questions
                </h2>

                <div className="faq-wrapper">
                  {blog.faq.map((item, index) => (
                    <div className="faq-item" key={index}>

                      <h3 className="faq-question">
                        {item.question}
                      </h3>

                      <p
                        className="faq-answer"
                        dangerouslySetInnerHTML={{
                          __html: linkifyText(item.answer),
                        }}
                      />

                    </div>
                  ))}
                </div>

              </div>
            )}

            <div className="comment-box">
              <h3>Comments (0)</h3>

              <textarea placeholder="Share your thoughts..." />

              <div className="comment-actions">
                <button className="cancel-btn">Cancel</button>
                <button className="submit-btn">Submit</button>
              </div>
            </div>

            <div className="author-card" style={{ marginTop: "24px" }}>
              <img
                src={blog.profileImage || "https://via.placeholder.com/80"}
                alt={`${blog.author || "Massclick"} author profile`}
              />
              <div>
                <h3>{blog.author || "Massclick Editorial Team"}</h3>
                <p>
                  {blog.author || "Massclick Editorial Team"} curates local business guides,
                  service recommendations and city-focused insights to help readers make
                  informed decisions faster.
                </p>
              </div>
            </div>

          </div>

          <div className="sidebar">

            <div className="author-card">
              <img
                src={blog.profileImage || "https://via.placeholder.com/80"}
                alt={`${blog.author || "Massclick"} author profile`}
              />
              <div>
                <h4>{blog.author || "Admin"}</h4>
                <p>Content Creator</p>
              </div>
            </div>

            <div className="toc">
              <h4>List of Contents</h4>

              <ul>
                {tocItems.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>

            <div className="tags">
              <h4>Related Tags</h4>

              <div className="tag-list">

                {blog?.tags?.length > 0 ? (
                  blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      onClick={() => {
                        const locationSlug = (blog.location || "trichy")
                          .toLowerCase()
                          .trim()
                          .replace(/\s+/g, "-");

                        const categorySlug = (blog.category || tag)
                          .toLowerCase()
                          .trim()
                          .replace(/\s+/g, "-");

                        window.location.href = `https://massclick.in/${locationSlug}/${categorySlug}`;
                      }}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <>
                    <span>{blog.category}</span>
                    <span>{blog.location}</span>
                  </>
                )}

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default BlogDetail;
