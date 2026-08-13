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
  resumeS3CacheHeaderMigrationAction,
  cancelS3CacheHeaderMigrationAction,
  getLatestS3CacheHeaderMigrationJobAction,
  getS3CacheHeaderMigrationJobAction,
  getSupportedS3CacheScopesAction,
} from "../controller/systemSettings/s3CacheHeaderMigrationController.js";
import {
  getLatestS3KeyMigrationJobAction,
  getS3KeyMigrationJobAction,
  getS3KeyMigrationRunsAction,
  getS3KeyMigrationScopesAction,
  pauseS3KeyMigrationJobAction,
  cancelS3KeyMigrationJobAction,
  startS3KeyMigrationPlanAction,
  startS3KeyMigrationCopyAction,
  startS3KeyMigrationVerifyS3Action,
  startS3KeyMigrationRewriteAction,
  startS3KeyMigrationVerifyAction,
} from "../controller/systemSettings/s3KeyMigrationController.js";
// Temporarily hidden. Uncomment to restore WebP migration admin routes.
// import {
//   cancelBusinessWebpMigrationAction,
//   getBusinessWebpMigrationJobAction,
//   getLatestBusinessWebpMigrationJobAction,
//   pauseBusinessWebpMigrationAction,
//   startBusinessWebpMigrationAction,
// } from "../controller/systemSettings/businessWebpMigrationController.js";

const router = express.Router();

router.get(
  "/api/admin/system-settings",
  oauthAuthentication,
  getSystemSettingsAction,
);
router.put(
  "/api/admin/system-settings",
  oauthAuthentication,
  updateSystemSettingsAction,
);

// S3 Cache Header Migration routes
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/start",
  requireAdminAuth(),
  startS3CacheHeaderMigrationAction,
);
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/pause",
  requireAdminAuth(),
  pauseS3CacheHeaderMigrationAction,
);
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/resume",
  requireAdminAuth(),
  resumeS3CacheHeaderMigrationAction,
);
router.post(
  "/api/admin/system-settings/s3-cache-header-migration/cancel",
  requireAdminAuth(),
  cancelS3CacheHeaderMigrationAction,
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/latest",
  requireAdminAuth(),
  getLatestS3CacheHeaderMigrationJobAction,
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/scopes",
  requireAdminAuth(),
  getSupportedS3CacheScopesAction,
);
router.get(
  "/api/admin/system-settings/s3-cache-header-migration/:jobId",
  requireAdminAuth(),
  getS3CacheHeaderMigrationJobAction,
);

// S3 Key Restructure (2.2/2.3) routes. The start actions (2026-08-13) spawn the CLI
// script as a child process — see helper/s3Migration/s3KeyMigrationRunner.js — rather
// than reimplementing its logic in-process. reverse/rollback-copies/doctor/resume are
// a deliberate later phase and stay CLI-only for now.
router.get(
  "/api/admin/system-settings/s3-key-migration/latest",
  requireAdminAuth(),
  getLatestS3KeyMigrationJobAction,
);
router.get(
  "/api/admin/system-settings/s3-key-migration/runs",
  requireAdminAuth(),
  getS3KeyMigrationRunsAction,
);
router.get(
  "/api/admin/system-settings/s3-key-migration/scopes",
  requireAdminAuth(),
  getS3KeyMigrationScopesAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/pause",
  requireAdminAuth(),
  pauseS3KeyMigrationJobAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/cancel",
  requireAdminAuth(),
  cancelS3KeyMigrationJobAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/plan",
  requireAdminAuth(),
  startS3KeyMigrationPlanAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/copy",
  requireAdminAuth(),
  startS3KeyMigrationCopyAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/verify-s3",
  requireAdminAuth(),
  startS3KeyMigrationVerifyS3Action,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/rewrite",
  requireAdminAuth(),
  startS3KeyMigrationRewriteAction,
);
router.post(
  "/api/admin/system-settings/s3-key-migration/verify",
  requireAdminAuth(),
  startS3KeyMigrationVerifyAction,
);
router.get(
  "/api/admin/system-settings/s3-key-migration/:jobId",
  requireAdminAuth(),
  getS3KeyMigrationJobAction,
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
