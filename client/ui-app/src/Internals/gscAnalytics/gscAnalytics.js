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
} from "../../redux/actions/gscAction.js";
import styles from "./gscAnalytics.module.css";
import { createScopedClassNames } from "../../utils/createScopedClassNames.js";

const cx = createScopedClassNames(styles);

const PIE_COLORS = ["#4f8ef7", "#f7794f", "#4ff798", "#a78bfa"];

const TabPanel = ({ children, value, index }) =>
  value === index ? <Box className={cx("tab-content")}>{children}</Box> : null;

const StatCard = ({ label, value, delta, invertDelta }) => {
  const isUp = delta > 0;
  const isGood = invertDelta ? !isUp : isUp;
  return (
    <Card className={cx("stat-card")}>
      <CardContent>
        <Typography className={cx("stat-label")}>{label}</Typography>
        <Typography className={cx("stat-value")}>
          {value !== undefined && value !== null ? value.toLocaleString() : "—"}
        </Typography>
        {delta !== null && delta !== undefined && (
          <span className={cx(isGood ? "stat-delta-up" : "stat-delta-down")}>
            {isUp ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
};

export default function GscAnalytics() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const [quickWinsOnly, setQuickWinsOnly] = useState(false);
  const [queriesFetched, setQueriesFetched] = useState(false);
  const [pagesFetched, setPagesFetched] = useState(false);

  const {
    overview, overviewLoading, overviewError,
    trends, trendsLoading,
    queries, queriesLoading,
    pages, pagesLoading,
    devices, devicesLoading,
    countries, countriesLoading,
    opportunities, opportunitiesLoading,
    keywordGaps, keywordGapsLoading,
  } = useSelector((state) => state.gscReducer || {});

  useEffect(() => {
    dispatch(fetchGscOverview());
    dispatch(fetchGscTrends());
    dispatch(fetchGscDevices());
    dispatch(fetchGscCountries());
    dispatch(fetchGscOpportunities());
    dispatch(fetchGscKeywordGaps());
  }, [dispatch]);

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

  const displayedQueries = quickWinsOnly
    ? (queries || []).filter((q) => q.position >= 4 && q.position <= 20)
    : (queries || []);

  return (
    <Box className={cx("gsc-page")}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Google Search Console Analytics
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Queries" />
        <Tab label="Pages" />
        <Tab label="Devices" />
        <Tab label="Countries" />
        <Tab label="Opportunities" />
      </Tabs>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={activeTab} index={0}>
        {overviewError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {overviewError} — Ensure the GSC service account has been added as a Restricted user.
          </Alert>
        )}
        {overviewLoading ? (
          <CircularProgress />
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
                {overview.days || 90}-Day Traffic Trend
              </Typography>
              {trendsLoading ? (
                <CircularProgress />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#4f8ef7"
                      dot={false}
                      name="Clicks"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#f7794f"
                      dot={false}
                      name="Impressions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </>
        ) : (
          !overviewLoading && (
            <Typography color="text.secondary">
              No data available yet. Make sure the service account has been added to GSC.
            </Typography>
          )
        )}
      </TabPanel>

      {/* ── Tab 1: Queries ── */}
      <TabPanel value={activeTab} index={1}>
        <FormControlLabel
          control={
            <Switch
              checked={quickWinsOnly}
              onChange={(e) => setQuickWinsOnly(e.target.checked)}
            />
          }
          label="Quick Wins only (position 4–20)"
          sx={{ mb: 2 }}
        />
        {queriesLoading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Query</strong></TableCell>
                  <TableCell align="right"><strong>Clicks</strong></TableCell>
                  <TableCell align="right"><strong>Impressions</strong></TableCell>
                  <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                  <TableCell align="right"><strong>Position</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedQueries.map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{row.query}</TableCell>
                    <TableCell align="right">{row.clicks}</TableCell>
                    <TableCell align="right">{row.impressions}</TableCell>
                    <TableCell align="right">{row.ctr}</TableCell>
                    <TableCell align="right">{row.position}</TableCell>
                  </TableRow>
                ))}
                {displayedQueries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={2}>No data</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ── Tab 2: Pages ── */}
      <TabPanel value={activeTab} index={2}>
        {pagesLoading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Page</strong></TableCell>
                  <TableCell align="right"><strong>Clicks</strong></TableCell>
                  <TableCell align="right"><strong>Impressions</strong></TableCell>
                  <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                  <TableCell align="right"><strong>Position</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pages || []).map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Link
                        href={row.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        {row.page.replace("https://massclick.in", "") || "/"}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{row.clicks}</TableCell>
                    <TableCell align="right">{row.impressions}</TableCell>
                    <TableCell align="right">{row.ctr}</TableCell>
                    <TableCell align="right">{row.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ── Tab 3: Devices ── */}
      <TabPanel value={activeTab} index={3}>
        {devicesLoading ? (
          <CircularProgress />
        ) : (
          <Box className={cx("chart-card")}>
            <Typography className={cx("section-title")}>Clicks by Device</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={devices || []}
                  dataKey="clicks"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ device, percent }) =>
                    `${device} ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {(devices || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value} clicks`,
                    props.payload.device,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Device</strong></TableCell>
                    <TableCell align="right"><strong>Clicks</strong></TableCell>
                    <TableCell align="right"><strong>Impressions</strong></TableCell>
                    <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(devices || []).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ textTransform: "capitalize" }}>{row.device}</TableCell>
                      <TableCell align="right">{row.clicks}</TableCell>
                      <TableCell align="right">{row.impressions}</TableCell>
                      <TableCell align="right">{row.ctr}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>

      {/* ── Tab 4: Countries ── */}
      <TabPanel value={activeTab} index={4}>
        {countriesLoading ? (
          <CircularProgress />
        ) : (
          <>
            <Box className={cx("chart-card")}>
              <Typography className={cx("section-title")}>
                Top 15 Countries by Impressions
              </Typography>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={(countries || []).slice(0, 15)}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip />
                  <Bar dataKey="impressions" fill="#4f8ef7" name="Impressions" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Country</strong></TableCell>
                    <TableCell align="right"><strong>Clicks</strong></TableCell>
                    <TableCell align="right"><strong>Impressions</strong></TableCell>
                    <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                    <TableCell align="right"><strong>Position</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(countries || []).map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ textTransform: "capitalize" }}>{row.country}</TableCell>
                      <TableCell align="right">{row.clicks}</TableCell>
                      <TableCell align="right">{row.impressions}</TableCell>
                      <TableCell align="right">{row.ctr}</TableCell>
                      <TableCell align="right">{row.position}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>

      {/* ── Tab 5: Opportunities ── */}
      <TabPanel value={activeTab} index={5}>
        {opportunitiesLoading ? (
          <CircularProgress />
        ) : (
          <>
            <Typography className={cx("section-title")}>
              Quick Wins — Position 4–20
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              These queries are almost on page 1. Small content improvements can push them up.
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Query</strong></TableCell>
                    <TableCell align="right"><strong>Position</strong></TableCell>
                    <TableCell align="right"><strong>Impressions</strong></TableCell>
                    <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(opportunities?.quickWins || []).map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{row.query}</TableCell>
                      <TableCell align="right">{row.position}</TableCell>
                      <TableCell align="right">{row.impressions}</TableCell>
                      <TableCell align="right">{row.ctr}</TableCell>
                    </TableRow>
                  ))}
                  {!(opportunities?.quickWins?.length) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={1}>No quick wins yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography className={cx("section-title")}>Low CTR Alerts</Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              High visibility, few clicks — improve titles and meta descriptions.
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Query</strong></TableCell>
                    <TableCell align="right"><strong>Impressions</strong></TableCell>
                    <TableCell align="right"><strong>CTR (%)</strong></TableCell>
                    <TableCell align="right"><strong>Position</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(opportunities?.lowCtr || []).map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{row.query}</TableCell>
                      <TableCell align="right">{row.impressions}</TableCell>
                      <TableCell align="right">{row.ctr}</TableCell>
                      <TableCell align="right">{row.position}</TableCell>
                    </TableRow>
                  ))}
                  {!(opportunities?.lowCtr?.length) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={1}>No low CTR alerts</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Typography className={cx("section-title")}>Keyword Gaps</Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Search queries with no SEO page content yet — sorted by opportunity (gaps first).
        </Typography>
        {keywordGapsLoading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>City</strong></TableCell>
                  <TableCell align="right"><strong>Impressions</strong></TableCell>
                  <TableCell align="right"><strong>Clicks</strong></TableCell>
                  <TableCell align="right"><strong>Avg Position</strong></TableCell>
                  <TableCell align="center"><strong>Has Content</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(keywordGaps || []).slice(0, 50).map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ textTransform: "capitalize" }}>{row.category}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>{row.city}</TableCell>
                    <TableCell align="right">{row.impressions}</TableCell>
                    <TableCell align="right">{row.clicks}</TableCell>
                    <TableCell align="right">{row.position}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.hasContent ? "Yes" : "No"}
                        color={row.hasContent ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!(keywordGaps?.length) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" py={1}>No keyword gap data yet</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Box>
  );
}
