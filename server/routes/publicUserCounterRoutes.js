import express from "express";
import {
  getAdminPublicUserCounterAction,
  getPublicUserCounterAction,
  resetAdminPublicUserCounterAction,
  updateAdminPublicUserCounterAction,
} from "../controller/publicUserCounter/publicUserCounterController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.get("/api/public-user-counter", getPublicUserCounterAction);
router.get("/api/admin/public-user-counter", oauthAuthentication, getAdminPublicUserCounterAction);
router.put("/api/admin/public-user-counter", oauthAuthentication, updateAdminPublicUserCounterAction);
router.post("/api/admin/public-user-counter/reset", oauthAuthentication, resetAdminPublicUserCounterAction);

export default router;
