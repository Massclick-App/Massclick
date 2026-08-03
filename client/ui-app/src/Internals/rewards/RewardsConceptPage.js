import { useEffect, useState } from "react";
import {
  ArrowRight, Award, BadgeIndianRupee, BellRing, Calculator, CheckCircle2,
  CircleAlert, Clock3, Database, FileCheck2, Gift, Landmark, Layers3,
  MapPin, ReceiptText, Search, ShieldCheck, Sparkles, Store, Target,
  UserCheck, WalletCards, XCircle,
} from "lucide-react";
import { fetchRewardRules } from "../../services/rewardService";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./RewardsConceptPage.module.css";

const cx = createScopedClassNames(styles);
const format = (value) => Number(value || 0).toLocaleString("en-IN");

const lifecycle = [
  { icon: UserCheck, step: "01", title: "OTP account", text: "A genuinely new phone-number account receives one protected 500-point welcome bonus." },
  { icon: Search, step: "02", title: "Find a business", text: "The customer searches MassClick and completes a real purchase or service with a listed business." },
  { icon: ReceiptText, step: "03", title: "Submit confirmation", text: "Category, location, business, amount, date, payment method and confirmation are recorded." },
  { icon: ShieldCheck, step: "04", title: "Admin validates", text: "The claim is accepted, held for information, or rejected with an auditable reason." },
  { icon: WalletCards, step: "05", title: "Wallet credited", text: "Only an accepted claim creates the points transaction and updates the customer wallet." },
];

const claimStates = [
  { key: "pending", icon: Clock3, title: "Pending", text: "New claim awaiting administrator review." },
  { key: "hold", icon: CircleAlert, title: "Hold", text: "More evidence or clearer information is required." },
  { key: "accepted", icon: CheckCircle2, title: "Accepted", text: "Points credited once using a unique claim key." },
  { key: "rejected", icon: XCircle, title: "Rejected", text: "No points credited; the review reason remains stored." },
];

const levels = [
  { name: "Starter", from: 0, to: 99 },
  { name: "Bronze", from: 100, to: 299 },
  { name: "Silver", from: 300, to: 699 },
  { name: "Gold", from: 700, to: 1499 },
  { name: "Platinum", from: 1500, to: 4999 },
  { name: "Diamond", from: 5000, to: null },
];

const catalog = [
  { points: 200, reward: "₹100 MassClick coupon", value: "Coupon" },
  { points: 500, reward: "₹250 MassClick coupon", value: "Coupon" },
  { points: 1000, reward: "₹500 cashback", value: "Cashback" },
  { points: 2000, reward: "₹1,200 cashback", value: "Cashback" },
  { points: 5000, reward: "₹3,500 cashback", value: "Cashback" },
];

const controls = [
  "OTP-verified customer identity",
  "Welcome bonus idempotency per phone number",
  "Exact category, stored location and live-business selection",
  "Future transaction dates blocked",
  "Similar-claim duplicate detection",
  "One immutable credit transaction per accepted claim",
  "Category journey cap and customer monthly cap",
  "Hold and rejection reasons retained for audit",
  "Separate wallet balance and transaction ledger",
  "Administrator-only policy and claim decisions",
];

const dataModel = [
  { name: "reward_rules", text: "Category calculation, caps, validity and enabled status." },
  { name: "reward_claims", text: "Customer evidence, selected business, review status and decision." },
  { name: "reward_wallets", text: "Authoritative available, earned and redeemed balances." },
  { name: "reward_transactions", text: "Immutable credit/debit history with unique idempotency keys." },
  { name: "reward_redemptions", text: "Requested reward, points cost, value and fulfilment status." },
  { name: "msgusers.rewardPoints", text: "Synchronized profile summary for fast customer display." },
];

export default function RewardsConceptPage() {
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  useEffect(() => {
    fetchRewardRules()
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => setRules([]))
      .finally(() => setRulesLoading(false));
  }, []);

  return <main className={cx("page")}>
    <header className={cx("hero")}>
      <div className={cx("hero-copy")}><span><Sparkles size={16} /> MASSCLICK REWARDS · PRODUCT FRAMEWORK</span><h1>Search. Connect. Earn.</h1><p>A controlled loyalty programme for verified outcomes—not browsing activity and not a percentage of transaction value.</p><div className={cx("hero-pills")}><b><Gift size={16} /> 500-point welcome</b><b><ShieldCheck size={16} /> Admin verified</b><b><Database size={16} /> Auditable ledger</b></div></div>
      <aside className={cx("hero-summary")}><Award size={29} /><span>Core promise</span><strong>Reward genuine customer success while protecting platform economics.</strong><small>Every point must have an identity, reason, status and immutable history.</small></aside>
    </header>

    <section className={cx("truth-grid")}>
      <article><Target /><span>WHAT EARNS</span><h3>Verified outcomes</h3><p>A first OTP registration or an accepted customer transaction claim.</p></article>
      <article><XCircle /><span>WHAT NEVER EARNS</span><h3>Searching alone</h3><p>Views, clicks and unverified searches do not create transaction reward points.</p></article>
      <article><Calculator /><span>WHAT CALCULATES</span><h3>Category policy</h3><p>Configured components and caps determine points—not the bill amount.</p></article>
      <article><Landmark /><span>SOURCE OF TRUTH</span><h3>Wallet and ledger</h3><p>The wallet holds balances; the transaction ledger explains every movement.</p></article>
    </section>

    <section className={cx("section")}><SectionHeading number="01" title="Complete customer journey" text="The customer can always see where a reward comes from and why it is pending or credited." /><div className={cx("lifecycle")}>{lifecycle.map((item, index) => <article key={item.step}><div className={cx("step-icon")}><item.icon size={21} /></div><span>{item.step}</span><h3>{item.title}</h3><p>{item.text}</p>{index < lifecycle.length - 1 && <ArrowRight className={cx("arrow")} size={18} />}</article>)}</div></section>

    <section className={cx("welcome-section")}><div><span>02 · FIRST-LOGIN BENEFIT</span><h2>500 points—once per new OTP account</h2><p>The welcome award is created only after successful first-time phone verification. The unique key <code>welcome-bonus:phone-number</code> prevents OTP retries or repeated logins from creating another award.</p><ul><li><CheckCircle2 /> Immediately available in the wallet</li><li><CheckCircle2 /> Recorded as “Welcome bonus” in history</li><li><CheckCircle2 /> Existing users are not awarded retroactively</li></ul></div><aside><span>NEW CUSTOMER EXAMPLE</span><div><b>Starting balance</b><strong>0</strong></div><i>+</i><div><b>Welcome bonus</b><strong>500</strong></div><i>=</i><div><b>Available balance</b><strong>500 pts</strong></div></aside></section>

    <section className={cx("section")}><SectionHeading number="03" title="Transaction claim capture" text="The form guides the customer through exact MassClick data instead of accepting free-text business claims." /><div className={cx("filter-flow")}><article><Layers3 /><span>1</span><h3>Category</h3><p>Select from the existing MassClick category catalogue.</p></article><ArrowRight /><article><MapPin /><span>2</span><h3>Location</h3><p>Show only locations stored against live businesses in that category.</p></article><ArrowRight /><article><Store /><span>3</span><h3>Business</h3><p>Show only live businesses matching both category and location.</p></article><ArrowRight /><article><ReceiptText /><span>4</span><h3>Transaction</h3><p>Capture amount, local date/time, payment method, invoice and consent.</p></article></div><div className={cx("important-note")}><CircleAlert /><p><b>The paid amount supports verification only.</b> A ₹25 lakh construction transaction does not create 25,000 points. Points come from the configured category policy.</p></div></section>

    <section className={cx("calculation-section")}><div><span>04 · CALCULATION MODEL</span><h2>Transparent components, controlled total</h2><div className={cx("formula")}><b>Projected points</b><i>=</i><strong>Enquiry</strong><i>+</i><strong>Accepted</strong><i>+</i><strong>Completed</strong><i>+</i><strong>Customer confirmed</strong></div><div className={cx("cap-formula")}><ShieldCheck size={18} /><p><b>Final credit =</b> the lowest permitted value after applying the category journey cap and remaining monthly customer cap.</p></div></div><aside><h3>Important implementation detail</h3><p>These milestone values are calculation components for a public transaction claim. They are not four separate credits. The capped projected total enters the wallet once—only when an administrator accepts the claim.</p></aside></section>

    <section className={cx("section")}><SectionHeading number="05" title="Live category policies" text="This table reads the current Rewards configuration. Admin changes are reflected here without updating this page." /><div className={cx("policy-table-wrap")}><table className={cx("policy-table")}><thead><tr><th>Category</th><th>Enquiry</th><th>Accepted</th><th>Completed</th><th>Confirmed</th><th>Raw total</th><th>Journey cap</th><th>Monthly cap</th><th>Status</th></tr></thead><tbody>{rulesLoading ? <tr><td colSpan="9">Loading configured policies…</td></tr> : rules.length ? rules.map((rule) => { const raw = Number(rule.basePoints || 0) + Number(rule.acceptedBonus || 0) + Number(rule.completedBonus || 0) + Number(rule.customerConfirmedBonus || 0); return <tr key={rule._id}><td><b>{rule.categoryName}</b><small>{rule.categoryKey}</small></td><td>+{format(rule.basePoints)}</td><td>+{format(rule.acceptedBonus)}</td><td>+{format(rule.completedBonus)}</td><td>+{format(rule.customerConfirmedBonus)}</td><td>{format(raw)}</td><td><strong>{format(Math.min(raw, Number(rule.maxPointsPerEnquiry || 0)))} pts</strong></td><td>{format(rule.monthlyCustomerCap)} pts</td><td><span className={cx(rule.enabled ? "live" : "paused")}>{rule.enabled ? "Active" : "Paused"}</span></td></tr>; }) : <tr><td colSpan="9">No category policies are configured. Create one from Rewards control centre.</td></tr>}</tbody></table></div></section>

    <section className={cx("section")}><SectionHeading number="06" title="Review state model" text="Every claim remains in the transaction-claim table, including completed decisions." /><div className={cx("state-grid")}>{claimStates.map((state) => <article className={cx(`state-${state.key}`)} key={state.key}><state.icon /><span>{state.title}</span><p>{state.text}</p></article>)}</div><div className={cx("notification-strip")}><BellRing /><div><b>Real-time administration</b><p>New pending claims increase the dashboard notification count, appear newest-first in the notification modal, and open directly in Reward Claims.</p></div></div></section>

    <section className={cx("levels-section")}><div><SectionHeading number="07" title="Customer levels" text="Tier is based on lifetime earned points; redemption does not reduce lifetime status." /><div className={cx("levels")}>{levels.map((level, index) => <div key={level.name}><span>{String(index + 1).padStart(2, "0")}</span><b>{level.name}</b><small>{level.to === null ? `${format(level.from)}+ points` : `${format(level.from)}–${format(level.to)} points`}</small></div>)}</div><p className={cx("scope-note")}>Current implementation uses levels for recognition and progress. Any future tier-specific benefits must be separately configured and approved before they are advertised.</p></div><aside><Award /><h3>Example</h3><strong>500 lifetime points = Silver</strong><p>If the customer redeems 200 points, available points become 300 while lifetime earned remains 500 and the Silver level remains unchanged.</p></aside></section>

    <section className={cx("split")}><div><SectionHeading number="08" title="Redemption catalogue" text="Points are loyalty units—not rupees. Each reward defines its own controlled exchange value." /><div className={cx("catalog")}>{catalog.map((item) => <article key={item.points}><span><BadgeIndianRupee size={16} /> {format(item.points)} points</span><strong>{item.reward}</strong><small>{item.value}</small></article>)}</div></div><div><SectionHeading number="09" title="Fraud and budget controls" text="Controls apply before points enter the customer wallet." /><div className={cx("controls")}>{controls.map((control) => <p key={control}><CheckCircle2 size={17} /> {control}</p>)}</div></div></section>

    <section className={cx("section")}><SectionHeading number="10" title="Data ownership and audit model" text="Balances are fast to read, while immutable records explain exactly how they changed." /><div className={cx("data-grid")}>{dataModel.map((item) => <article key={item.name}><Database /><div><code>{item.name}</code><p>{item.text}</p></div></article>)}</div><div className={cx("source-note")}><ShieldCheck /><p><b>Authoritative financial data:</b> <code>reward_wallets</code> plus <code>reward_transactions</code>. The points summary inside the user profile is synchronized for display and must not replace the ledger.</p></div></section>

    <section className={cx("roles")}><div><span>11 · RESPONSIBILITY MODEL</span><h2>Clear value and accountability</h2></div><article><UserCheck /><h3>Customer</h3><p>Uses OTP identity, selects exact business data, submits truthful transaction information and tracks claim status.</p></article><article><Store /><h3>Business</h3><p>Benefits from more committed customers and supports transaction validation when evidence is required.</p></article><article><ShieldCheck /><h3>Administrator</h3><p>Configures category economics, reviews evidence, records decisions and monitors reward liability.</p></article><article><Landmark /><h3>MassClick</h3><p>Maintains the ledger, prevents duplicates, fulfils redemptions and communicates programme terms clearly.</p></article></section>

    <section className={cx("launch-checklist")}><div><FileCheck2 /><h2>Operational rule before launch</h2></div><p>Publish customer-facing terms covering eligibility, point validity, redemption fulfilment, cancellation, fraud, disputes, privacy and programme changes. Configure every enabled category’s journey cap and monthly cap before accepting public claims.</p></section>
  </main>;
}

function SectionHeading({ number, title, text }) {
  return <div className={cx("section-heading")}><span>{number} · PRODUCT DEFINITION</span><h2>{title}</h2><p>{text}</p></div>;
}
