import express from "express";
import {
  getUsersWithFCMTokensAction,
  sendMarketingNotificationAction,
  getCampaignHistoryAction,
  uploadFCMImageAction,
} from "../controller/fcmAdminController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.get("/api/admin/fcm/users-with-tokens", oauthAuthentication, getUsersWithFCMTokensAction);
router.post("/api/admin/fcm/send-marketing", oauthAuthentication, sendMarketingNotificationAction);
router.get("/api/admin/fcm/campaigns", oauthAuthentication, getCampaignHistoryAction);
router.post("/api/admin/fcm/upload-image", oauthAuthentication, uploadFCMImageAction);

export default router;
