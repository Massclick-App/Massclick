import mongoose from "mongoose";
import whatsappMessageAuditModel from "../../model/msg91Model/whatsappMessageAuditModel.js";
import whatsappRecipientHealthModel from "../../model/msg91Model/whatsappRecipientHealthModel.js";

const VALID_STATUS = new Set(["queued", "sent", "delivered", "read", "failed", "hold", "skipped"]);
const SUCCESS_STATUSES = new Set(["sent", "delivered", "read"]);
const BUSINESS_LEAD_TEMPLATE = "business_lead_alert_v2";
const DAILY_BUSINESS_LEAD_LIMIT = 3;
const BUSINESS_LEAD_COOLDOWN_MS = 45 * 60 * 1000;
const INVALID_SUPPRESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ECOSYSTEM_SUPPRESSION_MS = 24 * 60 * 60 * 1000;

export const normalizeWhatsAppMobile = (value) => {
  if (!value) {
    return { valid: false, mobile: "", reason: "missing_mobile" };
  }

  const raw = value.toString();
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { valid: false, mobile: "", reason: "invalid_indian_mobile" };
  }

  return { valid: true, mobile: `91${digits}`, national: digits };
};

export const normalizeWhatsAppMobileOrThrow = (value) => {
  const normalized = normalizeWhatsAppMobile(value);
  if (!normalized.valid) {
    throw new Error(normalized.reason);
  }
  return normalized.mobile;
};

export const extractFailureCode = (reason = "") => {
  const match = reason.toString().match(/^(\d{5,6})\b|#?(\d{5,6})/);
  return match?.[1] || match?.[2] || "";
};

const getStartOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const asObjectIdOrNull = (value) => {
  if (!value) return null;
  const text = value.toString();
  return mongoose.Types.ObjectId.isValid(text) ? new mongoose.Types.ObjectId(text) : null;
};

const compactPayload = (payload = {}) => {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return {};
  }
};

export const extractMsg91Identifiers = (data = {}) => {
  const result = { requestId: "", uuid: "" };
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const lower = key.toLowerCase();
      if (!result.requestId && ["request_id", "requestid", "request id"].includes(lower)) {
        result.requestId = value?.toString?.() || "";
      }
      if (!result.uuid && ["uuid", "wamid", "message_uuid", "messageid", "message_id"].includes(lower)) {
        result.uuid = value?.toString?.() || "";
      }
      if (typeof value === "object") visit(value);
    }
  };
  visit(data);
  return result;
};

export const getMsg91FailureMessage = (data, fallback = "MSG91 WhatsApp failed") => {
  if (!data) return fallback;
  if (typeof data === "string") return data;

  return (
    data.message ||
    data.error ||
    data.errors?.[0]?.message ||
    data.data?.message ||
    data.data?.error ||
    data.response?.message ||
    fallback
  );
};

const updateRecipientHealth = async (mobile, status, data = {}) => {
  if (!mobile) return null;

  const now = new Date();
  const failureReason = data.failureReason || "";
  const failureCode = data.failureCode || extractFailureCode(failureReason);
  const update = {
    $set: {
      mobile,
      lastStatus: status,
      lastAttemptAt: now,
    },
    $inc: {
      totalAttempts: status === "skipped" ? 0 : 1,
    },
  };

  if (status === "skipped") {
    update.$inc.skippedCount = 1;
  }

  if (SUCCESS_STATUSES.has(status)) {
    update.$set.lastSentAt = data.sentAt || now;
    update.$set.consecutiveFailures = 0;
    update.$inc.sentCount = status === "sent" ? 1 : 0;
    update.$inc.deliveredCount = status === "delivered" ? 1 : 0;
    update.$inc.readCount = status === "read" ? 1 : 0;
  }

  if (status === "failed") {
    update.$set.lastFailedAt = now;
    update.$set.lastFailureCode = failureCode;
    update.$set.lastFailureReason = failureReason;
    update.$inc.failedCount = 1;
    update.$inc.consecutiveFailures = 1;

    if (failureCode === "131026" || failureReason.includes("Message undeliverable")) {
      update.$inc.undeliverableCount = 1;
    }

    if (failureCode === "131049" || failureReason.includes("healthy ecosystem")) {
      update.$inc.ecosystemFailureCount = 1;
    }
  }

  const health = await whatsappRecipientHealthModel.findOneAndUpdate(
    { mobile },
    update,
    { upsert: true, new: true }
  );

  const suppression = {};
  if (health.undeliverableCount >= 3) {
    suppression.whatsappInvalid = true;
    suppression.suppressedUntil = new Date(Date.now() + INVALID_SUPPRESSION_MS);
    suppression.suppressReason = "repeated_undeliverable_131026";
  } else if (health.ecosystemFailureCount >= 2 && status === "failed") {
    suppression.suppressedUntil = new Date(Date.now() + ECOSYSTEM_SUPPRESSION_MS);
    suppression.suppressReason = "repeated_ecosystem_131049";
  }

  if (Object.keys(suppression).length) {
    return whatsappRecipientHealthModel.findOneAndUpdate(
      { mobile },
      { $set: suppression },
      { new: true }
    );
  }

  return health;
};

export const buildAuditContext = (context = {}) => ({
  templateName: context.templateName || context.template || "unknown",
  messageType: context.messageType || "template",
  sourceType: context.sourceType || "unknown",
  sourceId: asObjectIdOrNull(context.sourceId),
  recipientMobile: context.recipientMobile || context.mobile || "",
  senderMobile: context.senderMobile || process.env.MSG91_WHATSAPP_SENDER_ID || "",
  customerName: context.customerName || "",
  customerMobile: context.customerMobile || "",
  category: context.category || context.searchText || "",
  location: context.location || "",
  businessId: asObjectIdOrNull(context.businessId),
  businessName: context.businessName || "",
  payloadPreview: compactPayload(context.payloadPreview || {}),
});

export const recordWhatsAppAttempt = async (context = {}) => {
  const auditData = buildAuditContext(context);
  const audit = await whatsappMessageAuditModel.create({
    ...auditData,
    status: "queued",
  });
  return audit;
};

export const markWhatsAppSent = async (auditId, responseData = {}, patch = {}) => {
  if (!auditId) return null;
  const ids = extractMsg91Identifiers(responseData);
  const statusText = responseData?.status?.toString?.().toLowerCase?.() || responseData?.type?.toString?.().toLowerCase?.() || "";
  const status = statusText === "hold" ? "hold" : "sent";
  const now = new Date();

  const audit = await whatsappMessageAuditModel.findByIdAndUpdate(
    auditId,
    {
      $set: {
        status,
        requestId: ids.requestId,
        uuid: ids.uuid,
        providerResponse: compactPayload(responseData),
        sentAt: status === "sent" ? now : null,
        holdAt: status === "hold" ? now : null,
        ...patch,
      },
    },
    { new: true }
  );

  if (audit) {
    await updateRecipientHealth(audit.recipientMobile, status, { sentAt: now });
  }

  return audit;
};

export const markWhatsAppFailed = async (auditId, error, patch = {}) => {
  if (!auditId) return null;
  const responseData = error?.response?.data;
  const failureReason = getMsg91FailureMessage(responseData, error?.message || "MSG91 WhatsApp failed");
  const failureCode = extractFailureCode(failureReason);
  const now = new Date();

  const audit = await whatsappMessageAuditModel.findByIdAndUpdate(
    auditId,
    {
      $set: {
        status: "failed",
        failureReason,
        failureCode,
        providerResponse: compactPayload(responseData || {}),
        failedAt: now,
        ...patch,
      },
    },
    { new: true }
  );

  if (audit) {
    await updateRecipientHealth(audit.recipientMobile, "failed", { failureReason, failureCode });
  }

  return audit;
};

export const markWhatsAppSkipped = async (context = {}, skippedReason = "skipped") => {
  const rawMobile = context.recipientMobile || context.mobile || "";
  const normalized = normalizeWhatsAppMobile(rawMobile);
  const recipientMobile = normalized.valid ? normalized.mobile : rawMobile.toString?.() || "unknown";
  const audit = await whatsappMessageAuditModel.create({
    ...buildAuditContext({ ...context, recipientMobile }),
    status: "skipped",
    skippedReason,
    skippedAt: new Date(),
  });

  if (normalized.valid) {
    await updateRecipientHealth(recipientMobile, "skipped");
  }

  return audit;
};

export const updateWhatsAppDeliveryStatus = async (payload = {}) => {
  const flat = compactPayload(payload);
  const ids = extractMsg91Identifiers(flat);
  const statusRaw = (
    payload.status ||
    payload.delivery_status ||
    payload.deliveryReport ||
    payload["Delivery Report"] ||
    payload.event ||
    ""
  ).toString().toLowerCase();

  const status = VALID_STATUS.has(statusRaw) ? statusRaw : "sent";
  const failureReason = payload.failureReason || payload.failure_reason || payload.reason || "";
  const failureCode = payload.failureCode || payload.failure_code || extractFailureCode(failureReason);
  const price = Number(payload.price || payload.Price || 0) || 0;
  const now = new Date();

  const query = ids.requestId
    ? { requestId: ids.requestId }
    : ids.uuid
      ? { uuid: ids.uuid }
      : null;

  if (!query) {
    return null;
  }

  const patch = {
    status,
    failureReason,
    failureCode,
    price,
    rawWebhookPayload: flat,
  };

  if (status === "delivered") patch.deliveredAt = now;
  if (status === "read") patch.readAt = now;
  if (status === "failed") patch.failedAt = now;
  if (status === "hold") patch.holdAt = now;

  const audit = await whatsappMessageAuditModel.findOneAndUpdate(
    query,
    { $set: patch },
    { new: true }
  );

  if (audit) {
    await updateRecipientHealth(audit.recipientMobile, status, { failureReason, failureCode });
  }

  return audit;
};

export const evaluateWhatsAppSend = async ({
  mobile,
  template,
  sourceType,
  category,
  location,
  customerMobile,
}) => {
  const normalized = normalizeWhatsAppMobile(mobile);
  if (!normalized.valid) {
    return { allowed: false, mobile: "", skipReason: normalized.reason };
  }

  const health = await whatsappRecipientHealthModel.findOne({ mobile: normalized.mobile }).lean();
  const now = new Date();

  if (health?.whatsappInvalid) {
    return { allowed: false, mobile: normalized.mobile, skipReason: "recipient_marked_invalid" };
  }

  if (health?.suppressedUntil && new Date(health.suppressedUntil) > now) {
    return {
      allowed: false,
      mobile: normalized.mobile,
      skipReason: health.suppressReason || "recipient_temporarily_suppressed",
    };
  }

  if (template !== BUSINESS_LEAD_TEMPLATE) {
    return { allowed: true, mobile: normalized.mobile, skipReason: "" };
  }

  const today = getStartOfDay();
  const baseQuery = {
    recipientMobile: normalized.mobile,
    templateName: BUSINESS_LEAD_TEMPLATE,
    createdAt: { $gte: today },
    status: { $ne: "skipped" },
  };

  const todayCount = await whatsappMessageAuditModel.countDocuments(baseQuery);
  if (todayCount >= DAILY_BUSINESS_LEAD_LIMIT) {
    return { allowed: false, mobile: normalized.mobile, skipReason: "daily_business_lead_cap" };
  }

  const duplicate = await whatsappMessageAuditModel.findOne({
    ...baseQuery,
    sourceType: sourceType || "search_lead",
    category: category || "",
    location: location || "",
    customerMobile: customerMobile || "",
  }).lean();

  if (duplicate) {
    return { allowed: false, mobile: normalized.mobile, skipReason: "duplicate_category_location_customer_today" };
  }

  const recent = await whatsappMessageAuditModel.findOne({
    recipientMobile: normalized.mobile,
    templateName: BUSINESS_LEAD_TEMPLATE,
    status: { $in: ["queued", "sent", "delivered", "read", "hold", "failed"] },
    createdAt: { $gte: new Date(Date.now() - BUSINESS_LEAD_COOLDOWN_MS) },
  }).lean();

  if (recent) {
    return { allowed: false, mobile: normalized.mobile, skipReason: "recipient_cooldown_45_minutes" };
  }

  return { allowed: true, mobile: normalized.mobile, skipReason: "" };
};
