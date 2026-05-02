import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";
import { invalidateCache } from "../../helper/systemSettings/settingsService.js";

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
    const allowed = [
      "otp_real_enabled",
      "whatsapp_business_lead_alert",
      "whatsapp_customer_business_list",
      "whatsapp_mni_lead_alert",
      "whatsapp_mni_customer_list",
      "whatsapp_login_welcome",
    ];

    const updates = {};
    for (const key of allowed) {
      if (key in req.body) {
        updates[key] = Boolean(req.body[key]);
      }
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

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("updateSystemSettingsAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
