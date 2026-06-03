import React from "react";
import {
  Box, Typography, Checkbox, FormControlLabel, Radio, RadioGroup,
  Slider, Divider, Chip, Button, FormGroup
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import TuneIcon from "@mui/icons-material/Tune";

const SORT_OPTIONS = [
  { value: "relevant", label: "Relevant" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
];

const RATING_OPTIONS = [
  { value: "3", label: "3+ Stars" },
  { value: "4", label: "4+ Stars" },
  { value: "4.5", label: "4.5+ Stars" },
];

const sectionStyle = {
  mb: 2.5,
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#1a1a1a",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  mb: 1,
};

const FilterPanel = ({
  filterConfig = [],
  activeFilters = {},
  sortBy = "relevant",
  onFilterChange,
  onSortChange,
  onClearAll,
}) => {
  const activeCount = Object.values(activeFilters).filter(v =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
  ).length;

  const handleMultiselectToggle = (key, option) => {
    const current = Array.isArray(activeFilters[key]) ? activeFilters[key] : [];
    const updated = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    onFilterChange(key, updated.length > 0 ? updated : null);
  };

  const handleRadioChange = (key, value) => {
    onFilterChange(key, activeFilters[key] === value ? null : value);
  };

  return (
    <Box sx={{ width: "100%", p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #e8ecf0" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TuneIcon sx={{ fontSize: 18, color: "#ff8c00" }} />
          <Typography sx={{ fontWeight: 700, fontSize: "15px" }}>
            Filters {activeCount > 0 && (
              <Chip label={activeCount} size="small" sx={{ ml: 0.5, bgcolor: "#ff8c00", color: "#fff", height: 20, fontSize: 11 }} />
            )}
          </Typography>
        </Box>
        {activeCount > 0 && (
          <Button size="small" onClick={onClearAll}
            sx={{ fontSize: "12px", color: "#ff8c00", textTransform: "none", p: 0, minWidth: 0 }}>
            Clear all
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Sort */}
      <Box sx={sectionStyle}>
        <Typography sx={labelStyle}>Sort by</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {SORT_OPTIONS.map(opt => (
            <Chip key={opt.value} label={opt.label} size="small"
              onClick={() => onSortChange(opt.value)}
              variant={sortBy === opt.value ? "filled" : "outlined"}
              sx={{
                cursor: "pointer",
                bgcolor: sortBy === opt.value ? "#ff8c00" : "transparent",
                color: sortBy === opt.value ? "#fff" : "#555",
                borderColor: sortBy === opt.value ? "#ff8c00" : "#ccc",
                fontWeight: sortBy === opt.value ? 600 : 400,
                fontSize: "12px",
                "&:hover": { borderColor: "#ff8c00", color: "#ff8c00" }
              }} />
          ))}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Universal: Rating */}
      <Box sx={sectionStyle}>
        <Typography sx={labelStyle}>Rating</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {RATING_OPTIONS.map(opt => {
            const active = activeFilters.minRating === opt.value;
            return (
              <Chip key={opt.value}
                icon={<StarRoundedIcon sx={{ fontSize: "14px !important", color: active ? "#fff" : "#f59e0b" }} />}
                label={opt.label} size="small"
                onClick={() => onFilterChange("minRating", active ? null : opt.value)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  cursor: "pointer",
                  bgcolor: active ? "#ff8c00" : "transparent",
                  color: active ? "#fff" : "#555",
                  borderColor: active ? "#ff8c00" : "#ccc",
                  fontWeight: active ? 600 : 400,
                  fontSize: "12px",
                }} />
            );
          })}
        </Box>
      </Box>

      {/* Universal: Toggles */}
      <Box sx={{ ...sectionStyle, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <FormControlLabel
          control={
            <Checkbox size="small" checked={activeFilters.openNow === "true"}
              onChange={e => onFilterChange("openNow", e.target.checked ? "true" : null)}
              sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" } }} />
          }
          label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><AccessTimeIcon sx={{ fontSize: 15, color: "#16a34a" }} /><Typography sx={{ fontSize: "13px" }}>Open Now</Typography></Box>}
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={activeFilters.verified === "true"}
              onChange={e => onFilterChange("verified", e.target.checked ? "true" : null)}
              sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" } }} />
          }
          label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><VerifiedIcon sx={{ fontSize: 15, color: "#2563eb" }} /><Typography sx={{ fontSize: "13px" }}>Verified</Typography></Box>}
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={activeFilters.featured === "true"}
              onChange={e => onFilterChange("featured", e.target.checked ? "true" : null)}
              sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" } }} />
          }
          label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><WorkspacePremiumIcon sx={{ fontSize: 15, color: "#d97706" }} /><Typography sx={{ fontSize: "13px" }}>Featured</Typography></Box>}
        />
      </Box>

      {/* Category-specific filters */}
      {filterConfig.map((fc, idx) => (
        <React.Fragment key={fc.key}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={sectionStyle}>
            <Typography sx={labelStyle}>{fc.label}</Typography>

            {fc.type === "multiselect" && (
              <FormGroup>
                {(fc.options || []).map(opt => (
                  <FormControlLabel key={opt}
                    control={
                      <Checkbox size="small"
                        checked={Array.isArray(activeFilters[fc.key]) && activeFilters[fc.key].includes(opt)}
                        onChange={() => handleMultiselectToggle(fc.key, opt)}
                        sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" }, py: 0.3 }} />
                    }
                    label={<Typography sx={{ fontSize: "13px" }}>{opt}</Typography>}
                  />
                ))}
              </FormGroup>
            )}

            {fc.type === "radio" && (
              <RadioGroup value={activeFilters[fc.key] || ""}
                onChange={e => handleRadioChange(fc.key, e.target.value)}>
                {(fc.options || []).map(opt => (
                  <FormControlLabel key={opt} value={opt}
                    control={<Radio size="small" sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" }, py: 0.3 }} />}
                    label={<Typography sx={{ fontSize: "13px" }}>{opt}</Typography>}
                  />
                ))}
              </RadioGroup>
            )}

            {fc.type === "toggle" && (
              <FormControlLabel
                control={
                  <Checkbox size="small"
                    checked={activeFilters[fc.key] === true || activeFilters[fc.key] === "true"}
                    onChange={e => onFilterChange(fc.key, e.target.checked ? true : null)}
                    sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" } }} />
                }
                label={<Typography sx={{ fontSize: "13px" }}>{fc.label}</Typography>}
              />
            )}

            {fc.type === "range" && (
              <Box sx={{ px: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  {fc.min}{fc.unit} – {fc.max}{fc.unit}
                </Typography>
                <Slider
                  value={activeFilters[fc.key] ?? fc.max ?? 100}
                  min={fc.min ?? 0}
                  max={fc.max ?? 100}
                  step={Math.ceil(((fc.max ?? 100) - (fc.min ?? 0)) / 20)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={v => `${v}${fc.unit || ""}`}
                  onChange={(_, val) => onFilterChange(fc.key, val)}
                  sx={{ color: "#ff8c00" }}
                />
              </Box>
            )}
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

export default FilterPanel;
