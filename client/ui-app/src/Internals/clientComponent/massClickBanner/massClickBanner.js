import React from "react";
import "./MassClickBanner.css";
import MI from "../../../assets/Mi.png";

const MassClickBanner = () => {
  return (
    <section className="mc-banner">
      <div className="mc-banner-inner">
        {/* LEFT */}
        <div className="mc-left">
          <div className="mc-brand-row">
            <div className="mc-logo-pill">
              <img src={MI} alt="MassClick Logo" className="mc-logo-img" />
            </div>

            <div>
              <h1 className="mc-logo-text">
                <span className="mc-logo-mass">Mass</span>
                <span className="mc-logo-click">Click</span>
                <sup className="mc-logo-tm">™</sup>
              </h1>
              <p className="mc-tagline">India&apos;s Leading Local Search Engine</p>
            </div>
          </div>

          <h2 className="mc-heading">
            Your One-Stop Destination for{" "}
            <span className="mc-highlight">Local Business Listing</span>
          </h2>

          <p className="mc-description">
            Help customers discover you instantly on MassClick. Improve visibility,
            build trust and grow enquiries across your city – all with a single
            listing.
          </p>

          <ul className="mc-points">
            <li>Appear in local search results instantly</li>
            <li>Dedicated business profile with photos & contact details</li>
            <li>Priority placement in relevant categories</li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className="mc-right">
          <div className="mc-price-card">
            <span className="mc-offer-label">Launch Offer</span>

            <p className="mc-price-title">List Your Business on MassClick</p>

            <div className="mc-price-row">
              <span className="mc-price-currency">₹</span>
              <span className="mc-price-main"></span>
              <span className="mc-price-sub">/ listing</span>
            </div>

            <button className="mc-cta-btn">
              Get Started Now
            </button>

            <p className="mc-note">
              No hidden charges • Go live within 24 hours
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MassClickBanner;
