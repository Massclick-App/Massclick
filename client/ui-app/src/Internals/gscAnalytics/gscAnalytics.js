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
  Paper,
  Chip,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Link,
  Alert,
  Skeleton,
  Button,
  IconButton,
  Tooltip as MuiTooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
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
  fetchGscOverview,
  fetchGscTrends,
  fetchGscQueries,
  fetchGscPages,
  fetchGscDevices,
  fetchGscCountries,
  fetchGscOpportunities,
  fetchGscKeywordGaps,
  fetchTrackedKeywords,
  addTrackedKeyword,
  deleteTrackedKeyword,
  checkKeywordRank,
  manualCheckKeywordRank,
  checkAllKeywords,
  fetchKeywordHistory,
  fetchKeywordQuota,
} from "../../redux/actions/gscAction.js";
import styles from "./gscAnalytics.module.css";
import { createScopedClassNames } from "../../utils/createScopedClassNames.js";

const cx = createScopedClassNames(styles);

const PIE_COLORS = ["#4f8ef7", "#f7794f", "#4ff798", "#a78bfa"];

const STAT_ICONS = {
  "Total Clicks": "👆",
  Impressions: "👁️",
  "Avg CTR (%)": "🔍",
  "Avg Position": "🎯",
};

const TabPanel = ({ children, value, index }) =>
  value === index ? <Box className={cx("tab-content")}>{children}</Box> : null;

const StatCard = ({ label, value, delta, invertDelta }) => {
  const isUp = delta > 0;
  const isGood = invertDelta ? !isUp : isUp;
  const icon = STAT_ICONS[label] || "📊";

  return (
    <Card className={cx("stat-card")}>
      <Box className={cx("stat-card-content")}>
        <Box className={cx("stat-card-icon")}>{icon}</Box>
        <Typography className={cx("stat-label")}>{label}</Typography>
        <Typography className={cx("stat-value")}>
          {value !== undefined && value !== null ? value.toLocaleString() : "—"}
        </Typography>
        {delta !== null && delta !== undefined && (
          <span
            className={cx(
              "stat-delta",
              isGood ? "stat-delta-up" : "stat-delta-down",
            )}
          >
            {isUp ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </Box>
    </Card>
  );
};

const PositionBadge = ({ position }) => {
  let className = "position-badge-11plus";
  if (position <= 3) className = "position-badge-1to3";
  else if (position <= 10) className = "position-badge-4to10";

  return (
    <span className={cx("position-badge", className)}>
      #{Math.round(position)}
    </span>
  );
};

const emptyKeywordForm = {
  keyword: "",
  location: "",
  device: "desktop",
  category: "",
  targetUrl: "",
  notes: "",
  source: "manual",
};
const emptyManualForm = { rank: "", page: "", url: "", screenshot: "" };

export default function GscAnalytics() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const [quickWinsOnly, setQuickWinsOnly] = useState(false);
  const [queriesFetched, setQueriesFetched] = useState(false);
  const [pagesFetched, setPagesFetched] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeywordForm, setNewKeywordForm] = useState(emptyKeywordForm);
  const [manualDialogFor, setManualDialogFor] = useState(null);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [screenshotFileName, setScreenshotFileName] = useState("");
  const [historyDialogFor, setHistoryDialogFor] = useState(null);

  const {
    overview,
    overviewLoading,
    overviewError,
    trends,
    trendsLoading,
    queries,
    queriesLoading,
    pages,
    pagesLoading,
    devices,
    devicesLoading,
    countries,
    countriesLoading,
    opportunities,
    opportunitiesLoading,
    keywordGaps,
    keywordGapsLoading,
    trackedKeywords,
    trackedKeywordsLoading,
    keywordCheckingId,
    keywordCheckError,
    keywordHistory,
    keywordHistoryLoading,
    keywordQuota,
    checkAllLoading,
    checkAllResult,
    checkAllError,
  } = useSelector((state) => state.gscReducer || {});

  useEffect(() => {
    dispatch(fetchGscOverview());
    dispatch(fetchGscTrends());
    dispatch(fetchGscDevices());
    dispatch(fetchGscCountries());
    dispatch(fetchGscOpportunities());
    dispatch(fetchGscKeywordGaps());
    dispatch(fetchTrackedKeywords());
    dispatch(fetchKeywordQuota());
  }, [dispatch]);

  const openAddDialog = (prefill = {}) => {
    setNewKeywordForm({ ...emptyKeywordForm, ...prefill });
    setAddDialogOpen(true);
  };

  const handleAddKeyword = async () => {
    if (!newKeywordForm.keyword.trim()) return;
    await dispatch(addTrackedKeyword(newKeywordForm));
    setAddDialogOpen(false);
    setNewKeywordForm(emptyKeywordForm);
  };

  const handleDeleteKeyword = (id) => {
    dispatch(deleteTrackedKeyword(id));
  };

  const handleCheckNow = (id) => {
    dispatch(checkKeywordRank(id));
  };

  const handleCheckAll = () => {
    dispatch(checkAllKeywords());
  };

  const openManualDialog = (id) => {
    setManualForm(emptyManualForm);
    setScreenshotFileName("");
    setManualDialogFor(id);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setManualForm((prev) => ({ ...prev, screenshot: reader.result || "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    if (!manualDialogFor) return;
    await dispatch(manualCheckKeywordRank(manualDialogFor, manualForm));
    setManualDialogFor(null);
    setManualForm(emptyManualForm);
    setScreenshotFileName("");
  };

  const openHistoryDialog = (id) => {
    setHistoryDialogFor(id);
    dispatch(fetchKeywordHistory(id));
  };

  useEffect(() => {
    if (activeTab === 1 && !queriesFetched) {
      dispatch(fetchGscQueries());
      setQueriesFetched(true);
    }
    if (activeTab === 2 && !pagesFetched) {
      dispatch(fetchGscPages());
      setPagesFetched(true);
    }
  }, [activeTab, dispatch, queriesFetched, pagesFetched]);

  useEffect(() => {
    if (pages && pages.length > 0) {
      console.log("Pages data loaded:", pages);
    }
  }, [pages]);

  const displayedQueries = quickWinsOnly
    ? (queries || []).filter((q) => q.position >= 4 && q.position <= 20)
    : queries || [];

  return (
    <Box className={cx("gsc-page")}>
      <Box className={cx("page-header")}>
        <Typography className={cx("page-title")}>
          Google Search Console
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
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
            "&:hover": {
              color: "#111827",
              backgroundColor: "#f9fafb",
            },
          },
          "& .Mui-selected": {
            color: "#3b82f6",
            backgroundColor: "#eff6ff",
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "#3b82f6",
            height: 3,
          },
        }}
      >
        <Tab label="📊 Overview" />
        <Tab label="🔍 Queries" />
        <Tab label="📄 Pages" />
        <Tab label="📱 Devices" />
        <Tab label="🌍 Countries" />
        <Tab label="🚀 Opportunities" />
        <Tab label="🎯 Tracked Keywords" />
      </Tabs>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={activeTab} index={0}>
        {overviewError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              Unable to fetch GSC data
            </Typography>
            {overviewError} — Ensure the GSC service account has been added as a
            Restricted user.
          </Alert>
        )}
        {overviewLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Fetching your analytics...
            </Typography>
          </Box>
        ) : overview ? (
          <>
            <Box className={cx("stat-cards-row")}>
              <StatCard
                label="Total Clicks"
                value={overview.current?.clicks}
                delta={overview.delta?.clicks}
              />
              <StatCard
                label="Impressions"
                value={overview.current?.impressions}
                delta={overview.delta?.impressions}
              />
              <StatCard
                label="Avg CTR (%)"
                value={overview.current?.ctr}
                delta={overview.delta?.ctr}
              />
              <StatCard
                label="Avg Position"
                value={overview.current?.position}
                delta={overview.delta?.position}
                invertDelta
              />
            </Box>

            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>
                📈 {overview.days || 90}-Day Traffic Trend
              </Typography>
              {trendsLoading ? (
                <Box className={cx("loading-container")}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(d) => d.slice(5)}
                      stroke="#d1d5db"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      stroke="#d1d5db"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      stroke="#d1d5db"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "16px" }}
                      iconType="line"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                      name="Clicks"
                      isAnimationActive
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      name="Impressions"
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </>
        ) : (
          !overviewLoading && (
            <Box className={cx("empty-state")}>
              <div className={cx("empty-state-icon")}>📭</div>
              <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                No data available yet
              </Typography>
              <Typography
                sx={{ fontSize: "13px", color: "#6b7280", maxWidth: "400px" }}
              >
                Make sure your Google Search Console service account has been
                added as a Restricted user in GSC.
              </Typography>
            </Box>
          )
        )}
      </TabPanel>

      {/* ── Tab 1: Queries ── */}
      <TabPanel value={activeTab} index={1}>
        <Box
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={quickWinsOnly}
                onChange={(e) => setQuickWinsOnly(e.target.checked)}
              />
            }
            label="Show Quick Wins only (position 4–20)"
            sx={{ m: 0 }}
          />
          <Chip
            label={`${displayedQueries.length} result${displayedQueries.length !== 1 ? "s" : ""}`}
            variant="outlined"
            size="small"
          />
        </Box>
        {queriesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading queries...
            </Typography>
          </Box>
        ) : (
          <Box className={cx("table-wrapper")}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                      Query
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Clicks
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Impressions
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      CTR
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Position
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedQueries.map((row, i) => (
                    <TableRow
                      key={i}
                      hover
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <TableCell sx={{ color: "#111827", fontWeight: 500 }}>
                        {row.query}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "#059669", fontWeight: 600 }}
                      >
                        {row.clicks}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>
                        {row.impressions}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>
                        {row.ctr}%
                      </TableCell>
                      <TableCell align="center">
                        <PositionBadge position={row.position} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedQueries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box className={cx("empty-state")}>
                          <div className={cx("empty-state-icon")}>🔍</div>
                          <Typography
                            sx={{ fontWeight: 600, color: "#111827" }}
                          >
                            No queries found
                          </Typography>
                          <Typography
                            sx={{ fontSize: "13px", color: "#6b7280" }}
                          >
                            {quickWinsOnly
                              ? "Try disabling the Quick Wins filter"
                              : "Your data will appear here soon"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>

      {/* ── Tab 2: Pages ── */}
      <TabPanel value={activeTab} index={2}>
        {pagesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading pages...
            </Typography>
          </Box>
        ) : (
          <Box className={cx("table-wrapper")}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                      Page URL
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Clicks
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Impressions
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      CTR
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, color: "#111827" }}
                    >
                      Position
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(pages || []).map((row, i) => (
                    <TableRow
                      key={i}
                      hover
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <TableCell
                        sx={{
                          color: "#111827",
                          fontWeight: 500,
                          maxWidth: "450px",
                        }}
                      >
                        <Link
                          href={row.page}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={row.page}
                          sx={{
                            color: "#7c3aed",
                            fontWeight: 500,
                            textDecoration: "none",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            "&:hover": {
                              color: "#6d28d9",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {row.page}
                        </Link>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "#059669", fontWeight: 600 }}
                      >
                        {row.clicks}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>
                        {row.impressions}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>
                        {row.ctr}%
                      </TableCell>
                      <TableCell align="center">
                        <PositionBadge position={row.position} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!pages?.length && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box className={cx("empty-state")}>
                          <div className={cx("empty-state-icon")}>📄</div>
                          <Typography
                            sx={{ fontWeight: 600, color: "#111827" }}
                          >
                            No pages found
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>

      {/* ── Tab 3: Devices ── */}
      <TabPanel value={activeTab} index={3}>
        {devicesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading device analytics...
            </Typography>
          </Box>
        ) : (
          <>
            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>
                📱 Clicks Distribution by Device
              </Typography>
              {devices?.length ? (
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie
                      data={devices}
                      dataKey="clicks"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ device, percent }) =>
                        `${device} ${(percent * 100).toFixed(1)}%`
                      }
                      animationBegin={0}
                      animationDuration={600}
                    >
                      {devices.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => `${value} clicks`}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box className={cx("empty-state")} sx={{ minHeight: "300px" }}>
                  <Typography sx={{ color: "#6b7280" }}>
                    No device data available
                  </Typography>
                </Box>
              )}
            </Box>

            <Box className={cx("table-wrapper")}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: "#f8fafc",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                        Device
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        Clicks
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        Impressions
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        CTR
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(devices || []).map((row, i) => (
                      <TableRow
                        key={i}
                        sx={{
                          "&:hover": { backgroundColor: "#f8fafc" },
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <TableCell
                          sx={{
                            textTransform: "capitalize",
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {row.device === "mobile"
                            ? "📱"
                            : row.device === "tablet"
                              ? "📱"
                              : "💻"}{" "}
                          {row.device}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "#059669", fontWeight: 600 }}
                        >
                          {row.clicks}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>
                          {row.impressions}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>
                          {row.ctr}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </TabPanel>

      {/* ── Tab 4: Countries ── */}
      <TabPanel value={activeTab} index={4}>
        {countriesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading geographic data...
            </Typography>
          </Box>
        ) : (
          <>
            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>
                🌍 Top 15 Countries by Impressions
              </Typography>
              {countries?.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={countries.slice(0, 15)}
                    layout="vertical"
                    margin={{ left: 100, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      stroke="#d1d5db"
                    />
                    <YAxis
                      type="category"
                      dataKey="country"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      stroke="#d1d5db"
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="impressions"
                      fill="url(#colorImpression)"
                      name="Impressions"
                      radius={[0, 8, 8, 0]}
                      animationDuration={600}
                    />
                    <defs>
                      <linearGradient
                        id="colorImpression"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor="#60a5fa"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box className={cx("empty-state")} sx={{ minHeight: "300px" }}>
                  <Typography sx={{ color: "#6b7280" }}>
                    No geographic data available
                  </Typography>
                </Box>
              )}
            </Box>

            <Box className={cx("table-wrapper")}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: "#f8fafc",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                        Country
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        Clicks
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        Impressions
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        CTR
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 700, color: "#111827" }}
                      >
                        Position
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(countries || []).map((row, i) => (
                      <TableRow
                        key={i}
                        hover
                        sx={{
                          "&:hover": { backgroundColor: "#f8fafc" },
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <TableCell
                          sx={{
                            textTransform: "capitalize",
                            fontWeight: 500,
                            color: "#111827",
                          }}
                        >
                          🌐 {row.country}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "#059669", fontWeight: 600 }}
                        >
                          {row.clicks}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>
                          {row.impressions}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>
                          {row.ctr}%
                        </TableCell>
                        <TableCell align="center">
                          <PositionBadge position={row.position} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!countries?.length && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Box className={cx("empty-state")}>
                            <div className={cx("empty-state-icon")}>🌍</div>
                            <Typography
                              sx={{ fontWeight: 600, color: "#111827" }}
                            >
                              No country data available
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </TabPanel>

      {/* ── Tab 5: Opportunities ── */}
      <TabPanel value={activeTab} index={5}>
        {opportunitiesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Analyzing opportunities...
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography className={cx("section-title")}>
                🚀 Quick Wins — Position 4–20
              </Typography>
              <Typography className={cx("section-description")}>
                These keywords are almost on page 1. Small improvements to
                content and titles can push them up.
              </Typography>
              <Box className={cx("table-wrapper")}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e5e7eb",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                          Query
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Position
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Impressions
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          CTR
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Track
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(opportunities?.quickWins || []).map((row, i) => (
                        <TableRow
                          key={i}
                          sx={{
                            "&:hover": { backgroundColor: "#f8fafc" },
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <TableCell sx={{ color: "#111827", fontWeight: 500 }}>
                            {row.query}
                          </TableCell>
                          <TableCell align="center">
                            <PositionBadge position={row.position} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: "#6b7280" }}>
                            {row.impressions}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "#6b7280" }}>
                            {row.ctr}%
                          </TableCell>
                          <TableCell align="center">
                            <MuiTooltip title="Track this keyword">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  openAddDialog({
                                    keyword: row.query,
                                    source: "quick-win",
                                  })
                                }
                              >
                                ➕
                              </IconButton>
                            </MuiTooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!opportunities?.quickWins?.length && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Box className={cx("empty-state")}>
                              <div className={cx("empty-state-icon")}>✨</div>
                              <Typography
                                sx={{ fontWeight: 600, color: "#111827" }}
                              >
                                No quick wins yet
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6b7280" }}
                              >
                                Great SEO performance — keep it up!
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography className={cx("section-title")}>
                ⚠️ Low CTR Alerts
              </Typography>
              <Typography className={cx("section-description")}>
                High visibility but low clicks — improve your title tags and
                meta descriptions to increase CTR.
              </Typography>
              <Box className={cx("table-wrapper")}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e5e7eb",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                          Query
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Impressions
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          CTR
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Position
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, color: "#111827" }}
                        >
                          Track
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(opportunities?.lowCtr || []).map((row, i) => (
                        <TableRow
                          key={i}
                          sx={{
                            "&:hover": { backgroundColor: "#fef3c7" },
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <TableCell sx={{ color: "#111827", fontWeight: 500 }}>
                            {row.query}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "#6b7280" }}>
                            {row.impressions}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "#dc2626", fontWeight: 600 }}
                          >
                            {row.ctr}%
                          </TableCell>
                          <TableCell align="center">
                            <PositionBadge position={row.position} />
                          </TableCell>
                          <TableCell align="center">
                            <MuiTooltip title="Track this keyword">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  openAddDialog({
                                    keyword: row.query,
                                    source: "quick-win",
                                  })
                                }
                              >
                                ➕
                              </IconButton>
                            </MuiTooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!opportunities?.lowCtr?.length && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Box className={cx("empty-state")}>
                              <div className={cx("empty-state-icon")}>👍</div>
                              <Typography
                                sx={{ fontWeight: 600, color: "#111827" }}
                              >
                                No low CTR alerts
                              </Typography>
                              <Typography
                                sx={{ fontSize: "13px", color: "#6b7280" }}
                              >
                                Your CTR is excellent
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            <Box>
              <Typography className={cx("section-title")}>
                🔍 Keyword Gaps
              </Typography>
              <Typography className={cx("section-description")}>
                Search keywords with no indexed content — create pages for these
                to capture untapped traffic.
              </Typography>
              {keywordGapsLoading ? (
                <Box className={cx("loading-container")}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <Box className={cx("table-wrapper")}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow
                          sx={{
                            backgroundColor: "#f8fafc",
                            borderBottom: "2px solid #e5e7eb",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                            Category
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                            City
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, color: "#111827" }}
                          >
                            Impressions
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, color: "#111827" }}
                          >
                            Clicks
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 700, color: "#111827" }}
                          >
                            Position
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 700, color: "#111827" }}
                          >
                            Has Content
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 700, color: "#111827" }}
                          >
                            Track
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(keywordGaps || []).slice(0, 50).map((row, i) => (
                          <TableRow
                            key={i}
                            sx={{
                              backgroundColor: !row.hasContent
                                ? "#fef2f2"
                                : "transparent",
                              "&:hover": {
                                backgroundColor: !row.hasContent
                                  ? "#fee2e2"
                                  : "#f8fafc",
                              },
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <TableCell
                              sx={{
                                textTransform: "capitalize",
                                fontWeight: 500,
                                color: "#111827",
                              }}
                            >
                              {row.category}
                            </TableCell>
                            <TableCell
                              sx={{
                                textTransform: "capitalize",
                                color: "#6b7280",
                              }}
                            >
                              {row.city}
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#6b7280" }}>
                              {row.impressions}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: "#059669", fontWeight: 600 }}
                            >
                              {row.clicks}
                            </TableCell>
                            <TableCell align="center">
                              <PositionBadge position={row.position} />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={row.hasContent ? "✓ Yes" : "✗ No"}
                                color={row.hasContent ? "success" : "error"}
                                size="small"
                                variant={row.hasContent ? "filled" : "outlined"}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <MuiTooltip title="Track this keyword">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    openAddDialog({
                                      keyword: `${row.category} in ${row.city}`,
                                      category: row.category,
                                      location: row.city,
                                      source: "keyword-gap",
                                    })
                                  }
                                >
                                  ➕
                                </IconButton>
                              </MuiTooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!keywordGaps?.length && (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <Box className={cx("empty-state")}>
                                <div className={cx("empty-state-icon")}>🎯</div>
                                <Typography
                                  sx={{ fontWeight: 600, color: "#111827" }}
                                >
                                  No keyword gaps found
                                </Typography>
                                <Typography
                                  sx={{ fontSize: "13px", color: "#6b7280" }}
                                >
                                  You're covering all relevant search terms
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </>
        )}
      </TabPanel>

      {/* ── Tab 6: Tracked Keywords ── */}
      <TabPanel value={activeTab} index={6}>
        {keywordCheckError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Rank check failed: {keywordCheckError}
          </Alert>
        )}
        {checkAllError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Check All failed: {checkAllError}
          </Alert>
        )}
        {checkAllResult && !checkAllError && (
          <Alert severity={checkAllResult.skipped?.length ? "warning" : "success"} sx={{ mb: 2 }}>
            Checked {checkAllResult.checked} keyword{checkAllResult.checked !== 1 ? "s" : ""}
            {checkAllResult.skipped?.length
              ? `, skipped ${checkAllResult.skipped.length} (quota exhausted or lookup failed): ${checkAllResult.skipped.join(", ")}`
              : ""}
          </Alert>
        )}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" onClick={() => openAddDialog()}>
              ➕ Add Keyword
            </Button>
            <Button
              variant="outlined"
              onClick={handleCheckAll}
              disabled={checkAllLoading || !(trackedKeywords || []).length}
            >
              {checkAllLoading ? "Checking..." : "🔄 Check All"}
            </Button>
            <Chip
              label={`${(trackedKeywords || []).length} keyword${(trackedKeywords || []).length !== 1 ? "s" : ""}`}
              variant="outlined"
              size="small"
            />
          </Box>
          {keywordQuota && (
            <Box sx={{ minWidth: "220px" }}>
              <Typography sx={{ fontSize: "12px", color: "#6b7280", mb: 0.5 }}>
                Google CSE quota today: {keywordQuota.used}/{keywordQuota.limit}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (keywordQuota.used / keywordQuota.limit) * 100)}
                color={keywordQuota.remaining <= 10 ? "warning" : "primary"}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Box>

        {trackedKeywordsLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>Loading tracked keywords...</Typography>
          </Box>
        ) : (
          <Box className={cx("table-wrapper")}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Keyword</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Location / Device</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: "#111827" }}>Rank</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: "#111827" }}>Δ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Last Checked</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: "#111827" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trackedKeywords || []).map((row) => (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <TableCell sx={{ color: "#111827", fontWeight: 500 }}>
                        {row.keyword}
                        {row.category && (
                          <Chip label={row.category} size="small" variant="outlined" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "#6b7280", fontSize: "13px" }}>
                        {row.location || "—"} · {row.device}
                      </TableCell>
                      <TableCell align="center">
                        {row.latest?.rank != null ? (
                          <PositionBadge position={row.latest.rank} />
                        ) : row.latest ? (
                          <Chip label="Not found" size="small" color="default" variant="outlined" />
                        ) : (
                          <Typography sx={{ fontSize: "12px", color: "#9ca3af" }}>Never checked</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {row.delta != null ? (
                          <span
                            className={cx(
                              "metric-chip",
                              row.delta > 0 ? "metric-chip-positive" : row.delta < 0 ? "metric-chip-negative" : ""
                            )}
                          >
                            {row.delta > 0 ? `↑${row.delta}` : row.delta < 0 ? `↓${Math.abs(row.delta)}` : "—"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "#6b7280", fontSize: "13px" }}>
                        {row.latest?.checkedAt ? (
                          <>
                            {new Date(row.latest.checkedAt).toLocaleDateString()}{" "}
                            <span title={row.latest.provider}>
                              {row.latest.provider === "manual" ? "✍️" : "🤖"}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <MuiTooltip title="Check rank now (Google CSE)">
                          <IconButton
                            size="small"
                            disabled={keywordCheckingId === row._id}
                            onClick={() => handleCheckNow(row._id)}
                          >
                            {keywordCheckingId === row._id ? "⏳" : "🔄"}
                          </IconButton>
                        </MuiTooltip>
                        <MuiTooltip title="Log a manual rank check">
                          <IconButton size="small" onClick={() => openManualDialog(row._id)}>
                            ✍️
                          </IconButton>
                        </MuiTooltip>
                        <MuiTooltip title="View history">
                          <IconButton size="small" onClick={() => openHistoryDialog(row._id)}>
                            📈
                          </IconButton>
                        </MuiTooltip>
                        <MuiTooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteKeyword(row._id)}>
                            🗑️
                          </IconButton>
                        </MuiTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(trackedKeywords || []).length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box className={cx("empty-state")}>
                          <div className={cx("empty-state-icon")}>🎯</div>
                          <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                            No tracked keywords yet
                          </Typography>
                          <Typography sx={{ fontSize: "13px", color: "#6b7280" }}>
                            Add a keyword here, or click "➕ Track" on a Quick Win or Keyword Gap row
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>

      {/* ── Add Keyword Dialog ── */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Track a New Keyword</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Keyword"
            value={newKeywordForm.keyword}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, keyword: e.target.value }))}
            autoFocus
            fullWidth
          />
          <TextField
            label="Location"
            placeholder="e.g. Trichy, Tamil Nadu, India"
            value={newKeywordForm.location}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, location: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Device"
            value={newKeywordForm.device}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, device: e.target.value }))}
            fullWidth
          >
            <MenuItem value="desktop">Desktop</MenuItem>
            <MenuItem value="mobile">Mobile</MenuItem>
          </TextField>
          <TextField
            label="Category (optional)"
            value={newKeywordForm.category}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, category: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Target URL (optional)"
            value={newKeywordForm.targetUrl}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, targetUrl: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Notes (optional)"
            value={newKeywordForm.notes}
            onChange={(e) => setNewKeywordForm((f) => ({ ...f, notes: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddKeyword} disabled={!newKeywordForm.keyword.trim()}>
            Add Keyword
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Manual Rank Check Dialog ── */}
      <Dialog open={Boolean(manualDialogFor)} onClose={() => setManualDialogFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Log a Manual Rank Check</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: "13px", color: "#6b7280" }}>
            Searched this keyword yourself? Enter what you saw — leave rank blank if you didn't find it.
          </Typography>
          <TextField
            label="Rank position"
            type="number"
            value={manualForm.rank}
            onChange={(e) => setManualForm((f) => ({ ...f, rank: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Result page URL (optional)"
            value={manualForm.url}
            onChange={(e) => setManualForm((f) => ({ ...f, url: e.target.value }))}
            fullWidth
          />
          <Button variant="outlined" component="label">
            {screenshotFileName || "Upload Screenshot (optional)"}
            <input type="file" accept="image/*" hidden onChange={handleScreenshotChange} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleManualSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── History Dialog ── */}
      <Dialog open={Boolean(historyDialogFor)} onClose={() => setHistoryDialogFor(null)} maxWidth="md" fullWidth>
        <DialogTitle>Rank History{keywordHistory?.keyword ? ` — ${keywordHistory.keyword}` : ""}</DialogTitle>
        <DialogContent>
          {keywordHistoryLoading ? (
            <Box className={cx("loading-container")}>
              <CircularProgress size={32} />
            </Box>
          ) : keywordHistory?.history?.length ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={keywordHistory.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="checkedAt"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString()}
                    stroke="#d1d5db"
                  />
                  <YAxis
                    reversed
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    stroke="#d1d5db"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(d) => new Date(d).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="rank"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3 }}
                    name="Rank"
                  />
                </LineChart>
              </ResponsiveContainer>

              <Box sx={{ mt: 2 }}>
                {[...keywordHistory.history].reverse().map((h, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      py: 1,
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <Typography sx={{ fontSize: "12px", color: "#6b7280", minWidth: "140px" }}>
                      {new Date(h.checkedAt).toLocaleString()}
                    </Typography>
                    <Chip
                      label={h.provider === "manual" ? "Manual" : "Auto"}
                      size="small"
                      variant="outlined"
                    />
                    <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                      {h.rank != null ? `#${h.rank}` : "Not found"}
                    </Typography>
                    {h.screenshotUrl && (
                      <Link href={h.screenshotUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={h.screenshotUrl}
                          alt="Rank check screenshot"
                          style={{ height: "36px", borderRadius: "4px", border: "1px solid #e5e7eb" }}
                        />
                      </Link>
                    )}
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Box className={cx("empty-state")}>
              <div className={cx("empty-state-icon")}>📈</div>
              <Typography sx={{ fontWeight: 600, color: "#111827" }}>No history yet</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
