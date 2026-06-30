import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../services/axiosInstance.js";
import styles from "./CategoryDisplaySettings.module.css";
import { fetchCategoryDisplaySettings, updateCategoryDisplaySettings, fetchAllCategoriesForPicker } from "../../redux/actions/categoryDisplaySettingsAction.js";
import { Box, Stack, Typography, Button, CircularProgress, Autocomplete, TextField, IconButton, InputAdornment, LinearProgress, Tooltip, Chip, Alert, Snackbar, Card, Collapse } from "@mui/material";
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
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";

// ── Tokens ───────────────────────────────────────────────────────────────────
const cx = createScopedClassNames(styles);
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
  purple: "#7E59C7",
  purpleTint: "#F1ECFB",
  blue: "#1E6FBA",
  blueTint: "#E8F1FA",
  mono: "'JetBrains Mono', ui-monospace, monospace"
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function moveItem(arr, from, to) {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

// ── Picker ───────────────────────────────────────────────────────────────────
function Picker({
  items,
  allCategories,
  onAdd,
  pickerLoading,
  freeText,
  useCategories,
  placeholder
}) {
  const [val, setVal] = useState("");
  const submit = name => {
    const n = (name ?? val).trim();
    if (!n || items.includes(n)) return;
    onAdd(n);
    setVal("");
  };
  if (freeText && !useCategories) {
    return <TextField size="small" fullWidth value={val} placeholder={placeholder || "Type a name and press Enter…"} onChange={e => setVal(e.target.value)} onKeyDown={e => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    }} InputProps={{
      startAdornment: <InputAdornment position="start">
              <SearchIcon sx={{
          fontSize: 16,
          color: T.ink3
        }} />
            </InputAdornment>,
      endAdornment: <InputAdornment position="end">
              <Button size="small" disabled={!val.trim()} onClick={() => submit()} sx={{
          color: T.accent,
          fontWeight: 600,
          textTransform: "none",
          minWidth: 0
        }}>
                Add
              </Button>
            </InputAdornment>,
      sx: {
        bgcolor: T.surface,
        fontSize: 13,
        "& fieldset": {
          borderColor: T.line2
        },
        "&:hover fieldset": {
          borderColor: T.line2
        },
        "&.Mui-focused fieldset": {
          borderColor: T.accent + " !important",
          borderWidth: "1px !important"
        }
      }
    }} sx={{
      mt: 1
    }} />;
  }
  return <Autocomplete size="small" sx={{
    mt: 1
  }} options={(allCategories || []).filter(c => !items.includes(c.name))} getOptionLabel={o => typeof o === "string" ? o : o.name} isOptionEqualToValue={(o, v) => o.name === v.name} loading={pickerLoading} value={null} inputValue={val} onInputChange={(_, v, reason) => {
    if (reason === "reset") return;
    setVal(v);
  }} onChange={(_, v) => {
    if (v && typeof v === "object") submit(v.name);
  }} blurOnSelect renderOption={(props, option) => <Box component="li" {...props} sx={{
    display: "flex",
    justifyContent: "space-between",
    gap: 1,
    fontSize: 13
  }}>
          <span>{option.name}</span>
          <Typography sx={{
      fontFamily: T.mono,
      fontSize: 11,
      color: T.ink3
    }}>{option.slug || ""}</Typography>
        </Box>} renderInput={params => <TextField {...params} placeholder={placeholder || "Search categories to add…"} InputProps={{
    ...params.InputProps,
    startAdornment: <InputAdornment position="start">
                <SearchIcon sx={{
        fontSize: 16,
        color: T.ink3
      }} />
              </InputAdornment>,
    sx: {
      bgcolor: T.surface,
      fontSize: 13,
      "& fieldset": {
        borderColor: T.line2
      },
      "&:hover fieldset": {
        borderColor: T.line2
      },
      "&.Mui-focused fieldset": {
        borderColor: T.accent + " !important",
        borderWidth: "1px !important"
      }
    }
  }} />} />;
}

// ── Ordered list ─────────────────────────────────────────────────────────────
function OrderedList({
  items,
  onAdd,
  onRemove,
  onMove,
  allCategories,
  pickerLoading,
  maxItems,
  freeText,
  useCategories,
  placeholder
}) {
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);
  const canAdd = !maxItems || items.length < maxItems;
  const pct = maxItems ? Math.min(100, items.length / maxItems * 100) : 0;
  const meterColor = pct >= 100 ? T.red : pct >= 80 ? T.amber : T.accent;
  return <Box>
      {maxItems && <Stack direction="row" alignItems="center" spacing={1} sx={{
      mb: 1.25
    }}>
          <Typography sx={{
        fontSize: 11.5,
        fontWeight: 600,
        color: T.ink,
        fontVariantNumeric: "tabular-nums"
      }}>
            {items.length}
          </Typography>
          <LinearProgress variant="determinate" value={pct} sx={{
        flex: 1,
        height: 4,
        borderRadius: 4,
        bgcolor: T.line,
        "& .MuiLinearProgress-bar": {
          bgcolor: meterColor,
          transition: "width .2s"
        }
      }} />
          <Typography sx={{
        fontSize: 11.5,
        color: T.ink3
      }}>of {maxItems} slots</Typography>
        </Stack>}

      {items.length === 0 ? <Box sx={{
      p: 2.5,
      textAlign: "center",
      border: `1px dashed ${T.line2}`,
      borderRadius: 1.5,
      bgcolor: T.surface2
    }}>
          <Typography sx={{
        color: T.ink2,
        fontWeight: 500,
        fontSize: 13
      }}>No items yet</Typography>
          <Typography sx={{
        color: T.ink3,
        fontSize: 12.5
      }}>
            Use the picker below to add your first item.
          </Typography>
        </Box> : <Stack spacing={0.5}>
          {items.map((item, i) => {
        const cat = allCategories?.find(c => c.name === item);
        const isOver = overIdx === i;
        return <Box key={item + i} draggable onDragStart={e => {
          dragIdx.current = i;
          e.currentTarget.style.opacity = "0.4";
        }} onDragEnd={e => {
          e.currentTarget.style.opacity = "1";
          setOverIdx(null);
          dragIdx.current = null;
        }} onDragOver={e => {
          e.preventDefault();
          setOverIdx(i);
        }} onDragLeave={() => setOverIdx(null)} onDrop={e => {
          e.preventDefault();
          const from = dragIdx.current;
          if (from !== null && from !== i) onMove(from, i);
          setOverIdx(null);
        }} sx={{
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
          "&:hover": {
            borderColor: T.line2,
            bgcolor: T.surface2,
            "& .row-actions": {
              opacity: 1
            }
          },
          "& .row-actions": {
            opacity: 0,
            transition: "opacity .12s"
          }
        }}>
                <DragIndicatorIcon sx={{
            fontSize: 16,
            color: T.ink4,
            cursor: "grab"
          }} />
                <Typography sx={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.ink3,
            minWidth: 22,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums"
          }}>
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{
            flex: 1,
            fontSize: 13,
            color: T.ink
          }}>{item}</Typography>
                {cat?.slug && <Typography sx={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.ink3
          }}>/{cat.slug}</Typography>}
                <Box className={cx("row-actions")} sx={{
            display: "flex",
            gap: 0.25
          }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" disabled={i === 0} onClick={() => onMove(i, i - 1)} sx={{
                  width: 26,
                  height: 26
                }}>
                        <ArrowUpwardIcon sx={{
                    fontSize: 14
                  }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton size="small" disabled={i === items.length - 1} onClick={() => onMove(i, i + 1)} sx={{
                  width: 26,
                  height: 26
                }}>
                        <ArrowDownwardIcon sx={{
                    fontSize: 14
                  }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => onRemove(i)} sx={{
                width: 26,
                height: 26,
                color: T.ink3,
                "&:hover": {
                  color: T.red,
                  bgcolor: T.redTint
                }
              }}>
                      <CloseIcon sx={{
                  fontSize: 14
                }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>;
      })}
        </Stack>}

      {canAdd && <Picker items={items} allCategories={allCategories || []} onAdd={onAdd} pickerLoading={pickerLoading} freeText={freeText} useCategories={useCategories} placeholder={placeholder} />}

      {!canAdd && <Stack direction="row" spacing={0.75} alignItems="center" sx={{
      mt: 1,
      color: T.amber
    }}>
          <InfoOutlinedIcon sx={{
        fontSize: 14
      }} />
          <Typography sx={{
        fontSize: 12,
        color: T.amber
      }}>
            Maximum {maxItems} items reached — remove one to add another.
          </Typography>
        </Stack>}
    </Box>;
}

// ── Service card section ─────────────────────────────────────────────────────
function SectionCard({
  section,
  allCategories,
  pickerLoading,
  onUpdate,
  onRemove
}) {
  return <Card variant="outlined" sx={{
    mb: 2,
    borderColor: T.line,
    borderRadius: 2,
    boxShadow: "0 1px 0 rgba(20,17,15,0.04)"
  }}>
      <Box sx={{
      px: 2,
      py: 1.5,
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      bgcolor: T.surface2,
      borderBottom: `1px solid ${T.line}`
    }}>
        <TextField size="small" variant="outlined" value={section.section} onChange={e => onUpdate("section", e.target.value)} placeholder="Section name…" sx={{
        maxWidth: 360,
        "& .MuiOutlinedInput-root": {
          fontWeight: 600,
          fontSize: 14,
          bgcolor: "transparent",
          "& fieldset": {
            borderColor: "transparent"
          },
          "&:hover": {
            bgcolor: T.surface,
            "& fieldset": {
              borderColor: T.line
            }
          },
          "&.Mui-focused": {
            bgcolor: T.surface,
            "& fieldset": {
              borderColor: T.accent + " !important"
            }
          }
        }
      }} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{
        ml: "auto"
      }}>
          <Chip icon={<DesktopWindowsOutlinedIcon sx={{
          fontSize: 14,
          color: T.ink2 + " !important"
        }} />} label={`Desktop ${section.desktopItems?.length || 0}`} size="small" variant="outlined" sx={{
          borderColor: T.line,
          color: T.ink2,
          fontSize: 11,
          height: 24
        }} />
          <Chip icon={<PhoneIphoneOutlinedIcon sx={{
          fontSize: 14,
          color: T.ink2 + " !important"
        }} />} label={`Mobile ${section.mobileItems?.length || 0}`} size="small" variant="outlined" sx={{
          borderColor: T.line,
          color: T.ink2,
          fontSize: 11,
          height: 24
        }} />
          <Tooltip title="Remove section">
            <IconButton size="small" onClick={onRemove} sx={{
            color: T.ink3,
            "&:hover": {
              color: T.red,
              bgcolor: T.redTint
            }
          }}>
              <DeleteOutlineIcon sx={{
              fontSize: 18
            }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        md: "1fr 1fr"
      }
    }}>
        <Box sx={{
        p: 2.25,
        borderRight: {
          md: `1px solid ${T.line}`
        },
        borderBottom: {
          xs: `1px solid ${T.line}`,
          md: "none"
        }
      }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{
          mb: 1.5
        }}>
            <Box sx={{
            width: 26,
            height: 26,
            borderRadius: 1,
            bgcolor: T.surface2,
            border: `1px solid ${T.line}`,
            display: "grid",
            placeItems: "center",
            color: T.ink2
          }}>
              <DesktopWindowsOutlinedIcon sx={{
              fontSize: 15
            }} />
            </Box>
            <Typography sx={{
            fontWeight: 600,
            fontSize: 13
          }}>Desktop</Typography>
            <Typography sx={{
            ml: "auto",
            fontSize: 12,
            color: T.ink3
          }}>
              {section.desktopItems?.length || 0} items
            </Typography>
          </Stack>
          <OrderedList items={section.desktopItems || []} allCategories={allCategories} pickerLoading={pickerLoading} onAdd={n => onUpdate("desktopItems", [...(section.desktopItems || []), n])} onRemove={i => onUpdate("desktopItems", (section.desktopItems || []).filter((_, j) => j !== i))} onMove={(f, t) => onUpdate("desktopItems", moveItem(section.desktopItems || [], f, t))} />
        </Box>
        <Box sx={{
        p: 2
      }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{
          mb: 1.5
        }}>
            <Box sx={{
            width: 26,
            height: 26,
            borderRadius: 1,
            bgcolor: T.surface2,
            border: `1px solid ${T.line}`,
            display: "grid",
            placeItems: "center",
            color: T.ink2
          }}>
              <PhoneIphoneOutlinedIcon sx={{
              fontSize: 15
            }} />
            </Box>
            <Typography sx={{
            fontWeight: 600,
            fontSize: 13
          }}>Mobile</Typography>
            <Typography sx={{
            ml: "auto",
            fontSize: 12,
            color: T.ink3
          }}>
              {section.mobileItems?.length || 0} items
            </Typography>
          </Stack>
          <OrderedList items={section.mobileItems || []} allCategories={allCategories} pickerLoading={pickerLoading} onAdd={n => onUpdate("mobileItems", [...(section.mobileItems || []), n])} onRemove={i => onUpdate("mobileItems", (section.mobileItems || []).filter((_, j) => j !== i))} onMove={(f, t) => onUpdate("mobileItems", moveItem(section.mobileItems || [], f, t))} />
        </Box>
      </Box>
    </Card>;
}

// ── Sub-category mapping ─────────────────────────────────────────────────────
function MappingAccordion({
  entry,
  defaultOpen,
  allCategories,
  pickerLoading,
  onUpdate,
  onRemove
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return <Card variant="outlined" className={cx("mapping-accordion")}>
      <Box onClick={() => setOpen(o => !o)} className={cx("mapping-accordion__header")}>
        <ChevronRightIcon className={cx(`mapping-accordion__chevron ${open ? "mapping-accordion__chevron--open" : ""}`)} />
        <Typography className={cx("mapping-accordion__slug-prefix")}>/sub/</Typography>
        <TextField size="small" value={entry.parentSlug} placeholder="parent-slug" onClick={e => e.stopPropagation()} onChange={e => onUpdate("parentSlug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} sx={{
        minWidth: 220,
        "& .MuiOutlinedInput-root": {
          fontFamily: T.mono,
          fontSize: 12.5,
          "& fieldset": {
            borderColor: T.line
          },
          "&.Mui-focused fieldset": {
            borderColor: T.accent + " !important"
          }
        }
      }} />
        <Chip label={`${entry.subCategoryNames?.length || 0} sub-categories`} size="small" variant="outlined" sx={{
        borderColor: T.line,
        color: T.ink2,
        fontSize: 11,
        height: 24
      }} />
        <Tooltip title="Remove mapping">
          <IconButton size="small" onClick={e => {
          e.stopPropagation();
          onRemove();
        }} sx={{
          ml: "auto",
          color: T.ink3,
          "&:hover": {
            color: T.red,
            bgcolor: T.redTint
          }
        }}>
            <DeleteOutlineIcon sx={{
            fontSize: 18
          }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={open}>
        <Box className={cx("mapping-accordion__body")}>
          <OrderedList items={entry.subCategoryNames || []} useCategories allCategories={allCategories} pickerLoading={pickerLoading} placeholder="Search and select categories…" onAdd={n => onUpdate("subCategoryNames", [...(entry.subCategoryNames || []), n])} onRemove={i => onUpdate("subCategoryNames", (entry.subCategoryNames || []).filter((_, j) => j !== i))} onMove={(f, t) => onUpdate("subCategoryNames", moveItem(entry.subCategoryNames || [], f, t))} />
        </Box>
      </Collapse>
    </Card>;
}

// ── Overview card ────────────────────────────────────────────────────────────
// ── Segmented toggle (Desktop / Mobile) ──────────────────────────────────────
function ViewToggle({
  value,
  onChange,
  options
}) {
  return <Box sx={{
    display: "inline-flex",
    bgcolor: T.surface2,
    border: `1px solid ${T.line}`,
    borderRadius: 1.25,
    p: 0.375,
    gap: 0.25
  }}>
      {options.map(opt => {
      const active = value === opt.id;
      return <Box key={opt.id} onClick={() => onChange(opt.id)} sx={{
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
        boxShadow: active ? "0 1px 0 rgba(20,17,15,0.04), 0 1px 2px rgba(20,17,15,0.04)" : "none"
      }}>
            {opt.icon}
            {opt.label}
            <Box sx={{
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          px: 0.75,
          borderRadius: 5,
          bgcolor: active ? T.accentTint : T.line,
          color: active ? T.accentDeep : T.ink3
        }}>
              {opt.count}
            </Box>
          </Box>;
    })}
    </Box>;
}

// ── Image uploader ───────────────────────────────────────────────────────────
const S3_BASE = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";
function ImageUploader({
  imageKey,
  onUploaded,
  folder = "home-sections"
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = imageKey ? `${S3_BASE}${imageKey}` : null;
  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = async ev => {
      const imageData = ev.target.result;
      setUploading(true);
      try {
        const API_URL = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem("accessToken");
        const {
          data
        } = await axiosInstance.post(`${API_URL}/admin/home-section/upload-image`, {
          imageData,
          folder
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (data.success) onUploaded(data.imageKey);else setError(data.message || "Upload failed");
      } catch (err) {
        setError(err.response?.data?.message || "Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };
  return <Box>
      <input ref={fileRef} type="file" accept="image/*" style={{
      display: "none"
    }} onChange={handleFile} />

      <Box sx={{
      width: 96,
      height: 72,
      border: `1px dashed ${error ? T.red : T.line2}`,
      borderRadius: 1.5,
      overflow: "hidden",
      bgcolor: T.surface2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      cursor: uploading ? "wait" : "pointer",
      flexShrink: 0,
      "&:hover .upload-overlay": {
        opacity: 1
      }
    }} onClick={() => !uploading && fileRef.current?.click()}>
        {previewUrl ? <img src={previewUrl} alt="preview" style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block"
      }} onError={e => {
        e.target.style.display = "none";
      }} /> : <BrokenImageOutlinedIcon sx={{
        fontSize: 22,
        color: T.ink4
      }} />}

        <Box className={cx("upload-overlay")} sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: uploading ? 1 : 0,
        transition: "opacity .15s",
        gap: 0.5
      }}>
          {uploading ? <CircularProgress size={18} sx={{
          color: "#fff"
        }} /> : <CloudUploadOutlinedIcon sx={{
          fontSize: 18,
          color: "#fff"
        }} />}
          <Typography sx={{
          fontSize: 10,
          color: "#fff",
          fontWeight: 600
        }}>
            {uploading ? "Uploading…" : "Change"}
          </Typography>
        </Box>
      </Box>

      {error && <Typography sx={{
      fontSize: 11,
      color: T.red,
      mt: 0.5,
      maxWidth: 96
    }}>{error}</Typography>}
    </Box>;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CategoryDisplaySettings() {
  const dispatch = useDispatch();
  const {
    settings,
    allCategories,
    loading,
    saving,
    saveError,
    pickerLoading
  } = useSelector(state => state.categoryDisplaySettings);
  const [open, setOpen] = useState("home");
  const [homeView, setHomeView] = useState("desktop");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [homeFeaturedDesktop, setHomeFeaturedDesktop] = useState([]);
  const [homeFeaturedMobile, setHomeFeaturedMobile] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [serviceCardSections, setServiceCardSections] = useState([]);
  const [subCategoryMapping, setSubCategoryMapping] = useState([]);
  const [popularSearchCards, setPopularSearchCards] = useState([]);
  const [topTouristPlaces, setTopTouristPlaces] = useState([]);
  const [popularCategoryTabs, setPopularCategoryTabs] = useState([]);
  const [popularCategoryServices, setPopularCategoryServices] = useState([]);
  const [popularCategoryLinkSections, setPopularCategoryLinkSections] = useState([]);
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
      serviceCardSections: settings.serviceCardSections?.length > 0 ? settings.serviceCardSections : [{
        section: "Repair and Services",
        desktopItems: [],
        mobileItems: []
      }, {
        section: "Services",
        desktopItems: [],
        mobileItems: []
      }, {
        section: "Hot Categories",
        desktopItems: [],
        mobileItems: []
      }, {
        section: "Building Materials",
        desktopItems: [],
        mobileItems: []
      }],
      subCategoryMapping: settings.subCategoryMapping || [],
      popularSearchCards: settings.popularSearchCards || [],
      topTouristPlaces: settings.topTouristPlaces || [],
      popularCategoryTabs: settings.popularCategoryTabs || [],
      popularCategoryServices: settings.popularCategoryServices || [],
      popularCategoryLinkSections: settings.popularCategoryLinkSections || []
    };
    setHomeFeaturedDesktop(next.homeFeaturedDesktop);
    setHomeFeaturedMobile(next.homeFeaturedMobile);
    setPopularCategories(next.popularCategories);
    setServiceCardSections(next.serviceCardSections);
    setSubCategoryMapping(next.subCategoryMapping);
    setPopularSearchCards(next.popularSearchCards);
    setTopTouristPlaces(next.topTouristPlaces);
    setPopularCategoryTabs(next.popularCategoryTabs);
    setPopularCategoryServices(next.popularCategoryServices);
    setPopularCategoryLinkSections(next.popularCategoryLinkSections);
    setSnapshot(JSON.stringify(next));
  }, [settings]);
  const current = useMemo(() => ({
    homeFeaturedDesktop,
    homeFeaturedMobile,
    popularCategories,
    serviceCardSections,
    subCategoryMapping,
    popularSearchCards,
    topTouristPlaces,
    popularCategoryTabs,
    popularCategoryServices,
    popularCategoryLinkSections
  }), [homeFeaturedDesktop, homeFeaturedMobile, popularCategories, serviceCardSections, subCategoryMapping, popularSearchCards, topTouristPlaces, popularCategoryTabs, popularCategoryServices, popularCategoryLinkSections]);
  const dirty = snapshot !== null && JSON.stringify(current) !== snapshot;
  const handleSave = async () => {
    try {
      await dispatch(updateCategoryDisplaySettings(current));
      setSnapshot(JSON.stringify(current));
      setSnackbar({
        open: true,
        message: "Settings saved · v2 cache cleared",
        severity: "success"
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Save failed",
        severity: "error"
      });
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
    setPopularSearchCards(s.popularSearchCards);
    setTopTouristPlaces(s.topTouristPlaces);
    setPopularCategoryTabs(s.popularCategoryTabs);
    setPopularCategoryServices(s.popularCategoryServices);
    setPopularCategoryLinkSections(s.popularCategoryLinkSections);
  };
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [dirty, saving, current]);
  const updateSection = useCallback((index, field, value) => {
    setServiceCardSections(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  }, []);
  const addSection = () => setServiceCardSections(p => [...p, {
    section: "New Section",
    desktopItems: [],
    mobileItems: []
  }]);
  const removeSection = i => setServiceCardSections(p => p.filter((_, j) => j !== i));
  const updateMapping = useCallback((index, field, value) => {
    setSubCategoryMapping(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  }, []);
  const addMapping = () => setSubCategoryMapping(p => [...p, {
    parentSlug: "",
    subCategoryNames: []
  }]);
  const removeMapping = i => setSubCategoryMapping(p => p.filter((_, j) => j !== i));
  if (loading) {
    return <Box sx={{
      display: "flex",
      justifyContent: "center",
      mt: 8
    }}>
        <CircularProgress />
      </Box>;
  }

  // ── Overview cards data ─────────────────────────────────────────────────
  const totalServiceItems = serviceCardSections.reduce((a, x) => a + (x.desktopItems?.length || 0) + (x.mobileItems?.length || 0), 0);
  const totalSubItems = subCategoryMapping.reduce((a, x) => a + (x.subCategoryNames?.length || 0), 0);
  const cards = [{
    id: "home",
    label: "Home featured",
    desc: "Hero carousel",
    icon: <HomeOutlinedIcon sx={{
      fontSize: 18
    }} />,
    stat: homeFeaturedDesktop.length + homeFeaturedMobile.length,
    statLabel: "categories",
    detail: `${homeFeaturedDesktop.length}/20 desktop · ${homeFeaturedMobile.length}/12 mobile`,
    accent: T.accent,
    accentTint: T.accentTint
  }, {
    id: "popular",
    label: "Popular",
    desc: "Quick links drawer",
    icon: <StarBorderRoundedIcon sx={{
      fontSize: 18
    }} />,
    stat: popularCategories.length,
    statLabel: "categories",
    detail: "Unlimited slots",
    accent: T.purple,
    accentTint: T.purpleTint
  }, {
    id: "service",
    label: "Service cards",
    desc: "Home page grids",
    icon: <GridViewOutlinedIcon sx={{
      fontSize: 18
    }} />,
    stat: serviceCardSections.length,
    statLabel: "sections",
    detail: `${totalServiceItems} total items`,
    accent: T.green,
    accentTint: T.greenTint
  }, {
    id: "sub",
    label: "Sub-categories",
    desc: "/sub/:slug endpoint",
    icon: <FolderOutlinedIcon sx={{
      fontSize: 18
    }} />,
    stat: subCategoryMapping.length,
    statLabel: "parent slugs",
    detail: `${totalSubItems} sub-items`,
    accent: T.blue,
    accentTint: T.blueTint
  }, {
    id: "popularSearchCards",
    label: "Popular Searches",
    desc: "Home enquiry cards",
    icon: <StarBorderRoundedIcon sx={{
      fontSize: 18
    }} />,
    stat: popularSearchCards.length,
    statLabel: "cards",
    detail: "Title, image key, button text, accent",
    accent: T.amber,
    accentTint: T.amberTint
  }, {
    id: "topTourist",
    label: "Top Tourist",
    desc: "Destination cards",
    icon: <HomeOutlinedIcon sx={{
      fontSize: 18
    }} />,
    stat: topTouristPlaces.length,
    statLabel: "places",
    detail: "Name, image key, link path",
    accent: T.green,
    accentTint: T.greenTint
  }, {
    id: "popularCategoryContent",
    label: "Popular Categories",
    desc: "Tabs · services · links",
    icon: <GridViewOutlinedIcon sx={{
      fontSize: 18
    }} />,
    stat: popularCategoryTabs.length,
    statLabel: "tabs",
    detail: `${popularCategoryServices.length} services · ${popularCategoryLinkSections.length} link sections`,
    accent: T.purple,
    accentTint: T.purpleTint
  }];
  const activeCard = cards.find(c => c.id === open);
  return <Box className={cx("category-display-settings")} sx={{
    display: "flex",
    alignSelf: "stretch",
    width: "100%",
    minWidth: 0,
    height: "calc(100vh - 112px)",
    flexDirection: "column",
    bgcolor: T.bg
  }}>
      {/* Header */}
      <Box sx={{
      px: 2,
      py: 2,
      borderBottom: `1px solid ${T.line}`,
      bgcolor: T.surface,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
        <Typography sx={{
        fontSize: 22,
        fontWeight: 700,
        color: T.ink,
        mb: 0.25
      }}>
          Display Settings
        </Typography>
        <Typography sx={{
        fontSize: 12.5,
        color: T.ink3
      }}>
          Configure home page content & layouts
        </Typography>
      </Box>

      {/* Main content area with sidebar */}
      <Box sx={{
      display: "flex",
      flex: 1,
      overflow: "hidden"
    }}>
        {/* Sidebar Navigation */}
        <Box sx={{
        width: 220,
        bgcolor: T.surface,
        borderRight: `1px solid ${T.line}`,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        "&::-webkit-scrollbar": {
          width: 6
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: T.surface
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: T.line2,
          borderRadius: 3,
          "&:hover": {
            bgcolor: T.ink4
          }
        }
      }}>
          <Box sx={{
          p: 1
        }}>
            {cards.map(c => <Box key={c.id} onClick={() => setOpen(c.id)} sx={{
            p: 1,
            mb: 0.5,
            borderRadius: 0.75,
            cursor: "pointer",
            bgcolor: open === c.id ? c.accentTint : "transparent",
            border: `1px solid ${open === c.id ? c.accent : "transparent"}`,
            transition: "all .15s",
            "&:hover": {
              bgcolor: c.accentTint,
              borderColor: c.accent
            }
          }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{
                color: open === c.id ? c.accent : T.ink3,
                display: "flex",
                flexShrink: 0,
                fontSize: 16
              }}>
                    {c.icon}
                  </Box>
                  <Box sx={{
                flex: 1,
                minWidth: 0
              }}>
                    <Typography sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: open === c.id ? c.accent : T.ink,
                  lineHeight: 1.2
                }}>
                      {c.label}
                    </Typography>
                    <Typography sx={{
                  fontSize: 10,
                  color: T.ink3,
                  mt: 0.25,
                  lineHeight: 1
                }}>
                      {c.stat} {c.statLabel}
                    </Typography>
                  </Box>
                </Stack>
              </Box>)}
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        bgcolor: T.bg
      }}>
          {/* Error Alert */}
          {saveError && <Alert severity="error" sx={{
          mx: 2,
          my: 1.5
        }}>
              {saveError}
            </Alert>}

          {/* Content Area */}
          <Box sx={{
          flex: 1,
          px: 2,
          py: 2.5,
          overflowY: "auto"
        }}>
            {/* Panel Header */}
            <Box sx={{
            mb: 2,
            pb: 1.5,
            borderBottom: `1px solid ${T.line}`
          }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.ink,
                  mb: 0.5
                }}>
                    {activeCard.label}
                  </Typography>
                  <Typography sx={{
                  fontSize: 12.5,
                  color: T.ink3
                }}>
                    {activeCard.desc}
                  </Typography>
                </Box>
                {open === "home" && <ViewToggle value={homeView} onChange={setHomeView} options={[{
                id: "desktop",
                label: "Desktop",
                icon: <DesktopWindowsOutlinedIcon sx={{
                  fontSize: 14
                }} />,
                count: `${homeFeaturedDesktop.length}/20`
              }, {
                id: "mobile",
                label: "Mobile",
                icon: <PhoneIphoneOutlinedIcon sx={{
                  fontSize: 14
                }} />,
                count: `${homeFeaturedMobile.length}/12`
              }]} />}
              </Stack>
            </Box>

            {/* Panel Content */}
            {/* Home featured */}
            {open === "home" && (homeView === "desktop" ? <OrderedList items={homeFeaturedDesktop} maxItems={20} allCategories={allCategories} pickerLoading={pickerLoading} onAdd={n => setHomeFeaturedDesktop(p => [...p, n])} onRemove={i => setHomeFeaturedDesktop(p => p.filter((_, j) => j !== i))} onMove={(f, t) => setHomeFeaturedDesktop(p => moveItem(p, f, t))} /> : <OrderedList items={homeFeaturedMobile} maxItems={12} allCategories={allCategories} pickerLoading={pickerLoading} onAdd={n => setHomeFeaturedMobile(p => [...p, n])} onRemove={i => setHomeFeaturedMobile(p => p.filter((_, j) => j !== i))} onMove={(f, t) => setHomeFeaturedMobile(p => moveItem(p, f, t))} />)}

            {/* Popular */}
            {open === "popular" && <OrderedList items={popularCategories} allCategories={allCategories} pickerLoading={pickerLoading} onAdd={n => setPopularCategories(p => [...p, n])} onRemove={i => setPopularCategories(p => p.filter((_, j) => j !== i))} onMove={(f, t) => setPopularCategories(p => moveItem(p, f, t))} />}

            {/* Service cards */}
            {open === "service" && <Box>
                <Stack direction="row" spacing={1.5} sx={{
              p: 1.5,
              bgcolor: T.surface2,
              border: `1px solid ${T.line}`,
              borderRadius: 1.25,
              mb: 2.25,
              fontSize: 12.5,
              color: T.ink2,
              alignItems: "flex-start"
            }}>
                  <Box sx={{
                width: 22,
                height: 22,
                borderRadius: 0.75,
                bgcolor: T.accentTint,
                color: T.accentDeep,
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}>
                    <InfoOutlinedIcon sx={{
                  fontSize: 14
                }} />
                  </Box>
                  <Box>
                    <Box component="b" sx={{
                  color: T.ink
                }}>
                      Service cards
                    </Box>{" "}
                    appear as titled grid sections on the home page. Each has separate lists for desktop and mobile.
                  </Box>
                </Stack>

                {serviceCardSections.map((sec, i) => <SectionCard key={i} section={sec} allCategories={allCategories} pickerLoading={pickerLoading} onUpdate={(field, val) => updateSection(i, field, val)} onRemove={() => removeSection(i)} />)}

                <Button variant="outlined" startIcon={<AddIcon />} onClick={addSection} sx={{
              textTransform: "none",
              borderColor: T.line2,
              color: T.ink2,
              "&:hover": {
                bgcolor: T.surface2,
                borderColor: T.line2
              }
            }}>
                  Add section
                </Button>
              </Box>}

            {/* Sub-categories */}
            {open === "sub" && <Box sx={{
            mx: 0
          }}>
                <Stack direction="row" spacing={1.5} sx={{
              p: 1.5,
              bgcolor: T.surface2,
              border: `1px solid ${T.line}`,
              borderRadius: 1.25,
              mb: 2.25,
              fontSize: 12.5,
              color: T.ink2,
              alignItems: "flex-start"
            }}>
                  <Box sx={{
                width: 22,
                height: 22,
                borderRadius: 0.75,
                bgcolor: T.blueTint,
                color: T.blue,
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}>
                    <InfoOutlinedIcon sx={{
                  fontSize: 14
                }} />
                  </Box>
                  <Box>
                    Maps a{" "}
                    <Box component="b" sx={{
                  color: T.ink
                }}>
                      parent slug
                    </Box>{" "}
                    to the list of sub-categories shown beneath it. Used by{" "}
                    <Box component="code" sx={{
                  fontFamily: T.mono,
                  fontSize: 11.5,
                  px: 0.5,
                  bgcolor: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: 0.5
                }}>
                      /api/v2/category/sub/:parentSlug
                    </Box>
                    . Names are free-form.
                  </Box>
                </Stack>

                {subCategoryMapping.map((entry, i) => <MappingAccordion key={i} entry={entry} defaultOpen={i === 0} allCategories={allCategories} pickerLoading={pickerLoading} onUpdate={(field, val) => updateMapping(i, field, val)} onRemove={() => removeMapping(i)} />)}

                <Button variant="outlined" startIcon={<AddIcon />} onClick={addMapping} sx={{
              textTransform: "none",
              borderColor: T.line2,
              color: T.ink2,
              "&:hover": {
                bgcolor: T.surface2,
                borderColor: T.line2
              }
            }}>
                  Add parent slug
                </Button>
              </Box>}

            {/* Popular Search Cards */}
            {open === "popularSearchCards" && <Box sx={{
            mx: 0
          }}>
                <Stack spacing={2}>
                  {popularSearchCards.length === 0 ? <Box sx={{
                p: 3,
                textAlign: "center",
                border: `1px dashed ${T.line2}`,
                borderRadius: 1.5,
                bgcolor: T.surface2
              }}>
                      <Typography sx={{
                  color: T.ink3,
                  mb: 1
                }}>No search cards yet</Typography>
                      <Button variant="text" startIcon={<AddIcon />} sx={{
                  textTransform: "none",
                  color: T.accent
                }}>
                        Add your first card
                      </Button>
                    </Box> : popularSearchCards.map((card, i) => <Card key={i} variant="outlined" sx={{
                borderColor: T.line,
                borderRadius: 1.75,
                overflow: "hidden"
              }}>
                        <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: 2,
                  p: 2.5,
                  alignItems: "start"
                }}>
                          {/* Image uploader */}
                          <Box>
                            <Typography sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.ink3,
                      mb: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em"
                    }}>
                              Image
                            </Typography>
                            <ImageUploader imageKey={card.imageKey} folder="home-sections/popular-search" onUploaded={key => setPopularSearchCards(p => {
                      const next = [...p];
                      next[i] = {
                        ...next[i],
                        imageKey: key
                      };
                      return next;
                    })} />
                          </Box>

                          {/* Fields Grid */}
                          <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5
                  }}>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Title</Typography>
                              <TextField size="small" fullWidth placeholder="e.g., Photography" value={card.title || ""} onChange={e => setPopularSearchCards(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          title: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Button Text</Typography>
                              <TextField size="small" fullWidth placeholder="e.g., Enquire Now" value={card.buttonText || ""} onChange={e => setPopularSearchCards(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          buttonText: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Color (#hex)</Typography>
                              <TextField size="small" fullWidth placeholder="#e67e22" value={card.accent || ""} onChange={e => setPopularSearchCards(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          accent: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Alt Text</Typography>
                              <TextField size="small" fullWidth placeholder="Image description" value={card.alt || ""} onChange={e => setPopularSearchCards(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          alt: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                          </Box>

                          {/* Delete button */}
                          <Tooltip title="Remove card">
                            <IconButton size="small" onClick={() => setPopularSearchCards(p => p.filter((_, j) => j !== i))} sx={{
                      color: T.ink3,
                      "&:hover": {
                        color: T.red,
                        bgcolor: T.redTint
                      }
                    }}>
                              <DeleteOutlineIcon sx={{
                        fontSize: 18
                      }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>)}
                </Stack>

                <Box sx={{
              mt: 2
            }}>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPopularSearchCards(p => [...p, {
                title: "",
                imageKey: "",
                buttonText: "Enquire Now",
                accent: "#e67e22",
                alt: ""
              }])} sx={{
                textTransform: "none",
                borderColor: T.line2,
                color: T.ink2,
                "&:hover": {
                  bgcolor: T.surface2,
                  borderColor: T.line
                }
              }}>
                    Add card
                  </Button>
                </Box>
              </Box>}

            {/* Top Tourist Places */}
            {open === "topTourist" && <Box sx={{
            mx: 0
          }}>
                <Stack spacing={2}>
                  {topTouristPlaces.length === 0 ? <Box sx={{
                p: 3,
                textAlign: "center",
                border: `1px dashed ${T.line2}`,
                borderRadius: 1.5,
                bgcolor: T.surface2
              }}>
                      <Typography sx={{
                  color: T.ink3,
                  mb: 1
                }}>No destinations yet</Typography>
                      <Button variant="text" startIcon={<AddIcon />} sx={{
                  textTransform: "none",
                  color: T.accent
                }}>
                        Add your first place
                      </Button>
                    </Box> : topTouristPlaces.map((place, i) => <Card key={i} variant="outlined" sx={{
                borderColor: T.line,
                borderRadius: 1.75,
                overflow: "hidden"
              }}>
                        <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: 2,
                  p: 2.5,
                  alignItems: "start"
                }}>
                          {/* Image */}
                          <Box>
                            <Typography sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.ink3,
                      mb: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em"
                    }}>
                              Image
                            </Typography>
                            <ImageUploader imageKey={place.imageKey} folder="home-sections/top-tourist" onUploaded={key => setTopTouristPlaces(p => {
                      const next = [...p];
                      next[i] = {
                        ...next[i],
                        imageKey: key
                      };
                      return next;
                    })} />
                          </Box>

                          {/* Fields */}
                          <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5
                  }}>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>City Name</Typography>
                              <TextField size="small" fullWidth placeholder="e.g., Ooty" value={place.name || ""} onChange={e => setTopTouristPlaces(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          name: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                            <Box>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Alt Text</Typography>
                              <TextField size="small" fullWidth placeholder="Image description" value={place.alt || ""} onChange={e => setTopTouristPlaces(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          alt: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                            <Box sx={{
                      gridColumn: "1 / -1"
                    }}>
                              <Typography sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink3,
                        mb: 0.5
                      }}>Link Path</Typography>
                              <TextField size="small" fullWidth placeholder="/trending/ooty" value={place.path || ""} onChange={e => setTopTouristPlaces(p => {
                        const next = [...p];
                        next[i] = {
                          ...next[i],
                          path: e.target.value
                        };
                        return next;
                      })} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13,
                          "& fieldset": {
                            borderColor: T.line2
                          }
                        }
                      }} />
                            </Box>
                          </Box>

                          {/* Delete */}
                          <Tooltip title="Remove place">
                            <IconButton size="small" onClick={() => setTopTouristPlaces(p => p.filter((_, j) => j !== i))} sx={{
                      color: T.ink3,
                      "&:hover": {
                        color: T.red,
                        bgcolor: T.redTint
                      }
                    }}>
                              <DeleteOutlineIcon sx={{
                        fontSize: 18
                      }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>)}
                </Stack>

                <Box sx={{
              mt: 2
            }}>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setTopTouristPlaces(p => [...p, {
                name: "",
                imageKey: "",
                alt: "",
                path: ""
              }])} sx={{
                textTransform: "none",
                borderColor: T.line2,
                color: T.ink2,
                "&:hover": {
                  bgcolor: T.surface2,
                  borderColor: T.line
                }
              }}>
                    Add place
                  </Button>
                </Box>
              </Box>}

            {/* Popular Category Content */}
            {open === "popularCategoryContent" && <Stack spacing={3.5}>
                {/* Category Tabs Section */}
                <Box>
                  <Box sx={{
                mb: 2,
                pb: 1.5,
                borderBottom: `1px solid ${T.line}`
              }}>
                    <Typography sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: T.ink
                }}>Category Tabs</Typography>
                    <Typography sx={{
                  fontSize: 12,
                  color: T.ink3,
                  mt: 0.25
                }}>Tabs shown on the Popular Categories page</Typography>
                  </Box>
                  <Stack spacing={1.5}>
                    {popularCategoryTabs.length === 0 ? <Box sx={{
                  p: 2.5,
                  textAlign: "center",
                  border: `1px dashed ${T.line2}`,
                  borderRadius: 1.5,
                  bgcolor: T.surface2
                }}>
                        <Typography sx={{
                    color: T.ink3,
                    mb: 0.5
                  }}>No tabs configured</Typography>
                      </Box> : popularCategoryTabs.map((tab, i) => <Card key={i} variant="outlined" sx={{
                  borderColor: T.line,
                  borderRadius: 1.5
                }}>
                          <Box sx={{
                    p: 2
                  }}>
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.ink3,
                          mb: 0.5
                        }}>Category Name</Typography>
                                <TextField size="small" fullWidth placeholder="e.g., Plumbing" value={tab.category || ""} onChange={e => setPopularCategoryTabs(p => {
                          const n = [...p];
                          n[i] = {
                            ...n[i],
                            category: e.target.value
                          };
                          return n;
                        })} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13,
                            "& fieldset": {
                              borderColor: T.line2
                            }
                          }
                        }} />
                              </Box>
                              <Box>
                                <Typography sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.ink3,
                          mb: 0.5
                        }}>Keywords ({(tab.keywords || []).length})</Typography>
                                <TextField size="small" fullWidth multiline minRows={2} placeholder="pipe, tap, water... (comma-separated)" value={(tab.keywords || []).join(", ")} onChange={e => setPopularCategoryTabs(p => {
                          const n = [...p];
                          n[i] = {
                            ...n[i],
                            keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                          };
                          return n;
                        })} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13,
                            "& fieldset": {
                              borderColor: T.line2
                            }
                          }
                        }} />
                              </Box>
                              <Tooltip title="Remove tab">
                                <Box sx={{
                          display: "flex",
                          justifyContent: "flex-end"
                        }}>
                                  <IconButton size="small" onClick={() => setPopularCategoryTabs(p => p.filter((_, j) => j !== i))} sx={{
                            color: T.ink3,
                            "&:hover": {
                              color: T.red,
                              bgcolor: T.redTint
                            }
                          }}>
                                    <DeleteOutlineIcon sx={{
                              fontSize: 18
                            }} />
                                  </IconButton>
                                </Box>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Card>)}
                  </Stack>
                  <Button variant="text" startIcon={<AddIcon />} onClick={() => setPopularCategoryTabs(p => [...p, {
                category: "",
                keywords: []
              }])} sx={{
                textTransform: "none",
                color: T.accent,
                mt: 1,
                "&:hover": {
                  bgcolor: T.accentTint
                }
              }}>
                    Add tab
                  </Button>
                </Box>

                {/* Services Section */}
                <Box>
                  <Box sx={{
                mb: 2,
                pb: 1.5,
                borderBottom: `1px solid ${T.line}`
              }}>
                    <Typography sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: T.ink
                }}>Services</Typography>
                    <Typography sx={{
                  fontSize: 12,
                  color: T.ink3,
                  mt: 0.25
                }}>Service items under each tab</Typography>
                  </Box>
                  <Stack spacing={1.5}>
                    {popularCategoryServices.length === 0 ? <Box sx={{
                  p: 2.5,
                  textAlign: "center",
                  border: `1px dashed ${T.line2}`,
                  borderRadius: 1.5,
                  bgcolor: T.surface2
                }}>
                        <Typography sx={{
                    color: T.ink3,
                    mb: 0.5
                  }}>No services configured</Typography>
                      </Box> : popularCategoryServices.map((svc, i) => <Card key={i} variant="outlined" sx={{
                  borderColor: T.line,
                  borderRadius: 1.5
                }}>
                          <Box sx={{
                    p: 2
                  }}>
                            <Stack spacing={1.5}>
                              <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1.5
                      }}>
                                {[["title", "Title"], ["searchName", "Search Name"]].map(([field, label]) => <Box key={field}>
                                    <Typography sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: T.ink3,
                            mb: 0.5
                          }}>{label}</Typography>
                                    <TextField size="small" fullWidth value={svc[field] || ""} onChange={e => setPopularCategoryServices(p => {
                            const n = [...p];
                            n[i] = {
                              ...n[i],
                              [field]: e.target.value
                            };
                            return n;
                          })} sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: 13,
                              "& fieldset": {
                                borderColor: T.line2
                              }
                            }
                          }} />
                                  </Box>)}
                              </Box>
                              <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1.5
                      }}>
                                {[["icon", "Icon Key"], ["routeSlug", "Route Slug"]].map(([field, label]) => <Box key={field}>
                                    <Typography sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: T.ink3,
                            mb: 0.5
                          }}>{label}</Typography>
                                    <TextField size="small" fullWidth value={svc[field] || ""} onChange={e => setPopularCategoryServices(p => {
                            const n = [...p];
                            n[i] = {
                              ...n[i],
                              [field]: e.target.value
                            };
                            return n;
                          })} sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: 13,
                              "& fieldset": {
                                borderColor: T.line2
                              }
                            }
                          }} />
                                  </Box>)}
                              </Box>
                              <Box>
                                <Typography sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.ink3,
                          mb: 0.5
                        }}>Description</Typography>
                                <TextField size="small" fullWidth multiline minRows={2} value={svc.description || ""} onChange={e => setPopularCategoryServices(p => {
                          const n = [...p];
                          n[i] = {
                            ...n[i],
                            description: e.target.value
                          };
                          return n;
                        })} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13,
                            "& fieldset": {
                              borderColor: T.line2
                            }
                          }
                        }} />
                              </Box>
                              <Tooltip title="Remove service">
                                <Box sx={{
                          display: "flex",
                          justifyContent: "flex-end"
                        }}>
                                  <IconButton size="small" onClick={() => setPopularCategoryServices(p => p.filter((_, j) => j !== i))} sx={{
                            color: T.ink3,
                            "&:hover": {
                              color: T.red,
                              bgcolor: T.redTint
                            }
                          }}>
                                    <DeleteOutlineIcon sx={{
                              fontSize: 18
                            }} />
                                  </IconButton>
                                </Box>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Card>)}
                  </Stack>
                  <Button variant="text" startIcon={<AddIcon />} onClick={() => setPopularCategoryServices(p => [...p, {
                title: "",
                icon: "",
                description: "",
                route: "",
                searchName: "",
                routeSlug: ""
              }])} sx={{
                textTransform: "none",
                color: T.accent,
                mt: 1,
                "&:hover": {
                  bgcolor: T.accentTint
                }
              }}>
                    Add service
                  </Button>
                </Box>

                {/* Link Sections */}
                <Box>
                  <Box sx={{
                mb: 2,
                pb: 1.5,
                borderBottom: `1px solid ${T.line}`
              }}>
                    <Typography sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: T.ink
                }}>Link Sections</Typography>
                    <Typography sx={{
                  fontSize: 12,
                  color: T.ink3,
                  mt: 0.25
                }}>Quick link groups for navigation</Typography>
                  </Box>
                  <Stack spacing={1.5}>
                    {popularCategoryLinkSections.length === 0 ? <Box sx={{
                  p: 2.5,
                  textAlign: "center",
                  border: `1px dashed ${T.line2}`,
                  borderRadius: 1.5,
                  bgcolor: T.surface2
                }}>
                        <Typography sx={{
                    color: T.ink3,
                    mb: 0.5
                  }}>No link sections configured</Typography>
                      </Box> : popularCategoryLinkSections.map((sec, i) => <Card key={i} variant="outlined" sx={{
                  borderColor: T.line,
                  borderRadius: 1.5
                }}>
                          <Box sx={{
                    p: 2
                  }}>
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.ink3,
                          mb: 0.5
                        }}>Section Title</Typography>
                                <TextField size="small" fullWidth placeholder="e.g., Quick Tools" value={sec.title || ""} onChange={e => setPopularCategoryLinkSections(p => {
                          const n = [...p];
                          n[i] = {
                            ...n[i],
                            title: e.target.value
                          };
                          return n;
                        })} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13,
                            "& fieldset": {
                              borderColor: T.line2
                            }
                          }
                        }} />
                              </Box>
                              <Box>
                                <Typography sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.ink3,
                          mb: 0.5
                        }}>Keywords ({(sec.keywords || []).length})</Typography>
                                <TextField size="small" fullWidth multiline minRows={2} placeholder="filter, drain, repair... (comma-separated)" value={(sec.keywords || []).join(", ")} onChange={e => setPopularCategoryLinkSections(p => {
                          const n = [...p];
                          n[i] = {
                            ...n[i],
                            keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                          };
                          return n;
                        })} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13,
                            "& fieldset": {
                              borderColor: T.line2
                            }
                          }
                        }} />
                              </Box>
                              <Tooltip title="Remove section">
                                <Box sx={{
                          display: "flex",
                          justifyContent: "flex-end"
                        }}>
                                  <IconButton size="small" onClick={() => setPopularCategoryLinkSections(p => p.filter((_, j) => j !== i))} sx={{
                            color: T.ink3,
                            "&:hover": {
                              color: T.red,
                              bgcolor: T.redTint
                            }
                          }}>
                                    <DeleteOutlineIcon sx={{
                              fontSize: 18
                            }} />
                                  </IconButton>
                                </Box>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Card>)}
                  </Stack>
                  <Button variant="text" startIcon={<AddIcon />} onClick={() => setPopularCategoryLinkSections(p => [...p, {
                title: "",
                keywords: []
              }])} sx={{
                textTransform: "none",
                color: T.accent,
                mt: 1,
                "&:hover": {
                  bgcolor: T.accentTint
                }
              }}>
                    Add section
                  </Button>
                </Box>
              </Stack>}
          </Box>
        </Box>
      </Box>

      {/* Footer bar */}
      <Box sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: 2,
      py: 1.5,
      bgcolor: T.surface,
      borderTop: `1px solid ${T.line}`,
      boxShadow: "0 -1px 3px rgba(0,0,0,0.05)",
      flexShrink: 0
    }}>
        <Chip size="small" label={dirty ? "Unsaved changes" : "All changes saved"} sx={{
        bgcolor: dirty ? T.redTint : T.greenTint,
        color: dirty ? T.red : T.green,
        fontWeight: 500,
        fontSize: 12
      }} />

        <Stack direction="row" spacing={1}>
          <Button size="small" variant="text" startIcon={<RestartAltIcon />} onClick={handleReset} disabled={!dirty} sx={{
          textTransform: "none",
          color: T.ink2
        }}>
            Reset
          </Button>
          <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={14} sx={{
          color: "#fff"
        }} /> : <SaveIcon />} onClick={handleSave} disabled={!dirty || saving} sx={{
          textTransform: "none"
        }}>
            {saving ? "Saving…" : "Save all"}
          </Button>
        </Stack>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({
      ...s,
      open: false
    }))} anchorOrigin={{
      vertical: "bottom",
      horizontal: "center"
    }}>
        <Alert severity={snackbar.severity} icon={snackbar.severity === "success" ? <CheckCircleIcon /> : undefined} onClose={() => setSnackbar(s => ({
        ...s,
        open: false
      }))} sx={{
        bgcolor: snackbar.severity === "success" ? T.ink : undefined,
        color: snackbar.severity === "success" ? "#fff" : undefined,
        "& .MuiAlert-icon": snackbar.severity === "success" ? {
          color: T.green
        } : undefined
      }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>;
}
