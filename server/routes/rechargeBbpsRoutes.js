import express from "express";
import { fetchLiveBillAction } from "../controller/recharge/rechargeBbpsController.js";
import { paymentRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use("/api/recharge/bbps", paymentRateLimit);

router.post("/api/recharge/bbps/fetch-bill", fetchLiveBillAction);

export default router;
