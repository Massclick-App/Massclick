import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    // OTP — true = real MSG91, false = bypass (fake OTP, any code accepted)
    otp_real_enabled: { type: Boolean, default: true },

    // Rate limiting controls
    rate_limit_enabled: { type: Boolean, default: true },
    rate_limit_api_limit: { type: Number, default: 900, min: 1 },
    rate_limit_api_window_minutes: { type: Number, default: 15, min: 1 },
    rate_limit_auth_limit: { type: Number, default: 20, min: 1 },
    rate_limit_auth_window_minutes: { type: Number, default: 15, min: 1 },
    rate_limit_otp_limit: { type: Number, default: 5, min: 1 },
    rate_limit_otp_window_minutes: { type: Number, default: 10, min: 1 },
    rate_limit_businesslist_limit: { type: Number, default: 240, min: 1 },
    rate_limit_businesslist_window_minutes: { type: Number, default: 10, min: 1 },
    rate_limit_chat_limit: { type: Number, default: 120, min: 1 },
    rate_limit_chat_window_minutes: { type: Number, default: 15, min: 1 },
    rate_limit_lead_limit: { type: Number, default: 30, min: 1 },
    rate_limit_lead_window_minutes: { type: Number, default: 15, min: 1 },
    rate_limit_enquiry_limit: { type: Number, default: 120, min: 1 },
    rate_limit_enquiry_window_minutes: { type: Number, default: 15, min: 1 },
    rate_limit_payment_limit: { type: Number, default: 20, min: 1 },
    rate_limit_payment_window_minutes: { type: Number, default: 15, min: 1 },

    // WhatsApp: notify matching business owners when a customer searches
    whatsapp_business_lead_alert: { type: Boolean, default: true },

    // WhatsApp: send top-10 business list to the searching customer
    whatsapp_customer_business_list: { type: Boolean, default: true },
    whatsapp_customer_business_list_send_mode: {
      type: String,
      enum: ["single", "split"],
      default: "split",
    },

    // WhatsApp: send MNI requirement alert to matching business
    whatsapp_mni_lead_alert: { type: Boolean, default: true },

    // WhatsApp: send MNI business result list to the requesting customer
    whatsapp_mni_customer_list: { type: Boolean, default: true },

    // WhatsApp: send welcome message to new users on first login
    whatsapp_login_welcome: { type: Boolean, default: true },

    // Lead guard controls
    lead_guard_search_text_required: { type: Boolean, default: true },
    lead_guard_anonymous_dedupe_enabled: { type: Boolean, default: true },
    lead_guard_anonymous_dedupe_minutes: { type: Number, default: 5, min: 0 },
    lead_guard_user_dedupe_enabled: { type: Boolean, default: true },
    lead_guard_user_dedupe_minutes: { type: Number, default: 5, min: 0 },
    lead_guard_live_business_only: { type: Boolean, default: true },
    whatsapp_business_lead_daily_cap_enabled: { type: Boolean, default: true },
    whatsapp_business_lead_daily_cap: { type: Number, default: 3, min: 0 },
    whatsapp_business_lead_duplicate_guard_enabled: { type: Boolean, default: true },
    whatsapp_business_lead_cooldown_enabled: { type: Boolean, default: true },
    whatsapp_business_lead_cooldown_minutes: { type: Number, default: 45, min: 0 },
    whatsapp_recipient_health_guard_enabled: { type: Boolean, default: true },

    // App Version Management
    app_android_latest_version: { type: String, default: "1.0.0" },
    app_android_min_version: { type: String, default: "1.0.0" },
    app_android_update_url: { type: String, default: "https://play.google.com/store/apps/details?id=com.massclick.massclick" },
    app_ios_latest_version: { type: String, default: "1.0.0" },
    app_ios_min_version: { type: String, default: "1.0.0" },
    app_ios_update_url: { type: String, default: "" },
    app_maintenance_mode: { type: Boolean, default: false },
    app_release_notes: { type: String, default: "Bug fixes and performance improvements." },

    // Logging Controls
    logging_enabled: { type: Boolean, default: true },
    logging_level: { type: String, enum: ['off', 'error', 'warn', 'info', 'debug'], default: 'info' },
    logging_fcm_debug: { type: Boolean, default: false },
    logging_sms_debug: { type: Boolean, default: false },
    logging_seo_debug: { type: Boolean, default: false },
    logging_db_queries: { type: Boolean, default: false },

    // Redis/Cache Controls
    redis_enabled: { type: Boolean, default: true },

    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default systemSettingsSchema;
