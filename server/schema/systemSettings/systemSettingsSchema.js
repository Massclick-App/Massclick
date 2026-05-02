import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    // OTP — true = real MSG91, false = bypass (fake OTP, any code accepted)
    otp_real_enabled: { type: Boolean, default: true },

    // WhatsApp: notify matching business owners when a customer searches
    whatsapp_business_lead_alert: { type: Boolean, default: true },

    // WhatsApp: send top-10 business list to the searching customer
    whatsapp_customer_business_list: { type: Boolean, default: true },

    // WhatsApp: send MNI requirement alert to matching business
    whatsapp_mni_lead_alert: { type: Boolean, default: true },

    // WhatsApp: send MNI business result list to the requesting customer
    whatsapp_mni_customer_list: { type: Boolean, default: true },

    // WhatsApp: send welcome message to new users on first login
    whatsapp_login_welcome: { type: Boolean, default: true },

    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default systemSettingsSchema;
