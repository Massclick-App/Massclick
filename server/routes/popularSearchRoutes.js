import express from 'express'

import { addEnquiryNowDataAction,viewAllEnquiryNowDataAction } from "../controller/popularSearch/enquiryNowDataController.js"

import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.post(
  "/api/popular-search/enquiry-now/create",
  addEnquiryNowDataAction
);
// router.get('/api/popular-search/enquiry-now/view/:id', oauthAuthentication, viewEnquiryNowDataAction);
router.get('/api/popular-search/enquiry-now/viewall', viewAllEnquiryNowDataAction);


export default router; 