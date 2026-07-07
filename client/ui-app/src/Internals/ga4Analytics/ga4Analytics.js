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
} from "../../redux/actions/ga4Action.js";
import styles from "./ga4Analytics.module.css";
import { createScopedClassNames } from "../../utils/createScopedClassNames.js";

const cx = createScopedClassNames(styles);

const PIE_COLORS = ["#4f8ef7", "#f7794f", "#4ff798", "#a78bfa"];

const STAT_ICONS = {
  Visitors: "👥",
  Sessions: "📈",
  "Page Views": "👁️",
  Conversions: "🎯",
};

const TabPanel = ({ children, value, index }) =>
  value === index ? <Box className={cx("tab-content")}>{children}</Box> : null;

const StatCard = ({ label, value, delta }) => {
  const isUp = delta > 0;
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
            className={cx("stat-delta", isUp ? "stat-delta-up" : "stat-delta-down")}
          >
            {isUp ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </Box>
    </Card>
  );
};

export default function Ga4Analytics() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const [trafficFetched, setTrafficFetched] = useState(false);
  const [locationsFetched, setLocationsFetched] = useState(false);
  const [devicesFetched, setDevicesFetched] = useState(false);
  const [conversionsFetched, setConversionsFetched] = useState(false);

  const {
    overview,
    overviewLoading,
    overviewError,
    trends,
    trendsLoading,
    trafficSources,
    trafficSourcesLoading,
    locations,
    locationsLoading,
    devices,
    devicesLoading,
    conversions,
    conversionsLoading,
  } = useSelector((state) => state.ga4Reducer || {});

  useEffect(() => {
    dispatch(fetchGa4Overview());
    dispatch(fetchGa4Trends());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === 1 && !trafficFetched) {
      dispatch(fetchGa4TrafficSources());
      setTrafficFetched(true);
    }
    if (activeTab === 2 && !locationsFetched) {
      dispatch(fetchGa4Locations());
      setLocationsFetched(true);
    }
    if (activeTab === 3 && !devicesFetched) {
      dispatch(fetchGa4Devices());
      setDevicesFetched(true);
    }
    if (activeTab === 4 && !conversionsFetched) {
      dispatch(fetchGa4Conversions());
      setConversionsFetched(true);
    }
  }, [activeTab, dispatch, trafficFetched, locationsFetched, devicesFetched, conversionsFetched]);

  return (
    <Box className={cx("ga4-page")}>
      <Box className={cx("page-header")}>
        <Typography className={cx("page-title")}>Google Analytics 4</Typography>
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
            "&:hover": { color: "#111827", backgroundColor: "#f9fafb" },
          },
          "& .Mui-selected": { color: "#3b82f6", backgroundColor: "#eff6ff" },
          "& .MuiTabs-indicator": { backgroundColor: "#3b82f6", height: 3 },
        }}
      >
        <Tab label="📊 Overview" />
        <Tab label="🔗 Traffic Sources" />
        <Tab label="🌍 Locations" />
        <Tab label="📱 Devices" />
        <Tab label="🎯 Conversions" />
      </Tabs>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={activeTab} index={0}>
        {overviewError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              Unable to fetch GA4 data
            </Typography>
            {overviewError} — Ensure the GA4 service account has been added as a
            Viewer in GA4 Admin &gt; Property Access Management.
          </Alert>
        )}

        {/* AI-powered summary — Phase 2. Helper functions already return clean,
            structured data so a future summarization step can consume it directly. */}

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
                label="Visitors"
                value={overview.current?.activeUsers}
                delta={overview.delta?.activeUsers}
              />
              <StatCard
                label="Sessions"
                value={overview.current?.sessions}
                delta={overview.delta?.sessions}
              />
              <StatCard
                label="Page Views"
                value={overview.current?.pageViews}
                delta={overview.delta?.pageViews}
              />
              <StatCard
                label="Conversions"
                value={overview.current?.conversions}
                delta={overview.delta?.conversions}
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
                      tickFormatter={(d) => d.slice(4, 6) + "/" + d.slice(6, 8)}
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
                    <Legend wrapperStyle={{ paddingTop: "16px" }} iconType="line" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="activeUsers"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                      name="Visitors"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sessions"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      name="Sessions"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      name="Page Views"
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
              <Typography sx={{ fontSize: "13px", color: "#6b7280", maxWidth: "400px" }}>
                Make sure the GA4 service account has been added as a Viewer for
                this property.
              </Typography>
            </Box>
          )
        )}
      </TabPanel>

      {/* ── Tab 1: Traffic Sources ── */}
      <TabPanel value={activeTab} index={1}>
        {trafficSourcesLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading traffic sources...
            </Typography>
          </Box>
        ) : (
          <Box className={cx("table-wrapper")}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Medium</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Sessions</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Visitors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trafficSources || []).map((row, i) => (
                    <TableRow key={i} hover sx={{ "&:hover": { backgroundColor: "#f8fafc" }, borderBottom: "1px solid #f3f4f6" }}>
                      <TableCell sx={{ color: "#111827", fontWeight: 500 }}>{row.source}</TableCell>
                      <TableCell sx={{ color: "#6b7280" }}>{row.medium}</TableCell>
                      <TableCell align="right" sx={{ color: "#059669", fontWeight: 600 }}>{row.sessions}</TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>{row.activeUsers}</TableCell>
                    </TableRow>
                  ))}
                  {!trafficSources?.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Box className={cx("empty-state")}>
                          <div className={cx("empty-state-icon")}>🔗</div>
                          <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                            No traffic source data found
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

      {/* ── Tab 2: Locations ── */}
      <TabPanel value={activeTab} index={2}>
        {locationsLoading ? (
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
                🌍 Top Countries by Sessions
              </Typography>
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

            <Box className={cx("table-wrapper")}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Country</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Sessions</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Visitors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(locations || []).map((row, i) => (
                      <TableRow key={i} hover sx={{ "&:hover": { backgroundColor: "#f8fafc" }, borderBottom: "1px solid #f3f4f6" }}>
                        <TableCell sx={{ fontWeight: 500, color: "#111827" }}>🌐 {row.country}</TableCell>
                        <TableCell align="right" sx={{ color: "#059669", fontWeight: 600 }}>{row.sessions}</TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>{row.activeUsers}</TableCell>
                      </TableRow>
                    ))}
                    {!locations?.length && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Box className={cx("empty-state")}>
                            <div className={cx("empty-state-icon")}>🌍</div>
                            <Typography sx={{ fontWeight: 600, color: "#111827" }}>No country data available</Typography>
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
                📱 Sessions Distribution by Device
              </Typography>
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
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                      formatter={(value) => `${value} sessions`}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box className={cx("empty-state")} sx={{ minHeight: "300px" }}>
                  <Typography sx={{ color: "#6b7280" }}>No device data available</Typography>
                </Box>
              )}
            </Box>

            <Box className={cx("table-wrapper")}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Device</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Sessions</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Visitors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(devices || []).map((row, i) => (
                      <TableRow key={i} sx={{ "&:hover": { backgroundColor: "#f8fafc" }, borderBottom: "1px solid #f3f4f6" }}>
                        <TableCell sx={{ textTransform: "capitalize", fontWeight: 600, color: "#111827" }}>
                          {row.device === "mobile" ? "📱" : row.device === "tablet" ? "📱" : "💻"} {row.device}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#059669", fontWeight: 600 }}>{row.sessions}</TableCell>
                        <TableCell align="right" sx={{ color: "#6b7280" }}>{row.activeUsers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </TabPanel>

      {/* ── Tab 4: Conversions ── */}
      <TabPanel value={activeTab} index={4}>
        {conversionsLoading ? (
          <Box className={cx("loading-container")}>
            <CircularProgress size={40} />
            <Typography className={cx("loading-text")}>
              Loading conversions...
            </Typography>
          </Box>
        ) : (
          <Box className={cx("table-wrapper")}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#111827" }}>Event</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Conversions</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>Event Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(conversions || []).map((row, i) => (
                    <TableRow key={i} hover sx={{ "&:hover": { backgroundColor: "#f8fafc" }, borderBottom: "1px solid #f3f4f6" }}>
                      <TableCell sx={{ color: "#111827", fontWeight: 500 }}>{row.eventName}</TableCell>
                      <TableCell align="right" sx={{ color: "#059669", fontWeight: 600 }}>{row.conversions}</TableCell>
                      <TableCell align="right" sx={{ color: "#6b7280" }}>{row.eventCount}</TableCell>
                    </TableRow>
                  ))}
                  {!conversions?.length && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Box className={cx("empty-state")}>
                          <div className={cx("empty-state-icon")}>🎯</div>
                          <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                            No conversion events found
                          </Typography>
                          <Typography sx={{ fontSize: "13px", color: "#6b7280" }}>
                            Mark key events as conversions in GA4 Admin to see them here.
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
    </Box>
  );
}
