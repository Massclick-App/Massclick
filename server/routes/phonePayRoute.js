import express from "express";
import { createPaymentAction, checkPaymentStatusAction } from "../controller/PhonePay/phonePayController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.post("/api/phonepe/create",  createPaymentAction);
router.get("/api/phonepe/status/:transactionId", checkPaymentStatusAction);

export default router;
