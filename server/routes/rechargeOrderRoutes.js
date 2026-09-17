import express from "express";
import { createRechargeOrderAction, checkRechargeOrderStatusAction } from "../controller/recharge/rechargeOrderController.js";
import { paymentRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use("/api/recharge/orders", paymentRateLimit);

router.post("/api/recharge/orders", createRechargeOrderAction);
router.get("/api/recharge/orders/:transactionId/status", checkRechargeOrderStatusAction);

export default router;
