import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./StickySearchBar.module.css";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import CloseIcon from "@mui/icons-material/Close";
import { getBackendSuggestions } from "../../../redux/actions/businessListAction";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";

const cx = createScopedClassNames(styles);
const DEFAULT_LOCATION = "Trichy";
const SUGGESTION_PAGE_SIZE = 10;
const isMongoObjectId = value => /^[a-f\d]{24}$/i.test(String(value || "").trim());

const Dropdown = ({
  label,
  options,
  onSelect,
  onReachEnd,
  hasMore = false,
  isLoadingMore = false,
  type = "suggestion"
}) => {
  const MAX_HEIGHT_PX = 240;
  const getOptionLabel = option => {
    if (typeof option === "string") return option;
    if (!option || typeof option !== "object") return "";
    return String(option.category || option.categoryName || option.businessName || option.location || option.locationName || option.name || "").trim();
  };

  const visibleOptions = (options || []).filter(option => {
    const displayText = getOptionLabel(option);
    return displayText && !isMongoObjectId(displayText);
  });

  const handleScroll = event => {
    if (!onReachEnd || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= 24) {
      onReachEnd();
    }
  };

  if (visibleOptions.length === 0) return null;

  return (
    <div className={cx("dropdown", `dropdown--${type}`)}>
      <div className={cx("dropdown-label")}>{label}</div>
      <div className={cx("dropdown-list")} style={{ maxHeight: `${MAX_HEIGHT_PX}px` }} onScroll={handleScroll}>
        {visibleOptions.map((option, index) => {
          const displayText = getOptionLabel(option);
          return (
            <div key={index} className={cx("dropdown-item")} onClick={() => onSelect(option)}>
              {label.toLowerCase().includes("location") ? (
                <LocationOnIcon className={cx("dropdown-icon")} />
              ) : label === "RECENT SEARCHES" ? (
                <HistoryToggleOffIcon className={cx("dropdown-icon")} />
              ) : (
                <SearchIcon className={cx("dropdown-icon")} />
              )}
              <span className={cx("dropdown-text")}>{displayText}</span>
              {label === "RECENT SEARCHES" && typeof option !== "string" && (option.category || option.categoryName) && (
                <span className={cx("dropdown-meta")}>{option.category || option.categoryName}</span>
              )}
            </div>
          );
        })}
        {isLoadingMore && (
          <div className={cx("dropdown-item")}>
            <span className={cx("dropdown-text")}>Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StickySearchBar = ({
  isScrolled = true,
  locationName: propLocationName,
  setLocationName: propSetLocationName,
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  setCategoryName: propSetCategoryName,
  committedLocationName,
  committedSearchTerm,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const barRef = useRef(null);

  const [internalLocationName, setInternalLocationName] = useState(localStorage.getItem("selectedLocation") || DEFAULT_LOCATION);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const locationName = propLocationName ?? internalLocationName;
  const setLocationName = propSetLocationName ?? setInternalLocationName;
  const searchTerm = propSearchTerm ?? internalSearchTerm;
  const setSearchTerm = propSetSearchTerm ?? setInternalSearchTerm;

  const backendSuggestions = useSelector(state => state.businessListReducer?.backendSuggestions || []);
  const backendSuggestionsLoading = useSelector(state => state.businessListReducer?.backendSuggestionsLoading || false);

  useEffect(() => {
    localStorage.setItem("selectedLocation", locationName);
    dispatch({ type: "SET_SELECTED_DISTRICT", payload: locationName });
  }, [dispatch, locationName]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm || ""), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!isCategoryDropdownOpen || !debouncedSearch.trim()) return;
    dispatch(getBackendSuggestions({
      search: debouncedSearch.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [debouncedSearch, dispatch, isCategoryDropdownOpen]);

  useEffect(() => {
    if (!isSelectingLocation || !locationInput.trim()) return;
    dispatch(getBackendSuggestions({
      search: locationInput.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [locationInput, dispatch, isSelectingLocation]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setIsFocused(false);
        setIsCategoryDropdownOpen(false);
        setIsSelectingLocation(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestionCategories = (() => {
    if (!backendSuggestions.length) return [];
    const seen = new Set();
    const list = [];
    backendSuggestions.forEach(item => {
      const val = item.category;
      if (!val) return;
      const text = String(val).trim();
      if (!text || isMongoObjectId(text)) return;
      const key = text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(text);
      }
    });
    return list;
  })();

  const parsedLocationSuggestions = (() => {
    if (!backendSuggestions.length) return [];
    const seen = new Set();
    const list = [];
    backendSuggestions.forEach(item => {
      [item.location, item.locationDetails, item.street, item.pincode].forEach(loc => {
        if (!loc) return;
        const text = String(loc).trim();
        if (!text || isMongoObjectId(text)) return;
        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(text);
        }
      });
    });
    return list;
  })();

  const handleSearchFocus = () => {
    setIsFocused(true);
    setIsCategoryDropdownOpen(true);
  };

  const handleLocationChange = (loc) => {
    const chosen = typeof loc === "string" ? loc : String(loc);
    setLocationName(chosen);
    setIsSelectingLocation(false);
    setIsFocused(false);
    setLocationInput("");
  };

  const handleSelectCategory = (val) => {
    const chosen = typeof val === "string" ? val : String(val);
    setSearchTerm(chosen);
    propSetCategoryName?.(chosen);
    setIsCategoryDropdownOpen(false);
  };

  if (!isScrolled) return null;

  return (
    <div ref={barRef} className={cx("sticky-search-container")}>
      <header className={cx("sticky-search-bar", isFocused && "sticky-search-bar--focused")}>
        {isFocused && !isSelectingLocation && (
          <div className={cx("location-display")}>
            <LocationOnIcon className={cx("location-display-icon")} />
            <span className={cx("location-display-text")}>{locationName}</span>
            <button
              className={cx("location-display-btn")}
              onClick={() => setIsSelectingLocation(true)}
            >
              Change
            </button>
          </div>
        )}

        {isSelectingLocation ? (
          <div className={cx("search-input-wrapper")}>
            <LocationOnIcon className={cx("search-input-icon location-icon")} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search location..."
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyPress={e => e.key === "Enter" && locationInput && handleLocationChange(locationInput)}
              className={cx("search-input")}
              autoFocus
            />
            <button
              className={cx("location-back-btn")}
              onClick={() => {
                setIsSelectingLocation(false);
                setLocationInput("");
              }}
              aria-label="Back to search"
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className={cx("search-input-wrapper")}>
            <SearchIcon className={cx("search-input-icon")} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isFocused ? "Search for services, businesses..." : "Search..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              onKeyPress={e => e.key === "Enter" && handleSelectCategory(searchTerm)}
              className={cx("search-input")}
            />
            {searchTerm && (
              <button
                className={cx("search-input-clear")}
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}
      </header>

      {isSelectingLocation && isFocused && (
        <Dropdown
          label="LOCATIONS"
          options={parsedLocationSuggestions}
          onSelect={handleLocationChange}
          type="location"
          isLoadingMore={backendSuggestionsLoading}
        />
      )}

      {isCategoryDropdownOpen && isFocused && !isSelectingLocation && searchTerm.trim().length >= 1 && (
        <Dropdown
          label="SUGGESTIONS"
          options={suggestionCategories}
          onSelect={handleSelectCategory}
          type="suggestion"
          isLoadingMore={backendSuggestionsLoading}
        />
      )}
    </div>
  );
};

export default StickySearchBar;
