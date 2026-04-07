import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../../footer/footer';
import './DashboardPage.css';



export function MetricCard({ title, value, icon: IconComponent, colorClass, contextText }) {
  return (
    <div className={`metric-card ${colorClass}`}>
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        {IconComponent && <IconComponent className="metric-icon" />}
      </div>
      <div className="metric-value-container">
        <p className="metric-value">{value.toLocaleString()}</p>
      </div>
      <p className="metric-context">{contextText}</p>
    </div>
  );
}


const VisibilityIcon = ({ className }) => <span className={className}>👁️</span>;
const WhatsappIcon = ({ className }) => <span className={className}>💬</span>;
const EnquiryIcon = ({ className }) => <span className={className}>❓</span>; 
const ShareIcon = ({ className }) => <span className={className}>🔗</span>;    

export default function DashboardPage() {
  return (
  <>
  <CardsSearch /><br/><br/><br/>
    <div className="dashboard-page-container">
      <h1 className="dashboard-main-title">Analytics Overview</h1>
      <hr className="title-separator" />

      <section className="key-metrics-grid">
        <MetricCard
          title="Total Business Views"
          value={0}
          icon={VisibilityIcon}
          colorClass="views-card"
          contextText="Data from the last 30 days"
        />
        <MetricCard
          title="Total WhatsApp Clicks"
          value={0}
          icon={WhatsappIcon}
          colorClass="whatsapp-card"
          contextText="This month's engagement total"
        />
        <MetricCard
          title="Total Enquiries"
          value={0} // New card
          icon={EnquiryIcon}
          colorClass="enquiry-card"
          contextText="New leads this quarter"
        />
        <MetricCard
          title="Profile Shares"
          value={0} // New card
          icon={ShareIcon}
          colorClass="share-card"
          contextText="Across social platforms"
        />
      </section>
    </div>
    <Footer />
   </>
  );
}