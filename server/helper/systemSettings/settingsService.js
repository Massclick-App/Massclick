import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";

export const SYSTEM_SETTINGS_DEFAULTS = {
  otp_real_enabled: true,
  rate_limit_enabled: true,
  rate_limit_api_limit: 900,
  rate_limit_api_window_minutes: 15,
  rate_limit_auth_limit: 20,
  rate_limit_auth_window_minutes: 15,
  rate_limit_otp_limit: 5,
  rate_limit_otp_window_minutes: 10,
  rate_limit_businesslist_limit: 240,
  rate_limit_businesslist_window_minutes: 10,
  rate_limit_chat_limit: 120,
  rate_limit_chat_window_minutes: 15,
  rate_limit_lead_limit: 30,
  rate_limit_lead_window_minutes: 15,
  rate_limit_enquiry_limit: 120,
  rate_limit_enquiry_window_minutes: 15,
  rate_limit_payment_limit: 20,
  rate_limit_payment_window_minutes: 15,
  whatsapp_business_lead_alert: true,
  whatsapp_customer_business_list: true,
  whatsapp_customer_business_list_send_mode: "split",
  whatsapp_mni_lead_alert: true,
  whatsapp_mni_customer_list: true,
  whatsapp_login_welcome: true,
  lead_guard_search_text_required: true,
  lead_guard_anonymous_dedupe_enabled: true,
  lead_guard_anonymous_dedupe_minutes: 5,
  lead_guard_user_dedupe_enabled: true,
  lead_guard_user_dedupe_minutes: 5,
  lead_guard_live_business_only: true,
  whatsapp_business_lead_daily_cap_enabled: true,
  whatsapp_business_lead_daily_cap: 3,
  whatsapp_business_lead_duplicate_guard_enabled: true,
  whatsapp_business_lead_cooldown_enabled: true,
  whatsapp_business_lead_cooldown_minutes: 45,
  whatsapp_recipient_health_guard_enabled: true,
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000; // 60-second in-memory cache

export const getSettings = async () => {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;

  let doc = await systemSettingsModel.findOne().lean();
  if (!doc) {
    doc = await systemSettingsModel.create(SYSTEM_SETTINGS_DEFAULTS);
    doc = doc.toObject();
  }

  cache = { ...SYSTEM_SETTINGS_DEFAULTS, ...doc };
  cacheAt = now;
  return cache;
};

export const invalidateCache = () => {
  cache = null;
  cacheAt = 0;
};
