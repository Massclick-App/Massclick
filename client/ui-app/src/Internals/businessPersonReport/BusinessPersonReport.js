import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Autocomplete, Button, CircularProgress, TextField } from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../services/axiosInstance.js";
import { findReportBusinesses, findReportCategories, findReportLocations } from "../../redux/actions/businessPersonReportAction.js";
import { exportBusinessPersonReport } from "./businessPersonReportWorkbook.js";
import styles from "./BusinessPersonReport.module.css";

const iso = (date) => date.toISOString().slice(0, 10);
const initialFrom = () => { const date = new Date(); date.setDate(date.getDate() - 29); return iso(date); };
const number = (value) => Number(value || 0).toLocaleString("en-IN");
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function BusinessPersonReport() {
  const dispatch = useDispatch();
  const { categories, locations, businesses, businessTotal: businessCount, loading: optionLoading, errors: optionErrors } = useSelector((state) => state.businessPersonReport);
  const [category, setCategory] = useState(null); const [categorySearch, setCategorySearch] = useState(""); const [location, setLocation] = useState(null); const [locationSearch, setLocationSearch] = useState("");
  const [business, setBusiness] = useState(null); const [businessSearch, setBusinessSearch] = useState("");
  const [from, setFrom] = useState(initialFrom); const [to, setTo] = useState(() => iso(new Date()));
  const [report, setReport] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [exporting, setExporting] = useState(false);
  const categoryRequest = useRef(0); const locationRequest = useRef(0); const businessRequest = useRef(0);

  useEffect(() => {
    const requestId = ++categoryRequest.current;
    const timer = setTimeout(() => {
      dispatch(findReportCategories(categorySearch, requestId)).catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [categorySearch, dispatch]);
  useEffect(() => {
    setLocation(null); setBusiness(null); setReport(null);
    if (!category) return;
    setLocationSearch("");
  }, [category, dispatch]);
  useEffect(() => {
    if (!category) return undefined;
    const timer = setTimeout(() => dispatch(findReportLocations(category.name, locationSearch, ++locationRequest.current)).catch(() => {}), 200);
    return () => clearTimeout(timer);
  }, [category, locationSearch, dispatch]);
  useEffect(() => {
    if (!category || !location) return undefined;
    const timer = setTimeout(() => {
      dispatch(findReportBusinesses({ category: category.name, location: location.name, search: businessSearch }, ++businessRequest.current)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [category, location, businessSearch, dispatch]);

  const loadReport = async () => { if (!business) return setError("Select a business"); if (!from || !to || from > to) return setError("Choose a valid date range"); setLoading(true); setError(""); try { const response = await axiosInstance.get("/admin/business-person-reports/report", { params: { businessId: business.id, from, to } }); setReport(response.data); } catch (e) { setError(e.response?.data?.message || "Could not generate report"); } finally { setLoading(false); } };
  const cards = useMemo(() => report ? [["Category searches",report.metrics.categorySearches],["Unique searchers",report.metrics.categorySearchers],["Business visits",report.metrics.businessVisits],["Unique visitors",report.metrics.uniqueBusinessVisitors],["Calls",report.metrics.calls],["WhatsApp clicks",report.metrics.whatsappClicks],["Business leads sent",report.metrics.businessLeadsSent ?? report.metrics.publicLeadsSent],["Customer leads sent",report.metrics.customerLeadsSent ?? 0]] : [], [report]);
  const doExport = async () => { setExporting(true); try { await exportBusinessPersonReport(report); } catch (e) { setError(e.message || "Excel export failed"); } finally { setExporting(false); } };

  return <div className={styles.page}>
    <div className={styles.head}><div><h1>Business Person Report</h1><p>Select category and location, choose a business, then generate its complete report.</p></div>{report && <Button variant="contained" startIcon={<FileDownloadRoundedIcon/>} onClick={doExport} disabled={exporting}>{exporting ? "Preparing..." : "Export Excel"}</Button>}</div>
    <div className={styles.filters}>
      <Autocomplete options={categories} value={category} inputValue={categorySearch} loading={optionLoading.categories} filterOptions={(items)=>items} getOptionLabel={(option)=>option.name||""} isOptionEqualToValue={(a,b)=>a.id===b.id} onInputChange={(_,v)=>setCategorySearch(v)} onChange={(_,v)=>setCategory(v)} noOptionsText={optionLoading.categories?"Searching categories...":categorySearch?`No categories matching "${categorySearch}"`:"No categories found"} renderOption={(props,option)=><li {...props}><div><strong>{option.name}</strong><br/><small>{Number(option.businessCount||0).toLocaleString("en-IN")} businesses{option.active?"":" · Inactive category"}</small></div></li>} renderInput={(params)=><TextField {...params} error={Boolean(optionErrors.categories)} helperText={optionErrors.categories||""} label="1. Category" placeholder="Type to search categories" size="small"/>}/>
      <Autocomplete options={locations} value={location} inputValue={locationSearch} disabled={!category} loading={optionLoading.locations} filterOptions={(items)=>items} getOptionLabel={(option)=>option.name||""} isOptionEqualToValue={(a,b)=>a.name===b.name} onInputChange={(_,v)=>setLocationSearch(v)} onChange={(_,v)=>{setLocation(v);setBusiness(null);setBusinessSearch("");setReport(null);}} noOptionsText={optionLoading.locations?"Searching districts...":"No matching master-location districts"} renderOption={(props,option)=><li {...props}><div><strong>{option.name}</strong><br/><small>Master district · {Number(option.businessCount||0).toLocaleString("en-IN")} matching businesses</small></div></li>} renderInput={(params)=><TextField {...params} error={Boolean(optionErrors.locations)} helperText={optionErrors.locations||""} label="2. Master district" placeholder="Type district or alias (e.g. Trichy)" size="small"/>}/>
      <Autocomplete options={businesses} value={business} disabled={!category||!location} loading={optionLoading.businesses} filterOptions={(items)=>items} inputValue={businessSearch} onInputChange={(_,v)=>setBusinessSearch(v)} onChange={(_,v)=>{setBusiness(v);setReport(null);}} getOptionLabel={(o)=>o.name||""} isOptionEqualToValue={(a,b)=>a.id===b.id} noOptionsText={!category||!location?"Select category and location first":"No matching businesses"} renderOption={(props,o)=><li {...props}><div><strong>{o.name}</strong><br/><small>{o.location} · {o.category} · {o.contact||o.whatsapp||"No contact"}</small></div></li>} renderInput={(params)=><TextField {...params} error={Boolean(optionErrors.businesses)} helperText={optionErrors.businesses||""} label={`3. Business${category&&location?` (${businessCount.toLocaleString("en-IN")} found)`:""}`} placeholder="Search all matching businesses" size="small"/>}/>
      <TextField type="date" label="From date" size="small" value={from} onChange={(e)=>setFrom(e.target.value)} InputLabelProps={{shrink:true}} inputProps={{max:to}}/>
      <TextField type="date" label="To date" size="small" value={to} onChange={(e)=>setTo(e.target.value)} InputLabelProps={{shrink:true}} inputProps={{min:from,max:iso(new Date())}}/>
      <Button variant="contained" startIcon={loading?<CircularProgress size={16} color="inherit"/>:<AssessmentRoundedIcon/>} onClick={loadReport} disabled={loading||!business}>Generate report</Button>
    </div>
    {error && <Alert severity="error" onClose={()=>setError("")}>{error}</Alert>}
    {report && <>
      <div className={styles.person}><div><span>Owner / Contact</span><strong>{report.person.name || "-"}</strong></div><div><span>Business</span><strong>{report.person.businessName || "-"}</strong></div><div><span>Mobile</span><strong>{report.person.mobile}</strong></div><div><span>Category</span><strong>{report.person.category || "-"}</strong></div></div>
      <div className={styles.metrics}>{cards.map(([label,value])=><div className={styles.metric} key={label}><span>{label}</span><strong>{number(value)}</strong></div>)}</div>
      <div className={styles.note}>Report timezone: Asia/Kolkata. Site Analytics raw events are retained for 90 days; message delivery audits are retained for 180 days. A range extending beyond those windows may be incomplete.</div>
      {Number(report.metrics.excludedUnrelatedLeadAudits || 0) > 0 && <Alert severity="info">Data-quality protection excluded {number(report.metrics.excludedUnrelatedLeadAudits)} historical lead audit rows because their category or district did not match the selected business.</Alert>}
      <ReportTable title="Selected business" headers={["Business","Category","Location","Contact","WhatsApp","Live"]} rows={report.businesses.map((r)=>[r.name,r.category,r.location,r.contact,r.whatsapp,r.live?"Yes":"No"])} />
      <ReportTable title="Daily performance" headers={["Date","Visits","Unique visitors","Calls","WhatsApp","Enquiries"]} rows={report.daily.map((r)=>[r.date,number(r.visits),number(r.uniqueVisitors),number(r.calls),number(r.whatsapp),number(r.enquiries)])}/>
      <ReportTable title="Category search details" headers={["Search query","Location","Searches","Unique visitors","First","Last"]} rows={report.categorySearches.map((r)=>[r.query,r.location,number(r.searches),number(r.uniqueVisitors),dateTime(r.firstAt),dateTime(r.lastAt)])}/>
      <ReportTable title={`Business leads — customer details sent to this business (${(report.businessLeadDeliveries || report.leadDeliveries || []).length} attempts)`} headers={["Date","Status","Customer","Customer mobile","Category","Location","Business recipient","Source"]} rows={(report.businessLeadDeliveries || report.leadDeliveries || []).map((r)=>[dateTime(r.date),r.status,r.customerName,r.customerMobile,r.category,r.location,r.recipientMobile,r.source])}/>
      <ReportTable title={`Customer leads — this business's details sent to customers (${(report.customerLeadDeliveries || []).length} messages)`} headers={["Date","Status","Customer","Customer mobile","Category","Location","Customer recipient","Source"]} rows={(report.customerLeadDeliveries || []).map((r)=>[dateTime(r.date),r.status,r.customerName,r.customerMobile,r.category,r.location,r.recipientMobile,r.source])}/>
    </>}
  </div>;
}

function ReportTable({title,headers,rows}) { return <section className={styles.tableCard}><h2>{title}</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr>{headers.map((h)=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell || "-"}</td>)}</tr>):<tr><td className={styles.empty} colSpan={headers.length}>No records for the selected period</td></tr>}</tbody></table></div></section>; }
