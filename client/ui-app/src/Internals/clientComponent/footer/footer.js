import React from 'react';
import './footer.css';
import { Link } from 'react-router-dom';

import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Footer = () => {
    const FooterLink = ({ children, to = "#" }) => (
        <li className="footer-link-item">
            <ChevronRightIcon className="link-bullet-icon" />
            <Link to={to} className="footer-link-anchor">
                {children}
            </Link>
        </li>
    );

    return (
        <footer className="footer-container">
            <div className="footer-inner">

                <div className="footer-section">
                    <h3 className="footer-heading">Explore</h3>
                    <ul className="footer-link-list">
                        <FooterLink to="/aboutus">About MassClick</FooterLink>
                        <FooterLink to="/testimonials">Customer Stories</FooterLink>
                        <FooterLink to="/feedbacks">User Feedback</FooterLink>
                        <FooterLink to="/customercare">Customer Support</FooterLink>
                        <FooterLink to="/portfolio">Media & Gallery</FooterLink>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3 className="footer-heading">Policies</h3>
                    <ul className="footer-link-list">
                        <FooterLink to="/terms">Terms & Conditions</FooterLink>
                        <FooterLink to="/privacy">Privacy Policy</FooterLink>
                        <FooterLink to="/refund">Refund Policy</FooterLink>
                        <FooterLink to="/enquiry">Business Enquiries</FooterLink>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3 className="footer-heading">Services</h3>
                    <ul className="footer-link-list">
                        <FooterLink to="/services/web">Web Design & Development</FooterLink>
                        <FooterLink to="/services/digital">Digital Marketing</FooterLink>
                        <FooterLink to="/services/graphic">Graphic Design</FooterLink>
                        <FooterLink to="/services/seo">Search Engine Optimisation</FooterLink>
                    </ul>
                </div>
        
                <div className="footer-section brand-section">
                    <h3 className="footer-heading">Connect with us</h3>

                    <div className="social-icons">
                        <a href="https://www.facebook.com/massClicks" aria-label="Facebook">
                            <FacebookIcon />
                        </a>
                        <a href="https://twitter.com" aria-label="Twitter">
                            <TwitterIcon />
                        </a>
                        <a href="https://www.instagram.com/massclick_/" aria-label="Instagram">
                            <InstagramIcon />
                        </a>
                        <a href="https://youtube.com/@mass_click" aria-label="YouTube">
                            <YouTubeIcon />
                        </a>
                    </div>

                    <div className="brand-box">
                        <div className="logo-text">
                            Mass<span className="brand-accent">click</span>™
                        </div>
                        <p className="logo-tagline">
                            India’s trusted local discovery platform
                        </p>
                        <p className="brand-trust">
                            Trusted by businesses across India
                        </p>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                © {new Date().getFullYear()} Massclick. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
