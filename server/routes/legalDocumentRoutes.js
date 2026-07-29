import express from "express";

import {
  addLegalDocumentAction,
  createLegalDocumentVersionAction,
  deleteLegalDocumentAction,
  publishLegalDocumentAction,
  updateLegalDocumentAction,
  viewAllLegalDocumentsAction,
  viewAllPublishedLegalDocumentsAction,
  viewLegalDocumentAction,
  viewPublishedLegalDocumentAction,
} from "../controller/legal/legalDocumentController.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";

const router = express.Router();

// ── Public reads ──────────────────────────────────────────────────────────────
// Deliberately unauthenticated: the Play Store and App Store both require a
// publicly reachable privacy policy URL, and the mobile app has to be able to
// show these before a user logs in.
router.get("/api/legal-documents/published", viewAllPublishedLegalDocumentsAction);
router.get("/api/legal-documents/published/:type", viewPublishedLegalDocumentAction);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/api/admin/legal-documents", requireAdminAuth(), viewAllLegalDocumentsAction);
router.get("/api/admin/legal-documents/:id", requireAdminAuth(), viewLegalDocumentAction);
router.post("/api/admin/legal-documents", requireAdminAuth(), addLegalDocumentAction);
router.put("/api/admin/legal-documents/:id", requireAdminAuth(), updateLegalDocumentAction);
router.post(
  "/api/admin/legal-documents/:id/new-version",
  requireAdminAuth(),
  createLegalDocumentVersionAction
);
router.post(
  "/api/admin/legal-documents/:id/publish",
  requireAdminAuth(),
  publishLegalDocumentAction
);
router.delete("/api/admin/legal-documents/:id", requireAdminAuth(), deleteLegalDocumentAction);

export default router;
