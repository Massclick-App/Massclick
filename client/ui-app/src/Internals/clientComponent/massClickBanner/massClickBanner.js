import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React from "react";
import styles from "./MassClickBanner.module.css";
const cx = createScopedClassNames(styles);
const MassClickBanner = () => {
  return <section className={cx("mc-banner")}>
      <div className={cx("mc-banner-inner")}>
        {/* LEFT */}
        <div className={cx("mc-left")}>
          <span className={cx("mc-offer-label")}>LIST YOUR BUSINESS — LAUNCH OFFER</span>

          <h2 className={cx("mc-heading")}>
            50,000 customers are already searching.<br />
            <span className={cx("mc-highlight")}>Be there when they look.</span>
          </h2>

          <p className={cx("mc-description")}>
            Join thousands of local businesses getting discovered by customers actively searching for your services on India's most trusted local search engine.
          </p>

          <ul className={cx("mc-points")}>
            <li>Live in 24 hours</li>
            <li>Photos + maps + reviews</li>
            <li>Priority placement</li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className={cx("mc-right")}>
          <div className={cx("mc-price-card")}>
            <p className={cx("mc-price-title")}>Starting at</p>

            <div className={cx("mc-price-row")}>
              <span className={cx("mc-price-currency")}>₹</span>
              <span className={cx("mc-price-main")}>0</span>
              <span className={cx("mc-price-sub")}>/listing</span>
            </div>

            <p className={cx("mc-subtext")}>Limited time launch offer</p>

            <button className={cx("mc-cta-btn")}>
              Get started now →
            </button>

            <p className={cx("mc-guarantee")}>
              ✓ No credit card required<br />
              ✓ Verified by MassClick<br />
              ✓ 24-hour setup
            </p>
          </div>
        </div>
      </div>
    </section>;
};
export default MassClickBanner;
