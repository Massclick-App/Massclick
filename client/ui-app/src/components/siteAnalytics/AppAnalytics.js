// App Analytics — the mobile-app counterpart of SiteAnalytics.
//
// Reads the same /site-events endpoints, pinned to the app platforms, and
// shares every presentational primitive with the web panel (see
// ./shared/analyticsPrimitives.js) so the two pages stay consistent.
//
// Differences from the web panel, and why:
//   • "Top Pages" reads as "Top Screens" — the app sends go_router paths.
//   • Devices & browsers is replaced by Platform / App version / OS version:
//     the app's User-Agent has no browser, and every app row classifies as
//     device "mobile", so those two filters carry no signal here.
//   • No Traffic Sources or campaign builder — the app has no referrer and no
//     UTM landing params until deep linking ships (web-parity P1-15).
//   • No Excel export yet: the shared workbook models a devices/browsers
//     sheet and a campaigns sheet, neither of which the app produces.

import React, { useMemo, useState } from "react";
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
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import {
  Donut, Metric, PanelHead, SectionTable,
  GRANULARITIES, PRESETS,
  bucketOf, labelOfBucket, number, todayISO,
  useFetch, styles,
} from "./shared/analyticsPrimitives.js";

// "All app platforms" is a comma list the server turns into a $in — see
// dimensionMatch in webAnalyticsHelper.js. Deliberately never includes "web".
const ALL_APP = "android,ios";
const PLATFORM_OPTIONS = [
  { value: ALL_APP, label: "All app platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
];
const PLATFORM_LABELS = { android: "Android", ios: "iOS", web: "Web" };

const breakdownText = (row) => {
  const a = row.actions || {};
  const parts = [
    a.call ? `${number(a.call)} calls` : "",
    a.whatsapp ? `${number(a.whatsapp)} WhatsApp` : "",
    a.direction ? `${number(a.direction)} directions` : "",
    a.enquiry ? `${number(a.enquiry)} enquiries` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No taps yet";
};

function PlatformSplit({ filters, reloadToken }) {
  const { data, loading, error } = useFetch("/site-events/app-versions", filters, reloadToken);
  return <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "16px" }}>
    <PanelHead
      icon={PhoneIphoneRoundedIcon}
      tone="purple"
      title="Platform &amp; app version"
      subtitle="Which builds your users are actually on — useful before forcing an update."
    />
    {loading && <LinearProgress className={styles.tableLoading} />}
    {error && <p className={styles.empty}>Could not load: {error}</p>}
    <div className={styles.splitColumns}>
      <Donut heading="Platform" rows={data?.platforms} labelOf={(r) => PLATFORM_LABELS[r.platform] || r.platform || "Other"} />
      <Donut heading="App version" rows={data?.appVersions} labelOf={(r) => r.appVersion || "Unknown"} />
      <Donut heading="OS version" rows={data?.osVersions} labelOf={(r) => r.osVersion || "Unknown"} />
    </div>
  </Paper>;
}

export default function AppAnalytics() {
  const [filters, setFilters] = useState({ mode: "preset", days: 28, start: "", end: "", platform: ALL_APP });
  const [granularity, setGranularity] = useState("day");
  const [reloadToken, setReloadToken] = useState(0);

  const queryFilters = useMemo(() => {
    const f = { platform: filters.platform || ALL_APP };
    if (filters.mode === "custom" && (filters.start || filters.end)) {
      if (filters.start) f.start = filters.start;
      if (filters.end) f.end = filters.end;
    } else {
      f.days = filters.days;
    }
    return f;
  }, [filters]);

  const filterKey = JSON.stringify(queryFilters);

  const overview = useFetch("/site-events/overview", queryFilters, reloadToken);
  const trends = useFetch("/site-events/trends", queryFilters, reloadToken);

  const current = overview.data?.current || {};
  const previous = overview.data?.previous || {};
  const trendRows = useMemo(() => trends.data?.trend || [], [trends.data]);
  const periodLabel = overview.data?.days ? `previous ${overview.data.days} days` : "previous period";

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

  const hasActiveFilter = filters.platform !== ALL_APP || filters.mode === "custom";
  const resetFilters = () => setFilters({ mode: "preset", days: 28, start: "", end: "", platform: ALL_APP });
  const patch = (changes) => setFilters((prev) => ({ ...prev, ...changes }));

  const anyLoading = overview.loading || trends.loading;
  const vs = `vs ${periodLabel}`;

  const metrics = [
    {
      key: "visitors", icon: GroupsRoundedIcon, label: "Unique Devices", tone: "blue", color: "#2563eb",
      caption: `${number(current.identifiedUsers)} logged-in customers seen`,
      help: "Distinct app installs that fired at least one tracked event. Counted per install — a reinstall starts a new device.",
    },
    {
      key: "newVisitors", icon: PersonAddAlt1RoundedIcon, label: "New Users", tone: "indigo", color: "#4f46e5", caption: vs,
      help: "Installs whose first-ever tracked event falls inside this period. Raw events are kept for 90 days, so someone returning after a longer gap counts as new again.",
    },
    {
      key: "sessions", icon: LoginRoundedIcon, label: "Sessions", tone: "purple", color: "#7c3aed", caption: vs,
      help: "A session ends after 30 minutes of inactivity, including time spent with the app backgrounded.",
    },
    {
      key: "pageViews", icon: VisibilityRoundedIcon, label: "Screen Views", tone: "orange", color: "#f97316", caption: vs,
      help: "Every screen opened, including repeat visits to the same screen in one session.",
    },
    {
      key: "pagesPerSession", icon: LayersRoundedIcon, label: "Screens / Session", tone: "green", color: "#16a34a", caption: vs, format: "decimal",
      help: "Screen views divided by sessions. Higher means users go deeper before leaving.",
    },
    {
      key: "bounceRate", icon: TrendingDownRoundedIcon, label: "Bounce Rate", tone: "red", color: "#e11d48", caption: vs, format: "percent", invert: true,
      help: "Share of sessions that never got past their first screen. Lower is better, so this card turns green when it falls.",
    },
    {
      key: "businessViews", icon: StorefrontRoundedIcon, label: "Business Views", tone: "pink", color: "#db2777", caption: vs,
      help: "Business detail screens opened. Counted once per business per session.",
    },
    {
      key: "interactions", icon: TouchAppRoundedIcon, label: "Interactions", tone: "teal", color: "#0d9488", caption: vs, seriesKey: "businessClicks",
      help: "Every tap on a business action — calls, WhatsApp, directions and enquiries combined.",
    },
    {
      key: "leads", icon: PhoneInTalkRoundedIcon, label: "Leads", tone: "green", color: "#16a34a", caption: "Calls, WhatsApp & enquiries",
      help: "Taps that signal real buying intent: calls, WhatsApp and enquiries. Directions are excluded.",
    },
    {
      key: "formSubmissions", icon: DescriptionRoundedIcon, label: "Enquiries", tone: "indigo", color: "#4f46e5", caption: vs,
      help: "Enquiry actions started from a business listing. These are also counted inside Leads.",
    },
    {
      key: "searches", icon: SearchRoundedIcon, label: "Searches", tone: "blue", color: "#2563eb", caption: vs,
      help: "Searches run in the app — both typed queries and category browsing. The Top Searches table can split the two.",
    },
    {
      key: "resultClicks", icon: AdsClickRoundedIcon, label: "Result Taps", tone: "purple", color: "#7c3aed", caption: vs,
      help: "Taps on a business from a results list. Compare against Searches to gauge how well results match intent.",
    },
  ];

  const screenColumns = [
    { key: "path", label: "Screen", render: (r) => <span className={styles.mono} title={r.path}>{r.path || "/"}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 92, render: (r) => number(r.views) },
    { key: "sessions", label: "Sessions", numeric: true, sortable: true, width: 96, render: (r) => number(r.sessions) },
  ];

  const businessColumns = [
    { key: "name", label: "Business", render: (r) => <span className={styles.strongCell} title={r.name || r.businessId}>{r.name || r.businessId}</span> },
    { key: "views", label: "Views", numeric: true, sortable: true, width: 82, render: (r) => number(r.views) },
    {
      key: "clicks", label: "Taps", numeric: true, sortable: true, width: 82,
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
        <h1 className={styles.title}>App analysis</h1>
        <p className={styles.subtitle}>How people use the Massclick mobile app, in real time.</p>
      </div>
      <div className={styles.headerActions}>
        <Tooltip title="Refresh data">
          <span><IconButton onClick={() => setReloadToken((n) => n + 1)} disabled={anyLoading} className={styles.refreshBtn}><RefreshRoundedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
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
        select size="small" value={filters.platform} onChange={(e) => patch({ platform: e.target.value })} className={styles.field}
        InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIphoneRoundedIcon fontSize="small" /></InputAdornment> }}
      >
        {PLATFORM_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>

      {hasActiveFilter && <Button size="small" startIcon={<RestartAltRoundedIcon />} onClick={resetFilters} className={styles.resetBtn}>Reset</Button>}
      <span className={styles.rangeNote}>{rangeLabel}</span>
    </Paper>

    {anyLoading && <LinearProgress className={styles.loading} />}
    {overview.error && <Alert severity="warning" className={styles.alert}>Overview could not load: {overview.error}</Alert>}

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
        title="Daily App Activity"
        subtitle={granularity === "day" ? "Users, screen views and business taps per day (IST)." : "Daily figures summed into buckets (IST)."}
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
            <Bar dataKey="pageViews" name="Screen Views" fill="#bfdbfe" radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Bar dataKey="businessClicks" name="Business Taps" fill="#fed7aa" radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="visitors" name="Unique Devices" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#7c3aed" strokeWidth={2} dot={false} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Paper>

    <div className={styles.grid}>
      <SectionTable
        title="Top Screens" tone="blue" icon={ArticleRoundedIcon}
        url="/site-events/top-pages" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="pages" columns={screenColumns} defaultSort="views" searchPlaceholder="Search screens…"
        renderSummary={(data) => data ? `${number(data.total)} screens · ${number(data.totals?.views)} views.` : "Screens your users open the most."}
      />

      <SectionTable
        title="Top Businesses" tone="pink" icon={StorefrontRoundedIcon}
        url="/site-events/top-businesses" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="businesses" columns={businessColumns} defaultSort="views" searchPlaceholder="Search businesses…"
        renderSummary={(data) => data ? `${number(data.total)} businesses · ${number(data.totals?.leads)} leads. Hover a tap count for the breakdown.` : "Businesses getting the most attention in the app."}
      />

      <SectionTable
        title="Top Searches" tone="orange" icon={SearchRoundedIcon}
        url="/site-events/top-searches" filters={queryFilters} filterKey={filterKey} reloadToken={reloadToken}
        rowsKey="searches" columns={searchColumns} defaultSort="count" searchPlaceholder="Search keywords…"
        extraDefaults={{ searchType: "", zeroOnly: false }}
        renderSummary={(data) => data ? `${number(data.typedSearches)} typed · ${number(data.categorySearches)} category · ${number(data.total)} distinct.` : "Most searched keywords in the app."}
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

      <PlatformSplit filters={queryFilters} reloadToken={reloadToken} />
    </div>

    <p className={styles.footnote}>All times are in Asia/Kolkata timezone</p>
  </Box>;
}
