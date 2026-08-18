import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, InputAdornment, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip,
} from "@mui/material";
import {
  AlertCircle, Award, BadgeIndianRupee, CheckCircle2, CircleHelp, Clock3,
  Download, Edit3, FileSpreadsheet, Layers3, PauseCircle, Plus, ShieldCheck,
  Sparkles, Target, Trash2, TrendingUp, Upload, Users, X,
} from "lucide-react";
import CustomizedTable from "../../components/Table/CustomizedTable";
import { deleteRewardRule, fetchRewardCategoryOptions, fetchRewardRules, saveRewardRule } from "../../services/rewardService";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./RewardAdmin.module.css";
import { downloadRewardPolicyTemplate, parseRewardPolicyWorkbook } from "./rewardPolicyExcel";

const cx = createScopedClassNames(styles);
const emptyRule = {
  categoryId: "", categoryKey: "", categoryName: "", basePoints: 10,
  acceptedBonus: 5, completedBonus: 10, customerConfirmedBonus: 0,
  maxPointsPerEnquiry: 25, monthlyCustomerCap: 1000,
  pointsExpireAfterDays: 365, approvalMode: "automatic", enabled: true,
};
const milestones = [
  { key: "basePoints", step: "01", title: "Enquiry created", text: "A valid customer enquiry enters the system." },
  { key: "acceptedBonus", step: "02", title: "Business accepted", text: "The selected business accepts the genuine lead." },
  { key: "completedBonus", step: "03", title: "Service completed", text: "The business confirms fulfilment of the service." },
  { key: "customerConfirmedBonus", step: "04", title: "Customer confirmed", text: "The customer verifies successful completion." },
];
const format = (value) => Number(value || 0).toLocaleString("en-IN");

function SummaryCard({ icon: Icon, label, value, note, tone }) {
  return <article className={cx(`summary-card summary-${tone}`)}><div className={cx("summary-icon")}><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function NumberField({ label, helper, value, onChange, suffix = "pts", min = 0 }) {
  return <TextField fullWidth type="number" label={label} value={value} onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
    helperText={helper} inputProps={{ min }} InputProps={{ endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> }} />;
}

export default function RewardAdmin() {
  const [rules, setRules] = useState([]); const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [tableRules, setTableRules] = useState([]); const [tableTotal, setTableTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null); const [deleting, setDeleting] = useState(false);
  const [importRows, setImportRows] = useState(null); const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false); const [readingFile, setReadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [ruleData, categoryData] = await Promise.all([fetchRewardRules(), fetchRewardCategoryOptions()]); setRules(ruleData); setCategories(categoryData); }
    catch (error) { setMessage(error.response?.data?.message || "Unable to load reward configuration."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const configuredIds = useMemo(() => new Set(rules.map((rule) => String(rule.categoryId || "")).filter(Boolean)), [rules]);
  const availableCategories = categories.filter((category) => !configuredIds.has(String(category._id)) || String(category._id) === String(editing?.categoryId || ""));
  const selectedCategory = categories.find((category) => String(category._id) === String(editing?.categoryId || "")) || null;
  const activeRules = rules.filter((rule) => rule.enabled).length;
  const averagePoints = activeRules ? Math.round(rules.filter((rule) => rule.enabled).reduce((sum, rule) => sum + Math.min(rule.maxPointsPerEnquiry, rule.basePoints + rule.acceptedBonus + rule.completedBonus + rule.customerConfirmedBonus), 0) / activeRules) : 0;
  const potential = editing ? Number(editing.basePoints) + Number(editing.acceptedBonus) + Number(editing.completedBonus) + Number(editing.customerConfirmedBonus) : 0;
  const effectivePoints = editing ? Math.min(potential, Number(editing.maxPointsPerEnquiry)) : 0;
  const validation = editing ? {
    category: Boolean(editing.categoryId && editing.categoryName && editing.categoryKey),
    cap: Number(editing.maxPointsPerEnquiry) > 0,
    monthly: Number(editing.monthlyCustomerCap) >= Number(editing.maxPointsPerEnquiry),
  } : {};
  const valid = Object.values(validation).every(Boolean);
  const chooseCategory = (category) => setEditing((current) => ({ ...current, categoryId: category?._id || "", categoryName: category?.category || "", categoryKey: category?.slug || String(category?.category || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }));
  const save = async () => {
    if (!valid) { setMessage("Review the highlighted fields before saving."); return; }
    setSaving(true); setMessage("");
    try { await saveRewardRule(editing); setEditing(null); setMessage("Reward policy saved successfully."); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Unable to save reward policy."); }
    finally { setSaving(false); }
  };
  const remove = useCallback(async (rule) => {
    setDeleting(true);
    setMessage("");
    try {
      await deleteRewardRule(rule._id);
      setMessage(`${rule.categoryName} reward policy deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Reward policy could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }, [load]);
  const readImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReadingFile(true); setMessage("");
    try {
      const rows = await parseRewardPolicyWorkbook(file, categories, rules);
      setImportRows(rows); setImportFileName(file.name);
    } catch (error) {
      setMessage(error.message || "Unable to read the Excel workbook.");
    } finally { setReadingFile(false); }
  };
  const importValidRows = async () => {
    const validRows = (importRows || []).filter((row) => row.errors.length === 0);
    if (!validRows.length) return;
    setImporting(true); setMessage("");
    const failures = [];
    for (const row of validRows) {
      try { await saveRewardRule(row.rule); }
      catch (error) { failures.push(`Row ${row.rowNumber}: ${error.response?.data?.message || error.message || "save failed"}`); }
    }
    setImporting(false);
    if (failures.length) {
      setMessage(`${validRows.length - failures.length} policies imported; ${failures.length} failed. ${failures.slice(0, 2).join(" ")}`);
    } else {
      setMessage(`${validRows.length} reward ${validRows.length === 1 ? "policy" : "policies"} imported successfully.`);
      setImportRows(null); setImportFileName("");
    }
    await load();
  };
  const fetchTableData = useCallback((page, limit, filters = {}) => {
    const search = String(filters.search || "").trim().toLowerCase();
    const statusFilter = filters.status || "all";
    const filtered = rules.filter((rule) => {
      const matchesSearch = `${rule.categoryName} ${rule.categoryKey}`.toLowerCase().includes(search);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? rule.enabled : !rule.enabled);
      return matchesSearch && matchesStatus;
    });
    if (filters.sortBy && filters.sortBy !== "actions") {
      const direction = filters.sortOrder === "desc" ? -1 : 1;
      filtered.sort((left, right) => {
        const leftValue = left[filters.sortBy] ?? "";
        const rightValue = right[filters.sortBy] ?? "";
        return typeof leftValue === "number"
          ? (leftValue - Number(rightValue || 0)) * direction
          : String(leftValue).localeCompare(String(rightValue)) * direction;
      });
    }
    setTableTotal(filtered.length);
    setTableRules(filtered.slice((page - 1) * limit, page * limit));
  }, [rules]);
  const tableColumns = useMemo(() => [
    { id: "categoryName", label: "Category", renderCell: (_, rule) => <div className={cx("table-category")}><span><Award size={17} /></span><div><b>{rule.categoryName}</b><small>{rule.categoryKey}</small></div></div> },
    { id: "basePoints", label: "Enquiry", renderCell: (value) => <b>{format(value)} pts</b> },
    { id: "acceptedBonus", label: "Accepted", renderCell: (value) => <b>{format(value)} pts</b> },
    { id: "completedBonus", label: "Completed", renderCell: (value) => <b>{format(value)} pts</b> },
    { id: "maxPointsPerEnquiry", label: "Journey cap", renderCell: (value) => <strong className={cx("table-points")}>{format(value)} pts</strong> },
    { id: "monthlyCustomerCap", label: "Monthly cap", renderCell: (value) => `${format(value)} pts` },
    { id: "pointsExpireAfterDays", label: "Validity", renderCell: (value) => <span className={cx("table-validity")}><Clock3 size={14} />{value ? `${format(value)} days` : "No expiry"}</span> },
    { id: "enabled", label: "Status", renderCell: (_, rule) => <Chip size="small" icon={rule.enabled ? <CheckCircle2 size={14} /> : <PauseCircle size={14} />} label={rule.enabled ? "Active" : "Paused"} className={cx(rule.enabled ? "active-chip" : "paused-chip")} /> },
    { id: "actions", label: "Actions", renderCell: (_, rule) => <div className={cx("table-actions")}><Button size="small" startIcon={<Edit3 size={15} />} onClick={() => setEditing({ ...emptyRule, ...rule })}>Edit</Button><Button size="small" color="error" startIcon={<Trash2 size={15} />} onClick={() => setDeleteTarget(rule)}>Delete</Button></div> },
  ], []);

  return <main className={cx("page")}>
    <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={readImportFile} hidden />
    <header className={cx("hero")}><div><div className={cx("eyebrow")}><Sparkles size={15} /> LOYALTY OPERATIONS</div><h1>Rewards control centre</h1><p>Design sustainable earning policies across every MassClick category, with transparent caps and verified milestones.</p></div><div className={cx("hero-actions")}><Button variant="text" startIcon={<Download size={18} />} onClick={() => downloadRewardPolicyTemplate(categories)}>Template</Button><Button variant="outlined" startIcon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()} disabled={readingFile}>{readingFile ? "Reading Excel…" : "Import Excel"}</Button><Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setEditing({ ...emptyRule })} className={cx("primary-action")}>Create reward policy</Button></div></header>

    <section className={cx("summary-grid")}>
      <SummaryCard icon={Layers3} label="Configured categories" value={format(rules.length)} note={`${format(categories.length)} available in MassClick`} tone="orange" />
      <SummaryCard icon={CheckCircle2} label="Active policies" value={format(activeRules)} note={`${format(rules.length - activeRules)} currently paused`} tone="green" />
      <SummaryCard icon={TrendingUp} label="Average completion" value={`${format(averagePoints)} pts`} note="Across active category policies" tone="blue" />
      <SummaryCard icon={ShieldCheck} label="Fraud controls" value="Protected" note="Caps and idempotency enabled" tone="purple" />
    </section>

    <section className={cx("policy-panel")}><div className={cx("panel-head")}><div><span className={cx("section-kicker")}>CATEGORY POLICIES</span><h2>Reward rules</h2><p>Search, manage and audit each category earning policy.</p></div></div>
      <CustomizedTable title="Reward policies" columns={tableColumns} data={tableRules} total={tableTotal} fetchData={fetchTableData} loading={loading} initialStatusFilter="all" statusOptions={[{ value: "all", label: "All policies" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }]} searchPlaceholder="Search category or policy key" refreshKey={rules} renderEmpty={() => <div className={cx("empty-state")}><Award size={32} /><h3>Create your first reward policy</h3><p>Select an existing MassClick category and configure verified milestone points.</p><Button variant="outlined" onClick={() => setEditing({ ...emptyRule })}>Create policy</Button></div>} />
    </section>

    {message && <div className={cx("toast")} role="status"><CheckCircle2 size={18} /> {message}<button onClick={() => setMessage("")} aria-label="Dismiss"><X size={17} /></button></div>}

    <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ className: cx("delete-dialog") }}>
      <DialogTitle className={cx("delete-dialog-title")}><span><Trash2 size={23} /></span><div><small>DELETE POLICY</small><h2>Remove reward policy?</h2><p>This stops future claims for the selected category.</p></div></DialogTitle>
      <DialogContent className={cx("delete-dialog-content")}><div className={cx("delete-category")}><Award size={20} /><div><span>Selected category</span><strong>{deleteTarget?.categoryName}</strong><small>{deleteTarget?.categoryKey}</small></div></div><p><b>Historical data is protected.</b> Existing claims, customer wallet balances and awarded-point transactions will not be deleted.</p></DialogContent>
      <DialogActions className={cx("delete-dialog-actions")}><Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button><Button variant="contained" color="error" startIcon={<Trash2 size={17} />} onClick={() => remove(deleteTarget)} disabled={deleting}>{deleting ? "Deleting policy…" : "Delete policy"}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(importRows)} onClose={() => !importing && setImportRows(null)} maxWidth="lg" fullWidth PaperProps={{ className: cx("import-dialog") }}>
      <DialogTitle className={cx("dialog-title")}><div><span className={cx("section-kicker")}>BULK POLICY IMPORT</span><h2>Review Excel reward policies</h2><p>{importFileName} · Validate every row before writing policies.</p></div><button onClick={() => setImportRows(null)} disabled={importing} aria-label="Close import dialog"><X size={20} /></button></DialogTitle>
      <DialogContent className={cx("import-content")}>
        <div className={cx("import-summary")}>
          <div><FileSpreadsheet size={22} /><span>Total rows<strong>{importRows?.length || 0}</strong></span></div>
          <div className={cx("import-valid")}><CheckCircle2 size={22} /><span>Ready to import<strong>{importRows?.filter((row) => !row.errors.length).length || 0}</strong></span></div>
          <div className={cx("import-invalid")}><AlertCircle size={22} /><span>Need attention<strong>{importRows?.filter((row) => row.errors.length).length || 0}</strong></span></div>
          <Button variant="outlined" startIcon={<Download size={17} />} onClick={() => downloadRewardPolicyTemplate(categories)}>Download template</Button>
        </div>
        <div className={cx("import-table-wrap")}><table className={cx("import-table")}><thead><tr><th>Excel row</th><th>Category</th><th>Milestones</th><th>Enquiry cap</th><th>Monthly cap</th><th>Mode</th><th>Action</th><th>Validation</th></tr></thead><tbody>{importRows?.map((row) => <tr key={row.rowNumber} className={cx(row.errors.length ? "row-error" : "row-valid")}><td>#{row.rowNumber}</td><td><b>{row.rule.categoryName || "Unknown"}</b><small>{row.rule.categoryKey}</small></td><td>{row.rule.basePoints} / {row.rule.acceptedBonus} / {row.rule.completedBonus} / {row.rule.customerConfirmedBonus}</td><td>{row.rule.maxPointsPerEnquiry} pts</td><td>{row.rule.monthlyCustomerCap} pts</td><td>{row.rule.approvalMode}<small>{row.rule.enabled ? "Active" : "Paused"}</small></td><td><span className={cx(row.action === "Update" ? "update-badge" : "create-badge")}>{row.action}</span></td><td>{row.errors.length ? <span className={cx("error-copy")}><AlertCircle size={14} />{row.errors.join("; ")}</span> : <span className={cx("ready-copy")}><CheckCircle2 size={14} />Ready</span>}</td></tr>)}</tbody></table></div>
        {importRows?.some((row) => row.errors.length) && <p className={cx("import-note")}><AlertCircle size={16} /> Invalid rows will not be imported. Correct them in Excel and select the updated file to include them.</p>}
      </DialogContent>
      <DialogActions className={cx("dialog-actions")}><Button startIcon={<Download size={17} />} onClick={() => downloadRewardPolicyTemplate(categories)} disabled={importing}>Template</Button><Button onClick={() => fileInputRef.current?.click()} disabled={importing}>Choose another file</Button><Button variant="contained" startIcon={<Upload size={17} />} onClick={importValidRows} disabled={importing || !importRows?.some((row) => !row.errors.length)}>{importing ? "Importing…" : `Import ${importRows?.filter((row) => !row.errors.length).length || 0} valid rows`}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} maxWidth="md" fullWidth PaperProps={{ className: cx("dialog-paper") }}>
      <DialogTitle className={cx("dialog-title")}><div><span className={cx("section-kicker")}>{editing?._id ? "EDIT POLICY" : "NEW POLICY"}</span><h2>{editing?._id ? editing.categoryName : "Create category reward policy"}</h2><p>Connect an existing category, define milestones, and protect your reward budget.</p></div><button onClick={() => setEditing(null)} aria-label="Close dialog"><X size={20} /></button></DialogTitle>
      <DialogContent className={cx("dialog-content")}>
        <section className={cx("form-section")}><div className={cx("form-section-head")}><div className={cx("section-number")}>1</div><div><h3>Category and status</h3><p>Select from categories already managed in MassClick.</p></div></div><div className={cx("category-row")}><Autocomplete fullWidth openOnFocus autoHighlight options={availableCategories} value={selectedCategory} disabled={Boolean(editing?.categoryId)} onChange={(_, value) => chooseCategory(value)} getOptionLabel={(option) => option.parentName ? `${option.category} — ${option.parentName}` : option.category || ""} groupBy={(option) => option.categoryType || "Categories"} isOptionEqualToValue={(option, value) => option._id === value._id} noOptionsText={categories.length ? "No matching category" : "Loading MassClick categories…"} renderInput={(params) => <TextField {...params} required error={!validation.category} label="MassClick category" placeholder="Type to search all categories" helperText={editing?.categoryId ? "Category cannot be changed after creation." : `${availableCategories.length.toLocaleString("en-IN")} categories available`} />} /><div className={cx("status-control")}><FormControlLabel control={<Switch checked={editing?.enabled !== false} onChange={(event) => setEditing({ ...editing, enabled: event.target.checked })} />} label={editing?.enabled !== false ? "Policy active" : "Policy paused"} /><small>Paused policies stop new points.</small></div></div></section>

        <section className={cx("form-section")}><div className={cx("form-section-head")}><div className={cx("section-number")}>2</div><div><h3>Verified earning milestones</h3><p>Points are credited progressively—never for searching alone.</p></div></div><div className={cx("milestone-grid")}>{milestones.map((item) => <div className={cx("milestone-field")} key={item.key}><span className={cx("step")}>{item.step}</span><div><h4>{item.title}</h4><p>{item.text}</p><NumberField label="Points" value={editing?.[item.key] ?? 0} onChange={(value) => setEditing({ ...editing, [item.key]: value })} /></div></div>)}</div></section>

        <section className={cx("form-section")}><div className={cx("form-section-head")}><div className={cx("section-number")}>3</div><div><h3>Budget and approval controls</h3><p>Keep liability predictable at customer and enquiry level.</p></div></div><div className={cx("controls-grid")}><NumberField label="Maximum per enquiry" helper="Combined points cannot exceed this amount." value={editing?.maxPointsPerEnquiry ?? 0} onChange={(value) => setEditing({ ...editing, maxPointsPerEnquiry: value })} /><NumberField label="Monthly customer cap" helper="Maximum points one customer can earn monthly." value={editing?.monthlyCustomerCap ?? 0} onChange={(value) => setEditing({ ...editing, monthlyCustomerCap: value })} /><NumberField label="Points validity" helper="Set 0 for no expiry." suffix="days" value={editing?.pointsExpireAfterDays ?? 365} onChange={(value) => setEditing({ ...editing, pointsExpireAfterDays: value })} /><FormControl fullWidth><InputLabel>Approval mode</InputLabel><Select label="Approval mode" value={editing?.approvalMode || "automatic"} onChange={(event) => setEditing({ ...editing, approvalMode: event.target.value })}><MenuItem value="automatic">Automatic after verification</MenuItem><MenuItem value="manual">Manual admin approval</MenuItem></Select><small className={cx("field-helper")}>Choose how verified points are released.</small></FormControl></div></section>

        <aside className={cx("preview")}><div className={cx("preview-icon")}><Target size={22} /></div><div><span>LIVE POLICY PREVIEW</span><h3>A completed journey earns <b>{format(effectivePoints)} points</b></h3><p>{potential > Number(editing?.maxPointsPerEnquiry) ? `${format(potential - editing.maxPointsPerEnquiry)} points are safely limited by the enquiry cap.` : "The current milestone total is within your enquiry cap."}</p></div><div className={cx("preview-economics")}><BadgeIndianRupee size={18} /><span>Estimated reward liability</span><strong>₹{format(Math.round(effectivePoints * 0.5))}</strong><Tooltip title="Based on the standard 1,000 points = ₹500 redemption tier. Actual liability varies by selected reward."><CircleHelp size={16} /></Tooltip></div></aside>
      </DialogContent>
      <DialogActions className={cx("dialog-actions")}><div><Users size={16} /><span>Applies to one verified customer per enquiry</span></div><Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={!valid || saving} startIcon={<ShieldCheck size={17} />}>{saving ? "Saving…" : "Save reward policy"}</Button></DialogActions>
    </Dialog>
  </main>;
}
