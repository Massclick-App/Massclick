import { Chip, CircularProgress, Dialog, DialogContent, IconButton } from "@mui/material";
import { Award, Building2, CalendarDays, CheckCircle2, History, MapPin, Sparkles, Store, UserRound, X } from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/public/rewards/RewardMembersPage.module.css";

const cx = createScopedClassNames(styles);
const fmt = (value) => Number(value || 0).toLocaleString("en-IN");
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function MemberProfileDialog({ detail, loading, onClose }) {
  const profile = detail?.profile;
  const member = profile?.member;
  return <Dialog open={Boolean(detail)} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: cx("dialog") }} aria-labelledby="shared-member-profile-title">
    <div className={cx("dialog-hero")}><div className={cx("avatar")}>{detail?.member?.displayName?.slice(0, 1).toUpperCase()}</div><div className={cx("hero-copy")}><span><Sparkles size={14} /> MEMBER REWARD PROFILE</span><h2 id="shared-member-profile-title">{profile?.displayName || detail?.member?.displayName}</h2><p>{member?.isBusinessPerson ? "Business member" : "MassClick community member"} · {profile?.wallet?.tier || detail?.member?.tier || "Silver"} tier</p></div><IconButton className={cx("close")} onClick={onClose} aria-label="Close member profile"><X /></IconButton></div>
    <DialogContent>{loading ? <div className={cx("loading")}><CircularProgress size={28} /><span>Loading member profile…</span></div> : profile?.error ? <div className={cx("loading")}>{profile.error}</div> : <>
      <div className={cx("identity-grid")}><Info icon={<UserRound />} label="Member type" value={member?.isBusinessPerson ? "Business person" : "Individual member"} /><Info icon={<CheckCircle2 />} label="Profile status" value={member?.profileCompleted ? "Profile completed" : "Profile in progress"} /><Info icon={<CalendarDays />} label="Member since" value={date(member?.joinedAt)} /></div>
      {member?.isBusinessPerson && <section className={cx("business-card")}><Heading icon={<Store />} title="Business profile" subtitle="Public business information linked to this member." /><div className={cx("business-grid")}><div><small>Business name</small><strong>{member.businessName || "Not provided"}</strong></div><div><small>Category</small><strong>{member.businessCategory || "Not provided"}</strong></div><div><small>Location</small><strong><MapPin size={15} /> {member.businessLocation || "Not provided"}</strong></div></div></section>}
      <div className={cx("wallet")}><div><small>Available points</small><strong>{fmt(profile?.wallet?.availablePoints)}</strong><span>Ready to redeem</span></div><div><small>Lifetime earned</small><strong>{fmt(profile?.wallet?.lifetimeEarned)}</strong><span>Total reward points</span></div><div><small>Redeemed</small><strong>{fmt(profile?.wallet?.lifetimeRedeemed)}</strong><span>Points used</span></div><div className={cx("tier-card")}><Award /><small>Membership</small><Chip label={`${profile?.wallet?.tier || "Silver"} tier`} /></div></div>
      <div className={cx("details-grid")}><Activity icon={<Building2 />} title="Businesses & claims" subtitle="Recent purchase reward claims" empty="No verified purchase claims yet.">{profile?.claims?.map((claim) => <article key={claim._id}><div><b>{claim.businessName}</b><span>{claim.categoryName} · {claim.locationName || "Location not provided"}</span><small>{date(claim.transactionAt)} · ₹{fmt(claim.transactionAmount)}</small></div><strong>{fmt(claim.awardedPoints || claim.projectedPoints)} pts <em>{claim.status}</em></strong></article>)}</Activity><Activity icon={<History />} title="Points timeline" subtitle="Latest account activity" empty="No point transactions yet.">{profile?.transactions?.map((item) => <article key={item._id}><div><b>{item.description || item.milestone?.replaceAll("_", " ")}</b><span>{date(item.createdAt)}</span></div><strong className={item.status === "debited" ? cx("debit") : ""}>{item.status === "debited" ? "−" : "+"}{fmt(item.points)} pts</strong></article>)}</Activity></div>
    </>}</DialogContent>
  </Dialog>;
}

function Info({ icon, label, value }) { return <div><span className={cx("info-icon")}>{icon}</span><small>{label}</small><strong>{value}</strong></div>; }
function Heading({ icon, title, subtitle }) { return <div className={cx("section-heading")}><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>; }
function Activity({ icon, title, subtitle, empty, children }) { const items = Array.isArray(children) ? children.filter(Boolean) : children; return <section><Heading icon={icon} title={title} subtitle={subtitle} />{items?.length ? <div className={cx("activity")}>{items}</div> : <p className={cx("empty")}>{empty}</p>}</section>; }
