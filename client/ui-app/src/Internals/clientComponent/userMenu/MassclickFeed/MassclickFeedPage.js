import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  return post.offerEndsAt ? `Offer until ${formatDate(post.offerEndsAt)}` : `Offer from ${formatDate(post.offerStartsAt)}`;
};

const getPostKind = (post = {}) => {
  if (post.mediaItems?.length && post.text?.trim()) return "Photo update";
  if (post.mediaItems?.length) return "Photo post";
  if (post.offerStartsAt || post.offerEndsAt) return "Offer";
  return "Text update";
};

const canCreateFeedPost = (user = {}) =>
  isBusinessPeopleUser(user) ||
  user.amountPaid === true ||
  user.paid === true ||
  user.subscription?.isActive === true ||
  user.paymentConcept?.paymentStatus === "paid";

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
          <div>
            <h2 className={cx("business-name")}>{post.businessName || "MassClick Business"}</h2>
            <p className={cx("post-meta")}>
              <span>{getPostKind(post)}</span>
              <span>{[post.businessCategory, post.businessLocation].filter(Boolean).join(" | ") || "Local business"}</span>
              <span>{formatDate(post.createdAt)}</span>
            </p>
          </div>
        </div>

        {offerText && <span className={cx("offer-badge")}>{offerText}</span>}
        {(post.title || post.text) && (
          <div className={cx(!imageCount ? "text-only-panel" : "post-copy")}>
            {post.title && <h3 className={cx("post-title")}>{post.title}</h3>}
            {post.text && <p className={cx("post-text")}>{post.text}</p>}
          </div>
        )}

        {imageCount > 0 && (
          <div className={cx(`image-grid image-grid-${Math.min(imageCount, 4)}`)}>
            {post.mediaItems.map((item) => (
              <img
                key={item.mediaKey}
                className={cx("post-image")}
                src={item.mediaUrl}
                alt={item.fileName || post.title || "Feed post"}
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      <div className={cx("post-actions")}>
        <button
          className={cx(`ghost-button ${post.likedByMe ? "active-action" : ""}`)}
          type="button"
          onClick={() => onLike(post._id)}
        >
          {post.likedByMe ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />} {post.likesCount || 0} Like
        </button>
        <button className={cx("ghost-button")} type="button" onClick={() => setShowComments((value) => !value)}>
          <ChatBubbleOutlineIcon fontSize="small" /> {post.commentsCount || 0} Comment
        </button>
        <button className={cx("ghost-button")} type="button" onClick={() => onShare(post)}>
          <IosShareIcon fontSize="small" /> {post.sharesCount || 0} Share
        </button>
      </div>

      {showComments && (
        <div className={cx("comments-panel")}>
          <div className={cx("comment-list")}>
            {(post.comments || []).map((comment) => (
              <div className={cx("comment-item")} key={comment._id}>
                <span className={cx("comment-author")}>{comment.userName || "User"}</span>
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
            <button className={cx("secondary-button")} type="submit">Send</button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function MassclickFeedPage() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { posts = [], loading, error } = useSelector((state) => state.massclickFeed || {});
  const [formData, setFormData] = useState(initialFormData);
  const [selectedImageNames, setSelectedImageNames] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [localError, setLocalError] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const currentUser = getStoredUser();
  const canPost = canCreateFeedPost(currentUser);

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
      }))
    );

    setFormData((prev) => ({ ...prev, mediaFiles }));
    setSelectedImageNames(files.map((file) => file.name));
    setImagePreviews(mediaFiles.map((file) => ({
      src: file.mediaFile,
      name: file.fileName,
    })));
    setLocalError("");
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedImageNames((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.title.trim() && !formData.text.trim() && !formData.mediaFiles.length) {
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
      setLocalError("Only business people or paid business accounts can create feed posts.");
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
    const shareText = [post.title, post.text].filter(Boolean).join("\n\n") || "MassClick local update";
    if (navigator.share) {
      navigator.share({
        title: post.title || post.businessName,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`);
  };

  return (
    <>
      <StickySearchBar />
      <main className={cx("feed-page")}>
        <section className={cx("feed-hero")}>
          <div>
            <span className={cx("feed-kicker")}>Local business updates</span>
            <h1 className={cx("feed-title")}>MassClick Feed</h1>
            <p className={cx("feed-subtitle")}>Fresh offers, announcements, and useful updates from nearby verified businesses.</p>
          </div>
          <button className={cx("post-button")} type="button" onClick={openComposer}>
            <AddIcon fontSize="small" />
            Post
          </button>
        </section>

        {localError && !isComposerOpen && (
          <div className={cx("notice-card")}>{localError}</div>
        )}

        {isComposerOpen && (
          <div className={cx("modal-backdrop")} role="presentation" onMouseDown={closeComposer}>
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
                  <h2 id="feed-post-title" className={cx("modal-title")}>Share a business update</h2>
                </div>
                <button className={cx("icon-button")} type="button" onClick={closeComposer} aria-label="Close post form">
                  <CloseIcon fontSize="small" />
                </button>
              </div>

              <form className={cx("composer-form")} onSubmit={handleSubmit} onKeyDown={handleComposerKeyDown}>
                <div className={cx("composer-author")}>
                  <div className={cx("business-avatar")}>
                    {(currentUser.businessName || currentUser.userName || "M").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{currentUser.businessName || currentUser.userName || "Your business"}</strong>
                    <span>Post text, offers, photos, or mixed updates</span>
                  </div>
                </div>

                <div className={cx("form-field")}>
                  <label className={cx("form-label")}>What do you want to share?</label>
                  <textarea
                    className={cx("composer-textarea")}
                    name="text"
                    value={formData.text}
                    onChange={handleChange}
                    maxLength={1200}
                    placeholder="Write a text update, offer, announcement, menu special, service note, hiring update, event, or anything your customers should know..."
                    autoFocus
                  />
                  <span className={cx("keyboard-hint")}>Press Ctrl + Enter to post. Images are optional.</span>
                </div>

                <div className={cx("composer-row")}>
                  <div className={cx("form-field")}>
                    <label className={cx("form-label")}>
                      <NotesIcon fontSize="small" />
                      Optional headline
                    </label>
                    <input className={cx("form-input")} name="title" value={formData.title} onChange={handleChange} maxLength={120} placeholder="Example: Today only family combo" />
                  </div>
                  <div className={cx("form-field")}>
                    <label className={cx("form-label")}>
                      <LocalOfferIcon fontSize="small" />
                      Offer validity
                    </label>
                    <div className={cx("date-row")}>
                      <input className={cx("form-input")} type="date" name="offerStartsAt" value={formData.offerStartsAt} onChange={handleChange} />
                      <input className={cx("form-input")} type="date" name="offerEndsAt" value={formData.offerEndsAt} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {imagePreviews.length > 0 && (
                  <div className={cx("preview-grid")}>
                    {imagePreviews.map((image, index) => (
                      <div className={cx("preview-tile")} key={image.name}>
                        <img src={image.src} alt={image.name} />
                        <button type="button" className={cx("preview-remove")} onClick={() => removeImage(index)} aria-label="Remove image">
                          <DeleteOutlineIcon fontSize="small" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={cx("media-picker")}>
                  <span className={cx("media-names")}>{selectedImageNames.length ? `${selectedImageNames.length} image(s) selected` : "Photo is optional. Text-only posts are allowed."}</span>
                  <button className={cx("secondary-button")} type="button" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon fontSize="small" /> Add Photos
                  </button>
                  <input ref={fileInputRef} hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagesChange} />
                </div>
                {(localError || error?.message) && <span className={cx("error-text")}>{localError || error.message}</span>}
                <div className={cx("modal-actions")}>
                  <button className={cx("ghost-button")} type="button" onClick={closeComposer}>
                    Cancel
                  </button>
                  <button className={cx("primary-button")} type="submit" disabled={loading}>
                    {loading ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className={cx("feed-list")}>
          {posts.length ? (
            posts.map((post) => (
              <FeedPost
                key={post._id}
                post={post}
                onLike={(postId) => dispatch(toggleMassclickFeedLike(postId))}
                onShare={handleShare}
                onComment={(postId, text) => dispatch(addMassclickFeedComment(postId, text))}
              />
            ))
          ) : (
            <div className={cx("empty-card")}>No feed posts yet.</div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
