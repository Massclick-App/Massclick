import { ArrowRight, BadgeIndianRupee, CheckCircle2, CircleAlert, Gift, Landmark, Search, ShieldCheck, Sparkles, Store, Target, UserCheck } from "lucide-react";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./RewardsConceptPage.module.css";
const cx = createScopedClassNames(styles);

const journey = [
  { icon: Search, step: "01", title: "Customer searches", text: "The customer discovers a relevant business category and submits a genuine requirement." },
  { icon: Store, step: "02", title: "Business accepts", text: "The business confirms that the enquiry is relevant and agrees to serve the customer." },
  { icon: CheckCircle2, step: "03", title: "Service completes", text: "The service or transaction is completed. Searching alone never earns completion points." },
  { icon: UserCheck, step: "04", title: "Customer verifies", text: "The customer confirms the outcome and the protected points entry becomes eligible." },
];
const examples = [
  { category: "Restaurant", value: "₹300–₹2,000", created: 2, accepted: 1, completed: 2, cap: 5 },
  { category: "AC Service", value: "₹800–₹5,000", created: 5, accepted: 5, completed: 15, cap: 25 },
  { category: "Tuition Centre", value: "₹20,000–₹1 lakh", created: 10, accepted: 10, completed: 20, cap: 40 },
  { category: "Construction", value: "₹50,000–₹50 lakh", created: 20, accepted: 30, completed: 50, cap: 100 },
  { category: "Real Estate", value: "₹10 lakh+", created: 25, accepted: 35, completed: 90, cap: 150 },
];
const catalog = [{ points: 200, reward: "₹100 coupon" }, { points: 500, reward: "₹250 coupon" }, { points: 1000, reward: "₹500 cashback" }, { points: 2000, reward: "₹1,200 cashback" }, { points: 5000, reward: "₹3,500 cashback" }];

export default function RewardsConceptPage() {
  return <main className={cx("page")}>
    <header className={cx("hero")}><div><span><Sparkles size={16} /> MASSCLICK REWARDS FRAMEWORK</span><h1>Search. Connect. Earn.</h1><p>A financially controlled loyalty system that rewards verified customer outcomes, improves lead quality for businesses, and keeps MassClick’s liability predictable.</p></div><div className={cx("hero-badge")}><Gift size={27} /><strong>Outcome-based</strong><small>Not transaction-value based</small></div></header>

    <section className={cx("principle-grid")}><article><Target /><h3>Business objective</h3><p>Increase genuine enquiries, successful fulfilment, repeat usage and customer trust across thousands of categories.</p></article><article><Landmark /><h3>Sustainable economics</h3><p>Use configurable category points and hard caps instead of awarding points as a percentage of high-value transactions.</p></article><article><ShieldCheck /><h3>Verified by design</h3><p>Every points entry has a unique milestone key, an auditable ledger record and customer-level earning limits.</p></article></section>

    <section className={cx("section")}><div className={cx("section-heading")}><span>01 · VERIFIED JOURNEY</span><h2>When customers earn points</h2><p>Points progress only as a real enquiry becomes a successful outcome.</p></div><div className={cx("journey")}>{journey.map((item, index) => <article key={item.step}><div className={cx("journey-icon")}><item.icon size={22} /></div><span>{item.step}</span><h3>{item.title}</h3><p>{item.text}</p>{index < journey.length - 1 && <ArrowRight className={cx("arrow")} size={19} />}</article>)}</div></section>

    <section className={cx("formula-section")}><div><span>02 · CALCULATION MODEL</span><h2>Simple formula, category-controlled result</h2><div className={cx("formula")}><b>Points earned</b><i>=</i><strong>Milestone points</strong><i>+</i><strong>Campaign bonus</strong><i>−</i><strong>Cap adjustment</strong></div><p>The final award can never exceed the category’s enquiry cap or the customer’s monthly cap.</p></div><aside><CircleAlert size={23} /><h3>Why not amount-based?</h3><p>A ₹25 lakh construction contract must not create 25,000 reward points. Its configured category journey can earn a maximum of 100 points, protecting platform economics.</p></aside></section>

    <section className={cx("section")}><div className={cx("section-heading")}><span>03 · CATEGORY EXAMPLES</span><h2>Recommended starting framework</h2><p>These are launch examples. Administrators can tune every category without code changes.</p></div><div className={cx("table-wrap")}><table><thead><tr><th>Category</th><th>Typical business value</th><th>Enquiry</th><th>Accepted</th><th>Completed</th><th>Journey cap</th></tr></thead><tbody>{examples.map((row) => <tr key={row.category}><td><b>{row.category}</b></td><td>{row.value}</td><td>+{row.created}</td><td>+{row.accepted}</td><td>+{row.completed}</td><td><strong>{row.cap} pts</strong></td></tr>)}</tbody></table></div></section>

    <section className={cx("split")}><div><div className={cx("section-heading")}><span>04 · REDEMPTION ECONOMICS</span><h2>Controlled customer value</h2><p>Points are a loyalty currency—not equal to rupees. Redemption tiers control the true cost.</p></div><div className={cx("catalog")}>{catalog.map((item) => <div key={item.points}><span><BadgeIndianRupee size={17} /> {item.points.toLocaleString("en-IN")} points</span><strong>{item.reward}</strong></div>)}</div></div><div className={cx("controls")}><div className={cx("section-heading")}><span>05 · NON-NEGOTIABLE CONTROLS</span><h2>Fraud and budget protection</h2></div>{["OTP-verified customer identity", "One award per enquiry milestone", "Duplicate enquiry detection", "Business and customer confirmation", "Category enquiry caps", "Monthly customer earning caps", "Immutable points transaction history", "Manual dispute and approval workflow", "Point expiration and campaign dates"].map((control) => <p key={control}><CheckCircle2 size={17} /> {control}</p>)}</div></section>

    <section className={cx("outcome")}><div><span>THE MASSCLICK ADVANTAGE</span><h2>One rewards system, value for every participant</h2></div><div><strong>Customers</strong><p>Receive transparent benefits for genuine completed enquiries.</p></div><div><strong>Businesses</strong><p>Receive more committed, higher-quality customer opportunities.</p></div><div><strong>MassClick</strong><p>Builds repeat engagement while controlling reward liability.</p></div></section>
  </main>;
}
