import businessListModel from "../../model/businessList/businessListModel.js";
import businessReviewModel from "../../model/businessReview/businessReviewModel.js";
import mongoose from "mongoose";

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

  const review = await businessReviewModel.create({
    businessId,
    userId: userObjectId,
    userName: userName || "Anonymous",
    userMobile: normalizedUserMobile,
    rating: Number(rating),
    ratingExperience,
    ratingLove: ratingLove || [],
    ratingPhotos: ratingPhotos || [],
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
