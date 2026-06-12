import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axiosInstance from "../../services/axiosInstance";

const API_URL = process.env.REACT_APP_API_URL;

const numberFormatter = new Intl.NumberFormat("en-IN");
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const palette = {
  ink: "#172033",
  muted: "#657084",
  line: "#e5e9f0",
  orange: "#ea6d11",
  blue: "#2563eb",
  green: "#16803c",
  purple: "#7c3aed",
  red: "#dc2626",
};

const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const readableStatus = (value) => String(value || "NO_STATUS").replaceAll("_", " ");

const getPercent = (value, total) => {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Number(total || 0)) * 100);
};

const compactDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const isSameFilter = (activeFilter, filter) => {
  if (!activeFilter || !filter) return false;
  return activeFilter.type === filter.type &&
    (filter.value === undefined || activeFilter.value === filter.value) &&
    (filter.monthIndex === undefined || activeFilter.monthIndex === filter.monthIndex) &&
    (filter.year === undefined || activeFilter.year === filter.year);
};

const getMonthFilter = (item) => {
  const monthIndex = Number(String(item?.key || "").split("-")[1]) - 1;
  if (!item || !Number.isInteger(item.year) || !Number.isInteger(monthIndex) || monthIndex < 0) {
    return null;
  }

  return {
    type: "month",
    label: `${item.month} ${item.year} Businesses`,
    monthIndex,
    year: item.year,
  };
};

function clickableSx(isActive) {
  return {
    cursor: "pointer",
    borderColor: isActive ? palette.ink : palette.line,
    boxShadow: isActive ? "0 12px 24px rgba(23, 32, 51, 0.12)" : "none",
    transform: isActive ? "translateY(-2px)" : "none",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 12px 24px rgba(23, 32, 51, 0.10)",
    },
    "&:focus-visible": {
      outline: "3px solid rgba(234, 109, 17, 0.28)",
      outlineOffset: 3,
    },
  };
}

function MetricCard({ color, icon: Icon, label, value, helper, progress, filter, to, activeFilter, onFilterClick, onNavigate }) {
  const clickable = Boolean((filter && onFilterClick) || (to && onNavigate));
  const isActive = isSameFilter(activeFilter, filter);
  const handleClick = () => {
    if (filter && onFilterClick) {
      onFilterClick(filter);
      return;
    }
    if (to && onNavigate) onNavigate(to);
  };

  return (
    <Paper
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={clickable ? handleClick : undefined}
      elevation={0}
      sx={{
        border: `1px solid ${palette.line}`,
        borderRadius: 2,
        p: 2,
        minHeight: 146,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "#fff",
        width: "100%",
        textAlign: "left",
        font: "inherit",
        ...(clickable ? clickableSx(isActive) : {}),
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Typography sx={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: `${color}16`,
            color,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>

      <Box>
        <Typography sx={{ color: palette.ink, fontSize: 31, fontWeight: 800, lineHeight: 1.05 }}>
          {value}
        </Typography>
        <Typography sx={{ color: palette.muted, fontSize: 13, mt: 0.75 }}>
          {helper}
        </Typography>
      </Box>

      {Number.isFinite(progress) && (
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(progress, 100))}
          sx={{
            height: 7,
            borderRadius: 999,
            bgcolor: "#edf1f6",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              bgcolor: color,
            },
          }}
        />
      )}
    </Paper>
  );
}

function Panel({ title, subtitle, action, children, sx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${palette.line}`,
        borderRadius: 2,
        bgcolor: "#fff",
        p: 2.25,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography sx={{ color: palette.ink, fontSize: 18, fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ color: palette.muted, fontSize: 13, mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

function EmptyState({ label }) {
  return (
    <Box
      sx={{
        minHeight: 220,
        display: "grid",
        placeItems: "center",
        color: palette.muted,
        border: `1px dashed ${palette.line}`,
        borderRadius: 2,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{label}</Typography>
    </Box>
  );
}

export default function AdminAnalyticsPanel({ activeFilter, onFilterClick }) {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get(`${API_URL}/businesslist/admin-analytics-report`);
      setReport(response.data?.report || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load analytics report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const totals = useMemo(() => report?.totals || {}, [report]);
  const generatedAt = report?.generatedAt ? new Date(report.generatedAt) : null;

  const metricCards = useMemo(() => {
    const liveRate = getPercent(totals.liveBusinesses, totals.businesses);
    const activeRate = getPercent(totals.activeBusinesses, totals.businesses);
    const phoneReadyRate = getPercent(totals.gmapsWithPhone, totals.gmapsLeads);

    return [
      {
        label: "Total businesses",
        value: formatNumber(totals.businesses),
        helper: `${formatNumber(totals.thirtyDayBusinesses)} added in 30 days`,
        icon: StorefrontRoundedIcon,
        color: palette.orange,
        progress: activeRate,
        filter: { type: "all", label: "Total Businesses" },
      },
      {
        label: "Live listings",
        value: `${liveRate}%`,
        helper: `${formatNumber(totals.liveBusinesses)} live, ${formatNumber(totals.pendingBusinesses)} pending`,
        icon: PublicRoundedIcon,
        color: palette.green,
        progress: liveRate,
        filter: { type: "live", label: "Live Listings" },
      },
      {
        label: "Admin users",
        value: formatNumber(totals.users),
        helper: `${formatNumber(totals.activeUsers)} active users`,
        icon: PersonRoundedIcon,
        color: palette.blue,
        progress: getPercent(totals.activeUsers, totals.users),
        to: "/dashboard/user?status=all",
      },
      {
        label: "Enquiries",
        value: formatNumber(totals.enquiries),
        helper: `${formatNumber(totals.enquiriesLast30Days)} received in 30 days`,
        icon: SearchRoundedIcon,
        color: palette.purple,
        progress: getPercent(totals.enquiriesLast30Days, totals.enquiries),
        to: "/dashboard/enquiry?status=all",
      },
      {
        label: "GMaps leads",
        value: formatNumber(totals.gmapsLeads),
        helper: `${formatNumber(totals.gmapsWithPhone)} phone-ready leads`,
        icon: MapRoundedIcon,
        color: "#0f766e",
        progress: phoneReadyRate,
        to: "/dashboard/gmaps-leads",
      },
      {
        label: "Paid conversions",
        value: formatNumber(totals.successfulPayments),
        helper: `${formatCurrency(totals.paymentRevenue)} collected`,
        icon: PaidRoundedIcon,
        color: palette.red,
        progress: getPercent(totals.successfulPayments, totals.businesses),
        filter: { type: "payment", label: "Payment: SUCCESS", value: "SUCCESS" },
      },
    ];
  }, [totals]);

  const handleMonthClick = (item) => {
    const payload = item?.activePayload?.[0]?.payload || item?.payload || item;
    const filter = getMonthFilter(payload);
    if (filter) onFilterClick?.(filter);
  };

  if (loading && !report) {
    return (
      <Box sx={{ width: "100%" }}>
        <Skeleton variant="rectangular" height={178} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${palette.line}`,
          borderRadius: 2,
          p: { xs: 2, md: 2.5 },
          mb: 2,
          bgcolor: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "#fff3e8",
                color: palette.orange,
              }}
            >
              <AnalyticsRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ color: palette.ink, fontSize: { xs: 24, md: 30 }, fontWeight: 850, lineHeight: 1.1 }}>
                Admin analytics
              </Typography>
              <Typography sx={{ color: palette.muted, fontSize: 14, mt: 0.5 }}>
                Dev DB report across listings, leads, searches, users, and payments.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {generatedAt && (
              <Chip
                size="small"
                label={`Updated ${generatedAt.toLocaleString("en-IN")}`}
                sx={{ fontWeight: 700, bgcolor: "#f5f7fb", color: palette.muted }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={fetchReport}
              disabled={loading}
              sx={{
                borderColor: palette.line,
                color: palette.ink,
                textTransform: "none",
                fontWeight: 800,
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2,
        }}
      >
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            {...card}
            activeFilter={activeFilter}
            onFilterClick={onFilterClick}
            onNavigate={navigate}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(360px, 0.65fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <Panel
          title="Business acquisition trend"
          subtitle={`${formatNumber(report?.yearToDate?.businesses)} businesses added this year`}
          action={
            <Chip
              icon={<TrendingUpRoundedIcon />}
              label={`${formatNumber(totals.todayBusinesses)} today`}
              size="small"
              sx={{ bgcolor: "#ecfdf3", color: palette.green, fontWeight: 800 }}
            />
          }
        >
          {report?.monthlyTrend?.length ? (
            <>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={report.monthlyTrend}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                  onClick={handleMonthClick}
                >
                  <defs>
                    <linearGradient id="adminBusinessTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.orange} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={palette.orange} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf1f6" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [formatNumber(value), "Businesses"]} />
                  <Area
                    type="monotone"
                    dataKey="businesses"
                    stroke={palette.orange}
                    strokeWidth={3}
                    fill="url(#adminBusinessTrend)"
                    activeDot={{ r: 6 }}
                    cursor="pointer"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                  lg: "repeat(6, minmax(0, 1fr))",
                },
                gap: 1,
                mt: 1.5,
              }}
            >
              {report.monthlyTrend.map((item) => {
                const filter = getMonthFilter(item);
                const isActive = isSameFilter(activeFilter, filter);
                return (
                  <Box
                    key={item.key}
                    component="button"
                    type="button"
                    onClick={() => filter && onFilterClick?.(filter)}
                    sx={{
                      border: `1px solid ${isActive ? palette.orange : palette.line}`,
                      borderRadius: 1.25,
                      bgcolor: isActive ? "#fff7ed" : "#fff",
                      color: palette.ink,
                      cursor: "pointer",
                      font: "inherit",
                      p: 1,
                      textAlign: "left",
                      transition: "border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease",
                      "&:hover": {
                        borderColor: palette.orange,
                        bgcolor: "#fff7ed",
                        transform: "translateY(-1px)",
                      },
                      "&:focus-visible": {
                        outline: "3px solid rgba(234, 109, 17, 0.28)",
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 850, color: isActive ? palette.orange : palette.muted }}>
                      {item.month} {item.year}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 850, mt: 0.25 }}>
                      {formatNumber(item.businesses)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            </>
          ) : (
            <EmptyState label="No monthly business data" />
          )}
        </Panel>

        <Panel title="Operating pulse" subtitle="Current admin workload">
          <Stack spacing={1.35}>
            {[
              ["Pending business approval", totals.pendingBusinesses, palette.orange, { type: "pendingLive", label: "Pending Business Approval" }],
              ["Unread searches", totals.unreadSearches, palette.blue],
              ["Searches in 7 days", totals.searchesLast7Days, palette.purple],
              ["GMaps imported", totals.gmapsImported, palette.green, null, "/dashboard/gmaps-leads?status=imported"],
              ["Details fetched", totals.gmapsDetailsFetched, "#0f766e", null, "/dashboard/gmaps-leads?details_fetched=true"],
            ].map(([label, value, color, filter, to]) => {
              const clickable = Boolean((filter && onFilterClick) || to);
              return (
              <Box
                key={label}
                component={clickable ? "button" : "div"}
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => (filter ? onFilterClick(filter) : navigate(to)) : undefined}
                sx={{
                  width: "100%",
                  p: 0,
                  border: 0,
                  bgcolor: "transparent",
                  textAlign: "left",
                  font: "inherit",
                  ...(clickable ? clickableSx(isSameFilter(activeFilter, filter)) : {}),
                }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>{label}</Typography>
                  <Typography sx={{ color: palette.ink, fontSize: 13, fontWeight: 850 }}>
                    {formatNumber(value)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getPercent(value, Math.max(totals.businesses, totals.searches, totals.gmapsLeads, 1))}
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    mt: 0.75,
                    bgcolor: "#edf1f6",
                    "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 999 },
                  }}
                />
              </Box>
            );
            })}
          </Stack>
        </Panel>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <Panel title="Top categories" subtitle="Largest business pools">
          {report?.topCategories?.length ? (
            <Box sx={{ height: 290 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.topCategories} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf1f6" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={126}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => [formatNumber(value), "Businesses"]} />
                  <Bar
                    dataKey="count"
                    fill={palette.blue}
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                    cursor="pointer"
                    onClick={(item) => {
                      const payload = item?.payload || item;
                      if (payload?.name) {
                        onFilterClick?.({ type: "category", label: `Category: ${payload.name}`, value: payload.name });
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <EmptyState label="No category distribution" />
          )}
        </Panel>

        <Panel title="Top locations" subtitle="Where supply is concentrated">
          <Stack spacing={1.1}>
            {(report?.topLocations || []).slice(0, 8).map((item, index) => {
              const pct = getPercent(item.count, totals.businesses);
              return (
                <Box
                  key={item.name}
                  component="button"
                  type="button"
                  onClick={() => onFilterClick?.({ type: "location", label: `Location: ${item.name}`, value: item.name })}
                  sx={{
                    width: "100%",
                    p: 0,
                    border: 0,
                    bgcolor: "transparent",
                    textAlign: "left",
                    font: "inherit",
                    ...clickableSx(isSameFilter(activeFilter, { type: "location", value: item.name })),
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Typography sx={{ width: 24, color: palette.muted, fontSize: 12, fontWeight: 850 }}>
                      {String(index + 1).padStart(2, "0")}
                    </Typography>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography noWrap sx={{ color: palette.ink, fontSize: 14, fontWeight: 800 }}>
                          {item.name}
                        </Typography>
                        <Typography sx={{ color: palette.muted, fontSize: 13, fontWeight: 800 }}>
                          {formatNumber(item.count)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6,
                          borderRadius: 999,
                          mt: 0.75,
                          bgcolor: "#edf1f6",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: index % 2 ? palette.orange : palette.green,
                            borderRadius: 999,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              );
            })}
            {!report?.topLocations?.length && <EmptyState label="No location distribution" />}
          </Stack>
        </Panel>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.85fr) minmax(0, 1.15fr)" },
          gap: 2,
        }}
      >
        <Panel title="Payment status" subtitle="Embedded business payment records">
          <Stack divider={<Divider />} spacing={0}>
            {(report?.paymentBreakdown || []).map((item) => (
              <Stack
                component="button"
                type="button"
                key={item.status}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => onFilterClick?.({
                  type: "payment",
                  label: `Payment: ${readableStatus(item.status)}`,
                  value: item.status || "NO_STATUS",
                })}
                sx={{
                  py: 1.15,
                  width: "100%",
                  border: 0,
                  bgcolor: "transparent",
                  textAlign: "left",
                  font: "inherit",
                  ...clickableSx(isSameFilter(activeFilter, { type: "payment", value: item.status || "NO_STATUS" })),
                }}
              >
                <Box>
                  <Typography sx={{ color: palette.ink, fontSize: 14, fontWeight: 850 }}>
                    {readableStatus(item.status)}
                  </Typography>
                  <Typography sx={{ color: palette.muted, fontSize: 12 }}>
                    {formatCurrency(item.amount)}
                  </Typography>
                </Box>
                <Chip size="small" label={formatNumber(item.count)} sx={{ fontWeight: 850 }} />
              </Stack>
            ))}
            {!report?.paymentBreakdown?.length && <EmptyState label="No payment records" />}
          </Stack>
        </Panel>

        <Panel title="Recent businesses" subtitle="Newest entries in the current access scope">
          <Stack divider={<Divider />} spacing={0}>
            {(report?.recentBusinesses || []).map((item) => (
              <Stack
                component="button"
                type="button"
                key={item._id}
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                onClick={() => onFilterClick?.({
                  type: "search",
                  label: `Business: ${item.businessName || "Untitled business"}`,
                  value: item.businessName || "",
                })}
                sx={{
                  py: 1.15,
                  width: "100%",
                  border: 0,
                  bgcolor: "transparent",
                  textAlign: "left",
                  font: "inherit",
                  ...clickableSx(isSameFilter(activeFilter, { type: "search", value: item.businessName || "" })),
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: palette.ink, fontSize: 14, fontWeight: 850 }}>
                    {item.businessName || "Untitled business"}
                  </Typography>
                  <Typography sx={{ color: palette.muted, fontSize: 12 }}>
                    {[item.category, item.location].filter(Boolean).join(" / ") || "-"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Chip
                    size="small"
                    label={item.businessesLive ? "Live" : "Pending"}
                    sx={{
                      fontWeight: 800,
                      bgcolor: item.businessesLive ? "#ecfdf3" : "#fff7ed",
                      color: item.businessesLive ? palette.green : palette.orange,
                    }}
                  />
                  <Typography sx={{ color: palette.muted, fontSize: 12, minWidth: 58, textAlign: "right" }}>
                    {compactDate(item.createdAt)}
                  </Typography>
                </Stack>
              </Stack>
            ))}
            {!report?.recentBusinesses?.length && <EmptyState label="No recent businesses" />}
          </Stack>
        </Panel>
      </Box>
    </Box>
  );
}
