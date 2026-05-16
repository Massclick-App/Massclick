import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSystemSettings,
  updateSystemSettings,
} from "../../redux/actions/systemSettingsAction.js";
import {
  fetchRedisStatus,
  invalidateCache,
  clearAllCaches,
} from "../../redux/actions/cacheActions.js";
import "./SystemSettings.css";

// Icons
const SettingsIcon = () => <span>⚙️</span>;
const SmsIcon = () => <span>📱</span>;
const WhatsAppIcon = () => <span>💬</span>;
const SystemUpdateAltIcon = () => <span>🔄</span>;
const ConstructionIcon = () => <span>🔧</span>;
const AndroidIcon = () => <span>🤖</span>;
const PhoneIphoneIcon = () => <span>📱</span>;
const SaveOutlinedIcon = () => <span>💾</span>;
const RestartAltIcon = () => <span>↺</span>;
const CheckCircleOutlineIcon = () => <span>✓</span>;
const PowerSettingsNewIcon = () => <span>⏻</span>;
const CloudSyncIcon = () => <span>☁️</span>;
const WarningAmberIcon = () => <span>⚠️</span>;
const DebugIcon = () => <span>🔍</span>;
const DatabaseIcon = () => <span>🗄️</span>;
const AlertIcon = () => <span>⚡</span>;

const validateVersionFormat = (version) => {
  if (!version) return null;
  const semverRegex = /^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/;
  return semverRegex.test(version) ? null : "Invalid version format (use X.Y or X.Y.Z)";
};

const validateUrl = (url) => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format";
  }
};

const validateLoggingLevel = (level) => {
  const validLevels = ['off', 'error', 'warn', 'info', 'debug'];
  return validLevels.includes(level) ? null : "Invalid logging level";
};

const getFieldValidationError = (key, value) => {
  if (key.includes('_version') || key === 'app_release_notes') return validateVersionFormat(value);
  if (key.includes('_url')) return validateUrl(value);
  if (key === 'logging_level') return validateLoggingLevel(value);
  return null;
};

const CACHE_TYPES = [
  { value: 'seo-meta', label: 'SEO Meta Tags' },
  { value: 'seo-page-content', label: 'SEO Page Content' },
  { value: 'seo-blog', label: 'SEO Blog' },
  { value: 'category', label: 'Categories' },
  { value: 'home-category', label: 'Home Categories' },
  { value: 'search', label: 'Search Results' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'trends', label: 'Trending' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'mobile', label: 'Mobile Lookup' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'advertisement', label: 'Ads' }
];

const TOGGLE_GROUPS = [
  {
    label: "OTP / SMS",
    icon: SmsIcon,
    color: "#f97316",
    items: [
      {
        key: "otp_real_enabled",
        label: "Real OTP",
        desc: "MSG91 gateway",
      },
    ],
  },
  {
    label: "WhatsApp",
    icon: WhatsAppIcon,
    color: "#22c55e",
    items: [
      {
        key: "whatsapp_business_lead_alert",
        label: "Business Lead Alert",
        desc: "Notify on search",
      },
      {
        key: "whatsapp_customer_business_list",
        label: "Customer List",
        desc: "Top 10 matches",
      },
      {
        key: "whatsapp_mni_lead_alert",
        label: "MNI Lead Alert",
        desc: "New requirements",
      },
      {
        key: "whatsapp_mni_customer_list",
        label: "MNI Customer",
        desc: "Matched business",
      },
      {
        key: "whatsapp_login_welcome",
        label: "Login Welcome",
        desc: "First login message",
      },
    ],
  },
  {
    label: "Logging",
    icon: DebugIcon,
    color: "#a855f7",
    items: [
      {
        key: "logging_enabled",
        label: "Enable Logging",
        desc: "Master toggle",
      },
      {
        key: "logging_fcm_debug",
        label: "FCM Debug",
        desc: "Notifications",
      },
      {
        key: "logging_sms_debug",
        label: "SMS Debug",
        desc: "Gateway logs",
      },
      {
        key: "logging_seo_debug",
        label: "SEO Debug",
        desc: "Metadata logs",
      },
      {
        key: "logging_db_queries",
        label: "DB Queries",
        desc: "Database ops",
      },
    ],
  },
];

const PLATFORM_SECTIONS = [
  {
    platform: "Android",
    icon: AndroidIcon,
    color: "#22c55e",
    fields: [
      { key: "app_android_latest_version", label: "Latest Version", placeholder: "1.2.0", colSpan: 1 },
      { key: "app_android_min_version", label: "Min Version", placeholder: "1.0.0", colSpan: 1 },
      { key: "app_android_update_url", label: "Play Store URL", placeholder: "https://play.google.com/…", colSpan: 2 },
    ],
  },
  {
    platform: "iOS",
    icon: PhoneIphoneIcon,
    color: "#0ea5e9",
    fields: [
      { key: "app_ios_latest_version", label: "Latest Version", placeholder: "1.2.0", colSpan: 1 },
      { key: "app_ios_min_version", label: "Min Version", placeholder: "1.0.0", colSpan: 1 },
      { key: "app_ios_update_url", label: "App Store URL", placeholder: "https://apps.apple.com/…", colSpan: 2 },
    ],
  },
];

const ALL_BOOL_KEYS = TOGGLE_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const ALL_KEYS = [
  ...ALL_BOOL_KEYS,
  "app_maintenance_mode",
  "app_android_latest_version",
  "app_android_min_version",
  "app_android_update_url",
  "app_ios_latest_version",
  "app_ios_min_version",
  "app_ios_update_url",
  "app_release_notes",
  "logging_level",
  "redis_enabled",
];

export default function SystemSettings() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error } = useSelector((s) => s.systemSettings);
  const { redisStatus, redisLoading, cacheClearing, cacheClearError } = useSelector((s) => s.cache);

  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [selectedCache, setSelectedCache] = useState("seo-meta");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => { dispatch(fetchSystemSettings()); }, [dispatch]);
  useEffect(() => { if (settings) setLocal({ ...settings }); }, [settings]);
  useEffect(() => { dispatch(fetchRedisStatus()); }, [dispatch]);

  const toggle = (key) => {
    setLocal((p) => {
      const updated = { ...p, [key]: !p[key] };
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
    setLocal((p) => ({ ...p, [key]: val }));
    const error = getFieldValidationError(key, val);
    setValidationErrors((prev) => {
      if (error) {
        return { ...prev, [key]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      }
    });
  };

  const dirty = settings && local ? ALL_KEYS.some((k) => local[k] !== settings[k]) : false;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleSave = async () => {
    if (hasValidationErrors) {
      setSnack({ open: true, message: "Fix validation errors", severity: "error" });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
      return;
    }
    const updates = {};
    ALL_KEYS.forEach((k) => { updates[k] = local[k]; });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({ open: true, message: "Settings saved", severity: "success" });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch {
      setSnack({ open: true, message: "Save failed", severity: "error" });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  const handleClearCache = async () => {
    if (!selectedCache) {
      setSnack({ open: true, message: "Select a cache type", severity: "error" });
      return;
    }
    if (!window.confirm(`Clear "${CACHE_TYPES.find(c => c.value === selectedCache)?.label}"?`)) return;
    try {
      await dispatch(invalidateCache(selectedCache));
      setSnack({ open: true, message: "Cache cleared", severity: "success" });
    } catch (err) {
      setSnack({ open: true, message: "Cache clear failed", severity: "error" });
    }
  };

  const handleClearAllCaches = async () => {
    if (!window.confirm("Clear ALL caches? Performance may be affected.")) return;
    try {
      await dispatch(clearAllCaches());
      setSnack({ open: true, message: "All caches cleared", severity: "success" });
    } catch (err) {
      setSnack({ open: true, message: "Clear failed", severity: "error" });
    }
  };

  if (loading || !local) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading system configuration...</span>
      </div>
    );
  }

  if (error) return <div className="error-box">{error}</div>;

  const maintenanceOn = !!local.app_maintenance_mode;
  const enabledCount = ALL_BOOL_KEYS.filter((k) => !!local[k]).length;

  return (
    <div className="settings-container">
      {/* Hero */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-icon"><SettingsIcon /></div>
          <div>
            <h1 className="hero-title">System Settings</h1>
            <p className="hero-subtitle">Real-time configuration · Instant updates</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-value">{enabledCount}/{ALL_BOOL_KEYS.length}</div>
            <div className="stat-label">Features Active</div>
          </div>
          <div className={`stat status ${maintenanceOn ? 'maintenance' : 'operational'}`}>
            <div className="status-indicator"></div>
            <div>
              <div className="stat-value" style={{ fontSize: '12px', fontWeight: 700 }}>
                {maintenanceOn ? 'MAINTENANCE' : 'OPERATIONAL'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Alert */}
      {maintenanceOn && (
        <div className="maintenance-alert">
          <div className="maintenance-alert-icon"><AlertIcon /></div>
          <div className="maintenance-alert-content">
            <div className="maintenance-alert-title">Maintenance Mode Active</div>
            <div className="maintenance-alert-desc">All users are blocked. Disable to restore access.</div>
          </div>
          <button 
            className="maintenance-btn-disable"
            onClick={() => toggle("app_maintenance_mode")}
          >
            Disable
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid-layout">
        {/* Left Column */}
        <div className="left-column">
          {/* Maintenance Card */}
          <div className={`compact-card maintenance-card ${maintenanceOn ? 'active' : ''}`}>
            <div className="compact-card-header">
              <div className="compact-icon" style={{ background: maintenanceOn ? '#ef4444' : '#6b7280' }}>
                <ConstructionIcon />
              </div>
              <div className="compact-header-text">
                <div className="compact-title">Maintenance Mode</div>
                <div className="compact-subtitle">{maintenanceOn ? 'BLOCKING USERS' : 'Disabled'}</div>
              </div>
            </div>
            <div className="compact-card-body">
              <label className="toggle-switch">
                <input type="checkbox" checked={maintenanceOn} onChange={() => toggle("app_maintenance_mode")} />
                <span className="toggle-switch-slider"></span>
              </label>
            </div>
          </div>

          {/* Toggle Groups */}
          {TOGGLE_GROUPS.map((group) => (
            <div key={group.label} className="compact-card">
              <div className="compact-card-header">
                <div className="compact-icon" style={{ background: group.color }}>
                  <group.icon />
                </div>
                <div className="compact-header-text">
                  <div className="compact-title">{group.label}</div>
                  <div className="compact-subtitle">
                    {group.items.filter(i => local[i.key]).length} of {group.items.length} enabled
                  </div>
                </div>
              </div>
              <div className="compact-card-items">
                {group.items.map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="toggle-item"
                    onClick={() => toggle(key)}
                  >
                    <div className="toggle-item-info">
                      <div className="toggle-item-label">{label}</div>
                      <div className="toggle-item-desc">{desc}</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={!!local[key]} onChange={() => toggle(key)} />
                      <span className="toggle-switch-slider" style={{ '--color': group.color }}></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="right-column">
          {/* Version Management */}
          <div className="compact-card version-card">
            <div className="compact-card-header">
              <div className="compact-icon" style={{ background: '#f97316' }}>
                <SystemUpdateAltIcon />
              </div>
              <div className="compact-header-text">
                <div className="compact-title">Version Management</div>
              </div>
            </div>

            {PLATFORM_SECTIONS.map(({ platform, icon: PlatformIcon, color, fields }, idx) => (
              <React.Fragment key={platform}>
                <div className="platform-group">
                  <div className="platform-header">
                    <PlatformIcon /> {platform}
                  </div>
                  <div className="form-grid">
                    {fields.map(({ key, label, placeholder, colSpan }) => (
                      <div key={key} className={`form-field ${colSpan === 2 ? 'span-2' : ''}`}>
                        <label className="form-label">{label}</label>
                        <input
                          type="text"
                          className={`form-input ${validationErrors[key] ? 'error' : ''}`}
                          value={local[key] ?? ""}
                          onChange={(e) => setText(key, e.target.value)}
                          placeholder={placeholder}
                        />
                        {validationErrors[key] && (
                          <div className="input-error">{validationErrors[key]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Release Notes */}
            <div className="section-divider"></div>
            <div className="section-group">
              <div className="section-label">Release Notes</div>
              <div className="form-field">
                <label className="form-label">What's new</label>
                <textarea
                  className={`form-input ${validationErrors.app_release_notes ? 'error' : ''}`}
                  value={local.app_release_notes ?? ""}
                  onChange={(e) => setText("app_release_notes", e.target.value)}
                  placeholder="Bug fixes and improvements..."
                  rows={3}
                />
                {validationErrors.app_release_notes && (
                  <div className="input-error">{validationErrors.app_release_notes}</div>
                )}
              </div>
            </div>

            {/* Logging */}
            <div className="section-divider"></div>
            <div className="section-group">
              <div className="section-label">Logging</div>
              <div className="form-field">
                <label className="form-label">Log Level</label>
                <select
                  className="form-input"
                  value={local.logging_level ?? "info"}
                  onChange={(e) => setText("logging_level", e.target.value)}
                >
                  <option value="off">Off</option>
                  <option value="error">Error</option>
                  <option value="warn">Warn</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>
            </div>

            {/* Redis */}
            <div className="section-divider"></div>
            <div className="section-group">
              <div className="section-label">Cache</div>
              <div className="redis-status">
                <div className="redis-indicator" style={{ background: redisStatus?.redis_connected ? '#10b981' : '#ef4444' }}></div>
                <div className="redis-info">
                  <div className="redis-status-text">{redisStatus?.status || "CHECKING"}</div>
                  <div className="redis-message">{redisStatus?.message}</div>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label className="form-label">Redis Enabled</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={!!local?.redis_enabled} onChange={() => toggle("redis_enabled")} />
                    <span className="toggle-switch-slider"></span>
                  </label>
                  <span className="redis-toggle-text">{local?.redis_enabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            {/* Cache Management */}
            <div className="section-divider"></div>
            <div className="section-group">
              <div className="section-label">Clear Cache</div>
              <div className="form-field">
                <label className="form-label">Cache Type</label>
                <select
                  className="form-input"
                  value={selectedCache}
                  onChange={(e) => setSelectedCache(e.target.value)}
                  disabled={cacheClearing}
                >
                  {CACHE_TYPES.map(cache => (
                    <option key={cache.value} value={cache.value}>{cache.label}</option>
                  ))}
                </select>
              </div>
              <div className="button-group">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleClearCache}
                  disabled={cacheClearing}
                >
                  {cacheClearing ? "Clearing..." : "Clear Selected"}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearAllCaches}
                  disabled={cacheClearing}
                >
                  {cacheClearing ? "Clearing..." : "⚠️ Clear All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className={`sticky-footer ${dirty ? 'visible' : ''}`}>
        <div className="footer-left">
          <div className="footer-pulse"></div>
          <span className="footer-text">Unsaved changes</span>
        </div>
        <div className="footer-right">
          <button
            className="btn btn-ghost"
            onClick={() => setLocal({ ...settings })}
            disabled={saving}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || hasValidationErrors}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Snackbar */}
      <div className={`snackbar ${snack.open ? 'show' : ''} ${snack.severity}`}>
        {snack.message}
        <button className="snackbar-close" onClick={() => setSnack(s => ({ ...s, open: false }))}>✕</button>
      </div>
    </div>
  );
}   