import express from "express";
import {
  getUsersWithFCMTokensAction,
  sendMarketingNotificationAction,
  scheduleMarketingNotificationAction,
  resendCampaignAction,
  cancelScheduledCampaignAction,
  getCampaignHistoryAction,
  uploadFCMImageAction,
} from "../controller/fcmAdminController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.get("/api/admin/fcm/users-with-tokens", oauthAuthentication, getUsersWithFCMTokensAction);
router.post("/api/admin/fcm/send-marketing", oauthAuthentication, sendMarketingNotificationAction);
router.post("/api/admin/fcm/schedule-marketing", oauthAuthentication, scheduleMarketingNotificationAction);
router.post("/api/admin/fcm/campaigns/:id/resend", oauthAuthentication, resendCampaignAction);
router.delete("/api/admin/fcm/campaigns/:id", oauthAuthentication, cancelScheduledCampaignAction);
router.get("/api/admin/fcm/campaigns", oauthAuthentication, getCampaignHistoryAction);
router.post("/api/admin/fcm/upload-image", oauthAuthentication, uploadFCMImageAction);

export default router;
