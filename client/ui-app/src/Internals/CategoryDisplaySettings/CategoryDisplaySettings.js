import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategoryDisplaySettings,
  updateCategoryDisplaySettings,
  fetchAllCategoriesForPicker,
} from "../../redux/actions/categoryDisplaySettingsAction.js";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moveItem(arr, from, to) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ─── Reusable ordered list with picker ───────────────────────────────────────

function OrderedList({ items, onAdd, onRemove, onMove, allCategories, pickerLoading, maxItems, freeText }) {
  const [inputValue, setInputValue] = useState("");

  const canAdd = !maxItems || items.length < maxItems;

  const handleAdd = (name) => {
    if (!name || items.includes(name)) return;
    onAdd(name);
    setInputValue("");
  };

  return (
    <Box>
      {maxItems && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
          {items.length} / {maxItems} slots
        </Typography>
      )}

      <List dense disablePadding>
        {items.map((item, index) => (
          <ListItem
            key={index}
            disablePadding
            sx={{
              py: 0.4,
              px: 1,
              mb: 0.4,
              bgcolor: "#fafafa",
              border: "1px solid #eee",
              borderRadius: 1,
              display: "flex",
              gap: 0.5,
              alignItems: "center",
            }}
          >
            <Chip label={index + 1} size="small" sx={{ mr: 0.5, minWidth: 28, fontSize: 11 }} />
            <ListItemText primary={item} primaryTypographyProps={{ fontSize: 13 }} sx={{ flexGrow: 1 }} />
            <IconButton size="small" onClick={() => onMove(index, index - 1)} disabled={index === 0}>
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={() => onMove(index, index + 1)} disabled={index === items.length - 1}>
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onRemove(index)}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {canAdd && (
        <Box sx={{ mt: 1 }}>
          {freeText ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                size="small"
                placeholder="Type name and press Add"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { handleAdd(inputValue.trim()); } }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAdd(inputValue.trim())}
                disabled={!inputValue.trim()}
              >
                Add
              </Button>
            </Box>
          ) : (
            <Autocomplete
              options={allCategories.filter((cat) => !items.includes(cat.name))}
              getOptionLabel={(opt) => opt.name}
              loading={pickerLoading}
              inputValue={inputValue}
              onInputChange={(_, val) => setInputValue(val)}
              onChange={(_, val) => { if (val) handleAdd(val.name); }}
              renderInput={(params) => (
                <TextField {...params} label="Add category" size="small" />
              )}
              size="small"
            />
          )}
        </Box>
      )}

      {!canAdd && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
          Maximum {maxItems} items reached
        </Typography>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryDisplaySettings() {
  const dispatch = useDispatch();
  const { settings, allCategories, loading, saving, saveError, pickerLoading } =
    useSelector((state) => state.categoryDisplaySettings);

  const [tab, setTab] = useState(0);
  const [homeTab, setHomeTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Local editable state
  const [homeFeaturedDesktop, setHomeFeaturedDesktop] = useState([]);
  const [homeFeaturedMobile, setHomeFeaturedMobile] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [serviceCardSections, setServiceCardSections] = useState([]);
  const [subCategoryMapping, setSubCategoryMapping] = useState([]);

  useEffect(() => {
    dispatch(fetchCategoryDisplaySettings());
    dispatch(fetchAllCategoriesForPicker());
  }, [dispatch]);

  useEffect(() => {
    if (!settings) return;
    setHomeFeaturedDesktop(settings.homeFeaturedDesktop || []);
    setHomeFeaturedMobile(settings.homeFeaturedMobile || []);
    setPopularCategories(settings.popularCategories || []);
    setServiceCardSections(
      settings.serviceCardSections?.length > 0
        ? settings.serviceCardSections
        : [
            { section: "Repair and Services", desktopItems: [], mobileItems: [] },
            { section: "Services", desktopItems: [], mobileItems: [] },
            { section: "Hot Categories", desktopItems: [], mobileItems: [] },
            { section: "Building Materials", desktopItems: [], mobileItems: [] },
          ]
    );
    setSubCategoryMapping(settings.subCategoryMapping || []);
  }, [settings]);

  const handleSave = async () => {
    try {
      await dispatch(
        updateCategoryDisplaySettings({
          homeFeaturedDesktop,
          homeFeaturedMobile,
          popularCategories,
          serviceCardSections,
          subCategoryMapping,
        })
      );
      setSnackbar({ open: true, message: "Settings saved! V2 cache cleared.", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Save failed", severity: "error" });
    }
  };

  // ── Service card section helpers ──────────────────────────────────────────

  const updateSection = useCallback((index, field, value) => {
    setServiceCardSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addSection = () =>
    setServiceCardSections((prev) => [
      ...prev,
      { section: "New Section", desktopItems: [], mobileItems: [] },
    ]);

  const removeSection = (index) =>
    setServiceCardSections((prev) => prev.filter((_, i) => i !== index));

  // ── Sub-category mapping helpers ─────────────────────────────────────────

  const updateMapping = useCallback((index, field, value) => {
    setSubCategoryMapping((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addMapping = () =>
    setSubCategoryMapping((prev) => [...prev, { parentSlug: "", subCategoryNames: [] }]);

  const removeMapping = (index) =>
    setSubCategoryMapping((prev) => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Category Display Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure what appears in the v2 endpoints. Changes clear the v2 cache immediately.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ bgcolor: "#e1580f", "&:hover": { bgcolor: "#c94a0a" }, minWidth: 140 }}
        >
          {saving ? "Saving..." : "Save All"}
        </Button>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {/* Main tabs */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: "1px solid #eee", bgcolor: "#fafafa" }}
        >
          <Tab label="🏠 Home Featured" />
          <Tab label="⭐ Popular" />
          <Tab label="🗂 Service Cards" />
          <Tab label="📂 Sub-Categories" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ── Tab 0: Home Featured ───────────────────────────────────── */}
          {tab === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Categories shown on the home page hero section. Desktop shows up to 20, mobile up to 12.
              </Typography>
              <Tabs
                value={homeTab}
                onChange={(_, v) => setHomeTab(v)}
                sx={{ mb: 2, borderBottom: "1px solid #eee" }}
              >
                <Tab label={`Desktop (${homeFeaturedDesktop.length}/20)`} />
                <Tab label={`Mobile (${homeFeaturedMobile.length}/12)`} />
              </Tabs>

              {homeTab === 0 && (
                <OrderedList
                  items={homeFeaturedDesktop}
                  maxItems={20}
                  allCategories={allCategories}
                  pickerLoading={pickerLoading}
                  onAdd={(name) => setHomeFeaturedDesktop((p) => [...p, name])}
                  onRemove={(i) => setHomeFeaturedDesktop((p) => p.filter((_, idx) => idx !== i))}
                  onMove={(from, to) => setHomeFeaturedDesktop((p) => moveItem(p, from, to))}
                />
              )}

              {homeTab === 1 && (
                <OrderedList
                  items={homeFeaturedMobile}
                  maxItems={12}
                  allCategories={allCategories}
                  pickerLoading={pickerLoading}
                  onAdd={(name) => setHomeFeaturedMobile((p) => [...p, name])}
                  onRemove={(i) => setHomeFeaturedMobile((p) => p.filter((_, idx) => idx !== i))}
                  onMove={(from, to) => setHomeFeaturedMobile((p) => moveItem(p, from, to))}
                />
              )}
            </Box>
          )}

          {/* ── Tab 1: Popular Categories ──────────────────────────────── */}
          {tab === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Categories shown in the Popular section / drawer.
              </Typography>
              <OrderedList
                items={popularCategories}
                allCategories={allCategories}
                pickerLoading={pickerLoading}
                onAdd={(name) => setPopularCategories((p) => [...p, name])}
                onRemove={(i) => setPopularCategories((p) => p.filter((_, idx) => idx !== i))}
                onMove={(from, to) => setPopularCategories((p) => moveItem(p, from, to))}
              />
            </Box>
          )}

          {/* ── Tab 2: Service Cards ───────────────────────────────────── */}
          {tab === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sections shown as service card grids. Each section has separate desktop and mobile item lists.
              </Typography>

              {serviceCardSections.map((sec, secIdx) => (
                <Card key={secIdx} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                  <CardHeader
                    title={
                      <TextField
                        size="small"
                        label="Section name"
                        value={sec.section}
                        onChange={(e) => updateSection(secIdx, "section", e.target.value)}
                        sx={{ minWidth: 260 }}
                      />
                    }
                    action={
                      <IconButton color="error" onClick={() => removeSection(secIdx)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    }
                    sx={{ pb: 0 }}
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Desktop items ({sec.desktopItems?.length || 0})
                        </Typography>
                        <OrderedList
                          items={sec.desktopItems || []}
                          allCategories={allCategories}
                          pickerLoading={pickerLoading}
                          onAdd={(name) =>
                            updateSection(secIdx, "desktopItems", [...(sec.desktopItems || []), name])
                          }
                          onRemove={(i) =>
                            updateSection(
                              secIdx,
                              "desktopItems",
                              (sec.desktopItems || []).filter((_, idx) => idx !== i)
                            )
                          }
                          onMove={(from, to) =>
                            updateSection(secIdx, "desktopItems", moveItem(sec.desktopItems || [], from, to))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Mobile items ({sec.mobileItems?.length || 0})
                        </Typography>
                        <OrderedList
                          items={sec.mobileItems || []}
                          allCategories={allCategories}
                          pickerLoading={pickerLoading}
                          onAdd={(name) =>
                            updateSection(secIdx, "mobileItems", [...(sec.mobileItems || []), name])
                          }
                          onRemove={(i) =>
                            updateSection(
                              secIdx,
                              "mobileItems",
                              (sec.mobileItems || []).filter((_, idx) => idx !== i)
                            )
                          }
                          onMove={(from, to) =>
                            updateSection(secIdx, "mobileItems", moveItem(sec.mobileItems || [], from, to))
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSection}
                sx={{ mt: 1 }}
              >
                Add Section
              </Button>
            </Box>
          )}

          {/* ── Tab 3: Sub-Categories ──────────────────────────────────── */}
          {tab === 3 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define which sub-categories appear under each parent slug. Used by the /api/v2/category/sub/:parentSlug endpoint.
              </Typography>

              {subCategoryMapping.map((entry, idx) => (
                <Accordion key={idx} defaultExpanded={idx === 0} sx={{ mb: 1, borderRadius: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      <TextField
                        size="small"
                        label="Parent slug"
                        placeholder="e.g. contractors"
                        value={entry.parentSlug}
                        onChange={(e) => updateMapping(idx, "parentSlug", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ minWidth: 220 }}
                      />
                      <Chip
                        label={`${entry.subCategoryNames?.length || 0} items`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <IconButton
                        color="error"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); removeMapping(idx); }}
                        sx={{ ml: "auto" }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <OrderedList
                      items={entry.subCategoryNames || []}
                      freeText
                      onAdd={(name) =>
                        updateMapping(idx, "subCategoryNames", [...(entry.subCategoryNames || []), name])
                      }
                      onRemove={(i) =>
                        updateMapping(
                          idx,
                          "subCategoryNames",
                          (entry.subCategoryNames || []).filter((_, j) => j !== i)
                        )
                      }
                      onMove={(from, to) =>
                        updateMapping(idx, "subCategoryNames", moveItem(entry.subCategoryNames || [], from, to))
                      }
                    />
                  </AccordionDetails>
                </Accordion>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addMapping}
                sx={{ mt: 2 }}
              >
                Add Parent Slug
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
