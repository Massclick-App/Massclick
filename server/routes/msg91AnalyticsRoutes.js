import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  getMsg91AnalyticsAuditAction,
  getMsg91AnalyticsFailuresAction,
  getMsg91AnalyticsRecipientsAction,
  getMsg91AnalyticsSummaryAction,
  getMsg91AnalyticsTimeseriesAction,
  msg91StatusWebhookAction,
  reviewMsg91RecipientAction,
  unsuppressMsg91RecipientAction,
} from "../controller/msg91/msg91AnalyticsController.js";

const router = express.Router();

router.get("/api/admin/msg91-analytics/summary", oauthAuthentication, getMsg91AnalyticsSummaryAction);
router.get("/api/admin/msg91-analytics/timeseries", oauthAuthentication, getMsg91AnalyticsTimeseriesAction);
router.get("/api/admin/msg91-analytics/failures", oauthAuthentication, getMsg91AnalyticsFailuresAction);
router.get("/api/admin/msg91-analytics/audit", oauthAuthentication, getMsg91AnalyticsAuditAction);
router.get("/api/admin/msg91-analytics/recipients", oauthAuthentication, getMsg91AnalyticsRecipientsAction);
router.put("/api/admin/msg91-analytics/recipients/:mobile/review", oauthAuthentication, reviewMsg91RecipientAction);
router.put("/api/admin/msg91-analytics/recipients/:mobile/unsuppress", oauthAuthentication, unsuppressMsg91RecipientAction);
router.post("/api/msg91/webhook/status", msg91StatusWebhookAction);

export default router;
