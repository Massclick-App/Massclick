import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSystemSettings,
  updateSystemSettings,
} from "../../redux/actions/systemSettingsAction.js";
import "./SystemSettings.css";

// Icons (using emoji or you can replace with any icon lib)
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

// ─── Data ─────────────────────────────────────────────────────────────────────

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
    accentColor: "#e1580f",
    items: [
      {
        key: "otp_real_enabled",
        label: "Real OTP (MSG91)",
        desc: "ON = real OTP via MSG91. OFF = bypass OTP (testing only).",
      },
    ],
  },
  {
    label: "WhatsApp Notifications",
    icon: WhatsAppIcon,
    accentColor: "#25D366",
    items: [
      {
        key: "whatsapp_business_lead_alert",
        label: "Business Lead Alert",
        desc: "Notify business owners when a customer searches.",
      },
      {
        key: "whatsapp_customer_business_list",
        label: "Customer Business List",
        desc: "Send top‑10 matching businesses to the customer.",
      },
      {
        key: "whatsapp_mni_lead_alert",
        label: "MNI Lead Alert",
        desc: "Notify MNI businesses on new requirements.",
      },
      {
        key: "whatsapp_mni_customer_list",
        label: "MNI Customer Result",
        desc: "Send matched MNI business to the customer.",
      },
      {
        key: "whatsapp_login_welcome",
        label: "Login Welcome",
        desc: "Welcome message on first login.",
      },
    ],
  },
  {
    label: "Logging Controls",
    icon: DebugIcon,
    accentColor: "#7c3aed",
    items: [
      {
        key: "logging_enabled",
        label: "Enable Logging",
        desc: "Master toggle to enable/disable all server logs.",
      },
      {
        key: "logging_fcm_debug",
        label: "FCM Debug",
        desc: "Detailed FCM notification logs.",
      },
      {
        key: "logging_sms_debug",
        label: "SMS Debug",
        desc: "Detailed SMS gateway logs.",
      },
      {
        key: "logging_seo_debug",
        label: "SEO Debug",
        desc: "SEO metadata query logs.",
      },
      {
        key: "logging_db_queries",
        label: "Database Queries",
        desc: "Log database operations.",
      },
    ],
  },
];

const PLATFORM_SECTIONS = [
  {
    platform: "Android",
    icon: AndroidIcon,
    color: "#2e7d32",
    fields: [
      { key: "app_android_latest_version", label: "Latest Version", placeholder: "1.2.0", colSpan: 1 },
      { key: "app_android_min_version", label: "Min Required", placeholder: "1.0.0", colSpan: 1 },
      { key: "app_android_update_url", label: "Play Store URL", placeholder: "https://play.google.com/…", colSpan: 2 },
    ],
  },
  {
    platform: "iOS",
    icon: PhoneIphoneIcon,
    color: "#1565c0",
    fields: [
      { key: "app_ios_latest_version", label: "Latest Version", placeholder: "1.2.0", colSpan: 1 },
      { key: "app_ios_min_version", label: "Min Required", placeholder: "1.0.0", colSpan: 1 },
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
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemSettings() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error } = useSelector((s) => s.systemSettings);

  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [selectedCache, setSelectedCache] = useState("seo-meta");
  const [cacheClearing, setCacheClearing] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => { dispatch(fetchSystemSettings()); }, [dispatch]);
  useEffect(() => { if (settings) setLocal({ ...settings }); }, [settings]);

  const toggle = (key) => {
    setLocal((p) => {
      const updated = { ...p, [key]: !p[key] };

      // If toggling logging_enabled (master switch), control all other logging toggles
      if (key === "logging_enabled") {
        const isNowEnabled = !p[key];
        if (isNowEnabled) {
          // When master is ON, enable all logging toggles
          updated.logging_fcm_debug = true;
          updated.logging_sms_debug = true;
          updated.logging_seo_debug = true;
          updated.logging_db_queries = true;
        } else {
          // When master is OFF, disable all logging toggles
          updated.logging_fcm_debug = false;
          updated.logging_sms_debug = false;
          updated.logging_seo_debug = false;
          updated.logging_db_queries = false;
        }
      }

      return updated;
    });
  };
  const setText = (key, val) => setLocal((p) => ({ ...p, [key]: val }));

  const dirty = settings && local ? ALL_KEYS.some((k) => local[k] !== settings[k]) : false;

  const handleSave = async () => {
    const updates = {};
    ALL_KEYS.forEach((k) => { updates[k] = local[k]; });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({ open: true, message: "Settings saved successfully.", severity: "success" });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch {
      setSnack({ open: true, message: "Failed to save settings.", severity: "error" });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  const handleClearCache = async () => {
    if (!selectedCache) {
      setSnack({ open: true, message: "Please select a cache type.", severity: "error" });
      return;
    }

    // Show confirmation
    if (!window.confirm(`Clear "${CACHE_TYPES.find(c => c.value === selectedCache)?.label}" cache? This action cannot be undone.`)) {
      return;
    }

    setCacheClearing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/admin/cache/invalidate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cacheType: selectedCache })
      });

      const data = await response.json();
      if (data.success) {
        setSnack({ open: true, message: data.message || "Cache cleared successfully.", severity: "success" });
      } else {
        setSnack({ open: true, message: data.message || "Failed to clear cache.", severity: "error" });
      }
    } catch (err) {
      setSnack({ open: true, message: err.message || "Error clearing cache.", severity: "error" });
    } finally {
      setCacheClearing(false);
    }
  };

  const handleClearAllCaches = async () => {
    // Show confirmation dialog
    if (!window.confirm("⚠️ Clear ALL caches? This will remove all cached data and may impact performance temporarily.")) {
      return;
    }

    setCacheClearing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/admin/cache/clear-all", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (data.success) {
        setSnack({ open: true, message: "All caches cleared successfully.", severity: "success" });
      } else {
        setSnack({ open: true, message: data.message || "Failed to clear all caches.", severity: "error" });
      }
    } catch (err) {
      setSnack({ open: true, message: err.message || "Error clearing caches.", severity: "error" });
    } finally {
      setCacheClearing(false);
    }
  };

  if (loading || !local) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span style={{ fontSize: "13px", color: "#64748b" }}>Loading system configuration...</span>
      </div>
    );
  }

  if (error) return <div className="card" style={{ margin: "40px auto", maxWidth: 500, padding: 24, textAlign: "center", color: "#dc2626" }}>{error}</div>;

  const maintenanceOn = !!local.app_maintenance_mode;
  const enabledCount = ALL_BOOL_KEYS.filter((k) => !!local[k]).length;

  return (
    <div className="settings-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-icon">
          <SettingsIcon />
        </div>
        <h1 className="hero-title">System Settings</h1>
        <p className="hero-description">Real-time configuration · Updates propagate instantly</p>
        <div className="stats-row">
          <div className="stat-chip">
            <CheckCircleOutlineIcon /> {enabledCount} / {ALL_BOOL_KEYS.length} active features
          </div>
          <div className={`stat-chip ${maintenanceOn ? "maintenance" : ""}`}>
            {maintenanceOn ? <WarningAmberIcon /> : <CloudSyncIcon />}
            {maintenanceOn ? "Maintenance Mode: ACTIVE" : "System: OPERATIONAL"}
          </div>
        </div>
      </div>

      {/* Maintenance Card */}
      <div className={`maintenance-card ${maintenanceOn ? "active" : ""}`}>
        <div className={`maintenance-header ${maintenanceOn ? "active" : ""}`}>
          <div className={`maintenance-icon ${maintenanceOn ? "active" : ""}`}>
            <ConstructionIcon />
          </div>
          <div className={`maintenance-title ${maintenanceOn ? "active" : ""}`}>Maintenance Mode</div>
          {maintenanceOn && <div className="maintenance-badge">● BLOCKING</div>}
        </div>
        <div className="maintenance-body">
          <div className={`maintenance-status-box ${maintenanceOn ? "active" : ""}`}>
            <div className={`status-circle ${maintenanceOn ? "active" : ""}`}>
              {maintenanceOn ? <ConstructionIcon /> : <PowerSettingsNewIcon />}
            </div>
            <div className={`status-text ${maintenanceOn ? "active" : ""}`}>
              {maintenanceOn ? "ALL USERS BLOCKED" : "FULLY OPERATIONAL"}
            </div>
          </div>
          <div className="maintenance-content">
            <div className="maintenance-headline">
              {maintenanceOn ? "Service interruption is active" : "Application is live"}
            </div>
            <div className="maintenance-message">
              {maintenanceOn
                ? "A global maintenance overlay is being displayed across all active sessions via WebSocket. Disable to restore service immediately."
                : "Enable maintenance mode to instantly push a system-wide overlay to all connected users — no app update required."}
            </div>
            <div className="maintenance-toggle">
              <label className="custom-switch">
                <input
                  type="checkbox"
                  checked={maintenanceOn}
                  onChange={() => toggle("app_maintenance_mode")}
                />
                <span className="switch-slider"></span>
              </label>
              <div className={`maintenance-toggle-label ${maintenanceOn ? "active" : ""}`}>
                {maintenanceOn ? "Maintenance is enabled · Tap to disable" : "Enable maintenance mode"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="two-column-layout">
        {/* Left Column - Toggle Groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {TOGGLE_GROUPS.map((group) => (
            <div key={group.label} className="card">
              <div className="card-header" style={{ background: `rgba(${group.accentColor === "#e1580f" ? "225,88,15" : "37,211,102"}, 0.05)` }}>
                <div className="card-header-icon" style={{ background: group.accentColor }}>
                  <group.icon />
                </div>
                <div className="card-header-title">{group.label}</div>
              </div>
              {group.items.map(({ key, label, desc }, i) => (
                <div
                  key={key}
                  className="toggle-row"
                  onClick={() => toggle(key)}
                >
                  <div className="toggle-info">
                    <div className="toggle-label">{label}</div>
                    <div className="toggle-desc">{desc}</div>
                  </div>
                  <div className="toggle-control">
                    <div className="toggle-status" style={{ color: local[key] ? group.accentColor : "#bbb" }}>
                      {local[key] ? "ON" : "OFF"}
                    </div>
                    <label className="custom-switch">
                      <input
                        type="checkbox"
                        checked={!!local[key]}
                        onChange={() => toggle(key)}
                      />
                      <span className="switch-slider" style={{ backgroundColor: local[key] ? group.accentColor : "#cbd5e1" }}></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right Column - Version Management */}
        <div className="version-card">
          <div className="version-header">
            <div className="version-header-icon">
              <SystemUpdateAltIcon />
            </div>
            <div className="version-header-title">Version Management</div>
          </div>

          {PLATFORM_SECTIONS.map(({ platform, icon: PlatformIcon, color, fields }, idx) => (
            <React.Fragment key={platform}>
              <div className="platform-section">
                <div className={`platform-badge ${platform.toLowerCase()}`}>
                  <PlatformIcon />
                  <span>{platform}</span>
                </div>
                <div className="form-grid">
                  {fields.map(({ key, label, placeholder, colSpan }) => (
                    <div key={key} className="form-field" style={{ gridColumn: colSpan === 2 ? "span 2" : "auto" }}>
                      <label className="form-label">{label}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={local[key] ?? ""}
                        onChange={(e) => setText(key, e.target.value)}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {idx < PLATFORM_SECTIONS.length - 1 && <div className="divider"></div>}
            </React.Fragment>
          ))}

          <div className="divider"></div>
          <div className="release-notes-section">
            <div className="section-label">Release Notes</div>
            <div className="form-field w-100">
              <label className="form-label">What's new in this version</label>
              <textarea
                className="form-input w-100"
                value={local.app_release_notes ?? ""}
                onChange={(e) => setText("app_release_notes", e.target.value)}
                placeholder="Bug fixes and performance improvements."
                rows={2}
              />
            </div>
          </div>

          <div className="divider"></div>
          <div className="logging-config-section">
            <div className="section-label">Log Level</div>
            <div className="form-field w-100">
              <label className="form-label">Global Log Verbosity</label>
              <select
                className="form-input w-100"
                value={local.logging_level ?? "info"}
                onChange={(e) => setText("logging_level", e.target.value)}
              >
                <option value="off">Off (No logs)</option>
                <option value="error">Error (Only errors)</option>
                <option value="warn">Warn (Errors + warnings)</option>
                <option value="info">Info (Errors + warnings + info)</option>
                <option value="debug">Debug (All logs)</option>
              </select>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 8 }}>
              Controls the verbosity of server logs. Module-specific toggles on the left override this setting.
            </div>
          </div>

          <div className="divider"></div>
          <div className="cache-management-section">
            <div className="section-label">Cache Management</div>
            <div className="form-field w-100">
              <label className="form-label">Select Cache Type to Clear</label>
              <select
                className="form-input w-100"
                value={selectedCache}
                onChange={(e) => setSelectedCache(e.target.value)}
                disabled={cacheClearing}
              >
                {CACHE_TYPES.map(cache => (
                  <option key={cache.value} value={cache.value}>{cache.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 16, padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "8px", fontSize: "12px", color: "#0369a1" }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Cache Info:</strong>
              </div>
              <div>Clearing will remove cached data for this cache type.</div>
              <div>API responses will be slower until cache rebuilds.</div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, flexDirection: "column" }}>
              <button
                className="btn btn-primary"
                onClick={handleClearCache}
                disabled={cacheClearing}
                style={{ width: "100%" }}
              >
                {cacheClearing ? "Clearing..." : "Clear Selected Cache"}
              </button>
              <button
                className="btn btn-text"
                onClick={handleClearAllCaches}
                disabled={cacheClearing}
                style={{ width: "100%", color: "#dc2626" }}
              >
                {cacheClearing ? "Clearing..." : "⚠️ Clear ALL Caches"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className={`sticky-footer ${dirty ? "visible" : ""}`}>
        <div className="footer-indicator">
          <div className="pulse-dot"></div>
          <div className="footer-text">You have unsaved changes</div>
        </div>
        <div className="footer-actions">
          <button
            className="btn btn-text"
            onClick={() => setLocal({ ...settings })}
            disabled={saving}
          >
            <RestartAltIcon /> Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> : <SaveOutlinedIcon />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Snackbar */}
      <div className={`snackbar ${snack.open ? "show" : ""} ${snack.severity}`}>
        <span className="snackbar-message">{snack.message}</span>
        <button className="snackbar-close" onClick={() => setSnack(s => ({ ...s, open: false }))}>✕</button>
      </div>
    </div>
  );
}