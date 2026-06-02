import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../../footer/footer';
import styles from "./DashboardPage.module.css";
const cx = createScopedClassNames(styles);
export function MetricCard({
  title,
  value,
  icon: IconComponent,
  colorClass,
  contextText
}) {
  return <div className={cx(`metric-card ${colorClass}`)}>
      <div className={cx("metric-header")}>
        <h3 className={cx("metric-title")}>{title}</h3>
        {IconComponent && <IconComponent className={cx("metric-icon")} />}
      </div>
      <div className={cx("metric-value-container")}>
        <p className={cx("metric-value")}>{value.toLocaleString()}</p>
      </div>
      <p className={cx("metric-context")}>{contextText}</p>
    </div>;
}
const VisibilityIcon = ({
  className
}) => <span className={className}>👁️</span>;
const WhatsappIcon = ({
  className
}) => <span className={className}>💬</span>;
const EnquiryIcon = ({
  className
}) => <span className={className}>❓</span>;
const ShareIcon = ({
  className
}) => <span className={className}>🔗</span>;
export default function DashboardPage() {
  return <>
  <CardsSearch /><br /><br /><br />
    <div className={cx("dashboard-page-container")}>
      <h1 className={cx("dashboard-main-title")}>Analytics Overview</h1>
      <hr className={cx("title-separator")} />

      <section className={cx("key-metrics-grid")}>
        <MetricCard title="Total Business Views" value={0} icon={VisibilityIcon} colorClass="views-card" contextText="Data from the last 30 days" />
        <MetricCard title="Total WhatsApp Clicks" value={0} icon={WhatsappIcon} colorClass="whatsapp-card" contextText="This month's engagement total" />
        <MetricCard title="Total Enquiries" value={0} // New card
        icon={EnquiryIcon} colorClass="enquiry-card" contextText="New leads this quarter" />
        <MetricCard title="Profile Shares" value={0} // New card
        icon={ShareIcon} colorClass="share-card" contextText="Across social platforms" />
      </section>
    </div>
    <Footer />
   </>;
}
