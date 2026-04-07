
import CardsSearch from '../../CardsSearch/CardsSearch'
import Footer from '../../footer/footer'
import './BusinessList.css'
export default function BusinessListPage() {

    const handlePayNow = () => {
  
    console.log("Initiating payment via PhonePe for MassClick Business Listing...");
    alert("Redirecting to PhonePe for secure payment...");
  
  };
  return (
  <>
  <CardsSearch /><br/><br/><br/>
      <div className="cta-page-container">
        <div className="listing-cta-card">
          <h3 className="cta-title">List Your Business on</h3>
          <h2 className="cta-brand">MassClick</h2>

          <div className="cta-price-details">
            <p className="cta-price-value">Just <span className="currency">₹</span> 99/-</p>
            <p className="cta-tax-info">+ GST</p>
          </div>

          <button
            onClick={handlePayNow}
            className="btn-pay-now"
          >
            Pay Now
          </button>

          <p className="payment-note">Secure payment powered by PhonePe & other gateways.</p>
        </div>
      </div>    
      <Footer />
      </>
  )
}