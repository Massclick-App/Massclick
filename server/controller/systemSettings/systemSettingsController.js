import systemSettingsModel from "../../model/systemSettings/systemSettingsModel.js";
import { invalidateCache } from "../../helper/systemSettings/settingsService.js";
import { getIO } from "../../websocket/ioInstance.js";
import { WS_EVENTS } from "../../websocket/constants.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("SYSTEM_SETTINGS");

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
      android_version: settings.app_android_latest_version,
      ios_version: settings.app_ios_latest_version
    };

    await logger.info(`System settings fetched successfully`, {
      admin: adminEmail,
      summary: settingsSummary
    });

    return res.status(200).json({ success: true, data: settings });
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
      "whatsapp_business_lead_alert",
      "whatsapp_customer_business_list",
      "whatsapp_mni_lead_alert",
      "whatsapp_mni_customer_list",
      "whatsapp_login_welcome",
      "app_maintenance_mode",
      "logging_enabled",
      "logging_fcm_debug",
      "logging_sms_debug",
      "logging_seo_debug",
      "logging_db_queries",
      "redis_enabled",
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
    ];

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

    const updates = {};

    for (const key of booleanFields) {
      if (key in req.body) updates[key] = Boolean(req.body[key]);
    }

    for (const key of stringFields) {
      if (key in req.body) updates[key] = String(req.body[key]).trim();
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

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    const adminEmail = req.authUser?.email || "admin";
    await logger.error("updateSystemSettingsAction error", error, {
      admin: adminEmail,
      stack: error.stack
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};
