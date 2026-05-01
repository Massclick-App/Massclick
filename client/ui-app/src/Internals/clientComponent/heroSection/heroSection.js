import React, { useEffect, useState, useRef } from "react";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MicIcon from "@mui/icons-material/Mic";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllSearchLogs,
  getBackendSuggestions,
  backendMainSearch,
  logSearchActivity,
} from "../../../redux/actions/businessListAction";
import { logUserSearch } from "../../../redux/actions/otpAction";
import { detectDistrict } from "../../../redux/actions/locationAction";
// import backgroundImage from "../../../assets/background9.jpg";
// import backgroundImage from "../../../assets/background.png";
import { useNavigate } from "react-router-dom";
import "./hero.css";
import { shouldSendSearch } from "../../../utils/searchLock.js";

const toSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");


const CategoryDropdown = ({ label, options, onSelect }) => {
  const MAX_HEIGHT_PX = 220;
  if (!options || options.length === 0) return null;

  return (
    <div className="category-custom-dropdown" style={{ zIndex: 1200 }}>
      <div className="trending-label">{label}</div>
      <div
        className="options-list-container"
        style={{
          maxHeight: `${MAX_HEIGHT_PX}px`,
          overflowY: "auto",
        }}
      >
        {options.map((option, index) => {
          const displayText =
            typeof option === "string"
              ? option
              : String(
                option.category ||
                option.businessName ||
                option.location ||
                ""
              );

          return (
            <div
              key={index}
              className="option-item"
              onClick={() => onSelect(option)}
            >
              {label.toLowerCase().includes("location") ? (
                <LocationOnIcon className="option-icon" />
              ) : label === "RECENT SEARCHES" ? (
                <HistoryToggleOffIcon className="option-icon" />
              ) : (
                <SearchIcon className="option-icon" />
              )}

              <span className="option-text-main">{displayText}</span>

              {label === "RECENT SEARCHES" &&
                typeof option !== "string" &&
                option.category && (
                  <span className="option-text-sub">{option.category}</span>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HeroSection = ({
  searchTerm,
  setSearchTerm,
  locationName,
  setLocationName,
  categoryName,
  setCategoryName,
  setSearchResults,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const categoryRef = useRef(null);
  const locationRef = useRef(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const businessState = useSelector((state) => state.businessListReducer);
  const { searchLogs = [], backendSuggestions = [] } = businessState;

  const locationState = useSelector((state) => state.locationReducer);
  const { detectedDistrict } = locationState;
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en-IN");

  useEffect(() => {

    const savedLocation = localStorage.getItem("selectedLocation");

    if (savedLocation) {

      setLocationName(savedLocation);

      dispatch({
        type: "SET_SELECTED_DISTRICT",
        payload: savedLocation,
      });

      return;
    }

    if (!navigator.geolocation) {
      setLocationName("All Districts");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {

          const result = await dispatch(
            detectDistrict({
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          );

          const autoDistrict = result?.district || "All Districts";

          setLocationName(autoDistrict);

          localStorage.setItem("selectedLocation", autoDistrict);

          dispatch({
            type: "SET_SELECTED_DISTRICT",
            payload: autoDistrict,
          });

        } catch {
          setLocationName("All Districts");
        }
      },
      () => {
        setLocationName("All Districts");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

  }, [dispatch]);

  useEffect(() => {
    dispatch(getAllSearchLogs());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm || ""), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      dispatch(getBackendSuggestions(debouncedSearch));
    }
  }, [debouncedSearch, dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationName || ""), 250);
    return () => clearTimeout(t);
  }, [locationName]);

  useEffect(() => {
    if (debouncedLocation.trim().length >= 2) {
      dispatch(getBackendSuggestions(debouncedLocation));
    }
  }, [debouncedLocation, dispatch]);

  const recentSearchOptions = [
    ...new Set(
      (searchLogs || [])
        .map((log) => (log.categoryName ? log.categoryName.trim() : ""))
        .filter(Boolean)
    ),
  ];

  const isLikelyCategorySearch = (text) => {
    const lower = text.toLowerCase();

    return lower.length <= 4 || !lower.includes(" ");
  };

  const suggestionCategories = (() => {
    if (!Array.isArray(backendSuggestions) || backendSuggestions.length === 0)
      return [];

    const seen = new Set();
    const list = [];

    const userInput = searchTerm.trim().toLowerCase();
    const categoryOnly = isLikelyCategorySearch(userInput);

    backendSuggestions.forEach((item) => {
      if (categoryOnly) {
        const val = item.category;
        if (!val) return;

        const text = String(val).trim();
        if (!text) return;

        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(text);
        }
        return;
      }

      const val = item.businessName || item.category;
      if (!val) return;

      const text = String(val).trim();
      if (!text) return;

      const key = text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(text);
      }
    });

    return list;
  })();

  const parsedLocationSuggestions = (() => {
    if (!Array.isArray(backendSuggestions) || backendSuggestions.length === 0)
      return [];

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
        const text = String(loc).trim();
        if (!text) return;
        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(text);
        }
      });
    });

    return list;
  })();

  const parseVoiceQuery = (text) => {

    const lower = text.toLowerCase().trim();

    let category = "";
    let location = "";

    const inMatch = lower.match(/(.+)\s+in\s+(.+)/);
    const nearMatch = lower.match(/(.+)\s+near\s+(.+)/);
    const nearMeMatch = lower.match(/near me\s+(.+)/);

    if (inMatch) {
      category = inMatch[1].trim();
      location = inMatch[2].trim();
    }

    else if (nearMatch) {
      category = nearMatch[1].trim();
      location = nearMatch[2].trim();
    }

    else if (nearMeMatch) {
      category = nearMeMatch[1].trim();
    }

    else {
      category = lower;
    }

    category = category
      .replace("near me", "")
      .replace("near", "")
      .replace("in", "")
      .trim();

    return { category, location };
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    let term = searchTerm.toLowerCase().trim();
    let location = locationName.toLowerCase().trim();
    let category = categoryName.toLowerCase().trim();

    if (location && term.includes(location)) {
      term = term.replace(new RegExp(`\\b${location}\\b`, "gi"), "").trim();
    }

    const stopWords = ["location", "near", "in", "around", "nearby"];

    let words = term.split(" ").filter(Boolean);

    words = words.filter(word => !stopWords.includes(word));

    const finalCategory = term;

    const response = await dispatch(
      backendMainSearch("", location, finalCategory)
    );

    const results = response?.payload || [];

    if (setSearchResults) setSearchResults(results);

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    const key = `${category}-${location}-${userDetails.mobileNumber1}`;

    const logSent = shouldSendSearch(key);
    if (logSent) {
      dispatch(
        logSearchActivity(category, location, userDetails, term)
      );
    }

    const slugLocation = toSlug(location || "all");
    const slugCategory = toSlug(finalCategory || "all");

    navigate(`/${slugLocation}/${slugCategory}`, {
      state: {
        results,
        category: finalCategory,
        logAlreadySent: logSent
      }
    });

  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search not supported in this browser");
      return;
    }

    if (isListening) return;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
    }

    const recognition = recognitionRef.current;

    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setShowVoiceModal(true);

    try {
      recognition.start();
    } catch {
      console.log("Recognition already running");
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {

      const transcript = event.results[0][0].transcript;

      console.log("Voice:", transcript);
      setSearchTerm(transcript);
      setShowVoiceModal(false);

      const parsed = parseVoiceQuery(transcript);

      if (parsed.category) {
        setSearchTerm(parsed.category);
        setCategoryName(parsed.category);
      }

      if (parsed.location) {
        setLocationName(parsed.location);
      }

    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      console.log("Voice error:", event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      setShowVoiceModal(false);

    };
  };

  return (
    <div
      className="hero-section"
    >
      <div className="hero-content hero-minimal">

        <form className="search-bar-container" onSubmit={handleSearch}>
          <div className="input-group location-group" ref={locationRef}>
            <LocationOnIcon className="input-adornment start" />
            <input
              className="custom-input"
              placeholder={locationName ? "Change location..." : "Detecting location..."}
              value={locationName}
              onChange={(e) => {
                const value = e.target.value;

                setLocationName(value);

                localStorage.setItem("selectedLocation", value);

                dispatch({
                  type: "SET_SELECTED_DISTRICT",
                  payload: value,
                });

                setShowLocationDropdown(true);
              }}

              onFocus={() => setShowLocationDropdown(true)}
            />

            {showLocationDropdown && parsedLocationSuggestions.length > 0 && (
              <CategoryDropdown
                label="LOCATION SUGGESTIONS"
                options={parsedLocationSuggestions}
                onSelect={(val) => {
                  const chosen = typeof val === "string" ? val : String(val);

                  setLocationName(chosen);

                  localStorage.setItem("selectedLocation", chosen);

                  dispatch({
                    type: "SET_SELECTED_DISTRICT",
                    payload: chosen,
                  });

                  setShowLocationDropdown(false);
                }}

              />
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
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />

            {isDropdownOpen && searchTerm.trim().length < 2 && (
              <CategoryDropdown
                label="RECENT SEARCHES"
                options={recentSearchOptions}
                onSelect={(val) => {
                  const chosen = typeof val === "string" ? val : String(val);
                  setSearchTerm(chosen);
                  if (setCategoryName) setCategoryName(chosen);
                  setIsDropdownOpen(false);
                }}
              />
            )}

            {isDropdownOpen && searchTerm.trim().length >= 2 && (
              <CategoryDropdown
                label="SUGGESTIONS"
                options={suggestionCategories}
                onSelect={(val) => {
                  const chosen = typeof val === "string" ? val : String(val);
                  setSearchTerm(chosen);
                  if (setCategoryName) setCategoryName(chosen);
                  setIsDropdownOpen(false);
                }}
              />
            )}

            <MicIcon
              className="input-adornment end"
              onClick={handleVoiceSearch}
              style={{
                color: isListening ? "red" : "#ff7b00",
                pointerEvents: isListening ? "none" : "auto"
              }}
            />

          </div>
          {showVoiceModal && (
            <div className="voice-modal">
              <div className="voice-box">
                <div className="voice-close" onClick={() => setShowVoiceModal(false)}>
                  ✕
                </div>
                <h3>Listening...</h3>
                <div className="voice-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          {/* <select
            value={voiceLang}
            onChange={(e) => setVoiceLang(e.target.value)}
            style={{
              height: "50px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              padding: "0 10px",
              cursor: "pointer",
            }}
          >
            <option value="en-IN">English</option>
            <option value="ta-IN">Tamil</option>
            <option value="hi-IN">Hindi</option>
            <option value="te-IN">Telugu</option>
            <option value="ml-IN">Malayalam</option>
            <option value="kn-IN">Kannada</option>
          </select> */}
          <button type="submit" className="search-button">
            <SearchIcon className="search-icon" />
          </button>
        </form>
        <div className="hero-trust">
          <div className="trust-card">
            <span className="trust-icon">✔</span>
            <span>50,000+ Businesses Listed</span>
          </div>

          <div className="trust-card">
            <span className="trust-icon">👥</span>
            <span>Trusted by Thousands of Users</span>
          </div>

          <div className="trust-card">
            <span className="trust-icon">⭐</span>
            <span>Verified Local Businesses</span>
          </div>

          <div className="trust-card">
            <span className="trust-icon">🔒</span>
            <span>Secure & Spam-Free Platform</span>
          </div>
        </div>
      </div>
    </div>

  );
};

export default HeroSection;
