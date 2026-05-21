import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategoryDisplaySettings,
  updateCategoryDisplaySettings,
  fetchAllCategoriesForPicker,
} from "../../redux/actions/categoryDisplaySettingsAction.js";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
  IconButton,
  InputAdornment,
  LinearProgress,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Collapse,
  Avatar,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// ── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#F6F5F2",
  surface: "#FFFFFF",
  surface2: "#FBFAF7",
  ink: "#14110F",
  ink2: "#4A4641",
  ink3: "#8A857E",
  ink4: "#BAB5AD",
  line: "#ECE8E0",
  line2: "#E2DDD3",
  accent: "#E1580F",
  accentDeep: "#B8430B",
  accentTint: "#FFF1E7",
  green: "#1F7A4D",
  greenTint: "#E6F2EC",
  amber: "#B7791F",
  amberTint: "#FCF3DD",
  red: "#B9261E",
  redTint: "#FBE9E7",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function moveItem(arr, from, to) {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

// ── Picker (Autocomplete styled) ─────────────────────────────────────────────
function Picker({ items, allCategories, onAdd, pickerLoading, freeText, placeholder }) {
  const [val, setVal] = useState("");

  const submit = (name) => {
    const n = (name ?? val).trim();
    if (!n || items.includes(n)) return;
    onAdd(n);
    setVal("");
  };

  if (freeText) {
    return (
      <TextField
        size="small"
        fullWidth
        value={val}
        placeholder={placeholder || "Type a name and press Enter…"}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: T.ink3 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Button
                size="small"
                disabled={!val.trim()}
                onClick={() => submit()}
                sx={{ color: T.accent, fontWeight: 600, textTransform: "none", minWidth: 0 }}
              >
                Add
              </Button>
            </InputAdornment>
          ),
          sx: {
            bgcolor: T.surface,
            fontSize: 13,
            "& fieldset": { borderColor: T.line2 },
            "&:hover fieldset": { borderColor: T.line2 },
            "&.Mui-focused fieldset": { borderColor: T.accent + " !important", borderWidth: "1px !important" },
          },
        }}
        sx={{ mt: 1 }}
      />
    );
  }

  return (
    <Autocomplete
      size="small"
      sx={{ mt: 1 }}
      options={allCategories.filter((c) => !items.includes(c.name))}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
      isOptionEqualToValue={(o, v) => o.name === v.name}
      loading={pickerLoading}
      value={null}
      inputValue={val}
      onInputChange={(_, v, reason) => {
        if (reason === "reset") return;
        setVal(v);
      }}
      onChange={(_, v) => {
        if (v && typeof v === "object") submit(v.name);
      }}
      blurOnSelect
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: 13 }}>
          <span>{option.name}</span>
          <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.ink3 }}>{option.slug || ""}</Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder || "Search categories to add…"}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: T.ink3 }} />
              </InputAdornment>
            ),
            sx: {
              bgcolor: T.surface,
              fontSize: 13,
              "& fieldset": { borderColor: T.line2 },
              "&:hover fieldset": { borderColor: T.line2 },
              "&.Mui-focused fieldset": { borderColor: T.accent + " !important", borderWidth: "1px !important" },
            },
          }}
        />
      )}
    />
  );
}

// ── Ordered list ─────────────────────────────────────────────────────────────
function OrderedList({ items, onAdd, onRemove, onMove, allCategories, pickerLoading, maxItems, freeText, placeholder }) {
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);
  const canAdd = !maxItems || items.length < maxItems;
  const pct = maxItems ? Math.min(100, (items.length / maxItems) * 100) : 0;
  const meterColor = pct >= 100 ? T.red : pct >= 80 ? T.amber : T.accent;

  return (
    <Box>
      {maxItems && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>
            {items.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 4,
              bgcolor: T.line,
              "& .MuiLinearProgress-bar": { bgcolor: meterColor, transition: "width .2s" },
            }}
          />
          <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>of {maxItems} slots</Typography>
        </Stack>
      )}

      {items.length === 0 ? (
        <Box
          sx={{
            p: 2.5,
            textAlign: "center",
            border: `1px dashed ${T.line2}`,
            borderRadius: 1.5,
            bgcolor: T.surface2,
          }}
        >
          <Typography sx={{ color: T.ink2, fontWeight: 500, fontSize: 13 }}>No items yet</Typography>
          <Typography sx={{ color: T.ink3, fontSize: 12.5 }}>Use the picker below to add your first item.</Typography>
        </Box>
      ) : (
        <Stack spacing={0.5}>
          {items.map((item, i) => {
            const cat = allCategories?.find((c) => c.name === item);
            const isOver = overIdx === i;
            return (
              <Box
                key={item + i}
                draggable
                onDragStart={(e) => {
                  dragIdx.current = i;
                  e.currentTarget.style.opacity = "0.4";
                }}
                onDragEnd={(e) => {
                  e.currentTarget.style.opacity = "1";
                  setOverIdx(null);
                  dragIdx.current = null;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIdx(i);
                }}
                onDragLeave={() => setOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIdx.current;
                  if (from !== null && from !== i) onMove(from, i);
                  setOverIdx(null);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pl: 0.75,
                  pr: 1,
                  py: 0.75,
                  bgcolor: isOver ? T.accentTint : T.surface,
                  border: `1px solid ${isOver ? T.accent : T.line}`,
                  borderRadius: 1.25,
                  transition: "border-color .12s, background .12s",
                  "&:hover": { borderColor: T.line2, bgcolor: T.surface2, "& .row-actions": { opacity: 1 } },
                  "& .row-actions": { opacity: 0, transition: "opacity .12s" },
                }}
              >
                <DragIndicatorIcon sx={{ fontSize: 16, color: T.ink4, cursor: "grab" }} />
                <Typography
                  sx={{
                    fontFamily: T.mono,
                    fontSize: 11,
                    color: T.ink3,
                    minWidth: 22,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{ flex: 1, fontSize: 13, color: T.ink }}>{item}</Typography>
                {cat?.slug && (
                  <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.ink3 }}>/{cat.slug}</Typography>
                )}
                <Box className="row-actions" sx={{ display: "flex", gap: 0.25 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" disabled={i === 0} onClick={() => onMove(i, i - 1)} sx={{ width: 26, height: 26 }}>
                        <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        disabled={i === items.length - 1}
                        onClick={() => onMove(i, i + 1)}
                        sx={{ width: 26, height: 26 }}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => onRemove(i)}
                      sx={{ width: 26, height: 26, color: T.ink3, "&:hover": { color: T.red, bgcolor: T.redTint } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {canAdd && (
        <Picker
          items={items}
          allCategories={allCategories || []}
          onAdd={onAdd}
          pickerLoading={pickerLoading}
          freeText={freeText}
          placeholder={placeholder}
        />
      )}

      {!canAdd && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1, color: T.amber }}>
          <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          <Typography sx={{ fontSize: 12, color: T.amber }}>
            Maximum {maxItems} items reached — remove one to add another.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

// ── Section card (service cards) ─────────────────────────────────────────────
function SectionCard({ section, allCategories, pickerLoading, onUpdate, onRemove }) {
  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: T.line, borderRadius: 2, boxShadow: "0 1px 0 rgba(20,17,15,0.04)" }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          bgcolor: T.surface2,
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <TextField
          size="small"
          variant="outlined"
          value={section.section}
          onChange={(e) => onUpdate("section", e.target.value)}
          placeholder="Section name…"
          sx={{
            maxWidth: 360,
            "& .MuiOutlinedInput-root": {
              fontWeight: 600,
              fontSize: 14,
              bgcolor: "transparent",
              "& fieldset": { borderColor: "transparent" },
              "&:hover": { bgcolor: T.surface, "& fieldset": { borderColor: T.line } },
              "&.Mui-focused": { bgcolor: T.surface, "& fieldset": { borderColor: T.accent + " !important" } },
            },
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
          <Chip
            icon={<DesktopWindowsOutlinedIcon sx={{ fontSize: 14, color: T.ink2 + " !important" }} />}
            label={`Desktop ${section.desktopItems?.length || 0}`}
            size="small"
            variant="outlined"
            sx={{ borderColor: T.line, color: T.ink2, fontSize: 11, height: 24 }}
          />
          <Chip
            icon={<PhoneIphoneOutlinedIcon sx={{ fontSize: 14, color: T.ink2 + " !important" }} />}
            label={`Mobile ${section.mobileItems?.length || 0}`}
            size="small"
            variant="outlined"
            sx={{ borderColor: T.line, color: T.ink2, fontSize: 11, height: 24 }}
          />
          <Tooltip title="Remove section">
            <IconButton size="small" onClick={onRemove} sx={{ color: T.ink3, "&:hover": { color: T.red, bgcolor: T.redTint } }}>
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box sx={{ p: 2.25, borderRight: { md: `1px solid ${T.line}` }, borderBottom: { xs: `1px solid ${T.line}`, md: "none" } }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                bgcolor: T.surface2,
                border: `1px solid ${T.line}`,
                display: "grid",
                placeItems: "center",
                color: T.ink2,
              }}
            >
              <DesktopWindowsOutlinedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Desktop</Typography>
            <Typography sx={{ ml: "auto", fontSize: 12, color: T.ink3 }}>
              {section.desktopItems?.length || 0} items
            </Typography>
          </Stack>
          <OrderedList
            items={section.desktopItems || []}
            allCategories={allCategories}
            pickerLoading={pickerLoading}
            onAdd={(n) => onUpdate("desktopItems", [...(section.desktopItems || []), n])}
            onRemove={(i) => onUpdate("desktopItems", (section.desktopItems || []).filter((_, j) => j !== i))}
            onMove={(f, t) => onUpdate("desktopItems", moveItem(section.desktopItems || [], f, t))}
          />
        </Box>
        <Box sx={{ p: 2.25 }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                bgcolor: T.surface2,
                border: `1px solid ${T.line}`,
                display: "grid",
                placeItems: "center",
                color: T.ink2,
              }}
            >
              <PhoneIphoneOutlinedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Mobile</Typography>
            <Typography sx={{ ml: "auto", fontSize: 12, color: T.ink3 }}>
              {section.mobileItems?.length || 0} items
            </Typography>
          </Stack>
          <OrderedList
            items={section.mobileItems || []}
            allCategories={allCategories}
            pickerLoading={pickerLoading}
            onAdd={(n) => onUpdate("mobileItems", [...(section.mobileItems || []), n])}
            onRemove={(i) => onUpdate("mobileItems", (section.mobileItems || []).filter((_, j) => j !== i))}
            onMove={(f, t) => onUpdate("mobileItems", moveItem(section.mobileItems || [], f, t))}
          />
        </Box>
      </Box>
    </Card>
  );
}

// ── Sub-category mapping accordion ───────────────────────────────────────────
function MappingAccordion({ entry, defaultOpen, allCategories, pickerLoading, onUpdate, onRemove }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card
      variant="outlined"
      sx={{ mb: 1.25, borderColor: T.line, borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 0 rgba(20,17,15,0.04)" }}
    >
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          px: 1.75,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          cursor: "pointer",
          "&:hover": { bgcolor: T.surface2 },
        }}
      >
        <ChevronRightIcon
          sx={{ fontSize: 18, color: T.ink3, transition: "transform .18s", transform: open ? "rotate(90deg)" : "none" }}
        />
        <Typography sx={{ fontFamily: T.mono, fontSize: 12, color: T.ink4, mr: -0.5 }}>/sub/</Typography>
        <TextField
          size="small"
          value={entry.parentSlug}
          placeholder="parent-slug"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate("parentSlug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          sx={{
            minWidth: 220,
            "& .MuiOutlinedInput-root": {
              fontFamily: T.mono,
              fontSize: 12.5,
              "& fieldset": { borderColor: T.line },
              "&.Mui-focused fieldset": { borderColor: T.accent + " !important" },
            },
          }}
        />
        <Chip
          label={`${entry.subCategoryNames?.length || 0} sub-categories`}
          size="small"
          variant="outlined"
          sx={{ borderColor: T.line, color: T.ink2, fontSize: 11, height: 24 }}
        />
        <Tooltip title="Remove mapping">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            sx={{ ml: "auto", color: T.ink3, "&:hover": { color: T.red, bgcolor: T.redTint } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2.25, py: 2, borderTop: `1px solid ${T.line}`, bgcolor: T.surface2 }}>
          <OrderedList
            items={entry.subCategoryNames || []}
            freeText
            allCategories={allCategories}
            pickerLoading={pickerLoading}
            placeholder="Type a sub-category name and press Enter…"
            onAdd={(n) => onUpdate("subCategoryNames", [...(entry.subCategoryNames || []), n])}
            onRemove={(i) => onUpdate("subCategoryNames", (entry.subCategoryNames || []).filter((_, j) => j !== i))}
            onMove={(f, t) => onUpdate("subCategoryNames", moveItem(entry.subCategoryNames || [], f, t))}
          />
        </Box>
      </Collapse>
    </Card>
  );
}

// ── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ active, icon, label, count, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: 1.25,
        cursor: "pointer",
        color: active ? "#FFFFFF" : "#BAB5AD",
        bgcolor: active ? "rgba(225,88,15,0.13)" : "transparent",
        fontSize: 13.5,
        fontWeight: 500,
        userSelect: "none",
        transition: "background .12s, color .12s",
        "&:hover": { bgcolor: active ? "rgba(225,88,15,0.18)" : "rgba(255,255,255,0.04)", color: "#F2EFE8" },
      }}
    >
      <Box sx={{ display: "grid", placeItems: "center", opacity: 0.85 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>{label}</Box>
      {count !== undefined && (
        <Box
          sx={{
            fontSize: 11,
            color: active ? "#F2EFE8" : "#8A857E",
            fontVariantNumeric: "tabular-nums",
            bgcolor: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
            px: 0.875,
            py: "1px",
            borderRadius: 5,
          }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CategoryDisplaySettings() {
  const dispatch = useDispatch();
  const { settings, allCategories, loading, saving, saveError, pickerLoading } = useSelector(
    (state) => state.categoryDisplaySettings
  );

  const [tab, setTab] = useState("home");
  const [homeView, setHomeView] = useState("desktop");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [homeFeaturedDesktop, setHomeFeaturedDesktop] = useState([]);
  const [homeFeaturedMobile, setHomeFeaturedMobile] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [serviceCardSections, setServiceCardSections] = useState([]);
  const [subCategoryMapping, setSubCategoryMapping] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    dispatch(fetchCategoryDisplaySettings());
    dispatch(fetchAllCategoriesForPicker());
  }, [dispatch]);

  useEffect(() => {
    if (!settings) return;
    const next = {
      homeFeaturedDesktop: settings.homeFeaturedDesktop || [],
      homeFeaturedMobile: settings.homeFeaturedMobile || [],
      popularCategories: settings.popularCategories || [],
      serviceCardSections:
        settings.serviceCardSections?.length > 0
          ? settings.serviceCardSections
          : [
              { section: "Repair and Services", desktopItems: [], mobileItems: [] },
              { section: "Services", desktopItems: [], mobileItems: [] },
              { section: "Hot Categories", desktopItems: [], mobileItems: [] },
              { section: "Building Materials", desktopItems: [], mobileItems: [] },
            ],
      subCategoryMapping: settings.subCategoryMapping || [],
    };
    setHomeFeaturedDesktop(next.homeFeaturedDesktop);
    setHomeFeaturedMobile(next.homeFeaturedMobile);
    setPopularCategories(next.popularCategories);
    setServiceCardSections(next.serviceCardSections);
    setSubCategoryMapping(next.subCategoryMapping);
    setSnapshot(JSON.stringify(next));
  }, [settings]);

  const current = useMemo(
    () => ({
      homeFeaturedDesktop,
      homeFeaturedMobile,
      popularCategories,
      serviceCardSections,
      subCategoryMapping,
    }),
    [homeFeaturedDesktop, homeFeaturedMobile, popularCategories, serviceCardSections, subCategoryMapping]
  );

  const dirty = snapshot !== null && JSON.stringify(current) !== snapshot;

  const handleSave = async () => {
    try {
      await dispatch(updateCategoryDisplaySettings(current));
      setSnapshot(JSON.stringify(current));
      setSnackbar({ open: true, message: "Settings saved · v2 cache cleared", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Save failed", severity: "error" });
    }
  };

  const handleReset = () => {
    if (!snapshot) return;
    const s = JSON.parse(snapshot);
    setHomeFeaturedDesktop(s.homeFeaturedDesktop);
    setHomeFeaturedMobile(s.homeFeaturedMobile);
    setPopularCategories(s.popularCategories);
    setServiceCardSections(s.serviceCardSections);
    setSubCategoryMapping(s.subCategoryMapping);
  };

  // Keyboard save shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [dirty, saving, current]);

  // Section helpers
  const updateSection = useCallback((index, field, value) => {
    setServiceCardSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);
  const addSection = () =>
    setServiceCardSections((p) => [...p, { section: "New Section", desktopItems: [], mobileItems: [] }]);
  const removeSection = (i) => setServiceCardSections((p) => p.filter((_, j) => j !== i));

  // Mapping helpers
  const updateMapping = useCallback((index, field, value) => {
    setSubCategoryMapping((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);
  const addMapping = () => setSubCategoryMapping((p) => [...p, { parentSlug: "", subCategoryNames: [] }]);
  const removeMapping = (i) => setSubCategoryMapping((p) => p.filter((_, j) => j !== i));

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const navItems = [
    {
      id: "home",
      label: "Home featured",
      icon: <HomeOutlinedIcon sx={{ fontSize: 18 }} />,
      count: `${homeFeaturedDesktop.length}+${homeFeaturedMobile.length}`,
    },
    { id: "popular", label: "Popular", icon: <StarBorderRoundedIcon sx={{ fontSize: 18 }} />, count: popularCategories.length },
    { id: "service", label: "Service cards", icon: <GridViewOutlinedIcon sx={{ fontSize: 18 }} />, count: serviceCardSections.length },
    { id: "sub", label: "Sub-categories", icon: <FolderOutlinedIcon sx={{ fontSize: 18 }} />, count: subCategoryMapping.length },
  ];
  const activeNav = navItems.find((n) => n.id === tab);

  const pageDesc = {
    home: (
      <>
        Configures what shows in the home-page hero carousel. Saving here clears the{" "}
        <Box component="code" sx={{ fontFamily: T.mono, fontSize: 12, px: 0.5, bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: 0.5 }}>
          /api/v2/home/featured
        </Box>{" "}
        cache.
      </>
    ),
    popular: (
      <>
        The list backing the "Popular" drawer and quick links across the app. Saving clears the{" "}
        <Box component="code" sx={{ fontFamily: T.mono, fontSize: 12, px: 0.5, bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: 0.5 }}>
          /api/v2/categories/popular
        </Box>{" "}
        cache.
      </>
    ),
    service: <>Titled service-card grids on the home page. Edit, reorder, or add new sections. Each has independent desktop and mobile lists.</>,
    sub: (
      <>
        Sub-categories for the{" "}
        <Box component="code" sx={{ fontFamily: T.mono, fontSize: 12, px: 0.5, bgcolor: T.surface, border: `1px solid ${T.line}`, borderRadius: 0.5 }}>
          /api/v2/category/sub/:parentSlug
        </Box>{" "}
        endpoint. Free-form names; no master-list constraint.
      </>
    ),
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, minHeight: "100vh", bgcolor: T.bg }}>
      {/* Sidebar */}
      <Box
        sx={{
          bgcolor: "#14110F",
          color: "#E8E4DC",
          p: 2.25,
          position: { md: "sticky" },
          top: 0,
          height: { md: "100vh" },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 3.5, px: 0.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: T.accent,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.18)",
            }}
          >
            M
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Mass Click</Typography>
            <Typography sx={{ fontSize: 11, color: "#8A857E" }}>Admin · Display settings</Typography>
          </Box>
        </Stack>

        <Typography
          sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.09em", color: "#6E6962", px: 1, mb: 0.75, fontWeight: 600 }}
        >
          Categories
        </Typography>
        <Stack spacing={0.25}>
          {navItems.map((n) => (
            <NavItem
              key={n.id}
              active={tab === n.id}
              icon={n.icon}
              label={n.label}
              count={n.count}
              onClick={() => setTab(n.id)}
            />
          ))}
        </Stack>

        <Box sx={{ mt: "auto", pt: 1.5, borderTop: "1px solid #2A2522", display: "flex", alignItems: "center", gap: 1.25 }}>
          <Avatar sx={{ width: 28, height: 28, bgcolor: T.accent, fontSize: 11, fontWeight: 600 }}>A</Avatar>
          <Box sx={{ fontSize: 12, color: "#8A857E" }}>
            <Box sx={{ color: "#E8E4DC", fontWeight: 500 }}>Admin</Box>
            <Box>Signed in</Box>
          </Box>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Topbar */}
        <Box
          sx={{
            bgcolor: T.surface,
            borderBottom: `1px solid ${T.line}`,
            px: { xs: 2, md: 4 },
            py: 1.75,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ fontSize: 13, color: T.ink3 }}>
            <Box>Admin</Box>
            <Box sx={{ color: T.ink4 }}>/</Box>
            <Box>Category Display</Box>
            <Box sx={{ color: T.ink4 }}>/</Box>
            <Box sx={{ color: T.ink, fontWeight: 600 }}>{activeNav.label}</Box>
          </Stack>

          <Chip
            size="small"
            label={dirty ? "Unsaved changes" : "All changes saved"}
            sx={{
              ml: 1,
              fontSize: 11,
              fontWeight: 500,
              bgcolor: dirty ? T.amberTint : T.greenTint,
              color: dirty ? T.amber : T.green,
              height: 22,
              "& .MuiChip-label": { px: 1.25 },
            }}
          />

          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="text"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!dirty}
              sx={{ color: T.ink2, textTransform: "none", "&:hover": { bgcolor: T.surface2 } }}
            >
              Reset
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={!dirty || saving}
              sx={{
                bgcolor: T.accent,
                textTransform: "none",
                fontWeight: 500,
                boxShadow: "0 1px 0 rgba(0,0,0,0.04), inset 0 -1px 0 rgba(0,0,0,0.12)",
                "&:hover": { bgcolor: T.accentDeep },
              }}
            >
              {saving ? "Saving…" : "Save all"}
            </Button>
          </Box>
        </Box>

        {/* Page */}
        <Box sx={{ p: { xs: 2, md: 4 }, pb: 10, maxWidth: 1100, width: "100%", mx: "auto" }}>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, mb: 0.5 }}>
              {activeNav.label}
            </Typography>
            <Typography sx={{ color: T.ink3, fontSize: 13.5, maxWidth: 640 }}>{pageDesc[tab]}</Typography>
          </Box>

          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}

          {/* Home featured */}
          {tab === "home" && (
            <Paper variant="outlined" sx={{ borderColor: T.line, borderRadius: 2, boxShadow: "0 1px 0 rgba(20,17,15,0.04)" }}>
              <Box sx={{ px: 2.25, py: 1.75, borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Home featured carousel</Typography>
                  <Typography sx={{ fontSize: 12, color: T.ink3 }}>
                    Top categories shown in the hero section on the home page.
                  </Typography>
                </Box>
                <Box sx={{ ml: "auto" }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      bgcolor: T.surface2,
                      border: `1px solid ${T.line}`,
                      borderRadius: 1.25,
                      p: 0.375,
                      gap: 0.25,
                    }}
                  >
                    {[
                      { id: "desktop", label: "Desktop", icon: <DesktopWindowsOutlinedIcon sx={{ fontSize: 14 }} />, count: `${homeFeaturedDesktop.length}/20` },
                      { id: "mobile", label: "Mobile", icon: <PhoneIphoneOutlinedIcon sx={{ fontSize: 14 }} />, count: `${homeFeaturedMobile.length}/12` },
                    ].map((v) => {
                      const active = homeView === v.id;
                      return (
                        <Box
                          key={v.id}
                          onClick={() => setHomeView(v.id)}
                          sx={{
                            px: 1.5,
                            py: 0.625,
                            fontSize: 12.5,
                            fontWeight: 500,
                            color: active ? T.ink : T.ink3,
                            bgcolor: active ? T.surface : "transparent",
                            borderRadius: 0.75,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            boxShadow: active ? "0 1px 0 rgba(20,17,15,0.04), 0 1px 2px rgba(20,17,15,0.04)" : "none",
                          }}
                        >
                          {v.icon}
                          {v.label}
                          <Box
                            sx={{
                              fontSize: 11,
                              fontVariantNumeric: "tabular-nums",
                              px: 0.75,
                              borderRadius: 5,
                              bgcolor: active ? T.accentTint : T.line,
                              color: active ? T.accentDeep : T.ink3,
                            }}
                          >
                            {v.count}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ p: 2.25 }}>
                {homeView === "desktop" ? (
                  <OrderedList
                    items={homeFeaturedDesktop}
                    maxItems={20}
                    allCategories={allCategories}
                    pickerLoading={pickerLoading}
                    onAdd={(n) => setHomeFeaturedDesktop((p) => [...p, n])}
                    onRemove={(i) => setHomeFeaturedDesktop((p) => p.filter((_, j) => j !== i))}
                    onMove={(f, t) => setHomeFeaturedDesktop((p) => moveItem(p, f, t))}
                  />
                ) : (
                  <OrderedList
                    items={homeFeaturedMobile}
                    maxItems={12}
                    allCategories={allCategories}
                    pickerLoading={pickerLoading}
                    onAdd={(n) => setHomeFeaturedMobile((p) => [...p, n])}
                    onRemove={(i) => setHomeFeaturedMobile((p) => p.filter((_, j) => j !== i))}
                    onMove={(f, t) => setHomeFeaturedMobile((p) => moveItem(p, f, t))}
                  />
                )}
              </Box>
            </Paper>
          )}

          {/* Popular */}
          {tab === "popular" && (
            <Paper variant="outlined" sx={{ borderColor: T.line, borderRadius: 2, boxShadow: "0 1px 0 rgba(20,17,15,0.04)" }}>
              <Box sx={{ px: 2.25, py: 1.75, borderBottom: `1px solid ${T.line}` }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Popular categories</Typography>
                <Typography sx={{ fontSize: 12, color: T.ink3 }}>
                  Shown in the "Popular" drawer and as quick links across the app.
                </Typography>
              </Box>
              <Box sx={{ p: 2.25 }}>
                <OrderedList
                  items={popularCategories}
                  allCategories={allCategories}
                  pickerLoading={pickerLoading}
                  onAdd={(n) => setPopularCategories((p) => [...p, n])}
                  onRemove={(i) => setPopularCategories((p) => p.filter((_, j) => j !== i))}
                  onMove={(f, t) => setPopularCategories((p) => moveItem(p, f, t))}
                />
              </Box>
            </Paper>
          )}

          {/* Service Cards */}
          {tab === "service" && (
            <Box>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  p: 1.5,
                  bgcolor: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: 1.25,
                  mb: 2.25,
                  fontSize: 12.5,
                  color: T.ink2,
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 0.75,
                    bgcolor: T.accentTint,
                    color: T.accentDeep,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                </Box>
                <Box>
                  <Box component="b" sx={{ color: T.ink }}>
                    Service cards
                  </Box>{" "}
                  appear as titled grid sections on the home page. Each section has separate lists for desktop and mobile, so
                  you can show a tighter selection on small screens.
                </Box>
              </Stack>

              {serviceCardSections.map((sec, i) => (
                <SectionCard
                  key={i}
                  section={sec}
                  allCategories={allCategories}
                  pickerLoading={pickerLoading}
                  onUpdate={(field, val) => updateSection(i, field, val)}
                  onRemove={() => removeSection(i)}
                />
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSection}
                sx={{
                  textTransform: "none",
                  borderColor: T.line2,
                  color: T.ink2,
                  "&:hover": { bgcolor: T.surface2, borderColor: T.line2 },
                }}
              >
                Add section
              </Button>
            </Box>
          )}

          {/* Sub-categories */}
          {tab === "sub" && (
            <Box>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  p: 1.5,
                  bgcolor: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: 1.25,
                  mb: 2.25,
                  fontSize: 12.5,
                  color: T.ink2,
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 0.75,
                    bgcolor: T.accentTint,
                    color: T.accentDeep,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                </Box>
                <Box>
                  Maps a <Box component="b" sx={{ color: T.ink }}>parent slug</Box> to the list of sub-categories shown
                  beneath it. Used by{" "}
                  <Box component="code" sx={{ fontFamily: T.mono, fontSize: 11.5, px: 0.5, bgcolor: T.surface2, border: `1px solid ${T.line}`, borderRadius: 0.5 }}>
                    /api/v2/category/sub/:parentSlug
                  </Box>
                  . Names are free-form — they don't have to match a category in the master list.
                </Box>
              </Stack>

              {subCategoryMapping.map((entry, i) => (
                <MappingAccordion
                  key={i}
                  entry={entry}
                  defaultOpen={i === 0}
                  allCategories={allCategories}
                  pickerLoading={pickerLoading}
                  onUpdate={(field, val) => updateMapping(i, field, val)}
                  onRemove={() => removeMapping(i)}
                />
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addMapping}
                sx={{
                  textTransform: "none",
                  borderColor: T.line2,
                  color: T.ink2,
                  "&:hover": { bgcolor: T.surface2, borderColor: T.line2 },
                }}
              >
                Add parent slug
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          icon={snackbar.severity === "success" ? <CheckCircleIcon /> : undefined}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{
            bgcolor: snackbar.severity === "success" ? T.ink : undefined,
            color: snackbar.severity === "success" ? "#fff" : undefined,
            "& .MuiAlert-icon": snackbar.severity === "success" ? { color: T.green } : undefined,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
