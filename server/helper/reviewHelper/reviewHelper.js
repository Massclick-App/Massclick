import businessListModel from "../../model/businessList/businessListModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import mongoose from "mongoose";


export const addReviewHelper = async ({ businessId, user, reviewData }) => {
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error("Invalid business ID");
  }

  const business = await businessListModel.findById(businessId);
  if (!business) {
    throw new Error("Business not found");
  }

  const alreadyReviewed = business.reviews.find(
    r => r.userId?.toString() === user.userId.toString()
  );
  if (alreadyReviewed) {
    throw new Error("You already reviewed this business");
  }

  const ratingPhotos = Array.isArray(reviewData.ratingPhotos)
    ? reviewData.ratingPhotos
    : [];

  let photoKeys = [];
  if (ratingPhotos.length > 0) {
    photoKeys = await Promise.all(
      ratingPhotos.map(async (img, i) => {
        if (typeof img === "string" && img.startsWith("data:image")) {
          const upload = await uploadImageToS3(
            img,
            `businessList/reviews/${businessId}/photo-${Date.now()}-${i}`
          );
          return upload.key;
        }
        return null;
      })
    );
    photoKeys = photoKeys.filter(Boolean);
  }

  const review = {
  rating: Number(reviewData.rating),
  ratingExperience: reviewData.ratingExperience,
  ratingLove: Array.isArray(reviewData.ratingLove) ? reviewData.ratingLove : [],
  ratingPhotos: photoKeys,

  userId: user.userId,
  userName: user.userName,    
  userProfileImage: user.profileImage || "",
  isVerifiedUser: user.mobileVerified,

  helpfulCount: 0,
  helpfulBy: [],
  status: "ACTIVE",
  createdAt: new Date(),
};

  business.reviews.push(review);

  const total = business.reviews.reduce((s, r) => s + r.rating, 0);
  business.averageRating = Number(
    (total / business.reviews.length).toFixed(1)
  );

  await business.save();
  return review;
};




export const getReviewsHelper = async ({
  businessId,
  sortBy = "latest",
  page = 1,
  limit = 10
}) => {
  const business = await businessListModel.findById(businessId).lean();
  if (!business) throw new Error("Business not found");

  let reviews = business.reviews.filter(r => r.status === "ACTIVE");

  if (sortBy === "rating") reviews.sort((a, b) => b.rating - a.rating);
  else if (sortBy === "helpful") reviews.sort((a, b) => b.helpfulCount - a.helpfulCount);
  else reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const start = (page - 1) * limit;
  const paginated = reviews.slice(start, start + limit);

  return {
    reviews: paginated,
    total: reviews.length,
    hasMore: start + limit < reviews.length
  };
};

export const addReplyHelper = async ({ businessId, reviewId, user, message }) => {
  const business = await businessListModel.findById(businessId);
  if (!business) throw new Error("Business not found");

  const review = business.reviews.id(reviewId);
  if (!review) throw new Error("Review not found");

  review.replies.push({
    userId: user.userId,
    userName: user.userName,
    role: user.role === "ADMIN" ? "ADMIN" : "OWNER",
    message,
  });

  await business.save();
  return review;
};

export const markHelpfulHelper = async ({ businessId, reviewId, userId }) => {
  const business = await businessListModel.findById(businessId);
  const review = business.reviews.id(reviewId);

  const alreadyHelpful = review.helpfulBy.some(
    id => id.toString() === userId.toString()
  );

  if (alreadyHelpful) {
    throw new Error("Already marked helpful");
  }

  review.helpfulBy.push(userId);
  review.helpfulCount = review.helpfulBy.length;

  await business.save();

  return review;
};

export const reportReviewHelper = async ({ businessId, reviewId }) => {
  const business = await businessListModel.findById(businessId);
  const review = business?.reviews.id(reviewId);
  if (!review) throw new Error("Review not found");

  review.status = "REPORTED";
  await business.save();

  return true;
};
