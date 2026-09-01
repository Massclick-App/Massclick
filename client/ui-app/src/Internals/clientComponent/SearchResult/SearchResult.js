import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import TuneIcon from "@mui/icons-material/Tune";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import styles from "./SearchResult.module.css";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import CardDesign from "../cards/cards.js";
import { formatBusinessAddress } from "../../../utils/formatBusinessAddress.js";
import SeoMeta from "../seo/seoMeta.js";
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs.js";
import {
  performSearch,
  logSearchActivity,
  fetchNearbyBusinesses,
} from "../../../redux/actions/businessListAction";
import { buildBusinessPath, buildCategoryPath, extractSearchResultData } from "../../../utils/searchResultNavigation";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import {
  selectBusinessLoading,
  selectBusinessError,
} from "../../../redux/selectors";
import TopBannerAds from "../banners/topBanner/topBanner.js";
import CategoryPublicCounterBadge from "../publicUserCounter/CategoryPublicCounterBadge.js";
import axiosInstance from "../../../services/axiosInstance.js";
import { getClientToken } from "../../../redux/actions/clientAuthAction.js";
import {
  generateSearchResultsPageSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateFAQSchema,
} from "../../../utils/seoSchemaGenerators";
import { renderFaqAnswerWithLinks } from "../../../utils/renderFaqAnswerWithLinks";
import useMediaQuery from "../../../hooks/useMediaQuery.js";
import useRenderNearViewport from "../../../hooks/useRenderNearViewport.js";
import { trackSearch } from "../../../utils/webTracker.js";
import { buildCrumbs, crumbsToJsonLd, crumbsToUiItems } from "../../../utils/breadcrumbs";
import { submitSearchIntent } from "../../../utils/searchIntent";

const Footer = lazy(() =>
  import(/* webpackChunkName: "public-footer" */ "../footer/footer.js")
);
const PopularCategoriesLink = lazy(() =>
  import(
    /* webpackChunkName: "popular-categories" */ "../popularCategories/popularCategories.js"
  )
);
const FilterPanel = lazy(() =>
  import(/* webpackChunkName: "filter-panel" */ "./FilterPanel.js")
);
const MobileFilterDrawer = lazy(() =>
  import(
    /* webpackChunkName: "mobile-filter-drawer" */ "./MobileFilterDrawer.js"
  )
);
const OTPLoginModel = lazy(() =>
  import(/* webpackChunkName: "otp-modal" */ "../AddBusinessModel.js"  )
);

const NoResultsRequestForm = lazy(() =>
  import(/* webpackChunkName: "no-results-request" */ "./NoResultsRequestForm.js")
);

const cx = createScopedClassNames(styles);
const DEFAULT_LOCATION = "Trichy";
const createSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const toDisplayText = (value = "") =>
  String(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const buildTemplateLocation = ({ locationName = "", districtName = "", hasSpecificLocation = false } = {}) => {
  const locationLabel = String(locationName || "").trim();
  const districtLabel = String(districtName || "").trim();
  if (!locationLabel) return districtLabel;
  if (!hasSpecificLocation || !districtLabel) return locationLabel;
  if (createSlug(locationLabel) === createSlug(districtLabel)) return locationLabel;
  return `${locationLabel}, ${districtLabel}`;
};
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

const readAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null") || {};
  } catch {
    return {};
  }
};

const buildSearchUserDetails = (authUser = {}) => ({
  userName: authUser?.userName,
  mobileNumber1: authUser?.mobileNumber1,
  mobileNumber2: authUser?.mobileNumber2,
  email: authUser?.email,
});

const getSearchLogIdentity = (authUser = {}) =>
  authUser?._id ||
  authUser?.mobileNumber1 ||
  authUser?.mobileNumber2 ||
  authUser?.email ||
  "anonymous";

const AdvertisementBanner = () => (
  <aside
    className={cx("advertisement-banner")}
    aria-label="Advertisement placement banner"
  >
    <span className={cx("advertisement-label")}>Advertisement</span>
    <h3 className={cx("advertisement-title")}>Place your ad here</h3>
    <p className={cx("advertisement-copy")}>
      Contact us to showcase your business in this premium search result spot.
    </p>
    <a className={cx("advertisement-link")} href="/business-enquiry">
      Contact Us
    </a>
  </aside>
);

const normalizeSeoHref = (href = "") => {
  const value = String(href || "");
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return value;

  const absoluteMatch = trimmed.match(
    /^(https?:\/\/(?:www\.)?massclick\.in)(\/[^?#]*)?([?#].*)?$/i,
  );
  if (absoluteMatch) {
    const [, origin, path = "/", suffix = ""] = absoluteMatch;
    return `${origin.toLowerCase()}${path.toLowerCase()}${suffix}`;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const [, path = "/", suffix = ""] =
      trimmed.match(/^(\/[^?#]*)([?#].*)?$/) || [];
    return `${path.toLowerCase()}${suffix}`;
  }

  return value;
};

const normalizeInternalSeoLinks = (html = "") =>
  html.replace(
    /(<a\b[^>]*\bhref\s*=\s*)(["'])([^"']*)\2/gi,
    (_match, prefix, quote, href) => `${prefix}${quote}${normalizeSeoHref(href)}${quote}`,
  );

const sanitizeSeoHtml = (html = "") => {
  return normalizeInternalSeoLinks(
    html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>"),
  );
};

const RESULT_SKELETON_COUNT = {
  list: 5,
  table: 6,
  grid: 6,
  large: 4,
};

const SearchResultListSkeleton = ({ viewMode = "list" }) => {
  const count = RESULT_SKELETON_COUNT[viewMode] ?? RESULT_SKELETON_COUNT.list;
  const isVertical = viewMode === "grid" || viewMode === "large";
  const isTable = viewMode === "table";

  return (
    <div
      className={cx(
        "business-list",
        `business-list--${viewMode}`,
        "business-list--skeleton",
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          className={cx("business-card-wrapper")}
          key={`sk-${viewMode}-${i}`}
        >
          {isTable ? (
            /* ── table: compact 72px row ── */
            <div className={cx("sk-card", "sk-card--table")}>
              <div className={cx("sk-table-title-block")}>
                <div className={cx("sk-bar", "sk-bar--title")} />
                <div className={cx("sk-pill-row")}>
                  <span className={cx("sk-pill")} />
                </div>
              </div>
              <div className={cx("sk-bar", "sk-bar--table-loc")} />
              <div className={cx("sk-table-actions")}>
                <span className={cx("sk-btn")} />
                <span className={cx("sk-btn")} />
              </div>
            </div>
          ) : isVertical ? (
            /* ── grid / large: vertical card ── */
            <div className={cx("sk-card", `sk-card--${viewMode}`)}>
              <div className={cx("sk-media", `sk-media--${viewMode}`)} />
              <div className={cx("sk-body", "sk-body--vert")}>
                <div className={cx("sk-bar", "sk-bar--title")} />
                <div className={cx("sk-pill-row")}>
                  <span className={cx("sk-pill")} />
                  <span className={cx("sk-pill", "sk-pill--sm")} />
                </div>
                <div className={cx("sk-bar", "sk-bar--md")} />
                <div className={cx("sk-bar", "sk-bar--sm")} />
                <div className={cx("sk-tag-row")}>
                  <span className={cx("sk-tag")} />
                  <span className={cx("sk-tag", "sk-tag--wide")} />
                  <span className={cx("sk-tag")} />
                </div>
                <div className={cx("sk-vert-actions")}>
                  <span className={cx("sk-btn")} />
                  <span className={cx("sk-btn")} />
                  <span className={cx("sk-btn")} />
                </div>
              </div>
            </div>
          ) : (
            /* ── list: horizontal card — mirrors .base-card--list exactly ── */
            <div className={cx("sk-card", "sk-card--list")}>
              <div className={cx("sk-media", "sk-media--list")} />
              <div className={cx("sk-body", "sk-body--list")}>
                <div className={cx("sk-header-row")}>
                  <div className={cx("sk-bar", "sk-bar--title")} />
                  <div className={cx("sk-price")} />
                </div>
                <div className={cx("sk-pill-row")}>
                  <span className={cx("sk-pill")} />
                  <span className={cx("sk-pill", "sk-pill--sm")} />
                  <span className={cx("sk-pill", "sk-pill--cat")} />
                </div>
                <div className={cx("sk-bar", "sk-bar--location")} />
                <div className={cx("sk-bar", "sk-bar--sm")} />
                <div className={cx("sk-tag-row")}>
                  <span className={cx("sk-tag")} />
                  <span className={cx("sk-tag", "sk-tag--wide")} />
                  <span className={cx("sk-tag")} />
                </div>
              </div>
              <div className={cx("sk-list-actions")}>
                <span className={cx("sk-btn")} />
                <span className={cx("sk-btn")} />
                <span className={cx("sk-btn")} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SearchResults = React.memo(
  ({ initialResults, initialTotal, initialHasMore, initialSearchIntent, initialSearchTelemetry, routeContext = null } = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const urlParams = useParams();
    const locationState = useLocation();
    const isCompact = useMediaQuery("(max-width: 1023px)");
    const {
      targetRef: bottomSectionsRef,
      shouldRender: shouldRenderBottomSections,
    } = useRenderNearViewport();
    const mergedRouteParams = useMemo(
      () => ({ ...urlParams, ...(routeContext || {}) }),
      [urlParams, routeContext],
    );
    const isLocationListing = mergedRouteParams.routeType === "locationListing";

    const {
      searchTerm,
      location: locationText,
      masterLocationSlug,
      districtSlug,
      districtName,
      routeLocationSlug,
      routeLocationPath,
      routeLocationName,
      categorySlug,
      subcategorySlug,
      canonicalPath: routeCanonicalPath,
      displayName,
      isKnownCategory,
      results: stateResults,
      searchTelemetry: stateSearchTelemetry,
      logAlreadySent: stateLogSent,
    } = extractSearchResultData(locationState.state || {}, mergedRouteParams);
    // Verified-location picks search by canonical slug (exact node); free text
    // goes through the server-side resolver. Display always uses locationText.
    const apiLocation = districtSlug
      ? routeLocationSlug || routeLocationPath || ""
      : masterLocationSlug || routeLocationSlug || locationText;

    // Guard against nonsensical /:location/:category/:subcategory URLs where
    // :category isn't the subcategory's real parent (e.g. beauty-and-spa/chairs-on-rent
    // — chairs-on-rent actually belongs to rent-and-hire). These render fine today
    // because :category is discarded below, which lets bots index infinite fake
    // combinations. Parent/child pairing is admin-configurable (CategoryDisplaySettings),
    // so it's resolved from the API rather than a hardcoded map.
    const [categoryMismatchTarget, setCategoryMismatchTarget] = useState(null);
    const [resolvedParentCategory, setResolvedParentCategory] = useState(null);

    useEffect(() => {
      setCategoryMismatchTarget(null);
      setResolvedParentCategory(null);
      if (!categorySlug || !subcategorySlug) return;

      let cancelled = false;
      axiosInstance
        .get(`/v2/category/parent-of/${encodeURIComponent(subcategorySlug)}`)
        .then((res) => {
          if (cancelled) return;
          const expectedParentSlug = res.data?.parentSlug;
          const expectedParentName = res.data?.parentName;
          if (expectedParentSlug) {
            setResolvedParentCategory({
              slug: expectedParentSlug,
              name: expectedParentName || toDisplayText(expectedParentSlug),
            });
          }
          if (expectedParentSlug && expectedParentSlug !== categorySlug) {
            setCategoryMismatchTarget(buildCategoryPath({
              districtSlug,
              locationSlug: routeLocationSlug,
              locationPath: routeLocationPath,
              location: locationText,
              categorySlug: expectedParentSlug,
              subcategorySlug,
              isDistrictScope: Boolean(districtSlug && !routeLocationSlug),
            }));
          }
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }, [categorySlug, districtSlug, locationText, routeLocationPath, routeLocationSlug, subcategorySlug]);

    useEffect(() => {
      if (categoryMismatchTarget) {
        navigate(categoryMismatchTarget, { replace: true });
      }
    }, [categoryMismatchTarget, navigate]);

    const safeStateResults = Array.isArray(initialResults)
      ? initialResults
      : Array.isArray(stateResults)
        ? stateResults
        : null;
    const initialTelemetry = initialSearchTelemetry || stateSearchTelemetry || null;
    const searchText = isLocationListing ? "Businesses" : displayName;
    const normalizedSearchTerm = isLocationListing ? "" : searchTerm;
    const [searchInput, setSearchInput] = useState(
      displayName || searchTerm || "",
    );
    const [locationInput, setLocationInput] = useState(
      locationText || DEFAULT_LOCATION,
    );

    const searchSlug = createSlug(normalizedSearchTerm);
    const locationSlug = districtSlug
      ? routeLocationSlug || ""
      : createSlug(locationText);
    const canonicalPath = routeCanonicalPath || buildCategoryPath({
      districtSlug,
      locationSlug,
      locationPath: routeLocationPath,
      location: locationText,
      categorySlug: isLocationListing ? "" : categorySlug || searchSlug,
      subcategorySlug,
      isDistrictScope: Boolean(districtSlug && !locationSlug),
    });
    const canonicalUrl = `https://massclick.in${canonicalPath}`;
    const templateLocation = buildTemplateLocation({
      locationName: locationText,
      districtName,
      hasSpecificLocation: Boolean(districtSlug && (routeLocationSlug || routeLocationPath)),
    });
    const breadcrumbCategorySlug = isLocationListing
      ? ""
      : subcategorySlug
      ? resolvedParentCategory?.slug || categorySlug
      : categorySlug || searchSlug;
    const breadcrumbCategoryName = isLocationListing
      ? ""
      : subcategorySlug
      ? resolvedParentCategory?.name || toDisplayText(breadcrumbCategorySlug)
      : searchText;
    const breadcrumbSubcategoryName = isLocationListing
      ? ""
      : subcategorySlug
      ? searchText || toDisplayText(subcategorySlug)
      : "";
    const breadcrumbCrumbs = districtSlug
      ? buildCrumbs({
          districtSlug,
          districtName,
          locationSlug,
          locationPath: routeLocationPath,
          locationName: routeLocationName || locationText,
          categorySlug: breadcrumbCategorySlug,
          categoryName: breadcrumbCategoryName,
          subcategorySlug,
          subcategoryName: breadcrumbSubcategoryName,
        })
      : [
          { name: "Home", path: "/" },
          ...(locationSlug
            ? [{ name: locationText, path: `/${locationSlug}` }]
            : []),
          ...(subcategorySlug && breadcrumbCategorySlug
            ? [{
                name: breadcrumbCategoryName,
                path: buildCategoryPath({
                  locationSlug,
                  locationPath: routeLocationPath,
                  categorySlug: breadcrumbCategorySlug,
                }),
              }]
            : []),
          { name: breadcrumbSubcategoryName || breadcrumbCategoryName || searchText, path: null },
        ];
    const breadcrumbSchema = crumbsToJsonLd(breadcrumbCrumbs, "https://massclick.in", canonicalPath);
    // buildCrumbs() already folds the terminal category into its location
    // crumb ("Hotels" + "Sembattu" -> "Hotels in Sembattu") whenever there's
    // both a location and a category with no subcategory. When that fold
    // happened, there's no separate trailing location crumb left to strip a
    // link from below — doing so would instead wrongly strip the link off
    // the nearest ANCESTOR location crumb (e.g. "Trichy Road").
    const categoryFoldedIntoLocation =
      !isLocationListing &&
      Boolean(districtSlug) &&
      Boolean(locationSlug || routeLocationPath) &&
      Boolean(breadcrumbCategorySlug) &&
      !subcategorySlug;
    const breadcrumbItems = crumbsToUiItems(breadcrumbCrumbs).map((item, index) => {
      const crumb = breadcrumbCrumbs[index];
      const isTerminalLocationCrumb =
        !categoryFoldedIntoLocation &&
        !isLocationListing &&
        Boolean(districtSlug) &&
        Boolean(categorySlug || searchSlug || subcategorySlug) &&
        index === breadcrumbCrumbs.length - 2 &&
        crumb?.path;
      const isLocationCrumb =
        !isLocationListing &&
        Boolean(districtSlug) &&
        Boolean(categorySlug || searchSlug || subcategorySlug) &&
        index > 1 &&
        index < breadcrumbCrumbs.length - 1 &&
        crumb?.path;

      if (isTerminalLocationCrumb) {
        const plainItem = { ...item };
        delete plainItem.link;
        delete plainItem.state;
        return plainItem;
      }

      if (!isLocationCrumb) return item;

      const locationPathForCrumb = String(crumb.path || "")
        .replace(new RegExp(`^/${districtSlug}/?`), "")
        .replace(/^\/+|\/+$/g, "");
      const parentCategoryPath = buildCategoryPath({
        districtSlug,
        locationPath: locationPathForCrumb,
        categorySlug: subcategorySlug || breadcrumbCategorySlug,
        isDistrictScope: !locationPathForCrumb,
      });

      return { ...item, link: parentCategoryPath };
    });
    const loading = useSelector(selectBusinessLoading);
    const error = useSelector(selectBusinessError);
    const { meta: seoMetaData } = useSelector(
      (state) => state.seoReducer || {},
    );
    const { list: seoPageContents = [], loading: seoContentLoading = false } =
      useSelector((state) => state.seoPageContentReducer || {});

    // ─── Core results state ──────────────────────────────────────────────────────
    const [results, setResults] = useState([]);
    const [activeFilters, setActiveFilters] = useState({});
    const [filterConfig, setFilterConfig] = useState([]);
    const [resolvedCategory, setResolvedCategory] = useState(null);
    const [searchIntent, setSearchIntent] = useState(initialSearchIntent || null);
    const [searchTelemetry, setSearchTelemetry] = useState(initialTelemetry);
    const effectiveCategory =
      isLocationListing ? null : resolvedCategory || (isKnownCategory ? normalizedSearchTerm : null);
    const [sortBy, setSortBy] = useState("relevant");
    const [viewMode, setViewMode] = useState("list");
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const filterDrawerHasOpenedRef = useRef(false);

    // ─── Guest login prompt: open immediately on load for logged-out visitors ────
    const [openLoginModal, setOpenLoginModal] = useState(
      () => !localStorage.getItem("authUser"),
    );

    // ─── Geo state (on-demand) ───────────────────────────────────────────────────
    const [userGeo, setUserGeo] = useState(null); // { lat, lng } or null
    const [geoStatus, setGeoStatus] = useState("idle"); // "idle" | "requesting" | "granted" | "denied"

    // ─── Pagination state ────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [initialSearchResolved, setInitialSearchResolved] = useState(
      Boolean(safeStateResults),
    );

    // ─── Nearby section ──────────────────────────────────────────────────────────
    const [nearbyResults, setNearbyResults] = useState([]);

    // ─── Refs ────────────────────────────────────────────────────────────────────
    const stateAppliedRef = useRef(false);
    const requestIdRef = useRef(0);
    const searchControlsChangedRef = useRef(false);
    const trackedSearchRef = useRef(null);
    const sentinelRef = useRef(null);
    const loadingPagesRef = useRef(new Set()); // pages currently in-flight
    const searchVersionRef = useRef(0); // bumped on every search-control change

    useEffect(() => {
      setSearchInput(displayName || searchTerm || "");
      setLocationInput(locationText || DEFAULT_LOCATION);
      if (locationText) {
        localStorage.setItem("selectedLocation", locationText);
      }
      if (districtSlug) {
        localStorage.setItem("selectedLocationDistrictSlug", districtSlug);
        localStorage.setItem("selectedLocationDistrict", districtName || locationText);
      }
      if (routeLocationSlug) {
        localStorage.setItem("selectedPublicLocationSlug", routeLocationSlug);
      } else if (districtSlug) {
        localStorage.removeItem("selectedPublicLocationSlug");
      }
      if (routeLocationPath) {
        localStorage.setItem("selectedPublicLocationPath", routeLocationPath);
      } else if (districtSlug) {
        localStorage.removeItem("selectedPublicLocationPath");
      }
    }, [displayName, districtName, districtSlug, routeLocationPath, routeLocationSlug, searchTerm, locationText]);

    const lastLoggedIdentityRef = useRef(null);
    useEffect(() => {
      const authUser = readAuthUser();
      lastLoggedIdentityRef.current = stateLogSent
        ? getSearchLogIdentity(authUser)
        : null;
    }, [normalizedSearchTerm, locationText, districtSlug, routeLocationPath, routeLocationSlug, safeStateResults, stateLogSent]);

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
      setResolvedCategory(null);
      setSearchIntent(initialSearchIntent || null);
      setSearchTelemetry(initialTelemetry);
      setInitialSearchResolved(Boolean(safeStateResults));
      loadingPagesRef.current.clear();
    }, [normalizedSearchTerm, locationText, districtSlug, routeLocationPath, routeLocationSlug, safeStateResults, initialSearchIntent, initialTelemetry]);

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
      if (!initialSearchResolved) return;
      const authUser = readAuthUser();
      const currentIdentity = getSearchLogIdentity(authUser);
      if (lastLoggedIdentityRef.current === currentIdentity) return;

      const userDetails = buildSearchUserDetails(authUser);
      const matchedBusinessIds = results
        .map((business) => business?._id)
        .filter(Boolean);
      dispatch(
        logSearchActivity(
          normalizedSearchTerm || "All Categories",
          locationText || "Global",
          userDetails,
          normalizedSearchTerm,
          isKnownCategory,
          matchedBusinessIds,
          searchTelemetry,
        ),
      );
      lastLoggedIdentityRef.current = currentIdentity;
    }, [
      dispatch,
      normalizedSearchTerm,
      locationText,
      isKnownCategory,
      results,
      searchTelemetry,
      initialSearchResolved,
    ]);

    useEffect(() => {
      logSearch();
    }, [logSearch]);

    useEffect(() => {
      const handleAuthChange = () => {
        logSearch();
      };
      window.addEventListener("authChange", handleAuthChange);
      return () => window.removeEventListener("authChange", handleAuthChange);
    }, [logSearch]);

    // Build the extra params object for a search request
    const buildSearchParams = useCallback(
      (page = 1) => {
        const params = {};
        if (sortBy !== "relevant") params.sortBy = sortBy;
        const {
          minRating,
          openNow,
          verified,
          featured,
          sponsored,
          trending,
          ...categoryFilters
        } = activeFilters;
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
        if (districtSlug) params.district = districtSlug;
        params.page = page;
        params.pageSize = 20;
        if (userGeo) {
          params.lat = userGeo.lat;
          params.lng = userGeo.lng;
        }
        return params;
      },
      [sortBy, activeFilters, userGeo, districtSlug],
    );

    const trackResolvedSearch = useCallback((resultsCount) => {
      const searchIdentity = locationState.key
        || `${districtSlug}|${routeLocationPath || routeLocationSlug}|${normalizedSearchTerm}|${locationText}|${isKnownCategory}`;
      if (trackedSearchRef.current === searchIdentity) return;

      trackSearch({
        query: normalizedSearchTerm,
        location: locationText,
        resultsCount: Number(resultsCount) || 0,
        known: isKnownCategory,
      });
      trackedSearchRef.current = searchIdentity;
    }, [districtSlug, isKnownCategory, locationState.key, locationText, normalizedSearchTerm, routeLocationPath, routeLocationSlug]);

    // ─── Initial load: use state results from navigation OR fetch from API ────────
    useEffect(() => {
      if (
        Array.isArray(safeStateResults) &&
        safeStateResults.length > 0 &&
        !stateAppliedRef.current
      ) {
        setResults(safeStateResults);
        setSearchIntent(initialSearchIntent || null);
        setSearchTelemetry(initialTelemetry);
        const resolvedTotal = typeof initialTotal === "number"
          ? initialTotal
          : safeStateResults.length;
        setTotalResults(resolvedTotal);
        // initialResults (from CategoryRouter's prefetch) carries real pagination info;
        // plain navigation-state results are a snapshot with no pagination.
        setHasMore(
          Array.isArray(initialResults) ? Boolean(initialHasMore) : false,
        );
        setInitialSearchResolved(true);
        trackResolvedSearch(resolvedTotal);
        stateAppliedRef.current = true;
        return;
      }
      if (safeStateResults && safeStateResults.length > 0) return;
      if ((!normalizedSearchTerm && !isLocationListing) || !locationText) return;

      const requestId = ++requestIdRef.current;
      dispatch(
        performSearch(
          normalizedSearchTerm,
          apiLocation,
          isKnownCategory,
          buildSearchParams(1),
        ),
      ).then((action) => {
        if (requestId !== requestIdRef.current) return;
        const data = action?.payload;
        const normalized =
          data && !Array.isArray(data)
            ? data
            : {
                results: Array.isArray(data) ? data : [],
                total: 0,
                hasMore: false,
              };
        setResults(normalized.results || []);
        setTotalResults(normalized.total || 0);
        setHasMore(normalized.hasMore || false);
        setResolvedCategory(normalized.resolvedCategory || null);
        setSearchIntent(normalized.searchIntent || null);
        setSearchTelemetry(normalized.searchTelemetry || null);
        setCurrentPage(1);
        setInitialSearchResolved(true);
        trackResolvedSearch(normalized.total || 0);
        loadingPagesRef.current.clear();
      });
    }, [
      safeStateResults,
      normalizedSearchTerm,
      locationText,
      apiLocation,
      districtSlug,
      routeLocationSlug,
      routeLocationPath,
      isKnownCategory,
      isLocationListing,
      dispatch,
      buildSearchParams,
      initialHasMore,
      initialResults,
      initialSearchIntent,
      initialTelemetry,
      initialTotal,
      trackResolvedSearch,
    ]);

    // ─── Re-fetch when filters / sort / geo change ───────────────────────────────
    const normalizedActiveFilters = useMemo(
      () => cleanFilterValues(activeFilters),
      [activeFilters],
    );
    const hasActiveFilters = Object.values(normalizedActiveFilters).some(
      isActiveFilterValue,
    );

    useEffect(() => {
      if ((!normalizedSearchTerm && !isLocationListing) || !locationText) return;
      if (
        !hasActiveFilters &&
        sortBy === "relevant" &&
        !userGeo &&
        !searchControlsChangedRef.current
      )
        return;

      const requestId = ++requestIdRef.current;
      dispatch(
        performSearch(
          normalizedSearchTerm,
          apiLocation,
          isKnownCategory,
          buildSearchParams(1),
        ),
      ).then((action) => {
        if (requestId !== requestIdRef.current) return;
        const data = action?.payload;
        const normalized =
          data && !Array.isArray(data)
            ? data
            : {
                results: Array.isArray(data) ? data : [],
                total: 0,
                hasMore: false,
              };
        setResults(normalized.results || []);
        setTotalResults(normalized.total || 0);
        setHasMore(normalized.hasMore || false);
        setResolvedCategory(normalized.resolvedCategory || null);
        setSearchIntent(normalized.searchIntent || null);
        setSearchTelemetry(normalized.searchTelemetry || null);
        setCurrentPage(1);
        setInitialSearchResolved(true);
        loadingPagesRef.current.clear();
      });
    }, [
      normalizedActiveFilters,
      hasActiveFilters,
      sortBy,
      normalizedSearchTerm,
      locationText,
      apiLocation,
      districtSlug,
      routeLocationSlug,
      routeLocationPath,
      isKnownCategory,
      isLocationListing,
      userGeo,
      dispatch,
      buildSearchParams,
    ]);

    // ─── Fetch filterConfig for this category ────────────────────────────────────
    useEffect(() => {
      if (!effectiveCategory) {
        setFilterConfig([]);
        return;
      }
      const slug = effectiveCategory.toLowerCase().trim().replace(/\s+/g, "-");
      axiosInstance
        .get(`/category/${encodeURIComponent(slug)}/filters`)
        .then((res) => {
          setFilterConfig(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setFilterConfig([]);
        });
    }, [effectiveCategory]);

    // ─── Infinite scroll: load next page directly (bypasses Redux loading state) ─
    const loadPage = useCallback(
      async (page) => {
        if (loadingPagesRef.current.has(page)) return;
        if (!hasMore) return;
        if ((!normalizedSearchTerm && !isLocationListing) || !locationText) return;

        const capturedVersion = searchVersionRef.current;
        loadingPagesRef.current.add(page);
        setIsLoadingMore(true);

        try {
          const token = await dispatch(getClientToken());
          const params = {
            ...(effectiveCategory
              ? { category: effectiveCategory }
              : { term: normalizedSearchTerm }),
            location: apiLocation,
            ...buildSearchParams(page),
          };
          const response = await axiosInstance.get(
            `${process.env.REACT_APP_API_URL}/businesslist/search`,
            { headers: { Authorization: `Bearer ${token}` }, params },
          );

          if (searchVersionRef.current !== capturedVersion) return;

          const raw = response.data;
          const isLegacy = Array.isArray(raw);
          const newResults = isLegacy ? raw : raw.results || [];
          const newHasMore = isLegacy ? false : raw.hasMore || false;
          const newTotal = isLegacy ? raw.length : raw.total || 0;

          setResults((prev) => {
            const seen = new Set(prev.map((b) => b._id));
            return [...prev, ...newResults.filter((b) => !seen.has(b._id))];
          });
          setCurrentPage(page);
          setHasMore(newHasMore);
          setTotalResults(newTotal);
        } catch {
          // swallow — sentinel retriggers on next intersection
        } finally {
          loadingPagesRef.current.delete(page);
          setIsLoadingMore(false);
        }
      },
      [
        hasMore,
        normalizedSearchTerm,
        locationText,
        apiLocation,
        buildSearchParams,
        effectiveCategory,
        isLocationListing,
        dispatch,
      ],
    );

    // ─── IntersectionObserver for infinite scroll ─────────────────────────────────
    useEffect(() => {
      const sentinel = sentinelRef.current;
      if (!sentinel || !hasMore) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) loadPage(currentPage + 1);
        },
        { rootMargin: "200px", threshold: 0.01 },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }, [hasMore, currentPage, loadPage]);

    // ─── Nearby businesses fetch (only when geo granted) ─────────────────────────
    useEffect(() => {
      if (!userGeo || geoStatus !== "granted" || !effectiveCategory) return;
      let cancelled = false;

      dispatch(
        fetchNearbyBusinesses({
          lat: userGeo.lat,
          lng: userGeo.lng,
          category: effectiveCategory,
          limit: 6,
        }),
      ).then((result) => {
        if (cancelled) return;
        setNearbyResults(result.data || []);
      });

      return () => {
        cancelled = true;
      };
    }, [userGeo, geoStatus, effectiveCategory, dispatch]);

    // ─── Filter handlers ──────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((key, value) => {
      searchControlsChangedRef.current = true;
      setActiveFilters((prev) => {
        const next = { ...prev };
        if (
          value === null ||
          value === undefined ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete next[key];
        } else {
          next[key] = value;
        }
        return next;
      });
    }, []);

    const handleSortChange = useCallback(
      (value) => {
        // "Nearest" requires geo permission — request on-demand
        if (value === "nearest" && geoStatus !== "granted") {
          if (!navigator.geolocation) return;
          setGeoStatus("requesting");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserGeo({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              setGeoStatus("granted");
              searchControlsChangedRef.current = true;
              setSortBy("nearest");
            },
            () => {
              setGeoStatus("denied");
              // Keep current sort — don't switch to nearest
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
          );
          return;
        }
        searchControlsChangedRef.current = true;
        setSortBy(value);
      },
      [geoStatus],
    );

    const handleClearAllFilters = useCallback(() => {
      searchControlsChangedRef.current = true;
      setActiveFilters({});
      setSortBy("relevant");
    }, []);

    const activeFilterChips = Object.entries(normalizedActiveFilters).flatMap(
      ([key, value]) => {
        if (Array.isArray(value))
          return value.map((v) => ({ key, value: v, label: v }));
        if (key === "minRating")
          return [{ key, value, label: `${value}+ Stars` }];
        if (key === "openNow") return [{ key, value, label: "Open Now" }];
        if (key === "verified") return [{ key, value, label: "Verified" }];
        if (key === "featured") return [{ key, value, label: "Featured" }];
        if (key === "sponsored") return [{ key, value, label: "Sponsored" }];
        if (key === "trending") return [{ key, value, label: "Trending" }];
        return [{ key, value, label: String(value) }];
      },
    );

    const totalActiveCount =
      activeFilterChips.length + (sortBy !== "relevant" ? 1 : 0);
    const viewOptions = [
      { value: "list", label: "List", icon: ViewListIcon },
      { value: "grid", label: "Grid", icon: ViewModuleIcon },
      { value: "large", label: "Large", icon: ViewAgendaIcon },
      { value: "table", label: "Table", icon: ViewHeadlineIcon },
    ];

    useEffect(() => {
      if (!effectiveCategory || !locationText) return;
      const seoParams = {
        pageType: "category",
        category: effectiveCategory.toLowerCase(),
        ...(districtSlug && !routeLocationSlug && !routeLocationPath
          ? {}
          : { location: routeLocationSlug || routeLocationPath || locationText.toLowerCase() }),
        ...(routeLocationPath ? { locationPath: routeLocationPath } : {}),
        ...(routeCanonicalPath ? { canonicalPath: routeCanonicalPath } : {}),
        ...(districtSlug ? { district: districtSlug } : {}),
      };
      dispatch({ type: CLEAR_SEO_META });
      dispatch(fetchSeoMeta(seoParams));
    }, [dispatch, districtSlug, effectiveCategory, locationText, routeCanonicalPath, routeLocationPath, routeLocationSlug]);

    useEffect(() => {
      if (!effectiveCategory) return;
      const seoContentParams = {
        pageType: "category",
        category: effectiveCategory.replace(/-/g, " "),
        ...(locationText ? { location: locationText } : {}),
        ...(templateLocation ? { displayLocation: templateLocation } : {}),
        ...(districtSlug ? { district: districtSlug } : {}),
      };
      dispatch(fetchSeoPageContentMeta(seoContentParams));
    }, [dispatch, districtSlug, effectiveCategory, locationText, templateLocation]);

    const handleRetry = useCallback(() => {
      dispatch(performSearch(normalizedSearchTerm, apiLocation, isKnownCategory, buildSearchParams(1)));
    }, [dispatch, normalizedSearchTerm, apiLocation, isKnownCategory, buildSearchParams]);

    const handleSearchIntentSuggestion = useCallback(() => {
      const correctedQuery = String(searchIntent?.correctedQuery || "").trim();
      if (!correctedQuery) return;

      submitSearchIntent({
        searchTerm: correctedQuery,
        locationName: locationInput || locationText,
        defaultLocation: DEFAULT_LOCATION,
        navigate,
        dispatch,
        setLocationName: setLocationInput,
        setCategoryName: setSearchInput,
        isKnownCategory: false,
      });
    }, [dispatch, locationInput, locationText, navigate, searchIntent?.correctedQuery]);

    if (categoryMismatchTarget) {
      return null;
    }

    if (error) {
      return (
        <>
          <StickySearchBar
            locationName={locationInput}
            setLocationName={setLocationInput}
            searchTerm={searchInput}
            setSearchTerm={setSearchInput}
            committedLocationName={locationText}
            committedSearchTerm={isLocationListing ? "" : searchText}
          />
          <div className={cx("no-results-container")}>
            <h1>
              {searchText} in {locationText}
            </h1>
            <p>Something went wrong</p>
            <button onClick={handleRetry}>Retry</button>
          </div>
        </>
      );
    }

    // A search/category page with zero resolved results is either a legit
    // empty area or an unresolvable category slug (e.g. a stray ObjectId
    // falling through to this route) — either way it shouldn't be indexed
    // under a manufactured "Best {slug} in {location}" title.
    const hasResolvedResults = initialSearchResolved && totalResults > 0;
    const pageHeading = isLocationListing
      ? `Businesses in ${locationText}`
      : `Best ${searchText} in ${locationText}`;
    const pageDescription = isLocationListing
      ? `Discover trusted businesses in ${locationText}. Compare ratings, reviews and contact details to find the best near you.`
      : `Discover trusted ${searchText} in ${locationText}. Compare ratings, reviews and contact details to find the best near you.`;
    const showSearchIntentNotice =
      !isLocationListing &&
      searchIntent?.shouldShowNotice &&
      searchIntent?.originalQuery &&
      searchIntent?.resolvedCategory;
    const showSearchIntentSuggestion =
      !isLocationListing &&
      searchIntent?.shouldShowSuggestion &&
      searchIntent?.originalQuery &&
      searchIntent?.correctedQuery;
    const fallbackSeo = {
      title: isLocationListing
        ? `Businesses in ${locationText} | Local Business Listings | Massclick`
        : `${searchText} in ${locationText} | Best ${searchText} Near You | Massclick`,
      description: pageDescription,
      keywords: isLocationListing
        ? `businesses in ${locationText}, local businesses ${locationText}, Massclick ${locationText}`
        : `${searchText}, ${searchText} in ${locationText}, best ${searchText} ${locationText}, top ${searchText} ${locationText}`,
      canonical: canonicalUrl,
      robots: hasResolvedResults ? "index, follow" : "noindex, follow",
    };
    const routeCanonicalSeoData =
      seoMetaData && Object.keys(seoMetaData).length > 0
        ? { ...seoMetaData, canonical: canonicalUrl }
        : seoMetaData;
    const seoContent = seoPageContents?.[0];
    const sanitizedPageContent = seoContent?.pageContent
      ? sanitizeSeoHtml(seoContent.pageContent)
      : null;

    const totalReviewCount = results.reduce(
      (acc, curr) => acc + (curr.totalReviews || 0),
      0,
    );
    const totalRatingScore = results.reduce(
      (acc, curr) => acc + (curr.averageRating || 0) * (curr.totalReviews || 0),
      0,
    );
    const calculatedRating =
      totalReviewCount > 0 ? totalRatingScore / totalReviewCount : null;
    const overallRating =
      calculatedRating !== null
        ? Math.max(1, Math.min(5, Number(calculatedRating.toFixed(1))))
        : null;

    const searchResultsSchema = generateSearchResultsPageSchema(
      searchText,
      locationText,
      results.length,
      overallRating,
      canonicalUrl,
    );
    const categoryBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: pageHeading,
      url: canonicalUrl,
      description: fallbackSeo.description,
      ...(overallRating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: overallRating,
          reviewCount: results.length,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    };
    const websiteSchema = generateWebsiteSchema();
    const organizationSchema = generateOrganizationSchema();
    const faqSchema =
      seoContent?.faq && seoContent.faq.length > 0
        ? generateFAQSchema(seoContent.faq)
        : null;
    const showInitialResultsSkeleton =
      results.length === 0 && (loading || !initialSearchResolved);

    return (
      <>
        <SeoMeta seoData={routeCanonicalSeoData} fallback={fallbackSeo} />

        <Helmet>
          {searchResultsSchema && (
            <script type="application/ld+json">
              {JSON.stringify(searchResultsSchema)}
            </script>
          )}
          {breadcrumbSchema && (
            <script type="application/ld+json">
              {JSON.stringify(breadcrumbSchema)}
            </script>
          )}
          {websiteSchema && (
            <script type="application/ld+json">
              {JSON.stringify(websiteSchema)}
            </script>
          )}
          {organizationSchema && (
            <script type="application/ld+json">
              {JSON.stringify(organizationSchema)}
            </script>
          )}
          {faqSchema && (
            <script type="application/ld+json">
              {JSON.stringify(faqSchema)}
            </script>
          )}
          {categoryBusinessSchema && (
            <script type="application/ld+json">
              {JSON.stringify(categoryBusinessSchema)}
            </script>
          )}
        </Helmet>

        <div className={cx("results-page")}>
          <StickySearchBar
            locationName={locationInput}
            setLocationName={setLocationInput}
            searchTerm={searchInput}
            setSearchTerm={setSearchInput}
            committedLocationName={locationText}
            committedSearchTerm={isLocationListing ? "" : searchText}
          />
          <div className={cx("results-container banner-section")}>
            <TopBannerAds category={effectiveCategory} />
          </div>
          <main>
            <div className={cx("page-spacing")} />

            <div className={cx("results-container content-section")}>
              <Breadcrumbs items={breadcrumbItems} />
              <div className={cx("results-heading")}>
                <h1 className={cx("main-seo-heading")}>
                  {pageHeading}
                </h1>
                <h2 className={cx("results-subheading")}>
                  {pageDescription}
                </h2>
                {showSearchIntentNotice && (
                  <div className={cx("search-intent-notice")} role="status">
                    <span>
                      Showing results for <strong>{searchIntent.resolvedCategory}</strong>
                    </span>
                    <small>You searched for {searchIntent.originalQuery}</small>
                  </div>
                )}
                {effectiveCategory && (
                  <CategoryPublicCounterBadge category={effectiveCategory} />
                )}

                <div className={cx("category-trust-badges")}>
                  <span className={cx("trust-badge")}>
                    <VerifiedIcon fontSize="small" /> Verified Listings
                  </span>
                  <span className={cx("trust-badge")}>
                    <StarIcon fontSize="small" /> Top Rated Businesses
                  </span>
                  <span className={cx("trust-badge")}>
                    <GroupsIcon fontSize="small" /> Trusted by Thousands
                  </span>
                  <span className={cx("trust-badge")}>
                    <LockIcon fontSize="small" /> Secure Enquiry Platform
                  </span>
                </div>
              </div>

              {/* Active filter chips row */}
              {activeFilterChips.length > 0 && (
                <div className={cx("filter-chips-row")}>
                  {activeFilterChips.map((chip, i) => (
                    <button
                      type="button"
                      key={`${chip.key}-${chip.value}-${i}`}
                      className={cx("filter-chip")}
                      aria-label={`Remove ${chip.label} filter`}
                      onClick={() => {
                        const current = activeFilters[chip.key];
                        if (Array.isArray(current)) {
                          const updated = current.filter(
                            (v) => v !== chip.value,
                          );
                          handleFilterChange(
                            chip.key,
                            updated.length > 0 ? updated : null,
                          );
                        } else {
                          handleFilterChange(chip.key, null);
                        }
                      }}
                    >
                      <span>{chip.label}</span>
                      <span className={cx("filter-chip-remove")} aria-hidden="true">
                        ×
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={cx("filter-chip-clear")}
                    onClick={handleClearAllFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Three-column layout: filter | results | ads */}
              <div className={cx("search-layout")}>
                {/* Desktop filter column */}
                {!isCompact && (
                  <div className={cx("filter-column")}>
                    <Suspense fallback={null}>
                      <FilterPanel
                        filterConfig={filterConfig}
                        activeFilters={activeFilters}
                        sortBy={sortBy}
                        onFilterChange={handleFilterChange}
                        onSortChange={handleSortChange}
                        onClearAll={handleClearAllFilters}
                        hasGeo={geoStatus === "granted"}
                      />
                    </Suspense>
                  </div>
                )}

                {/* Results column */}
                <div className={cx("results-column")}>
                  <div className={cx("results-toolbar")}>
                    <div
                      className={cx("view-toggle")}
                      aria-label="Choose listing view"
                    >
                      {viewOptions.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          className={cx(
                            "view-toggle-button",
                            viewMode === value && "view-toggle-button--active",
                          )}
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
                        Showing {results.length} of {totalResults} result
                        {totalResults !== 1 ? "s" : ""}
                      </p>
                    )}
                    {!loading && totalResults === 0 && results.length > 0 && (
                      <p className={cx("result-count")}>
                        Showing {results.length} result
                        {results.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {showInitialResultsSkeleton && (
                      <p
                        className={cx("result-count", "result-count--loading")}
                      >
                        Loading results...
                      </p>
                    )}
                    <label className={cx("sort-control")}>
                      <span>Sort by</span>
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                      >
                        <option value="relevant">Relevant</option>
                        <option value="rating">Rating</option>
                        <option value="newest">Latest</option>
                        <option value="nearest">
                          {geoStatus === "granted"
                            ? "Nearest"
                            : "Nearest (requires location)"}
                        </option>
                      </select>
                    </label>
                  </div>

                  {!showInitialResultsSkeleton &&
                    !loading &&
                    results.length === 0 && (
                      <>
                        {showSearchIntentSuggestion && (
                          <div className={cx("search-intent-panel")} role="status">
                            <div className={cx("search-intent-panel-icon")} aria-hidden="true">
                              ?
                            </div>
                            <div className={cx("search-intent-panel-copy")}>
                              <span className={cx("search-intent-panel-kicker")}>
                                Search suggestion
                              </span>
                              <h3>
                                Did you mean <strong>{searchIntent.correctedQuery}</strong>?
                              </h3>
                              <p>
                                No exact match for <strong>{searchIntent.originalQuery}</strong>.
                                Try the corrected search before sending a request.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={cx("search-intent-panel-action")}
                              onClick={handleSearchIntentSuggestion}
                            >
                              Search {searchIntent.correctedQuery}
                            </button>
                          </div>
                        )}
                        <Suspense fallback={null}>
                          <NoResultsRequestForm
                            category={effectiveCategory || searchText}
                            location={locationText}
                            onClearFilters={hasActiveFilters ? handleClearAllFilters : null}
                          />
                        </Suspense>
                      </>
                    )}

                  {showInitialResultsSkeleton ? (
                    <SearchResultListSkeleton viewMode={viewMode} />
                  ) : (
                    <div
                      className={cx(
                        "business-list",
                        `business-list--${viewMode}`,
                        loading &&
                          results.length > 0 &&
                          "business-list--refreshing",
                      )}
                    >
                      {results.map((business, idx) => {
                        const averageRating = Number(business.averageRating);
                        const totalRatings =
                          typeof business.totalReviews === "number"
                            ? business.totalReviews
                            : 0;
                        const businessUrl = buildBusinessPath({
                          districtSlug,
                          // locationSlug/location/id are only consumed by the
                          // superseded-shape fallback, for a business with no
                          // publicId yet. The current shape uses neither.
                          locationSlug: business.publicLocationSlug,
                          location: business.location,
                          businessName: business.businessName,
                          publicId: business.publicId,
                          id: business._id,
                        });
                        return (
                          <div
                            className={cx("business-card-wrapper")}
                            key={business._id}
                          >
                            <CardDesign
                              businessId={business._id}
                              title={business.businessName}
                              phone={business.contact}
                              whatsappNumber={business.whatsappNumber}
                              contactList={business.contactList}
                              rating={
                                Number.isFinite(averageRating) &&
                                averageRating > 0
                                  ? averageRating
                                  : null
                              }
                              reviews={totalRatings}
                              // `business.location` is a free-text district
                              // label ("Trichy"), not the business's own
                              // address — every card showed the same string.
                              // The formatter builds a real address and ends it
                              // with the searched locality, so the result reads
                              // as local to what was asked for.
                              address={formatBusinessAddress(business, {
                                searchedLocation: locationText,
                              })}
                              experience={business.experience}
                              category={business.category}
                              price={
                                business.filters?.price ||
                                business.filters?.priceRange ||
                                business.price ||
                                null
                              }
                              imageSrc={business.bannerImage || "/header.png"}
                              logoImage={business.logoImage}
                              to={businessUrl}
                              isVerified={!!business.verification?.isVerified}
                              isTrusted={
                                !!(
                                  business.badges?.isTrusted ||
                                  business.badges?.isTrust ||
                                  business.verification?.isTrusted
                                )
                              }
                              certificateType={
                                business.verification?.certificateType ||
                                business.verification?.verificationType
                              }
                              certificates={business.certificates}
                              isFeatured={!!business.badges?.isFeatured}
                              isSponsored={!!business.badges?.isSponsored}
                              isTrending={!!business.badges?.isTrending}
                              filters={business.filters}
                              filterConfig={filterConfig}
                              distance={
                                typeof business.distance === "number"
                                  ? business.distance
                                  : null
                              }
                              viewMode={viewMode}
                              compact={isCompact}
                              index={idx}
                              resultPosition={idx + 1}
                              prioritizeImage={idx === 0}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Infinite scroll sentinel */}
                  {hasMore && (
                    <div
                      ref={sentinelRef}
                      className={cx("scroll-sentinel")}
                      aria-hidden="true"
                    />
                  )}

                  {/* Loading more indicator */}
                  {isLoadingMore && (
                    <div className={cx("loading-more")}>
                      <span className={cx("loading-more-dot")} />
                      <span className={cx("loading-more-dot")} />
                      <span className={cx("loading-more-dot")} />
                    </div>
                  )}

                  {/* Nearby businesses section — shown only when user has granted geo */}
                  {nearbyResults.filter(
                    (b) => !results.some((r) => r._id === b._id),
                  ).length > 0 && (
                    <section className={cx("nearby-section")}>
                      <h3 className={cx("nearby-heading")}>
                        <LocationOnIcon
                          sx={{ fontSize: 20, color: "#ff8c00" }}
                        />
                        More {searchText} Near You
                      </h3>
                      <div className={cx("nearby-strip")}>
                        {nearbyResults
                          .filter((b) => !results.some((r) => r._id === b._id))
                          .map((b, idx) => {
                            const businessUrl = buildBusinessPath({
                              districtSlug,
                              locationSlug: b.publicLocationSlug,
                              location: b.location,
                              businessName: b.businessName,
                              publicId: b.publicId,
                              id: b._id,
                            });
                            return (
                              <div className={cx("nearby-card")} key={b._id}>
                                <CardDesign
                                  businessId={b._id}
                                  title={b.businessName}
                                  phone={b.contact}
                                  whatsappNumber={b.whatsappNumber}
                                  rating={
                                    Number.isFinite(Number(b.averageRating)) &&
                                    Number(b.averageRating) > 0
                                      ? Number(b.averageRating)
                                      : null
                                  }
                                  reviews={b.totalReviews || 0}
                                  address={formatBusinessAddress(b, {
                                    searchedLocation: locationText,
                                  })}
                                  experience={b.experience}
                                  category={b.category}
                                  price={
                                    b.filters?.price ||
                                    b.filters?.priceRange ||
                                    null
                                  }
                                  imageSrc={b.bannerImage || "/header.png"}
                                  logoImage={b.logoImage}
                                  to={businessUrl}
                                  isVerified={!!b.verification?.isVerified}
                                  isTrusted={
                                    !!(
                                      b.badges?.isTrusted ||
                                      b.badges?.isTrust ||
                                      b.verification?.isTrusted
                                    )
                                  }
                                  certificateType={
                                    b.verification?.certificateType ||
                                    b.verification?.verificationType
                                  }
                                  certificates={b.certificates}
                                  isFeatured={!!b.badges?.isFeatured}
                                  isSponsored={!!b.badges?.isSponsored}
                                  isTrending={!!b.badges?.isTrending}
                                  filters={b.filters}
                                  filterConfig={filterConfig}
                                  distance={
                                    typeof b.distance === "number"
                                      ? b.distance
                                      : null
                                  }
                                  viewMode="grid"
                                  cardVariant="nearby"
                                  compact={isCompact}
                                  index={idx}
                                  resultPosition={idx + 1}
                                  prioritizeImage={false}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  )}
                </div>

                {/* Right ads column — always in DOM to prevent flex reflow CLS on view toggle */}
                <div
                  className={cx(
                    "ads-column",
                    !(viewMode === "list" || viewMode === "table") &&
                      "ads-column--hidden",
                  )}
                >
                  <AdvertisementBanner />
                </div>
              </div>
            </div>

            {/* Mobile filter drawer */}
            {isCompact && filterDrawerHasOpenedRef.current && (
              <Suspense fallback={null}>
                <MobileFilterDrawer
                  open={filterDrawerOpen}
                  onClose={() => setFilterDrawerOpen(false)}
                  filterConfig={filterConfig}
                  activeFilters={activeFilters}
                  sortBy={sortBy}
                  onFilterChange={handleFilterChange}
                  onSortChange={handleSortChange}
                  onClearAll={handleClearAllFilters}
                  hasGeo={geoStatus === "granted"}
                  totalActiveCount={totalActiveCount}
                />
              </Suspense>
            )}

            {/* Mobile sticky filter bar */}
            <div className={cx("mobile-filter-bar")}>
              <button
                className={cx("mobile-filter-btn")}
                onClick={() => {
                  filterDrawerHasOpenedRef.current = true;
                  setFilterDrawerOpen(true);
                }}
              >
                <TuneIcon sx={{ fontSize: 16 }} />
                Filters {totalActiveCount > 0 ? `(${totalActiveCount})` : ""}
              </button>
            </div>

            {!seoContentLoading &&
              (sanitizedPageContent || seoContent?.faq?.length > 0) && (
                <div className={cx("seo-outer-wrapper")}>
                  <div className={cx("seo-article-wrapper")}>
                    <article className={cx("seo-article")}>
                      <div className={cx("seo-divider")} />
                      {sanitizedPageContent && (
                        <section
                          className={cx("seo-page-content")}
                          dangerouslySetInnerHTML={{
                            __html: sanitizedPageContent,
                          }}
                        />
                      )}
                      {seoContent?.faq?.length > 0 && (
                        <section className={cx("seo-faq-section")}>
                          <h2 className={cx("seo-faq-heading")}>
                            Frequently Asked Questions
                          </h2>
                          {seoContent.faq.map((item, i) => (
                            <div key={i} className={cx("seo-faq-item")}>
                              <h3 className={cx("seo-faq-question")}>
                                {item.question}
                              </h3>
                              <p className={cx("seo-faq-answer")}>
                                {renderFaqAnswerWithLinks(
                                  item.answer,
                                  item.links,
                                )}
                              </p>
                            </div>
                          ))}
                        </section>
                      )}
                    </article>
                  </div>
                </div>
              )}
          </main>
          <div
            ref={bottomSectionsRef}
            className={cx("bottom-sections-wrapper")}
          >
            {shouldRenderBottomSections && (
              <Suspense fallback={null}>
                <PopularCategoriesLink />
                <Footer />
              </Suspense>
            )}
          </div>

          {openLoginModal && (
            <Suspense fallback={null}>
              <OTPLoginModel
                open={true}
                handleClose={() => setOpenLoginModal(false)}
              />
            </Suspense>
          )}
        </div>
      </>
    );
  },
);
export default SearchResults;
