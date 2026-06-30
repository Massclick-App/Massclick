import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { getBusinessProfileByPhone } from "../../../../redux/actions/mrpAction.js";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./mrpInsights.module.css";
const cx = createScopedClassNames(styles);
export default function MNILeadsInsights({
  view
}) {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const {
    businessProfile = null,
    businessProfileLoading,
    businessProfileError
  } = useSelector(state => state.mrp || {});
  useEffect(() => {
    // "leads" view piggybacks on data fetched by "profile" view
    if (view === "leads") return;
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
  }, [dispatch, view]);
  const S3_URL = "https://images.massclick.in";
  const formatPhone = phone => {
    const clean = phone?.toString().replace(/\D/g, "").slice(-10) || "N/A";
    return clean.replace(/(\d{5})(\d{5})/, "$1-$2");
  };
  const getTodayHours = openingHours => {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long"
    });
    const todayHours = openingHours?.find(h => h.day === today);
    if (!todayHours) return "N/A";
    if (todayHours.isClosed) return "Closed";
    if (todayHours.is24Hours) return "24 Hours";
    return `${todayHours.open} - ${todayHours.close}`;
  };
  const formatDate = date => new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  // ── Shared loading / error / empty states ──

  if (businessProfileLoading) {
    return <div className={cx("mrp-insights")}>
        <div className={cx("mrp-insights-loading")}>
          <div className={cx("spinner")}></div>
          <p>Loading business profile...</p>
        </div>
      </div>;
  }
  if (businessProfileError || error) {
    return <div className={cx("mrp-insights")}>
        <div className={cx("mrp-insights-error")}>
          <p>⚠️ Error: {businessProfileError || error}</p>
        </div>
      </div>;
  }
  if (!businessProfile) {
    return <div className={cx("mrp-insights")}>
        <div className={cx("mrp-insights-empty")}>
          <p>No business profile found</p>
        </div>
      </div>;
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

  // ── Profile view (row 1 right) ──
  if (view === "profile") {
    return <div className={cx("mrp-insights mrp-insights--profile")}>
        <div className={cx("mrp-insights-header")}>
          <h3>Business Profile</h3>
          <span>{location?.toUpperCase()}</span>
        </div>

        <div className={cx("business-profile-main")}>
          {bannerImageKey && <div className={cx("business-banner")}>
              <img src={`${S3_URL}/${bannerImageKey}`} alt={businessName} onError={e => {
            e.target.style.display = "none";
          }} />
            </div>}

          <div className={cx("business-info-section")}>
            <div className={cx("business-header-info")}>
              <div>
                <h2 className={cx("business-name")}>{businessName}</h2>
                <p className={cx("business-category")}>{category}</p>
              </div>
              <div className={cx("business-rating")}>
                <span className={cx("rating-stars")}>⭐ {averageRating?.toFixed(1) || "N/A"}</span>
              </div>
            </div>

            <div className={cx("business-quick-stats")}>
              <div className={cx("stat-item")}>
                <span className={cx("stat-label")}>Today's Hours</span>
                <span className={cx("stat-value")}>{getTodayHours(openingHours)}</span>
              </div>
              <div className={cx("stat-item")}>
                <span className={cx("stat-label")}>Location</span>
                <span className={cx("stat-value")}>{location}</span>
              </div>
              <div className={cx("stat-item")}>
                <span className={cx("stat-label")}>Views</span>
                <span className={cx("stat-value")}>{analytics?.views || 0}</span>
              </div>
              <div className={cx("stat-item")}>
                <span className={cx("stat-label")}>Leads Received</span>
                <span className={cx("stat-value")}>{mniDetails?.leadsCount || 0}</span>
              </div>
            </div>

            <div className={cx("business-contact-info")}>
              <h4>Contact Information</h4>
              <div className={cx("contact-grid")}>
                <div className={cx("contact-item")}>
                  <span className={cx("contact-icon")}>📱</span>
                  <div>
                    <p className={cx("contact-label")}>Phone</p>
                    <p className={cx("contact-value")}>{formatPhone(contact)}</p>
                  </div>
                </div>
                <div className={cx("contact-item")}>
                  <span className={cx("contact-icon")}>💬</span>
                  <div>
                    <p className={cx("contact-label")}>WhatsApp</p>
                    <p className={cx("contact-value")}>{formatPhone(whatsappNumber)}</p>
                  </div>
                </div>
                <div className={cx("contact-item")}>
                  <span className={cx("contact-icon")}>✉️</span>
                  <div>
                    <p className={cx("contact-label")}>Email</p>
                    <p className={cx("contact-value")}>{email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }

  // ── Leads view (row 2 right) ──
  if (view === "leads") {
    return <div className={cx("mrp-insights mrp-insights--leads")}>
        {sentLeads.length > 0 ? <div className={cx("sent-leads-section")}>
            <h3 className={cx("sent-leads-title")}>Sent Leads
              <span className={cx("sent-leads-count")}>{sentLeads.length}</span>
            </h3>

            <div className={cx("sent-leads-list")}>
              {sentLeads.map((lead, index) => <div key={lead._id || index} className={cx("sent-lead-card")}>
                  <div className={cx("lead-card-header")}>
                    <h4 className={cx("lead-business-name")}>{lead.businessName}</h4>
                    <span className={cx("lead-category-badge")}>{lead.category}</span>
                  </div>

                  <div className={cx("lead-card-body")}>
                    <div className={cx("lead-info-item")}>
                      <span className={cx("lead-label")}>📍 Location</span>
                      <span className={cx("lead-value")}>{lead.location}</span>
                    </div>
                    <div className={cx("lead-info-item")}>
                      <span className={cx("lead-label")}>📅 Sent</span>
                      <span className={cx("lead-value")}>{formatDate(lead.date)}</span>
                    </div>
                    {lead.receiverDetails && <>
                        <div className={cx("lead-info-item")}>
                          <span className={cx("lead-label")}>📱 Contact</span>
                          <span className={cx("lead-value")}>{formatPhone(lead.receiverDetails.contact)}</span>
                        </div>
                        <div className={cx("lead-info-item")}>
                          <span className={cx("lead-label")}>💬 WhatsApp</span>
                          <span className={cx("lead-value")}>{formatPhone(lead.receiverDetails.whatsappNumber)}</span>
                        </div>
                      </>}
                  </div>
                </div>)}
            </div>
          </div> : <div className={cx("no-sent-leads")}>
            <div className={cx("no-sent-leads-icon")}>📤</div>
            <p>No leads sent yet</p>
            <span>Leads sent to businesses will appear here.</span>
          </div>}
      </div>;
  }

  // ── Default: full view ──
  return <div className={cx("mrp-insights")}>
      <div className={cx("mrp-insights-header")}>
        <h3>📊 Business Profile</h3>
        <span>{location?.toUpperCase()}</span>
      </div>

      <div className={cx("business-profile-main")}>
        {bannerImageKey && <div className={cx("business-banner")}>
            <img src={`${S3_URL}/${bannerImageKey}`} alt={businessName} onError={e => {
          e.target.style.display = "none";
        }} />
          </div>}

        <div className={cx("business-info-section")}>
          <div className={cx("business-header-info")}>
            <div>
              <h2 className={cx("business-name")}>{businessName}</h2>
              <p className={cx("business-category")}>{category}</p>
            </div>
            <div className={cx("business-rating")}>
              <span className={cx("rating-stars")}>⭐ {averageRating?.toFixed(1) || "N/A"}</span>
            </div>
          </div>

          <div className={cx("business-quick-stats")}>
            <div className={cx("stat-item")}>
              <span className={cx("stat-label")}>Today's Hours</span>
              <span className={cx("stat-value")}>{getTodayHours(openingHours)}</span>
            </div>
            <div className={cx("stat-item")}>
              <span className={cx("stat-label")}>Location</span>
              <span className={cx("stat-value")}>{location}</span>
            </div>
            <div className={cx("stat-item")}>
              <span className={cx("stat-label")}>Views</span>
              <span className={cx("stat-value")}>{analytics?.views || 0}</span>
            </div>
            <div className={cx("stat-item")}>
              <span className={cx("stat-label")}>Leads Received</span>
              <span className={cx("stat-value")}>{mniDetails?.leadsCount || 0}</span>
            </div>
          </div>

          <div className={cx("business-contact-info")}>
            <h4>Contact Information</h4>
            <div className={cx("contact-grid")}>
              <div className={cx("contact-item")}>
                <span className={cx("contact-icon")}>📱</span>
                <div>
                  <p className={cx("contact-label")}>Phone</p>
                  <p className={cx("contact-value")}>{formatPhone(contact)}</p>
                </div>
              </div>
              <div className={cx("contact-item")}>
                <span className={cx("contact-icon")}>💬</span>
                <div>
                  <p className={cx("contact-label")}>WhatsApp</p>
                  <p className={cx("contact-value")}>{formatPhone(whatsappNumber)}</p>
                </div>
              </div>
              <div className={cx("contact-item")}>
                <span className={cx("contact-icon")}>✉️</span>
                <div>
                  <p className={cx("contact-label")}>Email</p>
                  <p className={cx("contact-value")}>{email || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {mniDetails && <div className={cx("business-mni-details")}>
              <h4>Lead Performance</h4>
              <div className={cx("mni-stats-grid")}>
                <div className={cx("mni-stat")}>
                  <p className={cx("mni-stat-label")}>Total Leads</p>
                  <p className={cx("mni-stat-value")}>{mniDetails?.leadsCount || 0}</p>
                </div>
                <div className={cx("mni-stat")}>
                  <p className={cx("mni-stat-label")}>Categories</p>
                  <p className={cx("mni-stat-value")}>{mniDetails?.leadsCategory?.length || 0}</p>
                </div>
                <div className={cx("mni-stat")}>
                  <p className={cx("mni-stat-label")}>Group</p>
                  <p className={cx("mni-stat-value")}>{mniDetails?.categoryGroup || "N/A"}</p>
                </div>
                {mniDetails?.lastLeadsUpdate && <div className={cx("mni-stat")}>
                    <p className={cx("mni-stat-label")}>Last Update</p>
                    <p className={cx("mni-stat-value")}>{formatDate(mniDetails.lastLeadsUpdate)}</p>
                  </div>}
              </div>
            </div>}
        </div>
      </div>

      {sentLeads.length > 0 ? <div className={cx("sent-leads-section")}>
          <h3 className={cx("sent-leads-title")}>📤 Sent Leads ({sentLeads.length})</h3>
          <div className={cx("sent-leads-list")}>
            {sentLeads.map((lead, index) => <div key={lead._id || index} className={cx("sent-lead-card")}>
                <div className={cx("lead-card-header")}>
                  <h4 className={cx("lead-business-name")}>{lead.businessName}</h4>
                  <span className={cx("lead-category-badge")}>{lead.category}</span>
                </div>
                <div className={cx("lead-card-body")}>
                  <div className={cx("lead-info-item")}>
                    <span className={cx("lead-label")}>📍 Location:</span>
                    <span className={cx("lead-value")}>{lead.location}</span>
                  </div>
                  <div className={cx("lead-info-item")}>
                    <span className={cx("lead-label")}>📅 Sent Date:</span>
                    <span className={cx("lead-value")}>{formatDate(lead.date)}</span>
                  </div>
                  {lead.receiverDetails && <>
                      <div className={cx("lead-info-item")}>
                        <span className={cx("lead-label")}>📱 Contact:</span>
                        <span className={cx("lead-value")}>{formatPhone(lead.receiverDetails.contact)}</span>
                      </div>
                      <div className={cx("lead-info-item")}>
                        <span className={cx("lead-label")}>💬 WhatsApp:</span>
                        <span className={cx("lead-value")}>{formatPhone(lead.receiverDetails.whatsappNumber)}</span>
                      </div>
                    </>}
                </div>
              </div>)}
          </div>
        </div> : <div className={cx("no-sent-leads")}>
          <p>📤 No leads sent yet</p>
        </div>}
    </div>;
}
