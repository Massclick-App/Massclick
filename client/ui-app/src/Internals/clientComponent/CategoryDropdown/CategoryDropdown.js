import React from "react";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./CategoryDropdown.module.css";

const cx = createScopedClassNames(styles);
const isObjectId = s => /^[a-f\d]{24}$/i.test(String(s || "").trim());
const getOptionLabel = option => {
  if (typeof option === "string") return option;
  if (!option || typeof option !== "object") return "";
  return String(
    option.category ||
    option.categoryName ||
    option.businessName ||
    option.location ||
    option.locationName ||
    option.name ||
    ""
  ).trim();
};

// Renders one or more labeled option groups inside a single positioned
// dropdown box. `sections` lets callers (e.g. location autocomplete) stack
// multiple sources for side-by-side comparison without duplicating the
// absolutely-positioned container (which would just overlap). Shared by
// heroSection and StickySearchBar so both search bars behave identically.
const CategoryDropdown = React.memo(({
  label,
  options,
  onSelect,
  onReachEnd,
  hasMore = false,
  isLoadingMore = false,
  sections
}) => {
  const MAX_HEIGHT_PX = 320;
  const resolvedSections = sections && sections.length ? sections : [{ label, options, onSelect, onReachEnd, hasMore, isLoadingMore }];
  const preparedSections = resolvedSections.map(section => ({
    ...section,
    visibleOptions: (section.options || []).filter(option => {
      const labelText = getOptionLabel(option);
      return labelText && !isObjectId(labelText);
    })
  })).filter(section => section.visibleOptions.length > 0);
  if (preparedSections.length === 0) return null;
  return (
    <div className={cx("category-custom-dropdown")} style={{ zIndex: 10000 }}>
      {preparedSections.map((section, sectionIndex) => {
        const handleScroll = event => {
          if (!section.onReachEnd || !section.hasMore || section.isLoadingMore) return;
          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
          if (scrollHeight - scrollTop - clientHeight <= 24) {
            section.onReachEnd();
          }
        };
        return (
          <div key={section.label || sectionIndex}>
            <div className={cx("trending-label")}>{section.label}</div>
            <div
              className={cx("options-list-container")}
              style={{ maxHeight: `${MAX_HEIGHT_PX}px`, overflowY: "auto" }}
              onScroll={handleScroll}
            >
              {section.visibleOptions.map((option, index) => {
                const displayText = getOptionLabel(option);
                return (
                  <div key={index} className={cx("option-item")} onClick={() => section.onSelect(option)}>
                    {(section.label || "").toLowerCase().includes("location") ? (
                      <LocationOnIcon className={cx("option-icon")} />
                    ) : section.label === "RECENT SEARCHES" ? (
                      <HistoryToggleOffIcon className={cx("option-icon")} />
                    ) : (
                      <SearchIcon className={cx("option-icon")} />
                    )}

                    <span className={cx("option-text-group")}>
                      <span className={cx("option-text-main")}>{displayText}</span>
                      {typeof option !== "string" && (option.subLabel || (section.label === "RECENT SEARCHES" && (option.category || option.categoryName))) && (
                        <span className={cx("option-text-sub")}>{option.subLabel || option.category || option.categoryName}</span>
                      )}
                    </span>
                    {typeof option !== "string" && Array.isArray(option.levels) && option.levels.length > 0 && (
                      <span className={cx("option-level-pills")}>
                        {option.levels.map(lvl => (
                          <button
                            key={lvl.slug}
                            type="button"
                            className={cx("option-level-pill")}
                            onClick={(event) => {
                              event.stopPropagation();
                              section.onSelect({ name: option.name, slug: lvl.slug });
                            }}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
              {section.isLoadingMore && (
                <div className={cx("option-item")}>
                  <span className={cx("option-text-main")}>Loading more...</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default CategoryDropdown;
