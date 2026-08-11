import businessListModel from "../../model/businessList/businessListModel.js";
import businessReviewModel from "../../model/businessReview/businessReviewModel.js";
import mongoose from "mongoose";
import { uploadImageToS3 } from "../../s3Uploder.js";

/** At most this many photos per review. */
const MAX_RATING_PHOTOS = 10;
/** Per-photo ceiling, matching the reward-claim evidence cap in rewardSchemas.js. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Every review photo for a business lives under this prefix and nowhere else. */
const reviewPhotoPrefix = (businessId) => `businessList/reviews/${businessId}/`;

/**
 * Turn whatever the request body supplied into a safe list of S3 keys.
 *
 * Step 0.6 of the S3 key restructure. This path previously wrote
 * `ratingPhotos: ratingPhotos || []` — the raw request body — straight to the
 * document, with two consequences:
 *
 *   1. INJECTION. An external caller could store arbitrary strings, or another
 *      business's keys, in a field that is rendered as an image URL
 *      (businessListHelper.js:1352 maps every entry through getSignedUrlByKey).
 *   2. UNBOUNDED DOCUMENTS. Callers sent base64 data URIs and they were stored
 *      inline. Live data at 2026-08-11: 20.4 MB of base64 across 4 prod documents,
 *      the largest 11.30 MB — 71% of MongoDB's hard 16 MB per-document limit. A few
 *      more photos on that review and every write to it fails BSONObjectTooLarge.
 *
 * Base64 is uploaded and replaced by its key, matching what businessListHelper.js:1062
 * already does for the embedded-review path. A caller-supplied string is accepted only
 * if it is a bare key already under THIS business's prefix. Everything else is dropped.
 *
 * NOTE FOR PHASE 1: the prefix test is the interim form of this check. Once
 * `isCanonicalKey()` and `entityPrefix()` land in utils/s3ObjectKeys.js (1.1) this
 * becomes isCanonicalKey(value) && value.startsWith(entityPrefix("businesses", businessId)).
 */
const sanitizeRatingPhotos = async ({ businessId, ratingPhotos }) => {
  if (!Array.isArray(ratingPhotos) || ratingPhotos.length === 0) return [];

  const prefix = reviewPhotoPrefix(businessId);
  const accepted = [];
  const rejected = [];
  const candidates = ratingPhotos.slice(0, MAX_RATING_PHOTOS);

  for (let i = 0; i < candidates.length; i += 1) {
    const entry = candidates[i];

    if (typeof entry !== "string" || !entry.trim()) {
      rejected.push("non-string");
      continue;
    }

    const value = entry.trim();

    if (value.startsWith("data:image/")) {
      const payload = value.slice(value.indexOf(",") + 1);
      // 4 base64 chars encode 3 bytes; close enough to reject oversized uploads.
      if (Math.floor((payload.length * 3) / 4) > MAX_PHOTO_BYTES) {
        rejected.push("oversized base64");
        continue;
      }
      const uploadResult = await uploadImageToS3(
        value,
        `${prefix}photo-${Date.now()}-${i}`,
      );
      accepted.push(uploadResult.key);
      continue;
    }

    // A pre-uploaded key is only trusted when it already belongs to this business.
    if (
      value.startsWith(prefix) &&
      !value.includes("..") &&
      !/^https?:/i.test(value)
    ) {
      accepted.push(value);
      continue;
    }

    rejected.push(value.slice(0, 80));
  }

  const dropped = rejected.length + Math.max(0, ratingPhotos.length - MAX_RATING_PHOTOS);
  if (dropped) {
    console.warn(
      `[reviewHelper] dropped ${dropped} rating photo(s) for business ${businessId}:`,
      rejected.slice(0, 5),
    );
  }

  return accepted;
};

const normalizeMobile = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const getBusinessMobiles = (business = {}) => {
  return [business.contactList, business.contact, business.whatsappNumber]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map(normalizeMobile)
    .filter(Boolean);
};

const assertBusinessOwner = async ({ businessId, userMobile }) => {
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error("Invalid business ID");
  }

  const business = await businessListModel
    .findById(businessId)
    .select("contact contactList whatsappNumber")
    .lean();

  if (!business) throw new Error("Business not found");

  const normalizedUserMobile = normalizeMobile(userMobile);
  const businessMobiles = getBusinessMobiles(business);

  if (!normalizedUserMobile || !businessMobiles.includes(normalizedUserMobile)) {
    throw new Error("Only the business owner can do this action");
  }
};

const updateBusinessRatingSummary = async (businessId) => {
  const stats = await businessReviewModel.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        status: "ACTIVE"
      }
    },
    {
      $group: {
        _id: "$businessId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const business = await businessListModel.findById(businessId);
  if (!business) return;

  if (stats.length > 0) {
    business.averageRating = Number(stats[0].averageRating.toFixed(1));
    business.totalReviews = stats[0].totalReviews;
  } else {
    business.averageRating = 0;
    business.totalReviews = 0;
  }

  await business.save();
};

export const addReviewHelper = async ({ businessId, reviewData }) => {
  const { userId, userName, userMobile, rating, ratingExperience, ratingLove, ratingPhotos } = reviewData;

  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error("Invalid business ID");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const normalizedUserMobile = normalizeMobile(userMobile);

  if (!normalizedUserMobile) {
    throw new Error("Verified mobile number is required to review");
  }

  const alreadyReviewed = await businessReviewModel.findOne({
    businessId,
    $or: [
      { userId: userObjectId },
      { userMobile: normalizedUserMobile }
    ],
    status: "ACTIVE"
  });

  if (alreadyReviewed) {
    throw new Error("This mobile number already reviewed this business");
  }

  const safeRatingPhotos = await sanitizeRatingPhotos({ businessId, ratingPhotos });

  const review = await businessReviewModel.create({
    businessId,
    userId: userObjectId,
    userName: userName || "Anonymous",
    userMobile: normalizedUserMobile,
    rating: Number(rating),
    ratingExperience,
    ratingLove: ratingLove || [],
    ratingPhotos: safeRatingPhotos,
    status: "ACTIVE"
  });

  await updateBusinessRatingSummary(businessId);

  return review;
};


export const getReviewsHelper = async ({
  businessId,
  sortBy = "latest",
  page = 1,
  limit = 10
}) => {
  const skip = (page - 1) * limit;

  let sortQuery = { createdAt: -1 };
  if (sortBy === "rating") sortQuery = { rating: -1 };
  if (sortBy === "helpful") sortQuery = { helpfulCount: -1 };

  const [reviews, total] = await Promise.all([
    businessReviewModel
      .find({ businessId, status: "ACTIVE" })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),
    businessReviewModel.countDocuments({ businessId, status: "ACTIVE" })
  ]);

  return {
    reviews,
    total,
    hasMore: skip + reviews.length < total,
    page
  };
};

export const addReplyHelper = async ({ businessId, reviewId, userId, userName, userMobile, role, message }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const review = await businessReviewModel.findById(reviewId);
  if (!review) throw new Error("Review not found");

  if (String(review.businessId) !== String(businessId)) {
    throw new Error("Review does not belong to this business");
  }

  await assertBusinessOwner({ businessId, userMobile });

  review.replies.push({
    userId: new mongoose.Types.ObjectId(userId),
    userName,
    role,
    message
  });

  await review.save();
  return review;
};

export const markHelpfulHelper = async ({ reviewId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const review = await businessReviewModel.findById(reviewId);
  if (!review) throw new Error("Review not found");

  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (review.helpfulBy.some(id => id.equals(userObjectId))) {
    throw new Error("Already marked helpful");
  }

  review.helpfulBy.push(userObjectId);
  review.helpfulCount = review.helpfulBy.length;

  await review.save();
  return review;
};


export const reportReviewHelper = async ({ businessId, reviewId, userMobile }) => {
  const review = await businessReviewModel.findById(reviewId);
  if (!review) throw new Error("Review not found");

  if (String(review.businessId) !== String(businessId)) {
    throw new Error("Review does not belong to this business");
  }

  await assertBusinessOwner({ businessId, userMobile });

  review.status = "REPORTED";
  await review.save();

  await updateBusinessRatingSummary(review.businessId);

  return true;
};
