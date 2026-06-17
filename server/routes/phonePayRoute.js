import express from "express";
import { createPaymentAction, checkPaymentStatusAction } from "../controller/PhonePay/phonePayController.js";
import { paymentRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use("/api/phonepe", paymentRateLimit);

router.post("/api/phonepe/create",  createPaymentAction);
router.get("/api/phonepe/status/:transactionId", checkPaymentStatusAction);

export default router;
