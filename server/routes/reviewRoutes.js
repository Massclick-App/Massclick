import express from "express";
import {
  addReviewAction,
  getReviewsAction,
  addReplyAction,
  markHelpfulAction,
  reportReviewAction
} from "../controller/reviewController/reviewController.js";
import { oauthAuthentication, optionalAuth } from "../helper/oauthHelper.js";

const router = express.Router();

router.post(
  "/api/business/:businessId/reviews",optionalAuth,
  addReviewAction
);

router.get(
  "/api/business/:businessId/reviews",optionalAuth,
  getReviewsAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/reply",optionalAuth,
  addReplyAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/helpful",optionalAuth,
  markHelpfulAction
);

router.post(
  "/api/business/:businessId/reviews/:reviewId/report",optionalAuth,
  reportReviewAction
);

export default router;
