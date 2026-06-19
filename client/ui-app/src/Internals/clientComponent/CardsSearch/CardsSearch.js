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
import { selectSearchLogs, selectBackendSuggestions } from "../../../redux/selectors";
import MicIcon from "@mui/icons-material/Mic";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import MassclickIndiaLogo from "../../../assets/Massclick-India.webp";
import AddBusinessModel from "../AddBusinessModel";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useDrawer } from "../Drawer/drawerContext";
import { shouldSendSearch } from "../../../utils/searchLock";
const cx = createScopedClassNames(styles);
const DEFAULT_LOCATION = "Trichy";
const CategoryDropdown = ({
  options,
  setSearchTerm,
  closeDropdown
}) => {
  const MAX_HEIGHT_PX = 200;
  const handleOptionClick = value => {
    setSearchTerm(value);
    closeDropdown();
    document.activeElement.blur();
  };
  if (!options || options.length === 0) return null;
  return <div className={cx("category-custom-dropdown")}>
      <div className={cx("trending-label")}>RECENT SEARCHES</div>

      <div className={cx("options-list-container")} style={{
      maxHeight: `${MAX_HEIGHT_PX}px`
    }}>
        {options.map((option, index) => <div key={index} className={cx("option-item")} onClick={() => handleOptionClick(option)} style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        cursor: "pointer"
      }}>
            <HistoryToggleOffIcon style={{
          marginRight: "6px",
          color: "#ff7b00"
        }} />
            <span>{option}</span>
          </div>)}
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
  setSearchResults
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    openDrawer
  } = useDrawer();
  const searchLogs = useSelector(selectSearchLogs);
  const backendSuggestions = useSelector(selectBackendSuggestions);
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
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
    dispatch(getAllSearchLogs());
  }, [dispatch]);
  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      dispatch(getBackendSuggestions(debouncedSearch.trim()));
    }
  }, [debouncedSearch, dispatch]);
  useEffect(() => {
    if (debouncedLocation.trim().length >= 2) {
      dispatch(getBackendSuggestions(debouncedLocation.trim()));
    }
  }, [debouncedLocation, dispatch]);
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
  const capitalizeWords = str => str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const categoryOptions = [...new Set((searchLogs || []).map(log => log.categoryName ? capitalizeWords(log.categoryName) : "").filter(Boolean))];
  const suggestionCategories = (() => {
    if (!backendSuggestions.length) return [];
    const seen = new Set();
    const list = [];
    backendSuggestions.forEach(item => {
      const val = item.category;
      if (!val) return;
      const key = val.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(val);
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
        const key = loc.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(loc);
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
  const loggedIn = categoryBarHelpers.checkLogin();
  return <>
      <header className={cx("search-header")} style={{
      backdropFilter: "blur(8px)",
      visibility: isScrolled ? 'visible' : 'hidden',
      display: isScrolled ? 'block' : 'none'
    }}>
        <div className={cx("search-header-content")}>

          <div className={cx("logo-section")}>
            <div className={cx("logo-circle")}>
              <Tooltip title="Go to Home Page" arrow>
                <img src="/apple-touch-icon.png" alt="Logo" className={cx("logo-image")} onClick={() => window.location.href = "/"} />
              </Tooltip>
            </div>
            <div className={cx("brandingText")}>
              <img src={MassclickIndiaLogo} alt="Massclick India" className={cx("brandLogo")} onClick={() => window.location.href = "/"} />
            </div>
          </div>

          <div className={cx("search-area")}>

            <div className={cx("cards-input-group cards-location-group")} ref={locationRef}>
              <LocationOnIcon className={cx("input-adornment start")} />
              <input className={cx("cards-custom-input")} placeholder="Enter location manually..." value={locationName} onChange={e => {
              setLocationName(e.target.value);
              setIsLocationDropdownOpen(true);
            }} onFocus={() => setIsLocationDropdownOpen(true)} />

              {isLocationDropdownOpen && parsedLocationSuggestions.length > 0 && locationName.trim().length >= 1 && <div className={cx("category-custom-dropdown")} style={{
              zIndex: 10000
            }}>
                    <div className={cx("trending-label")}>LOCATION SUGGESTIONS</div>

                    <div className={cx("options-list-container")}>
                      {parsedLocationSuggestions.map((loc, idx) => <div key={idx} className={cx("option-item")} onClick={() => {
                  setLocationName(loc);
                  setIsLocationDropdownOpen(false);
                  document.activeElement.blur();
                }} style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}>
                          <LocationOnIcon style={{
                    marginRight: 6,
                    color: "#ff7b00"
                  }} />
                          <span>{loc}</span>
                        </div>)}
                    </div>
                  </div>}
            </div>

            <div className={cx("cards-input-group cards-search-group")} ref={categoryRef}>
              <input className={cx("cards-custom-input")} placeholder="Search for..." value={searchTerm} onChange={e => {
              setSearchTerm(e.target.value);
              propSetCategoryName?.(e.target.value);
              setIsCategoryDropdownOpen(true);
            }} onFocus={() => setIsCategoryDropdownOpen(true)} />
              {isCategoryDropdownOpen && searchTerm.trim().length < 2 && <CategoryDropdown options={categoryOptions} setSearchTerm={val => {
              setSearchTerm(val);
              propSetCategoryName?.(val);
              setIsCategoryDropdownOpen(false);
              document.activeElement.blur();
            }} closeDropdown={() => {
              setIsCategoryDropdownOpen(false);
              document.activeElement.blur();
            }} />}

              {isCategoryDropdownOpen && searchTerm.trim().length >= 2 && <div className={cx("category-custom-dropdown")} style={{
              zIndex: 10000
            }}>
                  <div className={cx("trending-label")}>SUGGESTIONS</div>

                  <div className={cx("options-list-container")}>
                    {suggestionCategories.slice(0, 10).map((suggestion, idx) => <div key={idx} className={cx("option-item")} onClick={() => {
                  setSearchTerm(suggestion);
                  propSetCategoryName?.(suggestion);
                  setIsCategoryDropdownOpen(false);
                  document.activeElement.blur();
                }} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  cursor: "pointer"
                }}>
                        <SearchIcon style={{
                    marginRight: 6,
                    color: "#ff7b00"
                  }} />
                        <span>{suggestion}</span>
                      </div>)}
                  </div>
                </div>}

              <MicIcon className={cx("input-adornment end")} />
            </div>

            <button className={cx("search-btn")} onClick={handleSearch} aria-label="Search">
              <SearchIcon />
            </button>
          </div>

          <Box sx={{
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
