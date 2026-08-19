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
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { isBusinessPeopleUser } from "../../../../utils/userUtils.js";
import {
  addMassclickFeedComment,
  createMassclickFeedPost,
  getMassclickFeedPosts,
  shareMassclickFeedPost,
  toggleMassclickFeedLike,
  setMassclickFeedFollow,
} from "../../../../redux/actions/massclickFeedAction.js";
import styles from "./MassclickFeedPage.module.css";

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
  const filteredPosts = posts.filter((post) => matchesFeedFilter(post, activeFilter) && (!businessFilter || post.businessName === businessFilter));
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
  }, [dispatch]);

  const toggleFollow = (businessId, isFollowing) => dispatch(setMassclickFeedFollow(businessId, !isFollowing));

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
    const route = { Planner: "/user_spotlight/calendar", Calendar: "/user_spotlight/calendar", Campaigns: "/user_spotlight/campaigns", Leads: "/user_spotlight/leads", Media: "/user_spotlight/media", Reports: "/user_spotlight/reports", Performance: "/user_spotlight/reports", Insights: "/user_spotlight/reports" }[name];
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
    const route = { "Post Scheduler": "/user_spotlight/calendar", "Media Library": "/user_spotlight/media", "Ad Boost": "/user_spotlight/campaigns", "Leads Inbox": "/user_spotlight/leads", "Post Reports": "/user_spotlight/reports" }[title];
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

  return (
    <>
      <StickySearchBar />
      <main className={cx("feed-page")}>
        <aside className={cx("command-rail")} aria-label="Spotlight command navigation">
          <button className={cx("command-rail-active")} type="button"><i>✦</i><span>Spotlight</span></button>
          {[["⊕","Create"],["▣","My Posts"],["□","Calendar"],["◁","Campaigns"],["♙","Leads"],["▧","Media"],["▥","Reports"]].map(([icon,label]) => <button type="button" key={label} onClick={label === "Create" ? openComposer : () => moveToSection(label)}><i>{icon}</i><span>{label}</span>{label === "Leads" && totalLeads > 0 && <b>{formatCompactNumber(totalLeads)}</b>}</button>)}
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
            {['Feed','Planner','Campaigns','Performance','Leads','Audience','Insights'].map((tab) => <button type="button" onClick={() => moveToSection(tab)} className={activeCommandTab === tab ? cx("command-tab-active") : undefined} key={tab}>{tab}</button>)}
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
