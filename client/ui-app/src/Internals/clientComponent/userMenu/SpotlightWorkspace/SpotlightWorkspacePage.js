import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import { getMassclickFeedPosts } from "../../../../redux/actions/massclickFeedAction.js";
import styles from "./SpotlightWorkspacePage.module.css";

const isCampaign = (post) => /announcement|campaign|offer|event|launch|sale/i.test(`${post.title || ""} ${post.text || ""}`) || post.offerStartsAt || post.offerEndsAt;
const modes = {
  calendar: ["Content Calendar", "Posts organized by their real publication date"],
  media: ["Media Library", "Every image and video attached to your Spotlight posts"],
  campaigns: ["Campaigns", "Real offers, announcements, events and promotional posts"],
  leads: ["Leads Inbox", "Lead activity reported by your Spotlight posts"],
  reports: ["Post Reports", "Performance calculated from current Spotlight records"],
};

export default function SpotlightWorkspacePage({ mode }) {
  const dispatch = useDispatch();
  const { posts = [], loading, error } = useSelector((state) => state.massclickFeed || {});
  useEffect(() => { dispatch(getMassclickFeedPosts({ pageSize: 50 })).catch(() => {}); }, [dispatch]);
  const [title, subtitle] = modes[mode] || modes.reports;
  const media = posts.flatMap((post) => (post.mediaItems || []).map((item) => ({ ...item, post })));
  const engagements = (post) => (post.likesCount || post.likes?.length || 0) + (post.commentsCount || post.comments?.length || 0) + (post.sharesCount || 0);
  const grouped = posts.reduce((map, post) => { const key = new Date(post.createdAt).toLocaleDateString(); (map[key] ||= []).push(post); return map; }, {});
  const campaigns = posts.filter(isCampaign);
  const leads = posts.flatMap((post) => Array.isArray(post.leads) ? post.leads.map((lead) => ({ ...lead, post })) : []);
  return <><StickySearchBar/><main className={styles.page}>
    <header><div><Link to="/user_feed">← Spotlight Feed</Link><h1>{title}</h1><p>{subtitle}</p></div><Link className={styles.primary} to="/user_feed">Create Spotlight</Link></header>
    <nav>{Object.entries(modes).map(([key,[label]]) => <Link className={mode === key ? styles.active : ""} to={`/user_spotlight/${key}`} key={key}>{label}</Link>)}</nav>
    {error && !loading ? <div className={styles.errorState}><strong>Unable to load Spotlight records</strong><p>{error.message || "The server could not complete this request."}</p><button type="button" onClick={() => dispatch(getMassclickFeedPosts({ pageSize: 50 })).catch(() => {})}>Try again</button></div> : loading ? <div className={styles.empty}>Loading current records…</div> : <>
      {mode === "media" && <section className={styles.mediaGrid}>{media.length ? media.map((item,index) => <article key={`${item.mediaKey}-${index}`}>{item.mediaType === "video" ? <video controls src={item.mediaUrl}/> : <img src={item.mediaUrl} alt={item.fileName || item.post.title || "Spotlight media"}/>}<div><strong>{item.post.title || item.post.businessName}</strong><small>{item.fileName || item.mediaType}</small></div></article>) : <div className={styles.empty}>No media has been uploaded to Spotlight posts yet.</div>}</section>}
      {mode === "calendar" && <section className={styles.calendar}>{Object.keys(grouped).length ? Object.entries(grouped).map(([date,items]) => <article key={date}><time>{date}</time><div>{items.map((post) => <Link to={`/user_feed?post=${post._id}`} key={post._id}><strong>{post.title || post.businessName}</strong><small>{post.businessCategory || "Spotlight post"}</small></Link>)}</div></article>) : <div className={styles.empty}>No posts are available for the calendar.</div>}</section>}
      {mode === "campaigns" && <section className={styles.list}>{campaigns.length ? campaigns.map((post) => <article key={post._id}><div><strong>{post.title || post.businessName}</strong><p>{post.text || "No description provided."}</p></div><span>{post.offerEndsAt ? `Ends ${new Date(post.offerEndsAt).toLocaleDateString()}` : "Published"}</span></article>) : <div className={styles.empty}>No campaign, offer, event or announcement posts exist yet.</div>}</section>}
      {mode === "leads" && <section className={styles.list}>{leads.length ? leads.map((lead,index) => <article key={lead._id || index}><div><strong>{lead.name || lead.title || "Lead"}</strong><p>{lead.message || lead.contact || "Lead details available"}</p></div><span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}</span></article>) : <div className={styles.empty}>No Spotlight lead records have been reported by the API yet.</div>}</section>}
      {mode === "reports" && <section className={styles.reportGrid}>{posts.length ? posts.map((post) => <article key={post._id}><strong>{post.title || post.businessName}</strong><dl><div><dt>Likes</dt><dd>{post.likesCount || post.likes?.length || 0}</dd></div><div><dt>Comments</dt><dd>{post.commentsCount || post.comments?.length || 0}</dd></div><div><dt>Shares</dt><dd>{post.sharesCount || 0}</dd></div><div><dt>Total engagement</dt><dd>{engagements(post)}</dd></div></dl></article>) : <div className={styles.empty}>No posts are available to report.</div>}</section>}
    </>}
  </main></>;
}
