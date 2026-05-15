import { getSettings } from '../helper/systemSettings/settingsService.js';

const LOG_LEVELS = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

export const createLogger = (moduleName = 'APP') => {
  return {
    debug: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (!settings.logging_enabled) return;
        const levelValue = LOG_LEVELS[settings.logging_level] || LOG_LEVELS.info;
        if (levelValue >= LOG_LEVELS.debug) {
          console.log(`[${moduleName}:DEBUG]`, message, data);
        }
      } catch (err) {
        console.log(`[${moduleName}:DEBUG]`, message, data);
      }
    },

    info: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (!settings.logging_enabled) return;
        const levelValue = LOG_LEVELS[settings.logging_level] || LOG_LEVELS.info;
        if (levelValue >= LOG_LEVELS.info) {
          console.log(`[${moduleName}:INFO]`, message, data);
        }
      } catch (err) {
        console.log(`[${moduleName}:INFO]`, message, data);
      }
    },

    warn: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (!settings.logging_enabled) return;
        const levelValue = LOG_LEVELS[settings.logging_level] || LOG_LEVELS.info;
        if (levelValue >= LOG_LEVELS.warn) {
          console.warn(`[${moduleName}:WARN]`, message, data);
        }
      } catch (err) {
        console.warn(`[${moduleName}:WARN]`, message, data);
      }
    },

    error: async (message, error = null) => {
      try {
        const settings = await getSettings();
        if (!settings.logging_enabled) return;
        const levelValue = LOG_LEVELS[settings.logging_level] || LOG_LEVELS.info;
        if (levelValue >= LOG_LEVELS.error) {
          console.error(`[${moduleName}:ERROR]`, message, error?.message || error);
        }
      } catch (err) {
        console.error(`[${moduleName}:ERROR]`, message, error?.message || error);
      }
    },

    // Module-specific debug logs
    fcmDebug: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (settings.logging_fcm_debug && settings.logging_enabled) {
          console.log(`[FCM:DEBUG]`, message, data);
        }
      } catch (err) {
        console.log(`[FCM:DEBUG]`, message, data);
      }
    },

    smsDebug: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (settings.logging_sms_debug && settings.logging_enabled) {
          console.log(`[SMS:DEBUG]`, message, data);
        }
      } catch (err) {
        console.log(`[SMS:DEBUG]`, message, data);
      }
    },

    seoDebug: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (settings.logging_seo_debug && settings.logging_enabled) {
          console.log(`[SEO:DEBUG]`, message, data);
        }
      } catch (err) {
        console.log(`[SEO:DEBUG]`, message, data);
      }
    },

    dbDebug: async (message, data = {}) => {
      try {
        const settings = await getSettings();
        if (settings.logging_db_queries && settings.logging_enabled) {
          console.log(`[DB:DEBUG]`, message, data);
        }
      } catch (err) {
        console.log(`[DB:DEBUG]`, message, data);
      }
    }
  };
};
