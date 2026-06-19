import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getLeadReport } from "../../../../redux/actions/mrpAction.js";
import styles from "./mrpChartKpi.module.css";
const cx = createScopedClassNames(styles);
export default function MRPChartKPI({
  group,
  category = ""
}) {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const {
    leadReport,
    leadReportLoading,
    leadReportError
  } = useSelector(state => state.mrp || {});
  useEffect(() => {
    if (!group) return;

    dispatch(
      getLeadReport({
        group,
        category
      })
    );
  }, [dispatch, group, category]);
  const safeValue = val => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return val?.name || val?.label || JSON.stringify(val);
    return val;
  };
  if (leadReportLoading) {
    return <div className={cx("mrp-chart-kpi-loading")}>
      <div className={cx("kpi-state-spinner")}></div>
      <p>Loading lead report...</p>
    </div>;
  }
  if (leadReportError) {
    return <div className={cx("mrp-chart-kpi-error")}>
      <div className={cx("kpi-state-icon")}>⚠️</div>
      <p>
        {typeof leadReportError === "string" ? leadReportError : leadReportError?.message || "Failed to load lead report"}
      </p>
    </div>;
  }
  if (!leadReport || !Array.isArray(leadReport.data) || !leadReport.data.length) {
    return <div className={cx("mrp-chart-kpi-empty")}>
      <div className={cx("kpi-state-icon")}>📊</div>
      <p>No lead report data yet</p>
      <span>Data will appear once requirements are published in your group.</span>
    </div>;
  }
  const totalLeads = leadReport.data.reduce((sum, s) => sum + (Number(s?.totalSentLeads) || 0), 0);
  const uniqueCategories = new Set(leadReport.data.map(s => s.senderCategory).filter(Boolean));
  const filtered = leadReport.data.filter(s => !search.trim() || s.senderBusinessName?.toLowerCase().includes(search.toLowerCase()) || s.senderCategory?.toLowerCase().includes(search.toLowerCase()) || s.senderLocation?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleSearch = val => {
    setSearch(val);
    setPage(1);
    setExpandedId(null);
  };
  const toggle = id => setExpandedId(prev => prev === id ? null : id);
  const formatDate = d => new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return <div className={cx("kpi-root")}>

    {/* ── Summary strip ── */}
    <div className={cx("kpi-summary")}>
      <div className={cx("kpi-summary-card")}>
        <span>Total Senders</span>
        <strong>{safeValue(leadReport.totalSenders || leadReport.data.length)}</strong>
      </div>
      <div className={cx("kpi-summary-card")}>
        <span>Total Leads</span>
        <strong>{totalLeads}</strong>
      </div>
      <div className={cx("kpi-summary-card")}>
        <span>Categories</span>
        <strong>{uniqueCategories.size}</strong>
      </div>
      <div className={cx("kpi-summary-card kpi-summary-meta")}>
        <span>Group</span>
        <strong>{safeValue(group)}</strong>
      </div>
      <div className={cx("kpi-summary-card kpi-summary-meta")}>
        <span>Location</span>
        <strong>{safeValue(leadReport.location)}</strong>
      </div>
    </div>

    {/* ── Search ── */}
    <div className={cx("kpi-search-bar")}>
      <span className={cx("kpi-search-icon")}>🔍</span>
      <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder={`Search ${leadReport.data.length} businesses…`} />
      {search && <button className={cx("kpi-search-clear")} onClick={() => handleSearch("")}>✕</button>}
    </div>

    {/* ── Accordion list ── */}
    <div className={cx("kpi-accordion")}>

      {/* Header row */}
      <div className={cx("kpi-accordion-header-row")}>
        <span className={cx("kpi-col kpi-col-name")}>Business</span>
        <span className={cx("kpi-col kpi-col-cat")}>Category</span>
        <span className={cx("kpi-col kpi-col-loc")}>Location</span>
        <span className={cx("kpi-col kpi-col-leads")}>Leads</span>
        <span className={cx("kpi-col kpi-col-toggle")}></span>
      </div>

      {filtered.length === 0 && <div className={cx("kpi-no-results")}>No businesses match "{search}"</div>}

      {paginated.map(sender => {
        const isOpen = expandedId === sender.senderBusinessId;
        const hasLeads = sender.sentLeads?.length > 0;
        return <div key={sender.senderBusinessId} className={cx(`kpi-accordion-item${isOpen ? " kpi-accordion-item--open" : ""}`)}>

          {/* Collapsed row */}
          <button className={cx("kpi-accordion-row")} onClick={() => toggle(sender.senderBusinessId)} aria-expanded={isOpen}>
            <span className={cx("kpi-col kpi-col-name")}>
              <span className={cx("kpi-biz-avatar")}>
                {sender.senderBusinessName?.[0]?.toUpperCase() || "?"}
              </span>
              <span className={cx("kpi-biz-name")}>{safeValue(sender.senderBusinessName)}</span>
            </span>
            <span className={cx("kpi-col kpi-col-cat")}>
              <span className={cx("kpi-cat-badge")}>{safeValue(sender.senderCategory) || "—"}</span>
            </span>
            <span className={cx("kpi-col kpi-col-loc")}>{safeValue(sender.senderLocation)}</span>
            <span className={cx("kpi-col kpi-col-leads")}>
              <span className={cx(`kpi-leads-chip${hasLeads ? " kpi-leads-chip--active" : ""}`)}>
                {sender.totalSentLeads}
              </span>
            </span>
            <span className={cx("kpi-col kpi-col-toggle")}>
              <span className={cx(`kpi-chevron${isOpen ? " kpi-chevron--open" : ""}`)}>›</span>
            </span>
          </button>

          {/* Expanded: sent leads detail */}
          {isOpen && <div className={cx("kpi-accordion-body")}>
            {hasLeads ? <>
              <p className={cx("kpi-body-label")}>Sent Leads ({sender.sentLeads.length})</p>
              <div className={cx("kpi-leads-table")}>
                <div className={cx("kpi-leads-table-head")}>
                  <span>Receiver</span>
                  <span>Category</span>
                  <span>Location</span>
                  <span>Contact</span>
                  <span>Date</span>
                </div>
                {sender.sentLeads.map((lead, i) => <div key={i} className={cx("kpi-leads-table-row")}>
                  <span className={cx("kpi-lead-receiver")}>{lead.receiverBusinessName}</span>
                  <span>
                    <span className={cx("kpi-cat-badge kpi-cat-badge--sm")}>{lead.leadCategory}</span>
                  </span>
                  <span>{lead.receiverLocation}</span>
                  <span>{lead.receiverContact}</span>
                  <span>{formatDate(lead.sentDate)}</span>
                </div>)}
              </div>
            </> : <p className={cx("kpi-body-empty")}>No leads sent yet by this business.</p>}
          </div>}

        </div>;
      })}
      {/* Pagination footer */}
      {totalPages > 1 && <div className={cx("kpi-pagination")}>
        <span className={cx("kpi-pagination-info")}>
          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className={cx("kpi-pagination-controls")}>
          <button className={cx("kpi-page-btn")} onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>

          {Array.from({
            length: totalPages
          }, (_, i) => i + 1).map(n => <button key={n} className={cx(`kpi-page-btn${n === page ? " kpi-page-btn--active" : ""}`)} onClick={() => {
            setPage(n);
            setExpandedId(null);
          }}>{n}</button>)}

          <button className={cx("kpi-page-btn")} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
        </div>
      </div>}

    </div>

  </div>;
}
