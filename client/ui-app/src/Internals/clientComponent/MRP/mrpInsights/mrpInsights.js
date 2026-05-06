import { getBusinessProfileByPhone } from "../../../../redux/actions/mrpAction.js";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./mrpInsights.css";

export default function MNILeadsInsights() {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const {
    businessProfile = null,
    businessProfileLoading,
    businessProfileError
  } = useSelector(state => state.mrp || {});

  useEffect(() => {
    try {
      const phoneNumber = localStorage.getItem("mobileNumber");

      if (!phoneNumber) {
        setError("Phone number not found in localStorage");
        return;
      }

      dispatch(getBusinessProfileByPhone(phoneNumber));

    } catch (err) {
      console.error("Error fetching business profile:", err);
      setError(err.message);
    }
  }, [dispatch]);

  if (businessProfileLoading) {
    return (
      <div className="mrp-insights-loading">
        <div className="spinner"></div>
        <p>Loading business profile...</p>
      </div>
    );
  }

  if (businessProfileError || error) {
    return (
      <div className="mrp-insights-error">
        <p>⚠️ Error: {businessProfileError || error}</p>
      </div>
    );
  }

  if (!businessProfile) {
    return (
      <div className="mrp-insights-empty">
        <p>No business profile found</p>
      </div>
    );
  }

  const {
    businessName,
    location,
    category,
    contact,
    whatsappNumber,
    email,
    bannerImageKey,
    openingHours,
    analytics,
    averageRating,
    mniDetails,
    sentLeads = []
  } = businessProfile;

  const S3_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com";

  // Format phone number
  const formatPhone = (phone) => {
    const cleanPhone = phone?.toString().replace(/\D/g, "").slice(-10) || "N/A";
    return cleanPhone.replace(/(\d{5})(\d{5})/, "$1-$2");
  };

  // Get today's opening hours
  const getTodayHours = () => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayHours = openingHours?.find(h => h.day === today);
    
    if (!todayHours) return "N/A";
    if (todayHours.isClosed) return "Closed";
    if (todayHours.is24Hours) return "24 Hours";
    return `${todayHours.open} - ${todayHours.close}`;
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="mrp-insights">
      {/* ===== HEADER ===== */}
      <div className="mrp-insights-header">
        <h3>📊 Business Profile</h3>
        <span>{location?.toUpperCase()}</span>
      </div>

      {/* ===== MAIN PROFILE CARD ===== */}
      <div className="business-profile-main">
        {/* Banner */}
        {bannerImageKey && (
          <div className="business-banner">
            <img
              src={`${S3_URL}/${bannerImageKey}`}
              alt={businessName}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Business Info Section */}
        <div className="business-info-section">
          <div className="business-header-info">
            <div>
              <h2 className="business-name">{businessName}</h2>
              <p className="business-category">{category}</p>
            </div>
            <div className="business-rating">
              <span className="rating-stars">⭐ {averageRating?.toFixed(1) || "N/A"}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="business-quick-stats">
            <div className="stat-item">
              <span className="stat-label">Today's Hours</span>
              <span className="stat-value">{getTodayHours()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Location</span>
              <span className="stat-value">{location}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Views</span>
              <span className="stat-value">{analytics?.views || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Leads Received</span>
              <span className="stat-value">{mniDetails?.leadsCount || 0}</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="business-contact-info">
            <h4>Contact Information</h4>
            <div className="contact-grid">
              <div className="contact-item">
                <span className="contact-icon">📱</span>
                <div>
                  <p className="contact-label">Phone</p>
                  <p className="contact-value">{formatPhone(contact)}</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">💬</span>
                <div>
                  <p className="contact-label">WhatsApp</p>
                  <p className="contact-value">{formatPhone(whatsappNumber)}</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div>
                  <p className="contact-label">Email</p>
                  <p className="contact-value">{email || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* MNI Details */}
          {mniDetails && (
            <div className="business-mni-details">
              <h4>Lead Performance</h4>
              <div className="mni-stats-grid">
                <div className="mni-stat">
                  <p className="mni-stat-label">Total Leads</p>
                  <p className="mni-stat-value">{mniDetails?.leadsCount || 0}</p>
                </div>
                <div className="mni-stat">
                  <p className="mni-stat-label">Categories</p>
                  <p className="mni-stat-value">{mniDetails?.leadsCategory?.length || 0}</p>
                </div>
                <div className="mni-stat">
                  <p className="mni-stat-label">Group</p>
                  <p className="mni-stat-value">{mniDetails?.categoryGroup || "N/A"}</p>
                </div>
                {mniDetails?.lastLeadsUpdate && (
                  <div className="mni-stat">
                    <p className="mni-stat-label">Last Update</p>
                    <p className="mni-stat-value">{formatDate(mniDetails.lastLeadsUpdate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== SENT LEADS SECTION ===== */}
      {sentLeads && sentLeads.length > 0 && (
        <div className="sent-leads-section">
          <h3 className="sent-leads-title">📤 Sent Leads ({sentLeads.length})</h3>
          
          <div className="sent-leads-list">
            {sentLeads.map((lead, index) => (
              <div key={lead._id || index} className="sent-lead-card">
                <div className="lead-card-header">
                  <h4 className="lead-business-name">{lead.businessName}</h4>
                  <span className="lead-category-badge">{lead.category}</span>
                </div>

                <div className="lead-card-body">
                  <div className="lead-info-item">
                    <span className="lead-label">📍 Location:</span>
                    <span className="lead-value">{lead.location}</span>
                  </div>

                  <div className="lead-info-item">
                    <span className="lead-label">📅 Sent Date:</span>
                    <span className="lead-value">{formatDate(lead.date)}</span>
                  </div>

                  {lead.receiverDetails && (
                    <>
                      <div className="lead-info-item">
                        <span className="lead-label">📱 Contact:</span>
                        <span className="lead-value">{formatPhone(lead.receiverDetails.contact)}</span>
                      </div>
                      <div className="lead-info-item">
                        <span className="lead-label">💬 WhatsApp:</span>
                        <span className="lead-value">{formatPhone(lead.receiverDetails.whatsappNumber)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Sent Leads */}
      {(!sentLeads || sentLeads.length === 0) && (
        <div className="no-sent-leads">
          <p>📤 No leads sent yet</p>
        </div>
      )}
    </div>
  );
}