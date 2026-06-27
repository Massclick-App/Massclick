import React from "react";
import { Link } from "react-router-dom";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import styles from "./authorCard.module.css";

const cx = createScopedClassNames(styles);

const withProtocol = (url = "") => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const AuthorCard = ({
  name = "Massclick Editorial Team",
  title = "Content Expert",
  profileImage,
  bio,
  expertiseAreas = [],
  bestFor = [],
  features = [],
  email,
  website,
  linkedin,
  viewProfileLink,
  socialLinks = [],
  variant = "sidebar",
}) => {
  const links = [
    ...socialLinks,
    website ? { label: "Website", url: withProtocol(website), icon: "W" } : null,
    linkedin ? { label: "LinkedIn", url: withProtocol(linkedin), icon: "in" } : null,
  ].filter(Boolean);

  return (
    <div className={cx("author-card-container", `variant-${variant}`)}>
      <div className={cx("author-header")}>
        <div className={cx("avatar-wrapper")}>
          <img
            src={
              profileImage ||
              "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                encodeURIComponent(name)
            }
            alt={name}
            className={cx("avatar")}
          />
          <div className={cx("avatar-ring")} />
        </div>

        <div className={cx("header-text")}>
          <span className={cx("eyebrow")}>Verified Expert</span>
          <h2 className={cx("author-name")}>{name}</h2>
          <p className={cx("author-title")}>{title}</p>
        </div>
      </div>

      {expertiseAreas.length > 0 && (
        <div className={cx("expertise-section")}>
          <h4 className={cx("section-label")}>Expertise Areas</h4>
          <div className={cx("expertise-tags")}>
            {expertiseAreas.map((area, index) => (
              <span key={index} className={cx("expertise-tag")}>
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {bio && (
        <div className={cx("about-section")}>
          <h4 className={cx("section-label")}>About</h4>
          <p className={cx("bio-text")}>{bio}</p>
        </div>
      )}

      {bestFor.length > 0 && (
        <div className={cx("list-section")}>
          <h4 className={cx("section-label")}>Best For</h4>
          <ul className={cx("author-list")}>
            {bestFor.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {features.length > 0 && (
        <div className={cx("list-section")}>
          <h4 className={cx("section-label")}>Features</h4>
          <ul className={cx("author-list")}>
            {features.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {(email || viewProfileLink) && (
        <div className={cx("contact-section")}>
          {email && (
            <a href={`mailto:${email}`} className={cx("contact-link")}>
              <span className={cx("icon")}>@</span>
              {email}
            </a>
          )}

          {viewProfileLink && viewProfileLink.startsWith("/") ? (
            <Link
              to={viewProfileLink}
              state={{ fromBlog: { title: name, slug: viewProfileLink.split('/').pop() } }}
              className={cx("profile-link")}
            >
              View Profile
              <span className={cx("arrow")}>-&gt;</span>
            </Link>
          ) : viewProfileLink ? (
            <a
              href={withProtocol(viewProfileLink)}
              className={cx("profile-link")}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Profile
              <span className={cx("arrow")}>-&gt;</span>
            </a>
          ) : null}
        </div>
      )}

      {links.length > 0 && (
        <div className={cx("social-section")}>
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              className={cx("social-icon")}
              title={link.label}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
            >
              {link.icon || "Link"}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorCard;
