import express from "express";
import {
  createUserFeedbackAction,
  listUserFeedbackAction,
  updateUserFeedbackStatusAction,
} from "../controller/userFeedback/userFeedbackController.js";
import { createHttpAuthMiddleware, requireAdminAuth } from "../auth/authMiddleware.js";

const router = express.Router();

const requireCustomerFeedbackAuth = createHttpAuthMiddleware({
  allowedActorTypes: ["customer", "admin"],
  source: "user-feedback",
});

router.post("/api/user-feedback", requireCustomerFeedbackAuth, createUserFeedbackAction);
router.get("/api/admin/user-feedback", requireAdminAuth(), listUserFeedbackAction);
router.patch("/api/admin/user-feedback/:id", requireAdminAuth(), updateUserFeedbackStatusAction);

export default router;
