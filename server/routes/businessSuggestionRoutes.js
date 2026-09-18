import express from "express";
import {
  approveBusinessSuggestionAction,
  createBusinessSuggestionAction,
  listBusinessSuggestionsAction,
  pendingSuggestionCountAction,
  rejectBusinessSuggestionAction,
} from "../controller/businessSuggestion/businessSuggestionController.js";
import { createHttpAuthMiddleware, requireAdminAuth } from "../auth/authMiddleware.js";
import { leadRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Logged-in customers only: suggestions carry the submitter's identity so the
// review team can follow up, and it keeps anonymous spam out of the queue.
const requireCustomerAuth = createHttpAuthMiddleware({
  allowedActorTypes: ["customer"],
  source: "business-suggestion",
});

router.post("/api/business/:id/suggestions", leadRateLimit, requireCustomerAuth, createBusinessSuggestionAction);

router.get("/api/admin/business-suggestions", requireAdminAuth(), listBusinessSuggestionsAction);
router.get("/api/admin/business-suggestions/pending-count", requireAdminAuth(), pendingSuggestionCountAction);
router.post("/api/admin/business-suggestions/:id/approve", requireAdminAuth(), approveBusinessSuggestionAction);
router.post("/api/admin/business-suggestions/:id/reject", requireAdminAuth(), rejectBusinessSuggestionAction);

export default router;
