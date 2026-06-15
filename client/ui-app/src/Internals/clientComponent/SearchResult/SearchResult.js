import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Box, Chip, Drawer, Button } from "@mui/material";
import styles from "./SearchResult.module.css";
import CardsSearch from "../CardsSearch/CardsSearch";
import CardDesign from "../cards/cards.js";
import SeoMeta from "../seo/seoMeta.js";
import Footer from "../footer/footer.js";
import PopularCategoriesLink from "../popularCategories/popularCategories.js";
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs.js";
import { performSearch, logSearchActivity, fetchNearbyBusinesses } from "../../../redux/actions/businessListAction";
import { extractSearchResultData } from "../../../utils/searchResultNavigation";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import { selectBusinessLoading, selectBusinessError } from "../../../redux/selectors";
import TopBannerAds from "../banners/topBanner/topBanner.js";
import GlobalSkeleton from "../globalSkeleton.js";
import OTPLoginModal from "../AddBusinessModel.js";
import FilterPanel from "./FilterPanel.js";
import axiosInstance from "../../../services/axiosInstance.js";
import { getClientToken } from "../../../redux/actions/clientAuthAction.js";
import { generateSearchResultsPageSchema, generateBreadcrumbSchema, generateOrganizationSchema, generateWebsiteSchema, generateFAQSchema } from "../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const createSlug = (text = "") => text.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const isActiveFilterValue = (value) =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== undefined && value !== "";

const cleanFilterValues = (filters = {}) =>
  Object.entries(filters).reduce((cleaned, [key, value]) => {
    if (isActiveFilterValue(value)) {
      cleaned[key] = value;
    }
    return cleaned;
  }, {});

const GoogleAd = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-3217097513155005"
      data-ad-slot="1401736258"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

const sanitizeSeoHtml = (html = "") => {
  return html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
};
const SearchResults = React.memo(() => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const urlParams = useParams();
  const locationState = useLocation();
  const [openLoginModal, setOpenLoginModal] = useState(false);

  const {
    searchTerm,
    location: locationText,
    displayName,
    isKnownCategory,
    results: stateResults,
    logAlreadySent: stateLogSent
  } = extractSearchResultData(locationState.state || {}, urlParams);

  const safeStateResults = Array.isArray(stateResults) ? stateResults : null;
  const searchText = displayName;
  const normalizedSearchTerm = searchTerm;

  const locationSlug = createSlug(locationText);
  const searchSlug = createSlug(normalizedSearchTerm);
  const canonicalUrl = `https://massclick.in/${locationSlug}/${searchSlug}`;
  const loading = useSelector(selectBusinessLoading);
  const error = useSelector(selectBusinessError);
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer || {});
  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false
  } = useSelector(state => state.seoPageContentReducer || {});

  // ─── Core results state ──────────────────────────────────────────────────────
  const [results, setResults] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [filterConfig, setFilterConfig] = useState([]);
  const [sortBy, setSortBy] = useState("relevant");
  const [viewMode, setViewMode] = useState("list");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // ─── Geo state (on-demand) ───────────────────────────────────────────────────
  const [userGeo, setUserGeo] = useState(null);        // { lat, lng } or null
  const [geoStatus, setGeoStatus] = useState("idle");  // "idle" | "requesting" | "granted" | "denied"

  // ─── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ─── Nearby section ──────────────────────────────────────────────────────────
  const [nearbyResults, setNearbyResults] = useState([]);

  // ─── Refs ────────────────────────────────────────────────────────────────────
  const stateAppliedRef = useRef(false);
  const requestIdRef = useRef(0);
  const searchControlsChangedRef = useRef(false);
  const sentinelRef = useRef(null);
  const loadingPagesRef = useRef(new Set());   // pages currently in-flight
  const searchVersionRef = useRef(0);          // bumped on every search-control change

  useEffect(() => {
    const authUser = localStorage.getItem("authUser");
    if (!authUser) {
      setOpenLoginModal(true);
    }
  }, []);

  const searchLoggedRef = useRef(false);
  useEffect(() => {
    searchLoggedRef.current = false;
  }, [normalizedSearchTerm, locationText]);

  // Reset all pagination/search state when the search context changes
  useEffect(() => {
    searchVersionRef.current++;
    searchControlsChangedRef.current = false;
    setActiveFilters({});
    setSortBy("relevant");
    stateAppliedRef.current = false;
    setCurrentPage(1);
    setTotalResults(0);
    setHasMore(false);
    setNearbyResults([]);
    loadingPagesRef.current.clear();
  }, [normalizedSearchTerm, locationText]);

  // Reset pagination when filters or sort change (but not the search term itself)
  useEffect(() => {
    searchVersionRef.current++;
    setCurrentPage(1);
    setTotalResults(0);
    setHasMore(false);
    setNearbyResults([]);
    loadingPagesRef.current.clear();
  }, [activeFilters, sortBy]); // eslint-disable-line

  // Reset sort to relevant when geo is denied mid-session
  useEffect(() => {
    if (sortBy === "nearest" && geoStatus === "denied") {
      setSortBy("relevant");
    }
  }, [geoStatus, sortBy]);

  const logSearch = useCallback(() => {
    if (searchLoggedRef.current) return;
    if (stateLogSent) {
      searchLoggedRef.current = true;
      return;
    }
    if (!safeStateResults && loading) return;
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    const matchedBusinessIds = results.map((business) => business?._id).filter(Boolean);
    dispatch(
      logSearchActivity(
        normalizedSearchTerm || "All Categories",
        locationText || "Global",
        userDetails,
        normalizedSearchTerm,
        isKnownCategory,
        matchedBusinessIds
      )
    );
    searchLoggedRef.current = true;
  }, [dispatch, normalizedSearchTerm, locationText, stateLogSent, isKnownCategory, results, safeStateResults, loading]);

  useEffect(() => {
    logSearch();
  }, [logSearch]);

  useEffect(() => {
    const handleAuthChange = () => {
      if (!searchLoggedRef.current) logSearch();
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, [logSearch]);

  // Build the extra params object for a search request
  const buildSearchParams = useCallback((page = 1) => {
    const params = {};
    if (sortBy !== "relevant") params.sortBy = sortBy;
    const { minRating, openNow, verified, featured, sponsored, trending, ...categoryFilters } = activeFilters;
    const cleanCategoryFilters = cleanFilterValues(categoryFilters);
    if (minRating) params.minRating = minRating;
    if (openNow) params.openNow = openNow;
    if (verified) params.verified = verified;
    if (featured) params.featured = featured;
    if (sponsored) params.sponsored = sponsored;
    if (trending) params.trending = trending;
    if (Object.keys(cleanCategoryFilters).length > 0) {
      params.filters = JSON.stringify(cleanCategoryFilters);
    }
    params.page = page;
    params.pageSize = 20;
    if (userGeo) {
      params.lat = userGeo.lat;
      params.lng = userGeo.lng;
    }
    return params;
  }, [sortBy, activeFilters, userGeo]);

  // ─── Initial load: use state results from navigation OR fetch from API ────────
  useEffect(() => {
    if (Array.isArray(safeStateResults) && safeStateResults.length > 0 && !stateAppliedRef.current) {
      setResults(safeStateResults);
      setTotalResults(safeStateResults.length);
      setHasMore(false); // state results are a snapshot — no pagination
      stateAppliedRef.current = true;
      return;
    }
    if (safeStateResults && safeStateResults.length > 0) return;
    if (!normalizedSearchTerm || !locationText) return;

    const requestId = ++requestIdRef.current;
    dispatch(performSearch(normalizedSearchTerm, locationText, isKnownCategory, buildSearchParams(1))).then(action => {
      if (requestId !== requestIdRef.current) return;
      const data = action?.payload;
      const normalized = data && !Array.isArray(data)
        ? data
        : { results: Array.isArray(data) ? data : [], total: 0, hasMore: false };
      setResults(normalized.results || []);
      setTotalResults(normalized.total || 0);
      setHasMore(normalized.hasMore || false);
      setCurrentPage(1);
      loadingPagesRef.current.clear();
    });
  }, [safeStateResults, normalizedSearchTerm, locationText, isKnownCategory, dispatch]); // eslint-disable-line

  // ─── Re-fetch when filters / sort / geo change ───────────────────────────────
  const normalizedActiveFilters = useMemo(() => cleanFilterValues(activeFilters), [activeFilters]);
  const hasActiveFilters = Object.values(normalizedActiveFilters).some(isActiveFilterValue);

  useEffect(() => {
    if (!normalizedSearchTerm || !locationText) return;
    if (!hasActiveFilters && sortBy === "relevant" && !userGeo && !searchControlsChangedRef.current) return;

    const requestId = ++requestIdRef.current;
    dispatch(performSearch(normalizedSearchTerm, locationText, isKnownCategory, buildSearchParams(1))).then(action => {
      if (requestId !== requestIdRef.current) return;
      const data = action?.payload;
      const normalized = data && !Array.isArray(data)
        ? data
        : { results: Array.isArray(data) ? data : [], total: 0, hasMore: false };
      setResults(normalized.results || []);
      setTotalResults(normalized.total || 0);
      setHasMore(normalized.hasMore || false);
      setCurrentPage(1);
      loadingPagesRef.current.clear();
    });
  }, [normalizedActiveFilters, hasActiveFilters, sortBy, normalizedSearchTerm, locationText, isKnownCategory, userGeo, dispatch]); // eslint-disable-line

  // ─── Fetch filterConfig for this category ────────────────────────────────────
  useEffect(() => {
    if (!normalizedSearchTerm) return;
    const slug = normalizedSearchTerm.toLowerCase().trim().replace(/\s+/g, "-");
    axiosInstance.get(`/category/${encodeURIComponent(slug)}/filters`)
      .then(res => setFilterConfig(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFilterConfig([]));
  }, [normalizedSearchTerm]);

  // ─── Infinite scroll: load next page directly (bypasses Redux loading state) ─
  const loadPage = useCallback(async (page) => {
    if (loadingPagesRef.current.has(page)) return;
    if (!hasMore) return;
    if (!normalizedSearchTerm || !locationText) return;

    const capturedVersion = searchVersionRef.current;
    loadingPagesRef.current.add(page);
    setIsLoadingMore(true);

    try {
      const token = await dispatch(getClientToken());
      const params = {
        ...(isKnownCategory
          ? { category: normalizedSearchTerm }
          : { term: normalizedSearchTerm }),
        location: locationText,
        ...buildSearchParams(page)
      };
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/businesslist/search`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );

      if (searchVersionRef.current !== capturedVersion) return; // stale — search changed mid-flight

      const raw = response.data;
      const isLegacy = Array.isArray(raw);
      const newResults = isLegacy ? raw : (raw.results || []);
      const newHasMore = isLegacy ? false : (raw.hasMore || false);
      const newTotal = isLegacy ? raw.length : (raw.total || 0);

      setResults(prev => {
        const seen = new Set(prev.map(b => b._id));
        return [...prev, ...newResults.filter(b => !seen.has(b._id))];
      });
      setCurrentPage(page);
      setHasMore(newHasMore);
      setTotalResults(newTotal);

    } catch (err) {
      console.warn("loadPage error:", err.message);
    } finally {
      loadingPagesRef.current.delete(page);
      setIsLoadingMore(false);
    }
  }, [hasMore, normalizedSearchTerm, locationText, buildSearchParams, isKnownCategory, dispatch]);

  // ─── IntersectionObserver for infinite scroll ─────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadPage(currentPage + 1); },
      { rootMargin: "200px", threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, currentPage, loadPage]);

  // ─── Nearby businesses fetch (only when geo granted) ─────────────────────────
  useEffect(() => {
    if (!userGeo || geoStatus !== "granted" || !normalizedSearchTerm) return;
    let cancelled = false;

    dispatch(fetchNearbyBusinesses({
      lat: userGeo.lat,
      lng: userGeo.lng,
      category: normalizedSearchTerm,
      limit: 6
    })).then(result => {
      if (!cancelled) setNearbyResults(result.data || []);
    });

    return () => { cancelled = true; };
  }, [userGeo, geoStatus, normalizedSearchTerm, dispatch]);

  // ─── Filter handlers ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((key, value) => {
    searchControlsChangedRef.current = true;
    setActiveFilters(prev => {
      const next = { ...prev };
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const handleSortChange = useCallback((value) => {
    // "Nearest" requires geo permission — request on-demand
    if (value === "nearest" && geoStatus !== "granted") {
      if (!navigator.geolocation) return;
      setGeoStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoStatus("granted");
          searchControlsChangedRef.current = true;
          setSortBy("nearest");
        },
        () => {
          setGeoStatus("denied");
          // Keep current sort — don't switch to nearest
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
      return;
    }
    searchControlsChangedRef.current = true;
    setSortBy(value);
  }, [geoStatus]);

  const handleClearAllFilters = useCallback(() => {
    searchControlsChangedRef.current = true;
    setActiveFilters({});
    setSortBy("relevant");
  }, []);

  const activeFilterChips = Object.entries(normalizedActiveFilters).flatMap(([key, value]) => {
    if (Array.isArray(value)) return value.map(v => ({ key, value: v, label: v }));
    if (key === "minRating") return [{ key, value, label: `${value}+ Stars` }];
    if (key === "openNow") return [{ key, value, label: "Open Now" }];
    if (key === "verified") return [{ key, value, label: "Verified" }];
    if (key === "featured") return [{ key, value, label: "Featured" }];
    if (key === "sponsored") return [{ key, value, label: "Sponsored" }];
    if (key === "trending") return [{ key, value, label: "Trending" }];
    return [{ key, value, label: String(value) }];
  });

  const totalActiveCount = activeFilterChips.length + (sortBy !== "relevant" ? 1 : 0);
  const viewOptions = [
    { value: "list", label: "List", icon: ViewListIcon },
    { value: "grid", label: "Grid", icon: ViewModuleIcon },
    { value: "large", label: "Large", icon: ViewAgendaIcon },
    { value: "table", label: "Table", icon: ViewHeadlineIcon },
  ];

  useEffect(() => {
    if (!normalizedSearchTerm || !locationText) return;
    dispatch({ type: CLEAR_SEO_META });
    dispatch(fetchSeoMeta({
      pageType: "category",
      category: normalizedSearchTerm.toLowerCase(),
      location: locationText.toLowerCase()
    }));
  }, [dispatch, normalizedSearchTerm, locationText]);

  useEffect(() => {
    if (!normalizedSearchTerm) return;
    dispatch(fetchSeoPageContentMeta({
      pageType: "category",
      category: normalizedSearchTerm.replace(/-/g, " "),
      ...(locationText ? { location: locationText } : {})
    }));
  }, [dispatch, normalizedSearchTerm, locationText]);

  const handleRetry = useCallback(() => {
    dispatch(performSearch(searchText, locationText));
  }, [dispatch, searchText, locationText]);

  if (error) {
    return <>
        <CardsSearch />
        <div className={cx("no-results-container")}>
          <h1>{searchText} in {locationText}</h1>
          <p>Something went wrong</p>
          <button onClick={handleRetry}>Retry</button>
        </div>
      </>;
  }

  const fallbackSeo = {
    title: `${searchText} in ${locationText} | Best ${searchText} Near You | Massclick`,
    description: `Find trusted ${searchText} in ${locationText}. View ratings, reviews, contact details and hire the best ${searchText} near you.`,
    keywords: `${searchText}, ${searchText} in ${locationText}, best ${searchText} ${locationText}, top ${searchText} ${locationText}`,
    canonical: canonicalUrl,
    robots: "index, follow"
  };
  const seoContent = seoPageContents?.[0];
  const sanitizedPageContent = seoContent?.pageContent ? sanitizeSeoHtml(seoContent.pageContent) : null;

  const totalReviewCount = results.reduce((acc, curr) => acc + (curr.totalReviews || 0), 0);
  const totalRatingScore = results.reduce((acc, curr) => acc + (curr.averageRating || 0) * (curr.totalReviews || 0), 0);
  const calculatedRating = totalReviewCount > 0 ? totalRatingScore / totalReviewCount : null;
  const overallRating = calculatedRating !== null ? Math.max(1, Math.min(5, Number(calculatedRating.toFixed(1)))) : null;

  const searchResultsSchema = generateSearchResultsPageSchema(searchText, locationText, results.length, overallRating);
  const categoryBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `${searchText} in ${locationText}`,
    "url": canonicalUrl,
    "description": fallbackSeo.description,
    ...(overallRating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": overallRating,
        "reviewCount": results.length,
        "bestRating": 5,
        "worstRating": 1
      }
    })
  };
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home", url: "https://www.massclick.in"
  }, {
    name: locationText, url: `https://www.massclick.in/${locationSlug}`
  }, {
    name: searchText, url: canonicalUrl
  }]);
  const websiteSchema = generateWebsiteSchema();
  const organizationSchema = generateOrganizationSchema();
  const faqSchema = seoContent?.faqs && seoContent.faqs.length > 0 ? generateFAQSchema(seoContent.faqs) : null;

  return <>
      <OTPLoginModal open={openLoginModal} handleClose={() => setOpenLoginModal(false)} />
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

      <Helmet>
        {searchResultsSchema && <script type="application/ld+json">{JSON.stringify(searchResultsSchema)}</script>}
        {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
        {websiteSchema && <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>}
        {organizationSchema && <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>}
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        {categoryBusinessSchema && <script type="application/ld+json">{JSON.stringify(categoryBusinessSchema)}</script>}
      </Helmet>

      <div className={cx("results-page")}>
        <CardsSearch />
        <main>
        <div className={cx("page-spacing")} />
        <div className={cx("results-container banner-section")}>
          <TopBannerAds category={searchText} />
        </div>

        <div className={cx("results-container content-section")}>
          <Breadcrumbs items={[{
            label: "Home",
            link: "/"
          }, {
            label: locationText,
            onClick: () => window.location.reload()
          }, {
            label: searchText
          }]} />
          <div className={cx("results-heading")}>
            <h1 className={cx("main-seo-heading")}>
              Best {searchText} in {locationText}
            </h1>
            <h2 className={cx("results-subheading")}>
              Discover trusted {searchText} in {locationText}. Compare ratings,
              reviews and contact details to find the best near you.
            </h2>

            <div className={cx("category-trust-badges")}>
              <span className={cx("trust-badge")}><VerifiedIcon fontSize="small" /> Verified Listings</span>
              <span className={cx("trust-badge")}><StarIcon fontSize="small" /> Top Rated Businesses</span>
              <span className={cx("trust-badge")}><GroupsIcon fontSize="small" /> Trusted by Thousands</span>
              <span className={cx("trust-badge")}><LockIcon fontSize="small" /> Secure Enquiry Platform</span>
            </div>
          </div>

          {/* Active filter chips row */}
          {activeFilterChips.length > 0 && (
            <div className={cx("filter-chips-row")}>
              {activeFilterChips.map((chip, i) => (
                <Chip key={`${chip.key}-${chip.value}-${i}`} label={chip.label} size="small"
                  onDelete={() => {
                    const current = activeFilters[chip.key];
                    if (Array.isArray(current)) {
                      const updated = current.filter(v => v !== chip.value);
                      handleFilterChange(chip.key, updated.length > 0 ? updated : null);
                    } else {
                      handleFilterChange(chip.key, null);
                    }
                  }}
                  deleteIcon={<CloseIcon sx={{ fontSize: "12px !important" }} />}
                  sx={{ bgcolor: "#fff3e0", color: "#e65100", border: "1px solid #ffb74d", fontSize: "12px", height: 26 }} />
              ))}
              <Chip label="Clear all" size="small" onClick={handleClearAllFilters}
                sx={{ bgcolor: "transparent", border: "1px solid #ccc", color: "#666", fontSize: "12px", height: 26, cursor: "pointer" }} />
            </div>
          )}

          {/* Three-column layout: filter | results | ads */}
          <div className={cx("search-layout")}>
            {/* Desktop filter column */}
            <div className={cx("filter-column")}>
              <FilterPanel
                filterConfig={filterConfig}
                activeFilters={activeFilters}
                sortBy={sortBy}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onClearAll={handleClearAllFilters}
                hasGeo={geoStatus === "granted"}
              />
            </div>

            {/* Results column */}
            <div className={cx("results-column")}>
              <div className={cx("results-toolbar")}>
                <div className={cx("view-toggle")} aria-label="Choose listing view">
                  {viewOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={cx("view-toggle-button", viewMode === value && "view-toggle-button--active")}
                      onClick={() => setViewMode(value)}
                      aria-label={`${label} view`}
                      aria-pressed={viewMode === value}
                      title={`${label} view`}
                    >
                      <Icon fontSize="small" />
                    </button>
                  ))}
                </div>
                {!loading && totalResults > 0 && (
                  <p className={cx("result-count")}>
                    Showing {results.length} of {totalResults} result{totalResults !== 1 ? "s" : ""}
                  </p>
                )}
                {!loading && totalResults === 0 && results.length > 0 && (
                  <p className={cx("result-count")}>
                    Showing {results.length} result{results.length !== 1 ? "s" : ""}
                  </p>
                )}
                <label className={cx("sort-control")}>
                  <span>Sort by</span>
                  <select value={sortBy} onChange={e => handleSortChange(e.target.value)}>
                    <option value="relevant">Relevant</option>
                    <option value="rating">Rating</option>
                    <option value="newest">Latest</option>
                    {geoStatus !== "granted" && (
                      <option value="nearest">Nearest (requires location)</option>
                    )}
                  </select>
                </label>
              </div>

              {loading && <GlobalSkeleton type="list" />}

              {!loading && results.length === 0 && (
                <div className={cx("no-results-container")}>
                  <p className={cx("no-results-title")}>No results found 😔</p>
                  {hasActiveFilters && (
                    <button className={cx("go-home-button")} onClick={handleClearAllFilters}>
                      Clear Filters
                    </button>
                  )}
                  {!hasActiveFilters && (
                    <button className={cx("go-home-button")} onClick={() => navigate("/")}>
                      Go to Homepage
                    </button>
                  )}
                </div>
              )}

              <div className={cx("business-list", `business-list--${viewMode}`)}>
                {results.map((business, idx) => {
                  const averageRating = Number(business.averageRating);
                  const totalRatings = typeof business.totalReviews === "number" ? business.totalReviews : 0;
                  const businessUrl = `/business/${createSlug(business.location)}/${createSlug(business.businessName)}/${business._id}`;
                  return (
                    <div className={cx("business-card-wrapper")} key={business._id}>
                      <CardDesign
                        businessId={business._id}
                        title={business.businessName}
                        phone={business.contact}
                        whatsappNumber={business.whatsappNumber}
                        contactList={business.contactList}
                        rating={Number.isFinite(averageRating) && averageRating > 0 ? averageRating : null}
                        reviews={totalRatings}
                        address={business.location}
                        experience={business.experience}
                        category={business.category}
                        price={business.filters?.price || business.filters?.priceRange || business.price || null}
                        imageSrc={business.bannerImage || "/header.png"}
                        to={businessUrl}
                        isVerified={!!business.verification?.isVerified}
                        isTrusted={!!(business.badges?.isTrusted || business.badges?.isTrust || business.verification?.isTrusted)}
                        certificateType={business.verification?.certificateType || business.verification?.verificationType}
                        isFeatured={!!business.badges?.isFeatured}
                        isSponsored={!!business.badges?.isSponsored}
                        isTrending={!!business.badges?.isTrending}
                        filters={business.filters}
                        filterConfig={filterConfig}
                        distance={typeof business.distance === "number" ? business.distance : null}
                        viewMode={viewMode}
                        index={idx}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && <div ref={sentinelRef} className={cx("scroll-sentinel")} aria-hidden="true" />}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className={cx("loading-more")}>
                  <span className={cx("loading-more-dot")} />
                  <span className={cx("loading-more-dot")} />
                  <span className={cx("loading-more-dot")} />
                </div>
              )}

              {/* Nearby businesses section — shown only when user has granted geo */}
              {nearbyResults.filter(b => !results.some(r => r._id === b._id)).length > 0 && (
                <section className={cx("nearby-section")}>
                  <h3 className={cx("nearby-heading")}>
                    <LocationOnIcon sx={{ fontSize: 20, color: "#ff8c00" }} />
                    More {searchText} Near You
                  </h3>
                  <div className={cx("nearby-strip")}>
                    {nearbyResults.filter(b => !results.some(r => r._id === b._id)).map((b, idx) => {
                      const businessUrl = `/business/${createSlug(b.location)}/${createSlug(b.businessName)}/${b._id}`;
                      return (
                        <div className={cx("nearby-card")} key={b._id}>
                          <CardDesign
                            businessId={b._id}
                            title={b.businessName}
                            phone={b.contact}
                            whatsappNumber={b.whatsappNumber}
                            rating={Number.isFinite(Number(b.averageRating)) && Number(b.averageRating) > 0 ? Number(b.averageRating) : null}
                            reviews={b.totalReviews || 0}
                            address={b.location}
                            experience={b.experience}
                            category={b.category}
                            price={b.filters?.price || b.filters?.priceRange || null}
                            imageSrc={b.bannerImage || "/header.png"}
                            to={businessUrl}
                            isVerified={!!b.verification?.isVerified}
                            isTrusted={!!(b.badges?.isTrusted || b.badges?.isTrust || b.verification?.isTrusted)}
                            certificateType={b.verification?.certificateType || b.verification?.verificationType}
                            isFeatured={!!b.badges?.isFeatured}
                            isSponsored={!!b.badges?.isSponsored}
                            isTrending={!!b.badges?.isTrending}
                            filters={b.filters}
                            filterConfig={filterConfig}
                            distance={typeof b.distance === "number" ? b.distance : null}
                            viewMode="grid"
                            index={idx}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right ads column — only for single-column (list / table) modes */}
            {(viewMode === "list" || viewMode === "table") && (
              <div className={cx("ads-column")}>
                <GoogleAd />
              </div>
            )}
          </div>
        </div>

        {/* Mobile filter drawer */}
        <Drawer anchor="bottom" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
          PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" } }}>
          <Box sx={{ overflowY: "auto", flex: 1, p: 2, WebkitOverflowScrolling: "touch" }}>
            <FilterPanel
              filterConfig={filterConfig}
              activeFilters={activeFilters}
              sortBy={sortBy}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              onClearAll={handleClearAllFilters}
              hasGeo={geoStatus === "granted"}
            />
          </Box>
          <Box sx={{ p: 2, pt: 1, flexShrink: 0, borderTop: "1px solid #f1f5f9", bgcolor: "#fff" }}>
            <Button fullWidth variant="contained" onClick={() => setFilterDrawerOpen(false)}
              sx={{ bgcolor: "#ff8c00", "&:hover": { bgcolor: "#e07800" }, borderRadius: 2, fontWeight: 700 }}>
              Apply Filters {totalActiveCount > 0 ? `(${totalActiveCount})` : ""}
            </Button>
          </Box>
        </Drawer>

        {/* Mobile sticky filter bar */}
        <div className={cx("mobile-filter-bar")}>
          <button className={cx("mobile-filter-btn")} onClick={() => setFilterDrawerOpen(true)}>
            <TuneIcon sx={{ fontSize: 16 }} />
            Filters {totalActiveCount > 0 ? `(${totalActiveCount})` : ""}
          </button>
        </div>

        {!seoContentLoading && sanitizedPageContent && <div className={cx("seo-outer-wrapper")}>
            <div className={cx("seo-article-wrapper")}>
              <article className={cx("seo-article")}>
                <div className={cx("seo-divider")} />
                <section className={cx("seo-page-content")} dangerouslySetInnerHTML={{ __html: sanitizedPageContent }} />
              </article>
            </div>
          </div>}
        </main>
        <div className={cx("bottom-sections-wrapper")}>
          <PopularCategoriesLink />
          <Footer />
        </div>
      </div>
    </>;
});
export default SearchResults;
