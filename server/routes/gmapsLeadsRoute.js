import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  viewAllGmapsLeadsAction,
  getGmapsLeadsStatsAction,
  updateGmapsLeadStatusAction,
  getGmapsLeadsDistinctsAction,
} from "../controller/gmapsLeads/gmapsLeadsController.js";

const router = express.Router();

router.get("/api/gmaps-leads/viewall", oauthAuthentication, viewAllGmapsLeadsAction);
router.get("/api/gmaps-leads/stats", oauthAuthentication, getGmapsLeadsStatsAction);
router.get("/api/gmaps-leads/distincts", oauthAuthentication, getGmapsLeadsDistinctsAction);
router.patch("/api/gmaps-leads/status/:id", oauthAuthentication, updateGmapsLeadStatusAction);

export default router;
