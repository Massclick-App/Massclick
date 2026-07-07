import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  overview,
  trends,
  trafficSources,
  locations,
  devices,
  cities,
  browsers,
  pages,
  landingPages,
  acquisition,
  engagementOverview,
  referrers,
  campaigns,
  operatingSystems,
  platforms,
  deviceModels,
  screenResolutions,
  regions,
  continents,
  subContinents,
  newVsReturning,
  dayOfWeek,
  hourOfDay,
  screens,
} from "../controller/ga4Controller.js";

const router = express.Router();

router.get("/api/ga4/overview",             oauthAuthentication, overview);
router.get("/api/ga4/trends",               oauthAuthentication, trends);
router.get("/api/ga4/traffic-sources",      oauthAuthentication, trafficSources);
router.get("/api/ga4/locations",            oauthAuthentication, locations);
router.get("/api/ga4/devices",              oauthAuthentication, devices);
router.get("/api/ga4/cities",               oauthAuthentication, cities);
router.get("/api/ga4/browsers",             oauthAuthentication, browsers);
router.get("/api/ga4/pages",                oauthAuthentication, pages);
router.get("/api/ga4/landing-pages",        oauthAuthentication, landingPages);
router.get("/api/ga4/acquisition",          oauthAuthentication, acquisition);
router.get("/api/ga4/engagement-overview",  oauthAuthentication, engagementOverview);
router.get("/api/ga4/referrers",            oauthAuthentication, referrers);
router.get("/api/ga4/campaigns",            oauthAuthentication, campaigns);
router.get("/api/ga4/operating-systems",    oauthAuthentication, operatingSystems);
router.get("/api/ga4/platforms",            oauthAuthentication, platforms);
router.get("/api/ga4/device-models",        oauthAuthentication, deviceModels);
router.get("/api/ga4/screen-resolutions",   oauthAuthentication, screenResolutions);
router.get("/api/ga4/regions",              oauthAuthentication, regions);
router.get("/api/ga4/continents",           oauthAuthentication, continents);
router.get("/api/ga4/sub-continents",       oauthAuthentication, subContinents);
router.get("/api/ga4/new-vs-returning",     oauthAuthentication, newVsReturning);
router.get("/api/ga4/day-of-week",          oauthAuthentication, dayOfWeek);
router.get("/api/ga4/hour-of-day",          oauthAuthentication, hourOfDay);
router.get("/api/ga4/screens",              oauthAuthentication, screens);

export default router;
