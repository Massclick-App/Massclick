import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  fetchGa4Overview,
  fetchGa4Trends,
  fetchGa4TrafficSources,
  fetchGa4Locations,
  fetchGa4Devices,
  fetchGa4Conversions,
  fetchGa4Cities,
  fetchGa4Browsers,
  fetchGa4Pages,
  fetchGa4LandingPages,
  fetchGa4Acquisition,
  fetchGa4EngagementOverview,
  fetchGa4EcommerceOverview,
  fetchGa4TopItems,
  fetchGa4Referrers,
  fetchGa4Campaigns,
  fetchGa4OperatingSystems,
  fetchGa4Platforms,
  fetchGa4DeviceModels,
  fetchGa4ScreenResolutions,
  fetchGa4Regions,
  fetchGa4Continents,
  fetchGa4SubContinents,
  fetchGa4NewVsReturning,
  fetchGa4DayOfWeek,
  fetchGa4HourOfDay,
  fetchGa4Screens,
} from "../../redux/actions/ga4Action.js";
import styles from "./ga4Analytics.module.css";
import { createScopedClassNames } from "../../utils/createScopedClassNames.js";

const cx = createScopedClassNames(styles);

const PIE_COLORS = ["#4f8ef7", "#f7794f", "#4ff798", "#a78bfa"];

const STAT_ICONS = {
  Visitors: "👥",
  "Total Users": "👤",
  "New Users": "🆕",
  Sessions: "📈",
  "Engaged Sessions": "🤝",
  "Page Views": "👁️",
  Conversions: "🎯",
  Events: "⚡",
  Revenue: "💰",
  "Avg. Session Duration": "⏱️",
  "Bounce Rate": "🚪",
  "Engagement Rate": "💡",
  "Sessions / User": "🔁",
  "Pageviews / Session": "📑",
  "Engagement Duration": "⏳",
  "Events / User": "⚡",
  "Event Value": "💵",
  "Scrolled Users": "📜",
  "Session Conv. Rate": "🎯",
  Transactions: "🛒",
  "Purchase Revenue": "💰",
  "Add to Carts": "🛍️",
  Checkouts: "🧾",
  "Purchaser Conv. Rate": "🎯",
  "First-Time Purchasers": "🆕",
  "Avg. Purchase Revenue": "💳",
};

const TabPanel = ({ children, value, index }) =>
  value === index ? <Box className={cx("tab-content")}>{children}</Box> : null;

const StatCard = ({ label, value, delta, suffix = "", invertDelta }) => {
  const isUp = delta > 0;
  const isGood = invertDelta ? !isUp : isUp;
  const icon = STAT_ICONS[label] || "📊";

  return (
    <Card className={cx("stat-card")}>
      <Box className={cx("stat-card-content")}>
        <Box className={cx("stat-card-icon")}>{icon}</Box>
        <Typography className={cx("stat-label")}>{label}</Typography>
        <Typography className={cx("stat-value")}>
          {value !== undefined && value !== null ? `${value.toLocaleString()}${suffix}` : "—"}
        </Typography>
        {delta !== null && delta !== undefined && (
          <span className={cx("stat-delta", isGood ? "stat-delta-up" : "stat-delta-down")}>
            {isUp ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </Box>
    </Card>
  );
};

const simpleTable = (columns, rows, emptyIcon, emptyLabel) => (
  <Box className={cx("table-wrapper")}>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align || "left"} sx={{ fontWeight: 700, color: "#111827" }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((row, i) => (
            <TableRow key={i} hover sx={{ "&:hover": { backgroundColor: "#f8fafc" }, borderBottom: "1px solid #f3f4f6" }}>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align || "left"} sx={col.cellSx}>
                  {col.render ? col.render(row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!rows?.length && (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Box className={cx("empty-state")}>
                  <div className={cx("empty-state-icon")}>{emptyIcon}</div>
                  <Typography sx={{ fontWeight: 600, color: "#111827" }}>{emptyLabel}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

const sectionLoading = (text) => (
  <Box className={cx("loading-container")}>
    <CircularProgress size={28} />
    <Typography className={cx("loading-text")}>{text}</Typography>
  </Box>
);

// Tab index -> what to fetch the first time that tab is opened. Overview (0)
// is fetched eagerly on mount instead, since it's the default landing tab.
const buildTabFetchers = (dispatch) => ({
  1: () => dispatch(fetchGa4EngagementOverview()),
  2: () => {
    dispatch(fetchGa4TrafficSources());
    dispatch(fetchGa4Referrers());
  },
  3: () => {
    dispatch(fetchGa4Acquisition());
    dispatch(fetchGa4Campaigns());
  },
  4: () => {
    dispatch(fetchGa4Pages());
    dispatch(fetchGa4Screens());
  },
  5: () => dispatch(fetchGa4LandingPages()),
  6: () => {
    dispatch(fetchGa4Locations());
    dispatch(fetchGa4Cities());
    dispatch(fetchGa4Regions());
    dispatch(fetchGa4Continents());
    dispatch(fetchGa4SubContinents());
  },
  7: () => {
    dispatch(fetchGa4Devices());
    dispatch(fetchGa4Browsers());
    dispatch(fetchGa4OperatingSystems());
    dispatch(fetchGa4Platforms());
    dispatch(fetchGa4DeviceModels());
    dispatch(fetchGa4ScreenResolutions());
  },
  8: () => {
    dispatch(fetchGa4NewVsReturning());
    dispatch(fetchGa4DayOfWeek());
    dispatch(fetchGa4HourOfDay());
  },
  9: () => {
    dispatch(fetchGa4EcommerceOverview());
    dispatch(fetchGa4TopItems());
  },
  10: () => dispatch(fetchGa4Conversions()),
});

export default function Ga4Analytics() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const [fetchedTabs, setFetchedTabs] = useState({});

  const state = useSelector((s) => s.ga4Reducer || {});
  const {
    overview, overviewLoading, overviewError,
    trends, trendsLoading,
    trafficSources, trafficSourcesLoading,
    referrers, referrersLoading,
    acquisition, acquisitionLoading,
    campaigns, campaignsLoading,
    pages, pagesLoading,
    screens, screensLoading,
    landingPages, landingPagesLoading,
    locations, locationsLoading,
    cities, citiesLoading,
    regions, regionsLoading,
    continents, continentsLoading,
    subContinents, subContinentsLoading,
    devices, devicesLoading,
    browsers, browsersLoading,
    operatingSystems, operatingSystemsLoading,
    platforms, platformsLoading,
    deviceModels, deviceModelsLoading,
    screenResolutions, screenResolutionsLoading,
    newVsReturning, newVsReturningLoading,
    dayOfWeek, dayOfWeekLoading,
    hourOfDay, hourOfDayLoading,
    engagementOverview, engagementOverviewLoading,
    ecommerceOverview, ecommerceOverviewLoading,
    topItems, topItemsLoading,
    conversions, conversionsLoading,
  } = state;

  useEffect(() => {
    dispatch(fetchGa4Overview());
    dispatch(fetchGa4Trends());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === 0 || fetchedTabs[activeTab]) return;
    const fetchers = buildTabFetchers(dispatch);
    const fetcher = fetchers[activeTab];
    if (fetcher) {
      fetcher();
      setFetchedTabs((prev) => ({ ...prev, [activeTab]: true }));
    }
  }, [activeTab, dispatch, fetchedTabs]);

  return (
    <Box className={cx("ga4-page")}>
      <Box className={cx("page-header")}>
        <Typography className={cx("page-title")}>Google Analytics 4</Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 2,
          borderColor: "#e5e7eb",
          mb: 3,
          backgroundColor: "#ffffff",
          borderRadius: "12px 12px 0 0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          "& .MuiTab-root": {
            fontWeight: 600,
            fontSize: "14px",
            color: "#6b7280",
            transition: "all 0.3s ease",
            "&:hover": { color: "#111827", backgroundColor: "#f9fafb" },
          },
          "& .Mui-selected": { color: "#3b82f6", backgroundColor: "#eff6ff" },
          "& .MuiTabs-indicator": { backgroundColor: "#3b82f6", height: 3 },
        }}
      >
        <Tab label="📊 Overview" />
        <Tab label="💡 Engagement" />
        <Tab label="🔗 Traffic Sources" />
        <Tab label="🧭 Acquisition" />
        <Tab label="📄 Pages" />
        <Tab label="🚪 Landing Pages" />
        <Tab label="🌍 Locations" />
        <Tab label="💻 Technology" />
        <Tab label="👥 Audience" />
        <Tab label="🛒 Ecommerce" />
        <Tab label="🎯 Conversions" />
      </Tabs>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={activeTab} index={0}>
        {overviewError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Unable to fetch GA4 data</Typography>
            {overviewError} — Ensure the GA4 service account has been added as a
            Viewer in GA4 Admin &gt; Property Access Management.
          </Alert>
        )}

        {/* AI-powered summary — Phase 2. Helper functions already return clean,
            structured data so a future summarization step can consume it directly. */}

        {overviewLoading ? (
          sectionLoading("Fetching your analytics...")
        ) : overview ? (
          <>
            <Box className={cx("stat-cards-row")}>
              <StatCard label="Visitors" value={overview.current?.activeUsers} delta={overview.delta?.activeUsers} />
              <StatCard label="Total Users" value={overview.current?.totalUsers} delta={overview.delta?.totalUsers} />
              <StatCard label="Sessions" value={overview.current?.sessions} delta={overview.delta?.sessions} />
              <StatCard label="Page Views" value={overview.current?.pageViews} delta={overview.delta?.pageViews} />
              <StatCard label="Conversions" value={overview.current?.conversions} delta={overview.delta?.conversions} />
            </Box>

            <Typography className={cx("section-title")} sx={{ mb: 2 }}>💡 Engagement Snapshot</Typography>
            <Box className={cx("stat-cards-row")}>
              <StatCard label="New Users" value={overview.current?.newUsers} delta={overview.delta?.newUsers} />
              <StatCard label="Engaged Sessions" value={overview.current?.engagedSessions} delta={overview.delta?.engagedSessions} />
              <StatCard label="Events" value={overview.current?.eventCount} delta={overview.delta?.eventCount} />
              <StatCard label="Revenue" value={overview.current?.totalRevenue} delta={overview.delta?.totalRevenue} suffix=" ₹" />
              <StatCard label="Avg. Session Duration" value={overview.current?.averageSessionDuration} delta={overview.delta?.averageSessionDuration} suffix="s" />
              <StatCard label="Bounce Rate" value={overview.current?.bounceRate} delta={overview.delta?.bounceRate} suffix="%" invertDelta />
              <StatCard label="Engagement Rate" value={overview.current?.engagementRate} delta={overview.delta?.engagementRate} suffix="%" />
            </Box>

            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>📈 {overview.days || 90}-Day Traffic Trend</Typography>
              {trendsLoading ? (
                sectionLoading(null)
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(d) => d.slice(4, 6) + "/" + d.slice(6, 8)}
                      stroke="#d1d5db"
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "16px" }} iconType="line" />
                    <Line yAxisId="left" type="monotone" dataKey="activeUsers" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Visitors" />
                    <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2.5} dot={false} name="Sessions" />
                    <Line yAxisId="right" type="monotone" dataKey="pageViews" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Page Views" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </>
        ) : (
          !overviewLoading && (
            <Box className={cx("empty-state")}>
              <div className={cx("empty-state-icon")}>📭</div>
              <Typography sx={{ fontWeight: 600, color: "#111827" }}>No data available yet</Typography>
              <Typography sx={{ fontSize: "13px", color: "#6b7280", maxWidth: "400px" }}>
                Make sure the GA4 service account has been added as a Viewer for this property.
              </Typography>
            </Box>
          )
        )}
      </TabPanel>

      {/* ── Tab 1: Engagement ── */}
      <TabPanel value={activeTab} index={1}>
        {engagementOverviewLoading ? (
          sectionLoading("Loading engagement metrics...")
        ) : engagementOverview ? (
          <Box className={cx("stat-cards-row")}>
            <StatCard label="Sessions / User" value={engagementOverview.current?.sessionsPerUser} delta={engagementOverview.delta?.sessionsPerUser} />
            <StatCard label="Pageviews / Session" value={engagementOverview.current?.screenPageViewsPerSession} delta={engagementOverview.delta?.screenPageViewsPerSession} />
            <StatCard label="Engagement Duration" value={engagementOverview.current?.userEngagementDuration} delta={engagementOverview.delta?.userEngagementDuration} suffix="s" />
            <StatCard label="Events / User" value={engagementOverview.current?.eventCountPerUser} delta={engagementOverview.delta?.eventCountPerUser} />
            <StatCard label="Event Value" value={engagementOverview.current?.eventValue} delta={engagementOverview.delta?.eventValue} />
            <StatCard label="Scrolled Users" value={engagementOverview.current?.scrolledUsers} delta={engagementOverview.delta?.scrolledUsers} />
            <StatCard label="Session Conv. Rate" value={engagementOverview.current?.sessionConversionRate} delta={engagementOverview.delta?.sessionConversionRate} suffix="%" />
          </Box>
        ) : (
          <Box className={cx("empty-state")}>
            <div className={cx("empty-state-icon")}>💡</div>
            <Typography sx={{ fontWeight: 600, color: "#111827" }}>No engagement data available</Typography>
          </Box>
        )}
      </TabPanel>

      {/* ── Tab 2: Traffic Sources ── */}
      <TabPanel value={activeTab} index={2}>
        {trafficSourcesLoading ? (
          sectionLoading("Loading traffic sources...")
        ) : (
          simpleTable(
            [
              { key: "source", label: "Source" },
              { key: "medium", label: "Medium" },
              { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            trafficSources,
            "🔗",
            "No traffic source data found"
          )
        )}

        <Typography className={cx("section-title")} sx={{ mt: 4 }}>🔙 Top Referrers</Typography>
        {referrersLoading ? (
          sectionLoading(null)
        ) : (
          simpleTable(
            [
              { key: "pageReferrer", label: "Referrer" },
              { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            referrers,
            "🔙",
            "No referrer data found"
          )
        )}
      </TabPanel>

      {/* ── Tab 3: Acquisition ── */}
      <TabPanel value={activeTab} index={3}>
        <Typography className={cx("section-description")} sx={{ mb: 2 }}>
          First-touch acquisition channel — which source brought each user in for the very first time.
        </Typography>
        {acquisitionLoading ? (
          sectionLoading("Loading acquisition data...")
        ) : (
          simpleTable(
            [
              { key: "firstUserSource", label: "First Source" },
              { key: "newUsers", label: "New Users", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#6b7280" } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            acquisition,
            "🧭",
            "No acquisition data found"
          )
        )}

        <Typography className={cx("section-title")} sx={{ mt: 4 }}>📣 Top Campaigns</Typography>
        {campaignsLoading ? (
          sectionLoading(null)
        ) : (
          simpleTable(
            [
              { key: "campaign", label: "Campaign" },
              { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "newUsers", label: "New Users", align: "right", cellSx: { color: "#6b7280" } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            campaigns,
            "📣",
            "No campaign data found (only sessions tagged with UTM campaign params show here)"
          )
        )}
      </TabPanel>

      {/* ── Tab 4: Pages ── */}
      <TabPanel value={activeTab} index={4}>
        {pagesLoading ? (
          sectionLoading("Loading pages...")
        ) : (
          simpleTable(
            [
              { key: "pageTitle", label: "Page Title" },
              { key: "pagePath", label: "Path", cellSx: { color: "#6b7280", fontSize: "13px" } },
              { key: "hostName", label: "Host", cellSx: { color: "#6b7280", fontSize: "13px" } },
              { key: "pageViews", label: "Page Views", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            pages,
            "📄",
            "No page data found"
          )
        )}

        <Typography className={cx("section-title")} sx={{ mt: 4 }}>📱 Unified Screens</Typography>
        <Typography className={cx("section-description")}>
          Combined app + web screen names — mostly useful if this property ever adds a mobile app data stream.
        </Typography>
        {screensLoading ? (
          sectionLoading(null)
        ) : (
          simpleTable(
            [
              { key: "screenName", label: "Screen / Page Name" },
              { key: "pageViews", label: "Views", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
            ],
            screens,
            "📱",
            "No screen data found"
          )
        )}
      </TabPanel>

      {/* ── Tab 5: Landing Pages ── */}
      <TabPanel value={activeTab} index={5}>
        {landingPagesLoading ? (
          sectionLoading("Loading landing pages...")
        ) : (
          simpleTable(
            [
              { key: "landingPage", label: "Landing Page" },
              { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
              { key: "engagementRate", label: "Engagement Rate", align: "right", cellSx: { color: "#6b7280" }, render: (row) => `${row.engagementRate}%` },
            ],
            landingPages,
            "🚪",
            "No landing page data found"
          )
        )}
      </TabPanel>

      {/* ── Tab 6: Locations ── */}
      <TabPanel value={activeTab} index={6}>
        {locationsLoading ? (
          sectionLoading("Loading geographic data...")
        ) : (
          <>
            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>🌍 Top Countries by Sessions</Typography>
              {locations?.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={locations.slice(0, 15)} layout="vertical" margin={{ left: 100, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                    <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" width={90} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                    <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box className={cx("empty-state")} sx={{ minHeight: "300px" }}>
                  <Typography sx={{ color: "#6b7280" }}>No geographic data available</Typography>
                </Box>
              )}
            </Box>

            {simpleTable(
              [
                { key: "country", label: "Country", render: (row) => `🌐 ${row.country}` },
                { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
              ],
              locations,
              "🌍",
              "No country data available"
            )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🏙️ Top Cities</Typography>
            {citiesLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "city", label: "City" },
                    { key: "country", label: "Country", cellSx: { color: "#6b7280" } },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  cities,
                  "🏙️",
                  "No city data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🗺️ Top Regions</Typography>
            {regionsLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "region", label: "Region / State" },
                    { key: "country", label: "Country", cellSx: { color: "#6b7280" } },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  regions,
                  "🗺️",
                  "No region data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🌐 Continents & Sub-Continents</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              <Box>
                {continentsLoading
                  ? sectionLoading(null)
                  : simpleTable(
                      [
                        { key: "continent", label: "Continent" },
                        { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                        { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                      ],
                      continents,
                      "🌐",
                      "No continent data available"
                    )}
              </Box>
              <Box>
                {subContinentsLoading
                  ? sectionLoading(null)
                  : simpleTable(
                      [
                        { key: "subContinent", label: "Sub-Continent" },
                        { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                        { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                      ],
                      subContinents,
                      "🌐",
                      "No sub-continent data available"
                    )}
              </Box>
            </Box>
          </>
        )}
      </TabPanel>

      {/* ── Tab 7: Technology (device, browser, OS, platform, model, resolution) ── */}
      <TabPanel value={activeTab} index={7}>
        {devicesLoading ? (
          sectionLoading("Loading device analytics...")
        ) : (
          <>
            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>📱 Sessions Distribution by Device</Typography>
              {devices?.length ? (
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie
                      data={devices}
                      dataKey="sessions"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ device, percent }) => `${device} ${(percent * 100).toFixed(1)}%`}
                    >
                      {devices.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value) => `${value} sessions`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box className={cx("empty-state")} sx={{ minHeight: "300px" }}>
                  <Typography sx={{ color: "#6b7280" }}>No device data available</Typography>
                </Box>
              )}
            </Box>

            {simpleTable(
              [
                {
                  key: "device",
                  label: "Device",
                  cellSx: { textTransform: "capitalize", fontWeight: 600, color: "#111827" },
                  render: (row) => `${row.device === "mobile" || row.device === "tablet" ? "📱" : "💻"} ${row.device}`,
                },
                { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
              ],
              devices,
              "📱",
              "No device data available"
            )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🧭 Browsers</Typography>
            {browsersLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "browser", label: "Browser" },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  browsers,
                  "🧭",
                  "No browser data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🖥️ Operating Systems</Typography>
            {operatingSystemsLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "operatingSystem", label: "OS" },
                    { key: "operatingSystemVersion", label: "Version", cellSx: { color: "#6b7280" } },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  operatingSystems,
                  "🖥️",
                  "No OS data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🧩 Platforms</Typography>
            {platformsLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "platform", label: "Platform" },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  platforms,
                  "🧩",
                  "No platform data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>📲 Device Models</Typography>
            {deviceModelsLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "deviceModel", label: "Device Model" },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  deviceModels,
                  "📲",
                  "No device model data available"
                )}

            <Typography className={cx("section-title")} sx={{ mt: 4 }}>🖼️ Screen Resolutions</Typography>
            {screenResolutionsLoading
              ? sectionLoading(null)
              : simpleTable(
                  [
                    { key: "screenResolution", label: "Resolution" },
                    { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                    { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                  ],
                  screenResolutions,
                  "🖼️",
                  "No screen resolution data available"
                )}
          </>
        )}
      </TabPanel>

      {/* ── Tab 8: Audience (new vs returning, day of week, hour of day) ── */}
      <TabPanel value={activeTab} index={8}>
        <Typography className={cx("section-title")}>👥 New vs Returning</Typography>
        {newVsReturningLoading
          ? sectionLoading(null)
          : simpleTable(
              [
                { key: "segment", label: "Segment", cellSx: { textTransform: "capitalize" } },
                { key: "sessions", label: "Sessions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
                { key: "activeUsers", label: "Visitors", align: "right", cellSx: { color: "#6b7280" } },
                { key: "conversions", label: "Conversions", align: "right", cellSx: { color: "#6b7280" } },
              ],
              newVsReturning,
              "👥",
              "No new-vs-returning data available"
            )}

        <Box className={cx("chart-card")} sx={{ mt: 3 }}>
          <Typography className={cx("section-title")}>📅 Sessions by Day of Week</Typography>
          {dayOfWeekLoading ? (
            sectionLoading(null)
          ) : dayOfWeek?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dayOfWeek" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box className={cx("empty-state")} sx={{ minHeight: "200px" }}>
              <Typography sx={{ color: "#6b7280" }}>No day-of-week data available</Typography>
            </Box>
          )}
        </Box>

        <Box className={cx("chart-card")} sx={{ mt: 3 }}>
          <Typography className={cx("section-title")}>🕐 Sessions by Hour of Day</Typography>
          {hourOfDayLoading ? (
            sectionLoading(null)
          ) : hourOfDay?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={hourOfDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" tickFormatter={(h) => `${h}:00`} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#d1d5db" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }} labelFormatter={(h) => `${h}:00`} />
                <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box className={cx("empty-state")} sx={{ minHeight: "200px" }}>
              <Typography sx={{ color: "#6b7280" }}>No hour-of-day data available</Typography>
            </Box>
          )}
        </Box>
      </TabPanel>

      {/* ── Tab 9: Ecommerce ── */}
      <TabPanel value={activeTab} index={9}>
        <Typography className={cx("section-description")} sx={{ mb: 2 }}>
          These will show 0 if this GA4 property doesn't track ecommerce events (purchase, add_to_cart, begin_checkout, etc).
        </Typography>
        {ecommerceOverviewLoading ? (
          sectionLoading("Loading ecommerce metrics...")
        ) : ecommerceOverview ? (
          <Box className={cx("stat-cards-row")}>
            <StatCard label="Transactions" value={ecommerceOverview.current?.transactions} delta={ecommerceOverview.delta?.transactions} />
            <StatCard label="Purchase Revenue" value={ecommerceOverview.current?.purchaseRevenue} delta={ecommerceOverview.delta?.purchaseRevenue} suffix=" ₹" />
            <StatCard label="Add to Carts" value={ecommerceOverview.current?.addToCarts} delta={ecommerceOverview.delta?.addToCarts} />
            <StatCard label="Checkouts" value={ecommerceOverview.current?.checkouts} delta={ecommerceOverview.delta?.checkouts} />
            <StatCard label="Purchaser Conv. Rate" value={ecommerceOverview.current?.purchaserConversionRate} delta={ecommerceOverview.delta?.purchaserConversionRate} suffix="%" />
            <StatCard label="First-Time Purchasers" value={ecommerceOverview.current?.firstTimePurchasers} delta={ecommerceOverview.delta?.firstTimePurchasers} />
            <StatCard label="Avg. Purchase Revenue" value={ecommerceOverview.current?.averagePurchaseRevenue} delta={ecommerceOverview.delta?.averagePurchaseRevenue} suffix=" ₹" />
          </Box>
        ) : (
          <Box className={cx("empty-state")}>
            <div className={cx("empty-state-icon")}>🛒</div>
            <Typography sx={{ fontWeight: 600, color: "#111827" }}>No ecommerce data available</Typography>
          </Box>
        )}

        <Typography className={cx("section-title")} sx={{ mt: 4 }}>🏷️ Top Items by Revenue</Typography>
        {topItemsLoading
          ? sectionLoading(null)
          : simpleTable(
              [
                { key: "itemName", label: "Item" },
                { key: "itemCategory", label: "Category", cellSx: { color: "#6b7280" } },
                { key: "itemRevenue", label: "Revenue", align: "right", cellSx: { color: "#059669", fontWeight: 600 }, render: (row) => `₹${row.itemRevenue}` },
              ],
              topItems,
              "🏷️",
              "No item revenue data found"
            )}
      </TabPanel>

      {/* ── Tab 10: Conversions ── */}
      <TabPanel value={activeTab} index={10}>
        {conversionsLoading ? (
          sectionLoading("Loading conversions...")
        ) : (
          simpleTable(
            [
              { key: "eventName", label: "Event" },
              { key: "conversions", label: "Conversions", align: "right", cellSx: { color: "#059669", fontWeight: 600 } },
              { key: "eventCount", label: "Event Count", align: "right", cellSx: { color: "#6b7280" } },
            ],
            conversions,
            "🎯",
            "No conversion events found"
          )
        )}
      </TabPanel>
    </Box>
  );
}
