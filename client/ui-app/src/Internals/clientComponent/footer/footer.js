import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React from "react";
import styles from "./footer.module.css";
import { Link } from "react-router-dom";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
const cx = createScopedClassNames(styles);

const GooglePlayGlyph = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M3.6 2.4c-.4.2-.6.6-.6 1v17.2c0 .4.2.8.6 1l9.8-9.6-9.8-9.6Z"
      fill="#00d1ff"
    />
    <path
      d="M16.6 9.2 4.5 2.3c-.3-.2-.6-.2-.9-.1l9.9 9.7 3.1-2.7Z"
      fill="#00f076"
    />
    <path
      d="M13.5 12l-9.9 9.8c.3.1.6.1.9-.1l12.1-6.9-3.1-2.8Z"
      fill="#ff3a44"
    />
    <path
      d="m16.6 9.2-3.1 2.8 3.1 2.8 3.7-2.1c.6-.4.6-1.2 0-1.6l-3.7-2Z"
      fill="#ffbc00"
    />
  </svg>
);

const AppleGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.417 2.06-1.25 2.86-.98.94-2.06 1.48-3.24 1.4-.056-1.11.44-2.06 1.31-2.85.83-.76 2.06-1.35 3.18-1.41Zm3.86 15.42c-.42.98-.9 1.84-1.53 2.71-.9 1.23-1.83 2.45-3.28 2.48-1.42.03-1.88-.84-3.51-.84-1.63 0-2.14.81-3.48.87-1.4.05-2.47-1.32-3.38-2.55-1.85-2.5-3.28-7.06-1.37-10.14 1-1.57 2.68-2.56 4.51-2.59 1.4-.03 2.72.94 3.57.94.85 0 2.46-1.16 4.14-.99.71.03 2.7.29 3.98 2.18-.1.06-2.37 1.38-2.35 4.11.02 3.27 2.87 4.36 2.7 4.42Z" />
  </svg>
);

const Footer = () => {
  const FooterLink = ({ children, to = "#" }) => (
    <li className={cx("footer-link-item")}>
      <ChevronRightIcon className={cx("link-bullet-icon")} />
      <Link to={to} className={cx("footer-link-anchor")}>
        {children}
      </Link>
    </li>
  );

  return (
    <footer className={cx("footer-container")}>
      <div className={cx("footer-inner")}>
        <div className={cx("footer-section brand-section")}>
          <div className={cx("logo-text")}>
            Mass<span className={cx("brand-accent")}>click</span>®
          </div>
          <p className={cx("logo-tagline")}>
            Discover the best businesses, services, places &amp; offers near
            you with MassClick.
          </p>

          <div className={cx("social-icons")}>
            <a href="https://www.facebook.com/massClicks" aria-label="Facebook">
              <FacebookIcon fontSize="small" />
            </a>
            <a href="https://www.instagram.com/massclick.in" aria-label="Instagram">
              <InstagramIcon fontSize="small" />
            </a>
            <a href="https://youtube.com/@mass_click" aria-label="YouTube">
              <YouTubeIcon fontSize="small" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter">
              <TwitterIcon fontSize="small" />
            </a>
            <a href="https://www.linkedin.com" aria-label="LinkedIn">
              <LinkedInIcon fontSize="small" />
            </a>
          </div>
        </div>

        <div className={cx("footer-section")}>
          <h3 className={cx("footer-heading")}>Quick Links</h3>
          <ul className={cx("footer-link-list")}>
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/aboutus">About MassClick</FooterLink>
            <FooterLink to="/knowledgebase">Knowledge Base</FooterLink>
            <FooterLink to="/testimonials">Customer Stories</FooterLink>
          </ul>
        </div>

        <div className={cx("footer-section")}>
          <h3 className={cx("footer-heading")}>For Businesses</h3>
          <ul className={cx("footer-link-list")}>
            <FooterLink to="/free-listing">Add Your Business</FooterLink>
            <FooterLink to="/enquiry">Business Enquiries</FooterLink>
            <FooterLink to="/careers">We&apos;re Hiring</FooterLink>
          </ul>
        </div>

        <div className={cx("footer-section")}>
          <h3 className={cx("footer-heading")}>Help &amp; Support</h3>
          <ul className={cx("footer-link-list")}>
            <FooterLink to="/customercare">Customer Support</FooterLink>
            <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/deleteaccount">Delete Account</FooterLink>
          </ul>
        </div>

        <div className={cx("footer-section app-section")}>
          <h3 className={cx("footer-heading")}>Download Our App</h3>
          <p className={cx("app-blurb")}>
            Get the MassClick app for a faster, easier way to find what you
            need.
          </p>
          <div className={cx("store-badges")}>
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cx("store-badge")}
              aria-label="Get it on Google Play"
            >
              <GooglePlayGlyph />
              <span className={cx("store-badge-text")}>
                <span className={cx("store-badge-eyebrow")}>GET IT ON</span>
                <span className={cx("store-badge-title")}>Google Play</span>
              </span>
            </a>
            <a
              href="https://www.apple.com/app-store/"
              target="_blank"
              rel="noopener noreferrer"
              className={cx("store-badge")}
              aria-label="Download on the App Store"
            >
              <AppleGlyph />
              <span className={cx("store-badge-text")}>
                <span className={cx("store-badge-eyebrow")}>Download on the</span>
                <span className={cx("store-badge-title")}>App Store</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div className={cx("footer-bottom")}>
        <span>© {new Date().getFullYear()} Massclick. All rights reserved.</span>
        <span className={cx("footer-bottom-made")}>Made with ❤ in India</span>
      </div>
    </footer>
  );
};
export default Footer;
