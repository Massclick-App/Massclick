import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { fetchAuthorBySlug } from "../../../redux/actions/authorMasterAction.js";
import { fetchSeoPageContentBlogsMeta } from "../../../redux/actions/seoPageContentBlogAction.js";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./authorProfile.module.css";
import Navbar from "../relatedBlogs/relatedBlogNavbar/relatedBlogNavbar.js";
import Footer from "../footer/footer.js";
import { CircularProgress, Box } from "@mui/material";
import { Link } from "react-router-dom";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

const cx = createScopedClassNames(styles);

const AuthorProfile = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const [authorData, setAuthorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { list: authors = [] } = useSelector(
    (state) => state.authorMasterReducer || {}
  );
  const { list: blogList = [] } = useSelector(
    (state) => state.seoPageContentBlogReducer || {}
  );

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
    if (authorData?._id) {
      dispatch(
        fetchSeoPageContentBlogsMeta({
          pageType: "category",
        })
      );
    }
  }, [authorData, dispatch]);

  const authorBlogs = blogList.filter(
    (blog) => blog.authorId === authorData?._id
  );

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
        {/* Hero Section */}
        <section className={cx("hero-section")}>
          <div className={cx("hero-content")}>
            <div className={cx("author-avatar")}>
              <img
                src={
                  authorData.profileImage ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    authorData.displayName
                  )}`
                }
                alt={authorData.displayName}
                className={cx("avatar-image")}
              />
            </div>

            <div className={cx("author-header")}>
              <h1 className={cx("author-name")}>{authorData.displayName}</h1>

              {authorData.title && (
                <p className={cx("author-title")}>{authorData.title}</p>
              )}

              {authorData.expertCategory && (
                <span className={cx("expertise-badge")}>
                  {authorData.expertCategory}
                </span>
              )}

              {authorData.experience && (
                <p className={cx("experience")}>📚 {authorData.experience}</p>
              )}

              <div className={cx("blog-stats")}>
                <span className={cx("stat")}>
                  <strong>{authorData.blogCount}</strong> Articles Published
                </span>
              </div>
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
        {authorBlogs.length > 0 && (
          <section className={cx("articles-section")}>
            <h2>Published Articles ({authorBlogs.length})</h2>
            <div className={cx("blog-grid")}>
              {authorBlogs.map((blog) => (
                <Link
                  key={blog._id}
                  to={`/blog/${blog.slug}`}
                  className={cx("blog-card-link")}
                  style={{ textDecoration: "none" }}
                >
                  <div className={cx("blog-card")}>
                    <div className={cx("blog-image")}>
                      <img
                        src={
                          blog.ogImageKey ||
                          blog.pageImageKey?.[0] ||
                          `https://via.placeholder.com/400x250?text=${encodeURIComponent(
                            blog.heading
                          )}`
                        }
                        alt={blog.heading}
                      />
                    </div>
                    <div className={cx("blog-content")}>
                      <h3>{blog.heading}</h3>
                      {blog.excerpt && (
                        <p className={cx("excerpt")}>{blog.excerpt.substring(0, 120)}...</p>
                      )}
                      <div className={cx("blog-meta")}>
                        <span className={cx("category")}>{blog.category}</span>
                        <span className={cx("views")}>👁️ {blog.views || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AuthorProfile;
