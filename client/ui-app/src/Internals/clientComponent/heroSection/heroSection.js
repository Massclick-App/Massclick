import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useEffect, useState, useRef } from "react";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MicIcon from "@mui/icons-material/Mic";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import { useDispatch, useSelector } from "react-redux";
import { getBackendSuggestions } from "../../../redux/actions/businessListAction";
import { searchMasterLocations } from "../../../redux/actions/masterLocationAction";
import { fetchPublicUserCounter } from "../../../redux/actions/publicUserCounterAction.js";
import { createDistrictSlug } from "../../../utils/searchResultNavigation";
import { parseVoiceSearchTranscript, submitSearchIntent } from "../../../utils/searchIntent";
import { getCorrectionSuggestionOption, getSearchSuggestionValue } from "../../../utils/searchSuggestionIntent";
import { detectDistrict } from "../../../redux/actions/locationAction";
import { scheduleIdleCallback } from "../../../utils/scheduleIdleCallback.js";
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
const DEFAULT_LOCATION = "Tiruchirappalli";
const SUGGESTION_PAGE_SIZE = 20;
const MASTER_LOCATION_SUGGESTION_LIMIT = 25;
const isObjectId = s => /^[a-f\d]{24}$/i.test(String(s || "").trim());
const HeroSection = React.memo(({
  searchTerm,
  setSearchTerm,
  locationName,
  setLocationName,
  setCategoryName
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categoryRef = useRef(null);
  const locationRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  // Canonical masterlocations slug of a VERIFIED LOCATIONS pick. Cleared the
  // moment the user types freely — then the server resolves the text itself.
  const [masterLocationSlug, setMasterLocationSlug] = useState(() => localStorage.getItem("selectedLocationSlug") || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [counterNow, setCounterNow] = useState(Date.now());
  const businessState = useSelector(state => state.businessListReducer);
  const masterLocationState = useSelector(state => state.masterLocationReducer);
  const {
    locationSearchResults = [],
  } = masterLocationState || {};
  const publicCounterSettings = useSelector(state => state.publicUserCounter?.publicSettings);
  const publicUsersCount = publicCounterSettings ? getVisibleCounterCount(publicCounterSettings, counterNow) : null;
  const {
    searchLogs = [],
    backendSuggestions = [],
    backendSuggestionsLoading = false,
    backendSuggestionsHasMore = false,
    backendSuggestionsPage = 0,
    backendSuggestionsQuery = "",
    backendSuggestionContexts = {}
  } = businessState;
  const searchSuggestionState = backendSuggestionContexts.search || {
    items: backendSuggestions,
    loading: backendSuggestionsLoading,
    hasMore: backendSuggestionsHasMore,
    page: backendSuggestionsPage,
    query: backendSuggestionsQuery,
  };
  const locationSuggestionState = backendSuggestionContexts.location || {
    items: backendSuggestions,
    loading: backendSuggestionsLoading,
    hasMore: backendSuggestionsHasMore,
    page: backendSuggestionsPage,
    query: backendSuggestionsQuery,
  };
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
    append = false,
    context = "search"
  } = {}) => dispatch(getBackendSuggestions({
    search: query,
    page,
    limit: SUGGESTION_PAGE_SIZE,
    append,
    context
  }));
  const maybeLoadMoreSuggestions = (query, {
    loading = searchSuggestionState.loading,
    hasMore = searchSuggestionState.hasMore,
    page = searchSuggestionState.page,
    currentQuery = searchSuggestionState.query,
    context = "search",
  } = {}) => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery || loading || !hasMore) return;
    if (currentQuery !== normalizedQuery) return;
    requestSuggestions(normalizedQuery, {
      page: page + 1,
      append: true,
      context,
    });
  };
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang] = useState("en-IN");
  useEffect(() => {
    const applyLocation = value => {
      setLocationName(value);
      localStorage.setItem("selectedLocation", value);
      dispatch({
        type: "SET_SELECTED_DISTRICT",
        payload: {
          name: value,
          districtName: localStorage.getItem("selectedLocationDistrict") || value,
          districtSlug: localStorage.getItem("selectedLocationDistrictSlug") || createDistrictSlug(value),
          locationSlug: localStorage.getItem("selectedPublicLocationSlug") || "",
          locationPath: localStorage.getItem("selectedPublicLocationPath") || "",
          masterLocationSlug: localStorage.getItem("selectedLocationSlug") || "",
        }
      });
    };
    const savedLocation = localStorage.getItem("selectedLocation");
    if (savedLocation) {
      applyLocation(savedLocation);
      return;
    }
    if (!navigator.geolocation) {
      applyLocation(DEFAULT_LOCATION);
      return;
    }
    const idleHandle = scheduleIdleCallback(() => {
      navigator.geolocation.getCurrentPosition(async ({
        coords
      }) => {
        try {
          const result = await dispatch(detectDistrict({
            latitude: coords.latitude,
            longitude: coords.longitude
          }));
          const detectedDistrict = String(result?.district || "").trim();
          const autoDistrict = detectedDistrict && detectedDistrict.toLowerCase() !== "all districts" ? detectedDistrict : DEFAULT_LOCATION;
          applyLocation(autoDistrict);
        } catch {
          applyLocation(DEFAULT_LOCATION);
        }
      }, () => {
        applyLocation(DEFAULT_LOCATION);
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
  }, [dispatch, setLocationName]);
  useEffect(() => {
    const handleClickOutside = e => {
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
    if (!isDropdownOpen) return;
    dispatch(getBackendSuggestions({
      search: debouncedSearch.trim(),
      page: 1,
      limit: SUGGESTION_PAGE_SIZE,
      append: false,
      context: "search"
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
      append: false,
      context: "location"
    }));
    dispatch(searchMasterLocations(debouncedLocation.trim(), MASTER_LOCATION_SUGGESTION_LIMIT));
  }, [debouncedLocation, dispatch, showLocationDropdown]);
  const recentSearchOptions = [...new Set((searchLogs || []).map(log => log.categoryName ? log.categoryName.trim() : "").filter(name => name && !isObjectId(name)))];
  const suggestionCategories = (() => {
    const suggestions = searchSuggestionState.items;
    const correctionOption = getCorrectionSuggestionOption(searchSuggestionState.searchIntent);
    if ((!Array.isArray(suggestions) || suggestions.length === 0) && !correctionOption) return [];
    const seen = new Set();
    const list = [];
    if (correctionOption) {
      seen.add(correctionOption.value.toLowerCase());
      list.push(correctionOption);
    }
    (suggestions || []).forEach(item => {
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
    const suggestions = locationSuggestionState.items;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return [];
    const seen = new Set();
    const list = [];
    suggestions.forEach(item => {
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
  // (the area's namesake place) - those matches collapse into a single row,
  // picking the broadest (highest) level present, instead of several
  // identical-looking rows or a set of level pills.
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
        slug: primary.slug,
        publicLocationSlug: primary.publicLocationSlug,
        publicLocationPath: primary.publicLocationPath,
        districtName: primary.district,
        districtSlug: createDistrictSlug(primary.district)
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
  const handleSearch = async (e, selectedTerm) => {
    const result = submitSearchIntent({
      event: e,
      searchTerm: selectedTerm ?? searchTerm,
      locationName,
      defaultLocation: DEFAULT_LOCATION,
      masterLocationSlug,
      navigate,
      dispatch,
      setLocationName,
      setCategoryName,
    });
    if (!result.submitted) setIsDropdownOpen(true);
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
      const parsed = parseVoiceSearchTranscript(transcript);
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
          <div className={cx("input-group location-group", showLocationDropdown && "dropdown-open")} ref={locationRef}>
            <LocationOnIcon className={cx("input-adornment start")} />
            <input className={cx("custom-input")} role="combobox" aria-autocomplete="list" aria-controls="location-suggestions" aria-label="Business location" aria-expanded={showLocationDropdown} autoComplete="address-level2" placeholder={locationName ? "Change location..." : "Detecting location..."} value={locationName} onChange={e => {
            const value = e.target.value;
            setLocationName(value);
            localStorage.setItem("selectedLocation", value);
            setMasterLocationSlug("");
            localStorage.removeItem("selectedLocationSlug");
            localStorage.removeItem("selectedPublicLocationSlug");
            localStorage.removeItem("selectedPublicLocationPath");
            localStorage.removeItem("selectedLocationDistrict");
            localStorage.removeItem("selectedLocationDistrictSlug");
            dispatch({
              type: "SET_SELECTED_DISTRICT",
              payload: {
                name: value,
                districtName: value,
                districtSlug: createDistrictSlug(value),
                locationSlug: "",
                locationPath: "",
                masterLocationSlug: "",
              }
            });
            setShowLocationDropdown(true);
            setIsDropdownOpen(false);
          }} onFocus={() => {
            setShowLocationDropdown(true);
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
              const publicLocationSlug = typeof val === "object" && val.publicLocationSlug ? val.publicLocationSlug : "";
              const publicLocationPath = typeof val === "object" && val.publicLocationPath ? val.publicLocationPath : "";
              const districtName = typeof val === "object" && val.districtName ? val.districtName : chosen;
              const districtSlug = typeof val === "object" && val.districtSlug ? val.districtSlug : createDistrictSlug(districtName);
              setMasterLocationSlug(slug);
              if (slug) localStorage.setItem("selectedLocationSlug", slug);
              else localStorage.removeItem("selectedLocationSlug");
              if (publicLocationSlug) localStorage.setItem("selectedPublicLocationSlug", publicLocationSlug);
              else localStorage.removeItem("selectedPublicLocationSlug");
              if (publicLocationPath) localStorage.setItem("selectedPublicLocationPath", publicLocationPath);
              else localStorage.removeItem("selectedPublicLocationPath");
              if (districtName) localStorage.setItem("selectedLocationDistrict", districtName);
              else localStorage.removeItem("selectedLocationDistrict");
              if (districtSlug) localStorage.setItem("selectedLocationDistrictSlug", districtSlug);
              else localStorage.removeItem("selectedLocationDistrictSlug");
              dispatch({
                type: "SET_SELECTED_DISTRICT",
                payload: {
                  name: chosen,
                  districtName,
                  districtSlug,
                  locationSlug: publicLocationSlug,
                  locationPath: publicLocationPath,
                  masterLocationSlug: slug,
                }
              });
              setShowLocationDropdown(false);
            };
            return <DeferredCategoryDropdown id="location-suggestions" label="LOCATION SUGGESTIONS" options={combinedLocationOptions} onSelect={selectLocation} onReachEnd={() => maybeLoadMoreSuggestions(locationName.trim(), {
              loading: locationSuggestionState.loading,
              hasMore: locationSuggestionState.hasMore,
              page: locationSuggestionState.page,
              currentQuery: locationSuggestionState.query,
              context: "location"
            })} hasMore={locationSuggestionState.hasMore && locationSuggestionState.query === locationName.trim()} isLoadingMore={locationSuggestionState.loading && locationSuggestionState.query === locationName.trim()} />;
          })()}
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
            const chosen = getSearchSuggestionValue(val);
            setSearchTerm(chosen);
            if (setCategoryName) setCategoryName(chosen);
            setIsDropdownOpen(false);
            handleSearch(undefined, chosen);
          }} />}

            {isDropdownOpen && searchTerm.trim().length >= 2 && <DeferredCategoryDropdown id="business-suggestions" label="SUGGESTIONS" options={suggestionCategories} onReachEnd={() => maybeLoadMoreSuggestions(searchTerm.trim())} hasMore={searchSuggestionState.hasMore && searchSuggestionState.query === searchTerm.trim()} isLoadingMore={searchSuggestionState.loading && searchSuggestionState.query === searchTerm.trim()} onSelect={val => {
            const chosen = getSearchSuggestionValue(val);
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
