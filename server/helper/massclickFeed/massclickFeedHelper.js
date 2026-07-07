import { ObjectId } from "mongodb";
import businessListModel from "../../model/businessList/businessListModel.js";
import massclickFeedPostModel from "../../model/massclickFeed/massclickFeedPostModel.js";
import otpUserModel from "../../model/msg91Model/usersModels.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;

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
    if (!ALLOWED_IMAGE_TYPES.has(file.fileType)) throw new Error("Only JPG, PNG, and WebP images are allowed");
    if (getBase64Size(file.mediaFile) > MAX_IMAGE_SIZE) throw new Error("Each image must be 5 MB or smaller");
  });

  if (data.offerStartsAt && data.offerEndsAt) {
    const startsAt = new Date(data.offerStartsAt);
    const endsAt = new Date(data.offerEndsAt);
    if (endsAt < startsAt) throw new Error("Offer end date must be after start date");
  }
};

const uploadFeedImages = async (files = [], ownerId = "") =>
  Promise.all(
    files.map(async (file) => {
      const extension = getExtensionFromFileName(file.fileName);
      const uploadResult = await uploadImageToS3(
        file.mediaFile,
        `massclick-feed/${ownerId}/post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        {
          contentType: file.fileType,
          extension,
        }
      );

      return {
        mediaType: "image",
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
  const mediaItems = await uploadFeedImages(data.mediaFiles || [], actorId);

  const post = new massclickFeedPostModel({
    businessId: business?._id || null,
    ownerUserId: actorId,
    ownerActorType: actor.actorType || "customer",
    businessName: business?.businessName || customer.businessName || data.businessName || actor.userName || "Business",
    businessCategory: business?.category || customer.businessCategory?.category || "",
    businessLocation: business?.location || customer.businessLocation || "",
    title: data.title || "",
    text: data.text || "",
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
  const posts = await massclickFeedPostModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return {
    data: posts.map((post) => normalizePost(post, actorId)),
    total,
    pageNo,
    pageSize,
  };
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
  if (!["active", "hidden", "rejected", "expired"].includes(data.status)) {
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
