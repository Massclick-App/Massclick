import express from "express";
import {
  addAgreementAction,
  deleteAgreementAction,
  updateAgreementAction,
  viewAllAgreementsAction,
  viewAgreementAction,
  nextAgreementNoAction,
  uploadAgreementPdfAction,
  viewAgreementPdfAction,
} from "../controller/agreement/agreementController.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";

const router = express.Router();
router.put(
  "/api/agreement/pdf/:id",
  requireAdminAuth(),
  uploadAgreementPdfAction,
);
router.get(
  "/api/agreement/pdf/:id",
  requireAdminAuth(),
  viewAgreementPdfAction,
);
router.get(
  "/api/agreement/next-number",
  requireAdminAuth(),
  nextAgreementNoAction,
);

router.post("/api/agreement/create", requireAdminAuth(), addAgreementAction);
router.get("/api/agreement/view/:id", requireAdminAuth(), viewAgreementAction);
router.get(
  "/api/agreement/viewall",
  requireAdminAuth(),
  viewAllAgreementsAction,
);
router.put(
  "/api/agreement/update/:id",
  requireAdminAuth(),
  updateAgreementAction,
);
router.delete(
  "/api/agreement/delete/:id",
  requireAdminAuth(),
  deleteAgreementAction,
);

export default router;
