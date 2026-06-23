import express from "express";
import {
  getSystemSettingsAction,
  updateSystemSettingsAction,
} from "../controller/systemSettings/systemSettingsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import {
  getBusinessWebpMigrationJobAction,
  getLatestBusinessWebpMigrationJobAction,
  startBusinessWebpMigrationAction,
} from "../controller/systemSettings/businessWebpMigrationController.js";

const router = express.Router();

router.get("/api/admin/system-settings", oauthAuthentication, getSystemSettingsAction);
router.put("/api/admin/system-settings", oauthAuthentication, updateSystemSettingsAction);
router.post(
  "/api/admin/system-settings/businesslist-webp-migration/start",
  requireAdminAuth(),
  startBusinessWebpMigrationAction
);
router.get(
  "/api/admin/system-settings/businesslist-webp-migration/latest",
  requireAdminAuth(),
  getLatestBusinessWebpMigrationJobAction
);
router.get(
  "/api/admin/system-settings/businesslist-webp-migration/:jobId",
  requireAdminAuth(),
  getBusinessWebpMigrationJobAction
);

export default router;
