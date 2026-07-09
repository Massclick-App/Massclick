import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import ImageIcon from "@mui/icons-material/Image";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import NotesIcon from "@mui/icons-material/Notes";
import CampaignIcon from "@mui/icons-material/Campaign";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VerifiedIcon from "@mui/icons-material/Verified";
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

const formatCompactNumber = (value = 0) => {
  if (value > 999) return `${(value / 1000).toFixed(1)}k`;
  return value;
};

function FeedPost({ post, onLike, onShare, onComment }) {
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
    <article className={cx("post-card")}>
      <div className={cx("post-body")}>
        <div className={cx("post-header")}>
          <div className={cx("business-avatar")}>
            {(post.businessName || "M").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
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
        </div>

        {offerText && (
          <div
            className={cx("offer-badge")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "space-between",
            }}
          >
            <span>{offerText}</span>
            {isOfferExpiringSoon(post.offerEndsAt) && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(220, 38, 38, 0.15)",
                  color: "#dc2626",
                  fontSize: "0.7rem",
                  fontWeight: "800",
                }}
              >
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

        {imageCount > 0 && (
          <div
            className={cx(`image-grid image-grid-${Math.min(imageCount, 4)}`)}
          >
            {post.mediaItems.map((item, index) => (
              <img
                key={item.mediaKey}
                className={cx(
                  `post-image ${imageCount === 1 ? "post-image-single" : ""} ${imageCount === 3 && index === 0 ? "post-image-featured" : ""}`,
                )}
                src={item.mediaUrl}
                alt={item.fileName || post.title || "Feed post"}
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      <div className={cx("post-insight-row")}>
        <span className={cx("post-insight-pill")}>
          <VerifiedIcon fontSize="small" />
          Verified local update
        </span>
        {(post.likesCount || 0) +
          (post.commentsCount || 0) +
          (post.sharesCount || 0) >
        10 ? (
          <span className={cx("post-insight-pill")}>
            <TrendingUpIcon fontSize="small" />
            Trending
          </span>
        ) : null}
        <span className={cx("post-insight-pill")}>
          {(post.likesCount || 0) +
            (post.commentsCount || 0) +
            (post.sharesCount || 0)}{" "}
          {(post.likesCount || 0) +
            (post.commentsCount || 0) +
            (post.sharesCount || 0) ===
          1
            ? "action"
            : "actions"}
        </span>
      </div>

      <div className={cx("post-actions")}>
        <button
          className={cx(
            `ghost-button ${post.likedByMe ? "active-action" : ""}`,
          )}
          type="button"
          onClick={() => onLike(post._id)}
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
          onClick={() => setShowComments((value) => !value)}
        >
          <ChatBubbleOutlineIcon fontSize="small" /> {post.commentsCount || 0}{" "}
          Comment
        </button>
        <button
          className={cx("ghost-button")}
          type="button"
          onClick={() => onShare(post)}
        >
          <IosShareIcon fontSize="small" /> {post.sharesCount || 0} Share
        </button>
      </div>

      {showComments && (
        <div className={cx("comments-panel")}>
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

export default function MassclickFeedPage() {
  const dispatch = useDispatch();
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
  const categoryCounts = posts.reduce((acc, post) => {
    const category = post.businessCategory || "Local update";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  useEffect(() => {
    dispatch(getMassclickFeedPosts());
  }, [dispatch]);

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
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setLocalError("");
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
        <div className={cx("feed-topbar")}>
          <Link className={cx("dashboard-back-button")} to="/">
            <ArrowBackIcon fontSize="small" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className={cx("feed-shell")}>
          <aside className={cx("left-rail")} aria-label="Feed discovery">
            <section className={cx("rail-panel rail-panel-dark")}>
              <span className={cx("rail-eyebrow")}>✨ Real-time Updates</span>
              <h2 className={cx("rail-title")}>
                Never miss what your community is sharing.
              </h2>
              <p className={cx("rail-copy")}>
                Stay connected with time-sensitive offers, event announcements,
                new product launches, and authentic business stories from nearby
                shops and services.
              </p>
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
                    <div className={cx("category-item")} key={category}>
                      <span>{category}</span>
                      <strong className={cx("category-count")}>{count}</strong>
                    </div>
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
                <h1 className={cx("feed-title")}>Local Signal Board</h1>
                <p className={cx("feed-subtitle")}>
                  Real-time offers, announcements, and updates from nearby
                  businesses. Discover what's happening in your community right
                  now.
                </p>
                <div className={cx("hero-tags")}>
                  <span className={cx("hero-tag")}>🎯 Offers</span>
                  <span className={cx("hero-tag")}>📸 Photos</span>
                  <span className={cx("hero-tag")}>🎉 Events</span>
                  <span className={cx("hero-tag")}>📢 Announcements</span>
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
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
            </section>

            <section className={cx("feed-list")}>
              {posts.length ? (
                posts.map((post) => (
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
                  />
                ))
              ) : (
                <div className={cx("empty-card")}>No feed posts yet.</div>
              )}
            </section>
          </div>

          <aside className={cx("right-rail")} aria-label="Posting guidance">
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
      </main>
      <Footer />
    </>
  );
}
