import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Helmet } from "react-helmet-async";
import { fetchAuthorBySlug } from "../../../redux/actions/authorMasterAction.js";
import { fetchBlogsByAuthor } from "../../../redux/actions/seoPageContentBlogAction.js";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./authorProfile.module.css";
import Navbar from "../relatedBlogs/relatedBlogNavbar/relatedBlogNavbar.js";
import Footer from "../footer/footer.js";
import { CircularProgress, Box } from "@mui/material";
import { Link } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

const cx = createScopedClassNames(styles);

const AuthorProfile = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [referringBlog, setReferringBlog] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authorBlogs, setAuthorBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(false);

  useEffect(() => {
    // Capture referring blog from state if navigating from blog details
    if (location.state?.fromBlog) {
      setReferringBlog(location.state.fromBlog);
    }
  }, [location.state]);

  useEffect(() => {
    const loadAuthor = async () => {
      try {
        setLoading(true);
        const author = await dispatch(fetchAuthorBySlug(slug));
        setAuthorData(author);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load author profile");
        setAuthorData(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadAuthor();
    }
  }, [slug, dispatch]);

  useEffect(() => {
    if (!authorData?._id) {
      setAuthorBlogs([]);
      return;
    }

    let cancelled = false;
    setBlogsLoading(true);

    dispatch(fetchBlogsByAuthor(authorData._id))
      .then((blogs) => {
        if (!cancelled) setAuthorBlogs(blogs);
      })
      .catch(() => {
        if (!cancelled) setAuthorBlogs([]);
      })
      .finally(() => {
        if (!cancelled) setBlogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorData, dispatch]);

  const formatBlogDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className={cx("author-profile")}>
        <Navbar />
        <div className={cx("loading-container")}>
          <CircularProgress />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !authorData) {
    return (
      <div className={cx("author-profile")}>
        <Navbar />
        <div className={cx("error-container")}>
          <h1>Author Not Found</h1>
          <p>{error || "The author profile you're looking for doesn't exist."}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const pageTitle = `${authorData.displayName} - Expert Author at MassClick`;
  const pageDescription =
    authorData.shortBio ||
    authorData.bio ||
    `${authorData.displayName} is an expert author at MassClick with ${authorData.blogCount} published articles.`;

  return (
    <div className={cx("author-profile")}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {authorData.profileImage && (
          <meta property="og:image" content={authorData.profileImage} />
        )}
      </Helmet>

      <Navbar />

      <main className={cx("profile-container")}>
        {/* Back to Blog Navigation */}
        {referringBlog && (
          <div className={cx("back-to-blog")}>
            <button
              onClick={() => navigate(-1)}
              className={cx("back-button")}
              aria-label="Back to blog"
            >
              <ArrowBackIcon />
              Back
            </button>
          </div>
        )}

        {/* Compact Hero Section */}
        <section className={cx("hero-section")}>
          <div className={cx("hero-content")}>
            <div className={cx("author-info")}>
              <h1 className={cx("author-name")}>{authorData.displayName}</h1>

              {authorData.title && (
                <p className={cx("author-title")}>{authorData.title}</p>
              )}

              <div className={cx("author-meta")}>
                {authorData.expertCategory && (
                  <span className={cx("expertise-badge")}>
                    {authorData.expertCategory}
                  </span>
                )}

                <span className={cx("article-count")}>
                  <strong>{authorBlogs.length || authorData.blogCount || 0}</strong>{" "}
                  Articles
                </span>
              </div>

              {authorData.experience && (
                <p className={cx("experience")}>{authorData.experience}</p>
              )}
            </div>
          </div>
        </section>

        {/* About Section */}
        {(authorData.bio || authorData.shortBio) && (
          <section className={cx("about-section")}>
            <h2>About</h2>
            {authorData.shortBio && (
              <p className={cx("short-bio")}>{authorData.shortBio}</p>
            )}
            {authorData.bio && (
              <div className={cx("full-bio")}>
                {authorData.bio.split("\n").map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Expertise Section */}
        {(authorData.expertiseAreas?.length > 0 ||
          authorData.specializations?.length > 0) && (
          <section className={cx("expertise-section")}>
            {authorData.expertiseAreas?.length > 0 && (
              <div className={cx("expertise-group")}>
                <h3>Expertise Areas</h3>
                <div className={cx("tags")}>
                  {authorData.expertiseAreas.map((area, idx) => (
                    <span key={idx} className={cx("tag", "primary")}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {authorData.specializations?.length > 0 && (
              <div className={cx("expertise-group")}>
                <h3>Specializations</h3>
                <div className={cx("tags")}>
                  {authorData.specializations.map((spec, idx) => (
                    <span key={idx} className={cx("tag", "secondary")}>
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Contact Section */}
        {(authorData.email ||
          authorData.phone ||
          authorData.website ||
          authorData.linkedin) && (
          <section className={cx("contact-section")}>
            <h2>Get in Touch</h2>
            <div className={cx("contact-grid")}>
              {authorData.email && (
                <a
                  href={`mailto:${authorData.email}`}
                  className={cx("contact-link")}
                >
                  <EmailIcon className={cx("icon")} />
                  <div>
                    <span className={cx("label")}>Email</span>
                    <span className={cx("value")}>{authorData.email}</span>
                  </div>
                </a>
              )}

              {authorData.phone && (
                <a href={`tel:${authorData.phone}`} className={cx("contact-link")}>
                  <PhoneIcon className={cx("icon")} />
                  <div>
                    <span className={cx("label")}>Phone</span>
                    <span className={cx("value")}>{authorData.phone}</span>
                  </div>
                </a>
              )}

              {authorData.website && (
                <a
                  href={
                    authorData.website.startsWith("http")
                      ? authorData.website
                      : `https://${authorData.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("contact-link")}
                >
                  <LanguageIcon className={cx("icon")} />
                  <div>
                    <span className={cx("label")}>Website</span>
                    <span className={cx("value")}>Visit Website</span>
                  </div>
                </a>
              )}

              {authorData.linkedin && (
                <a
                  href={
                    authorData.linkedin.startsWith("http")
                      ? authorData.linkedin
                      : `https://linkedin.com/in/${authorData.linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("contact-link")}
                >
                  <LinkedInIcon className={cx("icon")} />
                  <div>
                    <span className={cx("label")}>LinkedIn</span>
                    <span className={cx("value")}>Connect</span>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Articles Section */}
        {(blogsLoading || authorBlogs.length > 0) && (
          <section className={cx("articles-section")}>
            <h2>
              Published Articles
              {!blogsLoading && ` (${authorBlogs.length})`}
            </h2>

            {blogsLoading ? (
              <div className={cx("blogs-loading")}>
                <CircularProgress size={28} />
              </div>
            ) : (
              <div className={cx("blog-grid")}>
                {authorBlogs.map((blog) => (
                  <Link
                    key={blog._id}
                    to={`/blog/${blog.slug}`}
                    className={cx("blog-card-link")}
                    state={{ fromAuthor: slug }}
                  >
                    <article className={cx("blog-card")}>
                      {blog.profileImage && (
                        <div className={cx("blog-card-image")}>
                          <img
                            src={blog.profileImage}
                            alt={blog.heading}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}

                      <div className={cx("blog-content")}>
                        <h3>{blog.heading}</h3>

                        {blog.metaDescription && (
                          <p className={cx("excerpt")}>{blog.metaDescription}</p>
                        )}

                        <div className={cx("blog-meta")}>
                          {blog.category && (
                            <span className={cx("category")}>{blog.category}</span>
                          )}
                          {formatBlogDate(blog.updatedAt) && (
                            <span className={cx("date")}>
                              {formatBlogDate(blog.updatedAt)}
                            </span>
                          )}
                          <span className={cx("views")}>👁️ {blog.views || 0}</span>
                        </div>

                        <span className={cx("read-more")}>Read Article →</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AuthorProfile;
