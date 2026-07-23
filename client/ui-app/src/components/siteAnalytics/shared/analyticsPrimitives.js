// Shared building blocks for the analytics dashboards.
//
// Both panels — Site Analytics (browser traffic) and App Analytics (the
// Flutter app) — read the same /site-events endpoints and differ only in the
// platform they pin and the dimensions they surface. Everything that is
// genuinely common lives here so the two pages stay visually and behaviourally
// identical without duplicating ~400 lines between them.

import React, { useEffect, useState } from "react";
import {
  IconButton, InputAdornment, LinearProgress, MenuItem, Paper, TextField, Tooltip,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";
import axiosInstance from "../../../services/axiosInstance.js";
import styles from "./analytics.module.css";

const API_URL = process.env.REACT_APP_API_URL;

export { styles };

export const PRESETS = [1, 2, 3, 7, 28, 90, 365];
export const GRANULARITIES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];
export const DONUT_COLORS = ["#2563eb", "#7c3aed", "#f97316", "#16a34a", "#db2777", "#0d9488", "#eab308", "#64748b"];

export const number = (value) => Number(value || 0).toLocaleString("en-IN");
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const formatValue = (value, format) => {
  const n = Number(value || 0);
  if (format === "percent") return `${n % 1 ? n.toFixed(1) : n}%`;
  if (format === "decimal") return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-IN");
};

// Period-over-period change. `invert` marks metrics where down is good
// (bounce rate), so the badge colour reflects health, not direction.
export const deltaOf = (now, before, invert = false) => {
  const a = Number(now || 0);
  const b = Number(before || 0);
  if (!b) return a ? { label: "New", tone: invert ? "down" : "up" } : { label: "— 0%", tone: "flat" };
  const change = ((a - b) / b) * 100;
  if (Math.abs(change) < 0.05) return { label: "— 0%", tone: "flat" };
  const up = change > 0;
  return { label: `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%`, tone: (invert ? !up : up) ? "up" : "down" };
};

// Roll daily rows up into weekly / monthly buckets for the traffic chart.
export const bucketOf = (date, granularity) => {
  if (granularity === "month") return `${date.slice(0, 7)}-01`;
  if (granularity === "week") {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday start
    return isoOf(d);
  }
  return date;
};

export const labelOfBucket = (date, granularity) => {
  const d = new Date(`${date}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (granularity === "week") return `w/c ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// Shared fetch: refetches whenever the serialized params or `reloadToken`
// change. `reloadToken` lets Refresh force a reload without altering the query
// (and therefore without changing the server cache key).
export function useFetch(url, params, reloadToken = 0) {
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

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function Metric({ icon: Icon, label, value, format, current, previous, invert, caption, tone, color, series, dataKey, help }) {
  const delta = deltaOf(current, previous, invert);
  const gradientId = `spark-${dataKey}`;
  return <Paper elevation={0} className={styles.metric} sx={{ borderRadius: "16px" }}>
    <div className={styles.metricTop}>
      <span className={`${styles.metricIcon} ${styles[tone]}`}><Icon fontSize="small" /></span>
      <span className={styles.metricLabel}>{label}</span>
      <Tooltip title={help} arrow placement="top" enterTouchDelay={0} leaveTouchDelay={6000}>
        <span className={styles.metricInfo} tabIndex={0} role="button" aria-label={`What ${label} tracks`}>
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
        </span>
      </Tooltip>
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

export function Pager({ page, limit, total, loading, onPage, onLimit }) {
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

export function PanelHead({ icon: Icon, tone, title, subtitle, action }) {
  return <div className={styles.panelHead}>
    <span className={`${styles.panelIcon} ${styles[tone]}`}><Icon fontSize="small" /></span>
    <div className={styles.panelHeadCopy}>
      <h2 className={styles.panelTitle}>{title}</h2>
      <p className={styles.panelSubtitle}>{subtitle}</p>
    </div>
    {action}
  </div>;
}

// Stable-ish row key across the section's known id fields.
function rowKey(row, index, rowsKey) {
  return `${rowsKey}-${row.businessId || row.path || row.query || row.campaign || index}-${index}`;
}

// A full-data table with server-side pagination, sorting, and search. Each
// instance owns its own paging/sort/search state; global filters and the
// refresh token flow in as props and reset the table to page one.
export function SectionTable({
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

// `valueKey` lets a donut render any count field; both panels currently group
// by unique visitors.
export function Donut({ heading, rows, labelOf, valueKey = "visitors" }) {
  const data = (rows || [])
    .filter((r) => Number(r[valueKey] || 0) > 0)
    .map((r) => ({ ...r, name: labelOf(r) }));
  const total = data.reduce((sum, r) => sum + Number(r[valueKey] || 0), 0);

  return <div className={styles.donutCard}>
    <h3 className={styles.splitHeading}>{heading}</h3>
    {!data.length ? <p className={styles.empty}>No data.</p> : <div className={styles.donutBody}>
      <div className={styles.donutChart}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={valueKey} nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
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
          <span className={styles.legendValue}>{number(row[valueKey])} ({total ? ((row[valueKey] / total) * 100).toFixed(1) : 0}%)</span>
        </li>)}
      </ul>
    </div>}
  </div>;
}
