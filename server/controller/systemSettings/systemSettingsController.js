import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";
import { invalidateCache } from "../../helper/systemSettings/settingsService.js";
import { getIO } from "../../websocket/ioInstance.js";
import { WS_EVENTS } from "../../websocket/constants.js";

export const getSystemSettingsAction = async (req, res) => {
  try {
    let settings = await systemSettingsModel.findOne().lean();

    if (!settings) {
      settings = await systemSettingsModel.create({});
      settings = settings.toObject();
    }

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("getSystemSettingsAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSettingsAction = async (req, res) => {
  try {
    const booleanFields = [
      "otp_real_enabled",
      "whatsapp_business_lead_alert",
      "whatsapp_customer_business_list",
      "whatsapp_mni_lead_alert",
      "whatsapp_mni_customer_list",
      "whatsapp_login_welcome",
      "app_maintenance_mode",
    ];

    const stringFields = [
      "app_android_latest_version",
      "app_android_min_version",
      "app_android_update_url",
      "app_ios_latest_version",
      "app_ios_min_version",
      "app_ios_update_url",
      "app_release_notes",
    ];

    const updates = {};

    for (const key of booleanFields) {
      if (key in req.body) updates[key] = Boolean(req.body[key]);
    }

    for (const key of stringFields) {
      if (key in req.body) updates[key] = String(req.body[key]).trim();
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No valid fields provided" });
    }

    updates.updatedBy = req.authUser?.email || "admin";

    const settings = await systemSettingsModel.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    invalidateCache();

    if ("app_maintenance_mode" in updates) {
      try {
        getIO()?.emit(WS_EVENTS.APP_MAINTENANCE, { active: !!updates.app_maintenance_mode });
      } catch (e) {
        console.warn("[WS] Could not broadcast maintenance mode:", e.message);
      }
    }

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("updateSystemSettingsAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
