
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../../footer/footer';
import './AccountPage.css';

// Placeholder icons (using text for simplicity)
const UserIcon = () => <span className="input-icon">👤</span>;
const MailIcon = () => <span className="input-icon">📧</span>;
const MapIcon = () => <span className="input-icon">🏠</span>; // Plot/Room No.
const StreetIcon = () => <span className="input-icon">🛣️</span>; // Street/Area
const PinIcon = () => <span className="input-icon">📌</span>; // Pincode


export default function AccountPage() {
  return (
 <>
 <CardsSearch/>
 <div className="account-details-container">
      <div className="card-header">
        <h2 className="card-title">Account Details</h2>
        <p className="card-subtitle">Update your personal and address information below.</p>
      </div>
      
      <form className="details-form-grid">
        
        {/* Row 1: Profile Image (Left) & Name (Right) */}
        <div className="form-field">
          <label htmlFor="profileImage">Profile Image *</label>
          {/* Custom styling applied via CSS for the file input */}
          <input type="file" id="profileImage" className="file-input-hidden" />
          <label htmlFor="profileImage" className="file-input-label">
            <span className="file-button">Choose file</span>
            <span className="file-name-display">No file chosen</span>
          </label>
        </div>
        
        <div className="form-field">
          <label htmlFor="name">Name *</label>
          <div className="input-group">
            <UserIcon />
            <input type="text" id="name" placeholder="Enter your name" defaultValue="Prem" required />
          </div>
        </div>

        {/* Row 2: Email (Full Width on Mobile, Left on Desktop) */}
        <div className="form-field">
          <label htmlFor="email">Email *</label>
          <div className="input-group">
            <MailIcon />
            <input type="email" id="email" placeholder="Enter your email" required />
          </div>
        </div>
        {/* Placeholder to keep the grid flow */ }
        <div className="empty-field"></div> 

        {/* Row 3: Address Line 1 (Plot/Room No.) */}
        <div className="form-field full-width">
          <label htmlFor="plotRoom">Plot No. / Room No. *</label>
          <div className="input-group">
            <MapIcon />
            <input type="text" id="plotRoom" placeholder="Enter flat, house, or room number" required />
          </div>
        </div>

        {/* Row 4: Address Line 2 (Street/Area) */}
        <div className="form-field full-width">
          <label htmlFor="streetArea">Street / Area *</label>
          <div className="input-group">
            <StreetIcon />
            <input type="text" id="streetArea" placeholder="Enter street name or area" required />
          </div>
        </div>

        {/* Row 5: Pincode */}
        <div className="form-field">
          <label htmlFor="pincode">Pincode *</label>
          <div className="input-group">
            <PinIcon />
            <input type="text" id="pincode" placeholder="Enter Pincode" required />
          </div>
        </div>
        {/* Placeholder to keep the grid flow */ }
        <div className="empty-field"></div> 

        {/* Form Action Button */}
        <div className="form-actions full-width">
          <button type="submit" className="btn-primary">Update Profile</button>
        </div>
      </form>
    </div>  
    <Footer/>
    </>
  )
}