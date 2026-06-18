import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSystemSettings, updateSystemSettings } from "../../redux/actions/systemSettingsAction.js";
import { fetchRedisStatus, invalidateCache, clearAllCaches, fetchRedisKeys, deleteRedisKeys, fetchRedisInfo, flushRedisDb, deleteRedisPattern } from "../../redux/actions/cacheActions.js";
import styles from "./SystemSettings.module.css";

// Icons
const cx = createScopedClassNames(styles);
const SettingsIcon = () => <span>{"\u2699\uFE0F"}</span>;
const SmsIcon = () => <span>{"\uD83D\uDCF1"}</span>;
const WhatsAppIcon = () => <span>{"\uD83D\uDCAC"}</span>;
const SystemUpdateAltIcon = () => <span>{"\uD83D\uDD04"}</span>;
const ConstructionIcon = () => <span>{"\uD83D\uDD27"}</span>;
const AndroidIcon = () => <span>{"\uD83E\uDD16"}</span>;
const PhoneIphoneIcon = () => <span>{"\uD83D\uDCF1"}</span>;
const CloudSyncIcon = () => <span>{"\u2601\uFE0F"}</span>;
const DebugIcon = () => <span>{"\uD83D\uDD0D"}</span>;
const DatabaseIcon = () => <span>{"\uD83D\uDDD1\uFE0F"}</span>;
const AlertIcon = () => <span>{"\u26A1"}</span>;
const GuardIcon = () => <span>{"\uD83D\uDEE1\uFE0F"}</span>;
const formatUptime = seconds => {
  if (!seconds) return "\u2014";
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
const getRedisKeyNamespace = key => {
  const delimiterIndex = key.search(/[:/]/);
  if (delimiterIndex === -1) return "misc";
  return key.slice(0, delimiterIndex).toLowerCase();
};
const formatRedisKeyNamespace = namespace => namespace === "misc" ? "Unscoped" : namespace;
const doesRedisKeyMatch = (key, query, matchMode) => {
  if (!query) return true;
  const normalizedKey = key.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (matchMode === "exact") return normalizedKey === normalizedQuery;
  if (matchMode === "startsWith") return normalizedKey.startsWith(normalizedQuery);
  return normalizedKey.includes(normalizedQuery);
};
const scoreRedisKeyMatch = (key, query, matchMode) => {
  if (!query) return key.length;
  const normalizedKey = key.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;
  if (normalizedKey === normalizedQuery) score += 1000;
  if (normalizedKey.startsWith(normalizedQuery)) score += 500;
  const index = normalizedKey.indexOf(normalizedQuery);
  if (index >= 0) score += Math.max(0, 250 - index);
  if (matchMode === "exact" && normalizedKey === normalizedQuery) score += 500;
  if (matchMode === "startsWith" && normalizedKey.startsWith(normalizedQuery)) score += 250;
  score += Math.max(0, 80 - Math.min(key.length, 80));
  return score;
};
const TtlBadge = ({
  ttl
}) => {
  if (ttl === -2) return <span className={cx("ttl-badge ttl-expired")}>expired</span>;
  if (ttl === -1) return <span className={cx("ttl-badge ttl-forever")}>{"\u221E"}</span>;
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
  rate_limit_enabled: "Master switch for all API rate limiting. Turn this off to bypass the limiter completely.",
  rate_limit_api_limit: "Maximum number of requests allowed for the global /api safety net.",
  rate_limit_api_window_minutes: "How many minutes the global /api safety net should count requests for.",
  rate_limit_auth_limit: "Maximum login attempts allowed before throttling /api/oauth requests.",
  rate_limit_auth_window_minutes: "Window size in minutes for OAuth login throttling.",
  rate_limit_otp_limit: "Maximum OTP send/verify requests allowed before throttling.",
  rate_limit_otp_window_minutes: "Window size in minutes for OTP throttling.",
  rate_limit_businesslist_limit: "Maximum business-list requests allowed before throttling.",
  rate_limit_businesslist_window_minutes: "Window size in minutes for business-list searches and related reads.",
  rate_limit_chat_limit: "Maximum chat requests allowed before throttling.",
  rate_limit_chat_window_minutes: "Window size in minutes for chat rate limiting.",
  rate_limit_lead_limit: "Maximum lead-send requests allowed before throttling.",
  rate_limit_lead_window_minutes: "Window size in minutes for lead submission throttling.",
  rate_limit_enquiry_limit: "Maximum admin enquiry requests allowed before throttling.",
  rate_limit_enquiry_window_minutes: "Window size in minutes for enquiry/admin throttling.",
  rate_limit_payment_limit: "Maximum PhonePe/payment requests allowed before throttling.",
  rate_limit_payment_window_minutes: "Window size in minutes for payment throttling.",
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
  rate_limit_api_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_api_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_auth_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_auth_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_otp_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_otp_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_businesslist_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_businesslist_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_chat_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_chat_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_lead_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_lead_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_enquiry_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_enquiry_window_minutes: {
    min: 1,
    max: 1440
  },
  rate_limit_payment_limit: {
    min: 1,
    max: 100000
  },
  rate_limit_payment_window_minutes: {
    min: 1,
    max: 1440
  },
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
const [OTP_GROUP, WHATSAPP_GROUP, LEAD_GUARD_GROUP, LOGGING_GROUP] = TOGGLE_GROUPS;
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
    placeholder: "https://play.google.com/...",
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
    placeholder: "https://apps.apple.com/...",
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
const RATE_LIMIT_FIELDS = [{
  key: "rate_limit_api_limit",
  label: "Global API Requests",
  placeholder: "900"
}, {
  key: "rate_limit_api_window_minutes",
  label: "Global API Window (minutes)",
  placeholder: "15"
}, {
  key: "rate_limit_auth_limit",
  label: "OAuth Login Attempts",
  placeholder: "20"
}, {
  key: "rate_limit_auth_window_minutes",
  label: "OAuth Window (minutes)",
  placeholder: "15"
}, {
  key: "rate_limit_otp_limit",
  label: "OTP Requests",
  placeholder: "5"
}, {
  key: "rate_limit_otp_window_minutes",
  label: "OTP Window (minutes)",
  placeholder: "10"
}, {
  key: "rate_limit_businesslist_limit",
  label: "Business List Requests",
  placeholder: "240"
}, {
  key: "rate_limit_businesslist_window_minutes",
  label: "Business List Window (minutes)",
  placeholder: "10"
}, {
  key: "rate_limit_chat_limit",
  label: "Chat Requests",
  placeholder: "120"
}, {
  key: "rate_limit_chat_window_minutes",
  label: "Chat Window (minutes)",
  placeholder: "15"
}, {
  key: "rate_limit_lead_limit",
  label: "Lead Requests",
  placeholder: "30"
}, {
  key: "rate_limit_lead_window_minutes",
  label: "Lead Window (minutes)",
  placeholder: "15"
}, {
  key: "rate_limit_enquiry_limit",
  label: "Enquiry/Admin Requests",
  placeholder: "120"
}, {
  key: "rate_limit_enquiry_window_minutes",
  label: "Enquiry/Admin Window (minutes)",
  placeholder: "15"
}, {
  key: "rate_limit_payment_limit",
  label: "Payment Requests",
  placeholder: "20"
}, {
  key: "rate_limit_payment_window_minutes",
  label: "Payment Window (minutes)",
  placeholder: "15"
}];
const ALL_BOOL_KEYS = [...TOGGLE_GROUPS.flatMap(g => g.items.map(i => i.key)), "rate_limit_enabled"];
const ALL_NUMBER_KEYS = [...GUARD_LIMIT_FIELDS.map(field => field.key), ...RATE_LIMIT_FIELDS.map(field => field.key)];
const ALL_KEYS = [...ALL_BOOL_KEYS, ...ALL_NUMBER_KEYS, "app_maintenance_mode", "app_android_latest_version", "app_android_min_version", "app_android_update_url", "app_ios_latest_version", "app_ios_min_version", "app_ios_update_url", "app_release_notes", "logging_level", "whatsapp_customer_business_list_send_mode", "redis_enabled"];
const SETTINGS_SECTIONS = [{
  key: "operations",
  label: "Operations",
  description: "Maintenance mode and server logging controls.",
  icon: ConstructionIcon,
  color: "#ef4444",
  fieldKeys: ["app_maintenance_mode", "logging_enabled", "logging_fcm_debug", "logging_sms_debug", "logging_seo_debug", "logging_db_queries", "logging_level"]
}, {
  key: "messaging",
  label: "Messaging",
  description: "OTP, WhatsApp automation, and customer delivery behavior.",
  icon: WhatsAppIcon,
  color: "#22c55e",
  fieldKeys: ["otp_real_enabled", "whatsapp_business_lead_alert", "whatsapp_customer_business_list", "whatsapp_mni_lead_alert", "whatsapp_mni_customer_list", "whatsapp_login_welcome", "whatsapp_customer_business_list_send_mode"]
}, {
  key: "leadGuards",
  label: "Lead Guards",
  description: "Search hygiene, duplicate protection, and send limits.",
  icon: GuardIcon,
  color: "#0ea5e9",
  fieldKeys: ["lead_guard_search_text_required", "lead_guard_anonymous_dedupe_enabled", "lead_guard_user_dedupe_enabled", "lead_guard_live_business_only", "whatsapp_business_lead_daily_cap_enabled", "whatsapp_business_lead_duplicate_guard_enabled", "whatsapp_business_lead_cooldown_enabled", "whatsapp_recipient_health_guard_enabled", ...GUARD_LIMIT_FIELDS.map(field => field.key)]
}, {
  key: "versions",
  label: "App Releases",
  description: "Android, iOS, and release note settings.",
  icon: SystemUpdateAltIcon,
  color: "#f97316",
  fieldKeys: ["app_android_latest_version", "app_android_min_version", "app_android_update_url", "app_ios_latest_version", "app_ios_min_version", "app_ios_update_url", "app_release_notes"]
}, {
  key: "rateLimits",
  label: "Rate Limits",
  description: "API and workflow throttling windows and limits.",
  icon: AlertIcon,
  color: "#a855f7",
  fieldKeys: ["rate_limit_enabled", ...RATE_LIMIT_FIELDS.map(field => field.key)]
}, {
  key: "cache",
  label: "Cache",
  description: "Redis availability plus targeted cache clearing.",
  icon: CloudSyncIcon,
  color: "#14b8a6",
  fieldKeys: ["redis_enabled"]
}];
const FIELD_SECTION_MAP = SETTINGS_SECTIONS.reduce((acc, section) => {
  section.fieldKeys.forEach(fieldKey => {
    acc[fieldKey] = section.key;
  });
  return acc;
}, {});
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
  const [keyNamespace, setKeyNamespace] = useState("all");
  const [keySearch, setKeySearch] = useState("");
  const [keyMatchMode, setKeyMatchMode] = useState("contains");
  const [patternInput, setPatternInput] = useState("");
  const [activeSection, setActiveSection] = useState(SETTINGS_SECTIONS[0].key);
  const deferredKeySearch = useDeferredValue(keySearch.trim());
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
  const keyNamespaceOptions = useMemo(() => {
    const counts = new Map();
    redisKeys.forEach(({
      key
    }) => {
      const namespace = getRedisKeyNamespace(key);
      counts.set(namespace, (counts.get(namespace) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({
      value,
      count,
      label: formatRedisKeyNamespace(value)
    }));
  }, [redisKeys]);
  const filteredKeys = useMemo(() => {
    const query = deferredKeySearch;
    return [...redisKeys].filter(({
      key
    }) => {
      if (keyNamespace !== "all" && getRedisKeyNamespace(key) !== keyNamespace) return false;
      return doesRedisKeyMatch(key, query, keyMatchMode);
    }).sort((a, b) => {
      if (!query) {
        const namespaceCompare = getRedisKeyNamespace(a.key).localeCompare(getRedisKeyNamespace(b.key));
        if (namespaceCompare !== 0) return namespaceCompare;
        return a.key.localeCompare(b.key);
      }
      const scoreDelta = scoreRedisKeyMatch(b.key, query, keyMatchMode) - scoreRedisKeyMatch(a.key, query, keyMatchMode);
      if (scoreDelta !== 0) return scoreDelta;
      return a.key.localeCompare(b.key);
    });
  }, [redisKeys, deferredKeySearch, keyNamespace, keyMatchMode]);
  const selectedNamespaceLabel = keyNamespace === "all" ? "All namespaces" : formatRedisKeyNamespace(keyNamespace);
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
    if (!window.confirm('FLUSH ENTIRE REDIS DATABASE?\n\nThis permanently deletes ALL keys and cannot be undone.')) return;
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
  const resetKeyBrowserFilters = () => {
    setKeyNamespace("all");
    setKeySearch("");
    setKeyMatchMode("contains");
  };
  const dirty = settings && local ? ALL_KEYS.some(k => local[k] !== settings[k]) : false;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const handleSave = async () => {
    if (hasValidationErrors) {
      const firstInvalidField = Object.keys(validationErrors).find(key => validationErrors[key]);
      if (firstInvalidField && FIELD_SECTION_MAP[firstInvalidField]) {
        setActiveSection(FIELD_SECTION_MAP[firstInvalidField]);
      }
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
  const sectionNavItems = SETTINGS_SECTIONS.map(section => {
    const activeToggleCount = section.fieldKeys.filter(key => typeof local[key] === "boolean" && !!local[key]).length;
    const changedCount = section.fieldKeys.filter(key => settings && local[key] !== settings[key]).length;
    const errorCount = section.fieldKeys.filter(key => validationErrors[key]).length;
    let detail = `${section.fieldKeys.length} control${section.fieldKeys.length === 1 ? "" : "s"}`;
    if (errorCount > 0) {
      detail = `${errorCount} issue${errorCount === 1 ? "" : "s"} to review`;
    } else if (changedCount > 0) {
      detail = `${changedCount} unsaved change${changedCount === 1 ? "" : "s"}`;
    } else if (activeToggleCount > 0) {
      detail = `${activeToggleCount} toggle${activeToggleCount === 1 ? "" : "s"} active`;
    }
    return {
      ...section,
      activeToggleCount,
      changedCount,
      errorCount,
      detail
    };
  });
  const activeSectionMeta = sectionNavItems.find(section => section.key === activeSection) || sectionNavItems[0];
  const renderToggleGroupCard = group => <div key={group.label} className={cx("compact-card panel-card")}>
      <div className={cx("compact-card-header")}>
        <div className={cx("compact-icon")} style={{
        background: group.color
      }}>
          <group.icon />
        </div>
        <div className={cx("compact-header-text")}>
          <div className={cx("compact-title")}>{group.label}</div>
          <div className={cx("compact-subtitle")}>
            {group.items.filter(item => local[item.key]).length} of {group.items.length} enabled
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
    </div>;
  const renderMaintenanceCard = () => <div className={cx(`compact-card maintenance-card panel-card ${maintenanceOn ? 'active' : ''}`)}>
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
          <span className={cx("toggle-switch-slider")} style={{
          '--color': '#ef4444'
        }}></span>
        </label>
      </div>
    </div>;
  const renderActiveSection = () => {
    switch (activeSection) {
      case "operations":
        return <div className={cx("panel-stack")}>
            {renderMaintenanceCard()}
            {renderToggleGroupCard(LOGGING_GROUP)}
            <div className={cx("compact-card panel-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
                background: '#7c3aed'
              }}>
                  <DebugIcon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>Logging Level</div>
                  <div className={cx("compact-subtitle")}>Control how much detail is written to logs</div>
                </div>
              </div>
              <div className={cx("section-group")}>
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
            </div>
          </div>;
      case "messaging":
        return <div className={cx("panel-stack")}>
            {renderToggleGroupCard(OTP_GROUP)}
            {renderToggleGroupCard(WHATSAPP_GROUP)}
            <div className={cx("compact-card panel-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
                background: '#16a34a'
              }}>
                  <WhatsAppIcon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>Customer Delivery</div>
                  <div className={cx("compact-subtitle")}>Control how business matches reach the customer</div>
                </div>
              </div>
              <div className={cx("section-group")}>
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
            </div>
          </div>;
      case "leadGuards":
        return <div className={cx("panel-stack")}>
            {renderToggleGroupCard(LEAD_GUARD_GROUP)}
            <div className={cx("compact-card panel-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
                background: '#0284c7'
              }}>
                  <GuardIcon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>Lead Guard Limits</div>
                  <div className={cx("compact-subtitle")}>Tune dedupe windows, daily caps, and cooldowns</div>
                </div>
              </div>
              <div className={cx("section-group")}>
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
            </div>
          </div>;
      case "versions":
        return <div className={cx("compact-card version-card panel-card")}>
            <div className={cx("compact-card-header")}>
              <div className={cx("compact-icon")} style={{
              background: '#f97316'
            }}>
                <SystemUpdateAltIcon />
              </div>
              <div className={cx("compact-header-text")}>
                <div className={cx("compact-title")}>Version Management</div>
                <div className={cx("compact-subtitle")}>Keep update rules aligned across both mobile apps</div>
              </div>
            </div>

            {PLATFORM_SECTIONS.map(({
            platform,
            icon: PlatformIcon,
            fields
          }) => <React.Fragment key={platform}>
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
          </div>;
      case "rateLimits":
        return <div className={cx("compact-card panel-card")}>
            <div className={cx("compact-card-header")}>
              <div className={cx("compact-icon")} style={{
              background: '#a855f7'
            }}>
                <AlertIcon />
              </div>
              <div className={cx("compact-header-text")}>
                <div className={cx("compact-title")}>Rate Limiting</div>
                <div className={cx("compact-subtitle")}>Protect public and admin APIs from abuse</div>
              </div>
            </div>
            <div className={cx("section-group")}>
              <div className={cx("form-field panel-inline-control")}>
                <label className={cx("label-with-help form-label")}>
                  <span>Enable Rate Limiting</span>
                  <HelpHint text={FIELD_HELP.rate_limit_enabled} />
                </label>
                <div className={cx("inline-toggle-row")}>
                  <label className={cx("toggle-switch")}>
                    <input type="checkbox" checked={!!local?.rate_limit_enabled} onChange={() => toggle("rate_limit_enabled")} />
                    <span className={cx("toggle-switch-slider")} style={{
                    '--color': '#a855f7'
                  }}></span>
                  </label>
                  <span className={cx("redis-toggle-text")}>{local?.rate_limit_enabled ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className={cx("form-grid")}>
                {RATE_LIMIT_FIELDS.map(({
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
          </div>;
      case "cache":
        return <div className={cx("panel-stack")}>
            <div className={cx("compact-card panel-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
                background: '#14b8a6'
              }}>
                  <CloudSyncIcon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>Redis Availability</div>
                  <div className={cx("compact-subtitle")}>Decide whether Redis-backed cache behavior is active</div>
                </div>
              </div>
              <div className={cx("section-group")}>
                <div className={cx("redis-status")}>
                  <div className={cx("redis-indicator")} style={{
                  background: redisStatus?.redis_connected ? '#10b981' : '#ef4444'
                }}></div>
                  <div className={cx("redis-info")}>
                    <div className={cx("redis-status-text")}>{redisStatus?.status || "CHECKING"}</div>
                    <div className={cx("redis-message")}>{redisStatus?.message}</div>
                  </div>
                </div>
                <div className={cx("form-field panel-inline-control")}>
                  <label className={cx("label-with-help form-label")}>
                    <span>Redis Enabled</span>
                    <HelpHint text={FIELD_HELP.redis_enabled} />
                  </label>
                  <div className={cx("inline-toggle-row")}>
                    <label className={cx("toggle-switch")}>
                      <input type="checkbox" checked={!!local?.redis_enabled} onChange={() => toggle("redis_enabled")} />
                      <span className={cx("toggle-switch-slider")} style={{
                      '--color': '#14b8a6'
                    }}></span>
                    </label>
                    <span className={cx("redis-toggle-text")}>{local?.redis_enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cx("compact-card panel-card")}>
              <div className={cx("compact-card-header")}>
                <div className={cx("compact-icon")} style={{
                background: '#0f766e'
              }}>
                  <DatabaseIcon />
                </div>
                <div className={cx("compact-header-text")}>
                  <div className={cx("compact-title")}>Clear Cache</div>
                  <div className={cx("compact-subtitle")}>Invalidate one cache bucket or force a full clear</div>
                </div>
              </div>
              <div className={cx("section-group")}>
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
                    {cacheClearing ? "Clearing..." : "Clear All"}
                  </button>
                </div>
              </div>
            </div>
          </div>;
      default:
        return null;
    }
  };
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

      {/* Settings Workspace */}
      <div className={cx("settings-workspace")}>
        <aside className={cx("settings-sidebar")}>
          <div className={cx("sidebar-card")}>
            <div className={cx("sidebar-card-header")}>
              <div>
                <div className={cx("sidebar-card-title")}>Settings Areas</div>
                <div className={cx("sidebar-card-subtitle")}>Open one focused section instead of scrolling through the full form.</div>
              </div>
            </div>
            <div className={cx("section-nav-list")}>
              {sectionNavItems.map(section => <button key={section.key} type="button" className={cx(`section-nav-button ${activeSection === section.key ? 'active' : ''}`)} style={{
              '--section-color': section.color
            }} onClick={() => setActiveSection(section.key)}>
                  <span className={cx("section-nav-icon")}><section.icon /></span>
                  <span className={cx("section-nav-copy")}>
                    <span className={cx("section-nav-title-row")}>
                      <span className={cx("section-nav-title")}>{section.label}</span>
                      {section.errorCount > 0 && <span className={cx("section-nav-pill danger")}>{section.errorCount}</span>}
                      {section.errorCount === 0 && section.changedCount > 0 && <span className={cx("section-nav-pill warning")}>{section.changedCount}</span>}
                    </span>
                    <span className={cx("section-nav-description")}>{section.description}</span>
                    <span className={cx("section-nav-detail")}>{section.detail}</span>
                  </span>
                </button>)}
            </div>
          </div>

          <div className={cx("sidebar-card summary-card")}>
            <div className={cx("sidebar-card-title")}>Quick Health</div>
            <div className={cx("summary-list")}>
              <div className={cx("summary-row")}>
                <span className={cx("summary-label")}>Unsaved</span>
                <span className={cx(`summary-value ${dirty ? 'warning' : 'success'}`)}>{dirty ? 'Yes' : 'No'}</span>
              </div>
              <div className={cx("summary-row")}>
                <span className={cx("summary-label")}>Validation</span>
                <span className={cx(`summary-value ${hasValidationErrors ? 'danger' : 'success'}`)}>{hasValidationErrors ? `${Object.keys(validationErrors).length} issues` : 'Clean'}</span>
              </div>
              <div className={cx("summary-row")}>
                <span className={cx("summary-label")}>Redis</span>
                <span className={cx(`summary-value ${redisStatus?.redis_connected ? 'success' : 'danger'}`)}>{redisStatus?.redis_connected ? 'Connected' : 'Offline'}</span>
              </div>
              <div className={cx("summary-row")}>
                <span className={cx("summary-label")}>Selected Keys</span>
                <span className={cx("summary-value neutral")}>{selectedKeys.size}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className={cx("settings-panel-shell")}>
          <div className={cx("settings-panel-header")}>
            <div>
              <div className={cx("settings-panel-eyebrow")}>Focused Editor</div>
              <h2 className={cx("settings-panel-title")}>{activeSectionMeta.label}</h2>
              <p className={cx("settings-panel-subtitle")}>{activeSectionMeta.description}</p>
            </div>
            <div className={cx("settings-panel-metrics")}>
              <span className={cx("panel-metric-chip")}>{activeSectionMeta.fieldKeys.length} controls</span>
              {activeSectionMeta.activeToggleCount > 0 && <span className={cx("panel-metric-chip success")}>{activeSectionMeta.activeToggleCount} active</span>}
              {activeSectionMeta.changedCount > 0 && <span className={cx("panel-metric-chip warning")}>{activeSectionMeta.changedCount} unsaved</span>}
              {activeSectionMeta.errorCount > 0 && <span className={cx("panel-metric-chip danger")}>{activeSectionMeta.errorCount} issue{activeSectionMeta.errorCount === 1 ? "" : "s"}</span>}
            </div>
          </div>
          <div className={cx("settings-panel-content")}>
            {renderActiveSection()}
          </div>
        </section>
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
              {infoLoading ? '...' : 'Refresh'}
            </button>
            <button className={cx("btn btn-sm btn-danger")} onClick={handleFlushDb} disabled={flushing || !redisInfo?.connected} title="Wipe all Redis keys">
              {flushing ? 'Flushing...' : 'Flush DB'}
            </button>
          </div>
        </div>

        {redisInfo?.connected ? <div className={cx("redis-stats-grid")}>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Memory Used</div>
              <div className={cx("redis-stat-value")}>{redisInfo.used_memory_human ?? "\u2014"}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Peak Memory</div>
              <div className={cx("redis-stat-value")}>{redisInfo.used_memory_peak_human ?? "\u2014"}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Connected Clients</div>
              <div className={cx("redis-stat-value")}>{redisInfo.connected_clients ?? "\u2014"}</div>
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
                {redisInfo.hit_rate !== null ? `${redisInfo.hit_rate}%` : "\u2014"}
              </div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Commands Processed</div>
              <div className={cx("redis-stat-value")}>{redisInfo.total_commands_processed?.toLocaleString() ?? "\u2014"}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Keyspace Hits</div>
              <div className={cx("redis-stat-value")}>{redisInfo.keyspace_hits?.toLocaleString() ?? "\u2014"}</div>
            </div>
            <div className={cx("redis-stat-item")}>
              <div className={cx("redis-stat-label")}>Keyspace Misses</div>
              <div className={cx("redis-stat-value")}>{redisInfo.keyspace_misses?.toLocaleString() ?? "\u2014"}</div>
            </div>
          </div> : <div className={cx("redis-stats-unavailable")}>
            {infoLoading ? 'Loading server info...' : 'Redis not connected — stats unavailable'}
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
              {keysLoading ? 'Loading...' : `${filteredKeys.length} of ${redisKeys.length} keys shown | ${selectedNamespaceLabel}`}
            </div>
          </div>
          <div className={cx("key-browser-toolbar")}>
            <select className={cx("form-input key-namespace-select")} value={keyNamespace} onChange={e => setKeyNamespace(e.target.value)}>
              <option value="all">All namespaces ({redisKeys.length})</option>
              {keyNamespaceOptions.map(option => <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>)}
            </select>
            <input type="text" className={cx("form-input key-search-input")} placeholder="Search keys by name, suffix, or part of the key" value={keySearch} onChange={e => setKeySearch(e.target.value)} />
            <select className={cx("form-input key-match-select")} value={keyMatchMode} onChange={e => setKeyMatchMode(e.target.value)}>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="exact">Exact</option>
            </select>
            <button className={cx("btn btn-secondary btn-sm")} onClick={resetKeyBrowserFilters} disabled={keysLoading && !keySearch && keyNamespace === "all" && keyMatchMode === "contains"}>
              Reset
            </button>
            <button className={cx("btn btn-secondary btn-sm")} onClick={() => dispatch(fetchRedisKeys())} disabled={keysLoading}>
              {keysLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Pattern Delete Row */}
        <div className={cx("pattern-delete-row")}>
          <span className={cx("pattern-delete-label")}>Pattern delete</span>
          <input type="text" className={cx("form-input pattern-delete-input")} placeholder="e.g. seo:* or cache:/api/*" value={patternInput} onChange={e => setPatternInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDeletePattern()} />
          {patternInput && <span className={cx("pattern-match-count")}>
              {patternMatchCount} match{patternMatchCount !== 1 ? 'es' : ''}
            </span>}
          <button className={cx("btn btn-sm btn-danger")} onClick={handleDeletePattern} disabled={!patternInput || patternMatchCount === 0 || patternDeleting}>
            {patternDeleting ? 'Deleting...' : 'Delete Matching'}
          </button>
        </div>

        {selectedKeys.size > 0 && <div className={cx("key-selection-bar")}>
            <span className={cx("key-selection-count")}>{selectedKeys.size} selected</span>
            <button className={cx("btn btn-sm btn-danger")} onClick={handleDeleteSelectedKeys} disabled={keysDeleting}>
              {keysDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>}

        <div className={cx("key-browser-table-wrap")}>
          {keysLoading ? <div className={cx("key-browser-empty")}>Loading keys...</div> : filteredKeys.length === 0 ? <div className={cx("key-browser-empty")}>
              {keySearch || keyNamespace !== "all" ? 'No keys match your search' : 'No keys in Redis'}
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
      }))}>×</button>
      </div>
    </div>;
}

