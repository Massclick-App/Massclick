import { useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  CircleHelp,
  AlertCircle,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  MousePointerClick,
  PencilLine,
  Sparkles,
  RefreshCw,
  Users,
} from "lucide-react";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { findBusinessByMobile } from "../../../../redux/actions/businessListAction";
import styles from "./DashboardPage.module.css";

const cx = createScopedClassNames(styles);

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const quickActions = [
  { title: "Update business", text: "Keep contact details and hours accurate", icon: PencilLine, to: "/user_edit-profile", tone: "orange" },
  { title: "Marketing materials", text: "Create branded assets in minutes", icon: FileText, to: "/user_marketing-materials", tone: "violet" },
  { title: "View favorites", text: "Return to businesses you saved", icon: Heart, to: "/user_favorites", tone: "rose" },
  { title: "Get support", text: "We are here when you need help", icon: CircleHelp, to: "/user_customer-service", tone: "navy" },
];

export function MetricCard({ label, value, note, icon: Icon, tone }) {
  return (
    <article className={cx(`metric-card metric-${tone}`)}>
      <div className={cx("metric-topline")}>
        <span className={cx("metric-label")}>{label}</span>
        <span className={cx("metric-icon-wrap")}><Icon size={19} strokeWidth={2} /></span>
      </div>
      <strong className={cx("metric-value")}>{value.toLocaleString()}</strong>
      <span className={cx("metric-note")}>{note}</span>
    </article>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user = useMemo(readUser, []);
  const { matchedBusiness: business, matchedBusinessLoading: loading, matchedBusinessError: error } = useSelector((state) => state.businessListReducer || {});
  const mobile = localStorage.getItem("mobileNumber") || user.mobileNumber1 || user.contact || "";
  const loadDashboard = useCallback(() => {
    if (mobile) dispatch(findBusinessByMobile(mobile));
  }, [dispatch, mobile]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const displayName = user.userName || user.name || user.fullName || user.firstName || "there";
  const businessName = business?.businessName || business?.name || user.businessName || user.companyName || "Your business";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const analytics = business?.analytics || {};
  const metricItems = [
    { label: "Profile views", value: Number(analytics.views) || 0, note: "Total profile visits", icon: Eye, tone: "orange" },
    { label: "Customer actions", value: Number(analytics.clicks) || 0, note: "Contact actions", icon: MousePointerClick, tone: "green" },
    { label: "Enquiries", value: Number(analytics.leads) || 0, note: "Customer leads", icon: Users, tone: "blue" },
    { label: "Favorites", value: Number(analytics.favoritesCount) || 0, note: "Customer saves", icon: Heart, tone: "purple" },
  ];
  const requiredFields = ["businessName", "category", "location", "contact", "whatsappNumber", "email", "businessDetails", "bannerImage", "openingHours", "website"];
  const completedFields = requiredFields.filter((field) => {
    const value = business?.[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
  });
  const profileScore = business ? Math.round((completedFields.length / requiredFields.length) * 100) : 0;
  const engagementValues = metricItems.map((item) => item.value);
  const maxEngagement = Math.max(...engagementValues, 1);
  const hasEngagement = engagementValues.some(Boolean);
  const lastActivity = analytics.lastViewedAt ? new Date(analytics.lastViewedAt) : null;

  return (
    <>
      <StickySearchBar />
      <main className={cx("dashboard-shell")}>
        <div className={cx("dashboard-container")}>
          <section className={cx("hero")}>
            <div className={cx("hero-copy")}>
              <span className={cx("eyebrow")}><Sparkles size={14} /> BUSINESS OVERVIEW</span>
              <h1 className={cx("hero-title")}>{greeting}, {displayName}</h1>
              <p className={cx("hero-subtitle")}>Here’s how <strong>{businessName}</strong> is performing on MassClick.</p>
            </div>
            <Link className={cx("primary-action")} to="/user_edit-profile">
              <PencilLine size={17} /> Edit business profile
            </Link>
          </section>

          <section className={cx("metrics-grid")} aria-label="Business performance metrics">
            {metricItems.map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </section>

          <section className={cx("content-grid")}>
            <article className={cx("panel performance-panel")}>
              <div className={cx("panel-heading")}>
                <div>
                  <span className={cx("panel-kicker")}>PERFORMANCE</span>
                  <h2 className={cx("panel-title")}>Customer discovery</h2>
                </div>
                <button className={cx("refresh-button")} type="button" onClick={loadDashboard} disabled={loading}>
                  <RefreshCw size={14} className={cx(loading ? "refresh-spinning" : "")} /> {loading ? "Refreshing" : "Refresh"}
                </button>
              </div>
              {error ? <div className={cx("data-message data-error")}><AlertCircle size={22} /><div><strong>Dashboard data could not be loaded</strong><p>{error}</p></div></div>
                : !mobile ? <div className={cx("data-message")}><AlertCircle size={22} /><div><strong>Mobile number not found</strong><p>Update your account profile so we can connect your business analytics.</p></div></div>
                : loading && !business ? <div className={cx("chart-loading")}><span /><span /><span /><span /></div>
                : hasEngagement ? <div className={cx("engagement-chart")}>
                    {metricItems.map((item) => <div className={cx("engagement-row")} key={item.label}>
                      <span className={cx("engagement-label")}>{item.label}</span>
                      <div className={cx("engagement-track")}><span className={cx(`engagement-fill fill-${item.tone}`)} style={{ width: `${Math.max((item.value / maxEngagement) * 100, item.value ? 4 : 0)}%` }} /></div>
                      <strong className={cx("engagement-value")}>{item.value.toLocaleString()}</strong>
                    </div>)}
                  </div>
                : <div className={cx("data-message")}><BarChart3 size={22} /><div><strong>No customer activity yet</strong><p>Views and contact actions will appear here as customers discover your profile.</p></div></div>}
            </article>

            <aside className={cx("panel completion-panel")}>
              <div className={cx("completion-head")}>
              <div className={cx("score-ring")} style={{ background: `conic-gradient(#f57622 ${profileScore}%, #f0f1f4 0)` }}><span>{profileScore}%</span></div>
                <div>
                  <span className={cx("panel-kicker")}>PROFILE STRENGTH</span>
                  <h2 className={cx("panel-title")}>Let’s get you noticed</h2>
                </div>
              </div>
              <p className={cx("completion-copy")}>Complete these essentials to improve trust and visibility.</p>
              <div className={cx("task-list")}>
                <Link className={cx("task-row")} to="/user_edit-profile"><span className={cx("task-icon")}><Building2 size={17} /></span><span><strong>{business?.category && business?.location && business?.openingHours?.length ? "Business details added" : "Add business details"}</strong><small>Category, address and hours</small></span><ChevronRight size={17} /></Link>
                <Link className={cx("task-row")} to="/user_edit-profile"><span className={cx("task-icon")}><MessageCircle size={17} /></span><span><strong>{business?.contact && business?.whatsappNumber ? "Contact options added" : "Add contact options"}</strong><small>Phone, WhatsApp and website</small></span><ChevronRight size={17} /></Link>
              </div>
              <Link className={cx("text-action")} to="/user_edit-profile">Complete your profile <ArrowRight size={15} /></Link>
            </aside>
          </section>

          <section className={cx("lower-grid")}>
            <article className={cx("panel activity-panel")}>
              <div className={cx("panel-heading")}>
                <div><span className={cx("panel-kicker")}>INBOX</span><h2 className={cx("panel-title")}>Recent enquiries</h2></div>
                <span className={cx("status-dot")}>{analytics.leads ? `${analytics.leads} total` : "All caught up"}</span>
              </div>
              <div className={cx("activity-empty")}>
                <span className={cx("activity-icon")}><BarChart3 size={26} /></span>
                <strong>{analytics.leads ? `${analytics.leads} customer ${analytics.leads === 1 ? "lead" : "leads"}` : "No enquiries yet"}</strong>
                <p>{lastActivity ? `Your profile was last viewed ${lastActivity.toLocaleString()}.` : "When customers contact your business, activity totals will show up here."}</p>
              </div>
            </article>

            <article className={cx("quick-section")}>
              <div className={cx("quick-heading")}><span className={cx("panel-kicker")}>SHORTCUTS</span><h2 className={cx("panel-title")}>Quick actions</h2></div>
              <div className={cx("quick-grid")}>
                {quickActions.map(({ title, text, icon: Icon, to, tone }) => (
                  <Link className={cx(`quick-card quick-${tone}`)} to={to} key={title}>
                    <span className={cx("quick-icon")}><Icon size={19} /></span>
                    <span className={cx("quick-content")}><strong>{title}</strong><small>{text}</small></span>
                    <ChevronRight className={cx("quick-arrow")} size={17} />
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
