import express from "express";
import {
  adminUserLogoutAction,
  adminUserRecoveryAction,
  adminUsersAction,
  adminUsersLogoutAllAction,
  authAuditAction,
  authIntrospectAction,
  authOverviewAction,
  authSessionRevokeAction,
  authSessionsAction,
  customerLogoutAction,
  customerLogoutAllAction,
  customerRecoveryAction,
  customerSessionsAction,
} from "../controller/authAdminController.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";

const router = express.Router();

router.get(
  "/api/admin/auth/overview",
  requireAdminAuth("auth.admin.overview"),
  authOverviewAction
);
router.get(
  "/api/admin/auth/sessions",
  requireAdminAuth("auth.admin.sessions"),
  authSessionsAction
);
router.post(
  "/api/admin/auth/sessions/:id/revoke",
  requireAdminAuth("auth.admin.session-revoke"),
  authSessionRevokeAction
);
router.get(
  "/api/admin/auth/admin-users",
  requireAdminAuth("auth.admin.admin-users"),
  adminUsersAction
);
router.post(
  "/api/admin/auth/admin-users/logout-all",
  requireAdminAuth("auth.admin.admin-user-logout-all"),
  adminUsersLogoutAllAction
);
router.post(
  "/api/admin/auth/admin-users/:id/logout",
  requireAdminAuth("auth.admin.admin-user-logout"),
  adminUserLogoutAction
);
router.post(
  "/api/admin/auth/admin-users/:id/recover",
  requireAdminAuth("auth.admin.admin-user-recover"),
  adminUserRecoveryAction
);
router.post(
  "/api/admin/auth/introspect",
  requireAdminAuth("auth.admin.introspect"),
  authIntrospectAction
);
router.get(
  "/api/admin/auth/audit",
  requireAdminAuth("auth.admin.audit"),
  authAuditAction
);
router.get(
  "/api/admin/auth/customers",
  requireAdminAuth("auth.admin.customer-sessions"),
  customerSessionsAction
);
router.post(
  "/api/admin/auth/customers/logout",
  requireAdminAuth("auth.admin.customer-logout"),
  customerLogoutAction
);
router.post(
  "/api/admin/auth/customers/recover",
  requireAdminAuth("auth.admin.customer-recover"),
  customerRecoveryAction
);
router.post(
  "/api/admin/auth/customers/logout-all",
  requireAdminAuth("auth.admin.customer-logout-all"),
  customerLogoutAllAction
);

export default router;
