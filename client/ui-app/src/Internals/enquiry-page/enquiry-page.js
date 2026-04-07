// EnquiryPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./enquiry-page.css";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllStartProjects,
  editStartProject,
} from "../../redux/actions/startProjectAction.js";

export default function EnquiryPage() {
  const dispatch = useDispatch();

  const { projects = [], loading } = useSelector(
    (state) => state.startProjectReducer || {}
  );

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);

  // New: search + status filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("open"); // 'open' | 'closed' | 'all'

  useEffect(() => {
    dispatch(getAllStartProjects());
  }, [dispatch]);

  // --- Summary metrics ---
  const totalEnquiries = projects.length;
  const openEnquiries = projects.filter((p) => p.isActive !== false).length;
  const closedEnquiries = projects.filter((p) => p.isActive === false).length;
  const todayEnquiries = projects.filter((p) => {
    if (!p.submittedAt) return false;
    const d = new Date(p.submittedAt);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  // --- Helpers ---
  const getInitials = (name = "") => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const isNewEnquiry = (submittedAt) => {
    if (!submittedAt) return false;
    const diff = Date.now() - new Date(submittedAt).getTime();
    const twoDays = 1000 * 60 * 60 * 24 * 2;
    return diff < twoDays;
  };

  // --- Filter + sort enquiries for display ---
  const filteredEnquiries = useMemo(() => {
    let list = [...projects];

    // status filter
    list = list.filter((p) => {
      if (statusFilter === "open") return p.isActive !== false;
      if (statusFilter === "closed") return p.isActive === false;
      return true; // all
    });

    // search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const fullName = (p.fullName || "").toLowerCase();
        const businessName = (p.businessName || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        const phone = (p.contactNumber || "").toLowerCase();
        return (
          fullName.includes(query) ||
          businessName.includes(query) ||
          email.includes(query) ||
          phone.includes(query)
        );
      });
    }

    // sort: latest first
    list.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return tb - ta;
    });

    return list;
  }, [projects, searchTerm, statusFilter]);

  // --- Handlers ---
  const handleView = (item) => {
    setSelectedEnquiry(item);
    setOpenDrawer(true);
  };

  const handleCloseDrawer = () => {
    setSelectedEnquiry(null);
    setOpenDrawer(false);
  };

  const handleCloseEnquiry = (item) => {
    const confirmClose = window.confirm(
      "Mark this enquiry as closed? You can still view it later from the Closed filter."
    );
    if (!confirmClose) return;

    dispatch(editStartProject(item._id, { isActive: false }))
      .then(() => dispatch(getAllStartProjects()))
      .catch((err) => console.log(err));
  };

  return (
    <div className="business-enquiry-container">
      {/* Top header + metrics */}
      <header className="be-header-row">
        <div className="be-header-left">
          <h2 className="business-enquiry-title">Business Enquiries</h2>
          <p className="business-enquiry-sub">
            Central inbox for all enquiries coming from your website &amp; lead
            forms. Reach out, update status, and never miss a potential client.
          </p>
        </div>

        <div className="be-header-metrics">
          <div className="be-metric-card primary">
            <div className="be-metric-label">Total</div>
            <div className="be-metric-value">{totalEnquiries}</div>
            <div className="be-metric-sub">All enquiries</div>
          </div>
          <div className="be-metric-card">
            <div className="be-metric-label">Open</div>
            <div className="be-metric-value">{openEnquiries}</div>
            <div className="be-metric-sub">Awaiting action</div>
          </div>
          <div className="be-metric-card">
            <div className="be-metric-label">Closed</div>
            <div className="be-metric-value">{closedEnquiries}</div>
            <div className="be-metric-sub">Handled</div>
          </div>
          <div className="be-metric-card">
            <div className="be-metric-label">Today</div>
            <div className="be-metric-value">{todayEnquiries}</div>
            <div className="be-metric-sub">New today</div>
          </div>
        </div>
      </header>

      {/* Controls row */}
      <div className="be-controls-row">
        <div className="be-search-wrapper">
          <input
            type="text"
            className="be-search-input"
            placeholder="Search by name, business, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="be-filter-tabs">
          <button
            type="button"
            className={`be-filter-tab ${
              statusFilter === "open" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("open")}
          >
            Open
          </button>
          <button
            type="button"
            className={`be-filter-tab ${
              statusFilter === "closed" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("closed")}
          >
            Closed
          </button>
          <button
            type="button"
            className={`be-filter-tab ${
              statusFilter === "all" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
        </div>
      </div>

      {/* List / loader / empty states */}
      {loading && (
        <div className="be-loading-row">
          <div className="be-loading-spinner" />
          <span>Loading enquiries...</span>
        </div>
      )}

      {!loading && filteredEnquiries.length === 0 && (
        <div className="be-empty-state">
          <h3>No enquiries found</h3>
          <p>
            Try adjusting your filters or search. New enquiries will appear here
            automatically as they come in.
          </p>
        </div>
      )}

      {!loading && filteredEnquiries.length > 0 && (
        <div className="business-enquiry-card-list">
          {filteredEnquiries.map((item) => {
            const status = item.isActive === false ? "Closed" : "Open";
            const statusClass =
              item.isActive === false ? "status-closed" : "status-open";

            const isNew = isNewEnquiry(item.submittedAt);
            const initials = getInitials(item.fullName || item.businessName);

            return (
              <div key={item._id} className="business-enquiry-card">
                {/* Card header */}
                <div className="business-enquiry-header">
                  <div className="be-header-left-side">
                    <div className="be-avatar-circle">{initials}</div>

                    <div className="be-name-block">
                      <div className="be-name-row">
                        <h3 className="business-enquiry-name">
                          {item.fullName}
                          {item.businessName
                            ? ` (${item.businessName})`
                            : ""}
                        </h3>
                        {isNew && (
                          <span className="be-badge-new">New</span>
                        )}
                      </div>

                      <div className="be-meta-row">
                        {item.submittedAt && (
                          <span>
                            {new Date(
                              item.submittedAt
                            ).toLocaleDateString()}{" "}
                            ·{" "}
                            {new Date(
                              item.submittedAt
                            ).toLocaleTimeString()}
                          </span>
                        )}
                        {(item.city || item.state) && (
                          <>
                            <span className="be-dot">•</span>
                            <span>
                              {item.city}
                              {item.city && item.state ? ", " : ""}
                              {item.state}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="business-enquiry-btn-group">
                    <span className={`be-status-pill ${statusClass}`}>
                      {status}
                    </span>

                    <div className="business-enquiry-btn-row">
                      <button
                        className="business-enquiry-view-btn"
                        onClick={() => handleView(item)}
                      >
                        View
                      </button>

                      {item.isActive !== false && (
                        <button
                          className="business-enquiry-close-btn"
                          onClick={() => handleCloseEnquiry(item)}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message preview + details */}
                <p className="business-enquiry-text be-message-preview">
                  <strong>Message:</strong>{" "}
                  {item.message || "No message provided."}
                </p>

                <div className="be-card-details-row">
                  <p className="business-enquiry-text">
                    <strong>Phone:</strong> {item.contactNumber || "—"}
                  </p>

                  <p className="business-enquiry-text">
                    <strong>Email:</strong> {item.email || "—"}
                  </p>

                  <p className="business-enquiry-text">
                    <strong>Location:</strong>{" "}
                    {item.city || item.state
                      ? `${item.city || ""}${
                          item.city && item.state ? ", " : ""
                        }${item.state || ""}`
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in right drawer for details */}
      {openDrawer && selectedEnquiry && (
        <div className="be-drawer-overlay" onClick={handleCloseDrawer}>
          <aside
            className="be-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="be-drawer-header">
              <div className="be-drawer-title-block">
                <h3 className="be-drawer-title">
                  {selectedEnquiry.fullName}
                  {selectedEnquiry.businessName
                    ? ` (${selectedEnquiry.businessName})`
                    : ""}
                </h3>
                <p className="be-drawer-subtitle">
                  Detailed view of this enquiry. Use this info when you
                  call or follow up with the customer.
                </p>
              </div>

              <button
                type="button"
                className="be-drawer-close-btn"
                onClick={handleCloseDrawer}
              >
                ✕
              </button>
            </header>

            <div className="be-drawer-body">
              <section className="be-drawer-section">
                <h4>Contact</h4>
                <div className="be-drawer-grid">
                  <p>
                    <strong>Full Name:</strong>{" "}
                    {selectedEnquiry.fullName || "—"}
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    {selectedEnquiry.email || "—"}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    {selectedEnquiry.contactNumber || "—"}
                  </p>
                  <p>
                    <strong>Business Phone:</strong>{" "}
                    {selectedEnquiry.businessPhone || "—"}
                  </p>
                </div>
              </section>

              <section className="be-drawer-section">
                <h4>Business</h4>
                <div className="be-drawer-grid">
                  <p>
                    <strong>Business Name:</strong>{" "}
                    {selectedEnquiry.businessName || "—"}
                  </p>
                  <p>
                    <strong>Business Type:</strong>{" "}
                    {selectedEnquiry.businessType || "—"}
                  </p>
                  <p>
                    <strong>Category:</strong>{" "}
                    {selectedEnquiry.category || "—"}
                  </p>
                  <p>
                    <strong>Sub Category:</strong>{" "}
                    {selectedEnquiry.subCategory || "—"}
                  </p>
                </div>
              </section>

              <section className="be-drawer-section">
                <h4>Location</h4>
                <div className="be-drawer-grid">
                  <p>
                    <strong>Address:</strong>{" "}
                    {selectedEnquiry.address || "—"}
                  </p>
                  <p>
                    <strong>City:</strong> {selectedEnquiry.city || "—"}
                  </p>
                  <p>
                    <strong>State:</strong>{" "}
                    {selectedEnquiry.state || "—"}
                  </p>
                  <p>
                    <strong>Country:</strong>{" "}
                    {selectedEnquiry.country || "—"}
                  </p>
                  <p>
                    <strong>Pincode:</strong>{" "}
                    {selectedEnquiry.postalCode || "—"}
                  </p>
                </div>
              </section>

              <section className="be-drawer-section">
                <h4>Message & Notes</h4>
                <p>
                  <strong>Message:</strong>{" "}
                  {selectedEnquiry.message || "—"}
                </p>
                <p>
                  <strong>Notes:</strong>{" "}
                  {selectedEnquiry.notes || "—"}
                </p>
              </section>

              <section className="be-drawer-section">
                <h4>Meta</h4>
                <p>
                  <strong>Status:</strong>{" "}
                  {selectedEnquiry.isActive === false
                    ? "Closed"
                    : "Open"}
                </p>
                <p>
                  <strong>Submitted At:</strong>{" "}
                  {selectedEnquiry.submittedAt
                    ? new Date(
                        selectedEnquiry.submittedAt
                      ).toLocaleString()
                    : "—"}
                </p>
              </section>
            </div>

            <footer className="be-drawer-footer">
              <button
                type="button"
                className="be-drawer-secondary-btn"
                onClick={handleCloseDrawer}
              >
                Close
              </button>
              {selectedEnquiry.isActive !== false && (
                <button
                  type="button"
                  className="be-drawer-primary-btn"
                  onClick={() => handleCloseEnquiry(selectedEnquiry)}
                >
                  Mark as Closed
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
