import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import { PAGE_REGISTRY } from "app/config/pageRegistry.js";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Users,
  UserPlus,
  MessageSquare,
  IndianRupee,
  MapPin,
  ChartNoAxesCombined,
  Search,
  Download,
  Settings,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ShieldCheck,
  Star,
  Upload,
  HelpCircle,
  Moon,
  Sun,
  RefreshCw,
  X,
  FileText,
  Activity,
  ArrowUp,
  ArrowDown,
  Store,
  LockKeyhole,
} from "lucide-react";
import Header from "./Header.js";
import DashboardDistributionMap from "./DashboardDistributionMap.js";
import {
  dashboardDateKey,
  shiftDashboardDay,
} from "shared/utils/dashboardDates.js";
import s from "./DashboardOverview.module.css";

const number = (value) =>
  value == null ? "—" : Number(value).toLocaleString("en-IN");
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";
const COLORS = [
  "#087cff",
  "#00bb63",
  "#a22bff",
  "#ff6920",
  "#ff2942",
  "#00ba5f",
];
const SERIES = [
  ["businesses", "New Businesses", "#ff6b14"],
  ["activeBusinesses", "Active Businesses", "#00b768"],
  ["enquiries", "Total Enquiries", "#087cff"],
];
function Panel({
  title,
  icon: Icon = Building2,
  action,
  children,
  className = "",
  tone = "orange",
  subtitle,
}) {
  return (
    <section className={`${s.panel} ${className}`}>
      <div className={s.panelHeading}>
        <div className={s.headingCopy}>
          {Icon && (
            <span className={`${s.icon} ${s[tone]}`}>
              <Icon size={17} />
            </span>
          )}
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Sparkline({ values, color, id }) {
  if (!values?.length)
    return <span className={s.noTrend}>No trend available</span>;
  const max = Math.max(...values, 1),
    points = values
      .map(
        (value, i) =>
          `${(i / Math.max(values.length - 1, 1)) * 100},${40 - (value / max) * 35}`,
      )
      .join(" ");
  return (
    <svg className={s.sparkline} viewBox="0 0 100 44" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".24" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,44 ${points} 100,44`} fill={`url(#spark-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}
function growthChange(rows, key) {
  if (rows.length < 2 || !rows.some((row) => row[key] != null)) return null;
  const half = Math.floor(rows.length / 2),
    before = rows
      .slice(0, half)
      .reduce((sum, row) => sum + Number(row[key] || 0), 0),
    after = rows
      .slice(-half)
      .reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return before
    ? Math.round(((after - before) / before) * 100)
    : after
      ? null
      : 0;
}
export default function DashboardOverview({
  report,
  loading,
  error,
  rangeError,
  datePreset,
  setDatePreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  trendDays,
  setTrendDays,
  trendLocation,
  setTrendLocation,
  onFilter,
  onDayClick,
  onCreatorClick,
  refresh,
  creatorId,
  setCreatorId,
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    user = useSelector((state) => state.auth.user),
    searchRef = useRef(null);
  const [search, setSearch] = useState(""),
    [dark, setDark] = useState(false),
    [help, setHelp] = useState(false),
    [compare, setCompare] = useState("none"),
    [showFilters, setShowFilters] = useState(false),
    [hiddenSeries, setHiddenSeries] = useState([]),
    [allActivities, setAllActivities] = useState(false),
    [allCreators, setAllCreators] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const allowedPages = useSelector((state) => state.auth.allowedPages || []);
  const totals = report?.totals || {},
    rows = report?.dailyBusinessTrend || [],
    disabled = loading || Boolean(error || rangeError) || !report;
  const go = (path) => navigate(`/dashboard/${path}`),
    filter = (type, label, value) => onFilter({ type, label, value });
  const suggestions = search.trim()
    ? [
        ...PAGE_REGISTRY.filter(
          (page) =>
            user?.userRole === "SuperAdmin" || allowedPages.includes(page.path),
        ).map((page) => ({
          label: page.label,
          kind: "Page",
          action: () => navigate(page.path),
        })),
        ...(report?.topCategories || []).map((item) => ({
          label: item.name,
          kind: "Category",
          action: () => filter("category", `Category: ${item.name}`, item.name),
        })),
        ...(report?.topLocations || []).map((item) => ({
          label: item.name,
          kind: "Location",
          action: () => filter("location", `Location: ${item.name}`, item.name),
        })),
        ...(report?.creatorOptions || []).map((item) => ({
          label: item.name,
          kind: "Creator",
          action: () => {
            setCreatorId(item.userId);
            setShowFilters(true);
          },
        })),
        ...(report?.recentBusinesses || []).map((item) => ({
          label: item.businessName,
          kind: "Business",
          action: () => filter("search", item.businessName, item.businessName),
        })),
      ]
        .filter((item) =>
          item.label?.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .slice(0, 7)
    : [];
  const today = dashboardDateKey(),
    periodEnd = datePreset === "custom" ? customTo : today;
  const periodStart =
    datePreset === "custom"
      ? customFrom
      : datePreset === "ytd"
        ? `${today.slice(0, 4)}-01-01`
        : shiftDashboardDay(today, 1 - (Number(datePreset) || trendDays));
  const selectPeriod = (value) => {
    setDatePreset(value);
    if (value === "ytd")
      setTrendDays(
        Math.round(
          (new Date(`${today}T12:00:00Z`) -
            new Date(`${today.slice(0, 4)}-01-01T12:00:00Z`)) /
            86400000,
        ) + 1,
      );
    else if (!isNaN(Number(value))) setTrendDays(Number(value));
  };
  useEffect(() => {
    const key = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setHelp(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const chartRows = useMemo(() => {
    const data = report?.dailyBusinessTrend || [];
    if (compare !== "halves") return data;
    const half = Math.floor(data.length / 2);
    return data.slice(-half).map((row, i) => ({
      ...row,
      previousBusinesses: data[i]?.businesses ?? null,
    }));
  }, [report, compare]);
  const exportReport = () => {
    const csv = [
      "Date,New businesses,Active businesses,Enquiries",
      ...rows.map((row) =>
        [
          row.key,
          row.businesses,
          row.activeBusinesses ?? "",
          row.enquiries ?? "",
        ].join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `massclick-growth-${periodEnd || today}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const cards = [
    [
      "Total Businesses",
      totals.businesses,
      Building2,
      "businesses",
      () => filter("all", "Total Businesses"),
      "Selected business cohort",
    ],
    [
      "Active Businesses",
      totals.activeBusinesses,
      Users,
      "activeBusinesses",
      () => filter("active", "Active Businesses"),
      "Active in selected cohort",
    ],
    [
      "New Businesses",
      totals.todayBusinesses,
      UserPlus,
      "businesses",
      () => filter("today", "New businesses today"),
      "Today · India time",
    ],
    [
      "Total Users",
      totals.users,
      Users,
      "users",
      () => go("user"),
      "All administrator accounts",
    ],
    [
      "Total Leads / Enquiries",
      totals.enquiries,
      MessageSquare,
      "enquiries",
      () => go("enquiry"),
      "Enquiries · all time",
    ],
    [
      "Total Revenue",
      totals.paymentRevenue,
      IndianRupee,
      "revenue",
      () => filter("payment", "Successful payments", "SUCCESS"),
      "Selected business cohort",
    ],
  ];
  const ranking = (items = [], type) =>
    items.length ? (
      items.slice(0, 5).map((item, index) => (
        <button
          key={item.name}
          className={s.rank}
          onClick={() => filter(type, `${type}: ${item.name}`, item.name)}
        >
          <span
            className={s.rankIcon}
            style={{ "--rank-color": COLORS[[0, 3, 1, 2, 1][index]] }}
          >
            {type === "location" ? <MapPin size={18} /> : <Store size={18} />}
          </span>
          <span className={s.rankBody}>
            <span>
              <strong>{item.name}</strong>
              <b>{number(item.count)}</b>
              {type === "category" && (
                <small>
                  {totals.businesses
                    ? ((item.count / totals.businesses) * 100).toFixed(1)
                    : "0"}
                  %
                </small>
              )}
            </span>
            <span className={s.track}>
              <i
                style={{
                  width: `${Math.max(1, (item.count / Math.max(...items.map((x) => x.count), 1)) * 82)}%`,
                  background:
                    type === "location"
                      ? "#2895ff"
                      : COLORS[[0, 3, 1, 2, 1][index]],
                }}
              />
            </span>
          </span>
        </button>
      ))
    ) : (
      <p className={s.empty}>No {type} data in this selection.</p>
    );
  const chart = (bar) => (
    <div className={bar ? s.barChart : s.chart}>
      {rows.length ? (
        <ResponsiveContainer width="100%" height="100%">
          {bar ? (
            <BarChart
              data={rows}
              margin={{ left: -22, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="daily-bars" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffb075" />
                  <stop offset="1" stopColor="#ff741f" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eaf2fc" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#385ea0" }}
                minTickGap={24}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#385ea0" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e1ecff",
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="businesses"
                name="New Businesses"
                fill="url(#daily-bars)"
                radius={[2, 2, 0, 0]}
                onClick={onDayClick}
                cursor="pointer"
              />
            </BarChart>
          ) : (
            <AreaChart
              data={chartRows}
              margin={{ left: -22, right: 8, top: 10, bottom: 0 }}
            >
              <defs>
                {SERIES.map(([key, , color]) => (
                  <linearGradient
                    key={key}
                    id={`growth-${key}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0" stopColor={color} stopOpacity=".12" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#eaf2fc" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#385ea0" }}
                minTickGap={24}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#385ea0" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e1ecff",
                  fontSize: 11,
                }}
              />
              {SERIES.filter(([key]) => !hiddenSeries.includes(key)).map(
                ([key, name, color]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={name}
                    stroke={color}
                    strokeWidth={1.8}
                    fill={`url(#growth-${key})`}
                    dot={
                      chartRows.length <= 40 ? { r: 2, strokeWidth: 1 } : false
                    }
                    isAnimationActive={false}
                  />
                ),
              )}
              {compare === "halves" && (
                <Area
                  dataKey="previousBusinesses"
                  name="Previous half · new businesses"
                  stroke="#9756e8"
                  strokeDasharray="4 4"
                  fill="none"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      ) : (
        <p className={s.empty}>No business additions for this selection.</p>
      )}
    </div>
  );
  const seo = report?.seoHealth;
  return (
    <div className={`${s.dashboard} ${dark ? s.dark : ""}`}>
      <div className={s.toolbar}>
        <form
          className={s.search}
          onSubmit={(event) => {
            event.preventDefault();
            setSearchOpen(false);
            if (!disabled && search.trim())
              filter("search", `Search: ${search.trim()}`, search.trim());
          }}
        >
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="Search businesses"
            aria-controls={
              searchOpen && suggestions.length
                ? "dashboard-search-results"
                : undefined
            }
            onFocus={() => setSearchOpen(true)}
            placeholder="Search businesses, locations, categories, users, reports…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
          />
          <button
            type="submit"
            disabled={disabled || !search.trim()}
            aria-label="Search"
          >
            <kbd>Ctrl + K</kbd>
          </button>
          {searchOpen && suggestions.length > 0 && (
            <div id="dashboard-search-results" className={s.searchResults}>
              {suggestions.map((item) => (
                <button
                  key={`${item.kind}-${item.label}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    item.action();
                    setSearchOpen(false);
                    setSearch("");
                  }}
                >
                  <span>{item.label}</span>
                  <small>{item.kind}</small>
                </button>
              ))}
            </div>
          )}
        </form>
        <button
          className={s.dateButton}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <CalendarDays size={17} />
          <span>
            {datePreset === "all"
              ? "All time"
              : `${shortDate(periodStart)} ${periodStart?.slice(0, 4) || ""} - ${shortDate(periodEnd)} ${periodEnd?.slice(0, 4) || ""}`}
          </span>
          <ChevronDown size={13} />
        </button>
        <div className={s.presets}>
          {[
            ["all", "All time"],
            ["1", "Today"],
            ["7", "7D"],
            ["30", "30D"],
            ["90", "90D"],
            ["ytd", "YTD"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={datePreset === value}
              className={datePreset === value ? s.selected : ""}
              onClick={() => {
                selectPeriod(value);
                if (value === "custom") setShowFilters(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.headerActions}>
          <Header compact>
            <button
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              className={s.roundButton}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Dashboard help"
              className={s.roundButton}
              onClick={() => setHelp(true)}
            >
              <HelpCircle size={22} />
            </button>
          </Header>
        </div>
      </div>
      {showFilters && (
        <div className={s.filterDrawer}>
          <label>
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setDatePreset("custom");
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setDatePreset("custom");
                if (customFrom && e.target.value >= customFrom)
                  setTrendDays(
                    Math.min(
                      365,
                      Math.round(
                        (new Date(e.target.value) - new Date(customFrom)) /
                          86400000,
                      ) + 1,
                    ),
                  );
              }}
            />
          </label>
          <label>
            Created by
            <select
              aria-label="Report creator"
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
            >
              <option value="">All creators</option>
              {report?.creatorOptions?.map((creator) => (
                <option key={creator.userId} value={creator.userId}>
                  {creator.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setCreatorId("");
              setTrendLocation("");
              selectPeriod("30");
            }}
          >
            Reset filters
          </button>
          <button onClick={refresh} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            aria-label="Close filters"
            onClick={() => setShowFilters(false)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <div className={s.hero}>
        <div className={s.heroCopy}>
          <p>Welcome back,</p>
          <h1>
            {user?.userName?.trim() || "Welcome"}
            !{" "}
            <span role="img" aria-label="wave">
              👋
            </span>
          </h1>
          <p>
            Here’s what’s happening with MassClick today. Real insights. Real
            growth. Real impact.
          </p>
        </div>
        <div className={s.heroSlogan}>
          Stronger Local Businesses
          <br />
          <strong>A Smarter Tomorrow</strong>
        </div>
        <blockquote>
          “Connecting people
          <br />
          with the right businesses
          <br />
          near them”<span>● ○ ○</span>
        </blockquote>
      </div>
      {(error || rangeError) && (
        <div role="alert" className={s.error}>
          {error || rangeError}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
      {loading && (
        <div role="status" className={s.loading}>
          Updating dashboard…
        </div>
      )}
      {report?.unavailableSections?.length > 0 && (
        <p className={s.notice}>
          Some report sections are unavailable.{" "}
          <button onClick={refresh}>Retry</button>
        </p>
      )}
      <fieldset disabled={disabled} className={s.content} aria-busy={loading}>
        <div className={s.metrics}>
          {cards.map(([label, value, Icon, key, action, note], i) => {
            const change = growthChange(rows, key),
              values = rows.some((row) => row[key] != null)
                ? rows.map((row) => Number(row[key] || 0))
                : null;
            return (
              <button
                key={label}
                className={s.metric}
                style={{ "--accent": COLORS[i] }}
                onClick={action}
              >
                <span className={s.metricTop}>
                  <span className={s.metricIcon}>
                    <Icon size={27} strokeWidth={2.5} />
                  </span>
                  <span className={s.metricCopy}>
                    <span>{label}</span>
                    <strong>
                      {report
                        ? `${key === "revenue" ? "₹ " : ""}${number(value)}`
                        : "—"}
                    </strong>
                  </span>
                </span>
                <span className={s.metricBottom}>
                  <span>
                    <b
                      title="Daily additions: second half versus first half of the chart period"
                      className={
                        change !== null && change < 0 ? s.negative : s.positive
                      }
                    >
                      {change === null ? (
                        "—"
                      ) : (
                        <>
                          {change < 0 ? (
                            <ArrowDown size={13} />
                          ) : (
                            <ArrowUp size={13} />
                          )}
                          {Math.abs(change)}%
                        </>
                      )}
                    </b>
                    <small>
                      {change === null ? note : "vs first half of chart period"}
                    </small>
                  </span>
                  <Sparkline values={values} color={COLORS[i]} id={i} />
                </span>
              </button>
            );
          })}
        </div>
        <div className={s.workspace}>
          <div className={s.mainPanels}>
            <div className={s.topRow}>
              <Panel
                title="Business Growth & Acquisition"
                icon={Users}
                className={s.growth}
                action={
                  <div className={s.chartControls}>
                    <select
                      aria-label="Filter business chart by place"
                      value={trendLocation}
                      onChange={(e) => setTrendLocation(e.target.value)}
                    >
                      <option value="">All places</option>
                      {report?.locationOptions?.map((place) => (
                        <option key={place}>{place}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Compare chart periods"
                      value={compare}
                      onChange={(e) => setCompare(e.target.value)}
                    >
                      <option value="none">Compare</option>
                      <option value="halves">Period halves</option>
                    </select>
                    <div className={s.miniPresets}>
                      {[7, 30, 90, 365].map((days) => (
                        <button
                          key={days}
                          aria-pressed={trendDays === days}
                          onClick={() => setTrendDays(days)}
                          className={trendDays === days ? s.selected : ""}
                        >
                          {days === 365 ? "12M" : `${days}D`}
                        </button>
                      ))}
                    </div>
                    <button onClick={exportReport}>
                      <Download size={12} />
                      Export
                    </button>
                  </div>
                }
              >
                <div className={s.legend}>
                  {SERIES.map(([key, label, color]) => (
                    <button
                      key={key}
                      aria-pressed={!hiddenSeries.includes(key)}
                      onClick={() =>
                        setHiddenSeries((current) =>
                          current.includes(key)
                            ? current.filter((item) => item !== key)
                            : [...current, key],
                        )
                      }
                      style={{ opacity: hiddenSeries.includes(key) ? 0.4 : 1 }}
                    >
                      <i style={{ background: color }} />
                      {label}
                    </button>
                  ))}
                </div>
                {chart(false)}
                <p className={s.chartScope}>
                  New and currently active additions · enquiries are
                  account-wide
                  {compare === "halves"
                    ? " · comparing equal halves of this period"
                    : ""}
                </p>
              </Panel>
              <Panel
                title="Business Distribution"
                tone="green"
                className={s.distribution}
                action={
                  <button onClick={() => go("location-coverage")}>
                    View Map →
                  </button>
                }
              >
                <DashboardDistributionMap
                  clusters={report?.mapClusters}
                  onLocationClick={(name) =>
                    filter("location", `Location: ${name}`, name)
                  }
                />
              </Panel>
            </div>
            <div className={s.middleRow}>
              <Panel
                title="Daily Business Additions"
                icon={Users}
                className={s.daily}
                subtitle={`Businesses added during the last ${trendDays} chart days.`}
                action={
                  <div className={s.miniPresets}>
                    {[7, 30, 90].map((days) => (
                      <button
                        key={days}
                        aria-pressed={trendDays === days}
                        className={trendDays === days ? s.selected : ""}
                        onClick={() => setTrendDays(days)}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                }
              >
                {chart(true)}
              </Panel>
              <Panel
                title="SEO Overall Health"
                icon={ShieldCheck}
                className={s.seo}
                action={
                  <button onClick={() => go("seo")}>View Report →</button>
                }
              >
                <div className={s.seoBody}>
                  <div
                    className={s.gauge}
                    title={seo?.method || "SEO health has not been measured"}
                  >
                    <svg viewBox="0 0 140 122" aria-hidden="true">
                      <defs>
                        <linearGradient id="health-gradient">
                          <stop stopColor="#04bd73" />
                          <stop offset=".6" stopColor="#0dc6a6" />
                          <stop offset="1" stopColor="#087cff" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 29 105 A 55 55 0 1 1 111 105"
                        pathLength="100"
                        fill="none"
                        stroke="#e1edff"
                        strokeWidth="13"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 29 105 A 55 55 0 1 1 111 105"
                        pathLength="100"
                        fill="none"
                        stroke="url(#health-gradient)"
                        strokeWidth="13"
                        strokeLinecap="round"
                        strokeDasharray={`${seo?.score || 0} 100`}
                      />
                    </svg>
                    <div>
                      <strong>
                        {number(seo?.score)}
                        <small>/100</small>
                      </strong>
                      <span>SEO Health</span>
                    </div>
                    <p>Metadata completeness</p>
                  </div>
                  <div className={s.seoRows}>
                    {[
                      [
                        "Indexed Pages",
                        seo?.indexedPages,
                        "#00b767",
                        "gsc-analytics",
                      ],
                      [
                        "Missing Meta Titles",
                        seo?.missingTitles,
                        "#087cff",
                        "seo",
                      ],
                      [
                        "Missing Descriptions",
                        seo?.missingDescriptions,
                        "#ff9417",
                        "seo",
                      ],
                      [
                        "Broken Links",
                        seo?.brokenLinks,
                        "#ff304c",
                        "gsc-analytics",
                      ],
                      [
                        "Schema Coverage",
                        seo?.schemaCoverage == null
                          ? null
                          : `${seo.schemaCoverage}%`,
                        "#ff304c",
                        "seo",
                      ],
                    ].map(([label, value, color, path]) => (
                      <button key={label} onClick={() => go(path)}>
                        <i style={{ background: color }} />
                        <span>{label}</span>
                        <b>
                          {typeof value === "string" ? value : number(value)}
                        </b>
                      </button>
                    ))}
                  </div>
                </div>
                <p className={s.seoNote}>
                  {seo
                    ? `Checked ${number(seo.pages)} active SEO records. `
                    : "SEO audit unavailable. "}
                  — = not measured
                </p>
              </Panel>
            </div>
            <div className={s.bottomRow}>
              <Panel
                title="Businesses created by user"
                subtitle="Top users by business creations in the selected date range."
                className={s.creators}
                action={
                  <button onClick={() => setAllCreators((v) => !v)}>
                    {allCreators ? "Show less" : "View All"}
                  </button>
                }
              >
                <div className={s.people}>
                  {report?.userPerformance
                    ?.slice(0, allCreators ? 12 : 9)
                    .map((item, i) => (
                      <button
                        key={item.userId}
                        onClick={() => onCreatorClick(item)}
                        disabled={!item.userId || item.userId === "unassigned"}
                      >
                        <span
                          className={s.avatar}
                          style={{
                            background: [
                              "#009831",
                              "#00b88e",
                              "#0789ff",
                              "#0387a4",
                              "#ff7516",
                            ][i % 5],
                          }}
                        >
                          {item.name?.slice(0, 1) || "?"}
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{number(item.liveBusinesses)} live</small>
                        </span>
                        <b>{number(item.businesses)}</b>
                      </button>
                    ))}
                </div>
                {!report?.userPerformance?.length && (
                  <p className={s.empty}>
                    No creator activity for this selection.
                  </p>
                )}
              </Panel>
              <Panel
                title="Recent businesses"
                className={s.recent}
                action={
                  <button onClick={() => go("business")}>View All</button>
                }
              >
                <div className={s.recentTable}>
                  <div className={s.tableHead}>
                    <span>Name</span>
                    <span>Location</span>
                    <span>Date</span>
                    <span>Status</span>
                  </div>
                  {report?.recentBusinesses?.slice(0, 5).map((item) => (
                    <button
                      className={s.recentRow}
                      key={item._id}
                      onClick={() =>
                        filter("search", item.businessName, item.businessName)
                      }
                    >
                      <strong>{item.businessName}</strong>
                      <span>{item.location || "—"}</span>
                      <time>
                        {shortDate(item.createdAt)}{" "}
                        {item.createdAt?.slice(0, 4)}
                      </time>
                      <span>
                        <em className={!item.businessesLive ? s.pending : ""}>
                          {item.businessesLive ? "Live" : "Pending"}
                        </em>
                      </span>
                    </button>
                  ))}
                </div>
                {!report?.recentBusinesses?.length && (
                  <p className={s.empty}>No recent businesses.</p>
                )}
              </Panel>
            </div>
          </div>
          <aside className={s.rightPanels}>
            <Panel
              title="Top Categories"
              tone="green"
              action={<button onClick={() => go("category")}>View All</button>}
            >
              {ranking(report?.topCategories, "category")}
            </Panel>
            <Panel
              title="Top Locations"
              icon={MapPin}
              tone="green"
              action={<button onClick={() => go("location")}>View All</button>}
            >
              {ranking(report?.topLocations, "location")}
            </Panel>
            <Panel
              title="Recent Activities"
              icon={Activity}
              className={s.activities}
              action={
                <button onClick={() => setAllActivities((v) => !v)}>
                  {allActivities ? "Show less" : "View All"}
                </button>
              }
            >
              {report?.recentActivities
                ?.slice(0, allActivities ? 8 : 4)
                .map((item, i) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    className={s.activity}
                    onClick={() =>
                      item.type === "user"
                        ? go("user")
                        : filter("search", item.name, item.name)
                    }
                  >
                    <span
                      style={{ "--activity-color": COLORS[i % COLORS.length] }}
                    >
                      {item.type === "user" ? (
                        <UserPlus size={15} />
                      ) : item.type === "updated" ? (
                        <FileText size={15} />
                      ) : (
                        <Star size={15} />
                      )}
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.name}
                        {item.location ? ` · ${item.location}` : ""}
                      </small>
                      <time>
                        {shortDate(item.date)} ·{" "}
                        {new Date(item.date).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </span>
                  </button>
                ))}
              {!report?.recentActivities?.length && (
                <p className={s.empty}>No recent activity.</p>
              )}
            </Panel>
          </aside>
        </div>
        <div className={s.footerRow}>
          <Panel title="Quick Actions" icon={null} className={s.actions}>
            <div className={s.actionGrid}>
              {[
                ["Add Business", "business?view=form", Building2],
                ["Manage Users", "user", Users],
                ["View Reports", "analytics-overview", ChartNoAxesCombined],
                ["Bulk Upload", "documents", Upload],
                ["SEO Analysis", "seo", ShieldCheck],
                ["Settings", "system-settings", Settings],
              ].map(([label, path, Icon], i) => (
                <button
                  key={path}
                  style={{
                    "--action-color": [
                      "#087bff",
                      "#a343f5",
                      "#00bfa0",
                      "#ff8621",
                      "#ed42b1",
                      "#2b5caa",
                    ][i],
                  }}
                  onClick={() => go(path)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </Panel>
          <div className={s.footerPromo}>
            <div>
              <strong>
                Empowering Local Businesses
                <br />
                Across Every Neighborhood
              </strong>
              <button onClick={() => navigate("/")}>
                View Website <ArrowRight size={13} />
              </button>
            </div>
            <ul>
              <li>
                <LockKeyhole size={13} />
                More Visibility
              </li>
              <li>
                <Building2 size={13} />
                More Customers
              </li>
              <li>
                <ShieldCheck size={13} />
                Bigger Growth
              </li>
            </ul>
            <button
              aria-label="Visit MassClick website"
              onClick={() => navigate("/")}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </fieldset>
      {help && (
        <Dialog
          open={help}
          onClose={() => setHelp(false)}
          aria-labelledby="dashboard-help-title"
          PaperProps={{ className: `${s.dashboard} ${dark ? s.dark : ""}` }}
        >
          <section
            aria-labelledby="dashboard-help-title"
            className={s.helpDialog}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              autoFocus
              aria-label="Close dashboard help"
              onClick={() => setHelp(false)}
            >
              <X size={18} />
            </button>
            <h2 id="dashboard-help-title">Your dashboard, at a glance</h2>
            <p>
              Choose dates and a creator using the calendar. Select a metric,
              category, location, business or creator to open its records below.
            </p>
            <p>
              Toggle chart legends to compare series, or choose “Period halves”
              to compare equal halves of the chart. Export downloads the chart
              as CSV.
            </p>
            <p>
              Map clusters count businesses with saved coordinates. SEO health
              measures title, description and canonical completeness; unmeasured
              audit values display a dash.
            </p>
            <button
              onClick={() => {
                setHelp(false);
                go("customer-care");
              }}
            >
              Contact support <ArrowRight size={15} />
            </button>
          </section>
        </Dialog>
      )}
      <Dialog
        open={["#payments", "#reviews", "#integrations"].includes(
          location.hash,
        )}
        onClose={() => navigate("/dashboard", { replace: true })}
        PaperProps={{ className: `${s.dashboard} ${dark ? s.dark : ""}` }}
        aria-labelledby="dashboard-workspace-title"
      >
        <section className={s.helpDialog}>
          <button
            aria-label="Close dashboard workspace"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            <X size={18} />
          </button>
          <h2 id="dashboard-workspace-title">
            {location.hash === "#payments"
              ? "Payments & Payouts"
              : location.hash === "#reviews"
                ? "Reviews & Ratings"
                : "API & Integrations"}
          </h2>
          {location.hash === "#payments" && (
            <>
              <p>Payments for businesses in the selected reporting period.</p>
              {report?.paymentBreakdown?.map((item) => (
                <div className={s.workspaceRow} key={item.status}>
                  <strong>{item.status || "No status"}</strong>
                  <span>{number(item.count)} payments</span>
                  <b>₹ {number(item.amount)}</b>
                </div>
              ))}
              {!report?.paymentBreakdown?.length && (
                <p>No payment records in this selection.</p>
              )}
              <p>Payout reporting is not connected to this dashboard.</p>
              <button onClick={() => go("quotation")}>
                View quotations <ArrowRight size={14} />
              </button>
            </>
          )}
          {location.hash === "#reviews" && (
            <>
              {report?.recentReviews?.map((item) => (
                <button
                  className={s.reviewRow}
                  key={item._id}
                  onClick={() => {
                    navigate("/dashboard", { replace: true });
                    filter("search", item.businessName, item.businessName);
                  }}
                >
                  <span>
                    <strong>{item.businessName}</strong>
                    <small>
                      {item.location} · {shortDate(item.createdAt)}
                    </small>
                  </span>
                  <b>
                    <Star size={14} fill="#ffac14" color="#ffac14" />{" "}
                    {number(item.rating)}/5
                  </b>
                </button>
              ))}
              {!report?.recentReviews?.length && (
                <p>No recent reviews in this selection.</p>
              )}
            </>
          )}
          {location.hash === "#integrations" && (
            <>
              <p>Manage your connected services and their reports.</p>
              {[
                ["Google Search Console", "gsc-analytics"],
                ["Google Analytics", "ga4-analytics"],
                ["MSG91 messaging", "msg91-analytics"],
                ["Google Maps leads", "gmaps-leads"],
                ["Authentication", "auth-console"],
                ["System settings", "system-settings"],
              ]
                .filter(
                  ([, path]) =>
                    user?.userRole === "SuperAdmin" ||
                    allowedPages.includes(`/dashboard/${path}`),
                )
                .map(([label, path]) => (
                  <button
                    className={s.reviewRow}
                    key={path}
                    onClick={() => go(path)}
                  >
                    {label}
                    <ArrowRight size={14} />
                  </button>
                ))}
            </>
          )}
        </section>
      </Dialog>
    </div>
  );
}
