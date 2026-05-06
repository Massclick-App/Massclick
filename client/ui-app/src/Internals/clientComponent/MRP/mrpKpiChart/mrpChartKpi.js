import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getLeadReport } from "../../../../redux/actions/mrpAction.js";
import './mrpChartKpi.css';

export default function MRPChartKPI({ group = "A", category = "" }) {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { leadReport, leadReportLoading, leadReportError } = useSelector(state => state.mrp || {});

  useEffect(() => {
    dispatch(getLeadReport({ group, category }));
  }, [dispatch, group, category]);

  const safeValue = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return val?.name || val?.label || JSON.stringify(val);
    return val;
  };

  if (leadReportLoading) {
    return (
      <div className="mrp-chart-kpi-loading">
        <div className="kpi-state-spinner"></div>
        <p>Loading lead report...</p>
      </div>
    );
  }

  if (leadReportError) {
    return (
      <div className="mrp-chart-kpi-error">
        <div className="kpi-state-icon">⚠️</div>
        <p>
          {typeof leadReportError === "string"
            ? leadReportError
            : leadReportError?.message || "Failed to load lead report"}
        </p>
      </div>
    );
  }

  if (!leadReport || !Array.isArray(leadReport.data) || !leadReport.data.length) {
    return (
      <div className="mrp-chart-kpi-empty">
        <div className="kpi-state-icon">📊</div>
        <p>No lead report data yet</p>
        <span>Data will appear once requirements are published in your group.</span>
      </div>
    );
  }

  const totalLeads = leadReport.data.reduce((sum, s) => sum + (Number(s?.totalSentLeads) || 0), 0);
  const uniqueCategories = new Set(leadReport.data.map(s => s.senderCategory).filter(Boolean));

  const filtered = leadReport.data.filter(s =>
    !search.trim() ||
    s.senderBusinessName?.toLowerCase().includes(search.toLowerCase()) ||
    s.senderCategory?.toLowerCase().includes(search.toLowerCase()) ||
    s.senderLocation?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    setExpandedId(null);
  };

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="kpi-root">

      {/* ── Summary strip ── */}
      <div className="kpi-summary">
        <div className="kpi-summary-card">
          <span>Total Senders</span>
          <strong>{safeValue(leadReport.totalSenders || leadReport.data.length)}</strong>
        </div>
        <div className="kpi-summary-card">
          <span>Total Leads</span>
          <strong>{totalLeads}</strong>
        </div>
        <div className="kpi-summary-card">
          <span>Categories</span>
          <strong>{uniqueCategories.size}</strong>
        </div>
        <div className="kpi-summary-card kpi-summary-meta">
          <span>Group</span>
          <strong>{safeValue(leadReport.group || group)}</strong>
        </div>
        <div className="kpi-summary-card kpi-summary-meta">
          <span>Location</span>
          <strong>{safeValue(leadReport.location)}</strong>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="kpi-search-bar">
        <span className="kpi-search-icon">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={`Search ${leadReport.data.length} businesses…`}
        />
        {search && (
          <button className="kpi-search-clear" onClick={() => handleSearch("")}>✕</button>
        )}
      </div>

      {/* ── Accordion list ── */}
      <div className="kpi-accordion">

        {/* Header row */}
        <div className="kpi-accordion-header-row">
          <span className="kpi-col kpi-col-name">Business</span>
          <span className="kpi-col kpi-col-cat">Category</span>
          <span className="kpi-col kpi-col-loc">Location</span>
          <span className="kpi-col kpi-col-leads">Leads</span>
          <span className="kpi-col kpi-col-toggle"></span>
        </div>

        {filtered.length === 0 && (
          <div className="kpi-no-results">No businesses match "{search}"</div>
        )}

        {paginated.map((sender) => {
          const isOpen = expandedId === sender.senderBusinessId;
          const hasLeads = sender.sentLeads?.length > 0;

          return (
            <div key={sender.senderBusinessId} className={`kpi-accordion-item${isOpen ? " kpi-accordion-item--open" : ""}`}>

              {/* Collapsed row */}
              <button
                className="kpi-accordion-row"
                onClick={() => toggle(sender.senderBusinessId)}
                aria-expanded={isOpen}
              >
                <span className="kpi-col kpi-col-name">
                  <span className="kpi-biz-avatar">
                    {sender.senderBusinessName?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="kpi-biz-name">{safeValue(sender.senderBusinessName)}</span>
                </span>
                <span className="kpi-col kpi-col-cat">
                  <span className="kpi-cat-badge">{safeValue(sender.senderCategory) || "—"}</span>
                </span>
                <span className="kpi-col kpi-col-loc">{safeValue(sender.senderLocation)}</span>
                <span className="kpi-col kpi-col-leads">
                  <span className={`kpi-leads-chip${hasLeads ? " kpi-leads-chip--active" : ""}`}>
                    {sender.totalSentLeads}
                  </span>
                </span>
                <span className="kpi-col kpi-col-toggle">
                  <span className={`kpi-chevron${isOpen ? " kpi-chevron--open" : ""}`}>›</span>
                </span>
              </button>

              {/* Expanded: sent leads detail */}
              {isOpen && (
                <div className="kpi-accordion-body">
                  {hasLeads ? (
                    <>
                      <p className="kpi-body-label">Sent Leads ({sender.sentLeads.length})</p>
                      <div className="kpi-leads-table">
                        <div className="kpi-leads-table-head">
                          <span>Receiver</span>
                          <span>Category</span>
                          <span>Location</span>
                          <span>Contact</span>
                          <span>Date</span>
                        </div>
                        {sender.sentLeads.map((lead, i) => (
                          <div key={i} className="kpi-leads-table-row">
                            <span className="kpi-lead-receiver">{lead.receiverBusinessName}</span>
                            <span>
                              <span className="kpi-cat-badge kpi-cat-badge--sm">{lead.leadCategory}</span>
                            </span>
                            <span>{lead.receiverLocation}</span>
                            <span>{lead.receiverContact}</span>
                            <span>{formatDate(lead.sentDate)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="kpi-body-empty">No leads sent yet by this business.</p>
                  )}
                </div>
              )}

            </div>
          );
        })}
        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="kpi-pagination">
            <span className="kpi-pagination-info">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="kpi-pagination-controls">
              <button
                className="kpi-page-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >‹</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`kpi-page-btn${n === page ? " kpi-page-btn--active" : ""}`}
                  onClick={() => { setPage(n); setExpandedId(null); }}
                >{n}</button>
              ))}

              <button
                className="kpi-page-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >›</button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
