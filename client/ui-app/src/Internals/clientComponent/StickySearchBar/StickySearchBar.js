import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./StickySearchBar.module.css";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import {
  getAllSearchLogs,
  getBackendSuggestions,
  logSearchActivity,
  performSearch
} from "../../../redux/actions/businessListAction";
import { searchMasterLocations } from "../../../redux/actions/masterLocationAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import { selectBackendSuggestions, selectBackendSuggestionsMeta, selectSearchLogs } from "../../../redux/selectors";
import { shouldSendSearch } from "../../../utils/searchLock";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
import useMediaQuery from "../../../hooks/useMediaQuery.js";
import { useDrawer } from "../Drawer/drawerContext";

const cx = createScopedClassNames(styles);
const DEFAULT_LOCATION = "Trichy";
const SUGGESTION_PAGE_SIZE = 20;
const MASTER_LOCATION_SUGGESTION_LIMIT = 25;
const WEB_VIEW_MEDIA_QUERY = "(min-width: 769px)";
const isMongoObjectId = value => /^[a-f\d]{24}$/i.test(String(value || "").trim());
const LEVEL_DEPTH = { district: 0, zone: 1, ward: 2, locality: 3 };
const LEVEL_LABEL = { district: "District", zone: "Zone", ward: "Ward", locality: "Locality" };

const AddBusinessModel = lazy(() =>
  import(/* webpackChunkName: "otp-modal" */ "../AddBusinessModel")
);
const CategoryDropdown = lazy(() =>
  import(
    /* webpackChunkName: "category-dropdown" */ "../CategoryDropdown/CategoryDropdown"
  )
);
const DeferredCategoryDropdown = (props) => (
  <Suspense fallback={null}>
    <CategoryDropdown {...props} />
  </Suspense>
);

// Groups masterlocations search hits by name so a district/zone/ward that
// shares its exact name with a child locality (the area's namesake place)
// renders as one row with the other levels as pills, instead of several
// identical-looking rows - mirrors heroSection's masterLocationSuggestions.
const buildMasterLocationSuggestions = (locationSearchResults) => {
  if (!Array.isArray(locationSearchResults) || locationSearchResults.length === 0) return [];
  const groups = new Map();
  locationSearchResults.forEach(loc => {
    const name = loc.locality || loc.ward || loc.zone || loc.district;
    if (!name) return;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(loc);
  });
  return [...groups.values()].map(group => {
    group.sort((a, b) => (LEVEL_DEPTH[b.level] ?? 0) - (LEVEL_DEPTH[a.level] ?? 0));
    const primary = group[0];
    const name = primary.locality || primary.ward || primary.zone || primary.district;
    const contextParts = [primary.ward, primary.zone, primary.district].filter(part => part && part.toLowerCase() !== String(name).toLowerCase());
    return {
      _raw: primary,
      name,
      subLabel: [...new Set(contextParts)].join(", "),
      slug: primary.slug,
      levels: group.length > 1 ? [...group].reverse().map(loc => ({
        level: loc.level,
        label: LEVEL_LABEL[loc.level] || loc.level,
        slug: loc.slug
      })) : null
    };
  });
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
  const isWebView = useMediaQuery(WEB_VIEW_MEDIA_QUERY, true);
  // Canonical masterlocations slug of a VERIFIED LOCATIONS pick. Cleared the
  // moment the user types/picks free text - mirrors heroSection's behavior
  // and shares the same localStorage key so both search bars stay in sync.
  const [masterLocationSlug, setMasterLocationSlug] = useState(() => localStorage.getItem("selectedLocationSlug") || "");

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
  const { locationSearchResults = [] } = useSelector(state => state.masterLocationReducer) || {};
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
    dispatch(searchMasterLocations(debouncedLocation.trim(), MASTER_LOCATION_SUGGESTION_LIMIT));
  }, [debouncedLocation, dispatch, isSelectingLocation]);

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

  const masterLocationSuggestions = buildMasterLocationSuggestions(locationSearchResults);

  const handleSearchFocus = () => {
    setIsFocused(true);
    setIsCategoryDropdownOpen(true);
  };

  const handleLocationChange = (loc) => {
    const chosen = typeof loc === "string" ? loc : (loc?.name || String(loc));
    setLocationName(chosen);
    // Verified picks carry the canonical slug; legacy text suggestions
    // don't and clear any previous one - shared with heroSection.
    const slug = typeof loc === "object" && loc?.slug ? loc.slug : "";
    setMasterLocationSlug(slug);
    if (slug) localStorage.setItem("selectedLocationSlug", slug);
    else localStorage.removeItem("selectedLocationSlug");
    setIsSelectingLocation(false);
    setIsFocused(false);
    setLocationInput("");
    handleSearch(undefined, undefined, chosen, slug);
  };

  const handleSelectCategory = (val) => {
    const chosen = typeof val === "string" ? val : String(val);
    setSearchTerm(chosen);
    propSetCategoryName?.(chosen);
    setIsCategoryDropdownOpen(false);
    handleSearch(undefined, chosen);
  };

  const handleSearch = async (event, selectedTerm, selectedLocation, selectedLocationSlug) => {
    event?.preventDefault?.();
    const searchInput = (selectedTerm ?? searchTerm).trim();
    const location = ((selectedLocation ?? locationName) || DEFAULT_LOCATION).trim();
    const locationSlug = selectedLocationSlug ?? masterLocationSlug;

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
      masterLocationSlug: locationSlug,
      navigate,
      dispatch,
      isKnownCategory: false,
      results,
      logAlreadySent: logSent,
      userDetails
    });
  };

  const goHome = () => navigate("/");
  const loggedIn = Boolean(localStorage.getItem("authToken"));
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
              <button
                type="button"
                className={cx("logo-button")}
                onClick={goHome}
                aria-label="Go to Massclick home"
                title="Go to Home Page"
              >
                <img src="/apple-touch-icon.png" alt="Massclick home" className={cx("logo-image")} width="48" height="48" decoding="async" />
              </button>
            </div>
            <div className={cx("brandingText")}>
              <button type="button" className={cx("logo-button", "logo-button--brand")} onClick={goHome} aria-label="Go to Massclick home">
                <img src="/Massclick-India01.svg" alt="Massclick India" className={cx("brandLogo")} width="180" height="44" decoding="async" loading="eager" />
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
                  setMasterLocationSlug("");
                  localStorage.removeItem("selectedLocationSlug");
                  setIsSelectingLocation(true);
                  setIsCategoryDropdownOpen(false);
                }}
                onFocus={() => {
                  setIsSelectingLocation(true);
                  setIsCategoryDropdownOpen(false);
                }}
              />
              {isSelectingLocation && (
                <DeferredCategoryDropdown sections={[{
                  label: "VERIFIED LOCATIONS",
                  options: masterLocationSuggestions,
                  onSelect: handleLocationChange
                }, {
                  label: "LOCATIONS",
                  options: parsedLocationSuggestions,
                  onSelect: handleLocationChange,
                  onReachEnd: () => maybeLoadMoreSuggestions(locationName.trim()),
                  hasMore: backendSuggestionsHasMore && backendSuggestionsQuery === locationName.trim(),
                  isLoadingMore: backendSuggestionsLoading && backendSuggestionsQuery === locationName.trim()
                }]} />
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
                <DeferredCategoryDropdown
                  label="RECENT SEARCHES"
                  options={recentSearchOptions}
                  onSelect={handleSelectCategory}
                />
              )}
              {isCategoryDropdownOpen && searchTerm.trim().length >= 2 && (
                <DeferredCategoryDropdown
                  label="SUGGESTIONS"
                  options={suggestionCategories}
                  onReachEnd={() => maybeLoadMoreSuggestions(searchTerm.trim())}
                  hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === searchTerm.trim()}
                  onSelect={handleSelectCategory}
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

          <div className={cx("header-actions")}>
            {!loggedIn ? (
              <button
                type="button"
                className={cx("login-button")}
                onClick={handleOpenModal}
              >
                <LoginIcon fontSize="small" />
                Login / Sign Up
              </button>
            ) : (
              <button
                type="button"
                className={cx("user-menu-button")}
                onClick={openDrawer}
                aria-label="Open user menu"
              >
                <AccountCircleIcon sx={{ fontSize: 28 }} />
              </button>
            )}
          </div>
        </header>

        {isModalOpen && (
          <Suspense fallback={null}>
            <AddBusinessModel open={true} handleClose={handleCloseModal} />
          </Suspense>
        )}
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
        <DeferredCategoryDropdown sections={[{
          label: "VERIFIED LOCATIONS",
          options: masterLocationSuggestions,
          onSelect: handleLocationChange
        }, {
          label: "LOCATIONS",
          options: parsedLocationSuggestions,
          onSelect: handleLocationChange,
          isLoadingMore: backendSuggestionsLoading
        }]} />
      )}

      {isCategoryDropdownOpen && isFocused && !isSelectingLocation && searchTerm.trim().length >= 1 && (
        <DeferredCategoryDropdown
          label="SUGGESTIONS"
          options={suggestionCategories}
          onSelect={handleSelectCategory}
          isLoadingMore={backendSuggestionsLoading}
        />
      )}
    </div>
  );
};

export default StickySearchBar;
