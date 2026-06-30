import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { fetchAllCategoriesForPicker } from "../../redux/actions/categoryDisplaySettingsAction.js";
import {
  fetchAdminPublicUserCounter,
  resetAdminPublicUserCounter,
  updateAdminPublicUserCounter,
} from "../../redux/actions/publicUserCounterAction.js";
import styles from "./PublicUserCounterAdmin.module.css";

const cx = createScopedClassNames(styles);

const DEFAULT_SETTINGS = {
  enabled: true,
  title: "Public Users",
  subtitle: "Public Users Connected",
  baseCount: 52487,
  todayBaseCount: 127,
  onlineBaseCount: 143,
  incrementMin: 1,
  incrementMax: 5,
  intervalSeconds: 30,
  resetDaily: true,
  categories: [],
};

const numberFields = new Set([
  "baseCount",
  "todayBaseCount",
  "onlineBaseCount",
  "incrementMin",
  "incrementMax",
  "intervalSeconds",
]);

const toInputValue = (value) => (value ?? "").toString();

const normalizeForSave = (settings) => ({
  ...settings,
  baseCount: Number(settings.baseCount) || 0,
  todayBaseCount: Number(settings.todayBaseCount) || 0,
  onlineBaseCount: Number(settings.onlineBaseCount) || 0,
  incrementMin: Number(settings.incrementMin) || 0,
  incrementMax: Number(settings.incrementMax) || 0,
  intervalSeconds: Number(settings.intervalSeconds) || 30,
  resetDaily: settings.resetDaily !== false,
  categories: (settings.categories || [])
    .filter((item) => item.name?.trim())
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      slug: item.slug?.trim() || item.name.trim().toLowerCase().replace(/\s+/g, "-"),
      baseCount: Number(item.baseCount) || 0,
      incrementMin: Number(item.incrementMin) || 0,
      incrementMax: Number(item.incrementMax) || 0,
          intervalSeconds: Number(item.intervalSeconds) || 30,
      enabled: item.enabled !== false,
    })),
});

const PublicUserCounterAdmin = () => {
  const dispatch = useDispatch();
  const {
    adminSettings,
    adminLoading,
    saving: reduxSaving,
  } = useSelector((state) => state.publicUserCounter || {});
  const {
    allCategories = [],
    pickerLoading = false,
  } = useSelector((state) => state.categoryDisplaySettings || {});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState(DEFAULT_SETTINGS);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const dirty = useMemo(
    () => JSON.stringify(normalizeForSave(settings)) !== JSON.stringify(normalizeForSave(original)),
    [settings, original]
  );

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const loadSettings = useCallback(async () => {
    try {
      const data = await dispatch(fetchAdminPublicUserCounter());
      const next = { ...DEFAULT_SETTINGS, ...(data || {}) };
      setSettings(next);
      setOriginal(next);
    } catch (error) {
      showMessage("error", error?.message || "Failed to load counter settings");
    }
  }, [dispatch]);

  useEffect(() => {
    loadSettings();
    dispatch(fetchAllCategoriesForPicker());
  }, [dispatch, loadSettings]);

  useEffect(() => {
    if (!adminSettings) return;
    const next = { ...DEFAULT_SETTINGS, ...adminSettings };
    setSettings(next);
    setOriginal(next);
  }, [adminSettings]);

  const updateField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: numberFields.has(field) ? value.replace(/[^\d]/g, "") : value,
    }));
  };

  const updateCategory = (index, field, value) => {
    setSettings((prev) => {
      const categories = [...(prev.categories || [])];
      const current = categories[index] || {};
      categories[index] = {
        ...current,
        [field]: ["baseCount", "incrementMin", "incrementMax", "intervalSeconds"].includes(field)
          ? value.replace(/[^\d]/g, "")
          : value,
      };
      return { ...prev, categories };
    });
  };

  const addCategory = () => {
    setSettings((prev) => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        {
          name: "",
          slug: "",
          baseCount: 500,
          incrementMin: 0,
          incrementMax: 2,
          intervalSeconds: 30,
          enabled: true,
        },
      ],
    }));
  };

  const addCategoryFromCollection = (category) => {
    if (!category?.name) return;
    setSettings((prev) => {
      const exists = (prev.categories || []).some(
        (item) => item.slug === category.slug || item.name.toLowerCase() === category.name.toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        categories: [
          ...(prev.categories || []),
          {
            name: category.name,
            slug: category.slug || category.name.toLowerCase().replace(/\s+/g, "-"),
            baseCount: 500,
            incrementMin: 0,
            incrementMax: 2,
            intervalSeconds: 30,
            enabled: true,
          },
        ],
      };
    });
  };

  const removeCategory = (index) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveSettings = async () => {
    try {
      const payload = normalizeForSave(settings);
      const data = await dispatch(updateAdminPublicUserCounter(payload));
      const next = { ...DEFAULT_SETTINGS, ...(data || {}) };
      setSettings(next);
      setOriginal(next);
      showMessage("success", "Public user counter saved");
    } catch (error) {
      showMessage("error", error?.message || "Failed to save counter settings");
    }
  };

  const resetCounter = async () => {
    try {
      const data = await dispatch(resetAdminPublicUserCounter(Number(settings.baseCount) || 0));
      const next = { ...DEFAULT_SETTINGS, ...(data || {}) };
      setSettings(next);
      setOriginal(next);
      showMessage("success", "Counter start point reset");
    } catch (error) {
      showMessage("error", error?.message || "Failed to reset counter");
    }
  };

  if (adminLoading && !adminSettings) {
    return (
      <Box className={cx("public-counter-admin public-counter-admin--loading")}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box className={cx("public-counter-admin")}>
      <Card className={cx("public-counter-admin__header")} variant="outlined">
        <div className={cx("public-counter-admin__header-icon")}>
          <GroupsRoundedIcon />
        </div>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Public Users Count
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 14 }}>
            Manage the home-page display counter and category-wise display numbers.
          </Typography>
        </div>
        <Chip
          label={settings.enabled ? "Visible on home" : "Hidden"}
          color={settings.enabled ? "success" : "default"}
          size="small"
          sx={{ ml: "auto" }}
        />
      </Card>

      <Card className={cx("public-counter-admin__panel")} variant="outlined">
        <Stack spacing={2.5}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enabled}
                onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
            }
            label="Show public users count on home page"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.resetDaily !== false}
                onChange={(event) => setSettings((prev) => ({ ...prev, resetDaily: event.target.checked }))}
              />
            }
            label="Reset to starting count every day"
          />

          <div className={cx("public-counter-admin__grid")}>
            <TextField label="Title" size="small" value={settings.title} onChange={(e) => updateField("title", e.target.value)} />
            <TextField label="Subtitle" size="small" value={settings.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} />
            <TextField label="Starting Count" size="small" value={toInputValue(settings.baseCount)} onChange={(e) => updateField("baseCount", e.target.value)} />
            <TextField label="New Users Today" size="small" value={toInputValue(settings.todayBaseCount)} onChange={(e) => updateField("todayBaseCount", e.target.value)} />
            <TextField label="Users Online Now" size="small" value={toInputValue(settings.onlineBaseCount)} onChange={(e) => updateField("onlineBaseCount", e.target.value)} />
            <TextField label="Update Every Seconds" size="small" value={toInputValue(settings.intervalSeconds)} onChange={(e) => updateField("intervalSeconds", e.target.value)} />
            <TextField label="Increment Min" size="small" value={toInputValue(settings.incrementMin)} onChange={(e) => updateField("incrementMin", e.target.value)} />
            <TextField label="Increment Max" size="small" value={toInputValue(settings.incrementMax)} onChange={(e) => updateField("incrementMax", e.target.value)} />
          </div>

          <Alert severity="info">
            Example: starting count 500, increment 1 to 5, update every 30 seconds. Every morning at 7:00 AM it starts again from 500 when daily reset is enabled.
          </Alert>
        </Stack>
      </Card>

      <Card className={cx("public-counter-admin__panel")} variant="outlined">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Category Counts
          </Typography>
          <Chip label={`${settings.categories?.length || 0} categories`} size="small" />
          <Box sx={{ ml: "auto", width: { xs: "100%", sm: 320 } }}>
            <Autocomplete
              size="small"
              loading={pickerLoading}
              options={allCategories}
              getOptionLabel={(option) => option?.name || ""}
              value={null}
              onChange={(_, value) => addCategoryFromCollection(value)}
              renderInput={(params) => <TextField {...params} label="Add from categories" />}
            />
          </Box>
          <Button startIcon={<AddIcon />} onClick={addCategory} sx={{ textTransform: "none" }}>
            Custom
          </Button>
        </Stack>

        <Stack spacing={1.25}>
          {(settings.categories || []).map((category, index) => (
            <div className={cx("public-counter-admin__category-row")} key={category._id || index}>
              <Switch
                checked={category.enabled !== false}
                onChange={(event) => updateCategory(index, "enabled", event.target.checked)}
              />
              <TextField label="Category" size="small" value={category.name || ""} onChange={(e) => updateCategory(index, "name", e.target.value)} />
              <TextField label="Slug" size="small" value={category.slug || ""} onChange={(e) => updateCategory(index, "slug", e.target.value)} />
              <TextField label="Start" size="small" value={toInputValue(category.baseCount)} onChange={(e) => updateCategory(index, "baseCount", e.target.value)} />
              <TextField label="Min" size="small" value={toInputValue(category.incrementMin)} onChange={(e) => updateCategory(index, "incrementMin", e.target.value)} />
              <TextField label="Max" size="small" value={toInputValue(category.incrementMax)} onChange={(e) => updateCategory(index, "incrementMax", e.target.value)} />
              <TextField label="Seconds" size="small" value={toInputValue(category.intervalSeconds)} onChange={(e) => updateCategory(index, "intervalSeconds", e.target.value)} />
              <IconButton aria-label="Remove category" onClick={() => removeCategory(index)}>
                <DeleteOutlineIcon />
              </IconButton>
            </div>
          ))}
        </Stack>
      </Card>

      <div className={cx("public-counter-admin__footer")}>
        <Chip label={dirty ? "Unsaved changes" : "All changes saved"} color={dirty ? "warning" : "success"} size="small" />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RestartAltIcon />} onClick={resetCounter} disabled={reduxSaving} sx={{ textTransform: "none" }}>
            Reset Start
          </Button>
          <Button variant="contained" startIcon={reduxSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={saveSettings} disabled={!dirty || reduxSaving} sx={{ textTransform: "none" }}>
            Save
          </Button>
        </Stack>
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PublicUserCounterAdmin;
