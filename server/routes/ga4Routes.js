import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  overview,
  trends,
  trafficSources,
  locations,
  devices,
  conversions,
} from "../controller/ga4Controller.js";

const router = express.Router();

router.get("/api/ga4/overview",        oauthAuthentication, overview);
router.get("/api/ga4/trends",          oauthAuthentication, trends);
router.get("/api/ga4/traffic-sources", oauthAuthentication, trafficSources);
router.get("/api/ga4/locations",       oauthAuthentication, locations);
router.get("/api/ga4/devices",         oauthAuthentication, devices);
router.get("/api/ga4/conversions",     oauthAuthentication, conversions);

export default router;
