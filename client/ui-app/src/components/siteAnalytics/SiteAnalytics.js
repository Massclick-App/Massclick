import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, IconButton, InputAdornment, LinearProgress,
  MenuItem, Paper, TextField, ToggleButton, ToggleButtonGroup, Tooltip,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
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

const number = (value) => Number(value || 0).toLocaleString("en-IN");
const todayISO = () => new Date().toISOString().slice(0, 10);

// "+12% vs previous period" note under each metric card.
const deltaNote = (current, previous) => {
  const now = Number(current || 0);
  const before = Number(previous || 0);
  if (!before) return now ? "New in this period" : "No data yet";
  const change = Math.round(((now - before) / before) * 100);
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "•";
  return `${arrow} ${Math.abs(change)}% vs previous period`;
};

// Shared fetch: refetches whenever the serialized params or `reloadToken`
// change. `reloadToken` lets the Refresh button force a reload without altering
// the query (and therefore without changing the server cache key).
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

function Metric({ icon: Icon, label, value, note, tone }) {
  return <Paper elevation={0} className={styles.metric} sx={{ borderRadius: "16px" }}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><Icon /></span>
    <span className={styles.metricLabel}>{label}</span>
    <strong className={styles.metricValue}>{value}</strong>
    <span className={styles.metricNote}>{note}</span>
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
        {[25, 50, 100].map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
      </TextField>
      <IconButton size="small" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeftRoundedIcon fontSize="small" /></IconButton>
      <span className={styles.pagerPage}>{page} / {pageCount}</span>
      <IconButton size="small" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRightRoundedIcon fontSize="small" /></IconButton>
    </div>
  </div>;
}

// A full-data table with server-side pagination, sorting, and search. Each
// instance owns its own paging/sort/search state; global filters and the
// refresh token flow in as props and reset the table to page one.
function SectionTable({
  title, subtitle, icon: Icon, tone, url, filters, filterKey, reloadToken,
  rowsKey, columns, defaultSort, searchPlaceholder = "Search…",
  extraDefaults = {}, renderExtra, renderSummary,
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
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
    <div className={styles.panelHead}>
      <span className={`${styles.panelIcon} ${styles[tone]}`}><Icon fontSize="small" /></span>
      <div className={styles.panelHeadCopy}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <p className={styles.panelSubtitle}>{renderSummary ? renderSummary(data) : subtitle}</p>
      </div>
    </div>

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
                  {active && <Arrow sx={{ fontSize: 15 }} />}
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

function DeviceSplit({ url, filters, reloadToken }) {
  const { data, loading, error } = useFetch(url, filters, reloadToken);
  const bar = (rows, getLabel) => {
    const max = Math.max(...(rows || []).map((r) => Number(r.visitors || 0)), 1);
    if (!rows?.length) return <p className={styles.empty}>{error ? `Could not load: ${error}` : "No data."}</p>;
    return <div className={styles.ranking}>
      {rows.map((row, index) => <div className={styles.rankRow} key={`${getLabel(row)}-${index}`}>
        <div className={styles.rankCopy}>
          <span className={styles.rankLabel}>{getLabel(row)}</span>
          <strong className={styles.rankValue}>{number(row.visitors)} visitors</strong>
        </div>
        <LinearProgress variant="determinate" value={(Number(row.visitors || 0) / max) * 100} className={styles.progress} sx={{ height: 6, borderRadius: "20px" }} />
      </div>)}
    </div>;
  };

  return <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "16px" }}>
    <div className={styles.panelHead}>
      <span className={`${styles.panelIcon} ${styles.purple}`}><GroupsRoundedIcon fontSize="small" /></span>
      <div className={styles.panelHeadCopy}>
        <h2 className={styles.panelTitle}>Devices &amp; browsers</h2>
        <p className={styles.panelSubtitle}>Unique visitors split by device type and browser.</p>
      </div>
    </div>
    {loading && <LinearProgress className={styles.tableLoading} />}
    <div className={styles.splitColumns}>
      <div>
        <h3 className={styles.splitHeading}>Device</h3>
        {bar(data?.devices, (r) => DEVICE_LABELS[r.device] || r.device || "Other")}
      </div>
      <div>
        <h3 className={styles.splitHeading}>Browser</h3>
        {bar(data?.browsers, (r) => r.browser || "Other")}
      </div>
    </div>
  </Paper>;
}

const actionDetail = (row) => {
  const a = row.actions || {};
  const parts = [
    a.call ? `${number(a.call)} calls` : "",
    a.whatsapp ? `${number(a.whatsapp)} WhatsApp` : "",
    a.direction ? `${number(a.direction)} directions` : "",
    a.enquiry ? `${number(a.enquiry)} enquiries` : "",
    a.showNumber ? `${number(a.showNumber)} number reveals` : "",
  ].filter(Boolean);
  return <span className={styles.breakdown}>{parts.length ? parts.join(" · ") : "No clicks yet"}</span>;
};

export default function SiteAnalytics() {
  const [filters, setFilters] = useState({ mode: "preset", days: 28, start: "", end: "", device: "", browser: "" });
  const [reloadToken, setReloadToken] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Server params derived from the active filters.
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

  const chartData = useMemo(() => (trends.data?.trend || []).map((row) => ({
    ...row,
    label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  })), [trends.data]);

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
        trends: trends.data?.trend || [],
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
  }, [queryFilters, overview.data, trends.data, rangeLabel, filters.device, filters.browser]);

  const anyLoading = overview.loading || trends.loading;

  const pageColumns = [
    { key: "path", label: "Page", render: (r) => <span className={styles.mono} title={r.path}>{r.path || "/"}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 110, render: (r) => number(r.views) },
    { key: "sessions", label: "Sessions", numeric: true, sortable: true, width: 110, render: (r) => number(r.sessions) },
  ];

  const businessColumns = [
    { key: "name", label: "Business", render: (r) => <span className={styles.strongCell} title={r.name || r.businessId}>{r.name || r.businessId}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 90, render: (r) => number(r.views) },
    { key: "clicks", label: "Clicks", numeric: true, sortable: true, width: 90, render: (r) => number(r.clicks) },
    { key: "leads", label: "Leads", numeric: true, sortable: true, width: 90, render: (r) => number(r.leads) },
    { key: "breakdown", label: "Interaction breakdown", render: actionDetail },
  ];

  const searchColumns = [
    { key: "query", label: "Query", render: (r) => <span className={styles.strongCell} title={r.query}>{r.query}</span> },
    { key: "count", label: "Searches", numeric: true, sortable: true, width: 100, render: (r) => number(r.count) },
    { key: "typedCount", label: "Typed", numeric: true, width: 80, render: (r) => number(r.typedCount) },
    { key: "avgResults", label: "Avg results", numeric: true, sortable: true, width: 110, render: (r) => number(r.avgResults) },
    { key: "zeroResults", label: "No-result", numeric: true, sortable: true, width: 100, render: (r) => r.zeroResults ? <span className={styles.warnCell}>{number(r.zeroResults)}</span> : "0" },
    { key: "location", label: "Top location", width: 160, render: (r) => r.location || "—" },
  ];

  return <Box className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Site analytics</h1>
        <p className={styles.subtitle}>First-party visitor tracking — page views, sessions, business interactions, and searches captured by our own tracker. Filter, drill into every row, and export to Excel.</p>
      </div>
      <div className={styles.headerActions}>
        <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={exporting || anyLoading} className={styles.exportBtn}>
          {exporting ? "Preparing…" : "Export Excel"}
        </Button>
        <Tooltip title="Refresh data">
          <span><IconButton onClick={() => setReloadToken((n) => n + 1)} disabled={anyLoading} className={styles.refreshBtn}><RefreshRoundedIcon /></IconButton></span>
        </Tooltip>
      </div>
    </div>

    <Paper elevation={0} className={styles.filterBar} sx={{ borderRadius: "16px" }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filters.mode}
        onChange={(_, mode) => mode && patch({ mode })}
        sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 650 } }}
      >
        <ToggleButton value="preset">Presets</ToggleButton>
        <ToggleButton value="custom">Custom range</ToggleButton>
      </ToggleButtonGroup>

      {filters.mode === "preset" ? (
        <TextField select size="small" label="Period" value={filters.days} onChange={(e) => patch({ days: Number(e.target.value) })} className={styles.field}>
          {PRESETS.map((d) => <MenuItem key={d} value={d}>Last {d} day{d === 1 ? "" : "s"}</MenuItem>)}
        </TextField>
      ) : (
        <>
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={filters.start} inputProps={{ max: filters.end || todayISO() }} onChange={(e) => patch({ start: e.target.value })} className={styles.field} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={filters.end} inputProps={{ min: filters.start, max: todayISO() }} onChange={(e) => patch({ end: e.target.value })} className={styles.field} />
        </>
      )}

      <TextField select size="small" label="Device" value={filters.device} onChange={(e) => patch({ device: e.target.value })} className={styles.field}>
        {DEVICE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>

      <TextField select size="small" label="Browser" value={filters.browser} onChange={(e) => patch({ browser: e.target.value })} className={styles.field}>
        <MenuItem value="">All browsers</MenuItem>
        {BROWSER_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
      </TextField>

      <div className={styles.filterMeta}>
        <Chip size="small" variant="outlined" label={rangeLabel} className={styles.rangeChip} />
        {hasActiveFilter && <Button size="small" startIcon={<RestartAltRoundedIcon />} onClick={resetFilters} className={styles.resetBtn}>Reset</Button>}
      </div>
    </Paper>

    {anyLoading && <LinearProgress className={styles.loading} />}
    {overview.error && <Alert severity="warning" className={styles.alert}>Overview could not load: {overview.error}</Alert>}
    {exportError && <Alert severity="error" className={styles.alert} onClose={() => setExportError("")}>{exportError}</Alert>}

    <div className={styles.metrics}>
      <Metric icon={GroupsRoundedIcon} tone="blue" label="Unique visitors" value={number(current.visitors)} note={deltaNote(current.visitors, previous.visitors)} />
      <Metric icon={LoginRoundedIcon} tone="purple" label="Sessions" value={number(current.sessions)} note={deltaNote(current.sessions, previous.sessions)} />
      <Metric icon={VisibilityRoundedIcon} tone="orange" label="Page views" value={number(current.pageViews)} note={deltaNote(current.pageViews, previous.pageViews)} />
      <Metric icon={AutoGraphRoundedIcon} tone="green" label="Pages / session" value={number(current.pagesPerSession)} note={`${number(current.identifiedUsers)} logged-in customers seen`} />
      <Metric icon={StorefrontRoundedIcon} tone="pink" label="Business views" value={number(current.businessViews)} note={deltaNote(current.businessViews, previous.businessViews)} />
      <Metric icon={TouchAppRoundedIcon} tone="orange" label="Interactions" value={number(current.interactions)} note={deltaNote(current.interactions, previous.interactions)} />
      <Metric icon={SearchRoundedIcon} tone="blue" label="Searches" value={number(current.searches)} note={deltaNote(current.searches, previous.searches)} />
      <Metric icon={TouchAppRoundedIcon} tone="purple" label="Result clicks" value={number(current.resultClicks)} note={deltaNote(current.resultClicks, previous.resultClicks)} />
    </div>

    <Paper elevation={0} className={styles.chartPanel} sx={{ borderRadius: "16px" }}>
      <div className={styles.panelHead}>
        <span className={`${styles.panelIcon} ${styles.blue}`}><AutoGraphRoundedIcon fontSize="small" /></span>
        <div className={styles.panelHeadCopy}>
          <h2 className={styles.panelTitle}>Daily traffic</h2>
          <p className={styles.panelSubtitle}>Visitors, page views, and business clicks per day (IST).</p>
        </div>
      </div>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 0, right: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="pageViews" name="Page views" fill="#93c5fd" radius={[6, 6, 0, 0]} />
            <Bar dataKey="businessClicks" name="Business clicks" fill="#f97316" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Paper>

    <div className={styles.grid}>
      <SectionTable
        title="Top pages" tone="blue" icon={VisibilityRoundedIcon}
        url="/site-events/top-pages" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="pages" columns={pageColumns} defaultSort="views" searchPlaceholder="Search by path…"
        renderSummary={(data) => data ? `Most viewed pages · ${number(data.totals?.views)} views across ${number(data.total)} paths.` : "Most viewed pages in this period."}
      />

      <SectionTable
        title="Top businesses" tone="pink" icon={StorefrontRoundedIcon}
        url="/site-events/top-businesses" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="businesses" columns={businessColumns} defaultSort="views" searchPlaceholder="Search by business name…"
        renderSummary={(data) => data ? `${number(data.total)} businesses · ${number(data.totals?.views)} views · ${number(data.totals?.leads)} leads.` : "Listing views with the click breakdown."}
      />

      <SectionTable
        title="Top searches" tone="orange" icon={SearchRoundedIcon}
        url="/site-events/top-searches" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="searches" columns={searchColumns} defaultSort="count" searchPlaceholder="Search queries…"
        extraDefaults={{ searchType: "", zeroOnly: false }}
        renderSummary={(data) => data ? `${number(data.typedSearches)} typed · ${number(data.categorySearches)} from category browsing · ${number(data.total)} distinct queries.` : "Search queries in this period."}
        renderExtra={(extra, setExtra) => <div className={styles.searchControls}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={extra.searchType}
            onChange={(_, v) => setExtra((e) => ({ ...e, searchType: v ?? "" }))}
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 650 } }}
          >
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="typed">Typed</ToggleButton>
            <ToggleButton value="category">Category</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton
            size="small"
            value="zeroOnly"
            selected={extra.zeroOnly}
            onChange={() => setExtra((e) => ({ ...e, zeroOnly: !e.zeroOnly }))}
            sx={{ textTransform: "none", fontWeight: 650, color: "#b45309", borderColor: "#f5d9a8" }}
          >
            No-result only
          </ToggleButton>
        </div>}
      />

      <DeviceSplit url="/site-events/devices" filters={queryFilters} reloadToken={reloadToken} />
    </div>
  </Box>;
}
