import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./CardsSearch.module.css";
import LoginIcon from "@mui/icons-material/Login";
import { getAllSearchLogs, getBackendSuggestions, performSearch, logSearchActivity } from "../../../redux/actions/businessListAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import Tooltip from "@mui/material/Tooltip";
import { categoryBarHelpers } from "../categoryBar";
import { Box, Button, IconButton } from "@mui/material";
import { selectSearchLogs, selectBackendSuggestions, selectBackendSuggestionsMeta } from "../../../redux/selectors";
import MicIcon from "@mui/icons-material/Mic";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import AddBusinessModel from "../AddBusinessModel";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useDrawer } from "../Drawer/drawerContext";
import { shouldSendSearch } from "../../../utils/searchLock";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
const cx = createScopedClassNames(styles);
const DEFAULT_LOCATION = "Trichy";
const SUGGESTION_PAGE_SIZE = 10;
const isMongoObjectId = value => /^[a-f\d]{24}$/i.test(String(value || "").trim());
const CategoryDropdown = ({
  label,
  options,
  onSelect,
  onReachEnd,
  hasMore = false,
  isLoadingMore = false
}) => {
  const MAX_HEIGHT_PX = 220;
  const getOptionLabel = option => {
    if (typeof option === "string") return option;
    if (!option || typeof option !== "object") return "";
    return String(option.category || option.categoryName || option.businessName || option.location || option.locationName || option.name || "").trim();
  };
  const visibleOptions = (options || []).filter(option => {
    const label = getOptionLabel(option);
    return label && !isMongoObjectId(label);
  });
  const handleScroll = event => {
    if (!onReachEnd || !hasMore || isLoadingMore) return;
    const {
      scrollTop,
      scrollHeight,
      clientHeight
    } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= 24) {
      onReachEnd();
    }
  };
  if (visibleOptions.length === 0) return null;
  return <div className={cx("category-custom-dropdown")}>
      <div className={cx("trending-label")}>{label}</div>
      <div className={cx("options-list-container")} style={{
      maxHeight: `${MAX_HEIGHT_PX}px`
    }} onScroll={handleScroll}>
        {visibleOptions.map((option, index) => {
        const displayText = getOptionLabel(option);
        return <div key={index} className={cx("option-item")} onClick={() => onSelect(option)}>
              {label.toLowerCase().includes("location") ? <LocationOnIcon className={cx("option-icon")} /> : label === "RECENT SEARCHES" ? <HistoryToggleOffIcon className={cx("option-icon")} /> : <SearchIcon className={cx("option-icon")} />}
              <span className={cx("option-text-main")}>{displayText}</span>
              {label === "RECENT SEARCHES" && typeof option !== "string" && (option.category || option.categoryName) && <span className={cx("option-text-sub")}>{option.category || option.categoryName}</span>}
            </div>;
      })}
        {isLoadingMore && <div className={cx("option-item")}>
            <span className={cx("option-text-main")}>Loading more...</span>
          </div>}
      </div>
    </div>;
};
const CardsSearch = ({
  isScrolled = true,
  locationName: propLocationName,
  setLocationName: propSetLocationName,
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  setCategoryName: propSetCategoryName,
  committedLocationName,
  committedSearchTerm,
  setSearchResults
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    openDrawer
  } = useDrawer();
  const searchLogs = useSelector(selectSearchLogs);
  const backendSuggestions = useSelector(selectBackendSuggestions);
  const {
    loading: backendSuggestionsLoading,
    hasMore: backendSuggestionsHasMore,
    page: backendSuggestionsPage,
    query: backendSuggestionsQuery
  } = useSelector(selectBackendSuggestionsMeta);
  const [internalLocationName, setInternalLocationName] = useState(localStorage.getItem("selectedLocation") || DEFAULT_LOCATION);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const locationName = propLocationName ?? internalLocationName;
  const setLocationName = propSetLocationName ?? setInternalLocationName;
  const searchTerm = propSearchTerm ?? internalSearchTerm;
  const setSearchTerm = propSetSearchTerm ?? setInternalSearchTerm;
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const categoryRef = useRef(null);
  const locationRef = useRef(null);
  const headerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
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
    const nextLocation = String(locationName || "").trim() || DEFAULT_LOCATION;
    localStorage.setItem("selectedLocation", nextLocation);
    dispatch({
      type: "SET_SELECTED_DISTRICT",
      payload: nextLocation
    });
  }, [dispatch, locationName]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm || ""), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationName || ""), 200);
    return () => clearTimeout(t);
  }, [locationName]);
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
    if (!isCategoryDropdownOpen) return;
    dispatch(getBackendSuggestions({
      search: debouncedSearch.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [debouncedSearch, dispatch, isCategoryDropdownOpen]);
  useEffect(() => {
    if (!isLocationDropdownOpen) return;
    dispatch(getBackendSuggestions({
      search: debouncedLocation.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [debouncedLocation, dispatch, isLocationDropdownOpen]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    const headerNode = headerRef.current;
    if (!headerNode) return undefined;

    const rootStyle = document.documentElement.style;
    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (!entry) return;
        const nextHeight = Math.ceil(entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height || 0);
        if (nextHeight > 0) {
          rootStyle.setProperty("--cards-search-height", `${nextHeight}px`);
        }
      });
      resizeObserver.observe(headerNode);
    }

    return () => {
      resizeObserver?.disconnect();
      rootStyle.removeProperty("--cards-search-height");
    };
  }, []);
  const capitalizeWords = str => str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const categoryOptions = [...new Set((searchLogs || []).map(log => log.categoryName ? capitalizeWords(log.categoryName) : "").filter(value => value && !isMongoObjectId(value)))];
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
      const locFields = [item.location, item.locationDetails, item.street, item.plotNumber, item.pincode];
      locFields.forEach(loc => {
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
  const handleSearch = async e => {
    e?.preventDefault?.();
    const searchInput = searchTerm.trim();
    const location = (locationName || DEFAULT_LOCATION).trim();
    if (!locationName?.trim()) {
      setLocationName(location);
    }

    // Always send user input as term, not category
    // Category should only be sent if explicitly selected from dropdown
    const response = await dispatch(performSearch(searchInput, location));
    const results = response?.payload || [];
    setSearchResults?.(results);
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
        ? results.results.map((business) => business?._id).filter(Boolean)
        : Array.isArray(results)
          ? results.map((business) => business?._id).filter(Boolean)
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

    // Use centralized navigation with normalized data
    navigateToSearchResult({
      searchTerm: searchInput,
      location: location,
      navigate,
      dispatch,
      isKnownCategory: false,
      // User typed search - use flexible term search
      results,
      logAlreadySent: logSent,
      userDetails
    });
  };
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const goHome = () => navigate("/");
  const loggedIn = categoryBarHelpers.checkLogin();
  return <>
      <header ref={headerRef} className={cx("search-header")} style={{
      backdropFilter: "blur(8px)",
      visibility: isScrolled ? 'visible' : 'hidden',
      display: isScrolled ? 'block' : 'none'
    }}>
        <div className={cx("search-header-content")}>

          <div className={cx("logo-section")}>
            <div className={cx("logo-circle")}>
              <Tooltip title="Go to Home Page" arrow>
                <button type="button" className={cx("logo-button")} onClick={goHome} aria-label="Go to Massclick home">
                  <img src="/apple-touch-icon.png" alt="Massclick home" className={cx("logo-image")} width="48" height="48" decoding="async" />
                </button>
              </Tooltip>
            </div>
            <div className={cx("brandingText")}>
              <button type="button" className={cx("logo-button logo-button--brand")} onClick={goHome} aria-label="Go to Massclick home">
                <img src="/Massclick-India.webp" alt="Massclick India" className={cx("brandLogo")} width="180" height="44" decoding="async" fetchPriority="high" loading="eager" />
              </button>
            </div>
          </div>

          <div className={cx("search-area")}>

            <div className={cx("cards-input-group cards-location-group")} ref={locationRef}>
              <LocationOnIcon className={cx("input-adornment start")} />
              <input className={cx("cards-custom-input")} placeholder="Enter location manually..." value={locationName} onChange={e => {
              setLocationName(e.target.value);
              setIsLocationDropdownOpen(true);
              setIsCategoryDropdownOpen(false);
            }} onFocus={() => {
              setIsLocationDropdownOpen(true);
              setIsCategoryDropdownOpen(false);
            }} />

              {isLocationDropdownOpen && locationName.trim().length >= 1 && <CategoryDropdown label="LOCATION SUGGESTIONS" options={parsedLocationSuggestions} onReachEnd={() => maybeLoadMoreSuggestions(locationName.trim())} hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === locationName.trim()} isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === locationName.trim()} onSelect={val => {
              const chosen = typeof val === "string" ? val : String(val);
              setLocationName(chosen);
              setIsLocationDropdownOpen(false);
              document.activeElement.blur();
            }} />}
            </div>

            <div className={cx("cards-input-group cards-search-group")} ref={categoryRef}>
              <input className={cx("cards-custom-input")} placeholder="Search for..." value={searchTerm} onChange={e => {
              setSearchTerm(e.target.value);
              propSetCategoryName?.(e.target.value);
              setIsCategoryDropdownOpen(true);
              setIsLocationDropdownOpen(false);
            }} onFocus={() => {
              setIsCategoryDropdownOpen(true);
              setIsLocationDropdownOpen(false);
            }} />
              {isCategoryDropdownOpen && searchTerm.trim().length < 2 && <CategoryDropdown label="RECENT SEARCHES" options={categoryOptions} onSelect={val => {
              const chosen = typeof val === "string" ? val : String(val);
              setSearchTerm(chosen);
              propSetCategoryName?.(chosen);
              setIsCategoryDropdownOpen(false);
              document.activeElement.blur();
            }} />}

              {isCategoryDropdownOpen && searchTerm.trim().length >= 2 && <CategoryDropdown label="SUGGESTIONS" options={suggestionCategories} onReachEnd={() => maybeLoadMoreSuggestions(searchTerm.trim())} hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === searchTerm.trim()} isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === searchTerm.trim()} onSelect={val => {
              const chosen = typeof val === "string" ? val : String(val);
              setSearchTerm(chosen);
              propSetCategoryName?.(chosen);
              setIsCategoryDropdownOpen(false);
              document.activeElement.blur();
            }} />}

              <MicIcon className={cx("input-adornment end")} aria-hidden="true" />
            </div>

            <div className={cx("search-action")}>
              <button className={cx("search-btn", hasPendingSearch && "search-btn-pending")} onClick={handleSearch} aria-label="Search" title={hasPendingSearch ? "Click search to update the listing" : "Search"}>
                <SearchIcon />
                <span>Search</span>
              </button>
              {hasPendingSearch && <span className={cx("search-hint")}>Click search to update results</span>}
            </div>
          </div>

          <Box className={cx("header-actions")} sx={{
          display: "flex",
          alignItems: "center"
        }}>
            {!loggedIn ? <Button variant="contained" startIcon={<LoginIcon />} onClick={handleOpenModal} sx={{
            background: "linear-gradient(45deg, #FF6F00, #F7941D)",
            color: "white",
            textTransform: "none",
            fontSize: {
              xs: "0.9rem",
              sm: "1rem"
            },
            borderRadius: "30px",
            px: {
              xs: 1.8,
              sm: 3.5
            },
            py: {
              xs: 1,
              sm: 1.2
            },
            whiteSpace: "nowrap",
            minWidth: {
              xs: "auto",
              sm: "unset"
            },
            boxShadow: "0 10px 30px rgba(255, 123, 0, 0.4)",
            transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
            "&:hover": {
              background: "linear-gradient(45deg, #cc5a0f, #ff8a2d)",
              boxShadow: "0 15px 40px rgba(255, 123, 0, 0.5)"
            }
          }}>
                <Box component="span" sx={{
              display: {
                xs: "none",
                sm: "inline"
              }
            }}>
                  Login / Sign Up
                </Box>
              </Button> : <IconButton onClick={openDrawer} aria-label="Open user menu">
                <AccountCircleIcon sx={{
              fontSize: 28
            }} />
              </IconButton>}
          </Box>
        </div>

        <AddBusinessModel open={isModalOpen} handleClose={handleCloseModal} />
      </header>
    </>;
};
export default CardsSearch;
