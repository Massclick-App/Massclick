import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./CardsSearch.css";

import LoginIcon from "@mui/icons-material/Login";
import {
  getAllSearchLogs,
  getBackendSuggestions,
  backendMainSearch,
  logSearchActivity,
} from "../../../redux/actions/businessListAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import Tooltip from "@mui/material/Tooltip";
import { categoryBarHelpers } from "../categoryBar";
import { Box, Typography, Button, IconButton } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import MI from "../../../assets/Mi.png";
import AddBusinessModel from "../AddBusinessModel";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useDrawer } from "../Drawer/drawerContext";

const toSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");


const CategoryDropdown = ({ options, setSearchTerm, closeDropdown }) => {
  const MAX_HEIGHT_PX = 200;

  const handleOptionClick = (value) => {
    setSearchTerm(value);
    closeDropdown();
    document.activeElement.blur();
  };

  if (!options || options.length === 0) return null;

  return (
    <div className="category-custom-dropdown">
      <div className="trending-label">RECENT SEARCHES</div>

      <div className="options-list-container" style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}>
        {options.map((option, index) => (
          <div
            key={index}
            className="option-item"
            onClick={() => handleOptionClick(option)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            <HistoryToggleOffIcon style={{ marginRight: "6px", color: "#ff7b00" }} />
            <span>{option}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CardsSearch = ({
  locationName: propLocationName,
  setLocationName: propSetLocationName,
  setSearchResults,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openDrawer } = useDrawer();

  const businessListState = useSelector((state) => state.businessListReducer || {});
  const { searchLogs = [], backendSuggestions = [] } = businessListState;

  const [internalLocationName, setInternalLocationName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locationName = propLocationName ?? internalLocationName;
  const setLocationName = propSetLocationName ?? setInternalLocationName;

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const categoryRef = useRef(null);
  const locationRef = useRef(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

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
    const handleClickOutside = (e) => {
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


  const capitalizeWords = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const categoryOptions = [
    ...new Set(
      (searchLogs || [])
        .map((log) => (log.categoryName ? capitalizeWords(log.categoryName) : ""))
        .filter(Boolean)
    ),
  ];

  const isLikelyCategorySearch = (text) => {
    const lower = text.toLowerCase();
    return lower.length <= 4 || !lower.includes(" ");
  };

  const suggestionCategories = (() => {
    if (!backendSuggestions.length) return [];

    const seen = new Set();
    const list = [];
    const userInput = searchTerm.trim().toLowerCase();

    const categoryOnly = isLikelyCategorySearch(userInput);

    backendSuggestions.forEach((item) => {
      if (categoryOnly) {
        const val = item.category;
        if (!val) return;

        const key = val.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(val);
        }
        return;
      }

      const val = item.businessName || item.category;
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

    backendSuggestions.forEach((item) => {
      const locFields = [
        item.location,
        item.locationDetails,
        item.street,
        item.plotNumber,
        item.pincode,
      ];

      locFields.forEach((loc) => {
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


  const handleSearch = async (e) => {
    e?.preventDefault?.();

    const term = searchTerm.trim();
    const location = locationName.trim();
    const category = categoryName.trim();

    const response = await dispatch(backendMainSearch(term, location, category));
    const results = response?.payload || [];

    setSearchResults?.(results);

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userId = authUser?._id;

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    const logLocation = location || "Global";
    const derivedCategory = category || term || "All Categories";

    if (userId && term) {
      dispatch(logUserSearch(userId, term, logLocation, derivedCategory));
    }

    dispatch(logSearchActivity(derivedCategory, logLocation, userDetails, term));

    const slugLocation = toSlug(location || "All");
    const slugTerm = toSlug(term || "All");

    navigate(`/${slugLocation}/${slugTerm}`, { state: { results } });
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const loggedIn = categoryBarHelpers.checkLogin();

  return (
    <>
      <header
        className={`search-header ${isVisible ? "visible" : ""}`}
        style={{ backdropFilter: "blur(8px)" }}
      >
        <div className="search-header-content">

          <div className="logo-section">
            <div className="logo-circle">
              <Tooltip title="Go to Home Page" arrow>
                <img
                  src={MI}
                  alt="Logo"
                  className="logo-image"
                  onClick={() => (window.location.href = "/")}
                />
              </Tooltip>
            </div>

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  background: "linear-gradient(45deg, #FF8C00, #FFA500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Mass<span>click</span>
              </Typography>

              <Typography
                sx={{
                  color: "text.secondary",
                  mt: 0.5,
                  display: { xs: "none", sm: "block" },
                }}              >
                India's Leading Local Search Engine
              </Typography>
            </Box>
          </div>

          <div className="search-area">

            <div className="input-group location-group" ref={locationRef}>
              <LocationOnIcon className="input-adornment start" />
              <input
                className="custom-input"
                placeholder="Enter location manually..."
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  setIsLocationDropdownOpen(true);
                }}
                onFocus={() => setIsLocationDropdownOpen(true)}
              />

              {isLocationDropdownOpen &&
                parsedLocationSuggestions.length > 0 &&
                locationName.trim().length >= 1 && (
                  <div className="category-custom-dropdown" style={{ zIndex: 2000 }}>
                    <div className="trending-label">LOCATION SUGGESTIONS</div>

                    <div className="options-list-container">
                      {parsedLocationSuggestions.map((loc, idx) => (
                        <div
                          key={idx}
                          className="option-item"
                          onClick={() => {
                            setLocationName(loc);
                            setIsLocationDropdownOpen(false);
                            document.activeElement.blur();
                          }}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <LocationOnIcon style={{ marginRight: 6, color: "#ff7b00" }} />
                          <span>{loc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            <div className="input-group search-group" ref={categoryRef}>
              <input
                className="custom-input"
                placeholder="Search for..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCategoryName(e.target.value);
                  setIsCategoryDropdownOpen(true);
                }}
                onFocus={() => setIsCategoryDropdownOpen(true)}
              />
              {isCategoryDropdownOpen && searchTerm.trim().length < 2 && (
                <CategoryDropdown
                  options={categoryOptions}
                  setSearchTerm={(val) => {
                    setSearchTerm(val);
                    setCategoryName(val);
                    setIsCategoryDropdownOpen(false);
                    document.activeElement.blur(); 
                  }}
                  closeDropdown={() => {
                    setIsCategoryDropdownOpen(false);
                    document.activeElement.blur();
                  }}
                />
              )}
              {isCategoryDropdownOpen && searchTerm.trim().length >= 2 && (
                <div className="category-custom-dropdown" style={{ zIndex: 2000 }}>
                  <div className="trending-label">SUGGESTIONS</div>

                  <div className="options-list-container">
                    {suggestionCategories.slice(0, 10).map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="option-item"
                        onClick={() => {
                          setSearchTerm(suggestion);
                          setCategoryName(suggestion);
                          setIsCategoryDropdownOpen(false);

                          document.activeElement.blur();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        <SearchIcon style={{ marginRight: 6, color: "#ff7b00" }} />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <MicIcon className="input-adornment end" />
            </div>

            <button className="search-btn" onClick={handleSearch}>
              <span>Search</span>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            {!loggedIn ? (
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={handleOpenModal}
                sx={{
                  background: "linear-gradient(45deg, #FF6F00, #F7941D)",
                  color: "white",
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  borderRadius: "30px",
                  px: { xs: 1.8, sm: 3.5 },
                  py: { xs: 1, sm: 1.2 },
                  whiteSpace: "nowrap",
                  minWidth: { xs: "auto", sm: "unset" },
                  boxShadow: "0 10px 30px rgba(255, 123, 0, 0.4)",
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #cc5a0f, #ff8a2d)",
                    boxShadow: "0 15px 40px rgba(255, 123, 0, 0.5)",
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: { xs: "none", sm: "inline" },
                  }}
                >
                  Login / Sign Up
                </Box>
              </Button>
            ) : (
              <IconButton onClick={openDrawer}>
                <AccountCircleIcon sx={{ fontSize: 28 }} />
              </IconButton>
            )}
          </Box>
        </div>

        <AddBusinessModel open={isModalOpen} handleClose={handleCloseModal} />
      </header>
    </>
  );
};

export default CardsSearch;
  