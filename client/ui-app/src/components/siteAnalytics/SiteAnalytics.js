import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, IconButton, InputAdornment, LinearProgress,
  MenuItem, Paper, TextField, ToggleButton, ToggleButtonGroup, Tooltip,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import PhoneInTalkRoundedIcon from "@mui/icons-material/PhoneInTalkRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AdsClickRoundedIcon from "@mui/icons-material/AdsClickRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import axiosInstance from "../../services/axiosInstance.js";
import { exportSiteAnalyticsWorkbook } from "./siteAnalyticsWorkbook.js";
import styles from "./SiteAnalytics.module.css";

const API_URL = process.env.REACT_APP_API_URL;
const PRESETS = [1, 2, 3, 7, 28, 90, 365];
const DEVICE_OPTIONS = [
  { value: "", label: "All devices" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
  { value: "other", label: "Other" },
];
// parseUserAgent on the server only ever emits this fixed set of labels.
const BROWSER_OPTIONS = ["Chrome", "Safari", "Firefox", "Edge", "Opera", "Samsung", "Other"];
const DEVICE_LABELS = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop", other: "Other" };
const GRANULARITIES = [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }];
const DONUT_COLORS = ["#2563eb", "#7c3aed", "#f97316", "#16a34a", "#db2777", "#0d9488", "#eab308", "#64748b"];

const number = (value) => Number(value || 0).toLocaleString("en-IN");
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatValue = (value, format) => {
  const n = Number(value || 0);
  if (format === "percent") return `${n % 1 ? n.toFixed(1) : n}%`;
  if (format === "decimal") return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-IN");
};

// Period-over-period change. `invert` marks metrics where down is good
// (bounce rate), so the badge colour reflects health, not direction.
const deltaOf = (now, before, invert = false) => {
  const a = Number(now || 0);
  const b = Number(before || 0);
  if (!b) return a ? { label: "New", tone: invert ? "down" : "up" } : { label: "— 0%", tone: "flat" };
  const change = ((a - b) / b) * 100;
  if (Math.abs(change) < 0.05) return { label: "— 0%", tone: "flat" };
  const up = change > 0;
  return { label: `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%`, tone: (invert ? !up : up) ? "up" : "down" };
};

// Shared fetch: refetches whenever the serialized params or `reloadToken`
// change. `reloadToken` lets Refresh force a reload without altering the query
// (and therefore without changing the server cache key).
function useFetch(url, params, reloadToken = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = JSON.stringify(params || {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    axiosInstance
      .get(`${API_URL}${url}`, { params: JSON.parse(key) })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || err?.message || "unavailable"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, reloadToken]);

  return { data, loading, error };
}

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Metric({ icon: Icon, label, value, format, current, previous, invert, caption, tone, color, series, dataKey }) {
  const delta = deltaOf(current, previous, invert);
  const gradientId = `spark-${dataKey}`;
  return <Paper elevation={0} className={styles.metric} sx={{ borderRadius: "16px" }}>
    <div className={styles.metricTop}>
      <span className={`${styles.metricIcon} ${styles[tone]}`}><Icon fontSize="small" /></span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
    <div className={styles.metricValueRow}>
      <strong className={styles.metricValue}>{formatValue(value, format)}</strong>
      <span className={`${styles.delta} ${styles[delta.tone]}`}>{delta.label}</span>
    </div>
    <span className={styles.metricNote}>{caption}</span>
    <div className={styles.spark}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} fill={`url(#${gradientId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </Paper>;
}

function Pager({ page, limit, total, loading, onPage, onLimit }) {
  const pageCount = Math.max(Math.ceil(total / limit), 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return <div className={styles.pager}>
    <span className={styles.pagerInfo}>{loading ? "Loading…" : `${number(from)}–${number(to)} of ${number(total)}`}</span>
    <div className={styles.pagerControls}>
      <TextField select size="small" value={limit} onChange={(e) => onLimit(Number(e.target.value))} className={styles.limitSelect}>
        {[10, 25, 50, 100].map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
      </TextField>
      <IconButton size="small" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeftRoundedIcon fontSize="small" /></IconButton>
      <span className={styles.pagerPage}>{page} / {pageCount}</span>
      <IconButton size="small" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRightRoundedIcon fontSize="small" /></IconButton>
    </div>
  </div>;
}

function PanelHead({ icon: Icon, tone, title, subtitle, action }) {
  return <div className={styles.panelHead}>
    <span className={`${styles.panelIcon} ${styles[tone]}`}><Icon fontSize="small" /></span>
    <div className={styles.panelHeadCopy}>
      <h2 className={styles.panelTitle}>{title}</h2>
      <p className={styles.panelSubtitle}>{subtitle}</p>
    </div>
    {action}
  </div>;
}

// A full-data table with server-side pagination, sorting, and search. Each
// instance owns its own paging/sort/search state; global filters and the
// refresh token flow in as props and reset the table to page one.
function SectionTable({
  title, subtitle, icon, tone, url, filters, filterKey, reloadToken,
  rowsKey, columns, defaultSort, searchPlaceholder = "Search…",
  extraDefaults = {}, renderExtra, renderSummary,
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState(defaultSort);
  const [dir, setDir] = useState("desc");
  const [qInput, setQInput] = useState("");
  const [extra, setExtra] = useState(extraDefaults);
  const q = useDebounce(qInput.trim(), 350);
  const extraKey = JSON.stringify(extra);

  // Any change that alters the result set snaps back to the first page.
  useEffect(() => { setPage(1); }, [filterKey, q, sort, dir, limit, extraKey]);

  const cleanExtra = {};
  Object.entries(extra).forEach(([k, v]) => { if (v !== "" && v !== false && v != null) cleanExtra[k] = v; });
  const params = { ...filters, page, limit, sort, dir, ...(q ? { q } : {}), ...cleanExtra };
  const { data, loading, error } = useFetch(url, params, reloadToken);

  const rows = data?.[rowsKey] || [];
  const total = data?.total || 0;

  const onSort = (key) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(key); setDir("desc"); }
  };

  return <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "16px" }}>
    <PanelHead icon={icon} tone={tone} title={title} subtitle={renderSummary ? renderSummary(data) : subtitle} />

    <div className={styles.tableTools}>
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        className={styles.searchField}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
          endAdornment: qInput ? <InputAdornment position="end"><IconButton size="small" onClick={() => setQInput("")} aria-label="Clear search"><CloseRoundedIcon fontSize="small" /></IconButton></InputAdornment> : null,
        }}
      />
      {renderExtra ? renderExtra(extra, setExtra) : null}
    </div>

    <div className={styles.tableWrap}>
      {loading && <LinearProgress className={styles.tableLoading} />}
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = col.sortable && sort === col.key;
              const Arrow = dir === "asc" ? ArrowUpwardRoundedIcon : ArrowDownwardRoundedIcon;
              return <th
                key={col.key}
                scope="col"
                className={`${col.numeric ? styles.thNum : ""} ${col.sortable ? styles.thSortable : ""} ${active ? styles.thActive : ""}`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
                onKeyDown={col.sortable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col.key); } } : undefined}
                tabIndex={col.sortable ? 0 : undefined}
                aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
              >
                <span className={styles.thInner}>
                  {col.label}
                  {active && <Arrow sx={{ fontSize: 14 }} />}
                </span>
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr className={styles.row} key={rowKey(row, index, rowsKey)}>
            {columns.map((col) => <td key={col.key} className={col.numeric ? styles.tdNum : ""}>
              {col.render(row, (page - 1) * limit + index)}
            </td>)}
          </tr>)}
        </tbody>
      </table>
      {!loading && !rows.length && <p className={styles.empty}>{error ? `Could not load: ${error}` : "No data for these filters."}</p>}
    </div>

    <Pager page={page} limit={limit} total={total} loading={loading} onPage={setPage} onLimit={setLimit} />
  </Paper>;
}

// Stable-ish row key across the section's known id fields.
function rowKey(row, index, rowsKey) {
  return `${rowsKey}-${row.businessId || row.path || row.query || index}-${index}`;
}

function Donut({ heading, rows, labelOf }) {
  const data = (rows || [])
    .filter((r) => Number(r.visitors || 0) > 0)
    .map((r) => ({ ...r, name: labelOf(r) }));
  const total = data.reduce((sum, r) => sum + Number(r.visitors || 0), 0);

  return <div className={styles.donutCard}>
    <h3 className={styles.splitHeading}>{heading}</h3>
    {!data.length ? <p className={styles.empty}>No data.</p> : <div className={styles.donutBody}>
      <div className={styles.donutChart}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="visitors" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((row, index) => <Cell key={row.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />)}
            </Pie>
            <ChartTooltip formatter={(value) => [`${number(value)} visitors`]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className={styles.donutLegend}>
        {data.map((row, index) => <li className={styles.legendRow} key={row.name}>
          <span className={styles.legendDot} style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
          <span className={styles.legendLabel}>{labelOf(row)}</span>
          <span className={styles.legendValue}>{number(row.visitors)} ({total ? ((row.visitors / total) * 100).toFixed(1) : 0}%)</span>
        </li>)}
      </ul>
    </div>}
  </div>;
}

function DeviceSplit({ url, filters, reloadToken }) {
  const { data, loading, error } = useFetch(url, filters, reloadToken);
  return <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "16px" }}>
    <PanelHead icon={DevicesRoundedIcon} tone="purple" title="Devices &amp; browsers" subtitle="See what devices and browsers your visitors use." />
    {loading && <LinearProgress className={styles.tableLoading} />}
    {error && <p className={styles.empty}>Could not load: {error}</p>}
    <div className={styles.splitColumns}>
      <Donut heading="Devices" rows={data?.devices} labelOf={(r) => DEVICE_LABELS[r.device] || r.device || "Other"} />
      <Donut heading="Browsers" rows={data?.browsers} labelOf={(r) => r.browser || "Other"} />
    </div>
  </Paper>;
}

const breakdownText = (row) => {
  const a = row.actions || {};
  const parts = [
    a.call ? `${number(a.call)} calls` : "",
    a.whatsapp ? `${number(a.whatsapp)} WhatsApp` : "",
    a.direction ? `${number(a.direction)} directions` : "",
    a.enquiry ? `${number(a.enquiry)} enquiries` : "",
    a.showNumber ? `${number(a.showNumber)} number reveals` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No clicks yet";
};

// Roll daily rows up into weekly / monthly buckets for the traffic chart.
const bucketOf = (date, granularity) => {
  if (granularity === "month") return `${date.slice(0, 7)}-01`;
  if (granularity === "week") {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday start
    return isoOf(d);
  }
  return date;
};

const labelOfBucket = (date, granularity) => {
  const d = new Date(`${date}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (granularity === "week") return `w/c ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function SiteAnalytics() {
  const [filters, setFilters] = useState({ mode: "preset", days: 28, start: "", end: "", device: "", browser: "" });
  const [granularity, setGranularity] = useState("day");
  const [reloadToken, setReloadToken] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const queryFilters = useMemo(() => {
    const f = {};
    if (filters.mode === "custom" && (filters.start || filters.end)) {
      if (filters.start) f.start = filters.start;
      if (filters.end) f.end = filters.end;
    } else {
      f.days = filters.days;
    }
    if (filters.device) f.device = filters.device;
    if (filters.browser) f.browser = filters.browser;
    return f;
  }, [filters]);

  const filterKey = JSON.stringify(queryFilters);

  const overview = useFetch("/site-events/overview", queryFilters, reloadToken);
  const trends = useFetch("/site-events/trends", queryFilters, reloadToken);

  const current = overview.data?.current || {};
  const previous = overview.data?.previous || {};
  const trendRows = useMemo(() => trends.data?.trend || [], [trends.data]);
  const periodLabel = overview.data?.days ? `previous ${overview.data.days} days` : "previous period";

  // Weekly / monthly buckets sum the daily figures.
  const chartData = useMemo(() => {
    const source = granularity === "day" ? trendRows : Object.values(trendRows.reduce((acc, row) => {
      const key = bucketOf(row.date, granularity);
      const bucket = acc[key] || (acc[key] = { date: key, visitors: 0, sessions: 0, pageViews: 0, businessClicks: 0 });
      bucket.visitors += row.visitors;
      bucket.sessions += row.sessions;
      bucket.pageViews += row.pageViews;
      bucket.businessClicks += row.businessClicks;
      return acc;
    }, {})).sort((a, b) => a.date.localeCompare(b.date));
    return source.map((row) => ({ ...row, label: labelOfBucket(row.date, granularity) }));
  }, [trendRows, granularity]);

  const rangeLabel = filters.mode === "custom" && (filters.start || filters.end)
    ? `${filters.start || "start"} → ${filters.end || "today"}`
    : `Last ${filters.days} day${filters.days === 1 ? "" : "s"}`;

  const hasActiveFilter = filters.device || filters.browser || filters.mode === "custom";
  const resetFilters = () => setFilters({ mode: "preset", days: 28, start: "", end: "", device: "", browser: "" });
  const patch = (changes) => setFilters((prev) => ({ ...prev, ...changes }));

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError("");
    try {
      const big = { ...queryFilters, limit: 500, page: 1 };
      const [pagesRes, bizRes, searchRes, devicesRes] = await Promise.all([
        axiosInstance.get(`${API_URL}/site-events/top-pages`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/top-businesses`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/top-searches`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/devices`, { params: queryFilters }),
      ]);
      await exportSiteAnalyticsWorkbook({
        overview: overview.data,
        trends: trendRows,
        devices: devicesRes.data,
        pages: pagesRes.data?.pages || [],
        businesses: bizRes.data?.businesses || [],
        searches: searchRes.data?.searches || [],
        meta: { rangeLabel, generated: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
        filters: [
          { label: "Device", value: filters.device ? (DEVICE_LABELS[filters.device] || filters.device) : "All" },
          { label: "Browser", value: filters.browser || "All" },
        ],
      });
    } catch (err) {
      setExportError(err?.response?.data?.message || err?.message || "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [queryFilters, overview.data, trendRows, rangeLabel, filters.device, filters.browser]);

  const anyLoading = overview.loading || trends.loading;
  const vs = `vs ${periodLabel}`;

  const metrics = [
    { key: "visitors", icon: GroupsRoundedIcon, label: "Unique Visitors", tone: "blue", color: "#2563eb", caption: `${number(current.identifiedUsers)} logged-in customers seen` },
    { key: "newVisitors", icon: PersonAddAlt1RoundedIcon, label: "New Users", tone: "indigo", color: "#4f46e5", caption: vs },
    { key: "sessions", icon: LoginRoundedIcon, label: "Sessions", tone: "purple", color: "#7c3aed", caption: vs },
    { key: "pageViews", icon: VisibilityRoundedIcon, label: "Page Views", tone: "orange", color: "#f97316", caption: vs },
    { key: "pagesPerSession", icon: LayersRoundedIcon, label: "Pages / Session", tone: "green", color: "#16a34a", caption: vs, format: "decimal" },
    { key: "bounceRate", icon: TrendingDownRoundedIcon, label: "Bounce Rate", tone: "red", color: "#e11d48", caption: vs, format: "percent", invert: true },
    { key: "businessViews", icon: StorefrontRoundedIcon, label: "Business Views", tone: "pink", color: "#db2777", caption: vs },
    { key: "interactions", icon: TouchAppRoundedIcon, label: "Interactions", tone: "teal", color: "#0d9488", caption: vs, seriesKey: "businessClicks" },
    { key: "leads", icon: PhoneInTalkRoundedIcon, label: "Leads", tone: "green", color: "#16a34a", caption: "Calls, WhatsApp & enquiries" },
    { key: "formSubmissions", icon: DescriptionRoundedIcon, label: "Form Submissions", tone: "indigo", color: "#4f46e5", caption: vs },
    { key: "searches", icon: SearchRoundedIcon, label: "Searches", tone: "blue", color: "#2563eb", caption: vs },
    { key: "resultClicks", icon: AdsClickRoundedIcon, label: "Result Clicks", tone: "purple", color: "#7c3aed", caption: vs },
  ];

  const pageColumns = [
    { key: "path", label: "Page", render: (r) => <span className={styles.mono} title={r.path}>{r.path || "/"}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 92, render: (r) => number(r.views) },
    { key: "sessions", label: "Sessions", numeric: true, sortable: true, width: 96, render: (r) => number(r.sessions) },
  ];

  const businessColumns = [
    { key: "name", label: "Business", render: (r) => <span className={styles.strongCell} title={r.name || r.businessId}>{r.name || r.businessId}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 82, render: (r) => number(r.views) },
    {
      key: "clicks", label: "Clicks", numeric: true, sortable: true, width: 82,
      render: (r) => <Tooltip title={breakdownText(r)} arrow><span className={styles.hintCell}>{number(r.clicks)}</span></Tooltip>,
    },
    { key: "leads", label: "Leads", numeric: true, sortable: true, width: 82, render: (r) => number(r.leads) },
  ];

  const searchColumns = [
    { key: "query", label: "Keyword", render: (r) => <span className={styles.strongCell} title={r.query}>{r.query}</span> },
    { key: "count", label: "Searches", numeric: true, sortable: true, width: 96, render: (r) => number(r.count) },
    { key: "avgResults", label: "Avg results", numeric: true, sortable: true, width: 108, render: (r) => number(r.avgResults) },
    { key: "zeroResults", label: "No-result", numeric: true, sortable: true, width: 100, render: (r) => r.zeroResults ? <span className={styles.warnCell}>{number(r.zeroResults)}</span> : "0" },
    { key: "location", label: "Location", width: 130, render: (r) => r.location || "—" },
  ];

  return <Box className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Site analysis</h1>
        <p className={styles.subtitle}>Monitor your website&apos;s performance and analytics in real time.</p>
      </div>
      <div className={styles.headerActions}>
        <Tooltip title="Refresh data">
          <span><IconButton onClick={() => setReloadToken((n) => n + 1)} disabled={anyLoading} className={styles.refreshBtn}><RefreshRoundedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
        <Button variant="contained" disableElevation startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={exporting || anyLoading} className={styles.exportBtn}>
          {exporting ? "Preparing…" : "Export Report"}
        </Button>
      </div>
    </div>

    <Paper elevation={0} className={styles.filterBar} sx={{ borderRadius: "14px" }}>
      <TextField
        select size="small" value={filters.mode} onChange={(e) => patch({ mode: e.target.value })} className={styles.field}
        InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthRoundedIcon fontSize="small" /></InputAdornment> }}
      >
        <MenuItem value="preset">Presets</MenuItem>
        <MenuItem value="custom">Custom range</MenuItem>
      </TextField>

      {filters.mode === "preset" ? (
        <TextField select size="small" value={filters.days} onChange={(e) => patch({ days: Number(e.target.value) })} className={styles.field}>
          {PRESETS.map((d) => <MenuItem key={d} value={d}>Last {d} day{d === 1 ? "" : "s"}</MenuItem>)}
        </TextField>
      ) : (
        <>
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={filters.start} inputProps={{ max: filters.end || todayISO() }} onChange={(e) => patch({ start: e.target.value })} className={styles.field} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={filters.end} inputProps={{ min: filters.start, max: todayISO() }} onChange={(e) => patch({ end: e.target.value })} className={styles.field} />
        </>
      )}

      <TextField
        select size="small" value={filters.device} onChange={(e) => patch({ device: e.target.value })} className={styles.field}
        InputProps={{ startAdornment: <InputAdornment position="start"><DevicesRoundedIcon fontSize="small" /></InputAdornment> }}
      >
        {DEVICE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>

      <TextField
        select size="small" value={filters.browser} onChange={(e) => patch({ browser: e.target.value })} className={styles.field}
        InputProps={{ startAdornment: <InputAdornment position="start"><LanguageRoundedIcon fontSize="small" /></InputAdornment> }}
      >
        <MenuItem value="">All browsers</MenuItem>
        {BROWSER_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
      </TextField>

      {hasActiveFilter && <Button size="small" startIcon={<RestartAltRoundedIcon />} onClick={resetFilters} className={styles.resetBtn}>Reset</Button>}
      <span className={styles.rangeNote}>{rangeLabel}</span>
    </Paper>

    {anyLoading && <LinearProgress className={styles.loading} />}
    {overview.error && <Alert severity="warning" className={styles.alert}>Overview could not load: {overview.error}</Alert>}
    {exportError && <Alert severity="error" className={styles.alert} onClose={() => setExportError("")}>{exportError}</Alert>}

    <div className={styles.metrics}>
      {metrics.map((m) => <Metric
        key={m.key}
        icon={m.icon}
        label={m.label}
        tone={m.tone}
        color={m.color}
        format={m.format}
        invert={m.invert}
        caption={m.caption}
        value={current[m.key]}
        current={current[m.key]}
        previous={previous[m.key]}
        series={trendRows}
        dataKey={m.seriesKey || m.key}
      />)}
    </div>

    <Paper elevation={0} className={styles.chartPanel} sx={{ borderRadius: "16px" }}>
      <PanelHead
        icon={InsightsRoundedIcon}
        tone="blue"
        title="Daily Traffic Overview"
        subtitle={granularity === "day" ? "Visitors, page views and business clicks per day (IST)." : "Daily figures summed into buckets (IST)."}
        action={<TextField select size="small" value={granularity} onChange={(e) => setGranularity(e.target.value)} className={styles.granularity}>
          {GRANULARITIES.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
        </TextField>}
      />
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 0, right: 16, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#98a2b3" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#98a2b3" }} axisLine={false} tickLine={false} width={38} />
            <ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e9f1", fontSize: 12, boxShadow: "0 8px 24px -12px rgb(16 42 67 / 35%)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} verticalAlign="top" align="left" />
            <Bar dataKey="pageViews" name="Page Views" fill="#bfdbfe" radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Bar dataKey="businessClicks" name="Business Clicks" fill="#fed7aa" radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#7c3aed" strokeWidth={2} dot={false} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Paper>

    <div className={styles.grid}>
      <SectionTable
        title="Top Pages" tone="blue" icon={ArticleRoundedIcon}
        url="/site-events/top-pages" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="pages" columns={pageColumns} defaultSort="views" searchPlaceholder="Search pages…"
        renderSummary={(data) => data ? `${number(data.total)} paths · ${number(data.totals?.views)} views.` : "Pages your visitors love the most."}
      />

      <SectionTable
        title="Top Businesses" tone="pink" icon={StorefrontRoundedIcon}
        url="/site-events/top-businesses" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="businesses" columns={businessColumns} defaultSort="views" searchPlaceholder="Search businesses…"
        renderSummary={(data) => data ? `${number(data.total)} businesses · ${number(data.totals?.leads)} leads. Hover a click count for the breakdown.` : "Businesses getting the most attention."}
      />

      <SectionTable
        title="Top Searches" tone="orange" icon={SearchRoundedIcon}
        url="/site-events/top-searches" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="searches" columns={searchColumns} defaultSort="count" searchPlaceholder="Search keywords…"
        extraDefaults={{ searchType: "", zeroOnly: false }}
        renderSummary={(data) => data ? `${number(data.typedSearches)} typed · ${number(data.categorySearches)} category · ${number(data.total)} distinct.` : "Most searched keywords on your site."}
        renderExtra={(extra, setExtra) => <div className={styles.searchControls}>
          <ToggleButtonGroup
            exclusive size="small" value={extra.searchType}
            onChange={(_, v) => setExtra((e) => ({ ...e, searchType: v ?? "" }))}
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 650, px: 1.5, py: 0.4 } }}
          >
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="typed">Typed</ToggleButton>
            <ToggleButton value="category">Category</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton
            size="small" value="zeroOnly" selected={extra.zeroOnly}
            onChange={() => setExtra((e) => ({ ...e, zeroOnly: !e.zeroOnly }))}
            sx={{ textTransform: "none", fontWeight: 650, px: 1.5, py: 0.4, color: "#b45309", borderColor: "#f5d9a8" }}
          >
            No-result
          </ToggleButton>
        </div>}
      />

      <DeviceSplit url="/site-events/devices" filters={queryFilters} reloadToken={reloadToken} />
    </div>

    <p className={styles.footnote}>All times are in Asia/Kolkata timezone</p>
  </Box>;
}
