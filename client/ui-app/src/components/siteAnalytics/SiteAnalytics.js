import React, { useCallback, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton,
  InputAdornment, LinearProgress, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
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
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import axiosInstance from "../../services/axiosInstance.js";
import { exportSiteAnalyticsWorkbook } from "./siteAnalyticsWorkbook.js";
import CampaignLinkBuilder from "./CampaignLinkBuilder.js";
import {
  Donut, Metric, PanelHead, SectionTable,
  GRANULARITIES, PRESETS,
  bucketOf, labelOfBucket, number, todayISO,
  useFetch, styles,
} from "./shared/analyticsPrimitives.js";

const API_URL = process.env.REACT_APP_API_URL;
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

function VisitDetailsDialog({ drill, filters, onClose }) {
  const params = useMemo(() => ({ ...filters, ...(drill?.params || {}), limit: 50 }), [filters, drill]);
  const { data, loading, error } = useFetch("/site-events/visitor-details", params, drill?.key || "");
  const visits = data?.visits || [];
  const formatTime = (value) => value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
    : "—";

  return <Dialog open={Boolean(drill)} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle sx={{ pr: 7 }}>
      <Typography component="div" variant="h6" fontWeight={750}>Visitor details</Typography>
      <Typography component="div" variant="body2" color="text.secondary">{drill?.label}</Typography>
      <IconButton aria-label="Close visitor details" onClick={onClose} sx={{ position: "absolute", right: 14, top: 14 }}>
        <CloseRoundedIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <Alert severity="info" sx={{ mb: 2 }}>
        Location means the place selected or searched on MassClick. Exact GPS and raw IP addresses are not stored.
      </Alert>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error">Could not load visitor details: {error}</Alert>}
      {!loading && !error && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {number(data?.total)} visit session{data?.total === 1 ? "" : "s"} found. Showing the latest {number(visits.length)}.
      </Typography>}
      <TableContainer sx={{ maxHeight: 520, border: "1px solid #e4e9f1", borderRadius: 2 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Visit time (IST)</TableCell>
              <TableCell>Visitor</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Browser</TableCell>
              <TableCell>Place</TableCell>
              <TableCell>Pages visited</TableCell>
              <TableCell align="right">Events</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visits.map((visit) => <TableRow key={visit.sessionId} hover>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTime(visit.startedAt)}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{visit.visitor}</TableCell>
              <TableCell><Chip size="small" label={DEVICE_LABELS[visit.device] || visit.device} /></TableCell>
              <TableCell>{visit.browser || "Other"}</TableCell>
              <TableCell>{visit.location || "Not selected"}</TableCell>
              <TableCell sx={{ minWidth: 220, maxWidth: 360 }}>
                <Tooltip title={(visit.pages || []).join(" • ") || "No page recorded"}>
                  <span>{(visit.pages || []).slice(0, 3).join(", ") || "—"}{visit.pages?.length > 3 ? ` +${visit.pages.length - 3}` : ""}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right">{number(visit.events)}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
      {!loading && !visits.length && !error && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No visitor sessions found.</Typography>}
    </DialogContent>
  </Dialog>;
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

export default function SiteAnalytics() {
  const [filters, setFilters] = useState({ mode: "preset", days: 28, hours: 0, start: "", end: "", device: "", browser: "" });
  const [granularity, setGranularity] = useState("day");
  const [reloadToken, setReloadToken] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [drill, setDrill] = useState(null);

  const queryFilters = useMemo(() => {
    // Pinned to the browser tracker so app traffic never lands in this panel.
    // Server-side this also matches rows written before the platform field
    // existed; mobile lives in its own App Analytics panel.
    const f = { platform: "web" };
    if (filters.mode === "custom" && (filters.start || filters.end)) {
      if (filters.start) f.start = filters.start;
      if (filters.end) f.end = filters.end;
    } else {
      if (filters.hours) f.hours = filters.hours;
      else f.days = filters.days;
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
  const periodLabel = overview.data?.hours
    ? `previous ${overview.data.hours} hours`
    : overview.data?.days ? `previous ${overview.data.days} days` : "previous period";

  // Weekly / monthly buckets sum the daily figures.
  const chartData = useMemo(() => {
    const source = granularity === "day" || granularity === "hour" ? trendRows : Object.values(trendRows.reduce((acc, row) => {
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
    : filters.hours ? `Last ${filters.hours} hours` : `Last ${filters.days} day${filters.days === 1 ? "" : "s"}`;

  const hasActiveFilter = filters.device || filters.browser || filters.mode === "custom";
  const patch = (changes) => setFilters((prev) => ({ ...prev, ...changes }));
  const resetFilters = () => { setFilters({ mode: "preset", days: 28, hours: 0, start: "", end: "", device: "", browser: "" }); setGranularity("day"); };
  const selectPreset = (value) => {
    if (value === "hour-range") {
      patch({ hours: filters.hours || 24 });
      setGranularity("hour");
    } else {
      patch({ days: Number(value), hours: 0 });
      if (granularity === "hour") setGranularity("day");
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError("");
    try {
      const big = { ...queryFilters, limit: 500, page: 1 };
      const [pagesRes, bizRes, campaignsRes, searchRes, devicesRes] = await Promise.all([
        axiosInstance.get(`${API_URL}/site-events/top-pages`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/top-businesses`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/campaigns`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/top-searches`, { params: big }),
        axiosInstance.get(`${API_URL}/site-events/devices`, { params: queryFilters }),
      ]);
      await exportSiteAnalyticsWorkbook({
        overview: overview.data,
        trends: trendRows,
        devices: devicesRes.data,
        pages: pagesRes.data?.pages || [],
        businesses: bizRes.data?.businesses || [],
        campaigns: campaignsRes.data?.campaigns || [],
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
    {
      key: "visitors", icon: GroupsRoundedIcon, label: "Unique Visitors", tone: "blue", color: "#2563eb",
      caption: `${number(current.identifiedUsers)} logged-in customers seen`,
      help: "Distinct devices that fired at least one tracked event. Counted per device, not per person — the same person on a phone and a laptop counts twice.",
    },
    {
      key: "newVisitors", icon: PersonAddAlt1RoundedIcon, label: "New Users", tone: "indigo", color: "#4f46e5", caption: vs,
      help: "Devices whose first-ever tracked event falls inside this period. Raw events are kept for 90 days, so someone returning after a longer gap counts as new again.",
    },
    {
      key: "sessions", icon: LoginRoundedIcon, label: "Sessions", tone: "purple", color: "#7c3aed", caption: vs,
      help: "Distinct browsing sessions. One visitor can start several sessions across the period.",
    },
    {
      key: "pageViews", icon: VisibilityRoundedIcon, label: "Page Views", tone: "orange", color: "#f97316", caption: vs,
      help: "Every page view, including repeat views of the same page by the same visitor.",
    },
    {
      key: "pagesPerSession", icon: LayersRoundedIcon, label: "Pages / Session", tone: "green", color: "#16a34a", caption: vs, format: "decimal",
      help: "Page views divided by sessions. Higher means visitors browse deeper before leaving.",
    },
    {
      key: "bounceRate", icon: TrendingDownRoundedIcon, label: "Bounce Rate", tone: "red", color: "#e11d48", caption: vs, format: "percent", invert: true,
      help: "Share of sessions that never got past their first page. Lower is better, so this card turns green when it falls.",
    },
    {
      key: "businessViews", icon: StorefrontRoundedIcon, label: "Business Views", tone: "pink", color: "#db2777", caption: vs,
      help: "Times a business listing was opened or shown in detail.",
    },
    {
      key: "interactions", icon: TouchAppRoundedIcon, label: "Interactions", tone: "teal", color: "#0d9488", caption: vs, seriesKey: "businessClicks",
      help: "Every click on a business listing — calls, WhatsApp, directions, enquiries and number reveals combined.",
    },
    {
      key: "leads", icon: PhoneInTalkRoundedIcon, label: "Leads", tone: "green", color: "#16a34a", caption: "Calls, WhatsApp & enquiries",
      help: "Interactions that signal real buying intent: calls, WhatsApp and enquiry submissions. Directions and number reveals are excluded.",
    },
    {
      key: "formSubmissions", icon: DescriptionRoundedIcon, label: "Form Submissions", tone: "indigo", color: "#4f46e5", caption: vs,
      help: "Enquiry forms submitted from a business listing. These are also counted inside Leads.",
    },
    {
      key: "searches", icon: SearchRoundedIcon, label: "Searches", tone: "blue", color: "#2563eb", caption: vs,
      help: "Searches run on the site — both typed queries and category browsing. The Top Searches table can split the two.",
    },
    {
      key: "resultClicks", icon: AdsClickRoundedIcon, label: "Result Clicks", tone: "purple", color: "#7c3aed", caption: vs,
      help: "Clicks on a business from a search results page. Compare against Searches to gauge how well results match intent.",
    },
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

  const campaignColumns = [
    { key: "source", label: "Source", render: (r) => <span className={styles.mono} title={r.source}>{r.source}</span> },
    { key: "medium", label: "Medium", render: (r) => r.medium },
    { key: "campaign", label: "Campaign", render: (r) => <span className={styles.strongCell} title={r.campaign}>{r.campaign}</span> },
    { key: "sessions", label: "Sessions", numeric: true, sortable: true, width: 96, render: (r) => number(r.sessions) },
    { key: "visitors", label: "Visitors", numeric: true, sortable: true, width: 92, render: (r) => number(r.visitors) },
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
        <TextField select size="small" value={filters.hours ? "hour-range" : filters.days} onChange={(e) => selectPreset(e.target.value)} className={styles.field}>
          <MenuItem value="hour-range">Last 24 hours</MenuItem>
          {PRESETS.map((d) => <MenuItem key={d} value={d}>Last {d} day{d === 1 ? "" : "s"}</MenuItem>)}
        </TextField>
      ) : (
        <>
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={filters.start} inputProps={{ max: filters.end || todayISO() }} onChange={(e) => patch({ start: e.target.value })} className={styles.field} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={filters.end} inputProps={{ min: filters.start, max: todayISO() }} onChange={(e) => patch({ end: e.target.value })} className={styles.field} />
        </>
      )}

      {filters.mode === "preset" && Boolean(filters.hours) && (
        <TextField
          select size="small" label="Hours" value={filters.hours}
          onChange={(e) => patch({ hours: Number(e.target.value) })}
          className={styles.field}
        >
          {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => (
            <MenuItem key={hour} value={hour}>Last {hour} hour{hour === 1 ? "" : "s"}</MenuItem>
          ))}
        </TextField>
      )}

      {/* displayEmpty is required: "" is the "all" value, and MUI renders a
          blank select for any value that fails its isFilled() check. */}
      <TextField
        select size="small" value={filters.device} onChange={(e) => patch({ device: e.target.value })} className={styles.field}
        SelectProps={{ displayEmpty: true }}
        InputProps={{ startAdornment: <InputAdornment position="start"><DevicesRoundedIcon fontSize="small" /></InputAdornment> }}
      >
        {DEVICE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>

      <TextField
        select size="small" value={filters.browser} onChange={(e) => patch({ browser: e.target.value })} className={styles.field}
        SelectProps={{ displayEmpty: true }}
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
        help={m.help}
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
        title={granularity === "hour" ? "Hourly Traffic Overview" : "Daily Traffic Overview"}
        subtitle={granularity === "hour" ? "Visitors, page views and business clicks by hour (IST)." : granularity === "day" ? "Visitors, page views and business clicks per day (IST)." : "Daily figures summed into buckets (IST)."}
        action={<TextField select size="small" value={granularity} onChange={(e) => setGranularity(e.target.value)} className={styles.granularity}>
          {(filters.hours ? [{ value: "hour", label: "Hour" }] : GRANULARITIES).map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
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

    <CampaignLinkBuilder />

    <div className={styles.grid}>
      <SectionTable
        title="Traffic Sources" tone="indigo" icon={CampaignRoundedIcon}
        url="/site-events/campaigns" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="campaigns" columns={campaignColumns} defaultSort="sessions" searchPlaceholder="Search source, medium, campaign…"
        onRowClick={(row) => setDrill({
          key: `campaign-${row.source}-${row.medium}-${row.campaign}`,
          label: `${row.source} / ${row.medium} / ${row.campaign}`,
          params: { kind: "campaign", source: row.source, medium: row.medium, campaign: row.campaign },
        })}
        renderSummary={(data) => data ? `${number(data.total)} sources · ${number(data.totals?.sessions)} sessions · ${number(data.totals?.leads)} leads.` : "Where sessions came from — QR scans, banners, ads, referrals, or direct."}
      />

      <SectionTable
        title="Top Pages" tone="blue" icon={ArticleRoundedIcon}
        url="/site-events/top-pages" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="pages" columns={pageColumns} defaultSort="views" searchPlaceholder="Search pages…"
        onRowClick={(row) => setDrill({ key: `page-${row.path}`, label: `Page: ${row.path || "/"}`, params: { kind: "page", path: row.path || "/" } })}
        renderSummary={(data) => data ? `${number(data.total)} paths · ${number(data.totals?.views)} views.` : "Pages your visitors love the most."}
      />

      <SectionTable
        title="Top Businesses" tone="pink" icon={StorefrontRoundedIcon}
        url="/site-events/top-businesses" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="businesses" columns={businessColumns} defaultSort="views" searchPlaceholder="Search businesses…"
        onRowClick={(row) => setDrill({ key: `business-${row.businessId}`, label: `Business: ${row.name || row.businessId}`, params: { kind: "business", businessId: row.businessId } })}
        renderSummary={(data) => data ? `${number(data.total)} businesses · ${number(data.totals?.leads)} leads. Hover a click count for the breakdown.` : "Businesses getting the most attention."}
      />

      <SectionTable
        title="Top Searches" tone="orange" icon={SearchRoundedIcon}
        url="/site-events/top-searches" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="searches" columns={searchColumns} defaultSort="count" searchPlaceholder="Search keywords…"
        extraDefaults={{ searchType: "", zeroOnly: false }}
        onRowClick={(row) => setDrill({ key: `search-${row.query}`, label: `Search: ${row.query}`, params: { kind: "search", searchQuery: row.query } })}
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
    {drill && <VisitDetailsDialog drill={drill} filters={queryFilters} onClose={() => setDrill(null)} />}

    <p className={styles.footnote}>All times are in Asia/Kolkata timezone</p>
  </Box>;
}
