import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "../../../components/snackbar/SnackbarProvider.js";
import { Activity, ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Eye, Filter, Grid2X2, Layers3, MapPin, MessageCircle, MessageSquare, Phone, Plus, Search, Star, Target, Users, X } from "lucide-react";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import { createMRP, getAllMRP, getBusinessProfileByPhone, getLeadReport, sendMrpLeads } from "../../../redux/actions/mrpAction";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./mrp.module.css";
import DynamicInfoModal from "./components/DynamicInfoModal";
import DynamicTooltip from "./components/DynamicTooltip";
import GroupCreationContent from "./components/GroupCreationContent";
import VerifiedNetworkContent from "./components/VerifiedNetworkContent";
import { ASSET_BASE_URL } from "../../../utils/imageUrlHelper";

const cx = createScopedClassNames(styles);

const S3_URL = ASSET_BASE_URL;
const valueOf = (value, fallback = 0) => Number(value) || fallback;
const dateOf = (item) => new Date(item?.sentDate || item?.date || item?.createdAt || 0);
const relativeTime = (value) => {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "Just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function Illustration() {
  return (
    <div className={cx("illustration")} aria-hidden="true">
      <div className={cx("chart-bars")}>
        <i />
        <i />
        <i />
      </div>
      <div className={cx("paper")}>
        <span />
        <span />
        <span />
        <span />
        <b>✓</b>
      </div>
      <div className={cx("clip")} />
      <div className={cx("target")}>
        <Target size={39} />
      </div>
    </div>
  );
}

function RequirementModal({ open, close, user, profile, groupCategories = [], groupName }) {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { loading } = useSelector((state) => state.mrp || {});
  const [form, setForm] = useState({
    organizationId: "",
    categoryId: "",
    location: "",
    contactDetails: "",
    description: "",
  });
  useEffect(() => {
    if (!open) return;
    setForm((v) => ({
      ...v,
      organizationId: profile?._id || user?._id || user?.businessId || "",
      location: profile?.location || user?.businessLocation || localStorage.getItem("selectedLocation") || "",
      contactDetails: profile?.contact || profile?.whatsappNumber || user?.mobileNumber1 || localStorage.getItem("mobileNumber") || "",
      categoryId: "",
    }));
  }, [open, profile, user]);
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    try {
      const created = await dispatch(createMRP(form));
      if (created?._id) await dispatch(sendMrpLeads(created._id));
      dispatch(getAllMRP({ pageSize: 100 }));
      enqueueSnackbar("Requirement published successfully", {
        variant: "success",
      });
      close();
    } catch (err) {
      enqueueSnackbar(err?.message || "Failed to publish requirement", {
        variant: "error",
      });
    }
  };
  const update = (e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
  return (
    <div className={cx("modal-backdrop")} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form className={cx("modal")} onSubmit={submit}>
        <header className={cx("requirement-modal-header")}><span className={cx("modal-icon")}><ClipboardList /></span><div><small>MNI Network Request</small><h2>Publish New Requirement</h2><p>Reach verified businesses with one clear request.</p></div><button type="button" className={cx("modal-close")} onClick={close} aria-label="Close publish requirement"><X size={19} /></button></header>
        <div className={cx("requirement-progress")}><div className={cx("active")}><b>1</b><span>Requirement</span></div><i/><div><b>2</b><span>Network match</span></div><i/><div><b>3</b><span>Publish</span></div></div>
        <div className={cx("requirement-form-body")}>
        {!form.organizationId && <div className={cx("mrp-error")}>Your account is not linked to a business profile.</div>}
        <div className={cx("requirement-form-grid")}>
        <label className={cx("modal-category requirement-field")}><span><Layers3/>Group service category <em>{groupCategories.length} in Group {groupName}</em></span><div className={cx("requirement-input requirement-select")}><Layers3/><select value={form.categoryId} onChange={event => setForm(v => ({ ...v, categoryId:event.target.value }))} required><option value="">Choose from {groupCategories.length} group categories</option>{groupCategories.map(category => <option key={category} value={category}>{category}</option>)}</select><ChevronDown/></div><small>Only categories represented by verified businesses in your MNI group are available.</small>
        </label>
        <label className={cx("requirement-field")}><span><MapPin/>Required location <em>Required</em></span><div className={cx("requirement-input")}><MapPin/><input name="location" value={form.location} onChange={update} placeholder="City / Region" required /></div></label>
        <label className={cx("requirement-field")}><span><Phone/>Contact details <em>Required</em></span><div className={cx("requirement-input")}><Phone/><input name="contactDetails" value={form.contactDetails} onChange={update} placeholder="Phone / WhatsApp / Email" required /></div></label>
        <label className={cx("requirement-field requirement-description")}><span><MessageSquare/>Requirement details <em>Required</em></span><div className={cx("requirement-input textarea-input")}><MessageSquare/><textarea name="description" value={form.description} onChange={update} maxLength="600" placeholder="Describe what you need, preferred quantity, budget range, or timeline…" required /></div><small>{form.description.length}/600 characters</small></label>
        </div>
        <aside className={cx("requirement-tip")}><Target/><div><b>Get better responses</b><p>Add a clear service, location, expected timeline, and relevant details. Your request is shared only with matching network businesses.</p></div></aside>
        </div>
        <footer className={cx("requirement-modal-footer")}><div><CheckCircle2/><span><b>Verified network distribution</b><small>We’ll match your request with relevant businesses.</small></span></div><button className={cx("publish-btn")} disabled={loading || !form.organizationId || !form.categoryId}>
          {loading ? "Publishing..." : "Publish Requirement"}
          <ArrowRight size={17} />
        </button></footer>
      </form>
    </div>
  );
}

function BusinessDetailsModal({ business, close }) {
  useEffect(() => {
    if (!business) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [business, close]);
  if (!business) return null;

  const leads = [...(business.sentLeads || [])].sort((a, b) => dateOf(b) - dateOf(a));
  const latestLead = leads[0];
  const receiverCount = new Set(leads.map((lead) => lead?.to || lead?.receiverBusinessName).filter(Boolean)).size;
  const categoryCount = new Set(leads.map((lead) => lead?.leadCategory || lead?.receiverCategory).filter(Boolean)).size;
  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Not available";
  const bannerSource = business?.bannerImageKey ? `${S3_URL}/${business.bannerImageKey}` : business?.bannerImage || business?.image || business?.businessImage;

  return (
    <div className={cx("business-modal-backdrop")} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={cx("business-modal")} role="dialog" aria-modal="true" aria-labelledby="business-modal-title">
        {bannerSource && <div className={cx("business-modal-cover")}><img src={bannerSource} alt={`${business?.senderBusinessName || "Business"} cover`} /><span><CheckCircle2 /> Physically verified business</span></div>}
        <header className={cx("business-modal-header")}>
          <div className={cx("business-modal-avatar")}>{business?.senderBusinessName?.[0]?.toUpperCase() || "B"}</div>
          <div>
            <span className={cx("business-modal-eyebrow")}>MNI Business Report</span>
            <h2 id="business-modal-title">{business?.senderBusinessName || "Business details"}</h2>
            <p>{business?.senderCategory || "Uncategorized business"}</p>
          </div>
          <button type="button" className={cx("business-modal-close")} onClick={close} aria-label="Close business details">
            <X />
          </button>
        </header>

        <div className={cx("business-summary-grid")}>
          <div>
            <span>
              <MapPin />
            </span>
            <small>Business Location</small>
            <b>{business?.senderLocation || "Not available"}</b>
          </div>
          <div>
            <span>
              <Layers3 />
            </span>
            <small>MNI Group</small>
            <b>{business?.group || "Not assigned"}</b>
          </div>
          <div>
            <span>
              <BriefcaseBusiness />
            </span>
            <small>Total Leads Sent</small>
            <b>{leads.length}</b>
          </div>
          <div>
            <span>
              <Users />
            </span>
            <small>Unique Businesses Reached</small>
            <b>{receiverCount}</b>
          </div>
        </div>

        <div className={cx("business-modal-body")}>
          <section className={cx("business-info-panel")}>
            <div className={cx("business-modal-section-title")}>
              <div>
                <h3>Business Information</h3>
                <p>Verified profile and MNI membership information.</p>
              </div>
            </div>
            <dl className={cx("business-info-list")}>
              <div>
                <dt>
                  <BriefcaseBusiness /> Business name
                </dt>
                <dd>{business?.senderBusinessName || "Not available"}</dd>
              </div>
              <div>
                <dt>
                  <Layers3 /> Business category
                </dt>
                <dd>{business?.senderCategory || "Not available"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin /> Registered location
                </dt>
                <dd>{business?.senderLocation || "Not available"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin /> Group service area
                </dt>
                <dd>{business?.categoryGroupLocation || business?.senderLocation || "Not available"}</dd>
              </div>
              <div>
                <dt>
                  <Phone /> Contact number
                </dt>
                <dd>{business?.senderContact ? <a href={`tel:${business.senderContact}`}>{business.senderContact}</a> : "Not available"}</dd>
              </div>
              <div>
                <dt>
                  <MessageCircle /> WhatsApp number
                </dt>
                <dd>
                  {business?.senderWhatsapp ? (
                    <a href={`https://wa.me/${String(business.senderWhatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      {business.senderWhatsapp}
                    </a>
                  ) : (
                    "Not available"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className={cx("business-performance-panel")}>
            <div className={cx("business-modal-section-title")}>
              <div>
                <h3>Lead Performance</h3>
                <p>Summary calculated from this business’s sent-lead history.</p>
              </div>
            </div>
            <div className={cx("business-performance-stats")}>
              <div>
                <small>Total sent</small>
                <strong>{leads.length}</strong>
                <span>Lead records</span>
              </div>
              <div>
                <small>Categories</small>
                <strong>{categoryCount}</strong>
                <span>Service types</span>
              </div>
              <div>
                <small>Recipients</small>
                <strong>{receiverCount}</strong>
                <span>Unique businesses</span>
              </div>
              <div>
                <small>Last activity</small>
                <strong className={cx("date-value")}>{latestLead ? relativeTime(latestLead.sentDate) : "None"}</strong>
                <span>{latestLead ? formatDate(latestLead.sentDate) : "No leads sent"}</span>
              </div>
            </div>
          </section>
        </div>

        <section className={cx("lead-history-panel")}>
          <div className={cx("business-modal-section-title")}>
            <div>
              <h3>Complete Lead History</h3>
              <p>Every lead sent by this business, including recipient and contact details.</p>
            </div>
            <span>
              {leads.length} {leads.length === 1 ? "lead" : "leads"}
            </span>
          </div>
          {leads.length ? (
            <div className={cx("lead-history-table-wrap")}>
              <table className={cx("lead-history-table")}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Receiving Business</th>
                    <th>Lead Category</th>
                    <th>Receiver Category</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>WhatsApp</th>
                    <th>Sent Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr key={lead?._id || lead?.to || `${lead?.receiverBusinessName}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <b>{lead?.receiverBusinessName || "Not available"}</b>
                      </td>
                      <td>
                        <span className={cx("lead-category-chip")}>{lead?.leadCategory || "Not specified"}</span>
                      </td>
                      <td>{lead?.receiverCategory || "Not available"}</td>
                      <td>{lead?.receiverLocation || "Not available"}</td>
                      <td>{lead?.receiverContact ? <a href={`tel:${lead.receiverContact}`}>{lead.receiverContact}</a> : "Not available"}</td>
                      <td>
                        {lead?.receiverWhatsapp ? (
                          <a href={`https://wa.me/${String(lead.receiverWhatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                            {lead.receiverWhatsapp}
                          </a>
                        ) : (
                          "Not available"
                        )}
                      </td>
                      <td>
                        <span className={cx("lead-date")}>
                          <CalendarDays />
                          {formatDate(lead?.sentDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={cx("lead-history-empty")}>
              <SendIcon />
              <h4>No leads sent yet</h4>
              <p>This business has not sent any leads through MNI. Lead details will appear here after its first successful lead distribution.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function SendIcon() {
  return <MessageSquare aria-hidden="true" />;
}

function MetricDetailsModal({ metric, close, requirements, leads, businesses, profile, openBusinesses }) {
  useEffect(() => {
    if (!metric) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [metric, close]);
  if (!metric) return null;
  const allRequirements = [...requirements].sort((a,b) => dateOf(b)-dateOf(a));
  const responseBusinesses = [...businesses].sort((a,b) => valueOf(b?.totalSentLeads, b?.sentLeads?.length) - valueOf(a?.totalSentLeads, a?.sentLeads?.length));
  const content = {
    "Total Requirements": { title: "All Published Requirements", text: "A complete requirement register showing what was requested, where it was needed, its current status, and when it was published.", items: allRequirements.map((item,index) => ({ name: typeof item?.categoryId === "string" ? item.categoryId : item?.category || item?.title || `Requirement ${index + 1}`, meta: [item?.description || "No description provided", item?.location || "Location not specified"].join(" · "), value: `${item?.isActive === false ? "Closed" : "Active"} · ${relativeTime(dateOf(item))}` })), stats: [["Published",requirements.length],["Active",requirements.filter(x => x?.isActive !== false).length],["Closed",requirements.filter(x => x?.isActive === false).length]] },
    "Total Responses": { title: "All Business Responses", text: "A complete business-by-business report showing every responding network member and how many leads each business sent.", items: responseBusinesses.map(item => ({ name: item?.senderBusinessName || "Unnamed business", meta: `${item?.senderCategory || "Uncategorized"} · ${item?.senderLocation || "Location unavailable"}`, value: `${valueOf(item?.totalSentLeads, item?.sentLeads?.length)} leads sent` })), stats: [["Total leads",leads.length],["This month",leads.filter(x => Date.now()-dateOf(x)<2592000000).length],["Businesses",businesses.length]] },
    "Active Businesses": { title: "Active Network Businesses", text: "Verified businesses currently connected to your MNI group.", items: businesses.slice(0,5).map(item => ({ name: item?.senderBusinessName || "Unnamed business", meta: `${item?.senderCategory || "Uncategorized"} · ${item?.senderLocation || "Location unavailable"}`, value: `${valueOf(item?.totalSentLeads)} leads` })), stats: [["Businesses",businesses.length],["Group",profile?.mniDetails?.categoryGroup || "—"],["Locations",new Set(businesses.map(x => x?.senderLocation).filter(Boolean)).size]] },
    "Success Rate": { title: "Network Success Rate", text: "Performance calculated by comparing completed network responses with published requirements.", items: [], stats: [["Requirements",requirements.length],["Responses",leads.length],["Pending",Math.max(requirements.length-leads.length,0)]] },
    "Network Score": { title: "Network Health Score", text: "Your score combines response success, active business participation, and profile rating.", items: [], stats: [["Profile rating",valueOf(profile?.averageRating).toFixed(1)],["Active partners",businesses.length],["Profile views",valueOf(profile?.analytics?.views)]] }
  }[metric.label] || { title: metric.label, text: metric.detail, items: [], stats: [] };
  const Icon = metric.icon;
  const itemsTitle = metric.label === "Total Responses" ? "Responses by business" : metric.label === "Total Requirements" ? "Complete requirement register" : "Recent activity";
  const itemsCaption = metric.label === "Total Responses" ? `${businesses.length} responding businesses` : metric.label === "Total Requirements" ? `${requirements.length} requirements` : undefined;
  return <DynamicInfoModal open={Boolean(metric)} onClose={close} icon={Icon} tone={metric.color} title={content.title} description={content.text} value={metric.value} valueLabel={metric.label} status={metric.detail} stats={content.stats.map(([label,value]) => ({ label,value }))} items={content.items.map(item => ({ title:item.name, subtitle:item.meta, value:item.value }))} itemsTitle={itemsTitle} itemsCaption={itemsCaption} action={metric.label === "Active Businesses" ? { label:"View all businesses", onClick:() => { close(); openBusinesses(); } } : undefined}>{!content.items.length && <div className={cx("metric-explanation")}><BarChart3 /><h3>{metric.value} current result</h3><p>{content.text} This insight updates automatically whenever your network data changes.</p></div>}</DynamicInfoModal>;
}

function NetworkGuideModal({ type, close, groupName, businessCount }) {
  useEffect(() => {
    if (!type) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [type, close]);
  if (!type) return null;
  const isGroup = type === "group";
  return <DynamicInfoModal open={Boolean(type)} onClose={close} icon={isGroup ? Users : CheckCircle2} tone={isGroup ? "purple" : "green"} eyebrow={isGroup ? "MNI Business Community" : "MassClick Trust Standard"} title={isGroup ? "How Group Creation Works" : "What Verified Network Means"} description={isGroup ? "Paid businesses are automatically organized into focused local groups using category-exclusive assignment." : "A business earns verified status only after MassClick's marketing team physically visits, checks, and validates it."} stats={isGroup ? [{label:"Business categories",value:"1,000+"},{label:"Paid businesses",value:businessCount},{label:"Group creation",value:"Dynamic"}] : [{label:"Verification",value:"4-Step"},{label:"Business check",value:"Direct Visit"},{label:"Evidence",value:"Documents"}]}>{isGroup ? <GroupCreationContent groupName={groupName} paidBusinesses={businessCount} /> : <VerifiedNetworkContent />}</DynamicInfoModal>;
}

function AllBusinessesModal({ open, close, businesses, loading, viewBusiness }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);
  const categories = useMemo(() => [...new Set(businesses.map((x) => x?.senderCategory).filter(Boolean))].sort(), [businesses]);
  const locations = useMemo(() => [...new Set(businesses.map((x) => x?.senderLocation).filter(Boolean))].sort(), [businesses]);
  const filtered = useMemo(
    () =>
      businesses.filter((item) => {
        const text = `${item?.senderBusinessName || ""} ${item?.senderCategory || ""} ${item?.senderLocation || ""}`.toLowerCase();
        return text.includes(query.trim().toLowerCase()) && (!category || item?.senderCategory === category) && (!location || item?.senderLocation === location);
      }),
    [businesses, query, category, location],
  );
  const reset = () => {
    setQuery("");
    setCategory("");
    setLocation("");
  };
  if (!open) return null;
  return (
    <div className={cx("directory-backdrop")} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={cx("directory-modal")} role="dialog" aria-modal="true" aria-labelledby="directory-title">
        <header className={cx("directory-header")}>
          <div className={cx("directory-heading-icon")}>
            <BriefcaseBusiness />
          </div>
          <div>
            <span>MassClick Network India</span>
            <h2 id="directory-title">Business Directory</h2>
            <p>Discover and connect with verified businesses in your network.</p>
          </div>
          <button className={cx("directory-close")} type="button" onClick={close} aria-label="Close business directory">
            <X />
          </button>
        </header>
        <div className={cx("directory-toolbar")}>
          <label className={cx("directory-search")}>
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, category or location…" autoFocus />
            <kbd>{filtered.length}</kbd>
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location">
            <option value="">All locations</option>
            {locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button type="button" className={cx("directory-reset")} onClick={reset} disabled={!query && !category && !location}>
            <Filter /> Reset
          </button>
        </div>
        <div className={cx("directory-meta")}>
          <div>
            <b>{filtered.length}</b>
            <span>business{filtered.length === 1 ? "" : "es"} found</span>
          </div>
          <p>
            <span /> Verified network members
          </p>
        </div>
        <div className={cx("directory-content")}>
          {filtered.length ? (
            <>
              <div className={cx("directory-table-wrap")}>
                <table className={cx("directory-table")}>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Performance</th>
                      <th>Last active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, index) => {
                      const leads = item?.sentLeads || [];
                      const latest = [...leads].sort((a, b) => dateOf(b) - dateOf(a))[0];
                      const rate = item?.totalSentLeads ? Math.min(100, Math.round((leads.length / item.totalSentLeads) * 100)) : 0;
                      return (
                        <tr key={item?.senderBusinessId || `${item?.senderBusinessName}-${index}`}>
                          <td>
                            <div className={cx("directory-business")}>
                              <span className={cx(`directory-avatar a${index % 4}`)}>{item?.senderBusinessName?.[0]?.toUpperCase() || "?"}</span>
                              <div>
                                <b>{item?.senderBusinessName || "Unnamed business"}</b>
                                <small>
                                  <span /> Verified member
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={cx("directory-chip")}>{item?.senderCategory || "Uncategorized"}</span>
                          </td>
                          <td>
                            <span className={cx("directory-location")}>
                              <MapPin />
                              {item?.senderLocation || "Not available"}
                            </span>
                          </td>
                          <td>
                            <div className={cx("directory-performance")}>
                              <b>{rate}%</b>
                              <span>
                                <i style={{ width: `${rate}%` }} />
                              </span>
                              <small>{valueOf(item?.totalSentLeads)} leads</small>
                            </div>
                          </td>
                          <td>{latest ? relativeTime(latest?.sentDate || latest?.date) : <span className={cx("directory-muted")}>No activity</span>}</td>
                          <td>
                            <div className={cx("directory-actions")}>
                              {item?.senderContact && (
                                <a href={`tel:${item.senderContact}`} aria-label={`Call ${item.senderBusinessName}`}>
                                  <Phone />
                                </a>
                              )}
                              <button type="button" onClick={() => viewBusiness(item)}>
                                <Eye />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={cx("directory-cards")}>
                {filtered.map((item, index) => {
                  const leads = item?.sentLeads || [];
                  const latest = [...leads].sort((a, b) => dateOf(b) - dateOf(a))[0];
                  return (
                    <article className={cx("directory-card")} key={item?.senderBusinessId || `${item?.senderBusinessName}-card-${index}`}>
                      <div className={cx("directory-card-top")}>
                        <span className={cx(`directory-avatar a${index % 4}`)}>{item?.senderBusinessName?.[0]?.toUpperCase() || "?"}</span>
                        <div>
                          <h3>{item?.senderBusinessName || "Unnamed business"}</h3>
                          <p>
                            <span /> Verified network member
                          </p>
                        </div>
                      </div>
                      <div className={cx("directory-card-tags")}>
                        <span>{item?.senderCategory || "Uncategorized"}</span>
                        <span>
                          <MapPin />
                          {item?.senderLocation || "Not available"}
                        </span>
                      </div>
                      <div className={cx("directory-card-stats")}>
                        <div>
                          <small>Leads</small>
                          <b>{valueOf(item?.totalSentLeads)}</b>
                        </div>
                        <div>
                          <small>Rating</small>
                          <b>
                            <Star /> {valueOf(item?.averageRating).toFixed(1)}
                          </b>
                        </div>
                        <div>
                          <small>Last active</small>
                          <b>{latest ? relativeTime(latest?.sentDate || latest?.date) : "No activity"}</b>
                        </div>
                      </div>
                      <div className={cx("directory-card-actions")}>
                        {item?.senderContact && (
                          <a href={`tel:${item.senderContact}`}>
                            <Phone /> Call
                          </a>
                        )}
                        <button type="button" onClick={() => viewBusiness(item)}>
                          <Eye /> View profile
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={cx("directory-empty")}>
              <span>
                <Search />
              </span>
              <h3>{loading ? "Loading businesses…" : "No businesses found"}</h3>
              <p>{loading ? "Your network directory will be ready shortly." : "Try another search or clear the filters to see all network members."}</p>
              {!loading && (
                <button type="button" onClick={reset}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
        <footer className={cx("directory-footer")}>
          <p>
            Showing <b>{filtered.length}</b> of <b>{businesses.length}</b> verified businesses
          </p>
          <button type="button" onClick={close}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function MRPPage() {
  const dispatch = useDispatch();
  const { businessProfile, mrpList = [], total = 0, leadReport, loading, businessProfileLoading, leadReportLoading } = useSelector((state) => state.mrp || {});
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showAllBusinesses, setShowAllBusinesses] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [networkGuide, setNetworkGuide] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser")) || {};
    } catch {
      return {};
    }
  }, []);
  useEffect(() => {
    dispatch(getAllMRP({ pageSize: 100 }));
    const phone = localStorage.getItem("mobileNumber") || user?.mobileNumber1 || user?.mobileNumber;
    if (phone) dispatch(getBusinessProfileByPhone(phone)).catch(() => {});
  }, [dispatch, user]);
  useEffect(() => {
    const group = businessProfile?.mniDetails?.categoryGroup;
    if (group) dispatch(getLeadReport({ group, location: businessProfile?.location })).catch(() => {});
  }, [dispatch, businessProfile]);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const reportBusinesses = useMemo(() => (Array.isArray(leadReport?.data) ? leadReport.data : []), [leadReport]);
  const sentLeads = useMemo(() => {
    const profileLeads = Array.isArray(businessProfile?.sentLeads) ? businessProfile.sentLeads : [];
    const reportLeads = reportBusinesses.flatMap((sender) =>
      (sender.sentLeads || []).map((lead) => ({
        ...lead,
        senderBusinessName: sender.senderBusinessName,
      })),
    );
    return [...profileLeads, ...reportLeads].sort((a, b) => dateOf(b) - dateOf(a));
  }, [businessProfile, reportBusinesses]);
  const responseCount = sentLeads.length;
  const activeBusinesses = reportBusinesses.length;
  const successRate = total ? Math.min(100, Math.round((responseCount / total) * 100)) : 0;
  const networkScore = Math.round((successRate + Math.min(activeBusinesses * 10, 100) + Math.min(valueOf(businessProfile?.averageRating) * 20, 100)) / 3);
  const metrics = [
    {
      icon: ClipboardList,
      label: "Total Requirements",
      value: total,
      detail: `${mrpList.filter((x) => x?.isActive !== false).length} active`,
      color: "blue",
    },
    {
      icon: BriefcaseBusiness,
      label: "Total Responses",
      value: responseCount,
      detail: `${sentLeads.filter((x) => Date.now() - dateOf(x) < 2592000000).length} this month`,
      color: "green",
    },
    {
      icon: Users,
      label: "Active Businesses",
      value: activeBusinesses,
      detail: businessProfile?.mniDetails?.categoryGroup ? `Group ${businessProfile.mniDetails.categoryGroup}` : "No MNI group",
      color: "orange",
    },
    {
      icon: BarChart3,
      label: "Success Rate",
      value: `${successRate}%`,
      detail: `${Math.max(total - responseCount, 0)} pending`,
      color: "purple",
    },
    {
      icon: Star,
      label: "Network Score",
      value: networkScore,
      detail: networkScore >= 80 ? "Excellent" : networkScore >= 60 ? "Good" : "Growing",
      color: "gold",
    },
  ];
  const categoryCounts = useMemo(() => {
    const counts = {};
    [...mrpList, ...sentLeads].forEach((item) => {
      const name = item?.categoryId || item?.leadCategory || item?.category || "Other";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [mrpList, sentLeads]);
  const categoryRecords = useMemo(() => selectedCategory ? [...mrpList, ...sentLeads].filter(item => String(item?.categoryId || item?.leadCategory || item?.category || "Other").toLowerCase() === selectedCategory.toLowerCase()) : [], [selectedCategory, mrpList, sentLeads]);
  const categories = useMemo(() => [...new Set(reportBusinesses.map((x) => x?.senderCategory).filter(Boolean))], [reportBusinesses]);
  const locations = useMemo(() => [...new Set(reportBusinesses.map((x) => x?.senderLocation).filter(Boolean))], [reportBusinesses]);
  const businesses = useMemo(
    () =>
      reportBusinesses.filter((item) => {
        const haystack = `${item?.senderBusinessName || ""} ${item?.senderCategory || ""} ${item?.senderLocation || ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase()) && (!categoryFilter || item?.senderCategory === categoryFilter) && (!locationFilter || item?.senderLocation === locationFilter);
      }),
    [reportBusinesses, search, categoryFilter, locationFilter],
  );
  const activities = sentLeads.slice(0, 5);
  const weeklyCounts = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const counts = Array(7).fill(0);
    mrpList.forEach((item) => {
      const date = dateOf(item);
      const index = Math.floor((date - start) / 86400000);
      if (index >= 0 && index < 7) counts[index] += 1;
    });
    return counts;
  }, [mrpList]);
  const maxTrend = Math.max(...weeklyCounts, 1);
  const trendPoints = weeklyCounts.map((count, index) => `${8 + index * 49.3},${112 - (count / maxTrend) * 85}`).join(" ");
  const firstName = (user.fullName || user.name || user.firstName || "Member").split(" ")[0];
  const greeting = currentTime.getHours() < 12 ? "Good Morning" : currentTime.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const businessName = businessProfile?.businessName || user.businessName || "Business profile";
  const groupName = businessProfile?.mniDetails?.categoryGroup || businessProfile?.categoryGroup || "Community Network";
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const cardClick = (event, action) => { if (!event.target.closest("button,a,input,select,textarea")) action(); };
  const openActivityBusiness = (lead) => {
    const displayedName = lead?.receiverBusinessName || lead?.businessName || lead?.senderBusinessName || "Network business";
    const normalizedName = String(displayedName).trim().toLowerCase();
    const networkBusiness = reportBusinesses.find(item => [item?.senderBusinessName, item?.receiverBusinessName, item?.businessName].some(name => String(name || "").trim().toLowerCase() === normalizedName));
    if (networkBusiness) return setSelectedBusiness(networkBusiness);
    if (String(businessName).trim().toLowerCase() === normalizedName) return setSelectedBusiness({ ...businessProfile, senderBusinessName: businessName, senderCategory: businessProfile?.category, senderLocation: businessProfile?.location, senderContact: businessProfile?.contact || businessProfile?.mobileNumber1, senderWhatsapp: businessProfile?.whatsappNumber, sentLeads: businessProfile?.sentLeads || [] });
    return setSelectedBusiness({ senderBusinessName: displayedName, senderCategory: lead?.receiverCategory || lead?.leadCategory || lead?.category, senderLocation: lead?.receiverLocation || lead?.location, senderContact: lead?.receiverContact || lead?.contact, senderWhatsapp: lead?.receiverWhatsapp || lead?.whatsapp, sentLeads: [lead] });
  };
  const openOwnBusinessProfile = () => setSelectedBusiness({ ...businessProfile, senderBusinessName: businessName, senderCategory: businessProfile?.category, senderLocation: businessProfile?.location, senderContact: businessProfile?.contact || businessProfile?.mobileNumber1 || user?.mobileNumber1, senderWhatsapp: businessProfile?.whatsappNumber, group: groupName, categoryGroupLocation: businessProfile?.mniDetails?.categoryGroupLocation || businessProfile?.location, sentLeads: businessProfile?.sentLeads || sentLeads, totalSentLeads: businessProfile?.totalSentLeads || businessProfile?.sentLeads?.length || 0 });

  return (
    <>
      <StickySearchBar />
      <main className={cx("dashboard")}>
        <div className={cx("dashboard-grid")}>
          <section className={cx("hero card")}>
            <div className={cx("hero-copy")}>
              <div className={cx("hero-badges")}><DynamicTooltip text="Learn how your MNI business group works" position="bottom"><button type="button" onClick={() => setNetworkGuide("group")}><Users /> Group {groupName}</button></DynamicTooltip><DynamicTooltip text="See how MassClick business verification works" position="bottom"><button type="button" onClick={() => setNetworkGuide("verified")}><CheckCircle2 /> Verified Network</button></DynamicTooltip></div>
              <h2>
                {greeting}, {firstName} 👋
              </h2>
              <h1>Welcome to MassClick Network India</h1>
              <p>Build connections. Grow your business. Get quality leads.</p>
              <div className={cx("hero-group-line")}><b>{activeBusinesses}</b><span>business partners in your group</span><i /><b>{responseCount}</b><span>network connections</span></div>
            </div>
            <Illustration />
            <div className={cx("metrics")}>
              {metrics.map(({ icon: Icon, ...m }) => (
                <DynamicTooltip key={m.label} text={`Open ${m.label} details`} className={cx("metric-tooltip")}><button type="button" className={cx("metric")} onClick={() => setSelectedMetric({ ...m, icon: Icon })} aria-label={`View ${m.label} details`}>
                  <span className={cx(`metric-icon ${m.color}`)}>
                    <Icon size={17} />
                  </span>
                  <small>{m.label}</small>
                  <strong>{loading ? "—" : m.value}</strong>
                  <em>{m.detail}</em>
                  <ArrowRight className={cx("metric-arrow")} />
                </button></DynamicTooltip>
              ))}
            </div>
          </section>

          <section className={cx("profile card interactive-card")} onClick={event => cardClick(event, openOwnBusinessProfile)} role="button" tabIndex="0" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openOwnBusinessProfile(); } }} aria-label={`View complete details for ${businessName}`}>
            <h3>Business Profile {businessProfile && <CheckCircle2 size={16} />}</h3>
            {businessProfile?.bannerImageKey ? (
              <img className={cx("cover-image")} src={`${S3_URL}/${businessProfile.bannerImageKey}`} alt={businessName} />
            ) : (
              <div className={cx("cover")}>
                <div className={cx("field-lines")} />
                <div className={cx("field-net")} />
              </div>
            )}
            <div className={cx("profile-title")}>
              <div>
                <h2>{businessProfileLoading ? "Loading profile..." : businessName}</h2>
                <p>{businessProfile?.category || "Complete your business profile"}</p>
                <button type="button" className={cx("profile-group")} onClick={() => setNetworkGuide("group")}><Users /> Group {groupName}</button>
              </div>
              <span>
                <Star size={14} fill="currentColor" /> {valueOf(businessProfile?.averageRating).toFixed(1)} <i>({valueOf(businessProfile?.totalReviews || businessProfile?.reviewCount)})</i>
              </span>
            </div>
            <div className={cx("profile-stats")}>
              <div>
                <small>Since</small>
                <b>{businessProfile?.createdAt ? new Date(businessProfile.createdAt).getFullYear() : "—"}</b>
              </div>
              <div>
                <small>Response Rate</small>
                <b>{successRate}%</b>
              </div>
              <div>
                <small>Profile Views</small>
                <b>{valueOf(businessProfile?.analytics?.views).toLocaleString()}</b>
              </div>
              <div>
                <small>Leads Received</small>
                <b>{valueOf(businessProfile?.mniDetails?.leadsCount, responseCount)}</b>
              </div>
            </div>
          </section>

          <aside className={cx("quick-actions")}>
            <button className={cx("qa orange")} onClick={() => setModal(true)}>
              <span>
                <Plus />
              </span>
              Publish
              <br />
              Requirement
            </button>
            <button className={cx("qa blue")} onClick={() => scrollTo("mni-activity")}>
              <span>
                <Users />
              </span>
              View
              <br />
              My Leads
            </button>
            <button className={cx("qa violet")} onClick={() => scrollTo("mni-network")}>
              <span>
                <Grid2X2 />
              </span>
              Network
              <br />
              Businesses
            </button>
            <button className={cx("qa teal")} onClick={() => scrollTo("mni-analytics")}>
              <span>
                <Activity />
              </span>
              Analytics
              <br />
              Reports
            </button>
          </aside>

          <section className={cx("publish card interactive-card")} onClick={event => cardClick(event, () => setModal(true))}>
            <div>
              <h2>Publish New Requirement</h2>
              <p>Tell us what you need, get connected with the right businesses.</p>
            </div>
            <div className={cx("steps")}>
              <span className={cx("active-step")}>
                <b>1</b>Business Details
              </span>
              <span>
                <b>2</b>Requirement Info
              </span>
              <span>
                <b>3</b>Category &amp; Location
              </span>
              <span>
                <b>4</b>Review &amp; Publish
              </span>
            </div>
            <Illustration />
            <button className={cx("start-btn")} onClick={() => setModal(true)}>
              Start New Requirement <ArrowRight size={16} />
            </button>
          </section>

          <section id="mni-analytics" className={cx("intelligence card interactive-card")} onClick={event => cardClick(event, () => setSelectedMetric({ ...metrics[1] }))}>
            <div className={cx("section-head")}>
              <div>
                <h2>Lead Intelligence</h2>
                <p>Real-time insights from published requirements.</p>
              </div>
              <span className={cx("live")}>{leadReportLoading ? "Updating…" : "●  Live Data"}</span>
            </div>
            <div className={cx("lead-content")}>
              <div className={cx("lead-left")}>
                <div className={cx("lead-kpis")}>
                  <div>
                    <small>Total Leads</small>
                    <b>{responseCount}</b>
                    <em>{total} requirements</em>
                  </div>
                  <div>
                    <small>Responses</small>
                    <b>{responseCount}</b>
                    <em>{activeBusinesses} businesses</em>
                  </div>
                  <div>
                    <small>Pending</small>
                    <b>{Math.max(total - responseCount, 0)}</b>
                    <em className={cx("down")}>{successRate}% success</em>
                  </div>
                </div>
                <div className={cx("categories")}>
                  <b>Top Response Categories</b>
                  <div>
                    {categoryCounts.length ? (
                      categoryCounts.map(([name, count]) => <DynamicTooltip key={name} text={`Show all ${count} ${name} results`}><button type="button" className={cx("category-insight-button")} onClick={() => setSelectedCategory(name)}><i />{name} <b>({count})</b></button></DynamicTooltip>)
                    ) : (
                      <span>No category activity yet</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={cx("donut")} style={{ "--donut-progress": `${successRate * 3.6}deg` }}>
                <div>
                  <small>Total</small>
                  <b>{responseCount}</b>
                </div>
              </div>
            </div>
          </section>

          <section id="mni-activity" className={cx("activity card interactive-card")} onClick={event => cardClick(event, () => setSelectedMetric({ ...metrics[1] }))}>
            <div className={cx("section-head")}>
              <h2>Recent Activity</h2>
              <span className={cx("activity-count")}>{sentLeads.length} total</span>
            </div>
            <div className={cx("activity-list")}>
              {activities.length ? (
                activities.map((lead, index) => (
                  <div className={cx("activity-business-row")} key={lead?._id || `${dateOf(lead)}-${index}`} onClick={event => { event.stopPropagation(); openActivityBusiness(lead); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openActivityBusiness(lead); } }} role="button" tabIndex="0" aria-label={`View ${lead?.receiverBusinessName || lead?.businessName || lead?.senderBusinessName || "business"} details`}>
                    <span className={cx("activity-icon green")}>
                      <BriefcaseBusiness size={14} />
                    </span>
                    <p>
                      <b>{lead?.receiverBusinessName || lead?.businessName || lead?.senderBusinessName || "Network business"}</b> received a {lead?.leadCategory || lead?.category || "business"} lead
                    </p>
                    <time>{relativeTime(lead?.sentDate || lead?.date || lead?.createdAt)}</time>
                  </div>
                ))
              ) : (
                <p className={cx("empty-copy")}>No lead activity yet. New responses will appear here.</p>
              )}
            </div>
          </section>

          <section id="mni-network" className={cx("network card")}>
            <div className={cx("network-head")}>
              <div>
                <div className={cx("network-title-row")}><h2>Businesses in Your Network</h2><button type="button" onClick={() => setNetworkGuide("group")}><Users /> Group {groupName}</button></div>
                <p>{businesses.length} verified businesses match your filters. Connect, collaborate, and grow together.</p>
              </div>
              <div className={cx("filters")}>
                <label>
                  <Search size={15} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses..." />
                </label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                  <option value="">All Locations</option>
                  {locations.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("");
                    setLocationFilter("");
                  }}
                >
                  <Filter /> Reset
                </button>
              </div>
            </div>
            <div className={cx("table-wrap")}>
              <table>
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Response Rate</th>
                    <th>Rating</th>
                    <th>Leads</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.length ? (
                    businesses.map((item, index) => {
                      const latest = [...(item?.sentLeads || [])].sort((a, b) => dateOf(b) - dateOf(a))[0];
                      const rate = item?.totalSentLeads ? Math.min(100, Math.round(((item.sentLeads?.length || 0) / item.totalSentLeads) * 100)) : 0;
                      return (
                        <tr className={cx("clickable-business-row")} key={item?.senderBusinessId || `${item?.senderBusinessName}-${index}`} onClick={() => setSelectedBusiness(item)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedBusiness(item); } }} tabIndex="0" role="button" aria-label={`View ${item?.senderBusinessName || "business"} details`}>
                          <td>
                            <span className={cx(`avatar a${index % 4}`)}>{item?.senderBusinessName?.[0]?.toUpperCase() || "?"}</span>
                            <b>{item?.senderBusinessName || "Unnamed business"}</b>
                          </td>
                          <td>
                            <span className={cx("tag")}>{item?.senderCategory || "—"}</span>
                          </td>
                          <td>{item?.senderLocation || "—"}</td>
                          <td className={cx("rate")}>{rate}%</td>
                          <td>
                            <Star size={13} fill="currentColor" className={cx("star")} /> {valueOf(item?.averageRating).toFixed(1)}
                          </td>
                          <td>
                            <b>{valueOf(item?.totalSentLeads)}</b>
                          </td>
                          <td>{latest ? relativeTime(latest?.sentDate || latest?.date) : "No activity"}</td>
                          <td>
                            {item?.senderContact && (
                              <a className={cx("round-btn link-button")} href={`tel:${item.senderContact}`} onClick={event => event.stopPropagation()} aria-label={`Call ${item.senderBusinessName}`}>
                                <MessageSquare />
                              </a>
                            )}
                            <button className={cx("round-btn")} onClick={event => { event.stopPropagation(); setSelectedBusiness(item); }} aria-label={`View ${item?.senderBusinessName || "business"} details`}>
                              <Eye />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={cx("empty-table")} colSpan="8">
                        {leadReportLoading ? "Loading network businesses…" : "No network businesses found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button className={cx("view-all")} onClick={() => setShowAllBusinesses(true)}>
              View All Businesses <ArrowRight />
            </button>
          </section>

          <section className={cx("trends card interactive-card")} onClick={event => cardClick(event, () => setSelectedMetric({ ...metrics[0],label:"Requirement Trends",value:weeklyCounts.reduce((sum,count) => sum + count,0),detail:"Published this week" }))}>
            <div className={cx("section-head")}>
              <h3>Requirement Trends</h3>
              <button>
                This Week <ChevronDown />
              </button>
            </div>
            <div className={cx("chart")}>
              <span className={cx("y y1")}>{maxTrend}</span>
              <span className={cx("y y2")}>{Math.round(maxTrend * 0.75)}</span>
              <span className={cx("y y3")}>{Math.round(maxTrend * 0.5)}</span>
              <span className={cx("y y4")}>{Math.round(maxTrend * 0.25)}</span>
              <svg viewBox="0 0 310 125" preserveAspectRatio="none">
                <polyline className={cx("trend-area")} points={`8,116 ${trendPoints} 304,116`} />
                <polyline className={cx("trend-line")} points={trendPoints} />
              </svg>
              <div className={cx("days")}>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className={cx("tooltip")}>
                <b>{weeklyCounts.reduce((sum, count) => sum + count, 0)}</b>
                <small>This week</small>
              </div>
            </div>
          </section>

          <section className={cx("performance card interactive-card")} onClick={event => cardClick(event, () => setSelectedMetric({ ...metrics[4],label:"Network Performance" }))}>
            <div className={cx("section-head")}>
              <h3>Network Performance</h3>
              <button>
                Live <ChevronDown />
              </button>
            </div>
            <div className={cx("performance-grid")}>
              <div>
                <small>Profile Views</small>
                <b>{valueOf(businessProfile?.analytics?.views).toLocaleString()}</b>
                <em>Current total</em>
              </div>
              <div>
                <small>Leads Received</small>
                <b>{valueOf(businessProfile?.mniDetails?.leadsCount, responseCount)}</b>
                <em>Current total</em>
              </div>
              <div>
                <small>Responses</small>
                <b>{responseCount}</b>
                <em>{activeBusinesses} senders</em>
              </div>
              <div>
                <small>Success Rate</small>
                <b>{successRate}%</b>
                <em>{networkScore} score</em>
              </div>
            </div>
          </section>
        </div>
      </main>
      <RequirementModal open={modal} close={() => setModal(false)} user={user} profile={businessProfile} groupCategories={categories} groupName={groupName} />
      <MetricDetailsModal metric={selectedMetric} close={() => setSelectedMetric(null)} requirements={mrpList} leads={sentLeads} businesses={reportBusinesses} profile={businessProfile} openBusinesses={() => setShowAllBusinesses(true)} />
      <DynamicInfoModal open={Boolean(selectedCategory)} onClose={() => setSelectedCategory("")} icon={Layers3} tone="purple" eyebrow="Category-specific results" title={`${selectedCategory} responses`} description={`Every available ${selectedCategory} requirement and lead is listed below with its related business and activity details.`} value={categoryRecords.length} valueLabel={`Total ${selectedCategory} results`} status="Live category data" stats={[{label:"Businesses",value:new Set(categoryRecords.map(item => item?.senderBusinessName || item?.receiverBusinessName || item?.businessName).filter(Boolean)).size},{label:"Active records",value:categoryRecords.filter(item => item?.isActive !== false).length},{label:"Locations",value:new Set(categoryRecords.map(item => item?.location || item?.senderLocation || item?.receiverLocation).filter(Boolean)).size}]} items={categoryRecords.map((item,index) => ({ title:item?.senderBusinessName || item?.receiverBusinessName || item?.businessName || item?.organizationName || `Result ${index+1}`, subtitle:[item?.leadCategory || item?.category || selectedCategory,item?.senderLocation || item?.receiverLocation || item?.location].filter(Boolean).join(" · "), value:relativeTime(dateOf(item)) }))} />
      <NetworkGuideModal type={networkGuide} close={() => setNetworkGuide(null)} groupName={groupName} businessCount={activeBusinesses} />
      <AllBusinessesModal open={showAllBusinesses} close={() => setShowAllBusinesses(false)} businesses={reportBusinesses} loading={leadReportLoading} viewBusiness={setSelectedBusiness} />
      <BusinessDetailsModal business={selectedBusiness} close={() => setSelectedBusiness(null)} />
    </>
  );
}
