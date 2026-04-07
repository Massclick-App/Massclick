import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { viewOtpUser } from "../../../redux/actions/otpAction";
import { fetchMatchedLeads } from "../../../redux/actions/leadsAction";
import { useNavigate } from "react-router-dom";
import CardsSearch from "../CardsSearch/CardsSearch";
import "./leadsPage.css";


function StatCard({ label, value, onClick, accent, children }) {
  return (
    <button
      className={`lp-stat-card ${accent ? "lp-stat-accent" : ""}`}
      onClick={onClick}
      type="button"
    >
      <div className="lp-stat-left">
        <div className="lp-stat-value">{value}</div>
        <div className="lp-stat-label">{label}</div>
      </div>
      <div className="lp-stat-icon">
        <span className="lp-stat-icon-inner">{children}</span>
      </div>
    </button>
  );
}

function LeadRow({ user }) {
  const formattedTime = user.time
    ? new Date(user.time).toLocaleString()
    : null;

  return (
    <article className="lp-lead-row">
      <div className="lp-avatar" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.2" stroke="#2F3A8F" strokeWidth="1.2" />
          <path
            d="M4 20c1.8-4 6.2-6 8-6s6.2 2 8 6"
            stroke="#2F3A8F"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div className="lp-lead-body">
        <div className="lp-lead-head">
          <h4 className="lp-lead-title">{user.userName || "Unknown User"}</h4>
          {formattedTime && <time className="lp-lead-time">{formattedTime}</time>}
        </div>

        <p className="lp-lead-desc">
          <span className="lp-lead-label">Contact</span>
          <br />
          📞 {user.mobileNumber1 || "No phone"}
          {user.mobileNumber2 ? `, ${user.mobileNumber2}` : ""}
          <br />
          ✉️ {user.email || "No email"}
        </p>
      </div>
    </article>
  );
}


export default function LeadsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mobileNumber = localStorage.getItem("mobileNumber");

  const authUser = useSelector((state) => state.otp.viewResponse) || {};
  const { leads: backendLeads = [] } = useSelector((state) => state.leads);

  const { businessName, businessLocation, businessCategory } = authUser;

  const hasBusinessCategory =
    businessCategory?.category && businessCategory.category.trim() !== "";

  const [range, setRange] = useState("all");
  const [repeatOnly, setRepeatOnly] = useState(false);


  useEffect(() => {
    if (!mobileNumber) return;
    dispatch(viewOtpUser(mobileNumber));
    dispatch(fetchMatchedLeads());
  }, [dispatch, mobileNumber]);

 
  const matchedUsers = useMemo(() => {
    const users = [];
    backendLeads.forEach((log) => {
      const createdAt = log.createdAt || null;
      const searchedText = log.searchedUserText || "";

      if (Array.isArray(log.userDetails)) {
        log.userDetails.forEach((u) => {
          users.push({
            ...u,
            time: createdAt,
            searchedUserText: searchedText,
          });
        });
      }
    });

    const unique = {};
    return users.filter((u) => {
      const key = u.mobileNumber1 || u.email || u.userName;
      if (!key || unique[key]) return false;
      unique[key] = true;
      return true;
    });
  }, [backendLeads]);


  const {
    filteredUsers,
    todayCount,
    last7Count,
    last30Count,
    repeatCount,
  } = useMemo(() => {
    const msDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenAgo = new Date(startToday.getTime() - 6 * msDay);
    const thirtyAgo = new Date(startToday.getTime() - 29 * msDay);

    const repeatMap = {};
    let today = 0,
      last7 = 0,
      last30 = 0;

    matchedUsers.forEach((u) => {
      const key = u.mobileNumber1 || u.email || u.userName;
      if (key) repeatMap[key] = (repeatMap[key] || 0) + 1;

      if (u.time) {
        const d = new Date(u.time);
        if (d >= startToday) today++;
        if (d >= sevenAgo) last7++;
        if (d >= thirtyAgo) last30++;
      }
    });

    const repeatSet = new Set(
      Object.keys(repeatMap).filter((k) => repeatMap[k] > 1)
    );

    const filtered = matchedUsers.filter((u) => {
      let ok = true;
      if (range !== "all" && u.time) {
        const d = new Date(u.time);
        if (range === "today") ok = d >= startToday;
        else if (range === "7") ok = d >= sevenAgo;
        else if (range === "30") ok = d >= thirtyAgo;
      }
      if (repeatOnly) {
        const key = u.mobileNumber1 || u.email || u.userName;
        ok = ok && repeatSet.has(key);
      }
      return ok;
    });

    return {
      filteredUsers: filtered,
      todayCount: today,
      last7Count: last7,
      last30Count: last30,
      repeatCount: repeatSet.size,
    };
  }, [matchedUsers, range, repeatOnly]);

  const leadsCount = matchedUsers.length;

  if (!hasBusinessCategory) {
    return (
      <div className="lp-root">
        <main className="lp-container">
          <CardsSearch />
          <br />
          <br />
          <br />
          <br />
          <section className="lp-card" style={{ padding: 40, textAlign: "center" }}>
            <h2>You are not a Business Person</h2>
            <p>Please create your Business Profile to view leads.</p>
            <button
              className="lp-btn lp-btn-primary"
              onClick={() => navigate("/user/create-business")}
            >
              Create Business
            </button>
          </section>
        </main>
      </div>
    );
  }

  const handleTotalLeadsClick = () => {
    navigate("/user/search-history", { state: { leadsUsers: matchedUsers } });
  };

  const qualityLabel =
    leadsCount === 0
      ? "No data yet"
      : leadsCount > 20 || repeatCount > 5
        ? "High quality"
        : leadsCount > 5
          ? "Moderate quality"
          : "Low quality";

  return (
    <div className="lp-root">
      <main className="lp-container">
        <CardsSearch /><br /><br /><br />
        <section className="lp-card">
          <header className="lp-header">
            <div className="lp-business">
              <h2 className="lp-business-name">{businessName || "Your Business"}</h2>
              <div className="lp-business-meta">
                <span>{businessLocation || "Location not set"}</span>
                <span className="lp-pill">{businessCategory?.category || "Category"}</span>
              </div>
              <p className="lp-business-subtitle">
                Real-time leads from users who searched your business category.
              </p>
            </div>
          </header>

          <div className="lp-stats-grid">
            <StatCard label="Total Leads" value={leadsCount} accent onClick={handleTotalLeadsClick}>
              🔥
            </StatCard>

            <StatCard label="Today" value={todayCount}>
              📅
            </StatCard>

            <StatCard label="Last 7 Days" value={last7Count}>
              📊
            </StatCard>

            <StatCard label="Repeat Visitors" value={repeatCount}>
              ♻️
            </StatCard>
          </div>

          <div className="lp-main-grid">
            <div className="lp-list-col">
              <div className="lp-filters">
                <div className="lp-filters-left">
                  <span className="lp-filters-label">Filters:</span>
                  <button type="button" className={`lp-filter-chip ${range === "all" ? "active" : ""}`} onClick={() => setRange("all")}>
                    All time
                  </button>
                  <button type="button" className={`lp-filter-chip ${range === "today" ? "active" : ""}`} onClick={() => setRange("today")}>
                    Today
                  </button>
                  <button type="button" className={`lp-filter-chip ${range === "7" ? "active" : ""}`} onClick={() => setRange("7")}>
                    Last 7 days
                  </button>
                  <button type="button" className={`lp-filter-chip ${range === "30" ? "active" : ""}`} onClick={() => setRange("30")}>
                    Last 30 days
                  </button>
                </div>

                <div className="lp-filters-right">
                  <button type="button" className={`lp-filter-chip lp-filter-toggle ${repeatOnly ? "active" : ""}`} onClick={() => setRepeatOnly((v) => !v)}>
                    Repeat visitors only
                  </button>
                </div>
              </div>

              {filteredUsers.length > 0 ? (
                <>
                  <div className="lp-section-head">
                    <h3 className="lp-section-title">Leads (Users who searched your category)</h3>
                    <span className="lp-section-count">
                      {filteredUsers.length} shown • {leadsCount} total
                    </span>
                  </div>
                  <div className="lp-leads-list">
                    {filteredUsers.map((u, i) => (
                      <LeadRow key={i} user={u} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="lp-empty">
                  <p>
                    No users found for the selected filters in <strong>{businessCategory?.category || "your category"}</strong>
                  </p>
                </div>
              )}
            </div>

            <aside className="lp-side-col">
              <div className="lp-side-card lp-insight-card">
                <div className="lp-small-label">Snapshot</div>
                <h4 className="lp-side-title">Leads Insights</h4>

                <div className="lp-insight-row">
                  <span>Total leads</span>
                  <strong>{leadsCount}</strong>
                </div>
                <div className="lp-insight-row">
                  <span>Today</span>
                  <strong>{todayCount}</strong>
                </div>
                <div className="lp-insight-row">
                  <span>Last 7 days</span>
                  <strong>{last7Count}</strong>
                </div>
                <div className="lp-insight-row">
                  <span>Last 30 days</span>
                  <strong>{last30Count}</strong>
                </div>
              </div>

              <div className="lp-side-card lp-quality-card">
                <div className="lp-small-label">Lead Quality</div>
                <h4 className="lp-side-title">{qualityLabel}</h4>

                <div className="lp-quality-rows">
                  <div className="lp-quality-row">
                    <span>High intent</span>
                    <div className="lp-quality-bar">
                      <span className="lp-quality-bar-fill high" />
                    </div>
                  </div>
                  <div className="lp-quality-row">
                    <span>Warm</span>
                    <div className="lp-quality-bar">
                      <span className="lp-quality-bar-fill medium" />
                    </div>
                  </div>
                  <div className="lp-quality-row">
                    <span>Cold</span>
                    <div className="lp-quality-bar">
                      <span className="lp-quality-bar-fill low" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lp-side-card lp-timeline-card">
                <div className="lp-small-label">Activity Timeline</div>
                <ul className="lp-timeline-list">
                  <li>
                    <span className="lp-timeline-dot primary" />
                    <div>
                      <strong>Today</strong>
                      <p>{todayCount} new leads</p>
                    </div>
                  </li>
                  <li>
                    <span className="lp-timeline-dot" />
                    <div>
                      <strong>Last 7 days</strong>
                      <p>{last7Count} total leads</p>
                    </div>
                  </li>
                  <li>
                    <span className="lp-timeline-dot" />
                    <div>
                      <strong>Last 30 days</strong>
                      <p>{last30Count} total leads</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Engagement mini chart */}
              <div className="lp-side-card lp-chart-card">
                <div className="lp-small-label">Engagement</div>
                <h4 className="lp-side-title">When users search you</h4>
                <div className="lp-chart-bars">
                  <div className="lp-chart-bar">
                    <div className="lp-chart-bar-fill morning" />
                    <span>Morning</span>
                  </div>
                  <div className="lp-chart-bar">
                    <div className="lp-chart-bar-fill afternoon" />
                    <span>Afternoon</span>
                  </div>
                  <div className="lp-chart-bar">
                    <div className="lp-chart-bar-fill evening" />
                    <span>Evening</span>
                  </div>
                  <div className="lp-chart-bar">
                    <div className="lp-chart-bar-fill night" />
                    <span>Night</span>
                  </div>
                </div>
              </div>

              <div className="lp-side-card lp-tips-card">
                <div className="lp-small-label">Conversion Tips</div>
                <ul className="lp-tips-list">
                  <li>Call new leads within 5 minutes.</li>
                  <li>Send a short WhatsApp intro message.</li>
                  <li>Add notes after each conversation.</li>
                  <li>Ask for ratings after service is completed.</li>
                </ul>

                <button className="lp-btn lp-btn-primary full">
                  View Detailed Analytics
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
