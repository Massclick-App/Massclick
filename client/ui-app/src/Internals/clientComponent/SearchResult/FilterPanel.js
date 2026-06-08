import React, { useState, useEffect } from "react";
import { Slider } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import styles from "./FilterPanel.module.css";

const SORT_OPTIONS = [
  { value: "relevant", label: "Relevant" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
];

const RATING_OPTIONS = [
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "4.5", label: "4.5+" },
];

const UNIVERSAL_TOGGLES = [
  {
    key: "openNow",
    label: "Open Now",
    icon: <AccessTimeRoundedIcon sx={{ fontSize: 15, color: "#16a34a" }} />,
    iconBg: "#dcfce7",
  },
  {
    key: "verified",
    label: "Verified",
    icon: <VerifiedRoundedIcon sx={{ fontSize: 15, color: "#2563eb" }} />,
    iconBg: "#dbeafe",
  },
  {
    key: "featured",
    label: "Featured",
    icon: <WorkspacePremiumRoundedIcon sx={{ fontSize: 15, color: "#d97706" }} />,
    iconBg: "#fef3c7",
  },
];

// Sub-component so it can use useState — prevents search firing on every slider tick
const RangeFilter = ({ fc, committedValue, onFilterChange }) => {
  const initial = committedValue ?? fc.max ?? 100;
  const [localVal, setLocalVal] = useState(initial);

  // Sync if the committed value resets from outside (e.g. "Clear all")
  useEffect(() => {
    setLocalVal(committedValue ?? fc.max ?? 100);
  }, [committedValue, fc.max]);

  return (
    <div>
      <div className={styles["range-header"]}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Up to</span>
        <span className={styles["range-value"]}>
          {localVal}{fc.unit || ""}
        </span>
      </div>
      <div className={styles["slider-wrap"]}>
        <Slider
          value={localVal}
          min={fc.min ?? 0}
          max={fc.max ?? 100}
          step={Math.ceil(((fc.max ?? 100) - (fc.min ?? 0)) / 20)}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}${fc.unit || ""}`}
          onChange={(_, val) => setLocalVal(val)}
          onChangeCommitted={(_, val) => onFilterChange(fc.key, val)}
          sx={{
            color: "#ff8c00",
            height: 4,
            "& .MuiSlider-thumb": {
              width: 16,
              height: 16,
              "&:hover, &.Mui-focusVisible": {
                boxShadow: "0 0 0 6px rgba(255,140,0,0.16)",
              },
            },
            "& .MuiSlider-rail": { opacity: 0.2 },
          }}
        />
      </div>
      <div className={styles["range-bounds"]}>
        <span className={styles["range-bound"]}>{fc.min ?? 0}{fc.unit || ""}</span>
        <span className={styles["range-bound"]}>{fc.max ?? 100}{fc.unit || ""}</span>
      </div>
    </div>
  );
};

const FilterPanel = ({
  filterConfig = [],
  activeFilters = {},
  sortBy = "relevant",
  onFilterChange,
  onSortChange,
  onClearAll,
  hasGeo = false,
}) => {
  const activeCount = Object.values(activeFilters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
  ).length;
  const activeControlCount = activeCount + (sortBy !== "relevant" ? 1 : 0);

  const handleMultiselectToggle = (key, option) => {
    const current = Array.isArray(activeFilters[key]) ? activeFilters[key] : [];
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    onFilterChange(key, updated.length > 0 ? updated : null);
  };

  const handleRadioClick = (key, value) => {
    onFilterChange(key, activeFilters[key] === value ? null : value);
  };

  const handleToggle = (key) => {
    onFilterChange(key, activeFilters[key] === "true" ? null : "true");
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles["header-left"]}>
          <div className={styles["header-icon"]}>
            <TuneRoundedIcon sx={{ fontSize: 15, color: "#fff" }} />
          </div>
          <span className={styles["header-title"]}>
            Filters
            {activeControlCount > 0 && (
              <span className={styles["count-badge"]}>{activeControlCount}</span>
            )}
          </span>
        </div>
        {activeControlCount > 0 && (
          <button className={styles["clear-btn"]} onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>

      {/* Sort */}
      <div className={styles.section}>
        <div className={styles["section-label"]}>Sort by</div>
        <div className={styles["sort-chips"]}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles["sort-chip"]} ${sortBy === opt.value ? styles["sort-chip-active"] : ""}`}
              onClick={() => onSortChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          {hasGeo && (
            <button
              key="nearest"
              className={`${styles["sort-chip"]} ${sortBy === "nearest" ? styles["sort-chip-active"] : ""}`}
              onClick={() => onSortChange("nearest")}
              title="Sort by distance from your location"
            >
              Nearest
            </button>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className={styles.section}>
        <div className={styles["section-label"]}>Minimum Rating</div>
        <div className={styles["rating-chips"]}>
          {RATING_OPTIONS.map((opt) => {
            const active = activeFilters.minRating === opt.value;
            return (
              <button
                key={opt.value}
                className={`${styles["rating-chip"]} ${active ? styles["rating-chip-active"] : ""}`}
                onClick={() => onFilterChange("minRating", active ? null : opt.value)}
              >
                <StarRoundedIcon sx={{ fontSize: 13, color: active ? "#fff" : "#f59e0b" }} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal toggles */}
      <div className={styles.section}>
        <div className={styles["section-label"]}>Quick Filters</div>
        <div className={styles["toggle-row"]}>
          {UNIVERSAL_TOGGLES.map(({ key, label, icon, iconBg }) => {
            const on = activeFilters[key] === "true";
            return (
              <div
                key={key}
                className={`${styles["toggle-item"]} ${on ? styles["toggle-item-active"] : ""}`}
                onClick={() => handleToggle(key)}
              >
                <div className={styles["toggle-item-left"]}>
                  <div
                    className={styles["toggle-icon-wrap"]}
                    style={{ background: iconBg }}
                  >
                    {icon}
                  </div>
                  <span className={`${styles["toggle-label"]} ${on ? styles["toggle-label-active"] : ""}`}>
                    {label}
                  </span>
                </div>
                <div className={`${styles["pill-switch"]} ${on ? styles["pill-switch-on"] : ""}`}>
                  <div className={`${styles["pill-thumb"]} ${on ? styles["pill-thumb-on"] : ""}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category-specific filters */}
      {filterConfig.map((fc) => (
        <div key={fc.key} className={styles.section}>
          <div className={styles["section-label"]}>{fc.label}</div>

          {fc.type === "multiselect" && (
            <div className={styles["tag-grid"]}>
              {(fc.options || []).map((opt) => {
                const selected =
                  Array.isArray(activeFilters[fc.key]) &&
                  activeFilters[fc.key].includes(opt);
                return (
                  <button
                    key={opt}
                    className={`${styles.tag} ${selected ? styles["tag-active"] : ""}`}
                    onClick={() => handleMultiselectToggle(fc.key, opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {fc.type === "radio" && (
            <div className={styles["radio-pills"]}>
              {(fc.options || []).map((opt) => {
                const active = activeFilters[fc.key] === opt;
                return (
                  <button
                    key={opt}
                    className={`${styles["radio-pill"]} ${active ? styles["radio-pill-active"] : ""}`}
                    onClick={() => handleRadioClick(fc.key, opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {fc.type === "toggle" && (
            <div
              className={`${styles["toggle-item"]} ${
                activeFilters[fc.key] === true || activeFilters[fc.key] === "true"
                  ? styles["toggle-item-active"]
                  : ""
              }`}
              onClick={() =>
                onFilterChange(
                  fc.key,
                  activeFilters[fc.key] === true || activeFilters[fc.key] === "true"
                    ? null
                    : true
                )
              }
            >
              <span
                className={`${styles["toggle-label"]} ${
                  activeFilters[fc.key] === true || activeFilters[fc.key] === "true"
                    ? styles["toggle-label-active"]
                    : ""
                }`}
              >
                Available
              </span>
              <div
                className={`${styles["pill-switch"]} ${
                  activeFilters[fc.key] === true || activeFilters[fc.key] === "true"
                    ? styles["pill-switch-on"]
                    : ""
                }`}
              >
                <div
                  className={`${styles["pill-thumb"]} ${
                    activeFilters[fc.key] === true || activeFilters[fc.key] === "true"
                      ? styles["pill-thumb-on"]
                      : ""
                  }`}
                />
              </div>
            </div>
          )}

          {fc.type === "range" && (
            <RangeFilter
              fc={fc}
              committedValue={activeFilters[fc.key]}
              onFilterChange={onFilterChange}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default FilterPanel;
