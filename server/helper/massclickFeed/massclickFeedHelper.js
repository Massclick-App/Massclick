import mongoose from "mongoose";
import businessListModel from "../../model/businessList/businessListModel.js";
import massclickFeedPostModel from "../../model/massclickFeed/massclickFeedPostModel.js";
import massclickFeedFollowModel from "../../model/massclickFeed/massclickFeedFollowModel.js";
import otpUserModel from "../../model/msg91Model/usersModels.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";
import { s3Keys } from "../../utils/s3ObjectKeys.js";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime",
  "application/pdf", "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_IMAGE_SIZE = 45 * 1024 * 1024;
const MAX_IMAGES = 4;
const { ObjectId } = mongoose.Types;
const ALLOWED_ACTIONS = new Set(["call", "whatsapp", "book", "shop", "learn"]);

const escapeRegExp = (value = "") =>
  value.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getBase64Size = (dataUrl = "") => {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const getExtensionFromFileName = (fileName = "") => {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toLowerCase() : "jpg";
};

const getActorId = (actor = {}) => actor.subjectId || actor.userId || actor._id || actor.id;

const normalizePost = (post = {}, actorId = "") => {
  const likes = post.likes || [];
  const comments = (post.comments || []).filter((comment) => !comment.isDeleted);

  return {
    ...post,
    mediaItems: (post.mediaItems || []).map((item) => ({
      ...item,
      mediaUrl: item.mediaKey ? getSignedUrlByKey(item.mediaKey) : "",
    })),
    likesCount: likes.length,
    commentsCount: comments.length,
    likedByMe: actorId
      ? likes.some((likeId) => String(likeId) === String(actorId))
      : false,
    comments,
  };
};

const getCustomerBusiness = async (actor = {}, requestedBusinessId = "") => {
  const actorId = getActorId(actor);
  if (!actorId) throw new Error("Login required");

  if (actor.actorType === "admin" && requestedBusinessId) {
    return businessListModel.findById(requestedBusinessId).lean();
  }

  const customer = await otpUserModel.findById(actorId).lean();
  if (!customer) throw new Error("Customer account not found");

  const mobile = customer.mobileNumber1 || actor.mobile || "";
  const query = {
    activeBusinesses: true,
    isActive: true,
    $or: [
      { createdBy: actorId },
      { clientId: actorId },
      { contact: mobile },
      { whatsappNumber: mobile },
      { contactList: { $regex: escapeRegExp(mobile) } },
    ],
  };

  if (requestedBusinessId && ObjectId.isValid(requestedBusinessId)) {
    query._id = requestedBusinessId;
  }

  const business = await businessListModel.findOne(query).lean();
  const isPaidBusiness = Boolean(
    business?.amountPaid ||
    business?.subscription?.isActive ||
    business?.paymentConcept?.paymentStatus === "paid"
  );

  if (!customer.businessPeople && !isPaidBusiness) {
    throw new Error("Only business people or paid business accounts can post");
  }

  return {
    customer,
    business,
  };
};

const validatePostPayload = (data = {}) => {
  if (!data.text?.trim() && !data.title?.trim() && !data.mediaFiles?.length) {
    throw new Error("Add post text, title, or image");
  }

  if ((data.text || "").length > 1200) throw new Error("Post text is too long");
  if ((data.title || "").length > 120) throw new Error("Post title is too long");

  const files = Array.isArray(data.mediaFiles) ? data.mediaFiles : [];
  if (files.length > MAX_IMAGES) throw new Error(`Upload up to ${MAX_IMAGES} images`);

  files.forEach((file) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.fileType)) throw new Error("Unsupported attachment type");
    if (getBase64Size(file.mediaFile) > MAX_IMAGE_SIZE) throw new Error("Each attachment must be 45 MB or smaller");
  });

  if (data.offerStartsAt && data.offerEndsAt) {
    const startsAt = new Date(data.offerStartsAt);
    const endsAt = new Date(data.offerEndsAt);
    if (endsAt < startsAt) throw new Error("Offer end date must be after start date");
  }
  const actions = Array.isArray(data.callToActions) ? data.callToActions : [];
  if (actions.length > 3) throw new Error("Choose up to three call-to-action buttons");
  if (new Set(actions.map((item) => item.action)).size !== actions.length) throw new Error("Duplicate call-to-action buttons are not allowed");
  actions.forEach((item) => {
    if (!ALLOWED_ACTIONS.has(item.action)) throw new Error("Invalid call-to-action type");
    if (!String(item.value || "").trim()) throw new Error(`Add a destination for ${item.label || item.action}`);
    if (["call", "whatsapp"].includes(item.action) && String(item.value).replace(/\D/g, "").length < 7) throw new Error(`Add a valid number for ${item.label}`);
    if (!["call", "whatsapp"].includes(item.action) && !/^https?:\/\//i.test(String(item.value))) throw new Error(`${item.label} must use a complete http:// or https:// URL`);
  });
};

const uploadFeedImages = async (files = [], postId) =>
  Promise.all(
    files.map(async (file) => {
      const extension = getExtensionFromFileName(file.fileName);
      const uploadResult = await uploadImageToS3(
        file.mediaFile,
        s3Keys.feedPost.media(postId),
        {
          contentType: file.fileType,
          extension,
        }
      );

      return {
        mediaType: file.fileType?.startsWith("video/") ? "video" : file.fileType?.startsWith("image/") ? "image" : "file",
        mediaKey: uploadResult.key,
        fileName: file.fileName || "feed-image",
        fileType: file.fileType,
        fileSize: file.fileSize || getBase64Size(file.mediaFile),
      };
    })
  );

export const createMassclickFeedPost = async (data = {}, actor = {}) => {
  validatePostPayload(data);

  const actorId = getActorId(actor);
  const result = await getCustomerBusiness(actor, data.businessId);
  const customer = result.customer || {};
  const business = result.business || null;

  // Uploads below need an owning entity id, but the document doesn't exist yet.
  // Mint it first — never upload-then-mint.
  const postId = new ObjectId();
  const mediaItems = await uploadFeedImages(data.mediaFiles || [], postId);

  const post = new massclickFeedPostModel({
    _id: postId,
    businessId: business?._id || null,
    ownerUserId: actorId,
    ownerActorType: actor.actorType || "customer",
    businessName: business?.businessName || customer.businessName || data.businessName || actor.userName || "Business",
    businessCategory: business?.category || customer.businessCategory?.category || "",
    businessLocation: business?.location || customer.businessLocation || "",
    title: data.title || "",
    text: data.text || "",
    postType: data.postType || "update",
    callToAction: data.callToAction || "",
    callToActions: Array.isArray(data.callToActions)
      ? data.callToActions.slice(0, 3).map((item) => ({ action: String(item.action || ""), label: String(item.label || ""), value: String(item.value || "") }))
      : [],
    hashtags: Array.isArray(data.hashtags) ? data.hashtags.slice(0, 20) : [],
    audience: Array.isArray(data.audience) ? data.audience : [],
    radiusKm: Number(data.radiusKm) || 5,
    scheduledAt: data.scheduledAt || null,
    expireAfterDays: data.expireAfterDays ? Number(data.expireAfterDays) : null,
    pinPost: data.pinPost === true,
    allowComments: data.allowComments !== false,
    showShareButton: data.showShareButton !== false,
    trackPerformance: data.trackPerformance !== false,
    offerStartsAt: data.offerStartsAt || null,
    offerEndsAt: data.offerEndsAt || null,
    mediaItems,
    status: data.status || "active",
  });

  const savedPost = await post.save();
  return normalizePost(savedPost.toObject(), actorId);
};

export const listMassclickFeedPosts = async ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "active",
  actorId = "",
  includeInactive = false,
} = {}) => {
  const query = { isDeleted: false };

  if (!includeInactive) query.status = "active";
  if (includeInactive && status !== "all") query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { text: { $regex: search, $options: "i" } },
      { businessName: { $regex: search, $options: "i" } },
      { businessCategory: { $regex: search, $options: "i" } },
      { businessLocation: { $regex: search, $options: "i" } },
    ];
  }

  const total = await massclickFeedPostModel.countDocuments(query);
  const following = actorId && ObjectId.isValid(String(actorId))
    ? await massclickFeedFollowModel.find({ followerUserId: actorId }).select("businessId -_id").lean()
    : [];
  const followedIds = following.map((item) => item.businessId);
  const posts = await massclickFeedPostModel.aggregate([
    { $match: query },
    { $addFields: { followedRank: { $cond: [{ $in: ["$businessId", followedIds] }, 1, 0] } } },
    { $sort: { followedRank: -1, createdAt: -1 } },
    { $skip: (pageNo - 1) * pageSize },
    { $limit: pageSize },
    { $project: { followedRank: 0 } },
  ]);
  const businessIds = [...new Set(posts.map((post) => String(post.businessId || "")).filter(Boolean))];
  const followerCounts = businessIds.length ? await massclickFeedFollowModel.aggregate([
    { $match: { businessId: { $in: businessIds.map((id) => new ObjectId(id)) } } },
    { $group: { _id: "$businessId", count: { $sum: 1 } } },
  ]) : [];
  const countByBusiness = new Map(followerCounts.map((item) => [String(item._id), item.count]));
  const followedSet = new Set(followedIds.map(String));

  return {
    data: posts.map((post) => ({
      ...normalizePost(post, actorId),
      isFollowing: followedSet.has(String(post.businessId || "")),
      followersCount: countByBusiness.get(String(post.businessId || "")) || 0,
    })),
    total,
    pageNo,
    pageSize,
  };
};

export const setMassclickFeedFollow = async (businessId, shouldFollow, actor = {}) => {
  const actorId = getActorId(actor);
  if (!actorId || !ObjectId.isValid(String(actorId))) throw new Error("Login required");
  if (!ObjectId.isValid(String(businessId))) throw new Error("Invalid business ID");
  const business = await businessListModel.exists({ _id: businessId, isActive: true });
  if (!business) throw new Error("Business not found");
  if (shouldFollow) {
    await massclickFeedFollowModel.updateOne(
      { followerUserId: actorId, businessId },
      { $setOnInsert: { followerUserId: actorId, businessId, createdAt: new Date() } },
      { upsert: true }
    );
  } else {
    await massclickFeedFollowModel.deleteOne({ followerUserId: actorId, businessId });
  }
  const followersCount = await massclickFeedFollowModel.countDocuments({ businessId });
  return { businessId: String(businessId), isFollowing: Boolean(shouldFollow), followersCount };
};

export const listMassclickFeedFollows = async (actor = {}) => {
  const actorId = getActorId(actor);
  if (!actorId || !ObjectId.isValid(String(actorId))) throw new Error("Login required");
  const follows = await massclickFeedFollowModel.find({ followerUserId: actorId }).sort({ createdAt: -1 }).lean();
  return { businessIds: follows.map((item) => String(item.businessId)) };
};

export const toggleMassclickFeedLike = async (postId, actor = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error("Invalid post ID");

  const actorId = getActorId(actor);
  const post = await massclickFeedPostModel.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new Error("Post not found");

  const hasLiked = post.likes.some((likeId) => String(likeId) === String(actorId));
  if (hasLiked) {
    post.likes = post.likes.filter((likeId) => String(likeId) !== String(actorId));
  } else {
    post.likes.push(actorId);
  }

  post.updatedAt = new Date();
  const updatedPost = await post.save();
  return normalizePost(updatedPost.toObject(), actorId);
};

export const addMassclickFeedComment = async (postId, data = {}, actor = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error("Invalid post ID");
  if (!data.text?.trim()) throw new Error("Comment is required");
  if (data.text.length > 500) throw new Error("Comment is too long");

  const actorId = getActorId(actor);
  const post = await massclickFeedPostModel.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new Error("Post not found");

  post.comments.push({
    userId: actorId,
    userName: actor.userName || "User",
    actorType: actor.actorType || "customer",
    text: data.text.trim(),
  });
  post.updatedAt = new Date();

  const updatedPost = await post.save();
  return normalizePost(updatedPost.toObject(), actorId);
};

export const recordMassclickFeedShare = async (postId, actor = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error("Invalid post ID");

  const updatedPost = await massclickFeedPostModel
    .findOneAndUpdate(
      { _id: postId, isDeleted: false },
      { $inc: { sharesCount: 1 }, updatedAt: new Date() },
      { new: true }
    )
    .lean();

  if (!updatedPost) throw new Error("Post not found");
  return normalizePost(updatedPost, getActorId(actor));
};

export const updateMassclickFeedStatus = async (postId, data = {}, actor = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error("Invalid post ID");
  if (!["active", "draft", "scheduled", "hidden", "rejected", "expired"].includes(data.status)) {
    throw new Error("Invalid post status");
  }

  const updatedPost = await massclickFeedPostModel
    .findOneAndUpdate(
      { _id: postId, isDeleted: false },
      { status: data.status, updatedAt: new Date() },
      { new: true }
    )
    .lean();

  if (!updatedPost) throw new Error("Post not found");
  return normalizePost(updatedPost, getActorId(actor));
};

export const deleteMassclickFeedPost = async (postId, actor = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error("Invalid post ID");

  const updatedPost = await massclickFeedPostModel
    .findOneAndUpdate(
      { _id: postId, isDeleted: false },
      { isDeleted: true, status: "hidden", updatedAt: new Date() },
      { new: true }
    )
    .lean();

  if (!updatedPost) throw new Error("Post not found");
  return normalizePost(updatedPost, getActorId(actor));
};
