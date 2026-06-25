import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React from "react";
import styles from "./footer.module.css";
import { Link } from "react-router-dom";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
const cx = createScopedClassNames(styles);

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
        <div className={cx("footer-section")}>
          <h3 className={cx("footer-heading")}>Explore</h3>
          <ul className={cx("footer-link-list")}>
            <FooterLink to="/aboutus">About MassClick</FooterLink>
            <FooterLink to="/knowledgebase">Knowledge Base</FooterLink>
            <FooterLink to="/testimonials">Customer Stories</FooterLink>
            {/* <FooterLink to="/feedbacks">User Feedback</FooterLink> */}
            <FooterLink to="/customercare">Customer Support</FooterLink>
            {/* <FooterLink to="/refund">Refund Policy</FooterLink> */}
            {/* <FooterLink to="/portfolio">Media & Gallery</FooterLink> */}
          </ul>
        </div>

        <div className={cx("footer-section")}>
          <h3 className={cx("footer-heading")}>Policies</h3>
          <ul className={cx("footer-link-list")}>
            <FooterLink to="/terms">Terms & Conditions</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/enquiry">Business Enquiries</FooterLink>
            {/* <FooterLink to="/deleteaccount">Delete Account</FooterLink> */}
          </ul>
        </div>
        <div className={cx("footer-section brand-section")}>
          <h3 className={cx("footer-heading")}>Connect with us</h3>

          <div className={cx("social-icons")}>
            <a href="https://www.facebook.com/massClicks" aria-label="Facebook">
              <FacebookIcon />
            </a>

            <a href="https://twitter.com" aria-label="Twitter">
              <TwitterIcon />
            </a>

            <a
              href="https://www.instagram.com/massclick_/"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>

            <a href="https://youtube.com/@mass_click" aria-label="YouTube">
              <YouTubeIcon />
            </a>
          </div>

          <div className={cx("brand-box")}>
            <div className={cx("logo-text")}>
              Mass<span className={cx("brand-accent")}>click</span>™
            </div>
            <p className={cx("logo-tagline")}>
              India’s trusted local discovery platform
            </p>
            <p className={cx("brand-trust")}>
              Trusted by businesses across India
            </p>
          </div>
        </div>
      </div>
      <div className={cx("footer-bottom")}>
        © {new Date().getFullYear()} Massclick. All rights reserved.
      </div>
    </footer>
  );
};
export default Footer;
