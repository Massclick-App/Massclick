import express from "express";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import {
  listKeywords,
  createKeyword,
  patchKeyword,
  removeKeyword,
  keywordHistory,
  checkKeyword,
  manualCheckKeyword,
  checkAllKeywords,
  quotaStatus,
} from "../controller/trackedKeywordController.js";

const router = express.Router();

router.get("/api/gsc/keywords/quota", oauthAuthentication, quotaStatus);
router.post("/api/gsc/keywords/check-all", oauthAuthentication, checkAllKeywords);
router.get("/api/gsc/keywords/:id/history", oauthAuthentication, keywordHistory);
router.post("/api/gsc/keywords/:id/check", oauthAuthentication, checkKeyword);
router.post("/api/gsc/keywords/:id/manual-check", oauthAuthentication, manualCheckKeyword);
router.patch("/api/gsc/keywords/:id", oauthAuthentication, patchKeyword);
router.delete("/api/gsc/keywords/:id", oauthAuthentication, removeKeyword);
router.get("/api/gsc/keywords", oauthAuthentication, listKeywords);
router.post("/api/gsc/keywords", oauthAuthentication, createKeyword);

export default router;
