import express from "express";
import {
  getSystemSettingsAction,
  updateSystemSettingsAction,
} from "../controller/systemSettings/systemSettingsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import {
  startS3CacheHeaderMigrationAction,
  pauseS3CacheHeaderMigrationAction,
  cancelS3CacheHeaderMigrationAction,
  getLatestS3CacheHeaderMigrationJobAction,
  getS3CacheHeaderMigrationJobAction,
  getSupportedS3CacheScopesAction,
} from "../controller/systemSettings/s3CacheHeaderMigrationController.js";
// Temporarily hidden. Uncomment to restore WebP migration admin routes.
// import {
//   cancelBusinessWebpMigrationAction,
//   getBusinessWebpMigrationJobAction,
//   getLatestBusinessWebpMigrationJobAction,
//   pauseBusinessWebpMigrationAction,
//   startBusinessWebpMigrationAction,
// } from "../controller/systemSettings/businessWebpMigrationController.js";

const router = express.Router();

router.get("/api/admin/system-settings", oauthAuthentication, getSystemSettingsAction);
router.put("/api/admin/system-settings", oauthAuthentication, updateSystemSettingsAction);

// S3 Cache Header Migration routes
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/start",
  requireAdminAuth(),
  startS3CacheHeaderMigrationAction
);
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/pause",
  requireAdminAuth(),
  pauseS3CacheHeaderMigrationAction
);
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/cancel",
  requireAdminAuth(),
  cancelS3CacheHeaderMigrationAction
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/latest",
  requireAdminAuth(),
  getLatestS3CacheHeaderMigrationJobAction
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/scopes",
  requireAdminAuth(),
  getSupportedS3CacheScopesAction
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/:jobId",
  requireAdminAuth(),
  getS3CacheHeaderMigrationJobAction
);

// router.post(
//   "/api/admin/system-settings/businesslist-webp-migration/start",
//   requireAdminAuth(),
//   startBusinessWebpMigrationAction
// );
// router.post(
//   "/api/admin/system-settings/businesslist-webp-migration/pause",
//   requireAdminAuth(),
//   pauseBusinessWebpMigrationAction
// );
// router.post(
//   "/api/admin/system-settings/businesslist-webp-migration/cancel",
//   requireAdminAuth(),
//   cancelBusinessWebpMigrationAction
// );
// router.get(
//   "/api/admin/system-settings/businesslist-webp-migration/latest",
//   requireAdminAuth(),
//   getLatestBusinessWebpMigrationJobAction
// );
// router.get(
//   "/api/admin/system-settings/businesslist-webp-migration/:jobId",
//   requireAdminAuth(),
//   getBusinessWebpMigrationJobAction
// );

export default router;
