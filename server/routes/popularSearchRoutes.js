import express from 'express'

import { addEnquiryNowDataAction,viewAllEnquiryNowDataAction } from "../controller/popularSearch/enquiryNowDataController.js"

import { oauthAuthentication } from "../helper/oauthHelper.js";
import { createHttpAuthMiddleware, requireAdminAuth } from "../auth/authMiddleware.js";

const router = express.Router();

const requireCustomerEnquiryAuth = createHttpAuthMiddleware({
  allowedActorTypes: ["customer", "admin"],
  source: "popular-search-enquiry",
});

router.post(
  "/api/popular-search/enquiry-now/create",
  requireCustomerEnquiryAuth,
  addEnquiryNowDataAction
);
// router.get('/api/popular-search/enquiry-now/view/:id', oauthAuthentication, viewEnquiryNowDataAction);
router.get('/api/popular-search/enquiry-now/viewall', requireAdminAuth(), viewAllEnquiryNowDataAction);


export default router; 