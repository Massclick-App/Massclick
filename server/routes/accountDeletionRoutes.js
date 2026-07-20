import express from "express";
import { requestAccountDeletion } from "../controller/accountDeletion/accountDeletionController.js";
import { requireAuthPolicy } from "../auth/authMiddleware.js";
import { authRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post(
  "/api/account-deletion/request",
  authRateLimit,
  requireAuthPolicy("account.deletion.request"),
  requestAccountDeletion
);

export default router;
