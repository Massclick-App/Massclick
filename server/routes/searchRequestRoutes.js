import express from "express";
import {
  createSearchRequestAction, deleteSearchRequestAction, getSearchRequestAction,
  listSearchRequestsAction, updateSearchRequestAction,
} from "../controller/searchRequest/searchRequestController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import { leadRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
router.post("/api/search-requests", leadRateLimit, oauthAuthentication, createSearchRequestAction);
router.get("/api/admin/search-requests", requireAdminAuth(), listSearchRequestsAction);
router.get("/api/admin/search-requests/:id", requireAdminAuth(), getSearchRequestAction);
router.patch("/api/admin/search-requests/:id/status", requireAdminAuth(), updateSearchRequestAction);
router.delete("/api/admin/search-requests/:id", requireAdminAuth(), deleteSearchRequestAction);

export default router;
