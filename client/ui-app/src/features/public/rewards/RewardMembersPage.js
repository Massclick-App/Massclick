import { useCallback, useMemo, useState } from "react";
import { Button, Chip, CircularProgress, Dialog, DialogContent, IconButton } from "@mui/material";
import { ArrowLeft, Award, Building2, CalendarDays, CheckCircle2, Eye, Gift, History, MapPin, Medal, RefreshCw, Sparkles, Store, Trophy, UserRound, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import { fetchRewardLeaderboard, fetchRewardMemberProfile } from "shared/services/rewardService.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import styles from "features/public/rewards/RewardMembersPage.module.css";

const cx = createScopedClassNames(styles);
const fmt = (value) => Number(value || 0).toLocaleString("en-IN");
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function RewardMembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async (page, limit) => {
    setLoading(true);
    try { const result = await fetchRewardLeaderboard({ page, limit }); setMembers(result.data || []); setTotal(result.total || 0); }
    finally { setLoading(false); }
  }, []);

  const open = async (member) => {
    setDetail({ member, profile: null }); setDetailLoading(true);
    try { setDetail({ member, profile: await fetchRewardMemberProfile(member.memberKey) }); }
    catch { setDetail({ member, profile: { error: "Reward activity could not be loaded." } }); }
    finally { setDetailLoading(false); }
  };

  const columns = useMemo(() => [
    { id: "rank", label: "Rank", renderCell: (_, row) => <span className={cx("rank")}>{row.rank <= 3 ? <Medal size={18} /> : `#${row.rank}`}</span> },
    { id: "displayName", label: "Member", renderCell: (_, row) => <div className={cx("member")}><i>{row.displayName.slice(0, 1).toUpperCase()}</i><div><b>{row.displayName}</b><span>MassClick rewards member</span></div></div> },
    { id: "tier", label: "Membership", renderCell: (_, row) => <Chip size="small" label={`${row.tier} member`} className={cx("tier", `tier-${String(row.tier).toLowerCase()}`)} /> },
    { id: "availablePoints", label: "Available points", renderCell: (_, row) => <strong className={cx("available")}>{fmt(row.availablePoints)} <small>pts</small></strong> },
    { id: "lifetimeEarned", label: "Lifetime earned", renderCell: (_, row) => <strong>{fmt(row.lifetimeEarned)} pts</strong> },
    { id: "view", label: "Details", renderCell: (_, row) => <Button className={cx("view")} variant="outlined" size="small" startIcon={<Eye size={16} />} onClick={() => open(row)}>View</Button> },
  ], []);

  const profile = detail?.profile;
  const memberInfo = profile?.member;
  return <>
    <StickySearchBar />
    <main className={cx("page")}>
      <header><div><span><Trophy size={16} /> COMMUNITY REWARDS</span><h1>All user points</h1><p>A transparent view of reward balances and verified point activity across MassClick members.</p></div><div className={cx("head-actions")}><Button startIcon={<ArrowLeft size={17} />} onClick={() => navigate("/claim-rewards")}>Back to claims</Button><Button variant="contained" startIcon={<RefreshCw size={17} />} onClick={() => setRefreshKey((value) => value + 1)}>Refresh</Button></div></header>
      <section className={cx("summary")}><div><UsersRound /><span><small>Reward members</small><strong>{fmt(total)}</strong></span></div><div><Award /><span><small>Verified point records</small><strong>Live directory</strong></span></div><div><Gift /><span><small>Privacy protected</small><strong>No contact data shown</strong></span></div></section>
      <section className={cx("table")}><CustomizedTable title="Member points directory" columns={columns} data={members} total={total} fetchData={load} loading={loading} enableStatusFilter={false} searchPlaceholder="Search members" refreshKey={refreshKey} onRowClick={open} /></section>
    </main>
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md" PaperProps={{ className: cx("dialog") }} aria-labelledby="member-profile-title">
      <div className={cx("dialog-hero")}><div className={cx("avatar")}>{detail?.member?.displayName?.slice(0, 1).toUpperCase()}</div><div className={cx("hero-copy")}><span><Sparkles size={14} /> MEMBER REWARD PROFILE</span><h2 id="member-profile-title">{profile?.displayName || detail?.member?.displayName}</h2><p>{memberInfo?.isBusinessPerson ? "Business member" : "MassClick community member"} · {profile?.wallet?.tier || detail?.member?.tier || "Silver"} tier</p></div><IconButton className={cx("close")} onClick={() => setDetail(null)} aria-label="Close member profile"><X /></IconButton></div>
      <DialogContent>
        {detailLoading ? <div className={cx("loading")}><CircularProgress size={28} /><span>Loading member profile…</span></div> : profile?.error ? <div className={cx("loading")}>{profile.error}</div> : <>
          <div className={cx("identity-grid")}><div><span className={cx("info-icon")}><UserRound /></span><small>Member type</small><strong>{memberInfo?.isBusinessPerson ? "Business person" : "Individual member"}</strong></div><div><span className={cx("info-icon")}><CheckCircle2 /></span><small>Profile status</small><strong>{memberInfo?.profileCompleted ? "Profile completed" : "Profile in progress"}</strong></div><div><span className={cx("info-icon")}><CalendarDays /></span><small>Member since</small><strong>{date(memberInfo?.joinedAt)}</strong></div></div>
          {memberInfo?.isBusinessPerson && <section className={cx("business-card")}><div className={cx("section-heading")}><span><Store /></span><div><h3>Business profile</h3><p>Public business information linked to this member.</p></div></div><div className={cx("business-grid")}><div><small>Business name</small><strong>{memberInfo.businessName || "Not provided"}</strong></div><div><small>Category</small><strong>{memberInfo.businessCategory || "Not provided"}</strong></div><div><small>Location</small><strong><MapPin size={15} /> {memberInfo.businessLocation || "Not provided"}</strong></div></div></section>}
          <div className={cx("wallet")}><div><small>Available points</small><strong>{fmt(profile?.wallet?.availablePoints)}</strong><span>Ready to redeem</span></div><div><small>Lifetime earned</small><strong>{fmt(profile?.wallet?.lifetimeEarned)}</strong><span>Total reward points</span></div><div><small>Redeemed</small><strong>{fmt(profile?.wallet?.lifetimeRedeemed)}</strong><span>Points used</span></div><div className={cx("tier-card")}><Award /><small>Membership</small><Chip label={`${profile?.wallet?.tier || "Silver"} tier`} /></div></div>
          <div className={cx("details-grid")}><ActivitySection icon={<Building2 />} title="Businesses & claims" subtitle="Recent purchase reward claims" empty="No verified purchase claims yet.">{profile?.claims?.map((claim) => <article key={claim._id}><div><b>{claim.businessName}</b><span>{claim.categoryName} · {claim.locationName || "Location not provided"}</span><small>{date(claim.transactionAt)} · ₹{fmt(claim.transactionAmount)}</small></div><strong>{fmt(claim.awardedPoints || claim.projectedPoints)} pts <em>{claim.status}</em></strong></article>)}</ActivitySection><ActivitySection icon={<History />} title="Points timeline" subtitle="Latest account activity" empty="No point transactions yet.">{profile?.transactions?.map((item) => <article key={item._id}><div><b>{item.description || item.milestone?.replaceAll("_", " ")}</b><span>{date(item.createdAt)}</span></div><strong className={item.status === "debited" ? cx("debit") : ""}>{item.status === "debited" ? "−" : "+"}{fmt(item.points)} pts</strong></article>)}</ActivitySection></div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}

function ActivitySection({ icon, title, subtitle, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return <section><div className={cx("section-heading")}><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>{items?.length ? <div className={cx("activity")}>{items}</div> : <p className={cx("empty")}>{empty}</p>}</section>;
}
