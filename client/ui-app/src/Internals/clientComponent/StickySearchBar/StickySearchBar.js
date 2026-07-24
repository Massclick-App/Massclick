import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./StickySearchBar.module.css";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ApartmentIcon from "@mui/icons-material/Apartment";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import {
  getAllSearchLogs,
  getBackendSuggestions,
  logSearchActivity,
  performSearch
} from "../../../redux/actions/businessListAction";
import { searchMasterLocations, getPublicDistricts } from "../../../redux/actions/masterLocationAction";
import { detectDistrict } from "../../../redux/actions/locationAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import { selectBackendSuggestions, selectBackendSuggestionsMeta, selectSearchLogs } from "../../../redux/selectors";
import { shouldSendSearch } from "../../../utils/searchLock";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
import { DEFAULT_DISTRICT, matchCanonicalDistrict } from "../../../utils/districtDefaults.js";
import useMediaQuery from "../../../hooks/useMediaQuery.js";
import { useDrawer } from "../Drawer/drawerContext";

const cx = createScopedClassNames(styles);
const SUGGESTION_PAGE_SIZE = 20;
const MASTER_LOCATION_SUGGESTION_LIMIT = 25;
const WEB_VIEW_MEDIA_QUERY = "(min-width: 769px)";
const isMongoObjectId = value => /^[a-f\d]{24}$/i.test(String(value || "").trim());
const LEVEL_DEPTH = { district: 0, zone: 1, ward: 2, locality: 3 };

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
// renders as one row instead of several identical-looking ones. The
// broadest (highest) level present in the group is auto-picked as the
// match - mirrors heroSection's masterLocationSuggestions.
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
    group.sort((a, b) => (LEVEL_DEPTH[a.level] ?? 0) - (LEVEL_DEPTH[b.level] ?? 0));
    const primary = group[0];
    const name = primary.locality || primary.ward || primary.zone || primary.district;
    const contextParts = [primary.ward, primary.zone, primary.district].filter(part => part && part.toLowerCase() !== String(name).toLowerCase());
    return {
      _raw: primary,
      name,
      subLabel: [...new Set(contextParts)].join(", "),
      slug: primary.slug
    };
  });
};

const StickySearchBar = ({
  isScrolled = true,
  district: propDistrict,
  setDistrict: propSetDistrict,
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

  const [internalDistrict, setInternalDistrict] = useState(localStorage.getItem("selectedDistrict") || DEFAULT_DISTRICT);
  const [internalLocationName, setInternalLocationName] = useState(localStorage.getItem("selectedLocation") || localStorage.getItem("selectedDistrict") || DEFAULT_DISTRICT);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Raw geolocation-detected district text, resolved to a real dropdown
  // value once the canonical district list (below) has loaded.
  const [geoDetectedDistrict, setGeoDetectedDistrict] = useState(null);
  const isWebView = useMediaQuery(WEB_VIEW_MEDIA_QUERY, true);
  // Canonical masterlocations slug of a VERIFIED LOCATIONS pick. Cleared the
  // moment the user types/picks free text - mirrors heroSection's behavior
  // and shares the same localStorage key so both search bars stay in sync.
  const [masterLocationSlug, setMasterLocationSlug] = useState(() => localStorage.getItem("selectedLocationSlug") || "");

  const district = propDistrict ?? internalDistrict;
  const setDistrict = propSetDistrict ?? setInternalDistrict;
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
  const { locationSearchResults = [], districts = [], districtsLoading = false } = useSelector(state => state.masterLocationReducer) || {};
  const locationSuggestionQuery = isWebView ? locationName : locationInput;
  const normalizeComparable = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  const hasPendingSearch = normalizeComparable(committedSearchTerm) !== normalizeComparable(searchTerm) || normalizeComparable(committedLocationName || district) !== normalizeComparable(locationName || district);

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

  // Fetch the full district list once, shared across both search bars via
  // redux (heroSection reads the same slice instead of re-fetching).
  useEffect(() => {
    if (districts.length > 0 || districtsLoading) return;
    dispatch(getPublicDistricts());
  }, [dispatch, districts.length, districtsLoading]);

  // Auto-detect the district by geolocation on first visit (no saved
  // district yet), same as heroSection. Only runs when this bar owns its
  // own district state (e.g. rendered standalone on non-home pages) -
  // when controlled by a parent (home.js + heroSection on the homepage),
  // the parent already resolves it and running this here would fire a
  // second geolocation prompt for the same shared value.
  useEffect(() => {
    if (propDistrict !== undefined) return undefined;
    if (localStorage.getItem("selectedDistrict")) return undefined;
    if (!navigator.geolocation) return undefined;

    const idleHandle = scheduleIdleCallback(() => {
      navigator.geolocation.getCurrentPosition(async ({ coords }) => {
        try {
          const result = await dispatch(detectDistrict({
            latitude: coords.latitude,
            longitude: coords.longitude
          }));
          const detected = String(result?.district || "").trim();
          if (detected && detected.toLowerCase() !== "all districts") {
            setGeoDetectedDistrict(detected);
          }
        } catch {
          // Keep the DEFAULT_DISTRICT already in state on failure.
        }
      }, () => {
        // Permission denied/unavailable - keep the DEFAULT_DISTRICT already in state.
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    }, { timeout: 2500 });

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }
      window.clearTimeout(idleHandle);
    };
  }, [dispatch, propDistrict]);

  // Once both the detected text and the canonical district list are ready,
  // resolve the match and apply it to district + the locality box (which
  // mirrors the district until the user types something more specific).
  useEffect(() => {
    if (!geoDetectedDistrict || districts.length === 0) return;
    const matched = matchCanonicalDistrict(geoDetectedDistrict, districts) || DEFAULT_DISTRICT;
    setDistrict(matched);
    setLocationName(matched);
    localStorage.setItem("selectedDistrict", matched);
    localStorage.setItem("selectedLocation", matched);
    setGeoDetectedDistrict(null);
  }, [geoDetectedDistrict, districts, setDistrict, setLocationName]);

  // Keep locationReducer.selectedDistrict (read by the below-hero sections -
  // trendingSearch, popularSearch, topTourist, popularCategories,
  // serviceCard, featureService) in sync with the district dropdown.
  // Declared (and therefore committed) before the locationName-persist
  // effect below: the reducer itself writes localStorage["selectedLocation"]
  // as a side effect (see locationReducer.js), and effects run in
  // declaration order, so the locationName effect always has the last word
  // and a saved specific locality never gets clobbered back to the district.
  useEffect(() => {
    localStorage.setItem("selectedDistrict", district);
    dispatch({ type: "SET_SELECTED_DISTRICT", payload: district });
  }, [dispatch, district]);

  useEffect(() => {
    localStorage.setItem("selectedLocation", locationName);
  }, [locationName]);

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
    dispatch(searchMasterLocations(debouncedLocation.trim(), MASTER_LOCATION_SUGGESTION_LIMIT, district));
  }, [debouncedLocation, dispatch, isSelectingLocation, district]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setIsFocused(false);
        setIsCategoryDropdownOpen(false);
        setIsSelectingLocation(false);
        setShowDistrictDropdown(false);
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

  const handleDistrictChange = (value) => {
    setDistrict(value);
    localStorage.setItem("selectedDistrict", value);
    // Changing district resets the locality box back to the district's own
    // name - same starting point as a fresh geo-detect/default, typing
    // narrows it further from there.
    setLocationName(value);
    localStorage.setItem("selectedLocation", value);
    setMasterLocationSlug("");
    localStorage.removeItem("selectedLocationSlug");
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
    const location = ((selectedLocation ?? locationName) || district).trim();
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
                placeholder="Search for a location..."
                value={locationName === district ? "" : locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  setMasterLocationSlug("");
                  localStorage.removeItem("selectedLocationSlug");
                  setIsSelectingLocation(true);
                  setShowDistrictDropdown(false);
                  setIsCategoryDropdownOpen(false);
                }}
                onFocus={() => {
                  setIsSelectingLocation(true);
                  setShowDistrictDropdown(false);
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

              <span className={cx("field-divider-web")} aria-hidden="true" />

              <button
                type="button"
                className={cx("district-trigger-web", showDistrictDropdown && "district-trigger-web--open")}
                aria-haspopup="listbox"
                aria-expanded={showDistrictDropdown}
                aria-controls="district-options-web"
                onClick={() => {
                  setShowDistrictDropdown(open => !open);
                  setIsSelectingLocation(false);
                }}
              >
                <ApartmentIcon className={cx("district-trigger-icon")} />
                <span className={cx("district-trigger-text")}>{district || "Select district"}</span>
                <KeyboardArrowDownIcon className={cx("district-trigger-chevron")} />
              </button>

              {showDistrictDropdown && (
                <DeferredCategoryDropdown
                  id="district-options-web"
                  label="SELECT DISTRICT"
                  options={districts}
                  onSelect={value => {
                    handleDistrictChange(value);
                    setShowDistrictDropdown(false);
                  }}
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
          <div className={cx("mobile-location-group")}>
            <button
              type="button"
              className={cx("district-trigger-mobile", showDistrictDropdown && "district-trigger-mobile--open")}
              aria-haspopup="listbox"
              aria-expanded={showDistrictDropdown}
              aria-controls="district-options-mobile"
              onClick={() => setShowDistrictDropdown(open => !open)}
            >
              <ApartmentIcon className={cx("district-trigger-icon")} />
              <span className={cx("district-trigger-text")}>{district || "Select district"}</span>
              <KeyboardArrowDownIcon className={cx("district-trigger-chevron")} />
            </button>
            {showDistrictDropdown && (
              <DeferredCategoryDropdown
                id="district-options-mobile"
                label="SELECT DISTRICT"
                options={districts}
                onSelect={value => {
                  handleDistrictChange(value);
                  setShowDistrictDropdown(false);
                }}
              />
            )}

            <div className={cx("search-input-wrapper")}>
              <LocationOnIcon className={cx("search-input-icon location-icon")} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search location..."
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onFocus={() => {
                  setIsFocused(true);
                  setShowDistrictDropdown(false);
                }}
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

      {isSelectingLocation && isFocused && !showDistrictDropdown && (
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
