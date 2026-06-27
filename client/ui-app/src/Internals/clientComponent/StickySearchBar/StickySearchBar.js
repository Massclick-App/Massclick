import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./StickySearchBar.module.css";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import {
  getAllSearchLogs,
  getBackendSuggestions,
  logSearchActivity,
  performSearch
} from "../../../redux/actions/businessListAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import { selectBackendSuggestions, selectBackendSuggestionsMeta, selectSearchLogs } from "../../../redux/selectors";
import { shouldSendSearch } from "../../../utils/searchLock";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { useDrawer } from "../Drawer/drawerContext";
import { categoryBarHelpers } from "../categoryBar";
import AddBusinessModel from "../AddBusinessModel";

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
  const { openDrawer } = useDrawer();
  const searchInputRef = useRef(null);
  const barRef = useRef(null);

  const [internalLocationName, setInternalLocationName] = useState(localStorage.getItem("selectedLocation") || DEFAULT_LOCATION);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWebView, setIsWebView] = useState(window.innerWidth > 768);

  const locationName = propLocationName ?? internalLocationName;
  const setLocationName = propSetLocationName ?? setInternalLocationName;
  const searchTerm = propSearchTerm ?? internalSearchTerm;
  const setSearchTerm = propSetSearchTerm ?? setInternalSearchTerm;
  const searchLogs = useSelector(selectSearchLogs);
  const backendSuggestions = useSelector(selectBackendSuggestions);
  const {
    loading: backendSuggestionsLoading,
    hasMore: backendSuggestionsHasMore,
    page: backendSuggestionsPage,
    query: backendSuggestionsQuery
  } = useSelector(selectBackendSuggestionsMeta);
  const locationSuggestionQuery = isWebView ? locationName : locationInput;
  const normalizeComparable = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  const hasPendingSearch = normalizeComparable(committedSearchTerm) !== normalizeComparable(searchTerm) || normalizeComparable(committedLocationName || DEFAULT_LOCATION) !== normalizeComparable(locationName || DEFAULT_LOCATION);

  const requestSuggestions = (query, {
    page = 1,
    append = false
  } = {}) => dispatch(getBackendSuggestions({
    search: query,
    page,
    limit: SUGGESTION_PAGE_SIZE,
    append
  }));

  const maybeLoadMoreSuggestions = query => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery || backendSuggestionsLoading || !backendSuggestionsHasMore) return;
    if (backendSuggestionsQuery !== normalizedQuery) return;
    requestSuggestions(normalizedQuery, {
      page: backendSuggestionsPage + 1,
      append: true
    });
  };

  useEffect(() => {
    localStorage.setItem("selectedLocation", locationName);
    dispatch({ type: "SET_SELECTED_DISTRICT", payload: locationName });
  }, [dispatch, locationName]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm || ""), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationSuggestionQuery || ""), 200);
    return () => clearTimeout(t);
  }, [locationSuggestionQuery]);

  useEffect(() => {
    const idleHandle = scheduleIdleCallback(() => {
      dispatch(getAllSearchLogs());
    }, {
      timeout: 2000
    });

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      window.clearTimeout(idleHandle);
    };
  }, [dispatch]);

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
    if (!isSelectingLocation || !debouncedLocation.trim()) return;
    dispatch(getBackendSuggestions({
      search: debouncedLocation.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [debouncedLocation, dispatch, isSelectingLocation]);

  useEffect(() => {
    const handleResize = () => setIsWebView(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const recentSearchOptions = [...new Set((searchLogs || []).map(log => log.categoryName ? String(log.categoryName).trim() : "").filter(value => value && !isMongoObjectId(value)))];

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

  const handleSearch = async event => {
    event?.preventDefault?.();
    const searchInput = searchTerm.trim();
    const location = (locationName || DEFAULT_LOCATION).trim();

    if (!searchInput) {
      setIsCategoryDropdownOpen(true);
      searchInputRef.current?.focus();
      return;
    }

    if (!locationName?.trim()) {
      setLocationName(location);
    }

    propSetCategoryName?.(searchInput);
    setIsCategoryDropdownOpen(false);
    setIsSelectingLocation(false);
    setIsFocused(false);

    const response = await dispatch(performSearch(searchInput, location));
    const results = response?.payload || [];
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userId = authUser?._id;
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    const logLocation = location || "Global";
    const logValue = searchInput || "All Categories";

    if (userId && searchInput) {
      dispatch(logUserSearch(userId, searchInput, logLocation, logValue));
    }

    const key = `${logValue}-${location}-${userDetails.mobileNumber1}`;
    const logSent = shouldSendSearch(key);

    if (logSent) {
      const matchedBusinessIds = Array.isArray(results?.results)
        ? results.results.map(business => business?._id).filter(Boolean)
        : Array.isArray(results)
          ? results.map(business => business?._id).filter(Boolean)
          : [];

      dispatch(
        logSearchActivity(
          "",
          location,
          userDetails,
          searchInput,
          false,
          matchedBusinessIds
        )
      );
    }

    navigateToSearchResult({
      searchTerm: searchInput,
      location,
      navigate,
      dispatch,
      isKnownCategory: false,
      results,
      logAlreadySent: logSent,
      userDetails
    });
  };

  const goHome = () => navigate("/");
  const loggedIn = categoryBarHelpers.checkLogin();
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  if (!isScrolled) return null;

  // Web view layout
  if (isWebView) {
    return (
      <div ref={barRef} className={cx("sticky-search-container", "web-view")}>
        <header className={cx("sticky-search-bar", "web-header")}>
          <div className={cx("logo-section")}>
            <div className={cx("logo-circle")}>
              <Tooltip title="Go to Home Page" arrow>
                <button type="button" className={cx("logo-button")} onClick={goHome} aria-label="Go to Massclick home">
                  <img src="/apple-touch-icon.png" alt="Massclick home" className={cx("logo-image")} width="48" height="48" decoding="async" />
                </button>
              </Tooltip>
            </div>
            <div className={cx("brandingText")}>
              <button type="button" className={cx("logo-button", "logo-button--brand")} onClick={goHome} aria-label="Go to Massclick home">
                <img src="/Massclick-India.webp" alt="Massclick India" className={cx("brandLogo")} width="180" height="44" decoding="async" loading="eager" />
              </button>
            </div>
          </div>

          <form className={cx("search-area")} onSubmit={handleSearch}>
            <div className={cx("cards-input-group", "cards-location-group")}>
              <LocationOnIcon className={cx("input-adornment", "start")} />
              <input
                className={cx("cards-custom-input")}
                placeholder="Enter location..."
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  setIsSelectingLocation(true);
                  setIsCategoryDropdownOpen(false);
                }}
                onFocus={() => {
                  setIsSelectingLocation(true);
                  setIsCategoryDropdownOpen(false);
                }}
              />
              {isSelectingLocation && parsedLocationSuggestions.length > 0 && (
                <Dropdown
                  label="LOCATIONS"
                  options={parsedLocationSuggestions}
                  onReachEnd={() => maybeLoadMoreSuggestions(locationName.trim())}
                  hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === locationName.trim()}
                  onSelect={handleLocationChange}
                  type="location"
                  isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === locationName.trim()}
                />
              )}
            </div>

            <div className={cx("cards-input-group", "cards-search-group")}>
              <SearchIcon className={cx("input-adornment", "start")} />
              <input
                ref={searchInputRef}
                className={cx("cards-custom-input")}
                placeholder="Type a service, then press Enter or click Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsCategoryDropdownOpen(true);
                  setIsSelectingLocation(false);
                }}
                onFocus={() => {
                  setIsCategoryDropdownOpen(true);
                  setIsSelectingLocation(false);
                }}
              />
              {isCategoryDropdownOpen && searchTerm.trim().length < 2 && (
                <Dropdown
                  label="RECENT SEARCHES"
                  options={recentSearchOptions}
                  onSelect={handleSelectCategory}
                  type="suggestion"
                />
              )}
              {isCategoryDropdownOpen && searchTerm.trim().length >= 2 && (
                <Dropdown
                  label="SUGGESTIONS"
                  options={suggestionCategories}
                  onReachEnd={() => maybeLoadMoreSuggestions(searchTerm.trim())}
                  hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === searchTerm.trim()}
                  onSelect={handleSelectCategory}
                  type="suggestion"
                  isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === searchTerm.trim()}
                />
              )}
            </div>

            <div className={cx("search-action-web")}>
              <button
                type="submit"
                className={cx("search-btn-web", hasPendingSearch && "search-btn-web--pending")}
                aria-label="Search"
                title={hasPendingSearch ? "Press Enter or click Search to update results" : "Search"}
              >
                <SearchIcon />
                <span>Search</span>
              </button>
              {hasPendingSearch && (
                <span className={cx("search-hint-web")} aria-live="polite">
                  Press Enter or click Search
                </span>
              )}
            </div>
          </form>

          <Box className={cx("header-actions")} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {!loggedIn ? (
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={handleOpenModal}
                sx={{
                  background: "linear-gradient(45deg, #FF6F00, #F7941D)",
                  color: "white",
                  textTransform: "none",
                  fontSize: "0.95rem",
                  borderRadius: "30px",
                  px: 2.5,
                  py: 0.9,
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 24px rgba(255, 123, 0, 0.35)",
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #cc5a0f, #ff8a2d)",
                    boxShadow: "0 12px 32px rgba(255, 123, 0, 0.45)",
                  },
                }}
              >
                Login / Sign Up
              </Button>
            ) : (
              <IconButton onClick={openDrawer} aria-label="Open user menu">
                <AccountCircleIcon sx={{ fontSize: 28 }} />
              </IconButton>
            )}
          </Box>
        </header>

        <AddBusinessModel open={isModalOpen} handleClose={handleCloseModal} />
      </div>
    );
  }

  // Mobile view layout (original)
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
              onKeyDown={e => e.key === "Enter" && locationInput && handleLocationChange(locationInput)}
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
              onKeyDown={e => e.key === "Enter" && handleSearch(e)}
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
