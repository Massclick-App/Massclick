import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Paper, TextField, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import axiosInstance from "../../services/axiosInstance.js";
import styles from "./UnifiedAnalytics.module.css";
import { exportAnalyticsWorkbook } from "./analyticsWorkbook.js";

const API_URL = process.env.REACT_APP_API_URL;
const periods = [1, 2, 3, 7, 28, 90, 365];
const number = (value) => Number(value || 0).toLocaleString("en-IN");

function Metric({ icon: Icon, label, value, note, tone }) {
  return <Paper elevation={0} className={styles.metric}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><Icon /></span>
    <Typography className={styles.metricLabel}>{label}</Typography>
    <Typography className={styles.metricValue}>{value}</Typography>
    <Typography className={styles.metricNote}>{note}</Typography>
  </Paper>;
}

function Ranking({ title, subtitle, rows, valueLabel = "searches" }) {
  const maximum = Math.max(...(rows || []).map((row) => Number(row.count || row.sessions || row.clicks || 0)), 1);
  return <Paper elevation={0} className={styles.panel}>
    <Typography className={styles.panelTitle}>{title}</Typography>
    <Typography className={styles.panelSubtitle}>{subtitle}</Typography>
    <div className={styles.ranking}>
      {(rows || []).slice(0, 8).map((row, index) => {
        const value = Number(row.count || row.sessions || row.clicks || 0);
        const label = row.name || row.city || row.country || row.query || "Unknown";
        return <div className={styles.rankRow} key={`${label}-${index}`}>
          <div className={styles.rankCopy}><span>{label}</span><strong>{number(value)} {valueLabel}</strong></div>
          <LinearProgress variant="determinate" value={(value / maximum) * 100} className={styles.progress} />
        </div>;
      })}
      {!rows?.length && <Typography className={styles.empty}>No data in this period</Typography>}
    </div>
  </Paper>;
}

export default function UnifiedAnalytics() {
  const [days, setDays] = useState(28);
  const [category, setCategory] = useState("");
  const [visitorLocation, setVisitorLocation] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [googleQuery, setGoogleQuery] = useState("");
  const [selectedSections, setSelectedSections] = useState(["categories", "visitorLocations", "customerLocations", "queries"]);
  const [draftFilters, setDraftFilters] = useState({
    days: 28,
    category: "",
    visitorLocation: "",
    customerLocation: "",
    googleQuery: "",
    selectedSections: ["categories", "visitorLocations", "customerLocations", "queries"],
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const requests = [
      ["internal", "/businesslist/admin-analytics-report"], ["ga4", "/ga4/overview"],
      ["cities", "/ga4/cities"], ["gsc", "/gsc/overview"], ["queries", "/gsc/queries"],
    ];
    const results = await Promise.allSettled(requests.map(([, url]) => axiosInstance.get(`${API_URL}${url}`, { params: { days, limit: 10 } })));
    const next = {}; const nextErrors = [];
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === "fulfilled") next[key] = key === "internal" ? result.value.data?.report : result.value.data;
      else nextErrors.push(`${key.toUpperCase()}: ${result.reason?.response?.data?.message || result.reason?.message || "unavailable"}`);
    });
    setData(next); setErrors(nextErrors); setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);
  const totals = data.internal?.totals || {};
  const ga = data.ga4?.current || {};
  const gsc = data.gsc?.current || {};
  const categoryOptions = useMemo(() => {
    return Array.from(new Set((data.internal?.otpTopSearchCategories || []).map((item) => String(item.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data.internal]);
  const visitorLocationOptions = useMemo(() => {
    return Array.from(new Set((data.cities || []).map((item) => String(item.city || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data.cities]);
  const customerLocationOptions = useMemo(() => {
    return Array.from(new Set((data.internal?.otpTopSearchLocations || []).map((item) => String(item.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data.internal]);
  const googleQueryOptions = useMemo(() => {
    return Array.from(new Set((data.queries || []).map((item) => String(item.query || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data.queries]);
  const filteredCategories = useMemo(() => {
    const filter = String(category || "").trim().toLowerCase();
    const rows = data.internal?.otpTopSearchCategories || [];
    if (!filter) return rows;
    return rows.filter((row) => String(row.name || "").toLowerCase().includes(filter));
  }, [category, data.internal]);
  const filteredVisitorLocations = useMemo(() => {
    const filter = String(visitorLocation || "").trim().toLowerCase();
    if (!filter) return data.cities || [];
    return (data.cities || []).filter((row) =>
      String(row.city || "").toLowerCase().includes(filter) || String(row.country || "").toLowerCase().includes(filter),
    );
  }, [data.cities, visitorLocation]);
  const filteredCustomerSearchLocations = useMemo(() => {
    const filter = String(customerLocation || "").trim().toLowerCase();
    if (!filter) return data.internal?.otpTopSearchLocations || [];
    return (data.internal?.otpTopSearchLocations || []).filter((row) =>
      String(row.name || "").toLowerCase().includes(filter),
    );
  }, [data.internal, customerLocation]);
  const filteredGoogleQueries = useMemo(() => {
    const filter = String(googleQuery || "").trim().toLowerCase();
    if (!filter) return data.queries || [];
    return (data.queries || []).filter((row) => String(row.query || "").toLowerCase().includes(filter));
  }, [data.queries, googleQuery]);
  const chartData = useMemo(() => filteredCategories.slice(0, 8), [filteredCategories]);
  const exportSectionsOptions = [
    { id: "categories", label: "Most searched categories" },
    { id: "visitorLocations", label: "Visitor locations" },
    { id: "customerLocations", label: "Customer search locations" },
    { id: "queries", label: "Google search queries" },
  ];
  const filters = useMemo(
    () => [
      { label: "Period", value: `Last ${days} days` },
      { label: "Most searched category", value: category.trim() || "All categories" },
      { label: "Visitor location", value: visitorLocation.trim() || "All visitor locations" },
      { label: "Customer search location", value: customerLocation.trim() || "All customer locations" },
      { label: "Google search query", value: googleQuery.trim() || "All queries" },
      { label: "Included sections", value: selectedSections
          .map((key) => exportSectionsOptions.find((item) => item.id === key)?.label || key)
          .join(", ") },
    ],
    [days, category, visitorLocation, customerLocation, googleQuery, selectedSections],
  );

  const openFilters = () => {
    setDraftFilters({ days, category, visitorLocation, customerLocation, googleQuery, selectedSections: [...selectedSections] });
    setFilterDialogOpen(true);
  };

  const applyFilters = () => {
    setDays(Number(draftFilters.days));
    setCategory(draftFilters.category);
    setVisitorLocation(draftFilters.visitorLocation);
    setCustomerLocation(draftFilters.customerLocation);
    setGoogleQuery(draftFilters.googleQuery);
    setSelectedSections(draftFilters.selectedSections);
    setFilterDialogOpen(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      await exportAnalyticsWorkbook({
        data: { ...data, filteredCategories, filteredVisitorLocations, filteredCustomerSearchLocations, filteredGoogleQueries },
        days,
        filters,
        sections: selectedSections,
        errors,
      });
    } catch (error) {
      setExportError(error.message || "Unable to create the Excel workbook.");
    } finally {
      setExporting(false);
    }
  };

  return <Box className={styles.page}>
    <div className={styles.header}>
      <div><Typography className={styles.title}>Analytics command centre</Typography><Typography className={styles.subtitle}>OTP customers, on-site demand, GA4 visitors, and Google Search performance in one view.</Typography></div>
      <div className={styles.controls}>
        <Button variant="outlined" onClick={openFilters} className={styles.filterButton}>Filters</Button>
        <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={handleExport} disabled={loading || exporting} sx={{ bgcolor: "#102a43", color: "#fff", textTransform: "none", fontWeight: 750, boxShadow: "0 7px 16px rgba(16, 42, 67, .16)", "&:hover": { bgcolor: "#1f4668" } }}>{exporting ? "Creating XLSX…" : "Export XLSX"}</Button>
        <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={load} disabled={loading}>Refresh</Button>
      </div>
    </div>
    <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Analytics Filters</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 1 }}>
          <TextField select size="small" label="Period" value={draftFilters.days} onChange={(event) => setDraftFilters((current) => ({ ...current, days: Number(event.target.value) }))}>
            {periods.map((item) => <MenuItem key={item} value={item}>Last {item} day{item === 1 ? "" : "s"}</MenuItem>)}
          </TextField>
          <Autocomplete
            freeSolo
            size="small"
            options={categoryOptions}
            value={draftFilters.category}
            onChange={(_, value) => setDraftFilters((current) => ({ ...current, category: value || "" }))}
            onInputChange={(_, value) => setDraftFilters((current) => ({ ...current, category: value }))}
            renderInput={(params) => <TextField {...params} label="Most searched categories" placeholder="Select or enter a category" />}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={visitorLocationOptions}
            value={draftFilters.visitorLocation}
            onChange={(_, value) => setDraftFilters((current) => ({ ...current, visitorLocation: value || "" }))}
            onInputChange={(_, value) => setDraftFilters((current) => ({ ...current, visitorLocation: value }))}
            renderInput={(params) => <TextField {...params} label="Visitor locations" placeholder="Select or enter a visitor location" />}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={customerLocationOptions}
            value={draftFilters.customerLocation}
            onChange={(_, value) => setDraftFilters((current) => ({ ...current, customerLocation: value || "" }))}
            onInputChange={(_, value) => setDraftFilters((current) => ({ ...current, customerLocation: value }))}
            renderInput={(params) => <TextField {...params} label="Customer search locations" placeholder="Select or enter a customer location" />}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={googleQueryOptions}
            value={draftFilters.googleQuery}
            onChange={(_, value) => setDraftFilters((current) => ({ ...current, googleQuery: value || "" }))}
            onInputChange={(_, value) => setDraftFilters((current) => ({ ...current, googleQuery: value }))}
            renderInput={(params) => <TextField {...params} label="Google search queries" placeholder="Select or enter a Google query" />}
          />
          <Autocomplete
            multiple
            size="small"
            options={exportSectionsOptions}
            value={exportSectionsOptions.filter((option) => draftFilters.selectedSections.includes(option.id))}
            getOptionLabel={(option) => option.label}
            onChange={(_, value) => setDraftFilters((current) => ({ ...current, selectedSections: value.map((option) => option.id) }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option.label} size="small" {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Export sections" placeholder="Select XLSX sections" />}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFilterDialogOpen(false)} color="secondary">Cancel</Button>
        <Button onClick={applyFilters} variant="contained">Apply</Button>
      </DialogActions>
    </Dialog>
    {loading && <LinearProgress className={styles.loading} />}
    {!!errors.length && <Alert severity="warning" className={styles.alert}>Some sources could not load. Available sections are still shown. {errors.join(" · ")}</Alert>}
    {!!exportError && <Alert severity="error" className={styles.alert}>{exportError}</Alert>}
    <div className={styles.sourceRow}><Chip label="Customer DB · live" color="success" variant="outlined" /><Chip label="GA4 · up to 1 hour delay" variant="outlined" /><Chip label="GSC · usually 2–3 days delay" variant="outlined" /></div>
    <div className={styles.metrics}>
      <Metric icon={GroupsRoundedIcon} tone="orange" label="OTP customers" value={number(totals.otpCustomers)} note={`${number(totals.otpCustomersRegisteredInPeriod)} registered in this period`} />
      <Metric icon={LoginRoundedIcon} tone="purple" label="Customers logged in" value={number(totals.otpCustomersLoggedInInPeriod)} note="Unique phone users with a successful OTP login" />
      <Metric icon={PublicRoundedIcon} tone="blue" label="Website visitors" value={number(ga.activeUsers)} note={`${number(ga.sessions)} sessions · ${number(ga.pageViews)} page views`} />
      <Metric icon={TravelExploreRoundedIcon} tone="green" label="Google clicks" value={number(gsc.clicks)} note={`${number(gsc.impressions)} impressions · ${number(gsc.ctr)}% CTR`} />
      <Metric icon={SearchRoundedIcon} tone="pink" label="On-site searches" value={number(totals.searches)} note={`${number(totals.searchesLast7Days)} captured in the last 7 days`} />
    </div>
    <div className={styles.grid}>
      <Paper elevation={0} className={`${styles.panel} ${styles.wide}`}><Typography className={styles.panelTitle}>Most searched categories</Typography><Typography className={styles.panelSubtitle}>Searches made by signed-in phone/OTP customers during this period.</Typography><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 25 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="count" fill="#f97316" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Paper>
      <Ranking title="Visitor locations" subtitle="Top GA4 cities by sessions." rows={filteredVisitorLocations} valueLabel="sessions" />
      <Ranking title="Customer search locations" subtitle="Locations selected by OTP customers." rows={filteredCustomerSearchLocations} />
      <Ranking title="Google search queries" subtitle="Queries that brought organic visibility in GSC." rows={filteredGoogleQueries} valueLabel="clicks" />
    </div>
  </Box>;
}
