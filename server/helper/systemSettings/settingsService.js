import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";

const DEFAULTS = {
  otp_real_enabled: true,
  whatsapp_business_lead_alert: true,
  whatsapp_customer_business_list: true,
  whatsapp_mni_lead_alert: true,
  whatsapp_mni_customer_list: true,
  whatsapp_login_welcome: true,
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000; // 60-second in-memory cache

export const getSettings = async () => {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;

  let doc = await systemSettingsModel.findOne().lean();
  if (!doc) {
    doc = await systemSettingsModel.create(DEFAULTS);
    doc = doc.toObject();
  }

  cache = { ...DEFAULTS, ...doc };
  cacheAt = now;
  return cache;
};

export const invalidateCache = () => {
  cache = null;
  cacheAt = 0;
};
