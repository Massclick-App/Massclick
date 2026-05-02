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
  FormControlLabel,
  CircularProgress,
  Divider,
  Paper,
  Button,
  Alert,
  Snackbar,
  TextField,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

const BOOLEAN_GROUPS = [
  {
    label: "OTP / SMS",
    icon: <SmsIcon sx={{ color: "#e1580f" }} />,
    items: [
      {
        key: "otp_real_enabled",
        label: "Real OTP (MSG91)",
        desc: "ON = send real OTP via MSG91. OFF = bypass OTP (any code accepted — use for testing only).",
      },
    ],
  },
  {
    label: "WhatsApp Notifications",
    icon: <WhatsAppIcon sx={{ color: "#25D366" }} />,
    items: [
      {
        key: "whatsapp_business_lead_alert",
        label: "Business Lead Alert",
        desc: "Notify matching business owners via WhatsApp when a customer searches.",
      },
      {
        key: "whatsapp_customer_business_list",
        label: "Customer Business List",
        desc: "Send the top-10 matching businesses to the searching customer via WhatsApp.",
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

const VERSION_STRING_FIELDS = [
  { key: "app_android_latest_version", label: "Android Latest Version", placeholder: "e.g. 1.2.0" },
  { key: "app_android_min_version", label: "Android Min Required Version", placeholder: "e.g. 1.0.0" },
  { key: "app_android_update_url", label: "Android Update URL", placeholder: "Play Store URL" },
  { key: "app_ios_latest_version", label: "iOS Latest Version", placeholder: "e.g. 1.2.0" },
  { key: "app_ios_min_version", label: "iOS Min Required Version", placeholder: "e.g. 1.0.0" },
  { key: "app_ios_update_url", label: "iOS Update URL", placeholder: "App Store URL" },
  { key: "app_release_notes", label: "Release Notes", placeholder: "What's new in this version…", multiline: true },
];

const ALL_KEYS = [
  ...BOOLEAN_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  "app_maintenance_mode",
  ...VERSION_STRING_FIELDS.map((f) => f.key),
];

export default function SystemSettings() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error, saveError } = useSelector(
    (state) => state.systemSettings
  );

  const [local, setLocal] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) setLocal({ ...settings });
  }, [settings]);

  const handleToggle = (key) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleText = (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const isDirty = () => {
    if (!settings || !local) return false;
    return ALL_KEYS.some((key) => local[key] !== settings[key]);
  };

  const handleSave = async () => {
    const updates = {};
    ALL_KEYS.forEach((key) => { updates[key] = local[key]; });
    try {
      await dispatch(updateSystemSettings(updates));
      setSnack({ open: true, message: "Settings saved successfully.", severity: "success" });
    } catch {
      setSnack({ open: true, message: "Failed to save settings.", severity: "error" });
    }
  };

  const handleReset = () => {
    if (settings) setLocal({ ...settings });
  };

  if (loading || !local) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 680, width: "100%", mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 28, color: "#e1580f" }} />
        <Typography variant="h5" fontWeight={700}>
          System Settings
        </Typography>
      </Box>

      {/* Boolean toggle groups */}
      {BOOLEAN_GROUPS.map((group) => (
        <Paper
          key={group.label}
          elevation={0}
          sx={{ mb: 3, border: "1px solid #ebebeb", borderRadius: 3, overflow: "hidden" }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              px: 2.5,
              py: 1.8,
              bgcolor: "#fafafa",
              borderBottom: "1px solid #ebebeb",
            }}
          >
            {group.icon}
            <Typography fontWeight={700} fontSize="0.95rem" color="#333">
              {group.label}
            </Typography>
          </Box>

          {group.items.map(({ key, label, desc }, idx) => (
            <React.Fragment key={key}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  px: 2.5,
                  py: 2,
                  gap: 2,
                }}
              >
                <Box>
                  <Typography fontWeight={600} fontSize="0.9rem" color="#1a1a1a">
                    {label}
                  </Typography>
                  <Typography fontSize="0.8rem" color="text.secondary" sx={{ mt: 0.3 }}>
                    {desc}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!local[key]}
                      onChange={() => handleToggle(key)}
                      color="warning"
                      size="small"
                    />
                  }
                  label={
                    <Typography
                      fontSize="0.78rem"
                      fontWeight={600}
                      color={local[key] ? "#e1580f" : "#888"}
                    >
                      {local[key] ? "ON" : "OFF"}
                    </Typography>
                  }
                  labelPlacement="end"
                  sx={{ m: 0, flexShrink: 0 }}
                />
              </Box>
              {idx < group.items.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Paper>
      ))}

      {/* Version Management */}
      <Paper
        elevation={0}
        sx={{ mb: 3, border: "1px solid #ebebeb", borderRadius: 3, overflow: "hidden" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            px: 2.5,
            py: 1.8,
            bgcolor: "#fafafa",
            borderBottom: "1px solid #ebebeb",
          }}
        >
          <SystemUpdateAltIcon sx={{ color: "#e1580f" }} />
          <Typography fontWeight={700} fontSize="0.95rem" color="#333">
            Version Management
          </Typography>
        </Box>

        {/* Maintenance mode toggle */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
            gap: 2,
          }}
        >
          <Box>
            <Typography fontWeight={600} fontSize="0.9rem" color="#1a1a1a">
              Maintenance Mode
            </Typography>
            <Typography fontSize="0.8rem" color="text.secondary" sx={{ mt: 0.3 }}>
              When ON, the app will show a maintenance screen to all users.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={!!local.app_maintenance_mode}
                onChange={() => handleToggle("app_maintenance_mode")}
                color="error"
                size="small"
              />
            }
            label={
              <Typography
                fontSize="0.78rem"
                fontWeight={600}
                color={local.app_maintenance_mode ? "#d32f2f" : "#888"}
              >
                {local.app_maintenance_mode ? "ON" : "OFF"}
              </Typography>
            }
            labelPlacement="end"
            sx={{ m: 0, flexShrink: 0 }}
          />
        </Box>

        <Divider />

        {/* Version string fields */}
        <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {VERSION_STRING_FIELDS.map(({ key, label, placeholder, multiline }) => (
            <TextField
              key={key}
              label={label}
              value={local[key] ?? ""}
              onChange={(e) => handleText(key, e.target.value)}
              placeholder={placeholder}
              size="small"
              fullWidth
              multiline={!!multiline}
              minRows={multiline ? 2 : undefined}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e1580f",
                },
                "& .MuiInputLabel-root.Mui-focused": { color: "#e1580f" },
              }}
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleReset}
          disabled={!isDirty() || saving}
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty() || saving}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            bgcolor: "#e1580f",
            "&:hover": { bgcolor: "#c44e0c" },
            minWidth: 120,
          }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Save Changes"}
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
