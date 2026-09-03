import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import ImageIcon from "@mui/icons-material/Image";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import NotesIcon from "@mui/icons-material/Notes";
import CampaignIcon from "@mui/icons-material/Campaign";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Home, PlusCircle, LayoutGrid, Send, BarChart3, CalendarDays, Image as Picture, Crown, Eye, UserRound, Newspaper, Heart, MessageCircle, Share2, Bookmark, SlidersHorizontal, Tag, BriefcaseBusiness, Play, BellRing, X, ChevronLeft, ChevronRight, MapPin, Star, Clock3, Phone, MessageSquareText, Settings } from "lucide-react";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { buildBusinessPath } from "shared/utils/searchResultNavigation.js";
import { isBusinessPeopleUser } from "shared/utils/userUtils.js";
import {
  addMassclickFeedComment,
  createMassclickFeedPost,
  getMassclickFeedPosts,
  shareMassclickFeedPost,
  toggleMassclickFeedLike,
  setMassclickFeedFollow,
  toggleMassclickFeedSave,
  recordMassclickFeedView,
  recordMassclickFeedEnquiry,
  getMassclickFeedBusinesses,
  updateMassclickFeedStory,
  deleteMassclickFeedStory,
} from "state/actions/massclickFeedAction.js";
import styles from "features/user/feed/MassclickFeedPage.module.css";

const cx = createScopedClassNames(styles);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const initialFormData = {
  title: "",
  text: "",
  offerStartsAt: "",
  offerEndsAt: "",
  mediaFiles: [],
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
};

const formatOfferText = (post) => {
  if (!post.offerStartsAt && !post.offerEndsAt) return "";
  if (post.offerStartsAt && post.offerEndsAt) {
    return `Offer: ${formatDate(post.offerStartsAt)} to ${formatDate(post.offerEndsAt)}`;
  }
  return post.offerEndsAt
    ? `Offer until ${formatDate(post.offerEndsAt)}`
    : `Offer from ${formatDate(post.offerStartsAt)}`;
};

const getPostKind = (post = {}) => {
  if (post.offerStartsAt || post.offerEndsAt) return "Offer";
  if (post.mediaItems?.length && post.text?.trim()) return "Photo update";
  if (post.mediaItems?.length) return "Photo post";
  return "Text update";
};

const getPostTypeClass = (post = {}) => {
  if (post.offerStartsAt || post.offerEndsAt) return "offer";
  if (post.mediaItems?.length) return "photo";
  return "text";
};

const isOfferExpiringSoon = (endDate) => {
  if (!endDate) return false;
  const now = new Date();
  const end = new Date(endDate);
  const hoursUntilExpiry = (end - now) / (1000 * 60 * 60);
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
};

const formatCountdownTime = (endDate) => {
  if (!endDate) return "";
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d left`;
  if (hours > 0) return `${hours}h left`;
  return `${minutes}m left`;
};

const canCreateFeedPost = (user = {}) =>
  isBusinessPeopleUser(user) ||
  user.amountPaid === true ||
  user.paid === true ||
  user.subscription?.isActive === true ||
  user.paymentConcept?.paymentStatus === "paid";

const postPrompts = [
  "🔥 Today-only offer or flash discount",
  "🆕 New product, batch, class, or menu arrival",
  "🎉 Event, admission, booking, or holiday timing",
  "⭐ Before/after work, customer proof, or milestone",
  "📸 High-quality photo of your product or space",
  "🕐 Update hours or special holiday schedules",
];

const playbookItems = [
  {
    icon: CampaignIcon,
    title: "Make it useful",
    text: "Post clear price, timing, area, and one direct customer action.",
  },
  {
    icon: LocalOfferIcon,
    title: "Offers work best",
    text: "Add start and end dates so visitors can quickly judge urgency.",
  },
  {
    icon: ImageIcon,
    title: "Show the real thing",
    text: "Use up to four clean photos of the shop, product, result, or service.",
  },
];

const spotlightNavigation = [
  ["⌂", "Dashboard"], ["✦", "Spotlight"], ["▦", "Categories"], ["◇", "Offers"],
  ["□", "Events"], ["▣", "Businesses"], ["◌", "Messages"], ["♡", "Saved"],
  ["♙", "Followers"], ["▥", "Insights"], ["▤", "Reports"], ["◉", "Subscriptions"],
];

const spotlightRoutes = {
  Dashboard: "/user_dashboard", Spotlight: "/user_feed", Categories: "/categories",
  Offers: "/user_feed", Events: "/events", Businesses: "/", Messages: "/user-customer-service",
  Saved: "/user_favorites", Followers: "/user_dashboard", Insights: "/user_dashboard",
  Reports: "/user_dashboard", Subscriptions: "/user_dashboard",
};
const createTypes = [
  ["◇", "Offer / Discount"], ["▤", "Update / News"], ["□", "Event"], ["▣", "Product"],
  ["⚙", "Service"], ["⚑", "Announcement"], ["▰", "Job / Hiring"], ["▥", "Poll / Survey"], ["▶", "Video Post"],
];
const spotlightTools = [
  ["□", "Post Scheduler", "Schedule posts in advance"], ["▤", "Templates", "Ready to use designs"],
  ["▣", "Drafts", "Continue your drafts"], ["▧", "Media Library", "Your images & videos"],
  ["⚑", "Ad Boost", "Promote your post"], ["▢", "Leads Inbox", "Manage your leads"],
  ["⌘", "QR Code", "Share your post"], ["▥", "Post Reports", "Performance analytics"],
];

const formatCompactNumber = (value = 0) => {
  if (value > 999) return `${(value / 1000).toFixed(1)}k`;
  return value;
};

const FILTER_POST_TYPES = {
  Offers: "offer",
  Updates: "update",
  Events: "event",
  Products: "product",
  Services: "service",
  Jobs: "job",
  Announcements: "announcement",
  Videos: "video",
  Polls: "poll",
};

const replicaMenu = [
  [Home, "Spotlight Feed"], [PlusCircle, "Create Post"], [LayoutGrid, "Planner Overview"],
  [Newspaper, "My Posts"], [Picture, "Media Library"], [Settings, "Settings"],
];

const ReplicaPost = ({ post, index, onLike, onShare, onComment, onOpen, onSave, onEnquire, onFollow, onProfile }) => {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const media = post?.mediaItems?.find((item) => item.mediaUrl);
  const business = post?.businessName || "MassClick Business";
  const initials = business.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const likes = post?.likesCount ?? post?.likes?.length ?? 0;
  const comments = post?.commentsCount ?? post?.comments?.length ?? 0;
  const shares = post?.sharesCount ?? 0;
  const hashtags = (post?.hashtags || []).map((tag) => `#${String(tag).replace(/^#/, "")}`).join(" ");
  const postedAt = post?.createdAt ? new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(post.createdAt)) : "Time unavailable";
  const runAction = async (name, action, successMessage = "") => {
    if (busyAction) return false;
    setBusyAction(name); setActionNotice("");
    try { await action(); if (successMessage) setActionNotice(successMessage); return true; }
    catch { setActionNotice("That action could not be completed. Please try again."); return false; }
    finally { setBusyAction(""); }
  };
  const submitComment = () => { if (comment.trim()) runAction("comment", () => onComment(post._id, comment.trim())).then((saved) => { if (saved) { setComment(""); setCommenting(false); } }); };
  return <article className={cx("replica-post")}>
    <header><button className={cx("replica-profile-trigger")} type="button" onClick={() => onProfile(post)} aria-label={`View ${business} profile`}><span className={cx("replica-avatar", index % 2 && "replica-avatar-warm")}>{initials}</span><span><strong>{business}</strong><small><time dateTime={post?.createdAt || undefined} title={post?.createdAt ? new Date(post.createdAt).toString() : undefined}>{postedAt}</time> · Public{post?.businessLocation ? ` · ${post.businessLocation}` : ""}</small></span></button>{post.businessId && <button className={cx("replica-follow", post.isFollowing && "following")} type="button" aria-pressed={Boolean(post.isFollowing)} onClick={() => onFollow(post.businessId, post.isFollowing)}>{post.isFollowing ? "Following" : "Follow"}</button>}<button className={cx("replica-more")} type="button" onClick={() => onOpen(post)} aria-label="Open post details">•••</button></header>
    <div className={cx("replica-copy")} onClick={() => onOpen(post)} role="button" tabIndex="0">
      {post?.title && <h3>{post.title}</h3>}
      {post?.text && <p>{post.text}</p>}
      {hashtags && <a href="#spotlight-posts" onClick={(event) => event.preventDefault()}>{hashtags}</a>}
    </div>
    {media && (media.mediaType === "video" ? <video className={cx("replica-post-image")} src={media.mediaUrl} controls preload="metadata" /> : <img className={cx("replica-post-image")} src={media.mediaUrl} alt={media.fileName || business} onClick={() => onOpen(post)} />)}
    <div className={cx("poster-facts")}><span><Star size={16}/><b>4.8</b><small>Customer rating</small></span><span><MapPin size={16}/><b>{post?.businessLocation || "Local"}</b><small>Business location</small></span><span><Clock3 size={16}/><b>Open Today</b><small>Business hours</small></span></div>
    <div className={cx("poster-metrics")}><span><Eye/><b>{formatCompactNumber(post?.viewsCount || 0)}</b><small>Views</small></span><span className={post.likedByMe ? cx("metric-liked") : ""}><Heart fill={post.likedByMe ? "currentColor" : "none"}/><b>{likes.toLocaleString()}</b><small>Interested</small></span><span><MessageSquareText/><b>{(post?.enquiriesCount || 0).toLocaleString()}</b><small>Enquiries</small></span><span><Share2/><b>{shares.toLocaleString()}</b><small>Shares</small></span></div>
    <div className={cx("poster-ctas")}><button type="button" disabled={busyAction === "enquiry"} onClick={()=>runAction("enquiry",()=>onEnquire(post._id),"Enquiry sent successfully")}><MessageSquareText/>{busyAction === "enquiry" ? "Sending…" : "Enquire Now"}</button>{(post.callToActions || []).slice(0,2).map((item)=><a key={item.action} href={getActionHref(item)} target={["call","whatsapp"].includes(item.action)?undefined:"_blank"} rel="noreferrer">{item.action === "call" ? <Phone/> : <MapPin/>}{item.label}</a>)}{!post.callToActions?.length && <button type="button" disabled={busyAction === "callback"} onClick={()=>runAction("callback",()=>onEnquire(post._id),"Callback requested")}><Phone/>{busyAction === "callback" ? "Requesting…" : "Request Callback"}</button>}</div>
    {actionNotice && <div className={cx("poster-notice")} role="status">✓ {actionNotice}</div>}
    <div className={cx("replica-social-counts")}><span><i>●</i><b>♥</b> {likes.toLocaleString()}</span><span>{comments.toLocaleString()} Comment{comments === 1 ? "" : "s"} · {shares.toLocaleString()} Share{shares === 1 ? "" : "s"}</span></div>
    <footer>
      <button type="button" aria-pressed={Boolean(post.likedByMe)} disabled={busyAction === "like"} className={post.likedByMe ? cx("liked") : ""} onClick={() => runAction("like", () => onLike(post._id))}><Heart size={18} fill={post.likedByMe ? "currentColor" : "none"}/> {busyAction === "like" ? "Updating…" : post.likedByMe ? "Liked" : "Like"}</button>
      <button type="button" onClick={() => setCommenting((value) => !value)}><MessageCircle size={18}/> Comment</button>
      <button type="button" onClick={() => onShare(post)}><Share2 size={18}/> Share</button>
      <button type="button" aria-pressed={Boolean(post.savedByMe)} disabled={busyAction === "save"} className={post.savedByMe ? cx("saved") : ""} onClick={() => runAction("save", () => onSave(post._id))}><Bookmark size={18} fill={post.savedByMe ? "currentColor" : "none"}/> {busyAction === "save" ? "Updating…" : post.savedByMe ? "Saved" : "Save"}</button>
    </footer>
    {commenting && <div className={cx("replica-comment")}><input autoFocus maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitComment()} placeholder="Write a comment…"/><span>{comment.length}/500</span><button type="button" disabled={!comment.trim() || busyAction === "comment"} onClick={submitComment}>{busyAction === "comment" ? "Posting…" : "Post"}</button></div>}
  </article>;
};

function BusinessProfileModal({ post, posts, onClose, onFollow }) {
  const business = post?.businessName || "MassClick Business";
  const initials = business.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const businessPosts = posts.filter((item) => String(item.businessId || "") === String(post?.businessId || ""));
  const publicActions = (post?.callToActions || []).filter((item) => item?.value).slice(0, 3);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);
  return <div className={cx("profile-backdrop")} role="presentation" onMouseDown={onClose}><section className={cx("profile-modal")} role="dialog" aria-modal="true" aria-labelledby="business-profile-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className={cx("profile-close")} type="button" onClick={onClose} aria-label="Close business profile"><X/></button>
    <header><div className={cx("profile-avatar")}>{initials}</div><div><small>{post?.ownerActorType === "business" ? "Business account" : "Business person"}</small><h2 id="business-profile-title">{business}</h2><p>{[post?.businessCategory, post?.businessLocation].filter(Boolean).join(" · ") || "Local business on MassClick"}</p></div></header>
    <div className={cx("profile-stats")}><span><strong>{(post?.followersCount || 0).toLocaleString()}</strong><small>Followers</small></span><span><strong>{businessPosts.length}</strong><small>Spotlight Posts</small></span><span><strong>{businessPosts.reduce((total, item) => total + (item.likesCount || 0), 0).toLocaleString()}</strong><small>Interested</small></span></div>
    <div className={cx("profile-details")}><h3>Business details</h3><p><BriefcaseBusiness/><span><small>Category</small><strong>{post?.businessCategory || "Local business"}</strong></span></p><p><MapPin/><span><small>Location</small><strong>{post?.businessLocation || "Location not provided"}</strong></span></p><p><UserRound/><span><small>Profile type</small><strong>{post?.ownerActorType === "business" ? "Verified business account" : "Business person"}</strong></span></p></div>
    {publicActions.length > 0 && <div className={cx("profile-contact")}><h3>Contact business</h3>{publicActions.map((item) => <a key={item.action} href={getActionHref(item)} target={["call","whatsapp"].includes(item.action) ? undefined : "_blank"} rel="noreferrer">{item.action === "call" ? <Phone/> : item.action === "whatsapp" ? <MessageCircle/> : <MapPin/>}<span>{item.label}</span></a>)}</div>}
    {post?.businessId && <footer><button type="button" className={post.isFollowing ? cx("following") : ""} aria-pressed={Boolean(post.isFollowing)} onClick={() => onFollow(post.businessId, post.isFollowing)}>{post.isFollowing ? "✓ Following" : "+ Follow Business"}</button><small>{post.isFollowing ? "You’ll see this business’s updates first." : "Follow to see new posts and offers first."}</small></footer>}
  </section></div>;
}

function BusinessFriendModal({ business, onClose, onFollow }) {
  const navigate = useNavigate();
  const initials = business.businessName.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  const profilePath = buildBusinessPath({ districtSlug: business.districtSlug, location: business.businessLocation, businessName: business.businessName, publicId: business.publicId, id: business.businessId });
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);
  return <div className={cx("profile-backdrop")} role="presentation" onMouseDown={onClose}><section className={cx("profile-modal","friend-preview-modal")} role="dialog" aria-modal="true" aria-labelledby="friend-preview-title" onMouseDown={(event)=>event.stopPropagation()}><button className={cx("profile-close")} type="button" onClick={onClose} aria-label="Close business preview"><X/></button><header><div className={cx("profile-avatar")}>{business.businessLogoUrl ? <img src={business.businessLogoUrl} alt=""/> : initials}</div><div><small>Business profile</small><h2 id="friend-preview-title">{business.businessName}</h2><p>{[business.businessCategory,business.businessLocation].filter(Boolean).join(" · ") || "Local business on MassClick"}</p></div></header><div className={cx("profile-stats")}><span><strong>{business.followersCount || 0}</strong><small>Followers</small></span><span><strong>{business.postsCount || 0}</strong><small>Spotlight Posts</small></span><span><strong>{business.averageRating ? Number(business.averageRating).toFixed(1) : "New"}</strong><small>Rating</small></span></div><div className={cx("profile-details")}><h3>Basic business details</h3><p><BriefcaseBusiness/><span><small>Category</small><strong>{business.businessCategory || "Local business"}</strong></span></p><p><MapPin/><span><small>Location</small><strong>{business.businessLocation || "Location not provided"}</strong></span></p><p><UserRound/><span><small>MassClick connection</small><strong>{business.isFollowing ? "You are following this business" : "Available to follow"}</strong></span></p></div><footer className={cx("friend-preview-actions")}><button type="button" className={business.isFollowing ? cx("following") : ""} onClick={()=>onFollow(business.businessId,business.isFollowing)}>{business.isFollowing ? "✓ Following" : "+ Follow Business"}</button><button type="button" onClick={()=>navigate(profilePath)}>View Full Profile →</button><small>The full profile opens as a separate business details page.</small></footer></section></div>;
}

const storyDefaults = { text: "", background: "#1746a2", textColor: "#ffffff", font: "modern", align: "center", musicTitle: "", musicArtist: "", mediaFiles: [] };
const storyBackgrounds = ["#1746a2", "#7028e4", "#d52761", "#e85d04", "#087f5b", "#101828"];

function StoryEditor({ initialStory, busy, error, onClose, onPublish }) {
  const [draft, setDraft] = useState(() => initialStory ? { ...storyDefaults, text: initialStory.text || "", ...initialStory.storyStyle } : storyDefaults);
  const [preview, setPreview] = useState(initialStory?.mediaItems?.[0]?.mediaUrl || "");
  const [previewType, setPreviewType] = useState(initialStory?.mediaItems?.[0]?.mediaType || "");
  const selectMedia = async (event) => {
    const file = event.target.files?.[0];
    if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/")) || file.size > 45 * 1024 * 1024) return;
    const mediaFile = await readFileAsDataUrl(file);
    setPreview(mediaFile); setPreviewType(file.type.startsWith("video/") ? "video" : "image");
    setDraft((value) => ({ ...value, mediaFiles: [{ mediaFile, fileName: file.name, fileType: file.type, fileSize: file.size }] }));
  };
  const publish = () => onPublish({ text: draft.text, mediaFiles: draft.mediaFiles, postType: "story", expireAfterDays: 1, storyStyle: { background: draft.background, textColor: draft.textColor, font: draft.font, align: draft.align, musicTitle: draft.musicTitle, musicArtist: draft.musicArtist } });
  return <div className={cx("story-editor-backdrop")} role="presentation" onMouseDown={onClose}><section className={cx("story-editor")} role="dialog" aria-modal="true" aria-labelledby="story-editor-title" onMouseDown={(event)=>event.stopPropagation()}>
    <header><div><small>Visible for 24 hours</small><h2 id="story-editor-title">{initialStory ? "Edit your story" : "Create your story"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X/></button></header>
    <div className={cx("story-editor-layout")}><div className={cx("story-canvas")} style={{background:draft.background,color:draft.textColor,textAlign:draft.align}}>{preview && (previewType === "video" ? <video src={preview} controls playsInline/> : <img src={preview} alt="Story preview"/>)}<strong className={cx(`story-font-${draft.font}`)}>{draft.text || "Your story text"}</strong>{(draft.musicTitle || draft.musicArtist) && <span>♫ {draft.musicTitle || "Music"}{draft.musicArtist ? ` · ${draft.musicArtist}` : ""}</span>}</div>
    <div className={cx("story-controls")}><label>Story text<textarea maxLength={1200} value={draft.text} onChange={(event)=>setDraft({...draft,text:event.target.value})} placeholder="Share an update, offer or moment…"/><small>{draft.text.length}/1200</small></label>{!initialStory && <label className={cx("story-upload")}>Photo or video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={selectMedia}/><span><Picture/> Choose media</span></label>}<fieldset><legend>Background</legend><div className={cx("story-swatches")}>{storyBackgrounds.map((color)=><button key={color} type="button" aria-label={`Use ${color}`} aria-pressed={draft.background===color} style={{background:color}} onClick={()=>setDraft({...draft,background:color})}/>)}</div></fieldset>
    <div className={cx("story-control-row")}><label>Text color<input type="color" value={draft.textColor} onChange={(event)=>setDraft({...draft,textColor:event.target.value})}/></label><label>Font<select value={draft.font} onChange={(event)=>setDraft({...draft,font:event.target.value})}><option value="modern">Modern</option><option value="classic">Classic</option><option value="strong">Strong</option><option value="playful">Playful</option></select></label><label>Align<select value={draft.align} onChange={(event)=>setDraft({...draft,align:event.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div><div className={cx("story-music-fields")}><label>Music title<input maxLength={80} value={draft.musicTitle} onChange={(event)=>setDraft({...draft,musicTitle:event.target.value})} placeholder="Licensed track title"/></label><label>Artist<input maxLength={80} value={draft.musicArtist} onChange={(event)=>setDraft({...draft,musicArtist:event.target.value})} placeholder="Artist name"/></label></div><p className={cx("story-editor-note")}>Music is attribution metadata; playback needs a licensed music provider.</p>{error && <p className={cx("story-editor-error")} role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button type="button" disabled={busy || (!draft.text.trim() && !draft.mediaFiles.length && !preview)} onClick={publish}>{busy ? "Saving…" : initialStory ? "Save changes" : "Share story"}</button></footer></div></div>
  </section></div>;
}

const SpotlightReplica = ({ posts, currentUser, canStory, businesses, businessPage, businessTotal, businessHasMore, businessLoading, loadBusinessPage, searchBusinesses, filteredPosts, activeFilter, setActiveFilter, openComposer, moveToSection, totalViews, totalEngagements, totalLeads, handleLike, handleShare, handleComment, handleSave, handleEnquire, handleFollow, openPost, createStory, editStory, removeStory }) => {
  const [selectedStory, setSelectedStory] = useState(null);
  const [profilePostId, setProfilePostId] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [businessSearch, setBusinessSearch] = useState("");
  const [storyEditor, setStoryEditor] = useState(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyError, setStoryError] = useState("");
  const [storyClock, setStoryClock] = useState(Date.now());
  const businessSearchReady = useRef(false);
  const savedCount = posts.filter((post) => post.savedByMe).length;
  const displayPosts = (savedOnly ? filteredPosts.filter((post) => post.savedByMe) : filteredPosts).slice(0, savedOnly ? 50 : 4);
  const currentUserId = String(currentUser?._id || currentUser?.id || currentUser?.userId || currentUser?.subjectId || "");
  const stories = posts.filter((post) => post.postType === "story" && post.status === "active" && !post.isDeleted && storyClock - new Date(post.createdAt).getTime() < 86400000).map((post) => ({ name: post.businessName || "MassClick user", post, image: post.mediaItems?.[0]?.mediaUrl || "", mediaType: post.mediaItems?.[0]?.mediaType || "", mine: Boolean(post.ownedByMe) || (Boolean(currentUserId) && String(post.ownerUserId) === currentUserId) }));
  const showStory = (index) => setSelectedStory(Math.max(0, Math.min(stories.length - 1, index)));
  const submitStory = async (payload) => { setStoryBusy(true); setStoryError(""); try { if (storyEditor) await editStory(storyEditor._id,payload); else await createStory(payload); setStoryEditor(null); } catch (error) { setStoryError(error?.response?.data?.message || error?.message || "Story could not be saved."); } finally { setStoryBusy(false); } };
  const removeSelectedStory = async (story) => { if (!window.confirm("Delete this story?")) return; setStoryBusy(true); try { await removeStory(story._id); setSelectedStory(null); } catch (error) { setStoryError(error?.response?.data?.message || "Story could not be deleted."); } finally { setStoryBusy(false); } };
  const trendingTags = Object.entries(posts.flatMap((post) => post.hashtags || []).reduce((counts, tag) => ({ ...counts, [tag]: (counts[tag] || 0) + 1 }), {})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const visibleBusinesses = businesses;
  useEffect(() => {
    if (!businessSearchReady.current) { businessSearchReady.current = true; return undefined; }
    const timer = window.setTimeout(() => searchBusinesses(businessSearch.trim()), 350);
    return () => window.clearTimeout(timer);
    // Search only when the text changes; the callback intentionally uses the latest parent request handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSearch]);
  useEffect(() => {
    if (selectedStory === null) return undefined;
    const timer = window.setTimeout(() => setSelectedStory(null), 30000);
    return () => window.clearTimeout(timer);
  }, [selectedStory]);
  useEffect(() => {
    const timer = window.setInterval(() => setStoryClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const types = [[Tag,"Offer / Discount"],[Newspaper,"Update / News"],[CalendarDays,"Event"],[LayoutGrid,"Product"],[BellRing,"Service"],[Send,"Announcement"],[BriefcaseBusiness,"Job / Hiring"],[BarChart3,"Poll / Survey"],[Play,"Video Post"]];
  return <><StickySearchBar/><main className={cx("replica-page")}>
    <aside className={cx("replica-sidebar")}><nav>{replicaMenu.map(([Icon,label], index) => <button key={label} type="button" className={(label === "Saved" ? savedOnly : index === 0 && !savedOnly) ? cx("active") : ""} onClick={label === "Create Post" ? openComposer : label === "Saved" ? ()=>setSavedOnly(true) : () => { setSavedOnly(false); moveToSection(label); }}><Icon size={19}/><span>{label}</span>{label === "Saved" && <b className={cx("saved-count")}>{savedCount}</b>}</button>)}</nav><section><Crown/><h3>Go Premium</h3><p>Unlock advanced tools, analytics and more to grow your business.</p><button type="button">Upgrade Now →</button></section></aside>
    <div className={cx("replica-center")}>
      <section className={cx("replica-stories")}><header><h2>Stories & Status</h2>{canStory && <button type="button" onClick={()=>setStoryEditor(false)}>Create status</button>}</header><div>{canStory && <button type="button" onClick={()=>setStoryEditor(false)}><span className={cx("story-ring","story-add")}>+</span><small>Add Story</small></button>}{stories.map((story,index) => <button type="button" key={story.post._id} onClick={()=>showStory(index)}><span className={cx("story-ring")}>{story.image && story.mediaType === "image" ? <img src={story.image} alt=""/> : <b>{story.name.split(/\s+/).map(word=>word[0]).slice(0,2).join("")}</b>}<i/></span><small>{story.mine ? "Your Story" : story.name}</small></button>)}{!canStory && !stories.length && <p className={cx("replica-muted")}>No active stories right now.</p>}</div></section>
      <section className={cx("replica-composer")}><span className={cx("replica-avatar")}>MC</span><button type="button" onClick={openComposer}>What’s on your mind today? <span>☺</span></button><div>{[[Picture,"Photo / Video"],[Tag,"Offer / Discount"],[CalendarDays,"Event"],[BarChart3,"Poll / Survey"]].map(([Icon,label])=><button type="button" key={label} onClick={openComposer}><Icon size={17}/>{label}</button>)}</div></section>
      {savedOnly && <section className={cx("saved-heading")}><div><Bookmark fill="currentColor"/><span><strong>Saved Posts</strong><small>{savedCount} saved item{savedCount === 1 ? "" : "s"} · posts, posters, videos and documents</small></span></div><button type="button" onClick={()=>setSavedOnly(false)}>Back to Feed</button></section>}
      <div className={cx("replica-filters")} id="spotlight-posts">{["All Posts","Offers","Updates","Events","Products","Services","Jobs"].map(label => { const filter = label === "All Posts" ? "All" : label; return <button type="button" key={label} className={activeFilter === filter ? cx("active") : ""} onClick={()=>setActiveFilter(filter)}>{label}</button>})}<button type="button" aria-label="More filters"><SlidersHorizontal size={18}/></button></div>
      <section className={cx("replica-feed")}>{displayPosts.length ? displayPosts.map((post,index)=><ReplicaPost key={post._id || index} post={post} index={index} onLike={handleLike} onShare={handleShare} onComment={handleComment} onSave={handleSave} onEnquire={handleEnquire} onFollow={handleFollow} onProfile={(item)=>setProfilePostId(item._id)} onOpen={openPost}/>) : <div className={cx("replica-empty")}>{savedOnly ? <Bookmark/> : <Newspaper/>}<strong>{savedOnly ? "No saved posts yet" : "No Spotlight posts yet"}</strong><span>{savedOnly ? "Tap Save on any post, poster, video or document to keep it here." : "Create the first post to start your local feed."}</span><button type="button" onClick={savedOnly ? ()=>setSavedOnly(false) : openComposer}>{savedOnly ? "Browse Spotlight" : "Create Post"}</button></div>}</section>
    </div>
    <aside className={cx("replica-right")}>
      <section className={cx("replica-insights")}><header><h2>Spotlight Insights</h2><button type="button" onClick={()=>moveToSection("Insights")}>View All</button></header><div>{[[Eye,"Views",totalViews],[Heart,"Engagement",totalEngagements],[UserRound,"Leads",totalLeads],[Newspaper,"Posts",posts.length]].map(([Icon,label,value])=><button type="button" key={label} onClick={()=>moveToSection("Insights")}><Icon size={18}/><small>{label}</small><strong>{formatCompactNumber(value || 0)}</strong><em>Live total</em></button>)}</div><svg viewBox="0 0 300 150" role="img" aria-label="Views and engagement chart"><path d="M5 125 C45 115 55 72 95 76 S145 88 170 38 S225 23 245 65 S280 88 295 82"/><path className={cx("orange")} d="M5 140 C50 132 62 102 100 108 S150 112 178 78 S220 58 246 94 S275 112 295 110"/></svg><footer><span>● Views</span><span>● Engagements</span></footer></section>
      <section className={cx("business-friends")}><header><div><h2>Find Business Friends</h2><p>Follow local businesses to see their posts first.</p></div><small>{businessLoading ? "Searching…" : `${businessTotal} result${businessTotal===1?"":"s"}`}</small></header><label><span>⌕</span><input value={businessSearch} onChange={(event)=>setBusinessSearch(event.target.value)} placeholder="Search all businesses" aria-label="Search all business friends"/></label><div>{visibleBusinesses.length ? visibleBusinesses.map((business) => <article key={business.businessId}><button className={cx("business-friend-profile")} type="button" onClick={()=>setSelectedBusinessId(business.businessId)}><span>{business.businessLogoUrl ? <img src={business.businessLogoUrl} alt=""/> : business.businessName.split(/\s+/).map((word)=>word[0]).slice(0,2).join("")}</span><div><strong>{business.businessName}</strong><small>{[business.businessCategory,business.businessLocation].filter(Boolean).join(" · ")}</small><em>{business.followersCount} follower{business.followersCount===1?"":"s"} · {business.postsCount} post{business.postsCount===1?"":"s"}</em></div></button><button type="button" className={business.isFollowing ? cx("following") : ""} aria-pressed={Boolean(business.isFollowing)} onClick={()=>handleFollow(business.businessId,business.isFollowing)}>{business.isFollowing ? "Following" : "Follow"}</button></article>) : <p className={cx("replica-muted")}>{businessLoading ? "Searching all businesses…" : "No matching businesses found."}</p>}</div><nav className={cx("business-pagination")} aria-label="Business friends pages"><button type="button" disabled={businessLoading || businessPage===1} onClick={()=>loadBusinessPage(businessPage-1)}>← Previous</button><span>{businessLoading ? "Loading…" : `Page ${businessPage}`}</span><button type="button" disabled={businessLoading || !businessHasMore} onClick={()=>loadBusinessPage(businessPage+1)}>Next →</button></nav></section>
      <section className={cx("replica-create")}><h2>Create Spotlight Post</h2><div>{types.map(([Icon,label])=><button type="button" key={label} onClick={openComposer}><Icon size={19}/><small>{label}</small></button>)}</div></section>
      <section className={cx("replica-calendar")}><header><h2>Upcoming Calendar</h2><button type="button" onClick={()=>moveToSection("Calendar")}>View All</button></header>{[["Independence Day Offer","15 Aug 2026 · All Day"],["Back to School Campaign","20 Aug 2026 · 10:00 AM"],["Weekend Special Offer","22 Aug 2026 · All Day"]].map(([title,date],index)=><button type="button" key={title} onClick={()=>moveToSection("Calendar")}><CalendarDays size={18}/><span><strong>{title}</strong><small>{date}</small></span></button>)}</section>
      <section className={cx("replica-trending")}><header><h2>Trending Hashtags</h2><button type="button">View All</button></header>{trendingTags.length ? trendingTags.map(([tag,count])=><button key={tag} type="button"><strong>#{String(tag).replace(/^#/,"")}</strong><small>{count} post{count === 1 ? "" : "s"}</small></button>) : <p className={cx("replica-muted")}>Hashtag counts will appear from published posts.</p>}</section>
    </aside>
    <button className={cx("replica-fab")} type="button" onClick={openComposer} aria-label="Create Spotlight post">✎</button>
    {selectedStory !== null && <div className={cx("status-backdrop")} role="presentation" onMouseDown={()=>setSelectedStory(null)}><section className={cx("status-viewer")} role="dialog" aria-modal="true" aria-label={`${stories[selectedStory].name} status`} onMouseDown={(event)=>event.stopPropagation()}>
      <div className={cx("status-progress")} style={{gridTemplateColumns:`repeat(${stories.length},1fr)`}}>{stories.map((story,index)=><i key={story.post._id} className={index < selectedStory ? cx("seen") : index === selectedStory ? cx("playing") : ""}/>)}</div>
      <header><span className={cx("status-avatar")}>{stories[selectedStory].name.charAt(0)}</span><div><strong>{stories[selectedStory].mine ? "Your Story" : stories[selectedStory].name}</strong><small>{new window.Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(new Date(stories[selectedStory].post.createdAt))}</small></div>{stories[selectedStory].mine && <><button type="button" onClick={()=>{setStoryEditor(stories[selectedStory].post);setSelectedStory(null);}}>Edit</button><button type="button" disabled={storyBusy} onClick={()=>removeSelectedStory(stories[selectedStory].post)} aria-label="Delete story"><DeleteOutlineIcon/></button></>}<button type="button" onClick={()=>setSelectedStory(null)} aria-label="Close status"><X/></button></header>
      <div className={cx("status-content")} style={{background:stories[selectedStory].post.storyStyle?.background,color:stories[selectedStory].post.storyStyle?.textColor,textAlign:stories[selectedStory].post.storyStyle?.align}}>{stories[selectedStory].image ? (stories[selectedStory].mediaType === "video" ? <video src={stories[selectedStory].image} autoPlay controls playsInline/> : <img src={stories[selectedStory].image} alt={stories[selectedStory].name}/>) : null}<div className={cx(`story-font-${stories[selectedStory].post.storyStyle?.font || "modern"}`)}><strong>{stories[selectedStory].post.text}</strong>{stories[selectedStory].post.storyStyle?.musicTitle && <small>♫ {stories[selectedStory].post.storyStyle.musicTitle}{stories[selectedStory].post.storyStyle.musicArtist ? ` · ${stories[selectedStory].post.storyStyle.musicArtist}` : ""}</small>}</div></div>
      <button className={cx("status-prev")} type="button" disabled={selectedStory === 0} onClick={()=>showStory(selectedStory - 1)} aria-label="Previous status"><ChevronLeft/></button><button className={cx("status-next")} type="button" disabled={selectedStory === stories.length - 1} onClick={()=>showStory(selectedStory + 1)} aria-label="Next status"><ChevronRight/></button>
      <footer><input placeholder="Reply to this status…"/><button type="button" aria-label="Like status"><Heart/></button><button type="button" aria-label="Share status"><Send/></button></footer>
    </section></div>}
    {storyEditor !== null && <StoryEditor initialStory={storyEditor || null} busy={storyBusy} error={storyError} onClose={()=>{setStoryEditor(null);setStoryError("");}} onPublish={submitStory}/>}
    {profilePostId && (() => { const profilePost = posts.find((item) => item._id === profilePostId); return profilePost ? <BusinessProfileModal post={profilePost} posts={posts} onClose={()=>setProfilePostId(null)} onFollow={handleFollow}/> : null; })()}
    {selectedBusinessId && (() => { const selectedBusiness = businesses.find((item)=>String(item.businessId)===String(selectedBusinessId)); return selectedBusiness ? <BusinessFriendModal business={selectedBusiness} onClose={()=>setSelectedBusinessId(null)} onFollow={handleFollow}/> : null; })()}
  </main><Footer/></>;
};

const matchesFeedFilter = (post = {}, filter = "All") => {
  if (filter === "All") return true;
  if (filter === "Offers" && (post.offerStartsAt || post.offerEndsAt)) return true;
  if (filter === "Videos" && post.mediaItems?.some((item) => item.mediaType === "video")) return true;
  return String(post.postType || "update").toLowerCase() === FILTER_POST_TYPES[filter];
};

const getActionHref = ({ action, value } = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (action === "call") return `tel:${raw.replace(/[^+\d]/g, "")}`;
  if (action === "whatsapp") return `https://wa.me/${raw.replace(/\D/g, "")}`;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

function FeedMediaItem({ item, post, className, stopPropagation = false }) {
  if (item.mediaType === "video") return <video className={className} src={item.mediaUrl} controls preload="metadata" onClick={stopPropagation ? (event) => event.stopPropagation() : undefined} />;
  if (item.mediaType === "file") return <a className={cx("post-file-attachment")} href={item.mediaUrl} target="_blank" rel="noreferrer" download onClick={(event) => event.stopPropagation()}><span>{item.fileName?.split(".").pop()?.toUpperCase() || "FILE"}</span><strong>{item.fileName || "Download attachment"}</strong><small>Open attachment</small></a>;
  return <img className={className} src={item.mediaUrl} alt={item.fileName || post.title || "Spotlight"} loading="lazy" />;
}

function FeedPost({ post, onLike, onShare, onComment, onOpen, isFollowing, onFollow }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const offerText = formatOfferText(post);
  const imageCount = post.mediaItems?.length || 0;

  const submitComment = (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    onComment(post._id, commentText).then(() => setCommentText(""));
  };

  return (
    <article
      className={cx("post-card")}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(post);
      }}
      aria-label={`Open ${post.title || post.businessName || "Spotlight"} details`}
    >
      <div className={cx("post-body")}>
        <div className={cx("post-header")}>
          <div className={cx("business-avatar")}>
            {(post.businessName || "M").charAt(0).toUpperCase()}
          </div>
          <div className={cx("post-identity")}>
            <div className={cx("post-name-row")}>
              <h2 className={cx("business-name")}>
                {post.businessName || "MassClick Business"}
              </h2>
              <span className={cx("post-type-badge", `post-type-${getPostTypeClass(post)}`)}>
                {getPostKind(post)}
              </span>
            </div>
            <p className={cx("post-meta")}>
              <span className={cx("post-meta-item")}>
                {[post.businessCategory, post.businessLocation]
                  .filter(Boolean)
                  .join(" | ") || "Local business"}
              </span>
              <span className={cx("post-meta-item")}>
                {formatDate(post.createdAt)}
              </span>
            </p>
          </div>
          {post.businessId && <button className={cx("follow-button", isFollowing && "follow-button-active")} type="button" onClick={(event) => { event.stopPropagation(); onFollow(post.businessId); }}>{isFollowing ? "Following" : "Follow"}</button>}
        </div>

        {offerText && (
          <div className={cx("offer-badge")}>
            <span>{offerText}</span>
            {isOfferExpiringSoon(post.offerEndsAt) && (
              <span className={cx("offer-countdown")}>
                ⏱ {formatCountdownTime(post.offerEndsAt)}
              </span>
            )}
          </div>
        )}
        {(post.title || post.text) && (
          <div className={cx(!imageCount ? "text-only-panel" : "post-copy")}>
            {post.title && <h3 className={cx("post-title")}>{post.title}</h3>}
            {post.text && <p className={cx("post-text")}>{post.text}</p>}
          </div>
        )}
        {!!post.callToActions?.length && <div className={cx("post-cta-row")} onClick={(event) => event.stopPropagation()}>{post.callToActions.map((item) => <a href={getActionHref(item)} target={item.action === "call" ? undefined : "_blank"} rel="noreferrer" key={item.action}>{item.label}</a>)}</div>}

        {imageCount > 0 && (
          <div
            className={cx(`image-grid image-grid-${Math.min(imageCount, 4)}`)}
          >
            {post.mediaItems.map((item, index) => <FeedMediaItem key={item.mediaKey} item={item} post={post} stopPropagation className={cx(`post-image ${imageCount === 1 ? "post-image-single" : ""} ${imageCount === 3 && index === 0 ? "post-image-featured" : ""}`)} />)}
          </div>
        )}
      </div>

      <div className={cx("post-actions")}>
        <button
          className={cx(
            `ghost-button ${post.likedByMe ? "active-action" : ""}`,
          )}
          type="button"
          onClick={(event) => { event.stopPropagation(); onLike(post._id); }}
        >
          {post.likedByMe ? (
            <FavoriteIcon fontSize="small" />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}{" "}
          {post.likesCount || 0} Like
        </button>
        <button
          className={cx("ghost-button")}
          type="button"
          onClick={(event) => { event.stopPropagation(); setShowComments((value) => !value); }}
        >
          <ChatBubbleOutlineIcon fontSize="small" /> {post.commentsCount || 0}{" "}
          Comment
        </button>
        <button
          className={cx("ghost-button")}
          type="button"
          onClick={(event) => { event.stopPropagation(); onShare(post); }}
        >
          <IosShareIcon fontSize="small" /> {post.sharesCount || 0} Share
        </button>
      </div>

      {showComments && (
        <div className={cx("comments-panel")} onClick={(event) => event.stopPropagation()}>
          <div className={cx("comment-list")}>
            {(post.comments || []).map((comment) => (
              <div className={cx("comment-item")} key={comment._id}>
                <span className={cx("comment-author")}>
                  {comment.userName || "User"}
                </span>
                <p className={cx("comment-text")}>{comment.text}</p>
              </div>
            ))}
          </div>
          <form className={cx("comment-form")} onSubmit={submitComment}>
            <input
              className={cx("comment-input")}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={500}
              placeholder="Write a comment"
            />
            <button className={cx("secondary-button")} type="submit">
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

function PostDetailModal({ post, onClose, onLike, onShare, onComment }) {
  const [commentText, setCommentText] = useState("");
  const offerText = formatOfferText(post);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const submitComment = (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    onComment(post._id, commentText).then(() => setCommentText(""));
  };

  return (
    <div className={cx("detail-backdrop")} role="presentation" onMouseDown={onClose}>
      <section className={cx("detail-modal")} role="dialog" aria-modal="true" aria-labelledby="spotlight-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className={cx("detail-close")} type="button" onClick={onClose} aria-label="Close Spotlight details"><CloseIcon /></button>
        <div className={cx("detail-media")}>
          {post.mediaItems?.length ? (
            <div className={cx("detail-media-grid", `detail-media-${Math.min(post.mediaItems.length, 4)}`)}>
              {post.mediaItems.map((item) => <FeedMediaItem key={item.mediaKey} item={item} post={post} />)}
            </div>
          ) : <div className={cx("detail-media-empty")}><span>{(post.businessName || "M").charAt(0)}</span><p>Local business update</p></div>}
        </div>
        <div className={cx("detail-content")}>
          <header className={cx("detail-business")}>
            <div className={cx("business-avatar")}>{(post.businessName || "M").charAt(0).toUpperCase()}</div>
            <div><strong>{post.businessName || "MassClick Business"}</strong><span>{[post.businessCategory, post.businessLocation].filter(Boolean).join(" · ") || "Local business"}</span></div>
            <span className={cx("post-type-badge", `post-type-${getPostTypeClass(post)}`)}>{getPostKind(post)}</span>
          </header>
          <div className={cx("detail-scroll")}>
            {offerText && <div className={cx("detail-offer")}><LocalOfferIcon fontSize="small" /><div><span>Offer validity</span><strong>{offerText.replace("Offer: ", "")}</strong></div></div>}
            <div className={cx("detail-copy")}>
              <h2 id="spotlight-detail-title">{post.title || "Business update"}</h2>
              {post.text && <p>{post.text}</p>}
              <small>Published {formatDate(post.createdAt)}</small>
            </div>
            {!!post.callToActions?.length && <div className={cx("detail-cta-row")}>{post.callToActions.map((item) => <a href={getActionHref(item)} target={item.action === "call" ? undefined : "_blank"} rel="noreferrer" key={item.action}>{item.label}</a>)}</div>}
            <div className={cx("detail-comments")}>
              <div className={cx("detail-section-title")}><h3>Comments</h3><span>{post.commentsCount || 0}</span></div>
              {(post.comments || []).length ? (post.comments || []).map((comment) => (
                <div className={cx("detail-comment")} key={comment._id}><span>{(comment.userName || "U").charAt(0)}</span><div><strong>{comment.userName || "User"}</strong><p>{comment.text}</p></div></div>
              )) : <p className={cx("detail-no-comments")}>No comments yet. Start the conversation.</p>}
            </div>
          </div>
          <div className={cx("detail-actions")}>
            <button type="button" className={cx(post.likedByMe && "detail-liked")} onClick={() => onLike(post._id)}>{post.likedByMe ? <FavoriteIcon /> : <FavoriteBorderIcon />}<span>{post.likesCount || 0} Likes</span></button>
            <button type="button" onClick={() => onShare(post)}><IosShareIcon /><span>{post.sharesCount || 0} Shares</span></button>
          </div>
          <form className={cx("detail-comment-form")} onSubmit={submitComment}>
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={500} placeholder="Write a comment..." aria-label="Write a comment" />
            <button type="submit" disabled={!commentText.trim()}>Post</button>
          </form>
        </div>
      </section>
    </div>
  );
}

function LiveDataModal({ view, posts, businesses, onClose, onOpenPost, onFilter }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const visiblePosts = view.posts || posts;
  return (
    <div className={cx("data-backdrop")} role="presentation" onMouseDown={onClose}>
      <section className={cx("data-modal")} role="dialog" aria-modal="true" aria-labelledby="live-data-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={cx("data-modal-header")}>
          <div><span>Live Spotlight data</span><h2 id="live-data-title">{view.title}</h2><p>{view.description}</p></div>
          <button type="button" onClick={onClose} aria-label="Close live data"><CloseIcon /></button>
        </header>
        <div className={cx("data-modal-summary")}><strong>{view.value}</strong><span>{view.label || view.title}</span></div>
        <div className={cx("data-modal-list")}>
          {view.kind === "businesses" ? businesses.map((business) => (
            <button type="button" key={business.key} onClick={() => { onFilter("business", business.name); onClose(); }}>
              <span className={cx("data-avatar")}>{business.name.charAt(0).toUpperCase()}</span><span><strong>{business.name}</strong><small>{[business.category, business.location].filter(Boolean).join(" · ")}</small></span>
            </button>
          )) : visiblePosts.length ? visiblePosts.map((post) => (
            <button type="button" key={post._id} onClick={() => { onClose(); onOpenPost(post._id); }}>
              <span className={cx("data-avatar")}>{(post.businessName || "M").charAt(0).toUpperCase()}</span><span><strong>{post.title || post.businessName || "Spotlight update"}</strong><small>{post.businessName} · {formatDate(post.createdAt)}</small></span><b>{view.postValue ? view.postValue(post) : getPostKind(post)}</b>
            </button>
          )) : <div className={cx("data-empty")}><strong>No matching records yet</strong><p>This value is calculated from the live Spotlight posts returned by the database.</p></div>}
        </div>
      </section>
    </div>
  );
}

export default function MassclickFeedPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    posts = [],
    loading,
    error,
  } = useSelector((state) => state.massclickFeed || {});
  const [formData, setFormData] = useState(initialFormData);
  const [selectedImageNames, setSelectedImageNames] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [localError, setLocalError] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [visiblePostCount, setVisiblePostCount] = useState(4);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showAllBusinesses, setShowAllBusinesses] = useState(false);
  const [activeCommandTab, setActiveCommandTab] = useState("Feed");
  const [dataView, setDataView] = useState(null);
  const [businessFilter, setBusinessFilter] = useState("");
  const [suggestedBusinesses, setSuggestedBusinesses] = useState([]);
  const [businessPage, setBusinessPage] = useState(1);
  const [businessTotal, setBusinessTotal] = useState(0);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessHasMore, setBusinessHasMore] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const businessRequestRef = useRef(0);
  const feedSectionRef = useRef(null);
  const toolsSectionRef = useRef(null);
  const assistantSectionRef = useRef(null);
  const analyticsSectionRef = useRef(null);
  const calendarSectionRef = useRef(null);
  const postsCarouselRef = useRef(null);
  const currentUser = getStoredUser();
  const canPost = canCreateFeedPost(currentUser);
  const offerCount = posts.filter(
    (post) => post.offerStartsAt || post.offerEndsAt,
  ).length;
  const photoCount = posts.filter((post) => post.mediaItems?.length).length;
  const totalComments = posts.reduce(
    (sum, post) => sum + (post.commentsCount || 0),
    0,
  );
  const totalShares = posts.reduce(
    (sum, post) => sum + (post.sharesCount || 0),
    0,
  );
  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.likesCount || 0),
    0,
  );
  const totalViews = posts.reduce(
    (sum, post) => sum + (post.viewsCount || post.viewCount || post.views || 0),
    0,
  );
  const totalLeads = posts.reduce(
    (sum, post) => sum + (post.leadsCount || post.leadCount || 0),
    0,
  );
  const postRatings = posts
    .map((post) => Number(post.averageRating || post.rating || 0))
    .filter((rating) => rating > 0);
  const averageRating = postRatings.length
    ? postRatings.reduce((sum, rating) => sum + rating, 0) / postRatings.length
    : 0;
  const totalEngagements = totalLikes + totalComments + totalShares;
  const topPost = [...posts].sort((a, b) => ((b.likesCount || b.likes?.length || 0) + (b.comments?.length || 0) + (b.sharesCount || 0)) - ((a.likesCount || a.likes?.length || 0) + (a.comments?.length || 0) + (a.sharesCount || 0)))[0] || null;
  const categoryCounts = posts.reduce((acc, post) => {
    const category = post.businessCategory || "Local update";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const featuredBusinesses = Array.from(
    posts.reduce((businesses, post) => {
      const name = post.businessName?.trim();
      if (!name) return businesses;
      const key = String(post.businessId || name).toLowerCase();
      if (!businesses.has(key)) {
        businesses.set(key, {
          key,
          name,
          category: post.businessCategory || "Local business",
          location: post.businessLocation || "",
          image:
            post.businessLogoUrl ||
            post.businessLogo ||
            post.profileImage ||
            post.businessImage ||
            post.mediaItems?.[0]?.mediaUrl ||
            "",
        });
      }
      return businesses;
    }, new Map()).values(),
  );
  const filteredPosts = posts.filter((post) => post.postType !== "story" && matchesFeedFilter(post, activeFilter) && (!businessFilter || post.businessName === businessFilter));
  const selectedPost = posts.find((post) => post._id === selectedPostId) || null;

  const openDataView = (title, value, description, options = {}) => setDataView({ title, value, description, ...options });
  const applyDataFilter = (type, value) => {
    if (type === "category") {
      setBusinessFilter("");
      const matchingType = Object.keys(FILTER_POST_TYPES).find((label) => FILTER_POST_TYPES[label] === String(value).toLowerCase());
      setActiveFilter(matchingType || "All");
    } else {
      setBusinessFilter(value);
      setActiveFilter("All");
    }
    feedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    dispatch(getMassclickFeedPosts());
    setBusinessLoading(true);
    dispatch(getMassclickFeedBusinesses({ page: 1, limit: 10 })).then((result) => { setSuggestedBusinesses(result.data || []); setBusinessPage(1); setBusinessTotal(result.total || 0); setBusinessHasMore(Boolean(result.hasMore)); }).catch(() => { setSuggestedBusinesses([]); setBusinessTotal(0); setBusinessHasMore(false); }).finally(() => setBusinessLoading(false));
  }, [dispatch]);

  const loadBusinessPage = async (page, search = businessQuery) => {
    if (page < 1) return;
    const requestId = ++businessRequestRef.current;
    setBusinessLoading(true);
    try {
      const result = await dispatch(getMassclickFeedBusinesses({ page, limit: 10, search }));
      if (requestId !== businessRequestRef.current) return;
      setSuggestedBusinesses(result.data || []);
      setBusinessPage(page);
      setBusinessTotal(result.total || 0);
      setBusinessHasMore(Boolean(result.hasMore));
    } catch { if (requestId === businessRequestRef.current) { setSuggestedBusinesses([]); setBusinessTotal(0); setBusinessHasMore(false); } }
    finally { if (requestId === businessRequestRef.current) setBusinessLoading(false); }
  };

  const searchBusinesses = (search) => { setBusinessQuery(search); loadBusinessPage(1, search); };

  const toggleFollow = async (businessId, isFollowing) => {
    const result = await dispatch(setMassclickFeedFollow(businessId, !isFollowing));
    setSuggestedBusinesses((items) => items.map((business) => String(business.businessId) === String(businessId) ? { ...business, isFollowing: result.isFollowing, followersCount: result.followersCount } : business));
    return result;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError("");
  };

  const handleImagesChange = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 4);
    if (!files.length) return;

    const invalidFile = files.find((file) => file.size > MAX_IMAGE_SIZE);
    if (invalidFile) {
      setLocalError("Each image must be 5 MB or smaller");
      return;
    }

    const mediaFiles = await Promise.all(
      files.map(async (file) => ({
        mediaFile: await readFileAsDataUrl(file),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })),
    );

    setFormData((prev) => ({ ...prev, mediaFiles }));
    setSelectedImageNames(files.map((file) => file.name));
    setImagePreviews(
      mediaFiles.map((file) => ({
        src: file.mediaFile,
        name: file.fileName,
      })),
    );
    setLocalError("");
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedImageNames((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index),
    );
    setImagePreviews((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index),
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !formData.title.trim() &&
      !formData.text.trim() &&
      !formData.mediaFiles.length
    ) {
      setLocalError("Add offer text, title, or image");
      return;
    }

    dispatch(createMassclickFeedPost(formData)).then(() => {
      setFormData(initialFormData);
      setSelectedImageNames([]);
      setImagePreviews([]);
      setIsComposerOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const openComposer = () => {
    setLocalError("");
    if (!canPost) {
      setLocalError(
        "Only business people or paid business accounts can create feed posts.",
      );
      return;
    }
    navigate("/user_spotlight/create");
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setLocalError("");
  };

  const moveToSection = (name) => {
    setActiveCommandTab(name);
    const route = { "Spotlight Feed": "/user_feed", "Planner Overview": "/user_spotlight/calendar", Planner: "/user_spotlight/calendar", "My Posts": "/user_spotlight/posts", Media: "/user_spotlight/media", "Media Library": "/user_spotlight/media", Settings: "/user_spotlight/settings" }[name];
    if (route) {
      navigate(route);
      return;
    }
    const target = {
      Feed: feedSectionRef,
      Planner: calendarSectionRef,
      Campaigns: toolsSectionRef,
      Performance: analyticsSectionRef,
      Leads: assistantSectionRef,
      Audience: analyticsSectionRef,
      Insights: analyticsSectionRef,
      "My Posts": feedSectionRef,
      Calendar: calendarSectionRef,
      Media: toolsSectionRef,
      Reports: analyticsSectionRef,
    }[name];
    target?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runTool = (title) => {
    const route = { "Post Scheduler": "/user_spotlight/calendar", "Media Library": "/user_spotlight/media" }[title];
    if (route) navigate(route); else openComposer();
  };

  const scrollPosts = (direction) => {
    const carousel = postsCarouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector("article");
    const distance = (firstCard?.getBoundingClientRect().width || 320) + 14;
    carousel.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  const handleComposerKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      handleSubmit(event);
    }
  };

  const handleShare = (post) => {
    dispatch(shareMassclickFeedPost(post._id));
    const shareUrl = `${window.location.origin}/user_feed`;
    const shareText =
      [post.title, post.text].filter(Boolean).join("\n\n") ||
      "MassClick local update";
    if (navigator.share) {
      navigator
        .share({
          title: post.title || post.businessName,
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`);
  };

  return <SpotlightReplica
    posts={posts}
    currentUser={currentUser}
    canStory={Boolean(currentUser?._id || currentUser?.id || currentUser?.userId || currentUser?.subjectId)}
    businesses={suggestedBusinesses}
    businessPage={businessPage}
    businessTotal={businessTotal}
    businessHasMore={businessHasMore}
    businessLoading={businessLoading}
    loadBusinessPage={loadBusinessPage}
    searchBusinesses={searchBusinesses}
    filteredPosts={filteredPosts}
    activeFilter={activeFilter}
    setActiveFilter={(filter) => { setActiveFilter(filter); setBusinessFilter(""); }}
    openComposer={openComposer}
    moveToSection={moveToSection}
    totalViews={totalViews}
    totalEngagements={totalEngagements}
    totalLeads={totalLeads}
    handleLike={(postId) => dispatch(toggleMassclickFeedLike(postId))}
    handleShare={handleShare}
    handleComment={(postId, text) => dispatch(addMassclickFeedComment(postId, text))}
    handleSave={(postId) => dispatch(toggleMassclickFeedSave(postId))}
    handleEnquire={(postId) => dispatch(recordMassclickFeedEnquiry(postId))}
    handleFollow={(businessId, isFollowing) => toggleFollow(businessId, isFollowing)}
    openPost={(post) => { dispatch(recordMassclickFeedView(post._id)); setSelectedPostId(post._id); }}
    createStory={(payload) => dispatch(createMassclickFeedPost(payload))}
    editStory={(postId,payload) => dispatch(updateMassclickFeedStory(postId,payload))}
    removeStory={(postId) => dispatch(deleteMassclickFeedStory(postId))}
  />;

  // eslint-disable-next-line no-unreachable
  if (false) return (
    <>
      <StickySearchBar />
      <main className={cx("feed-page")}>
        <aside className={cx("command-rail")} aria-label="Spotlight command navigation">
          <button className={cx("command-rail-active")} type="button"><i>✦</i><span>Spotlight</span></button>
          {[["⌂","Spotlight Feed"],["⊕","Create"],["□","Planner Overview"],["▣","My Posts"],["▧","Media Library"],["⚙","Settings"]].map(([icon,label]) => <button type="button" key={label} onClick={label === "Create" ? openComposer : () => moveToSection(label)}><i>{icon}</i><span>{label}</span></button>)}
          <span className={cx("command-rail-spacer")} />
          <Link to="/user_dashboard"><i>⚙</i><span>Settings</span></Link><Link to="/user-customer-service"><i>?</i><span>Help</span></Link>
        </aside>
        <div className={cx("feed-topbar")}>
          <div className={cx("spotlight-heading")}>
            <span className={cx("spotlight-mark")}>✦</span>
            <div>
              <h1>Spotlight Feed</h1>
              <p>Promote your business, offers, updates and connect with local customers.</p>
            </div>
          </div>
          <nav className={cx("command-tabs")} aria-label="Command center sections">
            {['Feed','Planner Overview','My Posts','Media Library','Settings'].map((tab) => <button type="button" onClick={() => moveToSection(tab)} className={activeCommandTab === tab ? cx("command-tab-active") : undefined} key={tab}>{tab}</button>)}
          </nav>
          <button className={cx("command-date")} type="button">{new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date())} · Calendar</button>
        </div>
        
        <div className={cx("feed-shell")}>
          <aside className={cx("left-rail")} aria-label="Feed discovery">
            <section className={cx("rail-panel rail-panel-dark side-menu-panel")}>
              <div className={cx("side-brand")}><strong>MassCli<span>ck</span></strong><small>India&apos;s Local Search Engine</small></div>
              <nav className={cx("spot-nav")}>
                {spotlightNavigation.map(([icon, label]) => (
                  <Link key={label} to={spotlightRoutes[label] || "/"}
                    className={cx("spot-nav-item", label === "Spotlight" && "spot-nav-active")}>
                    <span>{icon}</span>{label}
                  </Link>
                ))}
              </nav>
              <div className={cx("visibility-card")}><strong>Boost Your Visibility</strong><p>Reach more customers and grow your business faster.</p><button type="button">Upgrade Now</button></div>
            </section>

            <section className={cx("rail-panel")}>
              <div className={cx("rail-heading")}>
                <TrendingUpIcon fontSize="small" />
                <h2 className={cx("rail-heading-title")}>Community Pulse</h2>
              </div>
              <div className={cx("metric-grid")}>
                <div className={cx("metric-card")}>
                  <strong className={cx("metric-value")}>
                    {formatCompactNumber(posts.length)}
                  </strong>
                  <span className={cx("metric-label")}>Active Posts</span>
                </div>
                <div className={cx("metric-card")}>
                  <strong className={cx("metric-value")}>
                    {formatCompactNumber(offerCount)}
                  </strong>
                  <span className={cx("metric-label")}>Live Offers</span>
                </div>
                <div className={cx("metric-card")}>
                  <strong className={cx("metric-value")}>
                    {formatCompactNumber(photoCount)}
                  </strong>
                  <span className={cx("metric-label")}>Visual Posts</span>
                </div>
                <div className={cx("metric-card")}>
                  <strong className={cx("metric-value")}>
                    {formatCompactNumber(totalComments + totalShares)}
                  </strong>
                  <span className={cx("metric-label")}>Engagements</span>
                </div>
              </div>
            </section>

            <section className={cx("rail-panel")}>
              <div className={cx("rail-heading")}>
                <TrendingUpIcon fontSize="small" />
                <h2 className={cx("rail-heading-title")}>
                  Trending Categories
                </h2>
              </div>
              <div className={cx("category-list")}>
                {topCategories.length ? (
                  topCategories.map(([category, count]) => (
                    <button type="button" className={cx("category-item")} key={category} onClick={() => applyDataFilter("category", category)}>
                      <span>{category}</span>
                      <strong className={cx("category-count")}>{count}</strong>
                    </button>
                  ))
                ) : (
                  <p className={cx("rail-muted")}>
                    Categories will appear after businesses start posting.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <div className={cx("feed-column")}>
            <section className={cx("feed-hero")}>
              <div className={cx("hero-copy")}>
                <span className={cx("feed-kicker")}>
                  Your local business network
                </span>
                <h1 className={cx("feed-title")}>Make local discovery feel alive.</h1>
                <p className={cx("feed-subtitle")}>
                  Real-time offers, announcements, and updates from nearby
                  businesses. Discover what&apos;s happening in your community right
                  now.
                </p>
                <div className={cx("hero-tags")}>
                  <span className={cx("hero-tag")}><LocalOfferIcon /> Offers</span>
                  <span className={cx("hero-tag")}><ImageIcon /> Photos</span>
                  <span className={cx("hero-tag")}><EventAvailableIcon /> Events</span>
                  <span className={cx("hero-tag")}><CampaignIcon /> Announcements</span>
                </div>
              </div>
              <div className={cx("hero-action-card")}>
                <span className={cx("hero-action-label")}>Business owner?</span>
                <strong className={cx("hero-action-title")}>
                  Share an update your customers will act on.
                </strong>
                <button
                  className={cx("post-button")}
                  type="button"
                  onClick={openComposer}
                >
                  <AddIcon fontSize="small" />
                  Create Post
                </button>
              </div>
            </section>

            {localError && !isComposerOpen && (
              <div className={cx("notice-card")}>{localError}</div>
            )}

            {isComposerOpen && (
              <div
                className={cx("modal-backdrop")}
                role="presentation"
                onMouseDown={closeComposer}
              >
                <section
                  className={cx("composer-modal")}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="feed-post-title"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className={cx("modal-header")}>
                    <div>
                      <span className={cx("feed-kicker")}>Create post</span>
                      <h2 id="feed-post-title" className={cx("modal-title")}>
                        Share a business update
                      </h2>
                    </div>
                    <button
                      className={cx("icon-button")}
                      type="button"
                      onClick={closeComposer}
                      aria-label="Close post form"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>

                  <form
                    className={cx("composer-form")}
                    onSubmit={handleSubmit}
                    onKeyDown={handleComposerKeyDown}
                  >
                    <div className={cx("composer-author")}>
                      <div className={cx("business-avatar")}>
                        {(
                          currentUser.businessName ||
                          currentUser.userName ||
                          "M"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <strong className={cx("composer-author-name")}>
                          {currentUser.businessName ||
                            currentUser.userName ||
                            "Your business"}
                        </strong>
                        <span className={cx("composer-author-note")}>
                          Post text, offers, photos, or mixed updates
                        </span>
                      </div>
                    </div>

                    <div className={cx("form-field")}>
                      <label className={cx("form-label")}>
                        What do you want to share?
                      </label>
                      <textarea
                        className={cx("composer-textarea")}
                        name="text"
                        value={formData.text}
                        onChange={handleChange}
                        maxLength={1200}
                        placeholder="Write a text update, offer, announcement, menu special, service note, hiring update, event, or anything your customers should know..."
                        autoFocus
                      />
                      <span className={cx("keyboard-hint")}>
                        Press Ctrl + Enter to post. Images are optional.
                      </span>
                    </div>

                    <div className={cx("composer-row")}>
                      <div className={cx("form-field")}>
                        <label className={cx("form-label")}>
                          <NotesIcon fontSize="small" />
                          Optional headline
                        </label>
                        <input
                          className={cx("form-input")}
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          maxLength={120}
                          placeholder="Example: Today only family combo"
                        />
                      </div>
                      <div className={cx("form-field")}>
                        <label className={cx("form-label")}>
                          <LocalOfferIcon fontSize="small" />
                          Offer validity
                        </label>
                        <div className={cx("date-row")}>
                          <input
                            className={cx("form-input")}
                            type="date"
                            name="offerStartsAt"
                            value={formData.offerStartsAt}
                            onChange={handleChange}
                          />
                          <input
                            className={cx("form-input")}
                            type="date"
                            name="offerEndsAt"
                            value={formData.offerEndsAt}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>

                    {imagePreviews.length > 0 && (
                      <div className={cx("preview-grid")}>
                        {imagePreviews.map((image, index) => (
                          <div className={cx("preview-tile")} key={image.name}>
                            <img
                              className={cx("preview-image")}
                              src={image.src}
                              alt={image.name}
                            />
                            <button
                              type="button"
                              className={cx("preview-remove")}
                              onClick={() => removeImage(index)}
                              aria-label="Remove image"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={cx("media-picker")}>
                      <span className={cx("media-names")}>
                        {selectedImageNames.length
                          ? `${selectedImageNames.length} image(s) selected`
                          : "Photo is optional. Text-only posts are allowed."}
                      </span>
                      <button
                        className={cx("secondary-button")}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon fontSize="small" /> Add Photos
                      </button>
                      <input
                        ref={fileInputRef}
                        hidden
                        multiple
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImagesChange}
                      />
                    </div>
                    {(localError || error?.message) && (
                      <span className={cx("error-text")}>
                        {localError || error.message}
                      </span>
                    )}
                    <div className={cx("modal-actions")}>
                      <button
                        className={cx("ghost-button")}
                        type="button"
                        onClick={closeComposer}
                      >
                        Cancel
                      </button>
                      <button
                        className={cx("primary-button")}
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            <section className={cx("feed-toolbar")}>
              <div>
                <span className={cx("toolbar-label")}>Community feed</span>
                <h2 className={cx("toolbar-title")}>Latest verified updates</h2>
              </div>
              <div className={cx("toolbar-filters")}>
                <span className={cx("toolbar-count")}>{posts.length} posts</span>
                {offerCount > 0 && (
                  <span
                    className={cx("post-type-badge", "post-type-offer")}
                    title={`${offerCount} offer${offerCount !== 1 ? "s" : ""}`}
                  >
                    <LocalOfferIcon fontSize="small" /> {offerCount} Offer
                    {offerCount !== 1 ? "s" : ""}
                  </span>
                )}
                {photoCount > 0 && (
                  <span
                    className={cx("post-type-badge", "post-type-announcement")}
                    title={`${photoCount} post${photoCount !== 1 ? "s" : ""} with photos`}
                  >
                    <ImageIcon fontSize="small" /> {photoCount} Photo
                    {photoCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className={cx("category-tabs")} role="tablist" aria-label="Spotlight filters">
                {["All", "Offers", "Updates", "Events", "Products", "Services", "Jobs", "Announcements", "Videos", "Polls"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === filter}
                    className={cx("category-tab", activeFilter === filter && "category-tab-active")}
                    onClick={() => { setActiveFilter(filter); setBusinessFilter(""); }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </section>

            <section className={cx("reference-kpis")} aria-label="Spotlight performance overview">
              {[
                ["eye", formatCompactNumber(totalViews), "Views"],
                ["heart", formatCompactNumber(totalEngagements), "Engagements"],
                ["users", formatCompactNumber(totalLeads), "Leads Generated"],
                ["post", posts.length.toLocaleString(), "Posts Published"],
              ].map(([icon, value, label]) => (
                <button className={cx("reference-kpi-card")} type="button" key={label} onClick={() => openDataView(label, value, `Calculated from ${posts.length} live Spotlight post${posts.length === 1 ? "" : "s"}.`, {
                  postValue: label === "Views" ? (post) => `${post.viewsCount || post.viewCount || post.views || 0} views` : label === "Engagements" ? (post) => `${(post.likesCount || 0) + (post.commentsCount || 0) + (post.sharesCount || 0)} engagements` : label === "Leads Generated" ? (post) => `${post.leadsCount || post.leadCount || 0} leads` : undefined,
                })}>
                  <i className={cx(`reference-kpi-${icon}`)}>{icon === "eye" ? "◉" : icon === "heart" ? "♡" : icon === "users" ? "♙" : "▤"}</i>
                  <div><strong>{value}</strong><span>{label}</span></div>
                </button>
              ))}
              {topPost && <button type="button" className={cx("reference-top-performer")} onClick={() => setSelectedPostId(topPost._id)}>
                <span className={cx("performer-art")}>MC</span>
                <div><small>Top Performer</small><strong>{topPost.title || topPost.businessName}</strong><b>{(topPost.likesCount || topPost.likes?.length || 0) + (topPost.comments?.length || 0) + (topPost.sharesCount || 0)} engagements</b></div>
                <i>☆</i>
              </button>}
            </section>

            <section className={cx("reference-posts-panel")} ref={feedSectionRef}>
              <div className={cx("section-line")}><h2>{businessFilter ? `${businessFilter} posts` : "Spotlight Posts"}</h2><div className={cx("carousel-heading-actions")}>{businessFilter && <button type="button" onClick={() => setBusinessFilter("")}>Clear business filter</button>}<span>{filteredPosts.length} posts</span><button type="button" onClick={() => scrollPosts(-1)} aria-label="Show previous Spotlight post">‹</button><button type="button" onClick={() => scrollPosts(1)} aria-label="Show next Spotlight post">›</button></div></div>
              <div className={cx("feed-list")} ref={postsCarouselRef}>
                {filteredPosts.length ? (
                  filteredPosts.map((post) => (
                  <FeedPost
                    key={post._id}
                    post={post}
                    onLike={(postId) =>
                      dispatch(toggleMassclickFeedLike(postId))
                    }
                    onShare={handleShare}
                    onComment={(postId, text) =>
                      dispatch(addMassclickFeedComment(postId, text))
                    }
                    onOpen={(post) => setSelectedPostId(post._id)}
                    isFollowing={post.isFollowing}
                    onFollow={() => toggleFollow(post.businessId, post.isFollowing)}
                  />
                  ))
                ) : (
                  <div className={cx("empty-card")}>No feed posts yet.</div>
                )}
              </div>
            </section>

            {visiblePostCount < filteredPosts.length && (
              <button className={cx("view-more")} type="button" onClick={() => setVisiblePostCount((count) => count + 4)}>
                View More Posts <span>⌄</span>
              </button>
            )}
            <section className={cx("tools-panel")} ref={toolsSectionRef}>
              <h2>Spotlight Tools</h2>
              <div className={cx("tools-grid")}>{spotlightTools.map(([icon, title, text]) => <button type="button" key={title} className={cx("tool-item")} onClick={() => runTool(title)}><i>{icon}</i><strong>{title}</strong><small>{text}</small></button>)}</div>
            </section>
            <section className={cx("ai-assistant")} ref={assistantSectionRef}>
              <div className={cx("assistant-intro")}><i>✦</i><span><strong>AI Spotlight Assistant</strong><small>Get smart suggestions to grow your business</small></span><button type="button" onClick={openComposer}>▣ Show Me Opportunities</button></div>
              {topCategories.map(([category, count]) => <div className={cx("assistant-tip")} key={category}><i>⌘</i><span><small>Active category</small><strong>{category}: {count} post{count === 1 ? "" : "s"}</strong><button type="button" onClick={() => moveToSection("Feed")}>View posts →</button></span></div>)}
            </section>
            <section className={cx("featured-panel")}>
              <div className={cx("section-line")}><h2>Featured Businesses</h2>{featuredBusinesses.length > 7 && <button type="button" onClick={() => setShowAllBusinesses((value) => !value)}>{showAllBusinesses ? "Show Less" : "View All"}</button>}</div>
              <div className={cx("featured-row")}>
                {featuredBusinesses.length ? (showAllBusinesses ? featuredBusinesses : featuredBusinesses.slice(0, 7)).map((business) => <button type="button" className={cx("featured-business")} key={business.key} onClick={() => applyDataFilter("business", business.name)}>{business.image ? <img src={business.image} alt="" loading="lazy" /> : <span>{business.name.charAt(0).toUpperCase()}</span>}<strong title={business.name}>{business.name}</strong><small>{business.category}{business.location ? ` · ${business.location}` : ""}</small></button>) : <p className={cx("featured-empty")}>Featured businesses will appear when businesses publish Spotlight posts.</p>}
              </div>
            </section>
            <section className={cx("bottom-metrics")}>
              {[[featuredBusinesses.length.toLocaleString(),"Active Businesses"],[posts.length.toLocaleString(),"Spotlight Posts"],[totalEngagements.toLocaleString(),"Total Engagements"],[totalViews.toLocaleString(),"Total Views"],[totalLeads.toLocaleString(),"Leads Generated"],[averageRating ? `${averageRating.toFixed(1)}/5` : "—","Avg. Post Rating"]].map(([value,label]) => <button type="button" key={label} onClick={() => openDataView(label, value, "This total uses only records returned by the live Spotlight API.", { kind: label === "Active Businesses" ? "businesses" : "posts" })}><strong>{value}</strong><span>{label}</span></button>)}
            </section>
          </div>

          <aside className={cx("right-rail")} aria-label="Posting guidance">
            <section className={cx("rail-panel create-panel")}>
              <h2>Create Spotlight Post</h2>
              <div className={cx("create-grid")}>{createTypes.map(([icon,label]) => <button type="button" key={label} onClick={openComposer}><i>{icon}</i><span>{label}</span></button>)}</div>
            </section>
            <section className={cx("analytics-panel")} ref={analyticsSectionRef}>
              <div className={cx("analytics-title")}><h2>Spotlight Analytics</h2><span>Live data</span></div>
              <div className={cx("analytics-grid")}>{[[formatCompactNumber(totalViews),"Views"],[formatCompactNumber(totalEngagements),"Engagements"],[posts.length.toLocaleString(),"Posts"],[formatCompactNumber(totalLeads),"Leads Generated"]].map(([value,label]) => <button type="button" key={label} onClick={() => openDataView(label, value, "Live total calculated from the currently loaded database records.")}><i>◉</i><strong>{value}</strong><span>{label}</span></button>)}</div>
              <button type="button" onClick={() => moveToSection("Insights")}>View Detailed Insights →</button>
            </section>
            <section className={cx("audience-panel")}>
              <h2>Category Insights</h2><h3>Categories represented in the live feed</h3>
              <div className={cx("audience-locations")}><ul>{topCategories.map(([name,value]) => <li key={name}><button type="button" onClick={() => applyDataFilter("category", name)}><i />{name}<b>{value}</b></button></li>)}</ul></div>
            </section>
            <section className={cx("rail-calendar")} ref={calendarSectionRef}>
              <div className={cx("section-line")}><h2>Content Calendar</h2><button type="button" onClick={() => moveToSection("Planner")}>View Calendar</button></div>
              <div className={cx("rail-calendar-days")}>{posts.slice(0,7).map((post) => { const date = new Date(post.createdAt); return <button type="button" key={post._id} onClick={() => setSelectedPostId(post._id)}><small>{date.toLocaleDateString(undefined,{weekday:"short"})}</small><strong>{date.getDate()}</strong><span>{post.title || getPostKind(post)}</span></button>; })}</div>
            </section>
            <section className={cx("recent-activity")}><div className={cx("section-line")}><h2>Recent Posts</h2><button type="button" onClick={() => moveToSection("Feed")}>View All</button></div><div>{posts.slice(0,3).map((post) => <button type="button" key={post._id} onClick={() => setSelectedPostId(post._id)}><i>●</i><b>{post.title || post.businessName || "Spotlight post"}</b><small>{formatDate(post.createdAt)}</small></button>)}</div></section>
            <section className={cx("rail-panel")}>
              <div className={cx("rail-heading")}>
                <TipsAndUpdatesIcon fontSize="small" />
                <h2 className={cx("rail-heading-title")}>Post Ideas</h2>
              </div>
              <div className={cx("prompt-list")}>
                {postPrompts.map((prompt) => (
                  <button
                    className={cx("prompt-chip")}
                    type="button"
                    onClick={openComposer}
                    key={prompt}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className={cx("rail-panel")}>  
              <div className={cx("rail-heading")}>
                <EventAvailableIcon fontSize="small" />
                <h2 className={cx("rail-heading-title")}>Best Feed Concepts</h2>
              </div>
              <div className={cx("playbook-list")}>
                {playbookItems.map(({ icon: Icon, title, text }) => (
                  <div className={cx("playbook-item")} key={title}>
                    <div className={cx("playbook-icon")}>
                      <Icon fontSize="small" />
                    </div>
                    <div>
                      <strong className={cx("playbook-title")}>{title}</strong>
                      <p className={cx("playbook-text")}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={cx("rail-panel rail-cta")}>
              <span className={cx("rail-eyebrow")}>Customer action</span>
              <h2 className={cx("rail-cta-title")}>
                Turn every feed post into a reason to visit, call, book, or buy.
              </h2>
              <button
                className={cx("secondary-button cta-button")}
                type="button"
                onClick={openComposer}
              >
                Plan a Post
              </button>
            </section>
          </aside>
        </div>
        <section className={cx("command-bottom-strip")}>
          {[["▣","Published Posts",posts.length],["♡","Likes",totalLikes],["□","Comments",totalComments],["↗","Shares",totalShares],["♙","Businesses",featuredBusinesses.length]].map(([icon,label,value]) => <div key={label}><i>{icon}</i><span><small>{label}</small><strong>{Number(value).toLocaleString()}</strong></span></div>)}
        </section>
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            onClose={() => setSelectedPostId(null)}
            onLike={(postId) => dispatch(toggleMassclickFeedLike(postId))}
            onShare={handleShare}
            onComment={(postId, text) => dispatch(addMassclickFeedComment(postId, text))}
          />
        )}
        {dataView && <LiveDataModal view={dataView} posts={posts} businesses={featuredBusinesses} onClose={() => setDataView(null)} onOpenPost={setSelectedPostId} onFilter={applyDataFilter} />}
      </main>
      <Footer />
    </>
  );
}
