import React from "react";
import "./MassClickBanner.css";
const MassClickBanner = () => {
  return (
    <section className="mc-banner">
      <div className="mc-banner-inner">
        {/* LEFT */}
        <div className="mc-left">
          <span className="mc-offer-label">LIST YOUR BUSINESS — LAUNCH OFFER</span>

          <h2 className="mc-heading">
            50,000 customers are already searching.<br />
            <span className="mc-highlight">Be there when they look.</span>
          </h2>

          <p className="mc-description">
            Join thousands of local businesses getting discovered by customers actively searching for your services on India's most trusted local search engine.
          </p>

          <ul className="mc-points">
            <li>Live in 24 hours</li>
            <li>Photos + maps + reviews</li>
            <li>Priority placement</li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className="mc-right">
          <div className="mc-price-card">
            <p className="mc-price-title">Starting at</p>

            <div className="mc-price-row">
              <span className="mc-price-currency">₹</span>
              <span className="mc-price-main">0</span>
              <span className="mc-price-sub">/listing</span>
            </div>

            <p className="mc-subtext">Limited time launch offer</p>

            <button className="mc-cta-btn">
              Get started now →
            </button>

            <p className="mc-guarantee">
              ✓ No credit card required<br/>
              ✓ Verified by MassClick<br/>
              ✓ 24-hour setup
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MassClickBanner;
