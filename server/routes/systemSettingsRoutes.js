import express from "express";
import {
  getSystemSettingsAction,
  updateSystemSettingsAction,
} from "../controller/systemSettings/systemSettingsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.get("/api/admin/system-settings", oauthAuthentication, getSystemSettingsAction);
router.put("/api/admin/system-settings", oauthAuthentication, updateSystemSettingsAction);

export default router;
