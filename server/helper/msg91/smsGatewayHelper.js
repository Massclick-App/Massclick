import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { createLogger } from "../../utils/logger.js";
import {
  findWhatsAppAdminBlock,
  markWhatsAppFailed,
  markWhatsAppSent,
  markWhatsAppSkipped,
  normalizeWhatsAppMobile,
  recordWhatsAppAttempt,
} from "./whatsappReliabilityHelper.js";

import { getSettings } from "../systemSettings/settingsService.js";

const logger = createLogger('SMS');
const MSG91_WHATSAPP_BULK_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_SENDER_ID;
const MSG91_WHATSAPP_NAMESPACE = process.env.MSG91_TEMPLATE_NAMESPACE;
const PREMIUM_RECOMMENDATION_TEMPLATE_NAME =
  process.env.MSG91_PREMIUM_RECOMMENDATION_TEMPLATE_NAME || "pr_reco";
const PREMIUM_RECOMMENDATION_TEMPLATE_LANGUAGE =
  process.env.MSG91_PREMIUM_RECOMMENDATION_TEMPLATE_LANGUAGE || "en";
const PREMIUM_RECOMMENDATION_TEMPLATE_NAMESPACE =
  process.env.MSG91_PREMIUM_RECOMMENDATION_TEMPLATE_NAMESPACE ||
  "dbc73281_499f_40bf_8efa_4c8f7438ef7e";
const SEARCH_REQUEST_COMPLETED_TEMPLATE_NAME =
  process.env.MSG91_SEARCH_REQUEST_COMPLETED_TEMPLATE_NAME ||
  "search_request_completed_v1";
const SEARCH_REQUEST_COMPLETED_TEMPLATE_LANGUAGE =
  process.env.MSG91_SEARCH_REQUEST_COMPLETED_TEMPLATE_LANGUAGE || "en";
const SEARCH_REQUEST_COMPLETED_TEMPLATE_NAMESPACE =
  process.env.MSG91_SEARCH_REQUEST_COMPLETED_TEMPLATE_NAMESPACE || null;
const SEARCH_REQUEST_COMPLETED_CONTACT =
  process.env.MSG91_SEARCH_REQUEST_COMPLETED_CONTACT ||
  process.env.MASSCLICK_SUPPORT_CONTACT ||
  process.env.SUPPORT_EMAIL ||
  "support@massclick.in";
const CUSTOMER_BUSINESS_LIST_TEMPLATE_MAX_CHARS = 2000;
// Keep these aligned with the approved MSG91 template copy for exact pre-send length checks.
const CUSTOMER_BUSINESS_LIST_TEMPLATE_VARIANTS = {
  en_US: {
    languageCode: "en_US",
    lines: [
      "Hello {{1}},",
      "",
      "Here are the verified businesses for \"{{2}}\" in {{3}}:",
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
      "Important: Reply YES to confirm your request.",
      "",
      "Once confirmed, businesses will contact you with offers, availability, and details.",
      "",
      "This confirmation is required to activate your request.",
      "",
      "Thank you,",
      "Massclick",
    ],
    buildValues: (baseValues, rows) => [
      baseValues[0], // customerName
      baseValues[1], // searchText/category
      baseValues[2], // location
      rows[0] || "-",
      rows[1] || "-",
      rows[2] || "-",
      rows[3] || "-",
      rows[4] || "-",
    ],
  },

  en: {
    languageCode: "en",
    requiresButtonUrl: true,
    lines: [
      "Hello {{1}},",
      "",
      "Thank you for your interest in \"{{2}}\" services in {{3}}.",
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
    buildValues: (baseValues, rows) => [
      baseValues[0],
      baseValues[1],
      baseValues[2],
      rows[0] || "-",
      rows[1] || "-",
      rows[2] || "-",
      rows[3] || "-",
      rows[4] || "-",
    ],
  },
};

const getCustomerBusinessListButtonUrl = (context = {}) =>
  cleanValue(
    context.customerListButtonUrl ||
    process.env.MSG91_CUSTOMER_LIST_BUTTON_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://massclick.in/"
  );

const canUseCustomerBusinessListVariant = (variant, context = {}) => {
  if (!variant?.requiresButtonUrl) return true;
  return Boolean(
    getCustomerBusinessListButtonUrl(context) &&
    getCustomerBusinessListButtonUrl(context) !== "-"
  );
};

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
  const auditId = context.auditId || (await recordWhatsAppAttempt({
    ...context,
    ...meta,
    templateName: context.templateName || meta.templateName,
    recipientMobile: context.recipientMobile || meta.recipientMobile,
    payloadPreview: context.payloadPreview || meta.payloadPreview,
  }))._id;

  try {
    const response = await axios.post(
      MSG91_WHATSAPP_BULK_URL,
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    assertMsg91Success(response, context.templateName || meta.templateName);
    await markWhatsAppSent(auditId, response.data);
    return response;
  } catch (error) {
    await markWhatsAppFailed(auditId, error, { retryCount: context.retryCount || 0 });
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

  // Admin block, enforced for every template in both directions: the recipient
  // itself, and the searching customer whose activity triggered this send. Every
  // sender in this file funnels through here, which is what makes this cover the
  // paths evaluateWhatsAppSend never sees (welcome, customer list, MNI, enquiry).
  const adminBlock = await findWhatsAppAdminBlock(normalized.mobile, context.customerMobile);
  if (adminBlock) {
    await markWhatsAppSkipped({ ...context, recipientMobile: normalized.mobile }, adminBlock);
    throw new Error(adminBlock);
  }

  return normalized.mobile;
};

// const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
// const MSG91_FLOW_ID = process.env.MSG91_WHATSAPP_FLOW_ID; 
// const MSG91_SENDER = process.env.MSG91_WHATSAPP_SENDER; 

// Send OTP
export const sendOtp = async (number, options = {}) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = options.templateId || process.env.MSG91_TEMPLATE_ID;
    const fallbackTemplateId =
      options.fallbackTemplateId ?? process.env.MSG91_TEMPLATE_ID_FALLBACK;
    const baseUrl = process.env.MSG91_BASE_URL;

    if (!authKey || !templateId || !baseUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(cleanNumber)) {
      throw new Error("Invalid international phone number.");
    }

    const sendWithTemplate = async (template_id) => {
      const response = await axios.post(
        baseUrl,
        {
          mobile: cleanNumber,
          template_id
        },
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

      return response;
    };

    let response;
    try {
      response = await sendWithTemplate(templateId);
    } catch (primaryError) {
      if (!fallbackTemplateId || fallbackTemplateId === templateId) {
        throw primaryError;
      }
      await logger.warn("Primary OTP template failed, retrying with fallback template", {
        phoneNumber: cleanNumber,
        templateId,
        fallbackTemplateId,
        error: primaryError.message,
      });
      response = await sendWithTemplate(fallbackTemplateId);
    }

    await logger.smsDebug("OTP sent successfully", { phoneNumber: cleanNumber, response: response.data });
    return { success: true, apiResponse: response.data };
  } catch (error) {
    await logger.warn("Error sending OTP", { phoneNumber: number, error: error.message });
    console.error("Error sending OTP:", error.response?.data || error.message);
    throw error;
  }
};

// Send OTP for the mobile app.
// The app auto-reads the OTP through the Android SMS Retriever API, which only
// delivers a message that starts with "<#>" and ends with the app signature
// hash. That copy lives in MSG91_TEMPLATE_ID_FALLBACK, so the app flow makes it
// the primary template and drops back to the web template only if MSG91 rejects
// it (auto-read is lost in that case, manual entry still works).
export const sendMobileOtp = async (number) =>
  sendOtp(number, {
    templateId: process.env.MSG91_TEMPLATE_ID_FALLBACK,
    fallbackTemplateId: process.env.MSG91_TEMPLATE_ID,
  });

// Verify OTP
export const verifyOtp = async (number, otp) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const verifyUrl = process.env.MSG91_VERIFY_URL;

    if (!authKey || !verifyUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(cleanNumber)) {
      throw new Error("Invalid international phone number.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    const response = await axios.post(
      verifyUrl,
      {
        mobile: cleanNumber,
        otp: otp
      },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    const { type, message } = response.data;

    if (type === "success" || message === "Mobile no. already verified") {
      await logger.smsDebug("OTP verified successfully", { phoneNumber: cleanNumber });
      return { success: true, apiResponse: response.data };
    }

    throw new Error(message || "OTP verification failed.");
  } catch (error) {
    await logger.warn("Error verifying OTP", { phoneNumber: number, error: error.message });
    console.error("Error verifying OTP:", error.response?.data || error.message);
    throw error;
  }
};

export const fakesendOtp = async (number) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(cleanNumber)) {
      throw new Error("Invalid international phone number.");
    }

    console.log(`[DUMMY] OTP would be sent to ${cleanNumber}`);

    // Simulate successful response
    return {
      success: true,
      apiResponse: {
        type: "success",
        message: "OTP sent successfully (DUMMY MODE)",
        mobile: cleanNumber
      }
    };
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
};

// Verify OTP (Dummy - accepts any OTP)
export const fakeverifyOtp = async (number, otp) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(cleanNumber)) {
      throw new Error("Invalid international phone number.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    console.log(`[DUMMY] Verifying OTP for ${cleanNumber} - OTP: ${otp} (ANY OTP ACCEPTED)`);

    // Always succeed - accept any OTP
    return {
      success: true,
      apiResponse: {
        type: "success",
        message: "OTP verified successfully (DUMMY MODE)",
        mobile: cleanNumber
      }
    };
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    throw error;
  }
};

export const sendWhatsAppMessage = async (ownerMobile, lead = {}, context = {}) => {
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
        language: {
          code: "en_US",
          policy: "deterministic"
        },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [cleanMobile],
            components: {
              body_1: { type: "text", value: lead.searchText || lead.message || "N/A" },
              body_2: { type: "text", value: lead.location || "N/A" },
              body_3: { type: "text", value: lead.customerName || lead.name || "N/A" },
              body_4: { type: "text", value: lead.customerMobile || "N/A" },
              body_5: { type: "text", value: lead.email || "Not Provided" }
            }
          }
        ]
      }
    }
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

export const sendBusinessLead = async (cleanMobile, lead = {}, context = {}) => {
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
        language: {
          code: "en",
          policy: "deterministic"
        },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: lead.searchText },
              body_2: { type: "text", value: lead.location },
              body_3: { type: "text", value: lead.customerName },
              body_4: { type: "text", value: lead.customerMobile },
              body_5: { type: "text", value: lead.email || "Not Provided" }
            }
          }
        ]
      }
    }
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

const cleanValue = (val) => {
  if (!val || val === "-") return "-";

  return val
    .toString()
    .replace(/\n/g, " ")   // â— REMOVE NEWLINES
    .replace(/\s+/g, " ")  // normalize spaces
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
  const phone = contact.toString().replace(/\D/g, "").slice(-10) || "N/A";
  const name = truncateValue(biz.businessName || "Business", 28);
  const area = truncateValue(biz.street || biz.location || biz.address || "Area", 24);

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
  variant.lines.map((line) =>
    line.replace(/\{\{(\d+)\}\}/g, (_, index) => cleanValue(values[Number(index) - 1] || "-"))
  ).join("\n");

const trimCustomerListForTemplateLimit = (variant, baseValues, businesses, startIndex) => {
  const rows = getCustomerBusinessRows(businesses, startIndex);
  const getRenderedLength = (currentRows) =>
    renderCustomerBusinessListText(
      variant,
      variant.buildValues(baseValues, currentRows)
    ).length;

  while (
    rows.some((value) => value !== "-") &&
    getRenderedLength(rows) > CUSTOMER_BUSINESS_LIST_TEMPLATE_MAX_CHARS
  ) {
    const lastIndex = rows.map((value) => value !== "-").lastIndexOf(true);
    if (lastIndex === -1) break;
    rows[lastIndex] = "-";
  }

  return variant.buildValues(baseValues, rows);
};

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
      const location = normalize(
        `${biz.fullAddress || ""} ${biz.area || ""} ${biz.city || ""} ${biz.state || ""}`
      );

      if (groupKey) {
        return locationGroups[groupKey].some((alias) => location.includes(alias));
      }

      return location.includes(leadLocationRaw);
    });

    const sourceList = filteredBusinesses.length > 0 ? filteredBusinesses : businesses;
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

    const sendMode = context.customerListSendMode === "single" ? "single" : "split";
    const totalMatchedBusinesses = uniqueBusinesses.length;
    const finalBusinesses = uniqueBusinesses.slice(0, sendMode === "single" ? 5 : 10);
    const firstBatch = finalBusinesses.slice(0, 5);
    const secondBatch = finalBusinesses.slice(5, 10);
    const baseValues = getCustomerListBaseValues(lead);
    const shouldUseSingleEnTemplate =
      totalMatchedBusinesses <= 5 || finalBusinesses.length <= 5;
    const firstMessageVariant = shouldUseSingleEnTemplate
      ? getCustomerBusinessListVariant(context.singleBatchLanguageCode || "en")
      : getCustomerBusinessListVariant(context.firstLanguageCode || "en_US");
    const requestedSecondMessageVariant = getCustomerBusinessListVariant(
      context.secondLanguageCode || "en"
    );
    const secondMessageVariant = canUseCustomerBusinessListVariant(
      requestedSecondMessageVariant,
      context
    )
      ? requestedSecondMessageVariant
      : CUSTOMER_BUSINESS_LIST_TEMPLATE_VARIANTS.en_US;

    const createPayload = (variant, values) => {
      const components = values.reduce((acc, value, index) => {
        acc[`body_${index + 1}`] = { type: "text", value };
        return acc;
      }, {});

      if (variant.requiresButtonUrl) {
        const buttonUrlValue = getCustomerBusinessListButtonUrl(context);
        if (buttonUrlValue && buttonUrlValue !== "-") {
          components.button_2 = {
            subtype: "url",
            type: "text",
            value: buttonUrlValue,
          };
        }
      }

      return {
        integrated_number: MSG91_WHATSAPP_NUMBER,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: "customer_business_list_v1",
            language: {
              code: variant.languageCode,
              policy: "deterministic",
            },
            namespace: MSG91_WHATSAPP_NAMESPACE,
            to_and_components: [
              {
                to: [recipientMobile],
                components,
              },
            ],
          },
        },
      };
    };

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

    const values1 = trimCustomerListForTemplateLimit(
      firstMessageVariant,
      baseValues,
      firstBatch,
      0
    );
    await postWhatsAppTemplate(createPayload(firstMessageVariant, values1), auditContext);

    if (sendMode === "split" && secondBatch.length > 0) {
      const values2 = trimCustomerListForTemplateLimit(
        secondMessageVariant,
        baseValues,
        secondBatch,
        0
      );
      const hasBusinessRows = values2.slice(3).some((value) => value && value !== "-");
      if (hasBusinessRows) {
        await postWhatsAppTemplate(createPayload(secondMessageVariant, values2), auditContext);
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

export const sendPremiumBusinessesToCustomer = async (
  cleanMobile,
  lead,
  businesses,
  context = {}
) => {
  try {
    const recipientMobile = await getValidMobileOrSkip(cleanMobile, {
      templateName: PREMIUM_RECOMMENDATION_TEMPLATE_NAME,
      sourceType: context.sourceType || "premium_customer_recommendation",
      sourceId: context.sourceId,
      category: lead.searchText || lead.category || "",
      location: lead.location || "",
      customerName: lead.customerName || "",
      customerMobile: lead.customerMobile || cleanMobile || "",
    });

    const rows = getCustomerBusinessRows((businesses || []).slice(0, 3), 0)
      .slice(0, 3)
      .map((line) => line || "-");
    const baseValues = getCustomerListBaseValues(lead);
    const values = [
      baseValues[0],
      baseValues[1],
      baseValues[2],
      rows[0] || "-",
      rows[1] || "-",
      rows[2] || "-",
    ];
    const components = values.reduce((acc, value, index) => {
      acc[`body_${index + 1}`] = { type: "text", value };
      return acc;
    }, {});

    const payload = {
      integrated_number: MSG91_WHATSAPP_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: PREMIUM_RECOMMENDATION_TEMPLATE_NAME,
          language: {
            code: PREMIUM_RECOMMENDATION_TEMPLATE_LANGUAGE,
            policy: "deterministic",
          },
          namespace: PREMIUM_RECOMMENDATION_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: [recipientMobile],
              components,
            },
          ],
        },
      },
    };

    const auditContext = {
      ...context,
      templateName: PREMIUM_RECOMMENDATION_TEMPLATE_NAME,
      sourceType: context.sourceType || "premium_customer_recommendation",
      recipientMobile,
      category: lead.searchText || lead.category || "",
      location: lead.location || "",
      customerName: lead.customerName || "",
      customerMobile: lead.customerMobile || cleanMobile || "",
    };

    await postWhatsAppTemplate(payload, auditContext);
    await logger.smsDebug({
      service: "PremiumBusinessRecommendation",
      phoneNumber: recipientMobile,
      message: "Sent premium business recommendation to customer via WhatsApp",
      provider: "MSG91",
    });

    return { success: true };
  } catch (error) {
    await logger.warn({
      message: "Failed to send premium business recommendation via WhatsApp",
      phoneNumber: cleanMobile,
      error: error.message,
      provider: "MSG91",
    });

    console.error(
      "[MSG91][PremiumBusinessRecommendation][ERROR]",
      error?.response?.data || error.message
    );
    throw error;
  }
};
export const sendMniBusinessLead = async (cleanMobile, lead = {}, context = {}) => {
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
        language: {
          code: "en_US",
          policy: "deterministic",
        },
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
        language: {
          code: "en_US",
          policy: "deterministic",
        },
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

export const sendSearchRequestCompletedMessage = async (request = {}, context = {}) => {
  const recipientMobile = await getValidMobileOrSkip(request.contactNumber, {
    ...context,
    templateName: SEARCH_REQUEST_COMPLETED_TEMPLATE_NAME,
    sourceType: context.sourceType || "search_request_completed",
    sourceId: context.sourceId || request._id?.toString?.(),
    category: request.category || "",
    location: request.location || "",
    customerName: request.fullName || "Customer",
    customerMobile: request.contactNumber || "",
  });

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: SEARCH_REQUEST_COMPLETED_TEMPLATE_NAME,
        language: {
          code: SEARCH_REQUEST_COMPLETED_TEMPLATE_LANGUAGE,
          policy: "deterministic",
        },
        namespace: SEARCH_REQUEST_COMPLETED_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [recipientMobile],
            components: {
              body_1: { type: "text", value: request.fullName || "Customer" },
              body_2: { type: "text", value: request.category || "your request" },
              body_3: { type: "text", value: request.location || "your area" },
              body_4: { type: "text", value: SEARCH_REQUEST_COMPLETED_CONTACT },
            },
          },
        ],
      },
    },
  };

  const response = await postWhatsAppTemplate(payload, {
    ...context,
    templateName: SEARCH_REQUEST_COMPLETED_TEMPLATE_NAME,
    sourceType: context.sourceType || "search_request_completed",
    sourceId: context.sourceId || request._id?.toString?.(),
    recipientMobile,
    category: request.category || "",
    location: request.location || "",
    customerName: request.fullName || "Customer",
    customerMobile: request.contactNumber || "",
  });

  return response.data;
};

export const sendLoginWelcomeMessage = async (mobile, userName, context = {}) => {
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
        language: {
          code: "en_US",
          policy: "deterministic",
        },
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

export const sendEnquiryBusinessLead = async (mobile, lead = {}, context = {}) => {
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
        language: {
          code: "en",
          policy: "deterministic",
        },
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


/// Placeholder names are what `verifyOtpAction` falls back to when an account
/// is created before its owner has typed a name (the mobile flow asks on the
/// screen after verification). Greeting someone as "User_9894804201" is worse
/// than not greeting them yet, so the send waits for the real thing.
const hasRealUserName = (user) =>
  Boolean(user?.userName) &&
  user.userName.trim().length >= 2 &&
  !/^User_\d+$/.test(user.userName.trim());

/// Sends the one-time WhatsApp welcome if this account is due one, and stamps
/// the user so a later call is a no-op. Safe to call from every point where an
/// account might have just become complete; never throws.
///
/// Returns true only when a message actually went out.
export const maybeSendLoginWelcome = async (user) => {
  if (!user || user.loginWelcomeSentAt || !hasRealUserName(user)) return false;

  try {
    const settings = await getSettings();
    if (!settings?.whatsapp_login_welcome) return false;

    await sendLoginWelcomeMessage(user.mobileNumber1, user.userName);
    // Stamped only after a successful send, so a transient MSG91 failure
    // leaves the next login or profile save free to retry.
    user.loginWelcomeSentAt = new Date();
    user.loginWelcomePending = false;
    await user.save();
    return true;
  } catch (err) {
    logger.error(`WhatsApp welcome message failed: ${err.message}`);
    return false;
  }
};
