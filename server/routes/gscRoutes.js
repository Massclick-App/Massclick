import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  overview,
  trends,
  queries,
  pages,
  devices,
  countries,
  opportunities,
  keywordGaps,
} from "../controller/gscController.js";

const router = express.Router();

router.get("/api/gsc/overview",      oauthAuthentication, overview);
router.get("/api/gsc/trends",        oauthAuthentication, trends);
router.get("/api/gsc/queries",       oauthAuthentication, queries);
router.get("/api/gsc/pages",         oauthAuthentication, pages);
router.get("/api/gsc/devices",       oauthAuthentication, devices);
router.get("/api/gsc/countries",     oauthAuthentication, countries);
router.get("/api/gsc/opportunities", oauthAuthentication, opportunities);
router.get("/api/gsc/keyword-gaps",  oauthAuthentication, keywordGaps);

export default router;
