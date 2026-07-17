import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, LinearProgress, MenuItem, Paper, TextField } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import axiosInstance from "../../services/axiosInstance.js";
import styles from "./SiteAnalytics.module.css";

const API_URL = process.env.REACT_APP_API_URL;
const periods = [1, 2, 3, 7, 28, 90, 365];
const number = (value) => Number(value || 0).toLocaleString("en-IN");

// "+12% vs previous period" note under each metric card.
const deltaNote = (current, previous) => {
  const now = Number(current || 0);
  const before = Number(previous || 0);
  if (!before) return now ? "New in this period" : "No data yet";
  const change = Math.round(((now - before) / before) * 100);
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "•";
  return `${arrow} ${Math.abs(change)}% vs previous period`;
};

function Metric({ icon: Icon, label, value, note, tone }) {
  return <Paper elevation={0} className={styles.metric} sx={{ borderRadius: "14px" }}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><Icon /></span>
    <span className={styles.metricLabel}>{label}</span>
    <strong className={styles.metricValue}>{value}</strong>
    <span className={styles.metricNote}>{note}</span>
  </Paper>;
}

function RankList({ rows, getLabel, getValue, getDetail, valueLabel, emptyText = "No data in this period" }) {
  const maximum = Math.max(...(rows || []).map((row) => Number(getValue(row) || 0)), 1);
  return <div className={styles.ranking}>
    {(rows || []).map((row, index) => {
      const value = Number(getValue(row) || 0);
      const detail = getDetail ? getDetail(row) : "";
      return <div className={styles.rankRow} key={`${getLabel(row)}-${index}`}>
        <div className={styles.rankCopy}>
          <span className={styles.rankLabel}>{getLabel(row)}</span>
          <strong className={styles.rankValue}>{number(value)} {valueLabel}</strong>
        </div>
        {!!detail && <div className={styles.rankDetail}>{detail}</div>}
        <LinearProgress
          variant="determinate"
          value={(value / maximum) * 100}
          className={styles.progress}
          sx={{ height: 6, borderRadius: "20px" }}
        />
      </div>;
    })}
    {!rows?.length && <p className={styles.empty}>{emptyText}</p>}
  </div>;
}

export default function SiteAnalytics() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const requests = [
      ["overview", "/site-events/overview"], ["trends", "/site-events/trends"],
      ["topPages", "/site-events/top-pages"], ["topBusinesses", "/site-events/top-businesses"],
      ["topSearches", "/site-events/top-searches"], ["devices", "/site-events/devices"],
    ];
    const results = await Promise.allSettled(requests.map(([, url]) => axiosInstance.get(`${API_URL}${url}`, { params: { days, limit: 10 } })));
    const next = {}; const nextErrors = [];
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === "fulfilled") next[key] = result.value.data;
      else nextErrors.push(`${key}: ${result.reason?.response?.data?.message || result.reason?.message || "unavailable"}`);
    });
    setData(next); setErrors(nextErrors); setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const current = data.overview?.current || {};
  const previous = data.overview?.previous || {};
  const searchTotals = data.topSearches || {};

  const chartData = useMemo(() => (data.trends?.trend || []).map((row) => ({
    ...row,
    // Compact x-axis label like "17 Jul"
    label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  })), [data.trends]);

  const actionDetail = (row) => {
    const actions = row.actions || {};
    const parts = [
      actions.call ? `${number(actions.call)} calls` : "",
      actions.whatsapp ? `${number(actions.whatsapp)} WhatsApp` : "",
      actions.direction ? `${number(actions.direction)} directions` : "",
      actions.enquiry ? `${number(actions.enquiry)} enquiries` : "",
      actions.showNumber ? `${number(actions.showNumber)} number reveals` : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "No clicks yet";
  };

  return <Box className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Site analytics</h1>
        <p className={styles.subtitle}>First-party visitor tracking — page views, sessions, business interactions, and searches captured by our own tracker.</p>
      </div>
      <div className={styles.controls}>
        <TextField select size="small" label="Period" value={days} onChange={(event) => setDays(Number(event.target.value))} className={styles.period}>
          {periods.map((item) => <MenuItem key={item} value={item}>Last {item} day{item === 1 ? "" : "s"}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={load} disabled={loading}>Refresh</Button>
      </div>
    </div>
    {loading && <LinearProgress className={styles.loading} />}
    {!!errors.length && <Alert severity="warning" className={styles.alert}>Some sections could not load: {errors.join(" · ")}</Alert>}
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
    <div className={styles.grid}>
      <Paper elevation={0} className={`${styles.panel} ${styles.wide}`} sx={{ borderRadius: "14px" }}>
        <h2 className={styles.panelTitle}>Daily traffic</h2>
        <p className={styles.panelSubtitle}>Visitors, page views, and business clicks per day (IST).</p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: 0, right: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pageViews" name="Page views" fill="#93c5fd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="businessClicks" name="Business clicks" fill="#f97316" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Paper>
      <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "14px" }}>
        <h2 className={styles.panelTitle}>Top pages</h2>
        <p className={styles.panelSubtitle}>Most viewed pages in this period.</p>
        <RankList rows={data.topPages?.pages} getLabel={(row) => row.path || "/"} getValue={(row) => row.views} getDetail={(row) => `${number(row.sessions)} sessions`} valueLabel="views" />
      </Paper>
      <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "14px" }}>
        <h2 className={styles.panelTitle}>Top businesses</h2>
        <p className={styles.panelSubtitle}>Listing views with the click breakdown per business.</p>
        <RankList rows={data.topBusinesses?.businesses} getLabel={(row) => row.name || row.businessId} getValue={(row) => row.views} getDetail={actionDetail} valueLabel="views" />
      </Paper>
      <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "14px" }}>
        <h2 className={styles.panelTitle}>Top searches</h2>
        <p className={styles.panelSubtitle}>
          {number(searchTotals.typedSearches)} typed · {number(searchTotals.categorySearches)} from category browsing.
        </p>
        <RankList rows={data.topSearches?.searches} getLabel={(row) => row.query} getValue={(row) => row.count} getDetail={(row) => `${row.location ? `mostly in ${row.location} · ` : ""}avg ${number(row.avgResults)} results${row.zeroResults ? ` · ${number(row.zeroResults)} with no results` : ""}`} valueLabel="searches" />
        {!!data.topSearches?.zeroResult?.length && <div className={styles.zeroBlock}>
          <div className={styles.splitHeading}>Searches that found nothing <Chip size="small" label="opportunity" color="warning" variant="outlined" /></div>
          <RankList rows={data.topSearches.zeroResult} getLabel={(row) => row.query} getValue={(row) => row.count} getDetail={(row) => (row.location ? `mostly in ${row.location}` : "")} valueLabel="searches" />
        </div>}
      </Paper>
      <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "14px" }}>
        <h2 className={styles.panelTitle}>Devices &amp; browsers</h2>
        <p className={styles.panelSubtitle}>Unique visitors split by device type and browser.</p>
        <div className={styles.splitColumns}>
          <div>
            <h3 className={styles.splitHeading}>Device</h3>
            <RankList rows={data.devices?.devices} getLabel={(row) => row.device} getValue={(row) => row.visitors} valueLabel="visitors" />
          </div>
          <div>
            <h3 className={styles.splitHeading}>Browser</h3>
            <RankList rows={data.devices?.browsers} getLabel={(row) => row.browser} getValue={(row) => row.visitors} valueLabel="visitors" />
          </div>
        </div>
      </Paper>
    </div>
  </Box>;
}
