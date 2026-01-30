import businessListModel from "../../model/businessList/businessListModel.js";
import businessReviewModel from "../../model/businessReview/businessReviewModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import mongoose from "mongoose";



export const addReviewHelper = async ({ businessId, reviewData }) => {
  const { userId, userName, rating, ratingExperience, ratingLove, ratingPhotos } = reviewData;

  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error("Invalid business ID");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const alreadyReviewed = await businessReviewModel.findOne({
    businessId,
    userId: userObjectId
  });

  if (alreadyReviewed) {
    throw new Error("You already reviewed this business");
  }

  const review = await businessReviewModel.create({
    businessId,
    userId: userObjectId,
    userName: userName || "Anonymous",
    rating: Number(rating),
    ratingExperience,
    ratingLove: ratingLove || [],
    ratingPhotos: ratingPhotos || []
  });

  const business = await businessListModel.findById(businessId);
  if (business) {
    const newTotal = (business.totalReviews || 0) + 1;
    const newAverage =
      ((business.averageRating || 0) * (newTotal - 1) + review.rating) / newTotal;

    business.totalReviews = newTotal;
    business.averageRating = Number(newAverage.toFixed(1));
    await business.save();
  }

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

export const addReplyHelper = async ({ reviewId, userId, userName, role, message }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const review = await businessReviewModel.findById(reviewId);
  if (!review) throw new Error("Review not found");

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


export const reportReviewHelper = async ({ reviewId }) => {
  const review = await businessReviewModel.findById(reviewId);
  if (!review) throw new Error("Review not found");

  review.status = "REPORTED";
  await review.save();
  return true;
};
