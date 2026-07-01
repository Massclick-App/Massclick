import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  exportMsg91AnalyticsCsv,
  fetchMsg91FilterOptions,
  fetchMsg91Audit,
  fetchMsg91Dashboard,
  fetchMsg91Recipients,
  reviewMsg91Recipient,
  searchMsg91Businesses,
  unsuppressMsg91Recipient,
} from "../../redux/actions/msg91AnalyticsAction.js";
import styles from "./Msg91Analytics.module.css";

const today = new Date();
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const toDateInput = (date) => date.toISOString().slice(0, 10);

const initialFilters = {
  reportType: "business_search_leads",
  from: toDateInput(thirtyDaysAgo),
  to: toDateInput(today),
  template: "",
  status: "",
  sourceType: "",
  failureReason: "",
  businessId: "",
  mniGroup: "",
  category: "",
  location: "",
  recipientMobile: "",
  customerMobile: "",
};

const statusOptions = ["queued", "sent", "delivered", "read", "failed", "hold", "skipped"];
const reportTypeOptions = [
  { value: "business_search_leads", label: "BusinessSearchLeads" },
  { value: "mni_leads", label: "MNI Leads" },
];

const businessLabel = (business = {}) => [
  business.businessName || business.name || "Unnamed business",
  business.location,
  business.category,
  business.clientId,
].filter(Boolean).join(" - ");

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");
const formatMoney = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusClass = (status) => {
  if (["sent", "delivered", "read"].includes(status)) return styles.success;
  if (status === "failed") return styles.failed;
  if (status === "skipped") return styles.skipped;
  if (status === "hold") return styles.hold;
  return styles.neutral;
};

function Kpi({ label, value, note, tone = "default" }) {
  return (
    <div className={`${styles.kpi} ${styles[tone] || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function TableEmpty({ text }) {
  return <div className={styles.empty}>{text}</div>;
}

export default function Msg91Analytics() {
  const dispatch = useDispatch();
  const {
    summary,
    timeseries,
    failures,
    audit,
    auditTotal,
    auditPageNo,
    auditPageSize,
    recipients,
    recipientsTotal,
    loading,
    auditLoading,
    recipientsLoading,
    error,
  } = useSelector((state) => state.msg91Analytics);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [expandedAuditId, setExpandedAuditId] = useState("");
  const [recipientFilter, setRecipientFilter] = useState({ mobile: "", suppressed: "", invalid: "" });
  const [exportLoading, setExportLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ templates: [], locations: [], categories: [], mniGroups: [] });
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOptions, setBusinessOptions] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMsg91Dashboard(appliedFilters));
    dispatch(fetchMsg91Audit({ pageNo: 1, pageSize: auditPageSize, filters: appliedFilters }));
  }, [dispatch, appliedFilters, auditPageSize]);

  useEffect(() => {
    dispatch(fetchMsg91Recipients({ pageNo: 1, pageSize: 25, filters: { mobile: "", suppressed: "", invalid: "" } }));
  }, [dispatch]);

  useEffect(() => {
    let ignore = false;
    const loadOptions = async () => {
      try {
        const options = await fetchMsg91FilterOptions({
          from: filters.from,
          to: filters.to,
          reportType: filters.reportType,
          businessId: filters.businessId,
          location: filters.location,
          category: filters.category,
        });
        if (!ignore) {
          setFilterOptions({
            templates: options.templates || [],
            locations: options.locations || [],
            categories: options.categories || [],
            mniGroups: options.mniGroups || [],
          });
        }
      } catch (optionError) {
        }
    };

    loadOptions();
    return () => {
      ignore = true;
    };
  }, [filters.from, filters.to, filters.reportType, filters.businessId, filters.location, filters.category]);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      setBusinessLoading(true);
      try {
        const businesses = await searchMsg91Businesses({ search: businessSearch, limit: 30 });
        if (!ignore) setBusinessOptions(businesses);
      } catch (businessError) {
        if (!ignore) setBusinessOptions([]);
      } finally {
        if (!ignore) setBusinessLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [businessSearch]);

  const statusCounts = summary?.statusCounts || {};
  const templates = summary?.templates || [];
  const isMniMode = filters.reportType === "mni_leads";
  const appliedIsMniMode = appliedFilters.reportType === "mni_leads";
  const maxDailyTotal = useMemo(
    () => Math.max(...(timeseries || []).map((row) => row.total || 0), 1),
    [timeseries]
  );

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setBusinessSearch("");
  };

  const changeAuditPage = (direction) => {
    const nextPage = Math.max(1, auditPageNo + direction);
    dispatch(fetchMsg91Audit({ pageNo: nextPage, pageSize: auditPageSize, filters: appliedFilters }));
  };

  const loadRecipients = () => {
    dispatch(fetchMsg91Recipients({ pageNo: 1, pageSize: 25, filters: recipientFilter }));
  };

  const exportCsv = async () => {
    setExportLoading(true);
    try {
      const response = await exportMsg91AnalyticsCsv(filters);
      const disposition = response.headers?.["content-disposition"] || "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `MassClick-Leads-Report-${Date.now()}.xlsx`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      window.alert(downloadError.response?.data?.message || "Excel export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => {
      if (key === "reportType") {
        return {
          ...initialFilters,
          reportType: value,
          from: prev.from,
          to: prev.to,
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const selectBusiness = (businessId) => {
    const business = businessOptions.find((item) => String(item._id) === String(businessId));
    setFilters((prev) => ({ ...prev, businessId }));
    if (business) setBusinessSearch(businessLabel(business));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>MSG91 Analytics</h1>
          <p>{appliedIsMniMode ? "MNI WhatsApp leads by business group, location, and category." : "Business search WhatsApp leads, failures, skips, and delivery outcomes."}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={exportCsv} disabled={exportLoading}>
            {exportLoading ? "Exporting..." : "Export Excel"}
          </button>
          <button type="button" className={styles.primary} onClick={applyFilters}>Refresh</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.kpiGrid}>
        <Kpi label="Total Attempts" value={formatNumber(summary?.total)} note="All audit rows" />
        <Kpi label="Success Rate" value={`${summary?.successRate || 0}%`} note="sent + delivered + read" tone="green" />
        <Kpi label="Failed" value={formatNumber(statusCounts.failed)} note={`${summary?.failureRate || 0}% failure rate`} tone="red" />
        <Kpi label="Skipped" value={formatNumber(statusCounts.skipped)} note="Guard prevented send" tone="amber" />
        <Kpi label="Hold" value={formatNumber(statusCounts.hold)} note="Provider or policy hold" tone="violet" />
        <Kpi label="Cost" value={`Rs ${formatMoney(summary?.cost?.totalCost)}`} note={`${formatNumber(summary?.cost?.chargedRows)} charged rows`} />
      </section>

      <section className={styles.filters}>
        <label className="form-input-label">
          Report Type
          <select
            value={filters.reportType}
            onChange={(event) => {
              setBusinessSearch("");
              updateFilter("reportType", event.target.value);
            }}
            className="form-select-input"
          >
            {reportTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="form-input-label">
          From
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="form-text-input" />
        </label>
        <label className="form-input-label">
          To
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="form-text-input" />
        </label>
        {!isMniMode && (
          <label className="form-input-label">
            Template
            <select value={filters.template} onChange={(event) => updateFilter("template", event.target.value)} className="form-select-input">
              <option value="">All templates</option>
              {filterOptions.templates.map((template) => (
                <option key={template} value={template}>{template}</option>
              ))}
            </select>
          </label>
        )}
        <label className="form-input-label">
          Status
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="form-select-input">
            <option value="">All</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        {!isMniMode && (
          <>
            <label className="form-input-label">
              Failure
              <input value={filters.failureReason} onChange={(event) => updateFilter("failureReason", event.target.value)} placeholder="131026" className="form-text-input" />
            </label>
            <label className={`${styles.wideFilter} form-input-label`}>
              Business Person
              <div className={styles.businessSearch}>
                <input
                  value={businessSearch}
                  onChange={(event) => {
                    setBusinessSearch(event.target.value);
                    updateFilter("businessId", "");
                  }}
                  placeholder="Type business name, client ID, mobile, category, or location"
                  className="form-text-input"
                />
                {filters.businessId && (
                  <button
                    type="button"
                    onClick={() => {
                      updateFilter("businessId", "");
                      setBusinessSearch("");
                    }}
                  >
                    Clear business
                  </button>
                )}
                <select value={filters.businessId} onChange={(event) => selectBusiness(event.target.value)} className="form-select-input">
                  <option value="">{businessLoading ? "Searching..." : "All matching businesses"}</option>
                  {businessOptions.map((business) => (
                    <option key={business._id} value={business._id}>
                      {businessLabel(business)}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </>
        )}
        {isMniMode && (
          <label className="form-input-label">
            Business Group
            <select value={filters.mniGroup} onChange={(event) => updateFilter("mniGroup", event.target.value)} className="form-select-input">
              <option value="">All MNI groups</option>
              {filterOptions.mniGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>
        )}
        <label className="form-input-label">
          Category
          <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="form-select-input">
            <option value="">All categories</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="form-input-label">
          Location
          <select value={filters.location} onChange={(event) => updateFilter("location", event.target.value)} className="form-select-input">
            <option value="">All locations</option>
            {filterOptions.locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
        <label className="form-input-label">
          Recipient
          <input value={filters.recipientMobile} onChange={(event) => updateFilter("recipientMobile", event.target.value)} className="form-text-input" />
        </label>
        <label className="form-input-label">
          Customer
          <input value={filters.customerMobile} onChange={(event) => updateFilter("customerMobile", event.target.value)} className="form-text-input" />
        </label>
        <div className={styles.filterButtons}>
          <button type="button" className={styles.primary} onClick={applyFilters}>Apply</button>
          <button type="button" onClick={clearFilters}>Clear</button>
        </div>
      </section>

      <section className={styles.gridTwo}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>Daily Trend</h2>
            <span>{loading ? "Loading" : `${timeseries?.length || 0} days`}</span>
          </div>
          <div className={styles.trendList}>
            {(timeseries || []).length ? timeseries.map((row) => (
              <div key={row.date} className={styles.trendRow}>
                <span>{row.date}</span>
                <div className={styles.trendBar}>
                  <i style={{ width: `${((row.success || 0) / maxDailyTotal) * 100}%` }} />
                  <b style={{ width: `${((row.failed || 0) / maxDailyTotal) * 100}%` }} />
                  <em style={{ width: `${((row.skipped || 0) / maxDailyTotal) * 100}%` }} />
                </div>
                <strong>{formatNumber(row.total)}</strong>
              </div>
            )) : <TableEmpty text="No daily trend data for this filter." />}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>Failure Reasons</h2>
            <span>Top 50</span>
          </div>
          <div className={styles.compactTable}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Reason</th>
                  <th>Template</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(failures || []).map((item) => (
                  <tr key={`${item._id?.code || "none"}-${item._id?.reason || "unknown"}-${item._id?.template || "template"}`}>
                    <td>{item._id?.code || "-"}</td>
                    <td>{item._id?.reason || "-"}</td>
                    <td>{item._id?.template || "-"}</td>
                    <td>{formatNumber(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(failures || []).length && <TableEmpty text="No failed messages in this filter." />}
          </div>
        </div>
      </section>

      <section className={styles.gridThree}>
        {appliedIsMniMode ? (
          <div className={styles.panel}>
            <div className={styles.panelTitle}><h2>Business Groups</h2></div>
            <div className={styles.rankList}>
              {(summary?.topGroups || []).map((item) => (
                <div key={item._id || "unknown"}><span>{item._id || "unknown"}</span><strong>{formatNumber(item.total)}</strong></div>
              ))}
              {!(summary?.topGroups || []).length && <TableEmpty text="No MNI group data." />}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.panel}>
              <div className={styles.panelTitle}><h2>Template Performance</h2></div>
              <div className={styles.compactTable}>
                <table>
                  <thead><tr><th>Template</th><th>Total</th><th>Success</th><th>Failed</th><th>Cost</th></tr></thead>
                  <tbody>
                    {templates.map((row) => (
                      <tr key={row._id || "unknown"}>
                        <td>{row._id || "unknown"}</td>
                        <td>{formatNumber(row.total)}</td>
                        <td>{formatNumber(row.success)}</td>
                        <td>{formatNumber(row.failed)}</td>
                        <td>Rs {formatMoney(row.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!templates.length && <TableEmpty text="No template data." />}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelTitle}><h2>Lead Source</h2></div>
              <div className={styles.rankList}>
                {(summary?.sourceTypes || []).map((item) => (
                  <div key={item._id || "unknown"}><span>{item._id || "unknown"}</span><strong>{formatNumber(item.total)}</strong></div>
                ))}
                {!(summary?.sourceTypes || []).length && <TableEmpty text="No source data." />}
              </div>
            </div>
          </>
        )}

        <div className={styles.panel}>
          <div className={styles.panelTitle}><h2>Categories</h2></div>
          <div className={styles.rankList}>
            {(summary?.topCategories || []).map((item) => (
              <div key={item._id}><span>{item._id}</span><strong>{formatNumber(item.total)}</strong></div>
            ))}
            {!(summary?.topCategories || []).length && <TableEmpty text="No category data." />}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}><h2>Locations</h2></div>
          <div className={styles.rankList}>
            {(summary?.topLocations || []).map((item) => (
              <div key={item._id}><span>{item._id}</span><strong>{formatNumber(item.total)}</strong></div>
            ))}
            {!(summary?.topLocations || []).length && <TableEmpty text="No location data." />}
          </div>
        </div>
      </section>

      <section className={styles.gridThree}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}><h2>Top Repeated Recipients</h2></div>
          <div className={styles.rankList}>
            {(summary?.topRecipients || []).map((item) => (
              <div key={item.mobile}>
                <span>{item.mobile}</span>
                <strong>{formatNumber(item.totalAttempts)}</strong>
              </div>
            ))}
            {!(summary?.topRecipients || []).length && <TableEmpty text="No repeated-recipient data." />}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}><h2>Top Failing Numbers</h2></div>
          <div className={styles.rankList}>
            {(summary?.topFailedRecipients || []).map((item) => (
              <div key={item.mobile}>
                <span>{item.mobile}</span>
                <strong>{formatNumber(item.failedCount)}</strong>
              </div>
            ))}
            {!(summary?.topFailedRecipients || []).length && <TableEmpty text="No failing-number data." />}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}><h2>Top Suppressed Numbers</h2></div>
          <div className={styles.rankList}>
            {(summary?.topSuppressedRecipients || []).map((item) => (
              <div key={item.mobile}>
                <span>{item.mobile}</span>
                <strong>{item.suppressReason || (item.whatsappInvalid ? "invalid" : "suppressed")}</strong>
              </div>
            ))}
            {!(summary?.topSuppressedRecipients || []).length && <TableEmpty text="No suppressed-number data." />}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTitle}>
          <h2>Message Audit</h2>
          <span>{auditLoading ? "Loading" : `${formatNumber(auditTotal)} rows`}</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>Created</th>
                <th>Template</th>
                <th>Source</th>
                <th>Status</th>
                <th>Recipient</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Location</th>
                <th>Place</th>
                <th>Business</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <React.Fragment key={row._id}>
                  <tr onClick={() => setExpandedAuditId(expandedAuditId === row._id ? "" : row._id)}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.templateName || "-"}</td>
                    <td>{row.sourceType || "-"}</td>
                    <td><span className={`${styles.pill} ${statusClass(row.status)}`}>{row.status}</span></td>
                    <td>{row.recipientMobile || "-"}</td>
                    <td>{row.customerMobile || "-"}</td>
                    <td>{row.category || "-"}</td>
                    <td>{row.location || "-"}</td>
                    <td>{row.place || row.businessGroupLocation || row.location || "-"}</td>
                    <td>{row.businessName || "-"}</td>
                    <td>{row.failureCode || row.failureReason || row.skippedReason || "-"}</td>
                  </tr>
                  {expandedAuditId === row._id && (
                    <tr className={styles.detailRow}>
                      <td colSpan="11">
                        <div className={styles.detailGrid}>
                          <div><strong>Request ID</strong><span>{row.requestId || row.uuid || "-"}</span></div>
                          <div><strong>Sent</strong><span>{formatDateTime(row.sentAt)}</span></div>
                          <div><strong>Delivered</strong><span>{formatDateTime(row.deliveredAt)}</span></div>
                          <div><strong>Read</strong><span>{formatDateTime(row.readAt)}</span></div>
                          <div><strong>Failed</strong><span>{formatDateTime(row.failedAt)}</span></div>
                        </div>
                        <pre>{JSON.stringify(row.rawWebhookPayload || row.providerResponse || row.payloadPreview || {}, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!audit.length && <TableEmpty text="No audit rows for this filter." />}
        </div>
        <div className={styles.pagination}>
          <button type="button" disabled={auditPageNo <= 1} onClick={() => changeAuditPage(-1)}>Previous</button>
          <span>Page {auditPageNo} of {Math.max(1, Math.ceil(auditTotal / auditPageSize))}</span>
          <button type="button" disabled={auditPageNo >= Math.ceil(auditTotal / auditPageSize)} onClick={() => changeAuditPage(1)}>Next</button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTitle}>
          <h2>Recipient Health</h2>
          <span>{recipientsLoading ? "Loading" : `${formatNumber(recipientsTotal)} rows`}</span>
        </div>
        <div className={styles.recipientFilters}>
          <input placeholder="Mobile" value={recipientFilter.mobile} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, mobile: event.target.value }))} className="form-text-input" />
          <select value={recipientFilter.suppressed} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, suppressed: event.target.value }))} className="form-select-input">
            <option value="">Suppressed: all</option>
            <option value="true">Suppressed only</option>
          </select>
          <select value={recipientFilter.invalid} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, invalid: event.target.value }))} className="form-select-input">
            <option value="">Invalid: all</option>
            <option value="true">Invalid only</option>
          </select>
          <button type="button" onClick={loadRecipients}>Load</button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>Mobile</th>
                <th>Attempts</th>
                <th>Failed</th>
                <th>131026</th>
                <th>131049</th>
                <th>Suppressed Until</th>
                <th>Last Failure</th>
                <th>Reviewed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((row) => (
                <tr key={row.mobile}>
                  <td>{row.mobile}</td>
                  <td>{formatNumber(row.totalAttempts)}</td>
                  <td>{formatNumber(row.failedCount)}</td>
                  <td>{formatNumber(row.undeliverableCount)}</td>
                  <td>{formatNumber(row.ecosystemFailureCount)}</td>
                  <td>{formatDateTime(row.suppressedUntil)}</td>
                  <td>{row.lastFailureReason || "-"}</td>
                  <td>{row.reviewed ? "Yes" : "No"}</td>
                  <td className={styles.rowActions}>
                    <button type="button" onClick={() => dispatch(reviewMsg91Recipient(row.mobile))}>Review</button>
                    <button type="button" onClick={() => dispatch(unsuppressMsg91Recipient(row.mobile))}>Unsuppress</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recipients.length && <TableEmpty text="No recipient-health rows." />}
        </div>
      </section>
    </div>
  );
}
