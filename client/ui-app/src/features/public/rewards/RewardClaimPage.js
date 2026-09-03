import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Autocomplete, Button, Checkbox, CircularProgress, Dialog, DialogContent, DialogTitle, FormControl, InputAdornment, InputLabel, MenuItem, Pagination, Select, TextField } from "@mui/material";
import { CheckCircle2, Crown, FileText, Gift, History, Info, MapPin, Medal, ReceiptText, Sparkles, Store, Trophy, UploadCloud, UsersRound, X } from "lucide-react";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { createRewardClaim, fetchMyRewardClaims, fetchRewardBusinesses, fetchRewardBusinessLocations, fetchRewardCategoryOptions, fetchRewardLeaderboard, fetchRewardMemberProfile } from "shared/services/rewardService.js";
import MemberProfileDialog from "features/public/rewards/MemberProfileDialog.js";
import styles from "features/public/rewards/RewardClaimPage.module.css";

const cx = createScopedClassNames(styles);
const blank = { categoryId: "", categoryName: "", locationId: "", locationName: "", locationSlug: "", businessId: "", businessName: "", transactionAmount: "", transactionAt: "", invoiceNumber: "", paymentMethod: "", notes: "", evidenceFiles: [], consentConfirmed: false };
const EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
const labels = { pending: "Under review", approved: "Points credited", rejected: "Not approved", needs_information: "Information needed" };
const readUser = () => { try { return JSON.parse(localStorage.getItem("authUser") || "{}"); } catch { return {}; } };
const toLocalDateTimeValue = (date = new Date()) => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

export default function RewardClaimPage() {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);
  const signedIn = Boolean(localStorage.getItem("authToken") || localStorage.getItem("customerAccessToken"));
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [form, setForm] = useState(blank);
  const [locationLoading, setLocationLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ open: false, data: [], total: 0, page: 1, loading: false });
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);

  useEffect(() => {
    fetchRewardCategoryOptions().then(setCategories).catch(() => setMessage("Categories could not be loaded."));
    if (signedIn) fetchMyRewardClaims().then(setClaims).catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    fetchRewardLeaderboard({ page: 1, limit: 10 }).then((result) => setLeaders(result.data || [])).catch(() => setLeaders([]));
  }, [signedIn]);

  const loadLeaderboard = async (page = 1) => {
    setLeaderboard((current) => ({ ...current, open: true, page, loading: true }));
    try {
      const result = await fetchRewardLeaderboard({ page, limit: 10 });
      setLeaderboard({ open: true, data: result.data || [], total: result.total || 0, page, loading: false });
    } catch {
      setLeaderboard((current) => ({ ...current, loading: false }));
    }
  };

  const openMember = useCallback(async (member) => {
    setMemberDetail({ member, profile: null });
    setMemberDetailLoading(true);
    try { setMemberDetail({ member, profile: await fetchRewardMemberProfile(member.memberKey) }); }
    catch { setMemberDetail({ member, profile: { error: "Reward activity could not be loaded." } }); }
    finally { setMemberDetailLoading(false); }
  }, []);

  useEffect(() => {
    const bindings = [];
    const connectRows = (className, data) => {
      document.querySelectorAll(`.${className}`).forEach((list) => {
        Array.from(list.children).forEach((row, index) => {
          const member = data[index];
          if (!member || row.classList.contains(styles["leader-empty"])) return;
          const activate = () => openMember(member);
          const keydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } };
          row.classList.add(styles["leader-row"]);
          row.setAttribute("role", "button"); row.setAttribute("tabindex", "0");
          row.setAttribute("aria-label", `View reward profile for ${member.displayName}`);
          row.addEventListener("click", activate); row.addEventListener("keydown", keydown);
          bindings.push(() => { row.removeEventListener("click", activate); row.removeEventListener("keydown", keydown); });
        });
      });
    };
    connectRows(styles["leader-list"], leaders);
    connectRows(styles["leader-dialog-list"], leaderboard.data);
    return () => bindings.forEach((remove) => remove());
  }, [leaders, leaderboard.data, openMember]);

  useEffect(() => {
    if (!form.categoryName) { setLocations([]); return; }
    let active = true;
    setLocationLoading(true);
    fetchRewardBusinessLocations(form.categoryName)
      .then((data) => { if (active) setLocations(data); })
      .catch(() => { if (active) setLocations([]); })
      .finally(() => { if (active) setLocationLoading(false); });
    return () => { active = false; };
  }, [form.categoryName]);

  useEffect(() => {
    if (!form.categoryName || !form.locationName) { setBusinesses([]); return; }
    let active = true;
    setBusinessLoading(true);
    fetchRewardBusinesses({ category: form.categoryName, location: form.locationName })
      .then((data) => { if (active) setBusinesses(data); })
      .catch(() => { if (active) setBusinesses([]); })
      .finally(() => { if (active) setBusinessLoading(false); });
    return () => { active = false; };
  }, [form.categoryName, form.locationName]);

  const selectedCategory = categories.find((item) => item._id === form.categoryId) || null;
  const selectedBusiness = businesses.find((item) => String(item._id) === String(form.businessId)) || null;
  const selectCategory = (value) => setForm((current) => ({ ...current, categoryId: value?._id || "", categoryName: value?.category || "", locationId: "", locationName: "", locationSlug: "", businessId: "", businessName: "" }));
  const selectLocation = (value) => setForm((current) => ({ ...current, locationName: value || "", businessId: "", businessName: "" }));
  const selectBusiness = (value) => setForm((current) => ({ ...current, businessId: value?._id || "", businessName: value?.businessName || value?.name || "" }));
  const selectEvidence = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (form.evidenceFiles.length + selected.length > MAX_EVIDENCE_FILES) { setMessage(`Upload a maximum of ${MAX_EVIDENCE_FILES} files.`); return; }
    const invalid = selected.find((file) => !EVIDENCE_TYPES.includes(file.type) || file.size > MAX_EVIDENCE_SIZE);
    if (invalid) { setMessage("Use JPG, PNG, WebP or PDF files, maximum 5 MB each."); return; }
    const files = await Promise.all(selected.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, fileType: file.type, fileSize: file.size, fileData: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setForm((current) => ({ ...current, evidenceFiles: [...current.evidenceFiles, ...files] }));
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault(); setMessage("");
    if (!signedIn) { setMessage("Please use Login / Sign Up first."); return; }
    setSubmitting(true);
    try {
      const claim = await createRewardClaim({
        ...form,
        transactionAt: new Date(form.transactionAt).toISOString(),
        customerName: user.userName || user.name || "",
      });
      setClaims((current) => [claim, ...current]); setForm(blank); setBusinesses([]);
      setMessage("Claim " + claim.claimNumber + " submitted. Expected points: " + claim.projectedPoints + ".");
    } catch (error) { setMessage(error.response?.data?.message || "Claim could not be submitted."); }
    finally { setSubmitting(false); }
  };

  return <><StickySearchBar /><main className={cx("page")}>
    <header className={cx("hero")}><div><span><Sparkles size={15} /> CONFIRM A SUCCESSFUL PURCHASE</span><h1>Claim your MassClick points</h1><p>Select category and location first. MassClick automatically shows only matching listed businesses.</p></div><div className={cx("hero-icon")}><Gift size={34} /><strong>Verified rewards</strong><small>One claim per transaction</small></div></header>
    <section className={cx("layout")}><form className={cx("form-card")} onSubmit={submit}>
      <div className={cx("card-title")}><div><span>TRANSACTION CONFIRMATION</span><h2>Tell us what was completed</h2><p>Category and business location filter the business dropdown.</p></div><ReceiptText size={26} /></div>
      <div className={cx("grid")}>
        <Autocomplete options={categories} value={selectedCategory} onChange={(_, value) => selectCategory(value)} getOptionLabel={(option) => option.parentName ? option.category + " - " + option.parentName : option.category || ""} groupBy={(option) => option.categoryType || "Categories"} isOptionEqualToValue={(option, value) => option._id === value._id} openOnFocus autoHighlight renderInput={(params) => <TextField {...params} required label="Business category" placeholder="Search all categories" helperText={categories.length.toLocaleString("en-IN") + " categories available"} />} />
        <Autocomplete options={locations} value={form.locationName || null} onChange={(_, value) => selectLocation(value)} getOptionLabel={(option) => String(option || "")} isOptionEqualToValue={(option, value) => option === value} loading={locationLoading} disabled={!form.categoryId} openOnFocus autoHighlight renderInput={(params) => <TextField {...params} required label="Business location" placeholder={form.categoryId ? "Select a listed business location" : "Select category first"} helperText={form.categoryName ? locations.length + " business locations available" : "Locations come from business profiles"} InputProps={{ ...params.InputProps, startAdornment: <><InputAdornment position="start"><MapPin size={17} /></InputAdornment>{params.InputProps.startAdornment}</>, endAdornment: <>{locationLoading && <CircularProgress size={17} />}{params.InputProps.endAdornment}</> }} />} />
        <Autocomplete className={cx("full")} options={businesses} value={selectedBusiness} onChange={(_, value) => selectBusiness(value)} getOptionLabel={(option) => option.businessName || option.name || ""} isOptionEqualToValue={(option, value) => String(option._id) === String(value._id)} loading={businessLoading} disabled={!form.locationName} noOptionsText={businessLoading ? "Finding businesses..." : "No live businesses found"} renderInput={(params) => <TextField {...params} required label="MassClick business" placeholder={form.locationName ? "Search matching businesses" : "Select category and location first"} helperText={form.locationName ? businesses.length + " matching businesses found" : "Only listed businesses can be selected"} />} />
        <TextField required type="number" label="Amount paid" value={form.transactionAmount} onChange={(event) => setForm({ ...form, transactionAmount: event.target.value })} inputProps={{ min: 1, step: ".01" }} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
        <TextField required type="datetime-local" label="Transaction date and time" value={form.transactionAt} onChange={(event) => setForm({ ...form, transactionAt: event.target.value })} InputLabelProps={{ shrink: true }} inputProps={{ max: toLocalDateTimeValue() }} />
        <TextField label="Invoice / receipt number" value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} />
        <FormControl required><InputLabel>Payment method</InputLabel><Select value={form.paymentMethod} label="Payment method" onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>{[["upi","UPI"],["card","Card"],["cash","Cash"],["bank_transfer","Bank transfer"],["wallet","Digital wallet"],["other","Other"]].map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}</Select></FormControl>
        <section className={cx("evidence full")}>
          <div className={cx("evidence-heading")}><div><strong>Bill or payment proof</strong><small>Optional, but helps MassClick verify your claim faster.</small></div><span>{form.evidenceFiles.length}/{MAX_EVIDENCE_FILES}</span></div>
          <label className={cx("upload-zone")}><UploadCloud size={24} /><b>Upload receipt, invoice or payment screenshot</b><small>JPG, PNG, WebP or PDF · maximum 5 MB each</small><input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={selectEvidence} disabled={form.evidenceFiles.length >= MAX_EVIDENCE_FILES} /></label>
          {form.evidenceFiles.length > 0 && <div className={cx("evidence-list")}>{form.evidenceFiles.map((file, index) => <div key={`${file.fileName}-${index}`}><FileText size={18} /><span><b>{file.fileName}</b><small>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" aria-label={`Remove ${file.fileName}`} onClick={() => setForm((current) => ({ ...current, evidenceFiles: current.evidenceFiles.filter((_, itemIndex) => itemIndex !== index) }))}><X size={17} /></button></div>)}</div>}
        </section>
        <TextField className={cx("full")} multiline rows={3} label="Additional details" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </div>
      <label className={cx("consent")}><Checkbox checked={form.consentConfirmed} onChange={(event) => setForm({ ...form, consentConfirmed: event.target.checked })} /><span><strong>I confirm this transaction was completed.</strong><small>Duplicate or false claims may be rejected.</small></span></label>
      {message && <div className={cx("message")}><Info size={18} />{message}</div>}
      <button className={cx("submit")} disabled={submitting || !form.consentConfirmed || !form.businessId}>{submitting ? "Submitting securely..." : "Submit transaction for points"}</button>
    </form><aside className={cx("side-column")}><article className={cx("process-card")}><div className={cx("card-title")}><div><span>FILTER LOGIC</span><h2>Exact business match</h2></div><Store size={26} /></div><p>Category selects stored business locations. Location then selects live businesses.</p></article><article className={cx("leader-card")}><div className={cx("leader-head")}><div><span>COMMUNITY LEADERBOARD</span><h2>Top points earners</h2><p>Highest lifetime points across verified MassClick members.</p></div><Trophy size={25} /></div><div className={cx("leader-list")}>{leaders.length ? leaders.map((leader) => <div key={`${leader.rank}-${leader.displayName}`}><span className={cx(`rank rank-${leader.rank}`)}>{leader.rank <= 3 ? <Medal size={16} /> : leader.rank}</span><i>{leader.displayName.slice(0, 1).toUpperCase()}</i><div><b>{leader.displayName}</b><small>{leader.tier} member</small></div><strong>{leader.lifetimeEarned.toLocaleString("en-IN")} pts</strong></div>) : <div className={cx("leader-empty")}>No ranked members yet.</div>}</div><button className={cx("all-points-button")} type="button" onClick={() => navigate("/reward-members")}><UsersRound size={17} /> Check all user points</button></article></aside></section>
    <section className={cx("history")}><div className={cx("card-title")}><div><span>YOUR CLAIMS</span><h2>Recent confirmations</h2></div><History size={25} /></div>{!claims.length ? <p className={cx("empty")}>Your submitted transactions will appear here.</p> : <div className={cx("claim-list")}>{claims.map((claim) => <article key={claim._id}><div><strong>{claim.businessName}</strong><span>{claim.categoryName + " - " + claim.locationName}</span></div><div><b>₹{Number(claim.transactionAmount).toLocaleString("en-IN")}</b><span>{claim.claimNumber}</span></div><div className={cx("status status-" + claim.status)}>{claim.status === "approved" && <CheckCircle2 size={15} />}{labels[claim.status]}</div><strong className={cx("points")}>{claim.status === "approved" ? "+" + claim.awardedPoints : claim.projectedPoints + " expected"}</strong></article>)}</div>}</section>
    <Dialog open={leaderboard.open} onClose={() => setLeaderboard((current) => ({ ...current, open: false }))} maxWidth="sm" fullWidth PaperProps={{ className: cx("leader-dialog") }}><DialogTitle className={cx("leader-dialog-title")}><div><span><Crown size={16} /> MASSCLICK COMMUNITY</span><h2>All user points</h2><p>Members ranked by verified lifetime points.</p></div><Button onClick={() => setLeaderboard((current) => ({ ...current, open: false }))}>Close</Button></DialogTitle><DialogContent className={cx("leader-dialog-content")}><div className={cx("leader-dialog-list")}>{leaderboard.loading ? <div className={cx("leader-loading")}><CircularProgress size={25} /> Loading rankings...</div> : leaderboard.data.map((leader) => <div key={`${leader.rank}-${leader.displayName}`}><span className={cx(`rank rank-${leader.rank}`)}>{leader.rank <= 3 ? <Medal size={17} /> : leader.rank}</span><i>{leader.displayName.slice(0, 1).toUpperCase()}</i><div><b>{leader.displayName}</b><small>{leader.tier} member · {leader.availablePoints.toLocaleString("en-IN")} available</small></div><strong>{leader.lifetimeEarned.toLocaleString("en-IN")} pts</strong></div>)}</div>{leaderboard.total > 10 && <Pagination count={Math.ceil(leaderboard.total / 10)} page={leaderboard.page} onChange={(_, page) => loadLeaderboard(page)} color="primary" className={cx("leader-pagination")} />}</DialogContent></Dialog>
  </main><MemberProfileDialog detail={memberDetail} loading={memberDetailLoading} onClose={() => setMemberDetail(null)} /><Footer /></>;
}
