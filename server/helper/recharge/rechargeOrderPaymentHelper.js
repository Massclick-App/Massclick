import crypto from "crypto";
import axios from "axios";
import rechargeOrderModel from "../../model/recharge/rechargeOrderModel.js";
import {
  getPhonePeGatewayConfig,
  assertPhonePeEnabled,
  assertLegacyPhonePeConfig,
  assertStandardPhonePeConfig,
  getPhonePeStandardAuthToken,
} from "../PhonePay/phonePayHelper.js";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

const normalizeRechargeAmount = (amount) => {
  const value = Number(amount);
  if (!value || Number.isNaN(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) {
    throw new Error(`Amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}`);
  }
  return Math.round(value * 100) / 100;
};

const createLegacyRechargeOrderPayment = async (transactionId, amount, redirectUrl, config) => {
  assertLegacyPhonePeConfig(config);

  const payload = {
    merchantId: config.legacyMerchantId,
    merchantTransactionId: transactionId,
    merchantUserId: "guest_user",
    amount: Math.round(amount * 100),
    redirectUrl,
    redirectMode: "REDIRECT",
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum =
    crypto
      .createHash("sha256")
      .update(data + "/pg/v1/pay" + config.legacySaltKey)
      .digest("hex") +
    "###" +
    config.legacySaltIndex;

  const response = await axios.post(
    `${config.legacyBaseUrl}/pg/v1/pay`,
    { request: data },
    {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        accept: "application/json",
      },
      timeout: 30000,
    },
  );

  return {
    paymentUrl: response.data?.data?.instrumentResponse?.redirectInfo?.url || "",
    orderId: null,
    responseData: { phonePeMode: "legacy_v1", phonePeEnvironment: config.environment, phonePeResponse: response.data },
  };
};

const createStandardCheckoutRechargeOrderPayment = async (transactionId, amount, redirectUrl, config) => {
  assertStandardPhonePeConfig(config);

  const token = await getPhonePeStandardAuthToken(config);
  const payload = {
    merchantOrderId: transactionId,
    amount: Math.round(amount * 100),
    paymentFlow: {
      type: "PG_CHECKOUT",
      message: "Massclick bill payment",
      merchantUrls: { redirectUrl },
    },
  };

  const response = await axios.post(`${config.checkoutBaseUrl}/checkout/v2/pay`, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `${token.tokenType} ${token.accessToken}`,
    },
    timeout: 30000,
  });

  return {
    paymentUrl: response.data?.redirectUrl || "",
    orderId: response.data?.orderId || null,
    responseData: { phonePeMode: "standard_checkout_v2", phonePeEnvironment: config.environment, phonePeResponse: response.data },
  };
};

export const createRechargeOrderPayment = async ({ serviceSlug, serviceName, serviceGroup, billDetails, amount }) => {
  if (!serviceSlug || !serviceName) {
    throw new Error("serviceSlug and serviceName are required");
  }

  const normalizedAmount = normalizeRechargeAmount(amount);
  const config = await getPhonePeGatewayConfig();
  assertPhonePeEnabled(config);

  const transactionId = `rtxn_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const redirectUrl = `${config.redirectBaseUrl}/recharge-status/${transactionId}`;

  const gatewayResult = config.mode === "standard_checkout_v2"
    ? await createStandardCheckoutRechargeOrderPayment(transactionId, normalizedAmount, redirectUrl, config)
    : await createLegacyRechargeOrderPayment(transactionId, normalizedAmount, redirectUrl, config);

  if (!gatewayResult.paymentUrl) {
    throw new Error("PhonePe did not return a payment URL");
  }

  const order = await rechargeOrderModel.create({
    serviceSlug,
    serviceName,
    serviceGroup: serviceGroup || "",
    billDetails: billDetails || {},
    amount: normalizedAmount,
    transactionId,
    orderId: gatewayResult.orderId,
    paymentGateway: "phonepe",
    paymentStatus: "PENDING",
    paymentUrl: gatewayResult.paymentUrl,
    responseData: gatewayResult.responseData,
  });

  return {
    success: true,
    transactionId,
    orderId: order.orderId,
    amount: normalizedAmount,
    paymentUrl: gatewayResult.paymentUrl,
  };
};

export const checkRechargeOrderPaymentStatus = async (transactionId) => {
  const order = await rechargeOrderModel.findOne({ transactionId });
  if (!order) {
    const error = new Error("Recharge order not found");
    error.statusCode = 404;
    throw error;
  }

  const config = await getPhonePeGatewayConfig();
  assertPhonePeEnabled(config);
  const mode = order.responseData?.phonePeMode || config.mode;

  let response;
  let status;
  let orderId = null;

  if (mode === "standard_checkout_v2") {
    assertStandardPhonePeConfig(config);
    const token = await getPhonePeStandardAuthToken(config);
    response = await axios.get(`${config.checkoutBaseUrl}/checkout/v2/order/${transactionId}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: `${token.tokenType} ${token.accessToken}`,
      },
      timeout: 30000,
    });
    status = response.data?.state || "FAILED";
    orderId = response.data?.orderId || null;
  } else {
    assertLegacyPhonePeConfig(config);
    const checksum =
      crypto
        .createHash("sha256")
        .update(`/pg/v1/status/${config.legacyMerchantId}/${transactionId}` + config.legacySaltKey)
        .digest("hex") +
      "###" +
      config.legacySaltIndex;

    response = await axios.get(`${config.legacyBaseUrl}/pg/v1/status/${config.legacyMerchantId}/${transactionId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": config.legacyMerchantId,
      },
      timeout: 30000,
    });
    status = response.data?.data?.state || "FAILED";
  }

  const paymentStatus = status === "COMPLETED" ? "SUCCESS" : status === "FAILED" ? "FAILED" : "PENDING";
  const responseData = { phonePeMode: mode, phonePeEnvironment: config.environment, phonePeResponse: response.data };

  order.paymentStatus = paymentStatus;
  order.responseData = responseData;
  order.paymentDate = new Date();
  if (orderId) order.orderId = orderId;
  await order.save();

  return {
    success: true,
    transactionId,
    paymentStatus,
    orderId: order.orderId,
    amount: order.amount,
    serviceSlug: order.serviceSlug,
    serviceName: order.serviceName,
    billDetails: order.billDetails,
  };
};
