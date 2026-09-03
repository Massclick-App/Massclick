import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import StickySearchBar from 'features/public/sticky-search-bar/StickySearchBar.js';
import Footer from 'features/public/footer/Footer.js';
import styles from "features/user/businesses/BusinessList.module.css";
const cx = createScopedClassNames(styles);
export default function BusinessListPage() {
  const handlePayNow = () => {
    alert("Redirecting to PhonePe for secure payment...");
  };
  return <>
  <StickySearchBar /><br /><br /><br />
      <div className={cx("cta-page-container")}>
        <div className={cx("listing-cta-card")}>
          <h3 className={cx("cta-title")}>List Your Business on</h3>
          <h2 className={cx("cta-brand")}>MassClick</h2>

          <div className={cx("cta-price-details")}>
            <p className={cx("cta-price-value")}>Just <span className={cx("currency")}>₹</span> 99/-</p>
            <p className={cx("cta-tax-info")}>+ GST</p>
          </div>

          <button onClick={handlePayNow} className={cx("btn-pay-now")}>
            Pay Now
          </button>

          <p className={cx("payment-note")}>Secure payment powered by PhonePe & other gateways.</p>
        </div>
      </div>    
      <Footer />
      </>;
}
