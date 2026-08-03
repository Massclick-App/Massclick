import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Clock3, Gift, RefreshCw, ShieldCheck, Sparkles, Star } from "lucide-react";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { fetchRewardWallet, requestRewardRedemption } from "../../../../services/rewardService";
import styles from "./RewardsPage.module.css";

const cx = createScopedClassNames(styles);
const levels = [{ name: "Bronze", points: 100 }, { name: "Silver", points: 300 }, { name: "Gold", points: 700 }, { name: "Platinum", points: 1500 }, { name: "Diamond", points: 5000 }];
const readUser = () => { try { return JSON.parse(localStorage.getItem("authUser") || "{}"); } catch { return {}; } };

export default function RewardsPage() {
  const user = useMemo(readUser, []);
  const customerKey = localStorage.getItem("mobileNumber") || user.mobileNumber1 || user.mobile || user.contact || user._id || "";
  const [wallet, setWallet] = useState(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!customerKey) { setMessage("Sign in with your mobile number to view rewards."); setLoading(false); return; }
    setLoading(true); setMessage("");
    try { setWallet(await fetchRewardWallet(customerKey)); } catch (error) { setMessage(error.response?.data?.message || "Rewards could not be loaded."); } finally { setLoading(false); }
  }, [customerKey]);
  useEffect(() => { load(); }, [load]);
  const points = wallet?.availablePoints || 0;
  const next = levels.find((level) => level.points > (wallet?.lifetimeEarned || 0));
  const previous = [...levels].reverse().find((level) => level.points <= (wallet?.lifetimeEarned || 0));
  const progress = next ? Math.min(100, (((wallet?.lifetimeEarned || 0) - (previous?.points || 0)) / (next.points - (previous?.points || 0))) * 100) : 100;
  const redeem = async (code) => {
    setMessage("");
    try { await requestRewardRedemption(customerKey, code); setMessage("Redemption requested successfully. We will notify you after approval."); await load(); } catch (error) { setMessage(error.response?.data?.message || "Redemption could not be completed."); }
  };

  return <><StickySearchBar /><main className={cx("page")}>
    <section className={cx("hero")}>
      <div><span className={cx("eyebrow")}><Sparkles size={15} /> MASSCLICK REWARDS</span><h1>Search. Connect. Earn.</h1><p>Earn protected reward points when genuine enquiries reach verified milestones.</p></div>
      <div className={cx("points-card")}><span>Available points</span><strong>{loading ? "—" : points.toLocaleString("en-IN")}</strong><small><Award size={15} /> {wallet?.tier || "Starter"} member</small></div>
    </section>
    {message && <div className={cx("notice")} role="status">{message}</div>}
    <section className={cx("progress-card")}><div className={cx("progress-copy")}><div><span>Your progress</span><strong>{next ? `${Math.max(0, next.points - (wallet?.lifetimeEarned || 0))} points to ${next.name}` : "Highest level unlocked"}</strong></div><button onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button></div><div className={cx("progress-track")}><span style={{ width: `${progress}%` }} /></div></section>
    <section><div className={cx("section-title")}><div><span>Redeem rewards</span><h2>Choose what your points unlock</h2></div><Gift size={25} /></div><div className={cx("rewards-grid")}>{(wallet?.catalog || []).map((reward) => <article className={cx("reward-card")} key={reward.code}><div className={cx("reward-icon")}><Gift size={22} /></div><span>{reward.code.startsWith("CB") ? "Cashback" : "Coupon"}</span><h3>{reward.name}</h3><p>{reward.points.toLocaleString("en-IN")} points</p><button disabled={points < reward.points} onClick={() => redeem(reward.code)}>{points >= reward.points ? "Redeem now" : `${reward.points - points} more points`}</button></article>)}</div></section>
    <section className={cx("lower-grid")}><article className={cx("activity")}><div className={cx("section-title")}><div><span>Points history</span><h2>Recent activity</h2></div><Clock3 size={23} /></div>{!wallet?.transactions?.length ? <p className={cx("empty")}>Your verified reward activity will appear here.</p> : wallet.transactions.map((item) => <div className={cx("activity-row")} key={item._id}><span className={cx(item.points > 0 ? "positive" : "negative")}><Star size={17} /></span><div><strong>{item.description || item.milestone.replaceAll("_", " ")}</strong><small>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></div><b>{item.points > 0 ? "+" : ""}{item.points}</b></div>)}</article><article className={cx("trust-card")}><ShieldCheck size={32} /><h2>Fair, verified rewards</h2><p>Points are credited only after genuine enquiry milestones. Duplicate enquiries and repeated confirmations never earn twice.</p><ul><li><CheckCircle2 size={17} /> One reward per milestone</li><li><CheckCircle2 size={17} /> Category and monthly caps</li><li><CheckCircle2 size={17} /> Auditable points history</li></ul></article></section>
  </main><Footer /></>;
}
