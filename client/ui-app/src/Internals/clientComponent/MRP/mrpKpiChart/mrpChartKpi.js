import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getLeadReport } from "../../../../redux/actions/mrpAction.js";

export default function MRPChartKPI({ group = "A", category = "" }) {

  const dispatch = useDispatch();

  const {
    leadReport,
    leadReportLoading,
    leadReportError
  } = useSelector(state => state.mrp || {});

  // ✅ API CALL VIA REDUX
  useEffect(() => {
    dispatch(getLeadReport({ group, category }));
  }, [dispatch, group, category]);

  // ✅ SAFE VALUE FUNCTION (PREVENT OBJECT CRASH)
  const safeValue = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      return val?.name || val?.label || JSON.stringify(val);
    }
    return val;
  };

  // ✅ LOADING
  if (leadReportLoading) {
    return (
      <div className="mrp-chart-kpi-loading">
        <p>Loading lead report...</p>
      </div>
    );
  }

  // ✅ ERROR
  if (leadReportError) {
    return (
      <div className="mrp-chart-kpi-error">
        <p>
          Error: {typeof leadReportError === "string"
            ? leadReportError
            : leadReportError?.message || JSON.stringify(leadReportError)}
        </p>
      </div>
    );
  }

  // ✅ EMPTY DATA
  if (!leadReport || !Array.isArray(leadReport.data) || !leadReport.data.length) {
    return (
      <div className="mrp-chart-kpi-empty">
        <p>No lead report data found for this location/group.</p>
      </div>
    );
  }

  // ✅ CALCULATIONS
  const totalSenders = leadReport.totalSenders || leadReport.data.length;

  const totalLeads = leadReport.data.reduce(
    (sum, sender) => sum + (Number(sender?.totalSentLeads) || 0),
    0
  );

  const uniqueCategories = new Set(
    leadReport.data.map(item => item.senderCategory).filter(Boolean)
  );

  // ✅ UI
  return (
    <div className="mrp-chart-kpi report-summary">

      <div className="report-summary-card">
        <span>Total Senders</span>
        <strong>{safeValue(totalSenders)}</strong>
      </div>

      <div className="report-summary-card">
        <span>Total Leads Sent</span>
        <strong>{safeValue(totalLeads)}</strong>
      </div>

      <div className="report-summary-card">
        <span>Sender Categories</span>
        <strong>{safeValue(uniqueCategories.size)}</strong>
      </div>

      <div className="report-summary-card report-summary-group">
        <span>Group</span>
        <strong>{safeValue(leadReport.group || group)}</strong>
      </div>

      <div className="report-summary-card report-summary-location">
        <span>Location</span>
        <strong>{safeValue(leadReport.location)}</strong>
      </div>

      <div className="report-summary-card report-summary-category">
        <span>Category Filter</span>
        <strong>{safeValue(leadReport.category) || "All"}</strong>
      </div>

      {/* ✅ LIST */}
      <div className="lead-report-list">
        {leadReport.data.slice(0, 6).map((sender) => (
          <div key={sender.senderBusinessId} className="lead-report-card">
            
            <div className="lead-report-card-header">
              <strong>{safeValue(sender.senderBusinessName)}</strong>
              <span>{safeValue(sender.senderLocation)}</span>
            </div>

            <div className="lead-report-card-body">
              <p>Category: {safeValue(sender.senderCategory) || "N/A"}</p>
              <p>Leads Sent: {safeValue(sender.totalSentLeads)}</p>
              <p>Group: {safeValue(sender.group)}</p>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}