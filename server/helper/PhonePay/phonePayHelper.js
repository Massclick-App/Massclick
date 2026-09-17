/* global process, Buffer */
import crypto from "crypto";
import axios from "axios";
import paymentModel from "../../model/phonePay/paymentModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendInvoiceEmail } from "../email/emailService.js";
import { CERTIFICATE_TEMPLATE_VERSION, ensureBusinessCertificates } from "../businessList/businessCertificateHelper.js";
import { getSettings } from "../systemSettings/settingsService.js";

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_BASE_URL,
  FRONTEND_URL,
} = process.env;

const PREMIUM_MEMBERSHIP_BASE_AMOUNT = 24000;
const GST_RATE_PERCENT = 18;
const DEFAULT_PHONEPE_LEGACY_BASE_URL = "https://api.phonepe.com/apis/hermes";
const DEFAULT_FRONTEND_URL = "http://localhost:3000";
const PHONEPE_STANDARD_ENDPOINTS = {
  sandbox: {
    oauthBaseUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox",
    checkoutBaseUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
  production: {
    oauthBaseUrl: "https://api.phonepe.com/apis/identity-manager",
    checkoutBaseUrl: "https://api.phonepe.com/apis/pg",
  },
};
const tokenCache = {
  cacheKey: "",
  accessToken: "",
  tokenType: "O-Bearer",
  expiresAtMs: 0,
};

const normalizePremiumMembershipAmount = (amount) => {
  const requestedAmount = Number(amount || 0);

  return requestedAmount === PREMIUM_MEMBERSHIP_BASE_AMOUNT
    ? requestedAmount
    : PREMIUM_MEMBERSHIP_BASE_AMOUNT;
};

const getPremiumMembershipAmounts = () => {
  const amount = PREMIUM_MEMBERSHIP_BASE_AMOUNT;
  const gstAmount = parseFloat((amount * (GST_RATE_PERCENT / 100)).toFixed(2));
  const totalAmount = parseFloat((amount + gstAmount).toFixed(2));

  return { amount, gstAmount, totalAmount };
};

// Paid businesses automatically receive verified + trust status so their
// certificates exist by the time the invoice email builds its attachments.
// Conditional filters keep admin-set verification (verifiedBy etc.) untouched.
const ensurePaidBusinessBadges = async (businessId) => {
  const now = new Date();
  const verifiedResult = await businessListModel.updateOne(
    { _id: businessId, "verification.isVerified": { $ne: true } },
    {
      $set: {
        "verification.isVerified": true,
        "verification.verifiedAt": now,
        "verification.verificationType": "AUTO",
      },
    },
  );
  const trustResult = await businessListModel.updateOne(
    { _id: businessId, "badges.isTrust": { $ne: true } },
    { $set: { "badges.isTrust": true } },
  );

  if (verifiedResult.modifiedCount || trustResult.modifiedCount) {
    console.log(
      `🏅 [Paid Badges] Auto-updated badges for business ${businessId} - verified: ${!!verifiedResult.modifiedCount}, trust: ${!!trustResult.modifiedCount}`,
    );
  }
};

const hasPremiumAmountMismatch = (payment = {}) => {
  const expected = getPremiumMembershipAmounts();

  return Number(payment.amount || 0) !== expected.amount
    || Number(payment.gstAmount || 0) !== expected.gstAmount
    || Number(payment.totalAmount || 0) !== expected.totalAmount;
};

const normalizeBaseUrl = (value, fallback) => String(value || fallback || "").trim().replace(/\/+$/, "");

const getPhonePeGatewayConfig = async () => {
  const settings = await getSettings();
  const environment = ["sandbox", "production"].includes(settings.phonepe_environment)
    ? settings.phonepe_environment
    : "sandbox";
  const mode = ["legacy_v1", "standard_checkout_v2"].includes(settings.phonepe_integration_mode)
    ? settings.phonepe_integration_mode
    : "legacy_v1";
  const endpoints = PHONEPE_STANDARD_ENDPOINTS[environment];

  return {
    enabled: settings.phonepe_gateway_enabled !== false,
    mode,
    environment,
    clientId: String(settings.phonepe_client_id || process.env.PHONEPE_CLIENT_ID || "").trim(),
    clientSecret: String(settings.phonepe_client_secret || process.env.PHONEPE_CLIENT_SECRET || "").trim(),
    clientVersion: String(settings.phonepe_client_version || process.env.PHONEPE_CLIENT_VERSION || "1").trim(),
    redirectBaseUrl: normalizeBaseUrl(settings.phonepe_redirect_base_url, process.env.FRONTEND_URL || FRONTEND_URL || DEFAULT_FRONTEND_URL),
    oauthBaseUrl: endpoints.oauthBaseUrl,
    checkoutBaseUrl: endpoints.checkoutBaseUrl,
    legacyMerchantId: String(settings.phonepe_legacy_merchant_id || process.env.PHONEPE_MERCHANT_ID || PHONEPE_MERCHANT_ID || "").trim(),
    legacySaltKey: String(settings.phonepe_legacy_salt_key || process.env.PHONEPE_SALT_KEY || PHONEPE_SALT_KEY || "").trim(),
    legacySaltIndex: String(settings.phonepe_legacy_salt_index || process.env.PHONEPE_SALT_INDEX || PHONEPE_SALT_INDEX || "1").trim(),
    legacyBaseUrl: normalizeBaseUrl(settings.phonepe_legacy_base_url, process.env.PHONEPE_BASE_URL || PHONEPE_BASE_URL || DEFAULT_PHONEPE_LEGACY_BASE_URL),
  };
};

const assertPhonePeEnabled = (config) => {
  if (!config.enabled) {
    throw new Error("PhonePe payment gateway is disabled");
  }
};

const assertLegacyPhonePeConfig = (config) => {
  if (!config.legacyMerchantId || !config.legacySaltKey || !config.legacySaltIndex || !config.legacyBaseUrl) {
    throw new Error("PhonePe legacy merchant id, salt key, salt index, and base URL are required");
  }
};

const assertStandardPhonePeConfig = (config) => {
  if (!config.clientId || !config.clientSecret || !config.clientVersion) {
    throw new Error("PhonePe Client ID, Client Secret, and Client Version are required");
  }
};

const getPhonePeStandardAuthToken = async (config, forceRefresh = false) => {
  assertStandardPhonePeConfig(config);

  const cacheKey = `${config.environment}:${config.clientId}:${config.clientVersion}`;
  const now = Date.now();
  if (
    !forceRefresh
    && tokenCache.cacheKey === cacheKey
    && tokenCache.accessToken
    && tokenCache.expiresAtMs - now > 60_000
  ) {
    return {
      accessToken: tokenCache.accessToken,
      tokenType: tokenCache.tokenType,
      expiresAtMs: tokenCache.expiresAtMs,
    };
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_version: config.clientVersion,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  });

  const response = await axios.post(
    `${config.oauthBaseUrl}/v1/oauth/token`,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 15000,
    },
  );

  const accessToken = response.data?.access_token;
  if (!accessToken) {
    throw new Error("PhonePe auth response did not include an access token");
  }

  const expiresAtMs = Number(response.data?.expires_at || 0) * 1000 || now + 45 * 60 * 1000;
  const tokenType = response.data?.token_type || "O-Bearer";

  tokenCache.cacheKey = cacheKey;
  tokenCache.accessToken = accessToken;
  tokenCache.tokenType = tokenType;
  tokenCache.expiresAtMs = expiresAtMs;

  return { accessToken, tokenType, expiresAtMs };
};

export const checkPhonePeStandardCheckoutAuth = async () => {
  const config = await getPhonePeGatewayConfig();
  assertPhonePeEnabled(config);
  assertStandardPhonePeConfig(config);

  const token = await getPhonePeStandardAuthToken(config, true);
  return {
    environment: config.environment,
    tokenType: token.tokenType,
    expiresAt: new Date(token.expiresAtMs).toISOString(),
  };
};

const createLegacyPhonePePayment = async (amount, userId, businessId = null, config) => {
  try {
    assertLegacyPhonePeConfig(config);
    const baseAmount = normalizePremiumMembershipAmount(amount);

    console.log(`💳 [PhonePe Payment] Creating payment - Amount: ₹${amount}, UserId: ${userId}, BusinessId: ${businessId}`);
    if (!baseAmount || isNaN(baseAmount)) {
      console.error(`❌ [PhonePe Payment] Invalid amount: ${amount}`);
      throw new Error("Invalid amount value");
    }

    const transactionId = `txn_${Date.now()}`;
    console.log(`🆔 [PhonePe Payment] Generated TransactionId: ${transactionId}`);

    const { gstAmount, totalAmount } = getPremiumMembershipAmounts();
    console.log(`💰 [PhonePe Payment] Amount Breakdown - Base: ₹${baseAmount}, GST(18%): ₹${gstAmount}, Total: ₹${totalAmount}`);

    const payload = {
      merchantId: config.legacyMerchantId,
      merchantTransactionId: transactionId,
      merchantUserId: userId || "guest_user",
      amount: Math.round(totalAmount * 100),
      redirectUrl: `${config.redirectBaseUrl}/payment-status/${transactionId}`,
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    console.log(`📤 [PhonePe Payment] Sending payment request to PhonePe API`);
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
      }
    );

    console.log(`📥 [PhonePe Payment] Received response from PhonePe API`);

    const paymentUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url || "";
    const qrString =
      response.data?.data?.instrumentResponse?.redirectInfo?.qrCode || "";

    console.log(`🎫 [PhonePe Payment] Creating payment record in database`);
    const paymentDoc = await paymentModel.create({
      userId,
      businessId,
      transactionId,
      amount: baseAmount,
      gstAmount,
      totalAmount,
      paymentUrl,
      qrString,
      paymentStatus: "PENDING",
      paymentGateway: "phonepe",
      responseData: {
        phonePeMode: "legacy_v1",
        phonePeEnvironment: config.environment,
        phonePeResponse: response.data,
      },
    });

    console.log(`✅ [PhonePe Payment] Payment record created - ID: ${paymentDoc._id}, Status: PENDING`);

    if (businessId) {
  console.log(`🏢 [PhonePe Payment] Updating business record with payment details - BusinessId: ${businessId}`);
  const existingBusiness = await businessListModel.findById(businessId).lean();

  if (existingBusiness?.payment && existingBusiness.payment.length > 0) {
    console.log(`📝 [PhonePe Payment] Business has existing payment records, updating first entry`);
    await businessListModel.updateOne(
      { _id: businessId },
      {
        $set: {
          "payment.0": {
            userId,
            businessId,
            transactionId,
            orderId: null,
            amount: baseAmount,
            gstAmount,
            totalAmount,
            paymentGateway: "phonepe",
            paymentStatus: "PENDING",
            paymentDate: null,
            responseData: {
              phonePeMode: "legacy_v1",
              phonePeEnvironment: config.environment,
              phonePeResponse: response.data,
            },
          },
        },
      }
    );
    console.log(`✅ [PhonePe Payment] Updated existing payment record`);
  } else {
    console.log(`📝 [PhonePe Payment] Business has no payment records, creating new array`);
    await businessListModel.findByIdAndUpdate(
      businessId,
      {
        $set: {
          payment: [
            {
              userId,
              businessId,
              transactionId,
              orderId: null,
              amount: baseAmount,
              gstAmount,
              totalAmount,
              paymentGateway: "phonepe",
              paymentStatus: "PENDING",
              paymentDate: null,
              responseData: {
                phonePeMode: "legacy_v1",
                phonePeEnvironment: config.environment,
                phonePeResponse: response.data,
              },
            },
          ],
        },
      },
      { new: true, useFindAndModify: false }
    );
    console.log(`✅ [PhonePe Payment] Created new payment array`);
  }
}


    console.log(`✅ [PhonePe Payment] Payment creation completed successfully - TxnID: ${transactionId}, Amount: ₹${totalAmount}`);

    // Check if payment status is already successful and send email
    const paymentState = response.data?.data?.state;
    console.log(`📊 [PhonePe Payment] Payment state from API: ${paymentState}`);

    if (paymentState === "COMPLETED" && businessId) {
      try {
        console.log(`✅ [PhonePe Payment] Payment already COMPLETED, sending invoice email immediately`);
        const businessData = await businessListModel.findById(businessId).lean();
        if (businessData) {
          const emailResult = await sendInvoiceEmail(businessData, paymentDoc);
          console.log(`📧 [PhonePe Payment] Invoice email result: ${emailResult.success ? 'SUCCESS' : 'FAILED'}`);
          if (emailResult.success) {
            const invoiceEmailSentAt = new Date();
            await paymentModel.updateOne(
              { _id: paymentDoc._id },
              { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
            );
            await businessListModel.updateOne(
              { _id: businessId, "payment.transactionId": transactionId },
              {
                $set: {
                  "payment.$.invoiceEmailSent": true,
                  "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
                },
              }
            );
          }
        }
      } catch (emailError) {
        console.error(`⚠️ [PhonePe Payment] Failed to send email on payment creation:`, emailError.message);
      }
    }

    console.log(`🔗 [PhonePe Payment] Payment URL generated, ready for redirect`);
    return {
      success: true,
      message: "Payment created successfully",
      transactionId,
      totalAmount,
      paymentUrl,
      qrString,
    };
  } catch (error) {
    console.error(`❌ [PhonePe Payment] Error creating PhonePe payment:`, {
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      amount,
      userId,
      businessId,
      errorStack: error.stack,
    });
    throw new Error("PhonePe payment creation failed");
  }
};

const createStandardCheckoutPhonePePayment = async (amount, userId, businessId = null, config) => {
  try {
    assertStandardPhonePeConfig(config);
    const baseAmount = normalizePremiumMembershipAmount(amount);

    console.log(`💳 [PhonePe Payment] Creating Standard Checkout payment - Amount: ₹${amount}, UserId: ${userId}, BusinessId: ${businessId}`);
    if (!baseAmount || isNaN(baseAmount)) {
      console.error(`❌ [PhonePe Payment] Invalid amount: ${amount}`);
      throw new Error("Invalid amount value");
    }

    const transactionId = `txn_${Date.now()}`;
    console.log(`🆔 [PhonePe Payment] Generated TransactionId: ${transactionId}`);

    const { gstAmount, totalAmount } = getPremiumMembershipAmounts();
    console.log(`💰 [PhonePe Payment] Amount Breakdown - Base: ₹${baseAmount}, GST(18%): ₹${gstAmount}, Total: ₹${totalAmount}`);

    const token = await getPhonePeStandardAuthToken(config);
    const payload = {
      merchantOrderId: transactionId,
      amount: Math.round(totalAmount * 100),
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Massclick premium membership",
        merchantUrls: {
          redirectUrl: `${config.redirectBaseUrl}/payment-status/${transactionId}`,
        },
      },
    };

    console.log(`📤 [PhonePe Payment] Sending Standard Checkout request to PhonePe API`);
    const response = await axios.post(
      `${config.checkoutBaseUrl}/checkout/v2/pay`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token.tokenType} ${token.accessToken}`,
        },
        timeout: 30000,
      },
    );

    console.log(`📥 [PhonePe Payment] Received response from PhonePe API`);

    const paymentUrl = response.data?.redirectUrl || "";
    const orderId = response.data?.orderId || null;
    const responseData = {
      phonePeMode: "standard_checkout_v2",
      phonePeEnvironment: config.environment,
      phonePeResponse: response.data,
    };

    console.log(`🎫 [PhonePe Payment] Creating payment record in database`);
    const paymentDoc = await paymentModel.create({
      userId,
      businessId,
      transactionId,
      orderId,
      amount: baseAmount,
      gstAmount,
      totalAmount,
      paymentUrl,
      qrString: "",
      paymentStatus: "PENDING",
      paymentGateway: "phonepe",
      responseData,
    });

    console.log(`✅ [PhonePe Payment] Payment record created - ID: ${paymentDoc._id}, Status: PENDING`);

    if (businessId) {
      console.log(`🏢 [PhonePe Payment] Updating business record with payment details - BusinessId: ${businessId}`);
      const existingBusiness = await businessListModel.findById(businessId).lean();
      const paymentEntry = {
        userId,
        businessId,
        transactionId,
        orderId,
        amount: baseAmount,
        gstAmount,
        totalAmount,
        paymentGateway: "phonepe",
        paymentStatus: "PENDING",
        paymentDate: null,
        responseData,
      };

      if (existingBusiness?.payment && existingBusiness.payment.length > 0) {
        console.log(`📝 [PhonePe Payment] Business has existing payment records, updating first entry`);
        await businessListModel.updateOne(
          { _id: businessId },
          { $set: { "payment.0": paymentEntry } },
        );
        console.log(`✅ [PhonePe Payment] Updated existing payment record`);
      } else {
        console.log(`📝 [PhonePe Payment] Business has no payment records, creating new array`);
        await businessListModel.findByIdAndUpdate(
          businessId,
          { $set: { payment: [paymentEntry] } },
          { new: true, useFindAndModify: false },
        );
        console.log(`✅ [PhonePe Payment] Created new payment array`);
      }
    }

    const paymentState = response.data?.state;
    console.log(`📊 [PhonePe Payment] Payment state from API: ${paymentState}`);

    if (paymentState === "COMPLETED" && businessId) {
      try {
        console.log(`✅ [PhonePe Payment] Payment already COMPLETED, sending invoice email immediately`);
        const businessData = await businessListModel.findById(businessId).lean();
        if (businessData) {
          const emailResult = await sendInvoiceEmail(businessData, paymentDoc);
          console.log(`📧 [PhonePe Payment] Invoice email result: ${emailResult.success ? 'SUCCESS' : 'FAILED'}`);
          if (emailResult.success) {
            const invoiceEmailSentAt = new Date();
            await paymentModel.updateOne(
              { _id: paymentDoc._id },
              { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
            );
            await businessListModel.updateOne(
              { _id: businessId, "payment.transactionId": transactionId },
              {
                $set: {
                  "payment.$.invoiceEmailSent": true,
                  "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
                },
              }
            );
          }
        }
      } catch (emailError) {
        console.error(`⚠️ [PhonePe Payment] Failed to send email on payment creation:`, emailError.message);
      }
    }

    console.log(`🔗 [PhonePe Payment] Payment URL generated, ready for redirect`);
    return {
      success: true,
      message: "Payment created successfully",
      transactionId,
      orderId,
      totalAmount,
      paymentUrl,
      qrString: "",
    };
  } catch (error) {
    console.error(`❌ [PhonePe Payment] Error creating Standard Checkout payment:`, {
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      amount,
      userId,
      businessId,
      errorStack: error.stack,
    });
    throw new Error("PhonePe payment creation failed");
  }
};

export const createPhonePePayment = async (amount, userId, businessId = null) => {
  const config = await getPhonePeGatewayConfig();
  assertPhonePeEnabled(config);

  if (config.mode === "standard_checkout_v2") {
    return createStandardCheckoutPhonePePayment(amount, userId, businessId, config);
  }

  return createLegacyPhonePePayment(amount, userId, businessId, config);
};


export const checkPhonePeStatus = async (transactionId) => {
  try {
    console.log(`🔍 [PhonePe Status] Checking payment status for transaction: ${transactionId}`);
    const config = await getPhonePeGatewayConfig();
    assertPhonePeEnabled(config);
    const existingPayment = await paymentModel.findOne({ transactionId }).lean();
    const paymentMode = existingPayment?.responseData?.phonePeMode || config.mode;

    let response;
    let status;
    let orderId = null;

    if (paymentMode === "standard_checkout_v2") {
      assertStandardPhonePeConfig(config);
      const token = await getPhonePeStandardAuthToken(config);
      response = await axios.get(
        `${config.checkoutBaseUrl}/checkout/v2/order/${transactionId}/status`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `${token.tokenType} ${token.accessToken}`,
          },
          timeout: 30000,
        },
      );
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

      response = await axios.get(
        `${config.legacyBaseUrl}/pg/v1/status/${config.legacyMerchantId}/${transactionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            "X-MERCHANT-ID": config.legacyMerchantId,
          },
          timeout: 30000,
        }
      );
      status = response.data?.data?.state || "FAILED";
    }

    const normalizedPaymentStatus =
      status === "COMPLETED" ? "SUCCESS" : status === "FAILED" ? "FAILED" : "PENDING";
    const responseData = {
      phonePeMode: paymentMode,
      phonePeEnvironment: config.environment,
      phonePeResponse: response.data,
    };
    const paymentDate = new Date();

    console.log(`📊 [PhonePe Status] Transaction ${transactionId} - Status: ${normalizedPaymentStatus}`);

    const updated = await paymentModel.findOneAndUpdate(
      { transactionId },
      {
        paymentStatus: normalizedPaymentStatus,
        responseData,
        ...(orderId ? { orderId } : {}),
        paymentDate,
      },
      { new: true }
    );

    console.log(`💾 [Payment DB] Updated payment record - TxnID: ${transactionId}, Status: ${normalizedPaymentStatus}`);

    if (updated?.businessId) {
      console.log(`🏢 [Business Update] Updating business record for businessId: ${updated.businessId}`);
      const paymentEntryPatch = {
        "payment.$.paymentStatus": normalizedPaymentStatus,
        "payment.$.paymentDate": paymentDate,
        "payment.$.responseData": responseData,
      };
      if (orderId) paymentEntryPatch["payment.$.orderId"] = orderId;

      if (normalizedPaymentStatus === "SUCCESS") {
        paymentEntryPatch["payment.$.paid"] = true;
      }

      const businessResult = await businessListModel.updateOne(
        {
          _id: updated.businessId,
          "payment.transactionId": transactionId,
        },
        {
          $set: {
            ...paymentEntryPatch,
            ...(normalizedPaymentStatus === "SUCCESS"
              ? {
                  amountPaid: true,
                  paidDate: paymentDate,
                  businessesLive: true,
                  "subscription.isActive": true,
                  "subscription.startDate": paymentDate,
                }
              : {}),
          },
        }
      );

      console.log(`✅ [Business Update] Business record updated - Matched: ${businessResult.matchedCount}, Modified: ${businessResult.modifiedCount}`);

      if (!businessResult.matchedCount && normalizedPaymentStatus === "SUCCESS") {
        console.log(`⚠️ [Business Update] Payment record not found in array, applying fallback update`);
        await businessListModel.updateOne(
          { _id: updated.businessId },
          {
            $set: {
              amountPaid: true,
              paidDate: paymentDate,
              businessesLive: true,
              "subscription.isActive": true,
              "subscription.startDate": paymentDate,
            },
          }
        );
        console.log(`✅ [Business Update] Fallback update completed for businessId: ${updated.businessId}`);
      }

      if (normalizedPaymentStatus === "SUCCESS") {
        try {
          await ensurePaidBusinessBadges(updated.businessId);
          // Generate certificates now, independent of the invoice email below,
          // so a failed email never leaves a paid business without certificates.
          await ensureBusinessCertificates(updated.businessId);
        } catch (badgeError) {
          console.error(`❌ [Paid Badges] Failed to auto-update badges/certificates for business ${updated.businessId}:`, badgeError.message);
        }
      }

      // Send invoice email on successful payment
      if (normalizedPaymentStatus === "SUCCESS" && !updated.invoiceEmailSent) {
        try {
          console.log(`💰 [Payment Success] Sending invoice email for business: ${updated.businessId}`);
          const businessData = await businessListModel.findById(updated.businessId).lean();
          if (businessData) {
            console.log(`📄 [Invoice Email] Triggering email service for: ${businessData.businessName} (${businessData.email})`);
            const emailResult = await sendInvoiceEmail(businessData, updated);
            if (emailResult.success) {
              console.log(`✅ [Invoice Email] Email delivered successfully - MessageID: ${emailResult.messageId}`);
              const invoiceEmailSentAt = new Date();
              await paymentModel.updateOne(
                { _id: updated._id },
                { $set: { invoiceEmailSent: true, invoiceEmailSentAt } }
              );
              await businessListModel.updateOne(
                {
                  _id: updated.businessId,
                  "payment.transactionId": transactionId,
                },
                {
                  $set: {
                    "payment.$.invoiceEmailSent": true,
                    "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
                  },
                }
              );
            } else {
              console.warn(`⚠️ [Invoice Email] Email sending failed - ${emailResult.message}`);
            }
          } else {
            console.warn(`⚠️ [Invoice Email] Business data not found for ID: ${updated.businessId}`);
          }
        } catch (emailError) {
          console.error(`❌ [Invoice Email] Exception occurred while sending invoice email:`, {
            businessId: updated.businessId,
            transactionId: transactionId,
            errorMessage: emailError.message,
            errorStack: emailError.stack,
          });
        }
      } else if (normalizedPaymentStatus === "SUCCESS") {
        console.log(`📧 [Invoice Email] Skipped duplicate invoice email for transaction: ${transactionId}`);
      }
    }

    console.log(`✅ [PhonePe Status] Payment check completed successfully - TxnID: ${transactionId}, Status: ${updated?.paymentStatus || "UNKNOWN"}`);
    return {
      success: true,
      transactionId,
      paymentStatus: updated?.paymentStatus || "UNKNOWN",
      phonePeResponse: response.data,
    };
  } catch (error) {
    console.error(`❌ [PhonePe Status] Error checking PhonePe status for transaction ${transactionId}:`, {
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      errorStack: error.stack,
    });
    throw new Error("PhonePe payment status check failed");
  }
};

export const sendInvoiceEmailForBusiness = async (businessId) => {
  try {
    console.log(`📧 [Manual Invoice Email] Sending invoice email for businessId: ${businessId}`);

    const businessData = await businessListModel.findById(businessId).lean();

    if (!businessData) {
      console.warn(`⚠️ [Manual Invoice Email] Business not found: ${businessId}`);
      return {
        success: false,
        message: 'Business not found',
      };
    }

    if (!businessData.email) {
      console.warn(`⚠️ [Manual Invoice Email] No email found for business: ${businessData.businessName}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

    // Get the latest payment record
    const latestPayment = businessData.payment?.[0];

    if (!latestPayment) {
      console.warn(`⚠️ [Manual Invoice Email] No payment record found for business: ${businessData.businessName}`);
      return {
        success: false,
        message: 'No payment record found for this business',
      };
    }

    const storedCertificateVersion = Number(businessData.certificates?.templateVersion || 0);
    const shouldResendForCertificateRefresh =
      latestPayment.invoiceEmailSent && storedCertificateVersion < CERTIFICATE_TEMPLATE_VERSION;
    const shouldResendForAmountCorrection =
      latestPayment.invoiceEmailSent && hasPremiumAmountMismatch(latestPayment);

    if (latestPayment.invoiceEmailSent && !shouldResendForCertificateRefresh && !shouldResendForAmountCorrection) {
      console.log(`📧 [Manual Invoice Email] Invoice email already sent for business: ${businessData.businessName}`);
      return {
        success: true,
        message: 'Invoice email already sent',
        alreadySent: true,
      };
    }

    const isPaidBusiness =
      businessData.amountPaid || latestPayment.paid || latestPayment.paymentStatus === "SUCCESS";
    if (isPaidBusiness) {
      await ensurePaidBusinessBadges(businessId);
      // Generate certificates before attempting the email so an SMTP failure
      // never leaves a paid business without certificates.
      await ensureBusinessCertificates(businessId);
    }

    if (shouldResendForCertificateRefresh) {
      console.log(`📧 [Manual Invoice Email] Resending invoice once to attach refreshed certificate template for business: ${businessData.businessName}`);
      await ensureBusinessCertificates(businessData);
    }

    console.log(`💾 [Manual Invoice Email] Found payment record - TxnID: ${latestPayment.transactionId}`);
    if (shouldResendForAmountCorrection) {
      console.log(`[Manual Invoice Email] Resending invoice with corrected Premium amount for business: ${businessData.businessName}`);
    }

    const correctedPayment = {
      ...latestPayment,
      ...getPremiumMembershipAmounts(),
    };

    const emailResult = await sendInvoiceEmail(businessData, correctedPayment);

    if (emailResult.success) {
      console.log(`✅ [Manual Invoice Email] Email sent successfully - MessageID: ${emailResult.messageId}`);
      const invoiceEmailSentAt = new Date();
      await businessListModel.updateOne(
        {
          _id: businessId,
          "payment.transactionId": latestPayment.transactionId,
        },
        {
          $set: {
            "payment.$.invoiceEmailSent": true,
            "payment.$.invoiceEmailSentAt": invoiceEmailSentAt,
            "payment.$.amount": correctedPayment.amount,
            "payment.$.gstAmount": correctedPayment.gstAmount,
            "payment.$.totalAmount": correctedPayment.totalAmount,
          },
        }
      );
      await paymentModel.updateOne(
        { transactionId: latestPayment.transactionId },
        {
          $set: {
            invoiceEmailSent: true,
            invoiceEmailSentAt,
            amount: correctedPayment.amount,
            gstAmount: correctedPayment.gstAmount,
            totalAmount: correctedPayment.totalAmount,
          },
        }
      );
    } else {
      console.error(`❌ [Manual Invoice Email] Failed to send email - ${emailResult.message}`);
    }

    return emailResult;
  } catch (error) {
    console.error(`❌ [Manual Invoice Email] Exception occurred:`, {
      businessId,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return {
      success: false,
      message: 'Failed to send invoice email',
      error: error.message,
    };
  }
};
