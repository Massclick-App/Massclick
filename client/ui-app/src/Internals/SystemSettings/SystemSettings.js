import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSystemSettings, updateSystemSettings } from "../../redux/actions/systemSettingsAction.js";
import { fetchRedisStatus, invalidateCache, clearAllCaches, fetchRedisKeys, deleteRedisKeys, fetchRedisInfo, flushRedisDb, deleteRedisPattern } from "../../redux/actions/cacheActions.js";
import styles from "./SystemSettings.module.css";

// Icons
const cx = createScopedClassNames(styles);
const SettingsIcon = () => <span>⚙️</span>;
const SmsIcon = () => <span>📱</span>;
const WhatsAppIcon = () => <span>💬</span>;
const SystemUpdateAltIcon = () => <span>🔄</span>;
const ConstructionIcon = () => <span>🔧</span>;
const AndroidIcon = () => <span>🤖</span>;
const PhoneIphoneIcon = () => <span>📱</span>;
const CloudSyncIcon = () => <span>☁️</span>;
const DebugIcon = () => <span>🔍</span>;
const DatabaseIcon = () => <span>🗄️</span>;
const AlertIcon = () => <span>⚡</span>;
const GuardIcon = () => <span>🛡️</span>;
const formatUptime = seconds => {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(seconds % 86400 / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
const globToRegex = pattern => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
};
const TtlBadge = ({
  ttl
}) => {
  if (ttl === -2) return <span className={cx("ttl-badge ttl-expired")}>expired</span>;
  if (ttl === -1) return <span className={cx("ttl-badge ttl-forever")}>∞</span>;
  if (ttl < 60) return <span className={cx("ttl-badge ttl-soon")}>{ttl}s</span>;
  if (ttl < 3600) return <span className={cx("ttl-badge ttl-medium")}>{Math.floor(ttl / 60)}m</span>;
  return <span className={cx("ttl-badge ttl-long")}>{Math.floor(ttl / 3600)}h</span>;
};
const HelpHint = ({
  text
}) => {
  if (!text) return null;
  return <span className={cx("help-hint")} tabIndex={0} role="note" aria-label={text} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <span className={cx("help-hint-icon")}>?</span>
      <span className={cx("help-hint-bubble")}>{text}</span>
    </span>;
};
const FIELD_HELP = {
  app_maintenance_mode: "Turns the whole app into maintenance mode. Users are blocked until this is disabled.",
  otp_real_enabled: "When enabled, OTPs go through MSG91. When disabled, OTP verification uses the bypass/dev behavior.",
  whatsapp_business_lead_alert: "Sends a WhatsApp lead alert to matched business owners when a customer searches.",
  whatsapp_customer_business_list: "Sends the matched business list back to the customer after their search.",
  whatsapp_customer_business_list_send_mode: "Single sends one customer message with up to 5 businesses. Split sends two messages with up to 10 businesses.",
  whatsapp_mni_lead_alert: "Sends MNI requirement alerts to matched businesses.",
  whatsapp_mni_customer_list: "Sends the matched MNI business result list to the requesting customer.",
  whatsapp_login_welcome: "Sends a welcome WhatsApp message after a customer's first login.",
  lead_guard_search_text_required: "Blocks lead creation when the search text is empty.",
  lead_guard_anonymous_dedupe_enabled: "Prevents repeated anonymous searches from being logged too often.",
  lead_guard_user_dedupe_enabled: "Prevents the same customer from repeatedly triggering the same lead in a short window.",
  lead_guard_live_business_only: "When enabled, only businesses marked live are eligible for lead matching.",
  whatsapp_business_lead_daily_cap_enabled: "Limits how many WhatsApp lead alerts one business number can receive in a day.",
  whatsapp_business_lead_duplicate_guard_enabled: "Stops the same business receiving the same customer/category/location lead again on the same day.",
  whatsapp_business_lead_cooldown_enabled: "Adds a waiting period before the same business number can receive another lead WhatsApp.",
  whatsapp_recipient_health_guard_enabled: "Skips WhatsApp recipients marked invalid or temporarily suppressed after delivery failures.",
  logging_enabled: "Master switch for application logging controls.",
  logging_fcm_debug: "Enables extra logs for Firebase push notification delivery.",
  logging_sms_debug: "Enables extra logs for SMS and WhatsApp gateway calls.",
  logging_seo_debug: "Enables extra logs for SEO metadata and content operations.",
  logging_db_queries: "Enables extra logs around database-heavy operations.",
  logging_level: "Controls how much detail the server writes to logs.",
  app_android_latest_version: "Latest Android version available to users.",
  app_android_min_version: "Oldest Android version allowed before users must update.",
  app_android_update_url: "Play Store URL shown when Android users need an update.",
  app_ios_latest_version: "Latest iOS version available to users.",
  app_ios_min_version: "Oldest iOS version allowed before users must update.",
  app_ios_update_url: "App Store URL shown when iOS users need an update.",
  app_release_notes: "Short update notes shown with version/update messaging.",
  lead_guard_anonymous_dedupe_minutes: "How many minutes anonymous duplicate search logs are suppressed.",
  lead_guard_user_dedupe_minutes: "How many minutes duplicate customer leads are suppressed.",
  whatsapp_business_lead_daily_cap: "Maximum WhatsApp lead alerts one business number can receive per day.",
  whatsapp_business_lead_cooldown_minutes: "How many minutes to wait before sending another lead WhatsApp to the same business number.",
  redis_enabled: "Controls whether Redis-backed cache behavior is enabled.",
  cache_type: "Select which cache group should be invalidated.",
};
const validateVersionFormat = version => {
  if (!version) return null;
  const semverRegex = /^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/;
  return semverRegex.test(version) ? null : "Invalid version format (use X.Y or X.Y.Z)";
};
const validateUrl = url => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format";
  }
};
const validateLoggingLevel = level => {
  const validLevels = ['off', 'error', 'warn', 'info', 'debug'];
  return validLevels.includes(level) ? null : "Invalid logging level";
};
const validateCustomerListSendMode = mode => {
  const validModes = ['single', 'split'];
  return validModes.includes(mode) ? null : "Invalid customer list send mode";
};
const NUMBER_FIELD_RULES = {
  lead_guard_anonymous_dedupe_minutes: {
    min: 0,
    max: 1440
  },
  lead_guard_user_dedupe_minutes: {
    min: 0,
    max: 1440
  },
  whatsapp_business_lead_daily_cap: {
    min: 0,
    max: 100
  },
  whatsapp_business_lead_cooldown_minutes: {
    min: 0,
    max: 1440
  }
};
const getFieldValidationError = (key, value) => {
  if (key.includes('_version') || key === 'app_release_notes') return validateVersionFormat(value);
  if (key.includes('_url')) return validateUrl(value);
  if (key === 'logging_level') return validateLoggingLevel(value);
  if (key === 'whatsapp_customer_business_list_send_mode') return validateCustomerListSendMode(value);
  if (NUMBER_FIELD_RULES[key]) {
    const number = Number(value);
    const rule = NUMBER_FIELD_RULES[key];
    if (!Number.isInteger(number) || number < rule.min || number > rule.max) {
      return `Use a whole number from ${rule.min} to ${rule.max}`;
    }
  }
  return null;
};
const CACHE_TYPES = [{
  value: 'seo-meta',
  label: 'SEO Meta Tags'
}, {
  value: 'seo-page-content',
  label: 'SEO Page Content'
}, {
  value: 'seo-blog',
  label: 'SEO Blog'
}, {
  value: 'category',
  label: 'Categories'
}, {
  value: 'home-category',
  label: 'Home Categories'
}, {
  value: 'search',
  label: 'Search Results'
}, {
  value: 'suggestions',
  label: 'Suggestions'
}, {
  value: 'trends',
  label: 'Trending'
}, {
  value: 'reviews',
  label: 'Reviews'
}, {
  value: 'mobile',
  label: 'Mobile Lookup'
}, {
  value: 'dashboard',
  label: 'Dashboard'
}, {
  value: 'advertisement',
  label: 'Ads'
}];
const TOGGLE_GROUPS = [{
  label: "OTP / SMS",
  icon: SmsIcon,
  color: "#f97316",
  items: [{
    key: "otp_real_enabled",
    label: "Real OTP",
    desc: "MSG91 gateway"
  }]
}, {
  label: "WhatsApp",
  icon: WhatsAppIcon,
  color: "#22c55e",
  items: [{
    key: "whatsapp_business_lead_alert",
    label: "Business Lead Alert",
    desc: "Notify on search"
  }, {
    key: "whatsapp_customer_business_list",
    label: "Customer List",
    desc: "Top 10 matches"
  }, {
    key: "whatsapp_mni_lead_alert",
    label: "MNI Lead Alert",
    desc: "New requirements"
  }, {
    key: "whatsapp_mni_customer_list",
    label: "MNI Customer",
    desc: "Matched business"
  }, {
    key: "whatsapp_login_welcome",
    label: "Login Welcome",
    desc: "First login message"
  }]
}, {
  label: "Lead Guards",
  icon: GuardIcon,
  color: "#0ea5e9",
  items: [{
    key: "lead_guard_search_text_required",
    label: "Require Search Text",
    desc: "Block empty search leads"
  }, {
    key: "lead_guard_anonymous_dedupe_enabled",
    label: "Anonymous Dedup",
    desc: "Limit repeat anonymous logs"
  }, {
    key: "lead_guard_user_dedupe_enabled",
    label: "Customer Dedup",
    desc: "Avoid repeat customer leads"
  }, {
    key: "lead_guard_live_business_only",
    label: "Live Businesses Only",
    desc: "Send to active listings"
  }, {
    key: "whatsapp_business_lead_daily_cap_enabled",
    label: "Daily Business Cap",
    desc: "Limit sends per business"
  }, {
    key: "whatsapp_business_lead_duplicate_guard_enabled",
    label: "Duplicate WhatsApp Guard",
    desc: "Same customer/category/day"
  }, {
    key: "whatsapp_business_lead_cooldown_enabled",
    label: "Recipient Cooldown",
    desc: "Pause rapid WhatsApp sends"
  }, {
    key: "whatsapp_recipient_health_guard_enabled",
    label: "Recipient Health Guard",
    desc: "Skip invalid/suppressed numbers"
  }]
}, {
  label: "Logging",
  icon: DebugIcon,
  color: "#a855f7",
  items: [{
    key: "logging_enabled",
    label: "Enable Logging",
    desc: "Master toggle"
  }, {
    key: "logging_fcm_debug",
    label: "FCM Debug",
    desc: "Notifications"
  }, {
    key: "logging_sms_debug",
    label: "SMS Debug",
    desc: "Gateway logs"
  }, {
    key: "logging_seo_debug",
    label: "SEO Debug",
    desc: "Metadata logs"
  }, {
    key: "logging_db_queries",
    label: "DB Queries",
    desc: "Database ops"
  }]
}];
const PLATFORM_SECTIONS = [{
  platform: "Android",
  icon: AndroidIcon,
  color: "#22c55e",
  fields: [{
    key: "app_android_latest_version",
    label: "Latest Version",
    placeholder: "1.2.0",
    colSpan: 1
  }, {
    key: "app_android_min_version",
    label: "Min Version",
    placeholder: "1.0.0",
    colSpan: 1
  }, {
    key: "app_android_update_url",
    label: "Play Store URL",
    placeholder: "https://play.google.com/…",
    colSpan: 2
  }]
}, {
  platform: "iOS",
  icon: PhoneIphoneIcon,
  color: "#0ea5e9",
  fields: [{
    key: "app_ios_latest_version",
    label: "Latest Version",
    placeholder: "1.2.0",
    colSpan: 1
  }, {
    key: "app_ios_min_version",
    label: "Min Version",
    placeholder: "1.0.0",
    colSpan: 1
  }, {
    key: "app_ios_update_url",
    label: "App Store URL",
    placeholder: "https://apps.apple.com/…",
    colSpan: 2
  }]
}];
const GUARD_LIMIT_FIELDS = [{
  key: "lead_guard_anonymous_dedupe_minutes",
  label: "Anonymous Dedup Minutes",
  placeholder: "5"
}, {
  key: "lead_guard_user_dedupe_minutes",
  label: "Customer Dedup Minutes",
  placeholder: "5"
}, {
  key: "whatsapp_business_lead_daily_cap",
  label: "Daily Leads Per Business",
  placeholder: "3"
}, {
  key: "whatsapp_business_lead_cooldown_minutes",
  label: "Recipient Cooldown Minutes",
  placeholder: "45"
}];
const ALL_BOOL_KEYS = TOGGLE_GROUPS.flatMap(g => g.items.map(i => i.key));
const ALL_NUMBER_KEYS = GUARD_LIMIT_FIELDS.map(field => field.key);
const ALL_KEYS = [...ALL_BOOL_KEYS, ...ALL_NUMBER_KEYS, "app_maintenance_mode", "app_android_latest_version", "app_android_min_version", "app_android_update_url", "app_ios_latest_version", "app_ios_min_version", "app_ios_update_url", "app_release_notes", "logging_level", "whatsapp_customer_business_list_send_mode", "redis_enabled"];
export default function SystemSettings() {
  const dispatch = useDispatch();
  const {
    settings,
    loading,
    saving,
    error
  } = useSelector(s => s.systemSettings);
  const {
    redisStatus,
    cacheClearing,
    redisKeys,
    keysLoading,
    keysDeleting,
    redisInfo,
    infoLoading,
    flushing,
    patternDeleting
  } = useSelector(s => s.cache);
  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [selectedCache, setSelectedCache] = useState("seo-meta");
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [keyFilter, setKeyFilter] = useState("");
  const [patternInput, setPatternInput] = useState("");
  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);
  useEffect(() => {
    if (settings) setLocal({
      ...settings
    });
  }, [settings]);
  useEffect(() => {
    dispatch(fetchRedisStatus());
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchRedisKeys());
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchRedisInfo());
  }, [dispatch]);
  const toggle = key => {
    setLocal(p => {
      const updated = {
        ...p,
        [key]: !p[key]
      };
      if (key === "logging_enabled") {
        const isNowEnabled = !p[key];
        updated.logging_fcm_debug = isNowEnabled;
        updated.logging_sms_debug = isNowEnabled;
        updated.logging_seo_debug = isNowEnabled;
        updated.logging_db_queries = isNowEnabled;
      }
      return updated;
    });
  };
  const setText = (key, val) => {
    setLocal(p => ({
      ...p,
      [key]: val
    }));
    const error = getFieldValidationError(key, val);
    setValidationErrors(prev => {
      if (error) {
        return {
          ...prev,
          [key]: error
        };
      } else {
        const newErrors = {
          ...prev
        };
        delete newErrors[key];
        return newErrors;
      }
    });
  };
  const setNumber = (key, val) => {
    const nextValue = val === "" ? "" : Number(val);
    setLocal(p => ({
      ...p,
      [key]: nextValue
    }));
    const error = val === "" ? "Required" : getFieldValidationError(key, nextValue);
    setValidationErrors(prev => {
      if (error) {
        return {
          ...prev,
          [key]: error
        };
      }
      const newErrors = {
        ...prev
      };
      delete newErrors[key];
      return newErrors;
    });
  };
  const filteredKeys = redisKeys.filter(({
    key
  }) => !keyFilter || key.toLowerCase().includes(keyFilter.toLowerCase()));
  const toggleKey = key => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (filteredKeys.every(({
      key
    }) => selectedKeys.has(key))) {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        filteredKeys.forEach(({
          key
        }) => next.delete(key));
        return next;
      });
    } else {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        filteredKeys.forEach(({
          key
        }) => next.add(key));
        return next;
      });
    }
  };
  const patternMatchCount = useMemo(() => {
    if (!patternInput) return 0;
    try {
      const re = globToRegex(patternInput);
      return redisKeys.filter(({
        key
      }) => re.test(key)).length;
    } catch {
      return 0;
    }
  }, [patternInput, redisKeys]);
  const handleFlushDb = async () => {
    if (!window.confirm('⚠️ FLUSH ENTIRE REDIS DATABASE?\n\nThis permanently deletes ALL keys and cannot be undone.')) return;
    if (!window.confirm('Second confirmation: Wipe all Redis data right now?')) return;
    try {
      const result = await dispatch(flushRedisDb());
      setSelectedKeys(new Set());
      dispatch(fetchRedisInfo());
      setSnack({
        open: true,
        message: result?.message || 'Redis database flushed',
        severity: 'success'
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 4000);
    } catch {
      setSnack({
        open: true,
        message: 'Flush failed',
        severity: 'error'
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    }
  };
  const handleDeletePattern = async () => {
    if (!patternInput || patternMatchCount === 0) return;
    if (!window.confirm(`Delete ${patternMatchCount} key(s) matching "${patternInput}"?`)) return;
    try {
      const result = await dispatch(deleteRedisPattern(patternInput));
      setPatternInput('');
      dispatch(fetchRedisKeys());
      dispatch(fetchRedisInfo());
      setSnack({
        open: true,
        message: result?.message || `${patternMatchCount} key(s) deleted`,
        severity: 'success'
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    } catch {
      setSnack({
        open: true,
        message: 'Pattern delete failed',
        severity: 'error'
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    }
  };
  const handleDeleteSelectedKeys = async () => {
    const keys = [...selectedKeys];
    if (!window.confirm(`Delete ${keys.length} key(s) from Redis? This cannot be undone.`)) return;
    try {
      await dispatch(deleteRedisKeys(keys));
      setSelectedKeys(new Set());
      dispatch(fetchRedisKeys());
      setSnack({
        open: true,
        message: `${keys.length} key(s) deleted`,
        severity: "success"
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    } catch {
      setSnack({
        open: true,
        message: "Delete failed",
        severity: "error"
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    }
  };
  const dirty = settings && local ? ALL_KEYS.some(k => local[k] !== settings[k]) : false;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const handleSave = async () => {
    if (hasValidationErrors) {
      setSnack({
        open: true,
        message: "Fix validation errors",
        severity: "error"
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
      return;
    }
    const updates = {};
    ALL_KEYS.forEach(k => {
      updates[k] = local[k];
    });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({
        open: true,
        message: "Settings saved",
        severity: "success"
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    } catch {
      setSnack({
        open: true,
        message: "Save failed",
        severity: "error"
      });
      setTimeout(() => setSnack(s => ({
        ...s,
        open: false
      })), 3000);
    }
  };
  const handleClearCache = async () => {
    if (!selectedCache) {
      setSnack({
        open: true,
        message: "Select a cache type",
        severity: "error"
      });
      return;
    }
    if (!window.confirm(`Clear "${CACHE_TYPES.find(c => c.value === selectedCache)?.label}"?`)) return;
    try {
      await dispatch(invalidateCache(selectedCache));
      setSnack({
        open: true,
        message: "Cache cleared",
        severity: "success"
      });
    } catch (err) {
      setSnack({
        open: true,
        message: "Cache clear failed",
        severity: "error"
      });
    }
  };
  const handleClearAllCaches = async () => {
    if (!window.confirm("Clear ALL caches? Performance may be affected.")) return;
    try {
      await dispatch(clearAllCaches());
      setSnack({
        open: true,
        message: "All caches cleared",
        severity: "success"
      });
    } catch (err) {
      setSnack({
        open: true,
        message: "Clear failed",
        severity: "error"
      });
    }
  };
  if (loading || !local) {
    return <div className={cx("loading-container")}>
        <div className={cx("loading-spinner")}></div>
        <span>Loading system configuration...</span>
      </div>;
  }
  if (error) return <div className={cx("error-box")}>{error}</div>;
  const maintenanceOn = !!local.app_maintenance_mode;
  const enabledCount = ALL_BOOL_KEYS.filter(k => !!local[k]).length;
  return <div className={cx("settings-container")}>
      {/* Hero */}
      <div className={cx("hero")}>
        <div className={cx("hero-left")}>
          <div className={cx("hero-icon")}><SettingsIcon /></div>
          <div>
            <h1 className={cx("hero-title")}>System Settings</h1>
            <p className={cx("hero-subtitle")}>Real-time configuration · Instant updates</p>
          </div>
        </div>
        <div className={cx("hero-stats")}>
          <div className={cx("stat")}>
            <div className={cx("stat-value")}>{enabledCount}/{ALL_BOOL_KEYS.length}</div>
            <div className={cx("stat-label")}>Features Active</div>
          </div>
          <div className={cx(`stat status ${maintenanceOn ? 'maintenance' : 'operational'}`)}>
            <div className={cx("status-indicator")}></div>
            <div>
              <div className={cx("stat-value")} style={{
              fontSize: '12px',
              fontWeight: 700
            }}>
                {maintenanceOn ? 'MAINTENANCE' : 'OPERATIONAL'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Alert */}
      {maintenanceOn && <div className={cx("maintenance-alert")}>
          <div className={cx("maintenance-alert-icon")}><AlertIcon /></div>
          <div className={cx("maintenance-alert-content")}>
            <div className={cx("maintenance-alert-title")}>Maintenance Mode Active</div>
            <div className={cx("maintenance-alert-desc")}>All users are blocked. Disable to restore access.</div>
          </div>
          <button className={cx("maintenance-btn-disable")} onClick={() => toggle("app_maintenance_mode")}>
            Disable
          </button>
        </div>}

      {/* Main Grid */}
      <div className={cx("grid-layout")}>
        {/* Left Column */}
        <div className={cx("left-column")}>
          {/* Maintenance Card */}
          <div className={cx(`compact-card maintenance-card ${maintenanceOn ? 'active' : ''}`)}>
            <div className={cx("compact-card-header")}>
              <div className={cx("compact-icon")} style={{
              background: maintenanceOn ? '#ef4444' : '#6b7280'
            }}>
                <ConstructionIcon />
              </div>
              <div className={cx("compact-header-text")}>
                <div className={cx("label-with-help compact-title")}>
                  <span>Maintenance Mode</span>
                  <HelpHint text={FIELD_HELP.app_maintenance_mode} />
                </div>
                <div className={cx("compact-subtitle")}>{maintenanceOn ? 'BLOCKING USERS' : 'Disabled'}</div>
              </div>
            </div>
            <div className={cx("compact-card-body")}>
              <label className={cx("toggle-switch")}>
                <input type="checkbox" checked={maintenanceOn} onChange={() => toggle("app_maintenance_mode")} />
                <span className={cx("toggle-switch-slider")}></span>
              </label>
            </div>
          </div>

          {/* Toggle Groups */}
          {TOGGLE_GROUPS.map(group => <div key={group.label} className={cx("compact-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
              background: group.color
            }}>
                  <group.icon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>{group.label}</div>
                  <div className={cx("compact-subtitle")}>
                    {group.items.filter(i => local[i.key]).length} of {group.items.length} enabled
                  </div>
                </div>
              </div>
              <div className={cx("compact-card-items")}>
                {group.items.map(({
              key,
              label,
              desc
            }) => <div key={key} className={cx("toggle-item")} onClick={() => toggle(key)}>
                    <div className={cx("toggle-item-info")}>
                      <div className={cx("label-with-help toggle-item-label")}>
                        <span>{label}</span>
                        <HelpHint text={FIELD_HELP[key]} />
                      </div>
                      <div className={cx("toggle-item-desc")}>{desc}</div>
                    </div>
                    <label className={cx("toggle-switch")}>
                      <input type="checkbox" checked={!!local[key]} onChange={() => toggle(key)} />
                      <span className={cx("toggle-switch-slider")} style={{
                  '--color': group.color
                }}></span>
                    </label>
                  </div>)}
              </div>
            </div>)}
        </div>

        {/* Right Column */}
        <div className={cx("right-column")}>
          {/* Version Management */}
          <div className={cx("compact-card version-card")}>
            <div className={cx("compact-card-header")}>
              <div className={cx("compact-icon")} style={{
              background: '#f97316'
            }}>
                <SystemUpdateAltIcon />
              </div>
              <div className={cx("compact-header-text")}>
                <div className={cx("compact-title")}>Version Management</div>
              </div>
            </div>

            {PLATFORM_SECTIONS.map(({
            platform,
            icon: PlatformIcon,
            color,
            fields
          }, idx) => <React.Fragment key={platform}>
                <div className={cx("platform-group")}>
                  <div className={cx("platform-header")}>
                    <PlatformIcon /> {platform}
                  </div>
                  <div className={cx("form-grid")}>
                    {fields.map(({
                  key,
                  label,
                  placeholder,
                  colSpan
                }) => <div key={key} className={cx(`form-field ${colSpan === 2 ? 'span-2' : ''}`)}>
                        <label className={cx("label-with-help form-label")}>
                          <span>{label}</span>
                          <HelpHint text={FIELD_HELP[key]} />
                        </label>
                        <input type="text" className={cx(`form-input ${validationErrors[key] ? 'error' : ''}`)} value={local[key] ?? ""} onChange={e => setText(key, e.target.value)} placeholder={placeholder} />
                        {validationErrors[key] && <div className={cx("input-error")}>{validationErrors[key]}</div>}
                      </div>)}
                  </div>
                </div>
              </React.Fragment>)}

            {/* Release Notes */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>Release Notes</div>
              <div className={cx("form-field")}>
                <label className={cx("label-with-help form-label")}>
                  <span>What's new</span>
                  <HelpHint text={FIELD_HELP.app_release_notes} />
                </label>
                <textarea className={cx(`form-input ${validationErrors.app_release_notes ? 'error' : ''}`)} value={local.app_release_notes ?? ""} onChange={e => setText("app_release_notes", e.target.value)} placeholder="Bug fixes and improvements..." rows={3} />
                {validationErrors.app_release_notes && <div className={cx("input-error")}>{validationErrors.app_release_notes}</div>}
              </div>
            </div>

            {/* Logging */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>Logging</div>
              <div className={cx("form-field")}>
                <label className={cx("label-with-help form-label")}>
                  <span>Log Level</span>
                  <HelpHint text={FIELD_HELP.logging_level} />
                </label>
                <select className={cx("form-input")} value={local.logging_level ?? "info"} onChange={e => setText("logging_level", e.target.value)}>
                  <option value="off">Off</option>
                  <option value="error">Error</option>
                  <option value="warn">Warn</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>
            </div>

            {/* WhatsApp Customer Delivery */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>WhatsApp Customer Delivery</div>
              <div className={cx("form-field")}>
                <label className={cx("label-with-help form-label")}>
                  <span>Customer Business List Mode</span>
                  <HelpHint text={FIELD_HELP.whatsapp_customer_business_list_send_mode} />
                </label>
                <select className={cx(`form-input ${validationErrors.whatsapp_customer_business_list_send_mode ? 'error' : ''}`)} value={local.whatsapp_customer_business_list_send_mode ?? "split"} onChange={e => setText("whatsapp_customer_business_list_send_mode", e.target.value)}>
                  <option value="single">Single message</option>
                  <option value="split">Split messages</option>
                </select>
                {validationErrors.whatsapp_customer_business_list_send_mode && <div className={cx("input-error")}>{validationErrors.whatsapp_customer_business_list_send_mode}</div>}
              </div>
            </div>

            {/* Lead Guard Limits */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>Lead Guard Limits</div>
              <div className={cx("form-grid")}>
                {GUARD_LIMIT_FIELDS.map(({
                key,
                label,
                placeholder
              }) => <div key={key} className={cx("form-field")}>
                    <label className={cx("label-with-help form-label")}>
                      <span>{label}</span>
                      <HelpHint text={FIELD_HELP[key]} />
                    </label>
                    <input type="number" min={NUMBER_FIELD_RULES[key].min} max={NUMBER_FIELD_RULES[key].max} step="1" className={cx(`form-input ${validationErrors[key] ? 'error' : ''}`)} value={local[key] ?? ""} onChange={e => setNumber(key, e.target.value)} placeholder={placeholder} />
                    {validationErrors[key] && <div className={cx("input-error")}>{validationErrors[key]}</div>}
                  </div>)}
              </div>
            </div>

            {/* Redis */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>Cache</div>
              <div className={cx("redis-status")}>
                <div className={cx("redis-indicator")} style={{
                background: redisStatus?.redis_connected ? '#10b981' : '#ef4444'
              }}></div>
                <div className={cx("redis-info")}>
                  <div className={cx("redis-status-text")}>{redisStatus?.status || "CHECKING"}</div>
                  <div className={cx("redis-message")}>{redisStatus?.message}</div>
                </div>
              </div>
              <div className={cx("form-field")} style={{
              marginTop: 12
            }}>
                <label className={cx("label-with-help form-label")}>
                  <span>Redis Enabled</span>
                  <HelpHint text={FIELD_HELP.redis_enabled} />
                </label>
                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                  <label className={cx("toggle-switch")}>
                    <input type="checkbox" checked={!!local?.redis_enabled} onChange={() => toggle("redis_enabled")} />
                    <span className={cx("toggle-switch-slider")}></span>
                  </label>
                  <span className={cx("redis-toggle-text")}>{local?.redis_enabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            {/* Cache Management */}
            <div className={cx("section-divider")}></div>
            <div className={cx("section-group")}>
              <div className={cx("section-label")}>Clear Cache</div>
              <div className={cx("form-field")}>
                <label className={cx("label-with-help form-label")}>
                  <span>Cache Type</span>
                  <HelpHint text={FIELD_HELP.cache_type} />
                </label>
                <select className={cx("form-input")} value={selectedCache} onChange={e => setSelectedCache(e.target.value)} disabled={cacheClearing}>
                  {CACHE_TYPES.map(cache => <option key={cache.value} value={cache.value}>{cache.label}</option>)}
                </select>
              </div>
              <div className={cx("button-group")}>
                <button className={cx("btn btn-primary btn-sm")} onClick={handleClearCache} disabled={cacheClearing}>
                  {cacheClearing ? "Clearing..." : "Clear Selected"}
                </button>
                <button className={cx("btn btn-secondary btn-sm")} onClick={handleClearAllCaches} disabled={cacheClearing}>
                  {cacheClearing ? "Clearing..." : "⚠️ Clear All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redis Server Stats */}
      <div className={cx("compact-card redis-stats-card")}>
        <div className={cx("compact-card-header")} style={{
        cursor: 'default'
      }}>
          <div className={cx("compact-icon")} style={{
          background: '#10b981'
        }}><CloudSyncIcon /></div>
          <div className={cx("compact-header-text")}>
            <div className={cx("compact-title")}>Redis Server Stats</div>
            <div className={cx("compact-subtitle")}>
              {redisInfo?.connected ? `v${redisInfo.version} · ${redisInfo.mode}` : 'Server info unavailable'}
            </div>
          </div>
          <div style={{
          display: 'flex',
          gap: 8,
          marginLeft: 'auto'
        }}>
            <button className={cx("btn btn-secondary btn-sm")} onClick={() => {
            dispatch(fetchRedisInfo());
            dispatch(fetchRedisKeys());
          }} disabled={infoLoading || keysLoading}>
              {infoLoading ? '…' : '↻ Refresh'}
            </button>
            <button className={cx("btn btn-sm btn-danger")} onClick={handleFlushDb} disabled={flushing || !redisInfo?.connected} title="Wipe all Redis keys">
              {flushing ? 'Flushing…' : '⚠ Flush DB'}
            </button>
          </div>
        </div>

        {redisInfo?.connected ? <div className={cx("redis-stats-grid")}>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Memory Used</div>
              <div className={cx("redis-stat-value")}>{redisInfo.used_memory_human ?? '—'}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Peak Memory</div>
              <div className={cx("redis-stat-value")}>{redisInfo.used_memory_peak_human ?? '—'}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Connected Clients</div>
              <div className={cx("redis-stat-value")}>{redisInfo.connected_clients ?? '—'}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Uptime</div>
              <div className={cx("redis-stat-value")}>{formatUptime(redisInfo.uptime_seconds)}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Total Keys</div>
              <div className={cx("redis-stat-value")}>{redisKeys.length}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Cache Hit Rate</div>
              <div className={cx("redis-stat-value")}>
                {redisInfo.hit_rate !== null ? `${redisInfo.hit_rate}%` : '—'}
              </div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Commands Processed</div>
              <div className={cx("redis-stat-value")}>{redisInfo.total_commands_processed?.toLocaleString() ?? '—'}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Keyspace Hits</div>
              <div className={cx("redis-stat-value")}>{redisInfo.keyspace_hits?.toLocaleString() ?? '—'}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Keyspace Misses</div>
              <div className={cx("redis-stat-value")}>{redisInfo.keyspace_misses?.toLocaleString() ?? '—'}</div>
            </div>
          </div> : <div className={cx("redis-stats-unavailable")}>
            {infoLoading ? 'Loading server info…' : 'Redis not connected — stats unavailable'}
          </div>}
      </div>

      {/* Redis Key Browser */}
      <div className={cx("compact-card redis-key-browser-card")}>
        <div className={cx("compact-card-header")} style={{
        cursor: 'default',
        flexWrap: 'wrap',
        gap: 12
      }}>
          <div className={cx("compact-icon")} style={{
          background: '#6366f1'
        }}><DatabaseIcon /></div>
          <div className={cx("compact-header-text")}>
            <div className={cx("compact-title")}>Redis Key Browser</div>
            <div className={cx("compact-subtitle")}>
              {keysLoading ? 'Loading...' : `${redisKeys.length} keys in database`}
            </div>
          </div>
          <div className={cx("key-browser-toolbar")}>
            <input type="text" className={cx("form-input key-filter-input")} placeholder="Filter keys…" value={keyFilter} onChange={e => setKeyFilter(e.target.value)} />
            <button className={cx("btn btn-secondary btn-sm")} onClick={() => dispatch(fetchRedisKeys())} disabled={keysLoading}>
              {keysLoading ? '…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Pattern Delete Row */}
        <div className={cx("pattern-delete-row")}>
          <span className={cx("pattern-delete-label")}>Pattern delete</span>
          <input type="text" className={cx("form-input pattern-delete-input")} placeholder="e.g.  seo:*  or  cache:/api/*" value={patternInput} onChange={e => setPatternInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeletePattern()} />
          {patternInput && <span className={cx("pattern-match-count")}>
              {patternMatchCount} match{patternMatchCount !== 1 ? 'es' : ''}
            </span>}
          <button className={cx("btn btn-sm btn-danger")} onClick={handleDeletePattern} disabled={!patternInput || patternMatchCount === 0 || patternDeleting}>
            {patternDeleting ? 'Deleting…' : 'Delete Matching'}
          </button>
        </div>

        {selectedKeys.size > 0 && <div className={cx("key-selection-bar")}>
            <span className={cx("key-selection-count")}>{selectedKeys.size} selected</span>
            <button className={cx("btn btn-sm btn-danger")} onClick={handleDeleteSelectedKeys} disabled={keysDeleting}>
              {keysDeleting ? 'Deleting…' : '🗑 Delete Selected'}
            </button>
          </div>}

        <div className={cx("key-browser-table-wrap")}>
          {keysLoading ? <div className={cx("key-browser-empty")}>Loading keys…</div> : filteredKeys.length === 0 ? <div className={cx("key-browser-empty")}>
              {keyFilter ? 'No keys match your filter' : 'No keys in Redis'}
            </div> : <table className={cx("key-browser-table")}>
              <thead>
                <tr>
                  <th className={cx("key-col-check")}>
                    <input type="checkbox" checked={filteredKeys.length > 0 && filteredKeys.every(({
                  key
                }) => selectedKeys.has(key))} onChange={toggleSelectAll} />
                  </th>
                  <th className={cx("key-col-name")}>Key</th>
                  <th className={cx("key-col-ttl")}>TTL</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map(({
              key,
              ttl
            }) => <tr key={key} className={cx(selectedKeys.has(key) ? 'key-row selected' : 'key-row')} onClick={() => toggleKey(key)}>
                    <td className={cx("key-col-check")} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} />
                    </td>
                    <td className={cx("key-col-name")}>
                      <span className={cx("key-name")}>{key}</span>
                    </td>
                    <td className={cx("key-col-ttl")}>
                      <TtlBadge ttl={ttl} />
                    </td>
                  </tr>)}
              </tbody>
            </table>}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className={cx(`sticky-footer ${dirty ? 'visible' : ''}`)}>
        <div className={cx("footer-left")}>
          <div className={cx("footer-pulse")}></div>
          <span className={cx("footer-text")}>Unsaved changes</span>
        </div>
        <div className={cx("footer-right")}>
          <button className={cx("btn btn-ghost")} onClick={() => setLocal({
          ...settings
        })} disabled={saving}>
            Reset
          </button>
          <button className={cx("btn btn-primary")} onClick={handleSave} disabled={saving || hasValidationErrors}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Snackbar */}
      <div className={cx(`snackbar ${snack.open ? 'show' : ''} ${snack.severity}`)}>
        {snack.message}
        <button className={cx("snackbar-close")} onClick={() => setSnack(s => ({
        ...s,
        open: false
      }))}>✕</button>
      </div>
    </div>;
}
