import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { businessPersonReportAction, businessReportFiltersAction, listBusinessPeopleAction, reportBusinessesAction } from "../controller/businessPersonReport/businessPersonReportController.js";

const router = express.Router();
router.get("/api/admin/business-person-reports/people", oauthAuthentication, listBusinessPeopleAction);
router.get("/api/admin/business-person-reports/filters", oauthAuthentication, businessReportFiltersAction);
router.get("/api/admin/business-person-reports/businesses", oauthAuthentication, reportBusinessesAction);
router.get("/api/admin/business-person-reports/report", oauthAuthentication, businessPersonReportAction);
export default router;
