import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { createLogger } from "../../utils/logger.js";
import {
  markWhatsAppFailed,
  markWhatsAppSent,
  markWhatsAppSkipped,
  normalizeWhatsAppMobile,
  recordWhatsAppAttempt,
} from "./whatsappReliabilityHelper.js";

const logger = createLogger("SMS");
const MSG91_WHATSAPP_BULK_URL =
  "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_SENDER_ID;
const MSG91_WHATSAPP_NAMESPACE = process.env.MSG91_TEMPLATE_NAMESPACE;
const CUSTOMER_BUSINESS_LIST_TEMPLATE_MAX_CHARS = 1024;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE VARIANT DEFINITIONS
// Keep these aligned with the approved MSG91 template copy for exact
// pre-send length checks.
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOMER_BUSINESS_LIST_TEMPLATE_VARIANTS = {
  en_US: {
    languageCode: "en_US",
    templateName: "customer_business_list_v1",
    // {{1}} customerName | {{2}} serviceType | {{3}} location
    // {{4}} all businesses pipe-joined into a single variable
    lines: [
      "Hello {{1}},",
      "",
      'Here are the verified businesses for "{{2}}" in {{3}}:',
      "",
      "{{4}}",
      "",
      "Important: Reply YES to confirm your request.",
      "",
      "Once confirmed, businesses will contact you with offers, availability, and details.",
      "",
      "This confirmation is required to activate your request.",
      "",
      "Thank you,",
      "Massclick",
    ],
    /**
     * @param {string[]} baseValues - [customerName, serviceType, location]
     * @param {string[]} rows       - business name strings (any length)
     * @returns {string[]}          - exactly 4 values for {{1}}–{{4}}
     */
    buildValues: (baseValues, rows) => [
      baseValues[0], // {{1}} customerName
      baseValues[1], // {{2}} serviceType
      baseValues[2], // {{3}} location
      rows.filter((v) => v && v !== "-").join(" | ") || "-", // {{4}} pipe-joined
    ],
    /**
     * Maps buildValues output → MSG91 components object.
     * en_US has no button variable.
     * @param {string[]} values - output of buildValues (length 4)
     * @returns {object}
     */
    buildComponents: (values) => ({
      body_1: { type: "text", value: values[0] },
      body_2: { type: "text", value: values[1] },
      body_3: { type: "text", value: values[2] },
      body_4: { type: "text", value: values[3] },
    }),
  },

  en: {
    languageCode: "en",
    templateName: "customer_business_list_v1",
    // {{1}} customerName | {{2}} serviceType | {{3}} location
    // {{4}}–{{8}} individual business rows (one per slot)
    lines: [
      "Hello {{1}},",
      "",
      'Thank you for your interest in "{{2}}" services in {{3}}.',
      "",
      "We have found some verified and trusted businesses for your requirement.",
      "Please check the details below:",
      "",
      "{{4}}",
      "",
      "{{5}}",
      "",
      "{{6}}",
      "",
      "{{7}}",
      "",
      "{{8}}",
      "",
      "These businesses are highly rated and available in your area.",
      "Once you confirm, they will contact you with offers and details.",
      "",
      "Reply YES to confirm your request.",
      "",
      "Thank you,",
      "Massclick",
    ],
    /**
     * @param {string[]} baseValues - [customerName, serviceType, location]
     * @param {string[]} rows       - up to 5 business name strings
     * @returns {string[]}          - exactly 8 values for {{1}}–{{8}}
     */
    buildValues: (baseValues, rows) => [
      baseValues[0],  // {{1}} customerName
      baseValues[1],  // {{2}} serviceType
      baseValues[2],  // {{3}} location
      rows[0] || "-", // {{4}}
      rows[1] || "-", // {{5}}
      rows[2] || "-", // {{6}}
      rows[3] || "-", // {{7}}
      rows[4] || "-", // {{8}}
    ],
    /**
     * Maps buildValues output → MSG91 components object.
     * en variant includes an optional button_2 URL variable.
     * @param {string[]} values   - output of buildValues (length 8)
     * @param {string}   [ctaUrl] - optional CTA URL for button_2
     * @returns {object}
     */
    buildComponents: (values, ctaUrl) => ({
      body_1: { type: "text", value: values[0] },
      body_2: { type: "text", value: values[1] },
      body_3: { type: "text", value: values[2] },
      body_4: { type: "text", value: values[3] },
      body_5: { type: "text", value: values[4] },
      body_6: { type: "text", value: values[5] },
      body_7: { type: "text", value: values[6] },
      body_8: { type: "text", value: values[7] },
      ...(ctaUrl && {
        button_2: { subtype: "url", type: "text", value: ctaUrl },
      }),
    }),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MSG91 HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getMsg91ErrorMessage = (data, fallback) => {
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

const assertMsg91Success = (response, context = "MSG91 WhatsApp") => {
  const data = response?.data;
  const type = data?.type?.toString().toLowerCase();
  const status = data?.status?.toString().toLowerCase();

  if (type === "error" || status === "error" || data?.hasError) {
    throw new Error(getMsg91ErrorMessage(data, `${context} failed`));
  }

  return data;
};

const getTemplateMeta = (payload = {}) => {
  const template = payload?.payload?.template || {};
  const row = template?.to_and_components?.[0] || {};
  return {
    templateName: template.name || "unknown",
    recipientMobile: Array.isArray(row.to) ? row.to[0] : "",
    payloadPreview: row.components || {},
  };
};

const postWhatsAppTemplate = async (payload, context = {}) => {
  const meta = getTemplateMeta(payload);
  const auditId =
    context.auditId ||
    (
      await recordWhatsAppAttempt({
        ...context,
        ...meta,
        templateName: context.templateName || meta.templateName,
        recipientMobile: context.recipientMobile || meta.recipientMobile,
        payloadPreview: context.payloadPreview || meta.payloadPreview,
      })
    )._id;

  try {
    const response = await axios.post(MSG91_WHATSAPP_BULK_URL, payload, {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "Content-Type": "application/json",
      },
    });

    assertMsg91Success(response, context.templateName || meta.templateName);
    await markWhatsAppSent(auditId, response.data);
    return response;
  } catch (error) {
    await markWhatsAppFailed(auditId, error, {
      retryCount: context.retryCount || 0,
    });
    throw error;
  }
};

const getValidMobileOrSkip = async (mobile, context = {}) => {
  const normalized = normalizeWhatsAppMobile(mobile);
  if (!normalized.valid) {
    await markWhatsAppSkipped(
      {
        ...context,
        recipientMobile: mobile?.toString?.() || "",
      },
      normalized.reason
    );
    throw new Error(normalized.reason);
  }

  return normalized.mobile;
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP
// ─────────────────────────────────────────────────────────────────────────────

export const sendOtp = async (number) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const baseUrl = process.env.MSG91_BASE_URL;

    if (!authKey || !templateId || !baseUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    const response = await axios.post(
      baseUrl,
      { mobile: `91${cleanNumber}`, template_id: templateId },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.type !== "success") {
      throw new Error(response.data.message || "Failed to send OTP.");
    }

    await logger.smsDebug("OTP sent successfully", {
      phoneNumber: cleanNumber,
      response: response.data,
    });
    return { success: true, apiResponse: response.data };
  } catch (error) {
    await logger.warn("Error sending OTP", {
      phoneNumber: number,
      error: error.message,
    });
    console.error("Error sending OTP:", error.response?.data || error.message);
    throw error;
  }
};

export const verifyOtp = async (number, otp) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const verifyUrl = process.env.MSG91_VERIFY_URL;

    if (!authKey || !verifyUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    const response = await axios.post(
      verifyUrl,
      { mobile: `91${cleanNumber}`, otp },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    const { type, message } = response.data;

    if (type === "success" || message === "Mobile no. already verified") {
      await logger.smsDebug("OTP verified successfully", {
        phoneNumber: cleanNumber,
      });
      return { success: true, apiResponse: response.data };
    }

    throw new Error(message || "OTP verification failed.");
  } catch (error) {
    await logger.warn("Error verifying OTP", {
      phoneNumber: number,
      error: error.message,
    });
    console.error(
      "Error verifying OTP:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const fakesendOtp = async (number) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    console.log(`[DUMMY] OTP would be sent to ${cleanNumber}`);

    return {
      success: true,
      apiResponse: {
        type: "success",
        message: "OTP sent successfully (DUMMY MODE)",
        mobile: `91${cleanNumber}`,
      },
    };
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
};

export const fakeverifyOtp = async (number, otp) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    console.log(
      `[DUMMY] Verifying OTP for ${cleanNumber} - OTP: ${otp} (ANY OTP ACCEPTED)`
    );

    return {
      success: true,
      apiResponse: {
        type: "success",
        message: "OTP verified successfully (DUMMY MODE)",
        mobile: `91${cleanNumber}`,
      },
    };
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LEAD ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export const sendWhatsAppMessage = async (
  ownerMobile,
  lead = {},
  context = {}
) => {
  const cleanMobile = await getValidMobileOrSkip(ownerMobile, {
    ...context,
    templateName: "business_lead_alert_v1",
    sourceType: context.sourceType || "manual",
    category: lead.searchText || "",
    location: lead.location || "",
    customerName: lead.customerName || lead.name || "",
    customerMobile: lead.customerMobile || "",
  });

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "business_lead_alert_v1",
        language: { code: "en_US", policy: "deterministic" },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [cleanMobile],
            components: {
              body_1: {
                type: "text",
                value: lead.searchText || lead.message || "N/A",
              },
              body_2: { type: "text", value: lead.location || "N/A" },
              body_3: {
                type: "text",
                value: lead.customerName || lead.name || "N/A",
              },
              body_4: { type: "text", value: lead.customerMobile || "N/A" },
              body_5: { type: "text", value: lead.email || "Not Provided" },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "business_lead_alert_v1",
    sourceType: context.sourceType || "manual",
    recipientMobile: cleanMobile,
    category: lead.searchText || "",
    location: lead.location || "",
    customerName: lead.customerName || lead.name || "",
    customerMobile: lead.customerMobile || "",
  });

  return response.data;
};

export const sendBusinessLead = async (
  cleanMobile,
  lead = {},
  context = {}
) => {
  const recipientMobile = await getValidMobileOrSkip(cleanMobile, {
    ...context,
    templateName: "business_lead_alert_v2",
    sourceType: context.sourceType || "search_lead",
    category: lead.searchText || "",
    location: lead.location || "",
    customerName: lead.customerName || "",
    customerMobile: lead.customerMobile || "",
  });

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "business_lead_alert_v2",
        language: { code: "en", policy: "deterministic" },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: lead.searchText },
              body_2: { type: "text", value: lead.location },
              body_3: { type: "text", value: lead.customerName },
              body_4: { type: "text", value: lead.customerMobile },
              body_5: { type: "text", value: lead.email || "Not Provided" },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "business_lead_alert_v2",
    sourceType: context.sourceType || "search_lead",
    recipientMobile,
    category: lead.searchText || "",
    location: lead.location || "",
    customerName: lead.customerName || "",
    customerMobile: lead.customerMobile || "",
  });

  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER BUSINESS LIST — shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const cleanValue = (val) => {
  if (!val || val === "-") return "-";

  return val
    .toString()
    .replace(/\n/g, " ")  // remove newlines
    .replace(/\s+/g, " ") // normalize spaces
    .trim();
};

const truncateValue = (val, maxLength) => {
  const cleaned = cleanValue(val);
  if (cleaned === "-" || cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const compactBusinessLine = (biz, index) => {
  const contact = Array.isArray(biz.contactList)
    ? biz.contactList[0]
    : biz.contactList || biz.whatsappNumber || "N/A";
  const phone =
    contact.toString().replace(/\D/g, "").slice(-10) || "N/A";
  const name = truncateValue(biz.businessName || "Business", 28);
  const area = truncateValue(
    biz.location || biz.street || biz.address || "Area",
    24
  );
  return truncateValue(`${index + 1}. ${name} | ${area} | ${phone}`, 90);
};

const getCustomerListBaseValues = (lead = {}) => [
  truncateValue(lead.customerName || "Customer", 50),
  truncateValue(lead.searchText || lead.category || "your search", 80),
  truncateValue(lead.location || "your area", 80),
];

const getCustomerBusinessRows = (list, startIndex = 0) => {
  const values = [];
  for (let i = 0; i < 5; i++) {
    const biz = list[i];
    values.push(biz ? compactBusinessLine(biz, startIndex + i) : "-");
  }
  return values;
};

const getCustomerBusinessListVariant = (languageCode = "en_US") =>
  CUSTOMER_BUSINESS_LIST_TEMPLATE_VARIANTS[languageCode] ||
  CUSTOMER_BUSINESS_LIST_TEMPLATE_VARIANTS.en_US;

const renderCustomerBusinessListText = (variant, values = []) =>
  variant.lines
    .map((line) =>
      line.replace(
        /\{\{(\d+)\}\}/g,
        (_, index) => cleanValue(values[Number(index) - 1] || "-")
      )
    )
    .join("\n");

const trimCustomerListForTemplateLimit = (
  variant,
  baseValues,
  businesses,
  startIndex
) => {
  const rows = getCustomerBusinessRows(businesses, startIndex);

  const getRenderedLength = (currentRows) =>
    renderCustomerBusinessListText(
      variant,
      variant.buildValues(baseValues, currentRows)
    ).length;

  while (
    rows.some((v) => v !== "-") &&
    getRenderedLength(rows) > CUSTOMER_BUSINESS_LIST_TEMPLATE_MAX_CHARS
  ) {
    const lastIndex = rows.map((v) => v !== "-").lastIndexOf(true);
    if (lastIndex === -1) break;
    rows[lastIndex] = "-";
  }

  return variant.buildValues(baseValues, rows);
};

// ─────────────────────────────────────────────────────────────────────────────
// sendBusinessesToCustomer
// Sends up to 2 WhatsApp messages (first batch en_US, second batch en)
// each carrying up to 5 businesses, trimmed to stay within 1 024 chars.
// ─────────────────────────────────────────────────────────────────────────────

export const sendBusinessesToCustomer = async (
  cleanMobile,
  lead,
  businesses,
  context = {}
) => {
  try {
    const recipientMobile = await getValidMobileOrSkip(cleanMobile, {
      templateName: "customer_business_list_v1",
      sourceType: context.sourceType || "customer_list",
      sourceId: context.sourceId,
      category: lead.searchText || lead.category || "",
      location: lead.location || "",
      customerName: lead.customerName || "",
      customerMobile: lead.customerMobile || cleanMobile || "",
    });

    // ── location normalisation ────────────────────────────────────────────
    const normalize = (text = "") => text.toLowerCase().trim();
    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"],
      chennai: ["chennai", "madras"],
      madurai: ["madurai"],
      coimbatore: ["coimbatore", "kovai"],
    };

    const leadLocationRaw = normalize(lead.location);
    let groupKey = null;

    for (const key in locationGroups) {
      if (locationGroups[key].some((alias) => leadLocationRaw.includes(alias))) {
        groupKey = key;
        break;
      }
    }

    const filteredBusinesses = businesses.filter((biz) => {
      const loc = normalize(
        `${biz.fullAddress || ""} ${biz.area || ""} ${biz.city || ""} ${biz.state || ""}`
      );
      return groupKey
        ? locationGroups[groupKey].some((alias) => loc.includes(alias))
        : loc.includes(leadLocationRaw);
    });

    const sourceList =
      filteredBusinesses.length > 0 ? filteredBusinesses : businesses;

    // ── dedup ─────────────────────────────────────────────────────────────
    const uniqueBusinesses = [];
    const seen = new Set();
    sourceList.forEach((biz) => {
      const key = normalize(
        `${biz.businessName || biz.name || ""}|${biz.area || ""}|${biz.mobile || biz.contact || ""}`
      );
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(biz);
      }
    });

    const finalBusinesses = uniqueBusinesses.slice(0, 10);
    const firstBatch = finalBusinesses.slice(0, 5);
    const secondBatch = finalBusinesses.slice(5, 10);
    const baseValues = getCustomerListBaseValues(lead);

    const firstMessageVariant = getCustomerBusinessListVariant(
      context.firstLanguageCode || "en_US"
    );
    const secondMessageVariant = getCustomerBusinessListVariant(
      context.secondLanguageCode || "en"
    );

    // ── FIXED: use variant.buildComponents instead of ad-hoc reducer ──────
    const createPayload = (variant, values, ctaUrl) => ({
      integrated_number: MSG91_WHATSAPP_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: variant.templateName,
          language: {
            code: variant.languageCode,
            policy: "deterministic",
          },
          namespace: MSG91_WHATSAPP_NAMESPACE,
          to_and_components: [
            {
              to: [recipientMobile],
              components: variant.buildComponents(values, ctaUrl),
            },
          ],
        },
      },
    });

    const auditContext = {
      ...context,
      templateName: "customer_business_list_v1",
      sourceType: context.sourceType || "customer_list",
      recipientMobile,
      category: lead.searchText || lead.category || "",
      location: lead.location || "",
      customerName: lead.customerName || "",
      customerMobile: lead.customerMobile || cleanMobile || "",
    };

    // ── first message (en_US, batch 0–4) ─────────────────────────────────
    const values1 = trimCustomerListForTemplateLimit(
      firstMessageVariant,
      baseValues,
      firstBatch,
      0
    );
    await postWhatsAppTemplate(
      createPayload(firstMessageVariant, values1),
      auditContext
    );

    // ── second message (en, batch 5–9) — only if there are rows ──────────
    if (secondBatch.length > 0) {
      const values2 = trimCustomerListForTemplateLimit(
        secondMessageVariant,
        baseValues,
        secondBatch,
        5
      );
      const hasBusinessRows = values2
        .slice(3)
        .some((v) => v && v !== "-");

      if (hasBusinessRows) {
        await postWhatsAppTemplate(
          createPayload(secondMessageVariant, values2, context.ctaUrl),
          auditContext
        );
      }
    }

    await logger.smsDebug({
      service: "CustomerBusinessList",
      phoneNumber: recipientMobile,
      message: "Sent business list to customer via WhatsApp",
      provider: "MSG91",
    });

    return { success: true };
  } catch (error) {
    await logger.warn({
      message: "Failed to send customer business list via WhatsApp",
      phoneNumber: cleanMobile,
      error: error.message,
      provider: "MSG91",
    });

    console.error(
      "[MSG91][CustomerBusinessList][ERROR]",
      error?.response?.data || error.message
    );
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MNI TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const sendMniBusinessLead = async (
  cleanMobile,
  lead = {},
  context = {}
) => {
  const recipientMobile = await getValidMobileOrSkip(cleanMobile, {
    ...context,
    templateName: "mni_requirement_alert_v1",
    sourceType: context.sourceType || "mni",
    category: lead.category || "",
    location: lead.location || "",
    customerMobile: lead.customerMobile || "",
    businessName: lead.businessName || "",
  });

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "mni_requirement_alert_v1",
        language: { code: "en_US", policy: "deterministic" },
        namespace: MSG91_WHATSAPP_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: lead.businessName || "Business" },
              body_2: { type: "text", value: lead.location || "N/A" },
              body_3: { type: "text", value: lead.category || "N/A" },
              body_4: { type: "text", value: lead.description || "N/A" },
              body_5: { type: "text", value: lead.customerMobile || "N/A" },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "mni_requirement_alert_v1",
    sourceType: context.sourceType || "mni",
    recipientMobile,
    category: lead.category || "",
    location: lead.location || "",
    customerMobile: lead.customerMobile || "",
    businessName: lead.businessName || "",
  });

  return response.data;
};

const getTodayHours = (openingHours = []) => {
  const today = new Date().toLocaleString("en-US", { weekday: "long" });
  const todayData = openingHours.find((day) => day.day === today);

  if (!todayData) return "Closed";
  if (todayData.isClosed) return "Closed";
  if (todayData.is24Hours) return "24 Hours";

  return `${todayData.open} - ${todayData.close}`;
};

export const sendCustomerBusinessList = async (
  cleanMobile,
  customerName,
  location,
  category,
  businesses,
  context = {}
) => {
  const recipientMobile = await getValidMobileOrSkip(cleanMobile, {
    ...context,
    templateName: "mni_customer_business_list_v1",
    sourceType: context.sourceType || "mni",
    category,
    location,
    customerName,
    customerMobile: cleanMobile,
  });

  const biz = businesses?.[0];
  if (!biz) {
    await markWhatsAppSkipped(
      {
        ...context,
        templateName: "mni_customer_business_list_v1",
        sourceType: context.sourceType || "mni",
        recipientMobile,
        category,
        location,
        customerName,
        customerMobile: cleanMobile,
      },
      "no_business_found"
    );
    throw new Error("No business found");
  }

  const contact = (biz.contactList || biz.whatsappNumber || "N/A")
    .toString()
    .replace(/\D/g, "")
    .slice(-10) || "N/A";
  const group = biz?.mniDetails?.[0]?.categoryGroup || "-";
  const todayHours = getTodayHours(biz.openingHours);
  const businessListText = truncateValue(
    `${biz.businessName || "Business"} | ${biz.location || biz.street || "Area"} | ${todayHours} | Group ${group} | ${contact}`,
    900
  );

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "mni_customer_business_list_v1",
        language: { code: "en_US", policy: "deterministic" },
        namespace: MSG91_WHATSAPP_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: customerName || "Customer" },
              body_2: { type: "text", value: location || "N/A" },
              body_3: { type: "text", value: category || "N/A" },
              body_4: { type: "text", value: businessListText },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "mni_customer_business_list_v1",
    sourceType: context.sourceType || "mni",
    recipientMobile,
    category,
    location,
    customerName,
    customerMobile: cleanMobile,
    businessId: biz._id,
    businessName: biz.businessName,
  });

  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// OTHER TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const sendLoginWelcomeMessage = async (
  mobile,
  userName,
  context = {}
) => {
  const recipientMobile = await getValidMobileOrSkip(mobile, {
    ...context,
    templateName: "login_welcome_massclick",
    sourceType: context.sourceType || "welcome",
    customerName: userName || "User",
    customerMobile: mobile,
  });

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "login_welcome_massclick",
        language: { code: "en_US", policy: "deterministic" },
        namespace: MSG91_WHATSAPP_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: userName || "User" },
              body_2: { type: "text", value: "MassClick" },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "login_welcome_massclick",
    sourceType: context.sourceType || "welcome",
    recipientMobile,
    customerName: userName || "User",
    customerMobile: mobile,
  });

  return response.data;
};

export const sendEnquiryBusinessLead = async (
  mobile,
  lead = {},
  context = {}
) => {
  const recipientMobile = await getValidMobileOrSkip(mobile, {
    ...context,
    templateName: "enquiry_business_lead_v1",
    sourceType: context.sourceType || "enquiry",
    category: lead.category || "",
    location: lead.location || "",
    customerName: lead.customerName || "",
    customerMobile: lead.customerMobile || "",
  });

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "enquiry_business_lead_v1",
        language: { code: "en", policy: "deterministic" },
        namespace: MSG91_WHATSAPP_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: lead.category || "N/A" },
              body_2: { type: "text", value: lead.location || "N/A" },
              body_3: { type: "text", value: lead.customerName || "N/A" },
              body_4: { type: "text", value: lead.customerMobile || "N/A" },
              body_5: { type: "text", value: lead.customerEmail || "N/A" },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: "enquiry_business_lead_v1",
    sourceType: context.sourceType || "enquiry",
    recipientMobile,
    category: lead.category || "",
    location: lead.location || "",
    customerName: lead.customerName || "",
    customerMobile: lead.customerMobile || "",
  });

  return response;
};