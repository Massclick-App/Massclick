import express from "express";
import {
  authAuditAction,
  authIntrospectAction,
  authOverviewAction,
  authSessionsAction,
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
  "/api/admin/auth/introspect",
  requireAdminAuth("auth.admin.introspect"),
  authIntrospectAction
);
router.get(
  "/api/admin/auth/audit",
  requireAdminAuth("auth.admin.audit"),
  authAuditAction
);

export default router;
