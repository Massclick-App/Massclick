import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";
import { SYSTEM_SETTINGS_DEFAULTS, invalidateCache } from "../../helper/systemSettings/settingsService.js";
import { getIO } from "../../websocket/ioInstance.js";
import { WS_EVENTS } from "../../websocket/constants.js";
import { createLogger } from "../../utils/logger.js";
import { invalidateMaintenanceCache } from "../../middleware/maintenanceModeMiddleware.js";
import { invalidateSearchCache } from "../../utils/cacheInvalidation.js";
import {
  fetchPay2AllBalance,
  fetchPay2AllBbpsCategoriesRaw,
  fetchPay2AllBbpsBillersRaw,
  fetchPay2AllBbpsBillerFieldsRaw,
} from "../../helper/recharge/pay2AllHelper.js";
import { checkPhonePeStandardCheckoutAuth } from "../../helper/PhonePay/phonePayHelper.js";

const logger = createLogger("SYSTEM_SETTINGS");

const maskSecret = (value) => {
  const secret = String(value || "").trim();
  if (!secret) return "";
  const visibleTail = secret.slice(-4);
  return `****${visibleTail}`;
};

const sanitizeSystemSettings = (settings = {}) => {
  const data = { ...SYSTEM_SETTINGS_DEFAULTS, ...settings };
  const pay2AllToken = data.recharge_pay2all_api_token;
  const pay2AllBbpsToken = data.recharge_pay2all_bbps_token;
  const phonePeClientSecret = data.phonepe_client_secret;
  const phonePeLegacySaltKey = data.phonepe_legacy_salt_key;

  delete data.recharge_pay2all_api_token;
  delete data.recharge_pay2all_bbps_token;
  delete data.phonepe_client_secret;
  delete data.phonepe_legacy_salt_key;

  return {
    ...data,
    recharge_pay2all_api_token_configured: Boolean(String(pay2AllToken || "").trim()),
    recharge_pay2all_api_token_preview: maskSecret(pay2AllToken),
    recharge_pay2all_bbps_token_configured: Boolean(String(pay2AllBbpsToken || "").trim()),
    recharge_pay2all_bbps_token_preview: maskSecret(pay2AllBbpsToken),
    phonepe_client_secret_configured: Boolean(String(phonePeClientSecret || "").trim()),
    phonepe_client_secret_preview: maskSecret(phonePeClientSecret),
    phonepe_legacy_salt_key_configured: Boolean(String(phonePeLegacySaltKey || "").trim()),
    phonepe_legacy_salt_key_preview: maskSecret(phonePeLegacySaltKey),
  };
};

const assertValidUrl = (value, fieldName) => {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return `${fieldName} must use http or https`;
    }
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      return `${fieldName} must use https outside local testing`;
    }
    return null;
  } catch {
    return `${fieldName} must be a valid URL`;
  }
};

const assertValidWebhookPath = (value) => {
  const path = String(value || "").trim();
  if (!path.startsWith("/")) return "recharge_pay2all_webhook_path must start with /";
  if (/\s/.test(path)) return "recharge_pay2all_webhook_path cannot contain spaces";
  return null;
};

export const getSystemSettingsAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "anonymous";
    await logger.info(`Fetching system settings`, { admin: adminEmail, ip: req.ip });

    let settings = await systemSettingsModel.findOne().lean();

    if (!settings) {
      await logger.info(`System settings not found, creating default`, { admin: adminEmail });
      settings = await systemSettingsModel.create({});
      settings = settings.toObject();
    }

    // Log key settings status
    const settingsSummary = {
      otp_real_enabled: settings.otp_real_enabled,
      app_maintenance_mode: settings.app_maintenance_mode,
      logging_enabled: settings.logging_enabled,
      logging_level: settings.logging_level,
      redis_enabled: settings.redis_enabled,
      recharge_api_enabled: settings.recharge_api_enabled,
      recharge_pay2all_api_token_configured: Boolean(settings.recharge_pay2all_api_token),
      search_nearby_radius_km: settings.search_nearby_radius_km,
      android_version: settings.app_android_latest_version,
      ios_version: settings.app_ios_latest_version
    };

    await logger.info(`System settings fetched successfully`, {
      admin: adminEmail,
      summary: settingsSummary
    });

    return res.status(200).json({ success: true, data: sanitizeSystemSettings(settings) });
  } catch (error) {
    const adminEmail = req.authUser?.email || "anonymous";
    await logger.error("getSystemSettingsAction error", error, { admin: adminEmail });
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSettingsAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";
    const requestIp = req.ip;

    await logger.info(`Update system settings request initiated`, {
      admin: adminEmail,
      ip: requestIp,
      fieldsToUpdate: Object.keys(req.body).length
    });

    const booleanFields = [
      "otp_real_enabled",
      "rate_limit_enabled",
      "whatsapp_business_lead_alert",
      "whatsapp_customer_business_list",
      "whatsapp_mni_lead_alert",
      "whatsapp_mni_customer_list",
      "whatsapp_login_welcome",
      "lead_guard_search_text_required",
      "lead_guard_anonymous_dedupe_enabled",
      "lead_guard_user_dedupe_enabled",
      "lead_guard_live_business_only",
      "lead_guard_require_location",
      "whatsapp_business_lead_daily_cap_enabled",
      "whatsapp_business_lead_duplicate_guard_enabled",
      "whatsapp_business_lead_cooldown_enabled",
      "whatsapp_recipient_health_guard_enabled",
      "whatsapp_dev_bypass_lead_guards",
      "app_maintenance_mode",
      "logging_enabled",
      "logging_fcm_debug",
      "logging_sms_debug",
      "logging_seo_debug",
      "logging_db_queries",
      "redis_enabled",
      "recharge_api_enabled",
      "phonepe_gateway_enabled",
    ];

    const stringFields = [
      "app_android_latest_version",
      "app_android_min_version",
      "app_android_update_url",
      "app_ios_latest_version",
      "app_ios_min_version",
      "app_ios_update_url",
      "app_release_notes",
      "logging_level",
      "whatsapp_customer_business_list_send_mode",
      "recharge_api_provider",
      "recharge_pay2all_base_url",
      "recharge_pay2all_webhook_path",
      "phonepe_integration_mode",
      "phonepe_environment",
      "phonepe_client_id",
      "phonepe_client_version",
      "phonepe_redirect_base_url",
      "phonepe_legacy_merchant_id",
      "phonepe_legacy_salt_index",
      "phonepe_legacy_base_url",
    ];

    const numberFields = [
      "rate_limit_api_limit",
      "rate_limit_api_window_minutes",
      "rate_limit_auth_limit",
      "rate_limit_auth_window_minutes",
      "rate_limit_otp_limit",
      "rate_limit_otp_window_minutes",
      "rate_limit_businesslist_limit",
      "rate_limit_businesslist_window_minutes",
      "rate_limit_chat_limit",
      "rate_limit_chat_window_minutes",
      "rate_limit_lead_limit",
      "rate_limit_lead_window_minutes",
      "rate_limit_enquiry_limit",
      "rate_limit_enquiry_window_minutes",
      "rate_limit_payment_limit",
      "rate_limit_payment_window_minutes",
      "lead_guard_anonymous_dedupe_minutes",
      "lead_guard_user_dedupe_minutes",
      "whatsapp_business_lead_daily_cap",
      "whatsapp_business_lead_cooldown_minutes",
      "premium_lead_delay_minutes",
      "search_nearby_radius_km",
    ];

    const numberFieldRules = {
      rate_limit_api_limit: { min: 1, max: 100000 },
      rate_limit_api_window_minutes: { min: 1, max: 1440 },
      rate_limit_auth_limit: { min: 1, max: 100000 },
      rate_limit_auth_window_minutes: { min: 1, max: 1440 },
      rate_limit_otp_limit: { min: 1, max: 100000 },
      rate_limit_otp_window_minutes: { min: 1, max: 1440 },
      rate_limit_businesslist_limit: { min: 1, max: 100000 },
      rate_limit_businesslist_window_minutes: { min: 1, max: 1440 },
      rate_limit_chat_limit: { min: 1, max: 100000 },
      rate_limit_chat_window_minutes: { min: 1, max: 1440 },
      rate_limit_lead_limit: { min: 1, max: 100000 },
      rate_limit_lead_window_minutes: { min: 1, max: 1440 },
      rate_limit_enquiry_limit: { min: 1, max: 100000 },
      rate_limit_enquiry_window_minutes: { min: 1, max: 1440 },
      rate_limit_payment_limit: { min: 1, max: 100000 },
      rate_limit_payment_window_minutes: { min: 1, max: 1440 },
      lead_guard_anonymous_dedupe_minutes: { min: 0, max: 1440 },
      lead_guard_user_dedupe_minutes: { min: 0, max: 1440 },
      whatsapp_business_lead_daily_cap: { min: 0, max: 100 },
      whatsapp_business_lead_cooldown_minutes: { min: 0, max: 1440 },
      premium_lead_delay_minutes: { min: 0, max: 1440 },
      search_nearby_radius_km: { min: 1, max: 100 },
    };

    // Validate logging_level enum
    const validLogLevels = ['off', 'error', 'warn', 'info', 'debug'];
    if ('logging_level' in req.body && !validLogLevels.includes(req.body.logging_level)) {
      await logger.warn(`Invalid logging_level attempted`, {
        admin: adminEmail,
        attemptedLevel: req.body.logging_level,
        validLevels: validLogLevels
      });
      return res.status(400).json({
        success: false,
        message: `Invalid logging_level. Must be one of: ${validLogLevels.join(', ')}`
      });
    }

    const validRechargeProviders = ["pay2all"];
    if (
      "recharge_api_provider" in req.body &&
      !validRechargeProviders.includes(req.body.recharge_api_provider)
    ) {
      await logger.warn(`Invalid recharge provider attempted`, {
        admin: adminEmail,
        attemptedProvider: req.body.recharge_api_provider
      });
      return res.status(400).json({
        success: false,
        message: `Invalid recharge provider. Must be one of: ${validRechargeProviders.join(", ")}`
      });
    }

    const validPhonePeModes = ["legacy_v1", "standard_checkout_v2"];
    if (
      "phonepe_integration_mode" in req.body &&
      !validPhonePeModes.includes(req.body.phonepe_integration_mode)
    ) {
      await logger.warn(`Invalid PhonePe integration mode attempted`, {
        admin: adminEmail,
        attemptedMode: req.body.phonepe_integration_mode
      });
      return res.status(400).json({
        success: false,
        message: `Invalid PhonePe integration mode. Must be one of: ${validPhonePeModes.join(", ")}`
      });
    }

    const validPhonePeEnvironments = ["sandbox", "production"];
    if (
      "phonepe_environment" in req.body &&
      !validPhonePeEnvironments.includes(req.body.phonepe_environment)
    ) {
      await logger.warn(`Invalid PhonePe environment attempted`, {
        admin: adminEmail,
        attemptedEnvironment: req.body.phonepe_environment
      });
      return res.status(400).json({
        success: false,
        message: `Invalid PhonePe environment. Must be one of: ${validPhonePeEnvironments.join(", ")}`
      });
    }

    if ("phonepe_client_version" in req.body) {
      const clientVersion = String(req.body.phonepe_client_version || "").trim();
      if (!/^\d+$/.test(clientVersion)) {
        await logger.warn(`Invalid PhonePe client version attempted`, {
          admin: adminEmail,
          attemptedVersion: req.body.phonepe_client_version
        });
        return res.status(400).json({
          success: false,
          message: "PhonePe client version must be a whole number"
        });
      }
    }

    if ("recharge_pay2all_base_url" in req.body) {
      const urlError = assertValidUrl(req.body.recharge_pay2all_base_url, "recharge_pay2all_base_url");
      if (urlError) {
        await logger.warn(`Invalid Pay2All base URL attempted`, {
          admin: adminEmail,
          attemptedUrl: req.body.recharge_pay2all_base_url
        });
        return res.status(400).json({ success: false, message: urlError });
      }
    }

    if (req.body.phonepe_redirect_base_url) {
      const urlError = assertValidUrl(req.body.phonepe_redirect_base_url, "phonepe_redirect_base_url");
      if (urlError) {
        await logger.warn(`Invalid PhonePe redirect base URL attempted`, {
          admin: adminEmail,
          attemptedUrl: req.body.phonepe_redirect_base_url
        });
        return res.status(400).json({ success: false, message: urlError });
      }
    }

    if (req.body.phonepe_legacy_base_url) {
      const urlError = assertValidUrl(req.body.phonepe_legacy_base_url, "phonepe_legacy_base_url");
      if (urlError) {
        await logger.warn(`Invalid PhonePe legacy base URL attempted`, {
          admin: adminEmail,
          attemptedUrl: req.body.phonepe_legacy_base_url
        });
        return res.status(400).json({ success: false, message: urlError });
      }
    }

    if ("recharge_pay2all_webhook_path" in req.body) {
      const webhookPathError = assertValidWebhookPath(req.body.recharge_pay2all_webhook_path);
      if (webhookPathError) {
        await logger.warn(`Invalid Pay2All webhook path attempted`, {
          admin: adminEmail,
          attemptedPath: req.body.recharge_pay2all_webhook_path
        });
        return res.status(400).json({ success: false, message: webhookPathError });
      }
    }

    const updates = {};

    for (const key of booleanFields) {
      if (key in req.body) updates[key] = Boolean(req.body[key]);
    }

    for (const key of stringFields) {
      if (key in req.body) updates[key] = String(req.body[key]).trim();
    }

    if ("recharge_pay2all_api_token" in req.body) {
      const token = String(req.body.recharge_pay2all_api_token || "").trim();
      if (token.length < 12) {
        await logger.warn(`Invalid Pay2All token attempted`, { admin: adminEmail });
        return res.status(400).json({
          success: false,
          message: "Pay2All API token looks too short"
        });
      }
      updates.recharge_pay2all_api_token = token;
      updates.recharge_pay2all_api_token_updated_at = new Date();
    }

    if ("recharge_pay2all_bbps_biller_map" in req.body) {
      const map = req.body.recharge_pay2all_bbps_biller_map;
      if (!map || typeof map !== "object" || Array.isArray(map)) {
        return res.status(400).json({ success: false, message: "recharge_pay2all_bbps_biller_map must be an object" });
      }
      for (const [provider, entry] of Object.entries(map)) {
        if (!entry || typeof entry !== "object" || !String(entry.billerId || "").trim() || !String(entry.paramKey || "").trim()) {
          return res.status(400).json({
            success: false,
            message: `recharge_pay2all_bbps_biller_map.${provider} must include billerId and paramKey`,
          });
        }
      }
      updates.recharge_pay2all_bbps_biller_map = map;
    }

    if ("recharge_pay2all_bbps_token" in req.body) {
      const token = String(req.body.recharge_pay2all_bbps_token || "").trim();
      if (token.length < 12) {
        await logger.warn(`Invalid Pay2All BBPS token attempted`, { admin: adminEmail });
        return res.status(400).json({
          success: false,
          message: "Pay2All BBPS token looks too short"
        });
      }
      updates.recharge_pay2all_bbps_token = token;
      updates.recharge_pay2all_bbps_token_updated_at = new Date();
    }

    if ("phonepe_client_secret" in req.body) {
      const secret = String(req.body.phonepe_client_secret || "").trim();
      if (secret.length < 12) {
        await logger.warn(`Invalid PhonePe client secret attempted`, { admin: adminEmail });
        return res.status(400).json({
          success: false,
          message: "PhonePe client secret looks too short"
        });
      }
      updates.phonepe_client_secret = secret;
      updates.phonepe_client_secret_updated_at = new Date();
    }

    if ("phonepe_legacy_salt_key" in req.body) {
      const saltKey = String(req.body.phonepe_legacy_salt_key || "").trim();
      if (saltKey.length < 8) {
        await logger.warn(`Invalid PhonePe legacy salt key attempted`, { admin: adminEmail });
        return res.status(400).json({
          success: false,
          message: "PhonePe legacy salt key looks too short"
        });
      }
      updates.phonepe_legacy_salt_key = saltKey;
      updates.phonepe_legacy_salt_key_updated_at = new Date();
    }

    const validCustomerListSendModes = ["single", "split"];
    if (
      "whatsapp_customer_business_list_send_mode" in req.body &&
      !validCustomerListSendModes.includes(req.body.whatsapp_customer_business_list_send_mode)
    ) {
      await logger.warn(`Invalid customer list send mode attempted`, {
        admin: adminEmail,
        attemptedMode: req.body.whatsapp_customer_business_list_send_mode,
        validModes: validCustomerListSendModes
      });
      return res.status(400).json({
        success: false,
        message: `Invalid customer list send mode. Must be one of: ${validCustomerListSendModes.join(', ')}`
      });
    }

    for (const key of numberFields) {
      if (!(key in req.body)) continue;

      const numericValue = Number(req.body[key]);
      const rules = numberFieldRules[key];

      if (
        !Number.isFinite(numericValue) ||
        !Number.isInteger(numericValue) ||
        numericValue < rules.min ||
        numericValue > rules.max
      ) {
        await logger.warn(`Invalid numeric system setting attempted`, {
          admin: adminEmail,
          field: key,
          value: req.body[key],
          rules
        });
        return res.status(400).json({
          success: false,
          message: `${key} must be an integer between ${rules.min} and ${rules.max}`
        });
      }

      updates[key] = numericValue;
    }

    if (!Object.keys(updates).length) {
      await logger.warn(`Update request with no valid fields`, {
        admin: adminEmail,
        providedFields: Object.keys(req.body)
      });
      return res.status(400).json({ success: false, message: "No valid fields provided" });
    }

    updates.updatedBy = adminEmail;

    // Log specific updates for important settings
    if ("logging_enabled" in updates) {
      await logger.warn(`Logging master toggle changed`, {
        admin: adminEmail,
        newValue: updates.logging_enabled
      });
    }

    if ("logging_level" in updates) {
      await logger.warn(`Logging level changed`, {
        admin: adminEmail,
        newLevel: updates.logging_level
      });
    }

    if ("logging_fcm_debug" in updates) {
      await logger.info(`FCM debug logging ${updates.logging_fcm_debug ? 'enabled' : 'disabled'}`, {
        admin: adminEmail
      });
    }

    if ("logging_sms_debug" in updates) {
      await logger.info(`SMS debug logging ${updates.logging_sms_debug ? 'enabled' : 'disabled'}`, {
        admin: adminEmail
      });
    }

    if ("logging_seo_debug" in updates) {
      await logger.info(`SEO debug logging ${updates.logging_seo_debug ? 'enabled' : 'disabled'}`, {
        admin: adminEmail
      });
    }

    if ("logging_db_queries" in updates) {
      await logger.info(`Database query logging ${updates.logging_db_queries ? 'enabled' : 'disabled'}`, {
        admin: adminEmail
      });
    }

    const settings = await systemSettingsModel.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    await logger.info(`System settings updated successfully`, {
      admin: adminEmail,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    invalidateCache();
    invalidateMaintenanceCache();
    if ("search_nearby_radius_km" in updates) {
      await invalidateSearchCache();
    }

    if ("app_maintenance_mode" in updates) {
      const isActive = !!updates.app_maintenance_mode;
      await logger.warn(`Maintenance mode ${isActive ? 'ACTIVATED' : 'DEACTIVATED'}`, {
        admin: adminEmail,
        active: isActive
      });

      try {
        getIO()?.emit(WS_EVENTS.APP_MAINTENANCE, { active: isActive });
        await logger.info(`Maintenance mode broadcast to WebSocket clients`, {
          admin: adminEmail,
          active: isActive
        });
      } catch (e) {
        await logger.error(`Failed to broadcast maintenance mode via WebSocket`, {
          message: e.message,
          admin: adminEmail
        });
      }
    }

    return res.status(200).json({ success: true, data: sanitizeSystemSettings(settings) });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("updateSystemSettingsAction error", error, {
      admin: adminEmail,
      stack: error.stack
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPay2AllBalanceAction = async (req, res) => {
  const adminEmail = req.authUser?.email || "admin";

  try {
    await logger.info("Checking Pay2All balance", {
      admin: adminEmail,
      ip: req.ip,
    });

    const balance = await fetchPay2AllBalance();

    return res.status(200).json({
      success: true,
      data: {
        balance,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Pay2All balance check failed";

    await logger.error("getPay2AllBalanceAction error", error, {
      admin: adminEmail,
      statusCode,
    });

    return res.status(statusCode).json({
      success: false,
      message: providerMessage,
    });
  }
};

export const getPay2AllBbpsCategoriesAction = async (req, res) => {
  const adminEmail = req.authUser?.email || "admin";
  try {
    await logger.info("Fetching Pay2All BBPS categories", { admin: adminEmail, ip: req.ip });
    const data = await fetchPay2AllBbpsCategoriesRaw();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const providerMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Pay2All BBPS categories check failed";
    await logger.error("getPay2AllBbpsCategoriesAction error", error, { admin: adminEmail, statusCode });
    return res.status(statusCode).json({ success: false, message: providerMessage });
  }
};

export const getPay2AllBbpsBillersAction = async (req, res) => {
  const adminEmail = req.authUser?.email || "admin";
  try {
    const { slug } = req.params;
    await logger.info("Fetching Pay2All BBPS billers", { admin: adminEmail, ip: req.ip, slug });
    const data = await fetchPay2AllBbpsBillersRaw(slug);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const providerMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Pay2All BBPS billers check failed";
    await logger.error("getPay2AllBbpsBillersAction error", error, { admin: adminEmail, statusCode });
    return res.status(statusCode).json({ success: false, message: providerMessage });
  }
};

export const getPay2AllBbpsBillerFieldsAction = async (req, res) => {
  const adminEmail = req.authUser?.email || "admin";
  try {
    const { billerId } = req.params;
    await logger.info("Fetching Pay2All BBPS biller fields", { admin: adminEmail, ip: req.ip, billerId });
    const data = await fetchPay2AllBbpsBillerFieldsRaw(billerId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const providerMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Pay2All BBPS biller fields check failed";
    await logger.error("getPay2AllBbpsBillerFieldsAction error", error, { admin: adminEmail, statusCode });
    return res.status(statusCode).json({ success: false, message: providerMessage });
  }
};

export const getPhonePeAuthCheckAction = async (req, res) => {
  const adminEmail = req.authUser?.email || "admin";

  try {
    await logger.info("Checking PhonePe Standard Checkout auth", {
      admin: adminEmail,
      ip: req.ip,
    });

    const auth = await checkPhonePeStandardCheckoutAuth();

    return res.status(200).json({
      success: true,
      data: {
        auth,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.error_description ||
      error.response?.data?.error ||
      error.message ||
      "PhonePe auth check failed";

    await logger.error("getPhonePeAuthCheckAction error", error, {
      admin: adminEmail,
      statusCode,
    });

    return res.status(statusCode).json({
      success: false,
      message: providerMessage,
    });
  }
};
