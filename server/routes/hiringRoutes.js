import express from "express";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import {
  createJobAction, deleteJobAction, getJobFiltersAction, getPublicJobAction,
  listAdminJobsAction, listApplicationsAction, listPublicJobsAction,
  submitApplicationAction, updateApplicationAction, updateJobAction,
} from "../controller/hiring/hiringController.js";

const router = express.Router();
router.get("/api/hiring/jobs", listPublicJobsAction);
router.get("/api/hiring/filters", getJobFiltersAction);
router.get("/api/hiring/jobs/:idOrSlug", getPublicJobAction);
router.post("/api/hiring/jobs/:jobId/applications", submitApplicationAction);
router.get("/api/admin/hiring/jobs", requireAdminAuth(), listAdminJobsAction);
router.post("/api/admin/hiring/jobs", requireAdminAuth(), createJobAction);
router.put("/api/admin/hiring/jobs/:id", requireAdminAuth(), updateJobAction);
router.delete("/api/admin/hiring/jobs/:id", requireAdminAuth(), deleteJobAction);
router.get("/api/admin/hiring/applications", requireAdminAuth(), listApplicationsAction);
router.put("/api/admin/hiring/applications/:id", requireAdminAuth(), updateApplicationAction);
export default router;
