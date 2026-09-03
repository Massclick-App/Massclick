import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Users,
  X,
} from "lucide-react";
import {
  exportMsg91AnalyticsCsv,
  fetchMsg91FilterOptions,
  fetchMsg91Audit,
  fetchMsg91Dashboard,
  fetchMsg91Recipients,
  reviewMsg91Recipient,
  searchMsg91Businesses,
  setMsg91RecipientBlock,
  setMsg91RecipientInvalid,
  unsuppressMsg91Recipient,
} from "state/actions/msg91AnalyticsAction.js";
import styles from "features/admin/msg91-analytics/Msg91Analytics.module.css";

const today = new Date();
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const toDateInput = (date) => date.toISOString().slice(0, 10);
const cx = (...classes) => classes.filter(Boolean).join(" ");

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

const initialRecipientFilter = {
  mobile: "",
  suppressed: "",
  invalid: "",
  blocked: "",
  reviewed: "",
};

const statusOptions = ["queued", "sent", "delivered", "read", "failed", "hold", "skipped"];
const sourceTypeOptions = ["search_lead", "customer_list", "mni", "enquiry", "welcome", "manual", "unknown"];
const pageSizeOptions = [25, 50, 100];
const reportTypeOptions = [
  { value: "business_search_leads", label: "Business Search" },
  { value: "mni_leads", label: "MNI Leads" },
  { value: "", label: "All Sources" },
];
const triStateOptions = [
  { value: "", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];
const workspaces = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "audit", label: "Audit", icon: FileText },
  { id: "recipients", label: "Recipients", icon: ShieldAlert },
];
const recipientPresets = [
  { id: "all", label: "All", filters: initialRecipientFilter },
  { id: "queue", label: "Review queue", filters: { ...initialRecipientFilter, reviewed: "false" } },
  { id: "invalid", label: "Invalid", filters: { ...initialRecipientFilter, invalid: "true" } },
  { id: "blocked", label: "Blocked", filters: { ...initialRecipientFilter, blocked: "true" } },
  { id: "suppressed", label: "Suppressed", filters: { ...initialRecipientFilter, suppressed: "true" } },
  {
    id: "clean",
    label: "Clean",
    filters: { ...initialRecipientFilter, suppressed: "false", invalid: "false", blocked: "false" },
  },
];
const recipientCommandConfig = {
  block: {
    title: "Block recipient",
    detail: "This prevents WhatsApp sends to the number and sends triggered by this number as the searching customer.",
    confirmLabel: "Block number",
    defaultReason: "blocked_by_admin",
    reasonLabel: "Block reason",
    danger: true,
    needsReason: true,
  },
  unblock: {
    title: "Unblock recipient",
    detail: "This clears only the explicit admin block. Automatic invalid or suppression flags remain separate.",
    confirmLabel: "Unblock",
  },
  markInvalid: {
    title: "Mark invalid",
    detail: "This marks the WhatsApp number invalid so the recipient health guard skips it.",
    confirmLabel: "Mark invalid",
    defaultReason: "manual_invalid_by_admin",
    reasonLabel: "Invalid reason",
    danger: true,
    needsReason: true,
  },
  clearInvalid: {
    title: "Clear invalid flag",
    detail: "This clears the invalid and temporary suppression flags without changing the admin block state.",
    confirmLabel: "Clear invalid",
  },
  review: {
    title: "Mark reviewed",
    detail: "This records the row as reviewed by the current admin.",
    confirmLabel: "Mark reviewed",
  },
  unsuppress: {
    title: "Unsuppress recipient",
    detail: "This clears suppression, invalid, and explicit block flags for the selected number.",
    confirmLabel: "Unsuppress",
  },
};

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

const isRecipientSuppressed = (row = {}) => Boolean(
  row.suppressedUntil && new Date(row.suppressedUntil) > new Date()
);

const statusClass = (status) => {
  if (["sent", "delivered", "read"].includes(status)) return styles.success;
  if (status === "failed") return styles.failed;
  if (status === "skipped") return styles.skipped;
  if (status === "hold") return styles.hold;
  return styles.neutral;
};

const recipientTone = (row = {}) => {
  if (row.adminBlocked) return "blocked";
  if (row.whatsappInvalid) return "invalid";
  if (isRecipientSuppressed(row)) return "suppressed";
  if (!row.reviewed && Number(row.failedCount || 0) > 0) return "review";
  if (row.reviewed) return "reviewed";
  return "healthy";
};

const recipientToneLabel = (row = {}) => {
  const tone = recipientTone(row);
  return {
    blocked: "Blocked",
    invalid: "Invalid",
    suppressed: "Suppressed",
    review: "Needs review",
    reviewed: "Reviewed",
    healthy: "Healthy",
  }[tone];
};

function MetricCard({ label, value, note, tone = "default", icon: Icon }) {
  return (
    <div className={cx(styles.metricCard, styles[tone])}>
      <div className={styles.metricTopline}>
        {Icon && <Icon size={17} aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, meta, children }) {
  return (
    <div className={styles.panelTitle}>
      <div className={styles.panelHeading}>
        {Icon && <Icon size={17} aria-hidden="true" />}
        <h3>{title}</h3>
      </div>
      <div className={styles.panelMeta}>
        {meta && <span>{meta}</span>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={cx(styles.field, wide && styles.fieldWide)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }) {
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
    recipientsPageNo,
    recipientsPageSize,
    loading,
    auditLoading,
    recipientsLoading,
    error,
  } = useSelector((state) => state.msg91Analytics);

  const [activeWorkspace, setActiveWorkspace] = useState("overview");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [expandedAuditId, setExpandedAuditId] = useState("");
  const [recipientFilter, setRecipientFilter] = useState(initialRecipientFilter);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ templates: [], locations: [], categories: [], mniGroups: [] });
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOptions, setBusinessOptions] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [selectedRecipientMobile, setSelectedRecipientMobile] = useState("");
  const [manualMobile, setManualMobile] = useState("");
  const [recipientCommand, setRecipientCommand] = useState(null);
  const [commandLoading, setCommandLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMsg91Dashboard(appliedFilters));
    dispatch(fetchMsg91Audit({ pageNo: 1, pageSize: auditPageSize, filters: appliedFilters }));
  }, [dispatch, appliedFilters, auditPageSize]);

  useEffect(() => {
    dispatch(fetchMsg91Recipients({ pageNo: 1, pageSize: 25, filters: initialRecipientFilter }));
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
      } catch {
        // Filter options are opportunistic; the main dashboard fetch still carries the page.
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
      } catch {
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

  useEffect(() => {
    if (!recipients.length) {
      setSelectedRecipientMobile("");
      return;
    }

    if (!selectedRecipientMobile || !recipients.some((row) => row.mobile === selectedRecipientMobile)) {
      setSelectedRecipientMobile(recipients[0].mobile);
    }
  }, [recipients, selectedRecipientMobile]);

  const statusCounts = summary?.statusCounts || {};
  const templates = summary?.templates || [];
  const isMniMode = filters.reportType === "mni_leads";
  const isAppliedMniMode = appliedFilters.reportType === "mni_leads";
  const maxDailyTotal = useMemo(
    () => Math.max(...(timeseries || []).map((row) => row.total || 0), 1),
    [timeseries]
  );
  const selectedRecipient = useMemo(
    () => recipients.find((row) => row.mobile === selectedRecipientMobile) || null,
    [recipients, selectedRecipientMobile]
  );
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => value !== "" && value !== initialFilters[key]).length,
    [filters]
  );
  const activeRecipientPreset = useMemo(
    () => recipientPresets.find((preset) =>
      Object.keys(initialRecipientFilter).every((key) => recipientFilter[key] === preset.filters[key])
    )?.id || "",
    [recipientFilter]
  );
  const recipientPageStats = useMemo(() => ({
    blocked: recipients.filter((row) => row.adminBlocked).length,
    invalid: recipients.filter((row) => row.whatsappInvalid).length,
    suppressed: recipients.filter(isRecipientSuppressed).length,
    review: recipients.filter((row) => !row.reviewed && Number(row.failedCount || 0) > 0).length,
  }), [recipients]);
  const appliedModeCopy = isAppliedMniMode
    ? "MNI WhatsApp leads by group, place, category, and delivery state."
    : appliedFilters.reportType
      ? "Business-search WhatsApp leads, failures, skips, delivery outcomes, and spend."
      : "All MSG91 WhatsApp traffic across source types and delivery states.";

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setBusinessSearch("");
  };

  const changeAuditPage = (direction) => {
    const totalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
    const nextPage = Math.min(totalPages, Math.max(1, auditPageNo + direction));
    dispatch(fetchMsg91Audit({ pageNo: nextPage, pageSize: auditPageSize, filters: appliedFilters }));
  };

  const loadRecipients = (pageNo = 1, pageSize = recipientsPageSize || 25, nextFilters = recipientFilter) => {
    dispatch(fetchMsg91Recipients({ pageNo, pageSize, filters: nextFilters }));
  };

  const changeRecipientPage = (direction) => {
    const totalPages = Math.max(1, Math.ceil(recipientsTotal / (recipientsPageSize || 25)));
    const nextPage = Math.min(totalPages, Math.max(1, recipientsPageNo + direction));
    loadRecipients(nextPage, recipientsPageSize || 25);
  };

  const applyRecipientPreset = (preset) => {
    setRecipientFilter(preset.filters);
    loadRecipients(1, recipientsPageSize || 25, preset.filters);
  };

  const exportCsv = async () => {
    setExportLoading(true);
    try {
      const response = await exportMsg91AnalyticsCsv(appliedFilters);
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

  const openRecipientCommand = (type, mobile) => {
    if (!mobile) return;
    const config = recipientCommandConfig[type];
    setRecipientCommand({
      type,
      mobile,
      reason: config?.defaultReason || "",
    });
  };

  const runRecipientCommand = async () => {
    if (!recipientCommand) return;

    const config = recipientCommandConfig[recipientCommand.type];
    const reason = recipientCommand.reason?.trim() || config?.defaultReason || "";
    setCommandLoading(true);
    try {
      if (recipientCommand.type === "block") {
        await dispatch(setMsg91RecipientBlock(recipientCommand.mobile, true, reason));
      } else if (recipientCommand.type === "unblock") {
        await dispatch(setMsg91RecipientBlock(recipientCommand.mobile, false));
      } else if (recipientCommand.type === "markInvalid") {
        await dispatch(setMsg91RecipientInvalid(recipientCommand.mobile, true, reason));
      } else if (recipientCommand.type === "clearInvalid") {
        await dispatch(setMsg91RecipientInvalid(recipientCommand.mobile, false, "manual_invalid_cleared_by_admin"));
      } else if (recipientCommand.type === "review") {
        await dispatch(reviewMsg91Recipient(recipientCommand.mobile));
      } else if (recipientCommand.type === "unsuppress") {
        await dispatch(unsuppressMsg91Recipient(recipientCommand.mobile));
      }

      setRecipientCommand(null);
      loadRecipients(recipientsPageNo || 1, recipientsPageSize || 25);
    } catch (commandError) {
      window.alert(commandError.response?.data?.message || commandError.message || "Recipient update failed.");
    } finally {
      setCommandLoading(false);
    }
  };

  const renderFilterRail = () => (
    <section className={styles.filterBar}>
      <button
        type="button"
        className={styles.railHeader}
        onClick={() => setFiltersExpanded((prev) => !prev)}
        aria-expanded={filtersExpanded}
      >
        <div>
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>Report Filters</span>
        </div>
        <div className={styles.railHeaderMeta}>
          <small>{activeFilterCount} active</small>
          {filtersExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </div>
      </button>

      {filtersExpanded && (
      <div className={styles.filterRow}>
        <div className={styles.fieldGroup}>
          <span className={styles.groupTitle}>Report Mode</span>
          <div className={styles.segmented}>
            {reportTypeOptions.map((type) => (
              <button
                key={type.label}
                type="button"
                className={cx(filters.reportType === type.value && styles.segmentActive)}
                onClick={() => {
                  setBusinessSearch("");
                  updateFilter("reportType", type.value);
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.groupTitle}>Date Range</span>
          <div className={styles.fieldRow}>
            <Field label="From">
              <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
            </Field>
            <Field label="To">
              <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </Field>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.groupTitle}>Delivery</span>
          <div className={styles.fieldRow}>
            <Field label="Status">
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select
                value={filters.sourceType}
                disabled={Boolean(filters.reportType)}
                onChange={(event) => updateFilter("sourceType", event.target.value)}
              >
                <option value="">All sources</option>
                {sourceTypeOptions.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceType}</option>)}
              </select>
            </Field>
            {!isMniMode && (
              <Field label="Template">
                <select value={filters.template} onChange={(event) => updateFilter("template", event.target.value)}>
                  <option value="">All templates</option>
                  {filterOptions.templates.map((template) => (
                    <option key={template} value={template}>{template}</option>
                  ))}
                </select>
              </Field>
            )}
            {!isMniMode && (
              <Field label="Failure">
                <input
                  value={filters.failureReason}
                  onChange={(event) => updateFilter("failureReason", event.target.value)}
                  placeholder="Code or reason"
                />
              </Field>
            )}
          </div>
        </div>

        <div className={cx(styles.fieldGroup, styles.fieldGroupWide)}>
          <span className={styles.groupTitle}>Business Context</span>
          <div className={styles.fieldRow}>
            {!isMniMode && (
              <Field label="Business Person" wide>
                <div className={styles.businessSearch}>
                  <div className={styles.searchInput}>
                    <Search size={15} aria-hidden="true" />
                    <input
                      value={businessSearch}
                      onChange={(event) => {
                        setBusinessSearch(event.target.value);
                        updateFilter("businessId", "");
                      }}
                      placeholder="Name, client ID, mobile"
                    />
                  </div>
                  <select value={filters.businessId} onChange={(event) => selectBusiness(event.target.value)}>
                    <option value="">{businessLoading ? "Searching..." : "All matching businesses"}</option>
                    {businessOptions.map((business) => (
                      <option key={business._id} value={business._id}>
                        {businessLabel(business)}
                      </option>
                    ))}
                  </select>
                  {filters.businessId && (
                    <button
                      type="button"
                      className={styles.clearInline}
                      onClick={() => {
                        updateFilter("businessId", "");
                        setBusinessSearch("");
                      }}
                    >
                      <X size={14} aria-hidden="true" />
                      Clear
                    </button>
                  )}
                </div>
              </Field>
            )}
            {isMniMode && (
              <Field label="Business Group">
                <select value={filters.mniGroup} onChange={(event) => updateFilter("mniGroup", event.target.value)}>
                  <option value="">All MNI groups</option>
                  {filterOptions.mniGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Category">
              <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
                <option value="">All categories</option>
                {filterOptions.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select value={filters.location} onChange={(event) => updateFilter("location", event.target.value)}>
                <option value="">All locations</option>
                {filterOptions.locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.groupTitle}>Mobiles</span>
          <div className={styles.fieldRow}>
            <Field label="Recipient">
              <input value={filters.recipientMobile} onChange={(event) => updateFilter("recipientMobile", event.target.value)} placeholder="Recipient mobile" />
            </Field>
            <Field label="Customer">
              <input value={filters.customerMobile} onChange={(event) => updateFilter("customerMobile", event.target.value)} placeholder="Customer mobile" />
            </Field>
          </div>
        </div>

        <div className={styles.railActions}>
          <button type="button" className={styles.primaryButton} onClick={applyFilters}>
            <Filter size={15} aria-hidden="true" />
            Apply
          </button>
          <button type="button" className={styles.secondaryButton} onClick={clearFilters}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
      )}
    </section>
  );

  const renderRankList = (rows, totalKey = "total", emptyText = "No data for this filter.", className) => (
    <div className={cx(styles.rankList, className)}>
      {(rows || []).map((item, index) => (
        <div key={`${item._id || item.mobile || "row"}-${index}`} className={styles.rankRow}>
          <span>{item._id || item.mobile || "unknown"}</span>
          <strong>{formatNumber(item[totalKey])}</strong>
        </div>
      ))}
      {!(rows || []).length && <EmptyState text={emptyText} />}
    </div>
  );

  const renderOverview = () => (
    <div className={styles.workspaceStack}>
      <div className={styles.workspaceHeader}>
        <div>
          <span>Overview</span>
          <h2>Delivery performance</h2>
        </div>
        <small>{loading ? "Loading dashboard" : `${formatNumber(summary?.total)} attempts in view`}</small>
      </div>

      <section className={styles.metricGrid}>
        <MetricCard icon={Activity} label="Total Attempts" value={formatNumber(summary?.total)} note="All audit rows" />
        <MetricCard icon={ShieldCheck} label="Success Rate" value={`${summary?.successRate || 0}%`} note="sent + delivered + read" tone="green" />
        <MetricCard icon={AlertTriangle} label="Failed" value={formatNumber(statusCounts.failed)} note={`${summary?.failureRate || 0}% failure rate`} tone="red" />
        <MetricCard icon={Ban} label="Skipped" value={formatNumber(statusCounts.skipped)} note="Guard prevented send" tone="amber" />
        <MetricCard icon={ShieldAlert} label="Hold" value={formatNumber(statusCounts.hold)} note="Provider or policy hold" tone="violet" />
        <MetricCard icon={Download} label="Cost" value={`Rs ${formatMoney(summary?.cost?.totalCost)}`} note={`${formatNumber(summary?.cost?.chargedRows)} charged rows`} />
      </section>

      <section className={styles.overviewGrid}>
        <div className={cx(styles.panel, styles.trendPanel)}>
          <PanelTitle icon={BarChart3} title="Daily Trend" meta={`${timeseries?.length || 0} days`} />
          <div className={styles.trendList}>
            {(timeseries || []).length ? timeseries.map((row) => (
              <div key={row.date} className={styles.trendRow}>
                <span>{row.date}</span>
                <div className={styles.trendBar} aria-label={`${row.total || 0} attempts`}>
                  <i style={{ width: `${((row.success || 0) / maxDailyTotal) * 100}%` }} />
                  <b style={{ width: `${((row.failed || 0) / maxDailyTotal) * 100}%` }} />
                  <em style={{ width: `${((row.skipped || 0) / maxDailyTotal) * 100}%` }} />
                </div>
                <strong>{formatNumber(row.total)}</strong>
              </div>
            )) : <EmptyState text="No daily trend data for this filter." />}
          </div>
        </div>

        <div className={styles.panel}>
          <PanelTitle icon={AlertTriangle} title="Failure Reasons" meta="Top 50" />
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
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
            {!(failures || []).length && <EmptyState text="No failed messages in this filter." />}
          </div>
        </div>
      </section>

      <section className={styles.insightGrid}>
        {isAppliedMniMode ? (
          <div className={cx(styles.panel, styles.thirdPanel)}>
            <PanelTitle icon={Building2} title="Business Groups" />
            {renderRankList(summary?.topGroups)}
          </div>
        ) : (
          <div className={cx(styles.panel, styles.templatePanel)}>
            <PanelTitle icon={FileText} title="Template Performance" />
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Total</th>
                    <th>Success</th>
                    <th>Failed</th>
                    <th>Cost</th>
                  </tr>
                </thead>
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
              {!templates.length && <EmptyState text="No template data." />}
            </div>
          </div>
        )}

        {!isAppliedMniMode && (
          <div className={cx(styles.panel, styles.thirdPanel)}>
            <PanelTitle icon={Activity} title="Lead Source" />
            {renderRankList(summary?.sourceTypes)}
          </div>
        )}

        <div className={cx(styles.panel, isAppliedMniMode ? styles.thirdPanel : styles.halfPanel)}>
          <PanelTitle icon={Tags} title="Categories" />
          {renderRankList(summary?.topCategories)}
        </div>

        <div className={cx(styles.panel, isAppliedMniMode ? styles.thirdPanel : styles.halfPanel)}>
          <PanelTitle icon={MapPin} title="Locations" />
          {renderRankList(summary?.topLocations)}
        </div>

        <div className={cx(styles.panel, styles.fullPanel)}>
          <PanelTitle icon={Users} title="Recipient Risk" />
          <div className={styles.riskColumns}>
            <div className={styles.riskColumn}>
              <h4>Repeated</h4>
              {renderRankList(
                summary?.topRecipients,
                "totalAttempts",
                "No repeated-recipient data.",
                styles.riskList
              )}
            </div>
            <div className={styles.riskColumn}>
              <h4>Failing</h4>
              {renderRankList(
                summary?.topFailedRecipients,
                "failedCount",
                "No failing-number data.",
                styles.riskList
              )}
            </div>
            <div className={styles.riskColumn}>
              <h4>Suppressed</h4>
              <div className={cx(styles.rankList, styles.riskList)}>
                {(summary?.topSuppressedRecipients || []).map((item) => (
                  <div key={item.mobile} className={styles.suppressedRow}>
                    <span>{item.mobile}</span>
                    <small>{item.suppressReason || (item.whatsappInvalid ? "invalid" : "suppressed")}</small>
                  </div>
                ))}
                {!(summary?.topSuppressedRecipients || []).length && <EmptyState text="No suppressed-number data." />}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderAudit = () => (
    <div className={styles.workspaceStack}>
      <div className={styles.workspaceHeader}>
        <div>
          <span>Investigation</span>
          <h2>Message audit</h2>
        </div>
        <small>{auditLoading ? "Loading rows" : `${formatNumber(auditTotal)} rows`}</small>
      </div>

      <section className={styles.panel}>
        <PanelTitle icon={FileText} title="Audit Rows" meta={`Page ${auditPageNo} of ${Math.max(1, Math.ceil(auditTotal / auditPageSize))}`} />
        <div className={cx(styles.tableWrap, styles.compactTableWrap)}>
          <table className={cx(styles.dataTable, styles.auditTable, styles.compactTable)}>
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
                  <tr className={styles.clickableRow} onClick={() => setExpandedAuditId(expandedAuditId === row._id ? "" : row._id)}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.templateName || "-"}</td>
                    <td>{row.sourceType || "-"}</td>
                    <td><span className={cx(styles.pill, statusClass(row.status))}>{row.status}</span></td>
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
                        <pre className={styles.payloadBlock}>{JSON.stringify(row.rawWebhookPayload || row.providerResponse || row.payloadPreview || {}, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!audit.length && <EmptyState text="No audit rows for this filter." />}
        </div>
        <div className={styles.pagination}>
          <button type="button" disabled={auditPageNo <= 1} onClick={() => changeAuditPage(-1)}>Previous</button>
          <span>Page {auditPageNo} of {Math.max(1, Math.ceil(auditTotal / auditPageSize))}</span>
          <button type="button" disabled={auditPageNo >= Math.ceil(auditTotal / auditPageSize)} onClick={() => changeAuditPage(1)}>Next</button>
        </div>
      </section>
    </div>
  );

  const renderRecipientActions = (row, compact = false, iconOnly = false) => (
    <div className={cx(styles.rowActions, compact && styles.rowActionsCompact, iconOnly && styles.rowActionsIconOnly)}>
      <button type="button" title="Review" aria-label="Review" onClick={() => openRecipientCommand("review", row.mobile)}>
        <CheckCircle2 size={14} aria-hidden="true" />
        {!iconOnly && "Review"}
      </button>
      <button type="button" title="Unsuppress" aria-label="Unsuppress" onClick={() => openRecipientCommand("unsuppress", row.mobile)}>
        <RotateCcw size={14} aria-hidden="true" />
        {!iconOnly && "Unsuppress"}
      </button>
      {row.whatsappInvalid ? (
        <button type="button" title="Clear invalid" aria-label="Clear invalid" onClick={() => openRecipientCommand("clearInvalid", row.mobile)}>
          <ShieldCheck size={14} aria-hidden="true" />
          {!iconOnly && "Clear invalid"}
        </button>
      ) : (
        <button type="button" title="Mark invalid" aria-label="Mark invalid" className={styles.warningButton} onClick={() => openRecipientCommand("markInvalid", row.mobile)}>
          <ShieldAlert size={14} aria-hidden="true" />
          {!iconOnly && "Mark invalid"}
        </button>
      )}
      {row.adminBlocked ? (
        <button type="button" title="Unblock" aria-label="Unblock" onClick={() => openRecipientCommand("unblock", row.mobile)}>
          <ShieldCheck size={14} aria-hidden="true" />
          {!iconOnly && "Unblock"}
        </button>
      ) : (
        <button type="button" title="Block" aria-label="Block" className={styles.dangerButton} onClick={() => openRecipientCommand("block", row.mobile)}>
          <Ban size={14} aria-hidden="true" />
          {!iconOnly && "Block"}
        </button>
      )}
    </div>
  );

  const renderRecipients = () => (
    <div className={styles.workspaceStack}>
      <div className={styles.workspaceHeader}>
        <div>
          <span>Command Center</span>
          <h2>Recipient health</h2>
        </div>
        <small>{recipientsLoading ? "Loading rows" : `${formatNumber(recipientsTotal)} recipients`}</small>
      </div>

      <section className={styles.healthStrip}>
        <MetricCard icon={Users} label="Loaded" value={formatNumber(recipients.length)} note="Rows on this page" />
        <MetricCard icon={Ban} label="Blocked" value={formatNumber(recipientPageStats.blocked)} note="Explicit admin block" tone="red" />
        <MetricCard icon={ShieldAlert} label="Invalid" value={formatNumber(recipientPageStats.invalid)} note="Guard skips number" tone="amber" />
        <MetricCard icon={AlertTriangle} label="Suppressed" value={formatNumber(recipientPageStats.suppressed)} note="Temporary hold active" tone="violet" />
        <MetricCard icon={CheckCircle2} label="Review Queue" value={formatNumber(recipientPageStats.review)} note="Failed and unreviewed" tone="green" />
      </section>

      <div className={styles.recipientLayout}>
        <section className={styles.panel}>
          <PanelTitle icon={ShieldAlert} title="Recipient Registry">
            <div className={styles.presetBar}>
              {recipientPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={cx(activeRecipientPreset === preset.id && styles.presetActive)}
                  onClick={() => applyRecipientPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </PanelTitle>

          <div className={styles.recipientFilters}>
            <Field label="Mobile">
              <input
                placeholder="Search mobile"
                value={recipientFilter.mobile}
                onChange={(event) => setRecipientFilter((prev) => ({ ...prev, mobile: event.target.value }))}
              />
            </Field>
            <Field label="Suppressed">
              <select value={recipientFilter.suppressed} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, suppressed: event.target.value }))}>
                {triStateOptions.map((option) => <option key={option.value || "any"} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Invalid">
              <select value={recipientFilter.invalid} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, invalid: event.target.value }))}>
                {triStateOptions.map((option) => <option key={option.value || "any"} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Blocked">
              <select value={recipientFilter.blocked} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, blocked: event.target.value }))}>
                {triStateOptions.map((option) => <option key={option.value || "any"} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Reviewed">
              <select value={recipientFilter.reviewed} onChange={(event) => setRecipientFilter((prev) => ({ ...prev, reviewed: event.target.value }))}>
                {triStateOptions.map((option) => <option key={option.value || "any"} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Rows">
              <select value={recipientsPageSize || 25} onChange={(event) => loadRecipients(1, Number(event.target.value))}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </Field>
            <div className={styles.recipientFilterActions}>
              <button type="button" className={styles.primaryButton} onClick={() => loadRecipients(1)}>
                <Filter size={15} aria-hidden="true" />
                Load
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setRecipientFilter(initialRecipientFilter);
                  loadRecipients(1, recipientsPageSize || 25, initialRecipientFilter);
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>

          <div className={cx(styles.tableWrap, styles.compactTableWrap)}>
            <table className={cx(styles.dataTable, styles.recipientTable, styles.compactTable, styles.recipientCompactTable)}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Mobile</th>
                  <th>Attempts</th>
                  <th>Failed</th>
                  <th>131026</th>
                  <th>131049</th>
                  <th>Suppression</th>
                  <th>Last Failure</th>
                  <th>Reviewed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((row) => (
                  <tr
                    key={row.mobile}
                    className={cx(styles.clickableRow, selectedRecipientMobile === row.mobile && styles.selectedRow)}
                    onClick={() => setSelectedRecipientMobile(row.mobile)}
                  >
                    <td><span className={cx(styles.healthPill, styles[recipientTone(row)])}>{recipientToneLabel(row)}</span></td>
                    <td>{row.mobile}</td>
                    <td>{formatNumber(row.totalAttempts)}</td>
                    <td>{formatNumber(row.failedCount)}</td>
                    <td>{formatNumber(row.undeliverableCount)}</td>
                    <td>{formatNumber(row.ecosystemFailureCount)}</td>
                    <td>{formatDateTime(row.suppressedUntil)}</td>
                    <td title={row.lastFailureReason || ""}>{row.lastFailureReason || "-"}</td>
                    <td>{row.reviewed ? "Yes" : "No"}</td>
                    <td onClick={(event) => event.stopPropagation()}>{renderRecipientActions(row, false, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recipients.length && <EmptyState text="No recipient-health rows." />}
          </div>
          <div className={styles.pagination}>
            <button type="button" disabled={(recipientsPageNo || 1) <= 1} onClick={() => changeRecipientPage(-1)}>Previous</button>
            <span>Page {recipientsPageNo || 1} of {Math.max(1, Math.ceil(recipientsTotal / (recipientsPageSize || 25)))}</span>
            <button
              type="button"
              disabled={(recipientsPageNo || 1) >= Math.ceil(recipientsTotal / (recipientsPageSize || 25))}
              onClick={() => changeRecipientPage(1)}
            >
              Next
            </button>
          </div>
        </section>

        <aside className={styles.sidePanel}>
          <div className={styles.sideSection}>
            <PanelTitle icon={Search} title="Manual Control" />
            <Field label="Mobile">
              <input value={manualMobile} onChange={(event) => setManualMobile(event.target.value)} placeholder="Enter mobile number" />
            </Field>
            <div className={styles.commandGrid}>
              <button type="button" className={styles.warningButton} disabled={!manualMobile.trim()} onClick={() => openRecipientCommand("markInvalid", manualMobile)}>
                <ShieldAlert size={14} aria-hidden="true" />
                Mark invalid
              </button>
              <button type="button" className={styles.dangerButton} disabled={!manualMobile.trim()} onClick={() => openRecipientCommand("block", manualMobile)}>
                <Ban size={14} aria-hidden="true" />
                Block
              </button>
            </div>
          </div>

          <div className={styles.sideSection}>
            <PanelTitle icon={Users} title="Selected Recipient" />
            {selectedRecipient ? (
              <>
                <div className={styles.profileHeader}>
                  <strong>{selectedRecipient.mobile}</strong>
                  <span className={cx(styles.healthPill, styles[recipientTone(selectedRecipient)])}>{recipientToneLabel(selectedRecipient)}</span>
                </div>
                <div className={styles.profileGrid}>
                  <div><span>Attempts</span><strong>{formatNumber(selectedRecipient.totalAttempts)}</strong></div>
                  <div><span>Failed</span><strong>{formatNumber(selectedRecipient.failedCount)}</strong></div>
                  <div><span>Last status</span><strong>{selectedRecipient.lastStatus || "-"}</strong></div>
                  <div><span>Last attempt</span><strong>{formatDateTime(selectedRecipient.lastAttemptAt)}</strong></div>
                  <div><span>Suppressed</span><strong>{formatDateTime(selectedRecipient.suppressedUntil)}</strong></div>
                  <div><span>Block reason</span><strong>{selectedRecipient.adminBlockedReason || "-"}</strong></div>
                  <div className={styles.profileWide}><span>Last failure</span><strong>{selectedRecipient.lastFailureReason || "-"}</strong></div>
                </div>
                {renderRecipientActions(selectedRecipient, true)}
              </>
            ) : (
              <EmptyState text="Select a recipient to inspect it." />
            )}
          </div>
        </aside>
      </div>
    </div>
  );

  const commandConfig = recipientCommand ? recipientCommandConfig[recipientCommand.type] : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>
            <Activity size={14} aria-hidden="true" />
            MSG91 WhatsApp Ops
          </span>
          <h1>Analytics and recipient control</h1>
          <p>{appliedModeCopy}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportCsv} disabled={exportLoading}>
            <Download size={16} aria-hidden="true" />
            {exportLoading ? "Exporting" : "Export Excel"}
          </button>
          <button type="button" className={styles.primaryButton} onClick={applyFilters}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      <nav className={styles.workspaceTabs} aria-label="MSG91 analytics workspace">
        {workspaces.map((workspace) => {
          const Icon = workspace.icon;
          return (
            <button
              key={workspace.id}
              type="button"
              className={cx(activeWorkspace === workspace.id && styles.tabActive)}
              onClick={() => setActiveWorkspace(workspace.id)}
            >
              <Icon size={16} aria-hidden="true" />
              {workspace.label}
            </button>
          );
        })}
      </nav>

      {renderFilterRail()}

      {error && <div className={styles.error}>{error}</div>}

      <main className={styles.workspace}>
        {activeWorkspace === "overview" && renderOverview()}
        {activeWorkspace === "audit" && renderAudit()}
        {activeWorkspace === "recipients" && renderRecipients()}
      </main>

      {recipientCommand && commandConfig && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.commandModal} role="dialog" aria-modal="true" aria-labelledby="recipient-command-title">
            <div className={styles.modalHeader}>
              <div>
                <span>{recipientCommand.mobile}</span>
                <h3 id="recipient-command-title">{commandConfig.title}</h3>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setRecipientCommand(null)} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{commandConfig.detail}</p>
            {commandConfig.needsReason && (
              <Field label={commandConfig.reasonLabel}>
                <input
                  value={recipientCommand.reason}
                  onChange={(event) => setRecipientCommand((prev) => ({ ...prev, reason: event.target.value }))}
                  autoFocus
                />
              </Field>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setRecipientCommand(null)}>Cancel</button>
              <button
                type="button"
                className={cx(commandConfig.danger ? styles.dangerButton : styles.primaryButton)}
                onClick={runRecipientCommand}
                disabled={commandLoading}
              >
                {commandLoading ? "Saving" : commandConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
