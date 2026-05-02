import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSystemSettings,
  updateSystemSettings,
} from "../../redux/actions/systemSettingsAction.js";
import {
  Box,
  Typography,
  Switch,
  CircularProgress,
  Divider,
  Paper,
  Button,
  Alert,
  Snackbar,
  TextField,
  Chip,
  Grid,
  Slide,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import ConstructionIcon from "@mui/icons-material/Construction";
import AndroidIcon from "@mui/icons-material/Android";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOGGLE_GROUPS = [
  {
    label: "OTP / SMS",
    icon: SmsIcon,
    accentColor: "#e1580f",
    bgColor: "rgba(225,88,15,0.08)",
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
    bgColor: "rgba(37,211,102,0.07)",
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
];

const PLATFORM_SECTIONS = [
  {
    platform: "Android",
    icon: AndroidIcon,
    color: "#2e7d32",
    chipBg: "rgba(46,125,50,0.1)",
    fields: [
      { key: "app_android_latest_version", label: "Latest Version", placeholder: "1.2.0", sm: 6 },
      { key: "app_android_min_version", label: "Min Required", placeholder: "1.0.0", sm: 6 },
      { key: "app_android_update_url", label: "Play Store URL", placeholder: "https://play.google.com/…", sm: 12 },
    ],
  },
  {
    platform: "iOS",
    icon: PhoneIphoneIcon,
    color: "#1565c0",
    chipBg: "rgba(21,101,192,0.08)",
    fields: [
      { key: "app_ios_latest_version", label: "Latest Version", placeholder: "1.2.0", sm: 6 },
      { key: "app_ios_min_version", label: "Min Required", placeholder: "1.0.0", sm: 6 },
      { key: "app_ios_update_url", label: "App Store URL", placeholder: "https://apps.apple.com/…", sm: 12 },
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
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: "0.84rem", bgcolor: "#fff" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#e1580f" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#e1580f" },
  "& .MuiInputLabel-root": { fontSize: "0.84rem" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange, color, last }) {
  return (
    <>
      <Box
        onClick={onChange}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.6,
          gap: 1.5,
          cursor: "pointer",
          transition: "background 0.15s",
          "&:hover": { bgcolor: "rgba(0,0,0,0.022)" },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={600} fontSize="0.845rem" color="#1a1a1a" lineHeight={1.3}>
            {label}
          </Typography>
          <Typography fontSize="0.755rem" color="#888" sx={{ mt: 0.2, lineHeight: 1.5 }}>
            {desc}
          </Typography>
        </Box>
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "flex", alignItems: "center", gap: 0.8, flexShrink: 0 }}
        >
          <Box
            sx={{
              width: 34,
              textAlign: "center",
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: 0.6,
              color: checked ? color : "#bbb",
              transition: "color 0.2s",
            }}
          >
            {checked ? "ON" : "OFF"}
          </Box>
          <Switch
            checked={!!checked}
            onChange={onChange}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: color },
            }}
          />
        </Box>
      </Box>
      {!last && <Divider sx={{ mx: 2 }} />}
    </>
  );
}

function SectionCard({ icon: Icon, label, accentColor, bgColor, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
        bgcolor: "#fff",
        height: "100%",
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          px: 2,
          py: 1.5,
          bgcolor: bgColor,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            bgcolor: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ fontSize: 16, color: "#fff" }} />
        </Box>
        <Typography fontWeight={700} fontSize="0.875rem" color="#1a1a1a">
          {label}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemSettings() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error } = useSelector((s) => s.systemSettings);

  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { dispatch(fetchSystemSettings()); }, [dispatch]);
  useEffect(() => { if (settings) setLocal({ ...settings }); }, [settings]);

  const toggle = (key) => setLocal((p) => ({ ...p, [key]: !p[key] }));
  const setText = (key, val) => setLocal((p) => ({ ...p, [key]: val }));

  const dirty = settings && local ? ALL_KEYS.some((k) => local[k] !== settings[k]) : false;

  const handleSave = async () => {
    const updates = {};
    ALL_KEYS.forEach((k) => { updates[k] = local[k]; });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({ open: true, message: "Settings saved successfully.", severity: "success" });
    } catch {
      setSnack({ open: true, message: "Failed to save settings.", severity: "error" });
    }
  };

  if (loading || !local) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 2 }}>
        <CircularProgress size={30} sx={{ color: "#e1580f" }} />
        <Typography fontSize="0.82rem" color="text.secondary">Loading settings…</Typography>
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;

  const maintenanceOn = !!local.app_maintenance_mode;
  const enabledCount = ALL_BOOL_KEYS.filter((k) => !!local[k]).length;

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", pb: dirty ? 9 : 0 }}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(130deg, #c94400 0%, #e1580f 55%, #f87c3f 100%)",
          borderRadius: "16px",
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        {[
          { size: 140, top: -40, right: -30, opacity: 0.07 },
          { size: 90, bottom: -25, right: 80, opacity: 0.05 },
          { size: 60, top: 10, right: 160, opacity: 0.06 },
        ].map((b, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: b.size,
              height: b.size,
              borderRadius: "50%",
              bgcolor: "#fff",
              opacity: b.opacity,
              top: b.top,
              bottom: b.bottom,
              right: b.right,
              pointerEvents: "none",
            }}
          />
        ))}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, position: "relative" }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              bgcolor: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <SettingsIcon sx={{ fontSize: 24, color: "#fff" }} />
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize="1.15rem" lineHeight={1.2}>
              System Settings
            </Typography>
            <Typography fontSize="0.8rem" sx={{ opacity: 0.75, mt: 0.2 }}>
              Changes broadcast to all connected devices instantly
            </Typography>
          </Box>
        </Box>

        {/* Stats chips */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", position: "relative" }}>
          <Chip
            icon={<CheckCircleOutlineIcon sx={{ fontSize: "14px !important", color: "rgba(255,255,255,0.85) !important" }} />}
            label={`${enabledCount} / ${ALL_BOOL_KEYS.length} features enabled`}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: "0.72rem",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
              height: 24,
            }}
          />
          <Chip
            icon={<PowerSettingsNewIcon sx={{ fontSize: "13px !important", color: maintenanceOn ? "#fff !important" : "rgba(255,255,255,0.8) !important" }} />}
            label={maintenanceOn ? "Maintenance: ACTIVE" : "App: Live"}
            size="small"
            sx={{
              bgcolor: maintenanceOn ? "rgba(239,83,80,0.5)" : "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: "0.72rem",
              fontWeight: 700,
              backdropFilter: "blur(4px)",
              border: `1px solid ${maintenanceOn ? "rgba(239,83,80,0.6)" : "rgba(255,255,255,0.2)"}`,
              height: 24,
              ...(maintenanceOn && {
                "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.65 } },
                animation: "blink 2s ease-in-out infinite",
              }),
            }}
          />
        </Box>
      </Box>

      {/* ── Maintenance Mode ─────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "14px",
          overflow: "hidden",
          mb: 3,
          boxShadow: maintenanceOn
            ? "0 0 0 2px #ef5350, 0 4px 20px rgba(239,83,80,0.18)"
            : "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
          transition: "box-shadow 0.35s",
          bgcolor: maintenanceOn ? "rgba(239,83,80,0.03)" : "#fff",
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            px: 2.5,
            py: 1.5,
            background: maintenanceOn
              ? "linear-gradient(90deg, rgba(239,83,80,0.14) 0%, rgba(239,83,80,0.04) 100%)"
              : "rgba(0,0,0,0.025)",
            borderBottom: `1px solid ${maintenanceOn ? "rgba(239,83,80,0.2)" : "rgba(0,0,0,0.06)"}`,
            transition: "background 0.3s",
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "8px",
              bgcolor: maintenanceOn ? "#ef5350" : "#9e9e9e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.3s",
            }}
          >
            <ConstructionIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <Typography fontWeight={700} fontSize="0.875rem" color={maintenanceOn ? "#b71c1c" : "#333"}>
            Maintenance Mode
          </Typography>
          {maintenanceOn && (
            <Chip
              label="● LIVE"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: 0.5,
                bgcolor: "#ef5350",
                color: "#fff",
                ml: 0.5,
              }}
            />
          )}
        </Box>

        {/* Body */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 2.5,
            py: 2.5,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          {/* Status indicator box */}
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: "100%", sm: 200 },
              borderRadius: "10px",
              p: 2,
              bgcolor: maintenanceOn ? "rgba(239,83,80,0.07)" : "rgba(76,175,80,0.06)",
              border: `1px solid ${maintenanceOn ? "rgba(239,83,80,0.2)" : "rgba(76,175,80,0.2)"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.8,
              transition: "all 0.3s",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: maintenanceOn ? "#ef5350" : "#4caf50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.3s",
                ...(maintenanceOn && {
                  "@keyframes ripple": {
                    "0%": { boxShadow: "0 0 0 0 rgba(239,83,80,0.4)" },
                    "70%": { boxShadow: "0 0 0 12px rgba(239,83,80,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(239,83,80,0)" },
                  },
                  animation: "ripple 2s ease-out infinite",
                }),
              }}
            >
              {maintenanceOn
                ? <ConstructionIcon sx={{ fontSize: 20, color: "#fff" }} />
                : <PowerSettingsNewIcon sx={{ fontSize: 20, color: "#fff" }} />
              }
            </Box>
            <Typography fontWeight={700} fontSize="0.78rem" color={maintenanceOn ? "#c62828" : "#2e7d32"}>
              {maintenanceOn ? "DOWN FOR ALL USERS" : "APP IS LIVE"}
            </Typography>
          </Box>

          {/* Text + toggle */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={700} fontSize="0.925rem" color="#1a1a1a" mb={0.4}>
              {maintenanceOn ? "Users are currently blocked" : "App running normally"}
            </Typography>
            <Typography fontSize="0.8rem" color="#777" lineHeight={1.6} mb={1.5}>
              {maintenanceOn
                ? "A full-screen overlay is active on every device right now via WebSocket. Disable to restore access immediately."
                : "Enable to instantly push a full-screen maintenance overlay to all connected users. No app update needed."}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Switch
                checked={maintenanceOn}
                onChange={() => toggle("app_maintenance_mode")}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#ef5350" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#ef5350" },
                }}
              />
              <Typography fontSize="0.82rem" fontWeight={600} color={maintenanceOn ? "#ef5350" : "#aaa"}>
                {maintenanceOn ? "Maintenance is ON — tap to disable" : "Tap to enable maintenance mode"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Two-column grid ───────────────────────────────────────────────── */}
      <Grid container spacing={2.5} alignItems="flex-start">

        {/* LEFT: Toggle groups */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {TOGGLE_GROUPS.map((group) => (
              <SectionCard
                key={group.label}
                icon={group.icon}
                label={group.label}
                accentColor={group.accentColor}
                bgColor={group.bgColor}
              >
                {group.items.map(({ key, label, desc }, i) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    desc={desc}
                    checked={!!local[key]}
                    onChange={() => toggle(key)}
                    color={group.accentColor}
                    last={i === group.items.length - 1}
                  />
                ))}
              </SectionCard>
            ))}
          </Box>
        </Grid>

        {/* RIGHT: Version management */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
              bgcolor: "#fff",
            }}
          >
            {/* Card header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                px: 2,
                py: 1.5,
                bgcolor: "rgba(225,88,15,0.07)",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "8px",
                  bgcolor: "#e1580f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SystemUpdateAltIcon sx={{ fontSize: 16, color: "#fff" }} />
              </Box>
              <Typography fontWeight={700} fontSize="0.875rem" color="#1a1a1a">
                Version Management
              </Typography>
            </Box>

            {/* Platform sections */}
            {PLATFORM_SECTIONS.map(({ platform, icon: PlatformIcon, color, chipBg, fields }, idx) => (
              <React.Fragment key={platform}>
                <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
                  {/* Platform pill */}
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: 1.2,
                      py: 0.5,
                      borderRadius: "8px",
                      bgcolor: chipBg,
                      mb: 1.8,
                    }}
                  >
                    <PlatformIcon sx={{ fontSize: 15, color }} />
                    <Typography fontWeight={700} fontSize="0.75rem" color={color} letterSpacing={0.3}>
                      {platform}
                    </Typography>
                  </Box>

                  <Grid container spacing={1.5}>
                    {fields.map(({ key, label, placeholder, sm }) => (
                      <Grid item xs={12} sm={sm} key={key}>
                        <TextField
                          label={label}
                          value={local[key] ?? ""}
                          onChange={(e) => setText(key, e.target.value)}
                          placeholder={placeholder}
                          size="small"
                          fullWidth
                          sx={inputSx}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                {idx < PLATFORM_SECTIONS.length - 1 && (
                  <Divider sx={{ mx: 2.5, borderStyle: "dashed" }} />
                )}
              </React.Fragment>
            ))}

            {/* Release Notes */}
            <Divider sx={{ mx: 2.5 }} />
            <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
              <Typography fontWeight={700} fontSize="0.78rem" color="#777" mb={1.2} letterSpacing={0.3} textTransform="uppercase">
                Release Notes
              </Typography>
              <TextField
                label="What's new in this version"
                value={local.app_release_notes ?? ""}
                onChange={(e) => setText("app_release_notes", e.target.value)}
                placeholder="Bug fixes and performance improvements."
                size="small"
                fullWidth
                multiline
                minRows={2}
                sx={inputSx}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Sticky save bar ───────────────────────────────────────────────── */}
      <Slide direction="up" in={dirty} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, sm: 4 },
            py: 1.4,
            bgcolor: "#1a1a1a",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#e1580f",
                flexShrink: 0,
                "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            <Typography fontSize="0.82rem" color="rgba(255,255,255,0.7)" fontWeight={500}>
              You have unsaved changes
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="text"
              size="small"
              startIcon={<RestartAltIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() => setLocal({ ...settings })}
              disabled={saving}
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.82rem",
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                saving
                  ? <CircularProgress size={13} sx={{ color: "#fff" }} />
                  : <SaveOutlinedIcon sx={{ fontSize: "16px !important" }} />
              }
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                bgcolor: "#e1580f",
                boxShadow: "none",
                "&:hover": { bgcolor: "#c44e0c", boxShadow: "none" },
                minWidth: 130,
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </Box>
        </Box>
      </Slide>

      {/* ── Snackbar ──────────────────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
