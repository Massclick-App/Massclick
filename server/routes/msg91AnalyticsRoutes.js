import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  exportMsg91AnalyticsCsvAction,
  getMsg91AnalyticsAuditAction,
  getMsg91AnalyticsFailuresAction,
  getMsg91AnalyticsFilterOptionsAction,
  getMsg91AnalyticsRecipientsAction,
  getMsg91AnalyticsSummaryAction,
  getMsg91AnalyticsTimeseriesAction,
  msg91StatusWebhookAction,
  reviewMsg91RecipientAction,
  searchMsg91AnalyticsBusinessesAction,
  unsuppressMsg91RecipientAction,
} from "../controller/msg91/msg91AnalyticsController.js";

const router = express.Router();

router.get("/api/admin/msg91-analytics/summary", oauthAuthentication, getMsg91AnalyticsSummaryAction);
router.get("/api/admin/msg91-analytics/timeseries", oauthAuthentication, getMsg91AnalyticsTimeseriesAction);
router.get("/api/admin/msg91-analytics/failures", oauthAuthentication, getMsg91AnalyticsFailuresAction);
router.get("/api/admin/msg91-analytics/audit", oauthAuthentication, getMsg91AnalyticsAuditAction);
router.get("/api/admin/msg91-analytics/filter-options", oauthAuthentication, getMsg91AnalyticsFilterOptionsAction);
router.get("/api/admin/msg91-analytics/businesses", oauthAuthentication, searchMsg91AnalyticsBusinessesAction);
router.get("/api/admin/msg91-analytics/export-csv", oauthAuthentication, exportMsg91AnalyticsCsvAction);
router.get("/api/admin/msg91-analytics/recipients", oauthAuthentication, getMsg91AnalyticsRecipientsAction);
router.put("/api/admin/msg91-analytics/recipients/:mobile/review", oauthAuthentication, reviewMsg91RecipientAction);
router.put("/api/admin/msg91-analytics/recipients/:mobile/unsuppress", oauthAuthentication, unsuppressMsg91RecipientAction);
router.post("/api/msg91/webhook/status", msg91StatusWebhookAction);

export default router;
