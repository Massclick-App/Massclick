import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useEffect, useState, useRef } from "react";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ApartmentIcon from "@mui/icons-material/Apartment";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MicIcon from "@mui/icons-material/Mic";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import { useDispatch, useSelector } from "react-redux";
import { getBackendSuggestions } from "../../../redux/actions/businessListAction";
import { searchMasterLocations, getPublicDistricts } from "../../../redux/actions/masterLocationAction";
import { fetchPublicUserCounter } from "../../../redux/actions/publicUserCounterAction.js";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { detectDistrict } from "../../../redux/actions/locationAction";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
import { DEFAULT_DISTRICT, matchCanonicalDistrict } from "../../../utils/districtDefaults.js";
import {
  formatCounterCount,
  getNextCounterRefreshDelay,
  getVisibleCounterCount,
} from "../../../utils/publicUserCounterUtils.js";
import heroIllustrationLeft from "../../../assets/hero_illustration_left.webp";
import heroIllustrationRight from "../../../assets/hero_illustration_right.webp";
import { useNavigate } from "react-router-dom";
import styles from "./hero.module.css";
const cx = createScopedClassNames(styles);
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
const SUGGESTION_PAGE_SIZE = 20;
const MASTER_LOCATION_SUGGESTION_LIMIT = 25;
const isObjectId = s => /^[a-f\d]{24}$/i.test(String(s || "").trim());
const getAuthUserDetails = () => {
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  return {
    userName: authUser?.userName,
    mobileNumber1: authUser?.mobileNumber1,
    mobileNumber2: authUser?.mobileNumber2,
    email: authUser?.email
  };
};
const HeroSection = React.memo(({
  searchTerm,
  setSearchTerm,
  locationName,
  setLocationName,
  district,
  setDistrict,
  setCategoryName
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categoryRef = useRef(null);
  const locationRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  // Canonical masterlocations slug of a VERIFIED LOCATIONS pick. Cleared the
  // moment the user types freely — then the server resolves the text itself.
  const [masterLocationSlug, setMasterLocationSlug] = useState(() => localStorage.getItem("selectedLocationSlug") || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [counterNow, setCounterNow] = useState(Date.now());
  // Raw geolocation-detected district text, resolved to a real dropdown
  // value once the canonical district list (below) has loaded.
  const [geoDetectedDistrict, setGeoDetectedDistrict] = useState(null);
  const businessState = useSelector(state => state.businessListReducer);
  const masterLocationState = useSelector(state => state.masterLocationReducer);
  const {
    locationSearchResults = [],
    districts = [],
    districtsLoading = false,
  } = masterLocationState || {};
  const publicCounterSettings = useSelector(state => state.publicUserCounter?.publicSettings);
  const publicUsersCount = publicCounterSettings ? getVisibleCounterCount(publicCounterSettings, counterNow) : null;
  const {
    searchLogs = [],
    backendSuggestions = [],
    backendSuggestionsLoading = false,
    backendSuggestionsHasMore = false,
    backendSuggestionsPage = 0,
    backendSuggestionsQuery = ""
  } = businessState;
  useEffect(() => {
    if (publicCounterSettings) return undefined;

    let cancelled = false;
    const idleHandle = scheduleIdleCallback(() => {
      if (!cancelled) {
        dispatch(fetchPublicUserCounter()).catch(() => {});
      }
    }, {
      timeout: 3000
    });

    return () => {
      cancelled = true;
      if (idleHandle === null) return;
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }
      window.clearTimeout(idleHandle);
    };
  }, [dispatch, publicCounterSettings]);
  useEffect(() => {
    const timer = window.setInterval(() => setCounterNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const delay = getNextCounterRefreshDelay(publicCounterSettings);
    if (!delay) return undefined;

    const timer = window.setTimeout(() => {
      setCounterNow(Date.now());
      dispatch(fetchPublicUserCounter()).catch(() => {});
    }, delay);

    return () => window.clearTimeout(timer);
  }, [dispatch, publicCounterSettings]);
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
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang] = useState("en-IN");
  // Keep locationReducer.selectedDistrict (read by the below-hero sections -
  // trendingSearch, popularSearch, topTourist, popularCategories,
  // serviceCard, featureService) in sync with the district dropdown. This
  // now tracks the actual district rather than every locality keystroke.
  // Declared (and therefore committed) before the locationName-persist
  // effect below: the reducer itself writes localStorage["selectedLocation"]
  // as a side effect (see locationReducer.js), and effects run in
  // declaration order, so the locationName effect always has the last word
  // and a saved specific locality never gets clobbered back to the district.
  useEffect(() => {
    dispatch({ type: "SET_SELECTED_DISTRICT", payload: district });
  }, [dispatch, district]);

  useEffect(() => {
    localStorage.setItem("selectedLocation", locationName);
  }, [locationName]);

  // Fetch the full district list once, shared across both search bars via
  // redux (StickySearchBar reads the same slice instead of re-fetching).
  useEffect(() => {
    if (districts.length > 0 || districtsLoading) return;
    dispatch(getPublicDistricts());
  }, [dispatch, districts.length, districtsLoading]);

  // Auto-detect the district by geolocation on first visit (no saved
  // district yet). Only captures the raw detected text here - matching it
  // against the canonical district list happens below, once that list has
  // loaded, so a Google Geocoding quirk ("Tiruchirappalli District") still
  // resolves to a real dropdown value instead of a dead option.
  useEffect(() => {
    if (localStorage.getItem("selectedDistrict")) return undefined;
    if (!navigator.geolocation) return undefined;

    const idleHandle = scheduleIdleCallback(() => {
      navigator.geolocation.getCurrentPosition(async ({
        coords
      }) => {
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
    }, {
      timeout: 2500
    });

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      window.clearTimeout(idleHandle);
    };
  }, [dispatch]);

  // Once both the detected text and the canonical district list are ready,
  // resolve the match and apply it to the district. The location field is
  // only updated to match if the user hasn't already typed/picked their own
  // location - detection must never overwrite a location the user searched.
  useEffect(() => {
    if (!geoDetectedDistrict || districts.length === 0) return;
    const matched = matchCanonicalDistrict(geoDetectedDistrict, districts) || DEFAULT_DISTRICT;
    const locationUntouched = !locationName.trim() || locationName === district;
    setDistrict(matched);
    localStorage.setItem("selectedDistrict", matched);
    if (locationUntouched) {
      setLocationName(matched);
      localStorage.setItem("selectedLocation", matched);
    }
    setGeoDetectedDistrict(null);
  }, [geoDetectedDistrict, districts, district, locationName, setDistrict, setLocationName]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false);
        setShowDistrictDropdown(false);
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
    if (!isDropdownOpen) return;
    dispatch(getBackendSuggestions({
      search: debouncedSearch.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
  }, [debouncedSearch, dispatch, isDropdownOpen]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationName || ""), 250);
    return () => clearTimeout(t);
  }, [locationName]);
  useEffect(() => {
    if (!showLocationDropdown) return;
    dispatch(getBackendSuggestions({
      search: debouncedLocation.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false
    }));
    dispatch(searchMasterLocations(debouncedLocation.trim(), MASTER_LOCATION_SUGGESTION_LIMIT, district));
  }, [debouncedLocation, dispatch, showLocationDropdown, district]);
  const recentSearchOptions = [...new Set((searchLogs || []).map(log => log.categoryName ? log.categoryName.trim() : "").filter(name => name && !isObjectId(name)))];
  const suggestionCategories = (() => {
    if (!Array.isArray(backendSuggestions) || backendSuggestions.length === 0) return [];
    const seen = new Set();
    const list = [];
    backendSuggestions.forEach(item => {
      const val = item.category || item.categoryName || item.name;
      if (!val) return;
      const text = String(val).trim();
      if (!text || isObjectId(text)) return;
      const key = text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(text);
      }
    });
    return list;
  })();
  const parsedLocationSuggestions = (() => {
    if (!Array.isArray(backendSuggestions) || backendSuggestions.length === 0) return [];
    const seen = new Set();
    const list = [];
    backendSuggestions.forEach(item => {
      const locFields = [item.location, item.locationDetails, item.street, item.plotNumber, item.pincode];
      locFields.forEach(loc => {
        if (!loc) return;
        const text = String(loc).trim();
        if (!text || isObjectId(text)) return;
        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(text);
        }
      });
    });
    return list;
  })();
  // Real masterlocations match (district/zone/ward/locality).
  // subLabel shows the full remaining breadcrumb (ward > zone > district),
  // deduped against the bold name and against itself so no level repeats.
  // A district/zone/ward can share its exact name with a child locality
  // (the area's namesake place) - those matches are grouped into one row,
  // auto-picking the broadest (highest) level present in the group instead
  // of several identical-looking rows each eating a slot in the capped
  // result list.
  const masterLocationSuggestions = (() => {
    if (!Array.isArray(locationSearchResults) || locationSearchResults.length === 0) return [];
    const levelDepth = { district: 0, zone: 1, ward: 2, locality: 3 };
    const groups = new Map();
    locationSearchResults.forEach(loc => {
      const name = loc.locality || loc.ward || loc.zone || loc.district;
      if (!name) return;
      const key = name.toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(loc);
    });
    return [...groups.values()].map(group => {
      group.sort((a, b) => (levelDepth[a.level] ?? 0) - (levelDepth[b.level] ?? 0));
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
  })();
  // Single merged list: VERIFIED LOCATIONS listed in full first, legacy
  // LOCATION SUGGESTIONS after them, with any name already covered by a
  // verified match dropped so it doesn't show twice.
  const combinedLocationOptions = (() => {
    const seen = new Set(masterLocationSuggestions.map(opt => String(opt.name || "").trim().toLowerCase()).filter(Boolean));
    const legacyOnly = parsedLocationSuggestions.filter(text => !seen.has(String(text).trim().toLowerCase()));
    return [...masterLocationSuggestions, ...legacyOnly];
  })();
  const parseVoiceQuery = text => {
    const lower = text.toLowerCase().trim();
    let category = "";
    let location = "";
    const inMatch = lower.match(/(.+)\s+in\s+(.+)/);
    const nearMatch = lower.match(/(.+)\s+near\s+(.+)/);
    const nearMeMatch = lower.match(/near me\s+(.+)/);
    if (inMatch) {
      category = inMatch[1].trim();
      location = inMatch[2].trim();
    } else if (nearMatch) {
      category = nearMatch[1].trim();
      location = nearMatch[2].trim();
    } else if (nearMeMatch) {
      category = nearMeMatch[1].trim();
    } else {
      category = lower;
    }
    category = category.replace("near me", "").replace("near", "").replace("in", "").trim();
    return {
      category,
      location
    };
  };
  const handleSearch = async (e, selectedTerm) => {
    e?.preventDefault?.();
    const normalize = (text = "") => text.toLowerCase().trim().replace(/&/g, " and ").replace(/[-_]/g, " ").replace(/\s+/g, " ");
    let term = normalize(selectedTerm ?? searchTerm);
    let location = normalize(locationName);

    // 🔹 Remove location from term
    if (location && term.includes(location)) {
      term = term.replace(new RegExp(`\\b${location}\\b`, "gi"), "").trim();
    }
    const stopWords = ["location", "near", "in", "around", "nearby"];
    let words = term.split(" ").filter(Boolean);

    // 🔹 Remove stopwords
    words = words.filter(word => !stopWords.includes(word));
    const cleanedTerm = words.join(" ");
    // Use centralized navigation with normalized data
    navigateToSearchResult({
      searchTerm: cleanedTerm,
      location: location,
      masterLocationSlug,
      navigate,
      dispatch,
      isKnownCategory: false,
      // User typed search - use flexible term search
      logAlreadySent: false,
      userDetails: getAuthUserDetails()
    });
  };
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
      // Ignore duplicate SpeechRecognition starts while a session is active.
    }
    recognition.onstart = () => {
      setIsListening(true);
    };
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
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
    recognition.onerror = event => {
      if (event.error === "no-speech") return;
      };
    recognition.onend = () => {
      setIsListening(false);
      setShowVoiceModal(false);
    };
  };
  return <div className={cx("hero-section")}>
      <div className={cx("hero-layout")}>
      <div className={cx("hero-decor hero-decor-left")} aria-hidden="true">
        <img src={heroIllustrationLeft} alt="" loading="lazy" decoding="async" fetchpriority="low" />
      </div>
      <div className={cx("hero-heading")}>
        <h1 className={cx("hero-title")}>
          Explore. Connect.
          <br />
          <span className={cx("hero-title-accent")}>Succeed Local.</span>
        </h1>
        <p className={cx("hero-subtitle")}>Find trusted businesses and services near you.</p>
      </div>
      <div className={cx("hero-content hero-minimal")}>

        <form className={cx("search-bar-container")} onSubmit={handleSearch}>
          <div className={cx("input-group location-group", (showLocationDropdown || showDistrictDropdown) && "dropdown-open")} ref={locationRef}>
            <LocationOnIcon className={cx("input-adornment start")} />
            <input className={cx("custom-input")} role="combobox" aria-autocomplete="list" aria-controls="location-suggestions" aria-label="Search for a location" placeholder="Search for a location..." aria-expanded={showLocationDropdown} autoComplete="address-level2" value={locationName} onChange={e => {
            const value = e.target.value;
            setLocationName(value);
            localStorage.setItem("selectedLocation", value);
            setMasterLocationSlug("");
            localStorage.removeItem("selectedLocationSlug");
            setShowLocationDropdown(true);
            setShowDistrictDropdown(false);
            setIsDropdownOpen(false);
          }} onFocus={() => {
            setShowLocationDropdown(true);
            setShowDistrictDropdown(false);
            setIsDropdownOpen(false);
          }} />

            {showLocationDropdown && (() => {
            const selectLocation = val => {
              const chosen = typeof val === "string" ? val : val.name;
              setLocationName(chosen);
              localStorage.setItem("selectedLocation", chosen);
              // Verified picks carry the canonical slug; legacy text
              // suggestions don't and clear any previous one.
              const slug = typeof val === "object" && val.slug ? val.slug : "";
              setMasterLocationSlug(slug);
              if (slug) localStorage.setItem("selectedLocationSlug", slug);
              else localStorage.removeItem("selectedLocationSlug");
              setShowLocationDropdown(false);
            };
            return <DeferredCategoryDropdown id="location-suggestions" label="LOCATION SUGGESTIONS" options={combinedLocationOptions} onSelect={selectLocation} onReachEnd={() => maybeLoadMoreSuggestions(locationName.trim())} hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === locationName.trim()} isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === locationName.trim()} />;
          })()}

            <span className={cx("field-divider")} aria-hidden="true" />

            <button
              type="button"
              className={cx("district-trigger", showDistrictDropdown && "district-trigger--open")}
              aria-haspopup="listbox"
              aria-expanded={showDistrictDropdown}
              aria-controls="district-options"
              onClick={() => {
                setShowDistrictDropdown(open => !open);
                setShowLocationDropdown(false);
              }}
            >
              <ApartmentIcon className={cx("district-trigger-icon")} />
              <span className={cx("district-trigger-text")}>{district || "Select district"}</span>
              <KeyboardArrowDownIcon className={cx("district-trigger-chevron")} />
            </button>

            {showDistrictDropdown && (
              <DeferredCategoryDropdown
                id="district-options"
                label="SELECT DISTRICT"
                options={districts}
                onSelect={value => {
                  setDistrict(value);
                  localStorage.setItem("selectedDistrict", value);
                  // Picking a district resets the locality box back to the
                  // district's own name - typing in the location field
                  // narrows it further from there.
                  setLocationName(value);
                  localStorage.setItem("selectedLocation", value);
                  setMasterLocationSlug("");
                  localStorage.removeItem("selectedLocationSlug");
                  setShowDistrictDropdown(false);
                }}
              />
            )}
          </div>

          <div className={cx("input-group search-group", isDropdownOpen && "dropdown-open")} ref={categoryRef}>
            <SearchIcon className={cx("input-adornment start search-field-icon")} aria-hidden="true" />
            <input className={cx("custom-input")} role="combobox" aria-autocomplete="list" aria-controls="business-suggestions" aria-label="Search for businesses or services" aria-expanded={isDropdownOpen} enterKeyHint="search" placeholder="Search for..." value={searchTerm} onChange={e => {
            setSearchTerm(e.target.value);
            setCategoryName(e.target.value);
            setIsDropdownOpen(true);
            setShowLocationDropdown(false);
          }} onFocus={() => {
            setIsDropdownOpen(true);
            setShowLocationDropdown(false);
          }} />

            {isDropdownOpen && searchTerm.trim().length < 2 && <DeferredCategoryDropdown id="business-suggestions" label="RECENT SEARCHES" options={recentSearchOptions} onSelect={val => {
            const chosen = typeof val === "string" ? val : String(val);
            setSearchTerm(chosen);
            if (setCategoryName) setCategoryName(chosen);
            setIsDropdownOpen(false);
            handleSearch(undefined, chosen);
          }} />}

            {isDropdownOpen && searchTerm.trim().length >= 2 && <DeferredCategoryDropdown id="business-suggestions" label="SUGGESTIONS" options={suggestionCategories} onReachEnd={() => maybeLoadMoreSuggestions(searchTerm.trim())} hasMore={backendSuggestionsHasMore && backendSuggestionsQuery === searchTerm.trim()} isLoadingMore={backendSuggestionsLoading && backendSuggestionsQuery === searchTerm.trim()} onSelect={val => {
            const chosen = typeof val === "string" ? val : String(val);
            setSearchTerm(chosen);
            if (setCategoryName) setCategoryName(chosen);
            setIsDropdownOpen(false);
            handleSearch(undefined, chosen);
          }} />}

            <button type="button" className={cx("voice-search-button")} aria-label={isListening ? "Voice search is listening" : "Start voice search"} onClick={handleVoiceSearch} disabled={isListening}>
              <MicIcon aria-hidden="true" />
            </button>

          </div>
          {showVoiceModal && <div className={cx("voice-modal")}>
              <div className={cx("voice-box")}>
                <button type="button" className={cx("voice-close")} aria-label="Close voice search" onClick={() => setShowVoiceModal(false)}>
                  ✕
                </button>
                <h3>Listening...</h3>
                <div className={cx("voice-dots")}>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>}
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
          <button type="submit" className={cx("search-button")} aria-label="Search businesses">
            <SearchIcon className={cx("search-icon")} />
            <span className={cx("search-button-text")}>Search</span>
          </button>
        </form>
        <div className={cx("hero-trust")}>
          <div className={cx("trust-card")}>
            <span className={cx("trust-icon")}><StorefrontRoundedIcon /></span>
            <span className={cx("trust-copy")}><strong>50,000+</strong><small>Businesses Listed</small></span>
          </div>

          <div className={cx("trust-card")}>
            <span className={cx("trust-icon")}><GroupsRoundedIcon /></span>
            <span className={cx("trust-copy")}><strong className={cx("trust-count")}>{publicUsersCount ? `${formatCounterCount(publicUsersCount)}+` : "Live"}</strong><small>Public Users</small></span>
          </div>

          <div className={cx("trust-card")}>
            <span className={cx("trust-icon")}><VerifiedUserRoundedIcon /></span>
            <span className={cx("trust-copy")}><strong>Verified</strong><small>Local Businesses</small></span>
          </div>

          <div className={cx("trust-card")}>
            <span className={cx("trust-icon")}><GppGoodRoundedIcon /></span>
            <span className={cx("trust-copy")}><strong>Secure</strong><small>&amp; Spam-Free Platform</small></span>
          </div>
        </div>
      </div>
      <div className={cx("hero-decor hero-decor-right")} aria-hidden="true">
        <img src={heroIllustrationRight} alt="" loading="lazy" decoding="async" fetchpriority="low" />
      </div>
      </div>
    </div>;
});
export default HeroSection;
