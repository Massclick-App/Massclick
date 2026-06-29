import express from "express";
import { createPaymentAction, checkPaymentStatusAction, sendInvoiceEmailAction } from "../controller/PhonePay/phonePayController.js";
import { paymentRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use("/api/phonepe", paymentRateLimit);

router.post("/api/phonepe/create",  createPaymentAction);
router.get("/api/phonepe/status/:transactionId", checkPaymentStatusAction);
router.post("/api/phonepe/send-invoice", sendInvoiceEmailAction);

export default router;
