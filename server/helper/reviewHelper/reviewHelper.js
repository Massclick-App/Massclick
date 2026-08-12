import businessListModel from "../../model/businessList/businessListModel.js";
import businessReviewModel from "../../model/businessReview/businessReviewModel.js";
import mongoose from "mongoose";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import { s3Keys, isCanonicalKey, belongsToEntity } from "../../utils/s3ObjectKeys.js";

/** At most this many photos per review. */
const MAX_RATING_PHOTOS = 10;
/** Per-photo ceiling, matching the reward-claim evidence cap in rewardSchemas.js. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
 * Base64 is uploaded and replaced by its key, using s3Keys.business.reviewPhoto —
 * the SAME purpose businessListHelper.js's embedded-review path uses (step 1.4),
 * scoped by business rather than by this collection's own review _id, since both
 * write paths share one folder and this file's own review documents have no id at
 * upload time here either. A caller-supplied string is accepted only if it is a
 * canonical key already belonging to THIS business. Everything else is dropped.
 *
 * This is the Phase 1 form of the check this docstring originally planned for:
 * isCanonicalKey(value) && belongsToEntity(value, "businesses", businessId).
 */
const sanitizeRatingPhotos = async ({ businessId, ratingPhotos }) => {
  if (!Array.isArray(ratingPhotos) || ratingPhotos.length === 0) return [];

  const accepted = [];
  const rejected = [];
  const candidates = ratingPhotos.slice(0, MAX_RATING_PHOTOS);

  for (const entry of candidates) {
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
        s3Keys.business.reviewPhoto(businessId),
      );
      accepted.push(uploadResult.key);
      continue;
    }

    // A pre-uploaded key is only trusted when it already belongs to this business.
    if (isCanonicalKey(value) && belongsToEntity(value, "businesses", businessId)) {
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


/**
 * Render stored ratingPhotos for the client.
 *
 * TOLERATES BOTH SHAPES DELIBERATELY. Until fixRatingPhotos.js has run, stored values
 * are inline base64 data URIs; afterwards they are bare S3 keys. Handling both means
 * the repair needs no flag day and can be rolled back without breaking the page.
 *
 * This matters because nothing else converts them: getReviewsHelper previously returned
 * ratingPhotos raw and reviewCard.js renders `<img src={photo} />` directly. Replacing
 * base64 with keys WITHOUT this would make the browser resolve "businessList/reviews/..."
 * against the site origin and 404 every review photo.
 */
const toPhotoUrls = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos.filter(Boolean).map((value) => {
    if (typeof value !== "string") return "";
    const v = value.trim();
    if (!v) return "";
    if (v.startsWith("data:")) return v;        // not yet migrated - pass through
    if (/^https?:\/\//i.test(v)) return v;      // already absolute
    return getSignedUrlByKey(v);                // a bare key - build the URL
  }).filter(Boolean);
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
    reviews: reviews.map((review) => ({
      ...review,
      ratingPhotos: toPhotoUrls(review.ratingPhotos),
    })),
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
