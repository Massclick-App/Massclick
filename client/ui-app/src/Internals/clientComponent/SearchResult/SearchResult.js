import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Chip, Drawer, Button } from "@mui/material";
import styles from "./SearchResult.module.css";
import CardsSearch from "../CardsSearch/CardsSearch";
import CardDesign from "../cards/cards.js";
import SeoMeta from "../seo/seoMeta.js";
import Footer from "../footer/footer.js";
import PopularCategoriesLink from "../popularCategories/popularCategories.js";
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs.js";
import { performSearch, logSearchActivity } from "../../../redux/actions/businessListAction";
import { extractSearchResultData } from "../../../utils/searchResultNavigation";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import { selectBusinessLoading, selectBusinessError } from "../../../redux/selectors";
import TopBannerAds from "../banners/topBanner/topBanner.js";
import GlobalSkeleton from "../globalSkeleton.js";
import OTPLoginModal from "../AddBusinessModel.js";
import FilterPanel from "./FilterPanel.js";
import { generateSearchResultsPageSchema, generateBreadcrumbSchema, generateOrganizationSchema, generateWebsiteSchema, generateFAQSchema } from "../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const createSlug = (text = "") => text.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sanitizeSeoHtml = (html = "") => {
  return html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
};
const SearchResults = React.memo(() => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const urlParams = useParams();
  const locationState = useLocation();
  const [openLoginModal, setOpenLoginModal] = useState(false);

  // Extract and normalize search data from all possible sources
  // Handle direct URL navigation (locationState.state will be null)
  const {
    searchTerm,
    location: locationText,
    displayName,
    isKnownCategory,
    results: stateResults,
    logAlreadySent: stateLogSent
  } = extractSearchResultData(locationState.state || {}, urlParams);

  // Ensure results is always an array, never null
  const safeStateResults = Array.isArray(stateResults) ? stateResults : null;
  const searchText = displayName; // Use display name for UI
  const normalizedSearchTerm = searchTerm; // Use normalized for API calls

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
  const [results, setResults] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [filterConfig, setFilterConfig] = useState([]);
  const [sortBy, setSortBy] = useState("relevant");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const stateAppliedRef = useRef(false);
  const requestIdRef = useRef(0);
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
  const logSearch = useCallback(() => {
    if (searchLoggedRef.current) return;

    // Skip if the search bar already fired logSearchActivity before navigating here
    if (stateLogSent) {
      searchLoggedRef.current = true;
      return;
    }
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    dispatch(logSearchActivity(normalizedSearchTerm || "All Categories", locationText || "Global", userDetails, normalizedSearchTerm));
    searchLoggedRef.current = true;
  }, [dispatch, normalizedSearchTerm, locationText, stateLogSent]);
  useEffect(() => {
    logSearch();
  }, [logSearch]);
  useEffect(() => {
    const handleAuthChange = () => {
      if (!searchLoggedRef.current) {
        logSearch();
      }
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => {
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, [logSearch]);
  useEffect(() => {
    if (Array.isArray(safeStateResults) && safeStateResults.length > 0 && !stateAppliedRef.current) {
      setResults(safeStateResults);
      stateAppliedRef.current = true;
      return;
    }
    if (safeStateResults && safeStateResults.length > 0) return;
    if (!normalizedSearchTerm || !locationText) return;
    const requestId = ++requestIdRef.current;
    dispatch(performSearch(normalizedSearchTerm, locationText, isKnownCategory)).then(action => {
      if (requestId !== requestIdRef.current) return;
      setResults(action?.payload || []);
    });
  }, [normalizedSearchTerm, locationText, isKnownCategory, dispatch]);

  // Fetch filterConfig for this category
  useEffect(() => {
    if (!normalizedSearchTerm) return;
    const slug = normalizedSearchTerm.toLowerCase().trim().replace(/\s+/g, "-");
    fetch(`/api/category/${encodeURIComponent(slug)}/filters`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setFilterConfig(Array.isArray(data) ? data : []))
      .catch(() => setFilterConfig([]));
  }, [normalizedSearchTerm]);

  // Re-search when filters or sort change
  const hasActiveFilters = Object.values(activeFilters).some(v =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
  );
  useEffect(() => {
    if (!normalizedSearchTerm || !locationText) return;
    if (!hasActiveFilters && sortBy === "relevant") return; // let normal search handle initial load
    const requestId = ++requestIdRef.current;
    const extraParams = {};
    if (sortBy !== "relevant") extraParams.sortBy = sortBy;
    const { minRating, openNow, verified, featured, ...categoryFilters } = activeFilters;
    if (minRating) extraParams.minRating = minRating;
    if (openNow) extraParams.openNow = openNow;
    if (verified) extraParams.verified = verified;
    if (featured) extraParams.featured = featured;
    if (Object.keys(categoryFilters).length > 0) {
      extraParams.filters = JSON.stringify(categoryFilters);
    }
    dispatch(performSearch(normalizedSearchTerm, locationText, isKnownCategory, extraParams)).then(action => {
      if (requestId !== requestIdRef.current) return;
      setResults(action?.payload || []);
    });
  }, [activeFilters, sortBy, normalizedSearchTerm, locationText, isKnownCategory, dispatch]); // eslint-disable-line

  const handleFilterChange = useCallback((key, value) => {
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

  const handleClearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSortBy("relevant");
  }, []);

  const activeFilterChips = Object.entries(activeFilters).flatMap(([key, value]) => {
    if (Array.isArray(value)) return value.map(v => ({ key, value: v, label: v }));
    if (key === "minRating") return [{ key, value, label: `${value}+ Stars` }];
    if (key === "openNow") return [{ key, value, label: "Open Now" }];
    if (key === "verified") return [{ key, value, label: "Verified" }];
    if (key === "featured") return [{ key, value, label: "Featured" }];
    return [{ key, value, label: String(value) }];
  });

  const totalActiveCount = activeFilterChips.length + (sortBy !== "relevant" ? 1 : 0);
  useEffect(() => {
    if (!normalizedSearchTerm || !locationText) return;
    dispatch({
      type: CLEAR_SEO_META
    });
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
      ...(locationText ? {
        location: locationText
      } : {})
    }));
  }, [dispatch, normalizedSearchTerm, locationText]);
  const handleRetry = useCallback(() => {
    dispatch(performSearch(searchText, locationText));
  }, [dispatch, searchText, locationText]);
  if (error) {
    return <>
        <CardsSearch />

        <div className={cx("no-results-container")}>

          <h1>
            {searchText} in {locationText}
          </h1>

          <p>Something went wrong</p>

          <button onClick={handleRetry}>
            Retry
          </button>

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

  // Calculate total reviews and ratings for search results
  const totalReviewCount = results.reduce((acc, curr) => acc + (curr.totalReviews || 0), 0);
  const totalRatingScore = results.reduce((acc, curr) => acc + (curr.averageRating || 0) * (curr.totalReviews || 0), 0);
  const calculatedRating = totalReviewCount > 0 ? totalRatingScore / totalReviewCount : null;
  const overallRating = calculatedRating !== null ? Math.max(1, Math.min(5, Number(calculatedRating.toFixed(1)))) : null;

  // Generate SearchResultsPage schema (semantically correct for category/search pages)
  const searchResultsSchema = generateSearchResultsPageSchema(searchText, locationText, results.length, overallRating);

  // Add LocalBusiness schema for the category
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

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://www.massclick.in"
  }, {
    name: locationText,
    url: `https://www.massclick.in/${locationSlug}`
  }, {
    name: searchText,
    url: canonicalUrl
  }]);

  // Generate WebSite schema
  const websiteSchema = generateWebsiteSchema();

  // Generate Organization schema
  const organizationSchema = generateOrganizationSchema();

  // Generate FAQ schema (if structured FAQs available from seoContent)
  const faqSchema = seoContent?.faqs && seoContent.faqs.length > 0 ? generateFAQSchema(seoContent.faqs) : null;
  return <>
      <OTPLoginModal open={openLoginModal} handleClose={() => setOpenLoginModal(false)} />
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

      <Helmet>
        {searchResultsSchema && <script type="application/ld+json">
            {JSON.stringify(searchResultsSchema)}
          </script>}
        {breadcrumbSchema && <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>}
        {websiteSchema && <script type="application/ld+json">
            {JSON.stringify(websiteSchema)}
          </script>}
        {organizationSchema && <script type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </script>}
        {faqSchema && <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>}
        {categoryBusinessSchema && <script type="application/ld+json">
            {JSON.stringify(categoryBusinessSchema)}
          </script>}
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

          {/* Two-column layout: filter panel + results */}
          <div className={cx("search-layout")}>
            {/* Desktop filter column */}
            <div className={cx("filter-column")}>
              <FilterPanel
                filterConfig={filterConfig}
                activeFilters={activeFilters}
                sortBy={sortBy}
                onFilterChange={handleFilterChange}
                onSortChange={setSortBy}
                onClearAll={handleClearAllFilters}
              />
            </div>

            {/* Results column */}
            <div className={cx("results-column")}>
              {/* Result count + sort info */}
              {!loading && results.length > 0 && (
                <p className={cx("result-count")}>
                  {results.length} result{results.length !== 1 ? "s" : ""} for {searchText} in {locationText}
                </p>
              )}

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

              <div className={cx("business-list")}>
                {results.map(business => {
                  const averageRating = typeof business.averageRating === "number" ? business.averageRating.toFixed(1) : "0.0";
                  const totalRatings = typeof business.totalReviews === "number" ? business.totalReviews : 0;
                  const businessUrl = `/business/${createSlug(business.location)}/${createSlug(business.businessName)}/${business._id}`;
                  return (
                    <div className={cx("business-card-wrapper")} key={business._id}>
                      <CardDesign businessId={business._id} title={business.businessName} phone={business.contact}
                        whatsappNumber={business.whatsappNumber} contactList={business.contactList}
                        rating={averageRating} reviews={totalRatings} address={business.location}
                        details={`${business.experience}+ years experience`} category={business.category}
                        price={business.category === "Hotels" ? business.price : null}
                        imageSrc={business.bannerImage || "/header.png"} to={businessUrl} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filter drawer */}
        <Drawer anchor="bottom" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
          PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "80vh", overflow: "auto", p: 2 } }}>
          <FilterPanel
            filterConfig={filterConfig}
            activeFilters={activeFilters}
            sortBy={sortBy}
            onFilterChange={handleFilterChange}
            onSortChange={setSortBy}
            onClearAll={handleClearAllFilters}
          />
          <Box sx={{ p: 2, pt: 1 }}>
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

                <section className={cx("seo-page-content")} dangerouslySetInnerHTML={{
                __html: sanitizedPageContent
              }} />
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
