import express from "express";
import {
  addReviewAction,
  getReviewsAction,
  addReplyAction,
  markHelpfulAction,
  reportReviewAction
} from "../controller/reviewController/reviewController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const router = express.Router();

const reviewCache = cacheMiddleware({ expirySeconds: 1800, keyPrefix: 'reviews' });

router.post(
  "/api/business/:businessId/reviews",
  addReviewAction
);

router.get(
  "/api/business/:businessId/reviews",
  reviewCache,
  getReviewsAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/reply",
  addReplyAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/helpful",
  markHelpfulAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/report",
  reportReviewAction
);

export default router;
