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

// ─── Data ────────────────────────────────────────────────────────────────────

const TOGGLE_GROUPS = [
  {
    label: "OTP / SMS",
    icon: <SmsIcon sx={{ fontSize: 18, color: "#e1580f" }} />,
    accentColor: "#e1580f",
    items: [
      {
        key: "otp_real_enabled",
        label: "Real OTP (MSG91)",
        desc: "ON = send real OTP via MSG91. OFF = bypass OTP (any code accepted — testing only).",
      },
    ],
  },
  {
    label: "WhatsApp Notifications",
    icon: <WhatsAppIcon sx={{ fontSize: 18, color: "#25D366" }} />,
    accentColor: "#25D366",
    items: [
      {
        key: "whatsapp_business_lead_alert",
        label: "Business Lead Alert",
        desc: "Notify matching business owners via WhatsApp when a customer searches.",
      },
      {
        key: "whatsapp_customer_business_list",
        label: "Customer Business List",
        desc: "Send the top‑10 matching businesses to the searching customer via WhatsApp.",
      },
      {
        key: "whatsapp_mni_lead_alert",
        label: "MNI Lead Alert",
        desc: "Notify MNI businesses via WhatsApp when a new requirement is submitted.",
      },
      {
        key: "whatsapp_mni_customer_list",
        label: "MNI Customer Result",
        desc: "Send the matched MNI business to the requesting customer via WhatsApp.",
      },
      {
        key: "whatsapp_login_welcome",
        label: "Login Welcome Message",
        desc: "Send a WhatsApp welcome message to new users on their first login.",
      },
    ],
  },
];

const PLATFORM_SECTIONS = [
  {
    platform: "Android",
    icon: <AndroidIcon sx={{ fontSize: 17, color: "#3ddc84" }} />,
    color: "#3ddc84",
    fields: [
      { key: "app_android_latest_version", label: "Latest Version", placeholder: "e.g. 1.2.0", sm: 6 },
      { key: "app_android_min_version", label: "Min Required Version", placeholder: "e.g. 1.0.0", sm: 6 },
      { key: "app_android_update_url", label: "Play Store URL", placeholder: "https://play.google.com/store/apps/details?id=…", sm: 12 },
    ],
  },
  {
    platform: "iOS",
    icon: <PhoneIphoneIcon sx={{ fontSize: 17, color: "#606060" }} />,
    color: "#606060",
    fields: [
      { key: "app_ios_latest_version", label: "Latest Version", placeholder: "e.g. 1.2.0", sm: 6 },
      { key: "app_ios_min_version", label: "Min Required Version", placeholder: "e.g. 1.0.0", sm: 6 },
      { key: "app_ios_update_url", label: "App Store URL", placeholder: "https://apps.apple.com/app/…", sm: 12 },
    ],
  },
];

const ALL_KEYS = [
  ...TOGGLE_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  "app_maintenance_mode",
  "app_android_latest_version",
  "app_android_min_version",
  "app_android_update_url",
  "app_ios_latest_version",
  "app_ios_min_version",
  "app_ios_update_url",
  "app_release_notes",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const cardSx = {
  mb: 2.5,
  border: "1px solid #e8e8e8",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "none",
};

function SectionHeader({ icon, label }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        px: 2.5,
        py: 1.8,
        bgcolor: "#f9fafb",
        borderBottom: "1px solid #e8e8e8",
      }}
    >
      {icon}
      <Typography fontWeight={700} fontSize="0.875rem" color="#222">
        {label}
      </Typography>
    </Box>
  );
}

function ToggleRow({ label, desc, checked, onChange, color, last }) {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.8,
          gap: 2,
          cursor: "pointer",
          transition: "background 0.15s",
          "&:hover": { bgcolor: "rgba(0,0,0,0.018)" },
        }}
        onClick={onChange}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600} fontSize="0.875rem" color="#1a1a1a">
            {label}
          </Typography>
          <Typography
            fontSize="0.775rem"
            color="text.secondary"
            sx={{ mt: 0.25, lineHeight: 1.55 }}
          >
            {desc}
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Chip
            label={checked ? "ON" : "OFF"}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: 0.6,
              px: 0.2,
              bgcolor: checked ? `${color}18` : "#f0f0f0",
              color: checked ? color : "#aaa",
              border: `1px solid ${checked ? `${color}40` : "#e0e0e0"}`,
              transition: "all 0.2s",
            }}
          />
          <Switch
            checked={!!checked}
            onChange={onChange}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                bgcolor: color,
              },
            }}
          />
        </Box>
      </Box>
      {!last && <Divider />}
    </>
  );
}

function StyledTextField({ label, value, onChange, placeholder, multiline, sm = 12 }) {
  return (
    <Grid item xs={12} sm={sm}>
      <TextField
        label={label}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        size="small"
        fullWidth
        multiline={!!multiline}
        minRows={multiline ? 2 : undefined}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            fontSize: "0.85rem",
          },
          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
            { borderColor: "#e1580f" },
          "& .MuiInputLabel-root.Mui-focused": { color: "#e1580f" },
          "& .MuiInputLabel-root": { fontSize: "0.85rem" },
        }}
      />
    </Grid>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemSettings() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error } = useSelector(
    (s) => s.systemSettings
  );

  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) setLocal({ ...settings });
  }, [settings]);

  const toggle = (key) => setLocal((p) => ({ ...p, [key]: !p[key] }));
  const setText = (key, val) => setLocal((p) => ({ ...p, [key]: val }));

  const dirty =
    settings && local
      ? ALL_KEYS.some((k) => local[k] !== settings[k])
      : false;

  const handleSave = async () => {
    const updates = {};
    ALL_KEYS.forEach((k) => { updates[k] = local[k]; });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({ open: true, message: "Settings saved.", severity: "success" });
    } catch {
      setSnack({ open: true, message: "Failed to save settings.", severity: "error" });
    }
  };

  const handleReset = () => settings && setLocal({ ...settings });

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading || !local) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 260,
          gap: 2,
        }}
      >
        <CircularProgress size={32} sx={{ color: "#e1580f" }} />
        <Typography fontSize="0.85rem" color="text.secondary">
          Loading settings…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  const maintenanceOn = !!local.app_maintenance_mode;

  return (
    <Box sx={{ maxWidth: 700, width: "100%", mx: "auto", pb: dirty ? 10 : 2 }}>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            bgcolor: "rgba(225,88,15,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 0.25,
            flexShrink: 0,
          }}
        >
          <SettingsIcon sx={{ fontSize: 20, color: "#e1580f" }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            System Settings
          </Typography>
          <Typography fontSize="0.8rem" color="text.secondary" mt={0.3}>
            Control live app behaviour — changes take effect immediately.
          </Typography>
        </Box>
      </Box>

      {/* ── Maintenance Mode ──────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          ...cardSx,
          border: `1.5px solid ${maintenanceOn ? "#ef5350" : "#e8e8e8"}`,
          bgcolor: maintenanceOn ? "rgba(239,83,80,0.03)" : "#fff",
          transition: "border-color 0.3s, background 0.3s",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            px: 2.5,
            py: 1.8,
            bgcolor: maintenanceOn ? "rgba(239,83,80,0.06)" : "#f9fafb",
            borderBottom: `1px solid ${maintenanceOn ? "rgba(239,83,80,0.2)" : "#e8e8e8"}`,
            transition: "background 0.3s",
          }}
        >
          <ConstructionIcon
            sx={{ fontSize: 18, color: maintenanceOn ? "#ef5350" : "#888" }}
          />
          <Typography
            fontWeight={700}
            fontSize="0.875rem"
            color={maintenanceOn ? "#c62828" : "#222"}
          >
            Maintenance Mode
          </Typography>
          {maintenanceOn && (
            <Chip
              label="ACTIVE"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: 0.8,
                bgcolor: "#ef5350",
                color: "#fff",
                ml: 0.5,
                "@keyframes blink": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.6 },
                },
                animation: "blink 2s ease-in-out infinite",
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2.2,
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              fontWeight={600}
              fontSize="0.875rem"
              color={maintenanceOn ? "#b71c1c" : "#1a1a1a"}
            >
              {maintenanceOn
                ? "App is DOWN for all users"
                : "App is running normally"}
            </Typography>
            <Typography
              fontSize="0.775rem"
              color={maintenanceOn ? "#e57373" : "text.secondary"}
              sx={{ mt: 0.3, lineHeight: 1.55 }}
            >
              {maintenanceOn
                ? "A full-screen blocking overlay is active on every device right now. Disable to restore access."
                : "Enable to instantly push a full-screen maintenance screen to all connected users via WebSocket."}
            </Typography>
          </Box>

          <Box
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 0.4 }}
          >
            <Switch
              checked={maintenanceOn}
              onChange={() => toggle("app_maintenance_mode")}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#ef5350" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  bgcolor: "#ef5350",
                },
              }}
            />
            <Typography
              fontSize="0.68rem"
              fontWeight={700}
              letterSpacing={0.5}
              color={maintenanceOn ? "#ef5350" : "#bbb"}
            >
              {maintenanceOn ? "ON" : "OFF"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── Toggle groups ─────────────────────────────────────────────────── */}
      {TOGGLE_GROUPS.map((group) => (
        <Paper key={group.label} elevation={0} sx={cardSx}>
          <SectionHeader icon={group.icon} label={group.label} />
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
        </Paper>
      ))}

      {/* ── Version Management ────────────────────────────────────────────── */}
      <Paper elevation={0} sx={cardSx}>
        <SectionHeader
          icon={<SystemUpdateAltIcon sx={{ fontSize: 18, color: "#e1580f" }} />}
          label="Version Management"
        />

        {PLATFORM_SECTIONS.map(({ platform, icon, color, fields }, idx) => (
          <React.Fragment key={platform}>
            <Box sx={{ px: 2.5, pt: 2.2, pb: 2.5 }}>
              {/* Platform sub-header */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  mb: 2,
                  px: 1.2,
                  py: 0.5,
                  borderRadius: "6px",
                  bgcolor: `${color}12`,
                  border: `1px solid ${color}30`,
                }}
              >
                {icon}
                <Typography
                  fontWeight={700}
                  fontSize="0.78rem"
                  color={color}
                  letterSpacing={0.3}
                >
                  {platform}
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                {fields.map(({ key, label, placeholder, sm }) => (
                  <StyledTextField
                    key={key}
                    sm={sm}
                    label={label}
                    value={local[key]}
                    onChange={(e) => setText(key, e.target.value)}
                    placeholder={placeholder}
                  />
                ))}
              </Grid>
            </Box>
            {idx < PLATFORM_SECTIONS.length - 1 && <Divider />}
          </React.Fragment>
        ))}

        <Divider />

        {/* Release Notes */}
        <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
          <Typography
            fontWeight={600}
            fontSize="0.8rem"
            color="#555"
            mb={1.2}
          >
            Release Notes
          </Typography>
          <Grid container>
            <StyledTextField
              label="What's new in this version"
              value={local.app_release_notes}
              onChange={(e) => setText("app_release_notes", e.target.value)}
              placeholder="Bug fixes and performance improvements."
              multiline
            />
          </Grid>
        </Box>
      </Paper>

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
            py: 1.5,
            bgcolor: "#fff",
            borderTop: "1px solid #e8e8e8",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#e1580f",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            <Typography fontSize="0.82rem" color="text.secondary" fontWeight={500}>
              Unsaved changes
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={saving}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.82rem",
                borderColor: "#ddd",
                color: "#555",
                "&:hover": { borderColor: "#bbb", bgcolor: "#fafafa" },
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                saving ? (
                  <CircularProgress size={14} sx={{ color: "#fff" }} />
                ) : (
                  <SaveOutlinedIcon />
                )
              }
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.82rem",
                bgcolor: "#e1580f",
                boxShadow: "none",
                "&:hover": { bgcolor: "#c44e0c", boxShadow: "none" },
                minWidth: 120,
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
