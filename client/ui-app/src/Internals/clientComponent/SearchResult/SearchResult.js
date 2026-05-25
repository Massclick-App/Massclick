import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";

import "./SearchResult.css";

import CardsSearch from "../CardsSearch/CardsSearch";
import CardDesign from "../cards/cards.js";
import SeoMeta from "../seo/seoMeta.js";
import Footer from "../footer/footer.js";
import PageHeaderContents from "../pageHeaderContents/pageHeaderContents.js";
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
import {
  generateSearchResultsPageSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateFAQSchema,
} from "../../../utils/seoSchemaGenerators";

const createSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sanitizeSeoHtml = (html = "") => {
  return html
    .replace(/<h1(\s[^>]*)?>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>");
};

const SearchResults = React.memo(() => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const urlParams = useParams();
  const locationState = useLocation();
  const [openLoginModal, setOpenLoginModal] = useState(false);

  // Extract and normalize search data from all possible sources
  const {
    searchTerm,
    location: locationText,
    displayName,
    isKnownCategory,
    results: stateResults,
    logAlreadySent: stateLogSent,
    userDetails: stateUserDetails
  } = extractSearchResultData(
    locationState.state,
    urlParams
  );

  const searchText = displayName; // Use display name for UI
  const normalizedSearchTerm = searchTerm; // Use normalized for API calls

  const locationSlug = createSlug(locationText);
  const searchSlug = createSlug(normalizedSearchTerm);

  const canonicalUrl = `https://massclick.in/${locationSlug}/${searchSlug}`;

  const loading = useSelector(selectBusinessLoading);
  const error = useSelector(selectBusinessError);

  const { meta: seoMetaData } = useSelector(
    (state) => state.seoReducer || {}
  );

  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false,
  } = useSelector(
    (state) => state.seoPageContentReducer || {}
  );

  const [results, setResults] = useState([]);
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
    email: authUser?.email,
  };

  dispatch(
    logSearchActivity(
      normalizedSearchTerm || "All Categories",
      locationText || "Global",
      userDetails,
      normalizedSearchTerm
    )
  );

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

    if (
      Array.isArray(stateResults) &&
      stateResults.length > 0 &&
      !stateAppliedRef.current
    ) {
      setResults(stateResults);
      stateAppliedRef.current = true;
      return;
    }

    if (stateResults && stateResults.length > 0) return;

    if (!normalizedSearchTerm || !locationText) return;

    const requestId = ++requestIdRef.current;

    dispatch(
      performSearch(normalizedSearchTerm, locationText, isKnownCategory)
    ).then((action) => {
      if (requestId !== requestIdRef.current) return;
      setResults(action?.payload || []);
    });

  }, [normalizedSearchTerm, locationText, isKnownCategory, dispatch]);

  useEffect(() => {
    if (!normalizedSearchTerm || !locationText) return;

    dispatch({ type: CLEAR_SEO_META });

    dispatch(
      fetchSeoMeta({
        pageType: "category",
        category: normalizedSearchTerm.toLowerCase(),
        location: locationText.toLowerCase(),
      })
    );
  }, [dispatch, normalizedSearchTerm, locationText]);

  useEffect(() => {
    if (!normalizedSearchTerm) return;

    dispatch(
      fetchSeoPageContentMeta({
        pageType: "category",
        category: normalizedSearchTerm.replace(/-/g, " "),
        ...(locationText ? { location: locationText } : {}),
      })
    );

  }, [dispatch, normalizedSearchTerm, locationText]);

  const handleRetry = useCallback(() => {

    dispatch(
      performSearch(searchText, locationText)
    );

  }, [dispatch, searchText, locationText]);


  if (error) {

    return (
      <>
        <CardsSearch />

        <div className="no-results-container">

          <h1>
            {searchText} in {locationText}
          </h1>

          <p>Something went wrong</p>

          <button onClick={handleRetry}>
            Retry
          </button>

        </div>
      </>
    );
  }

  const fallbackSeo = {

    title:
      `${searchText} in ${locationText} | Best ${searchText} Near You | Massclick`,

    description:
      `Find trusted ${searchText} in ${locationText}. View ratings, reviews, contact details and hire the best ${searchText} near you.`,

    keywords:
      `${searchText}, ${searchText} in ${locationText}, best ${searchText} ${locationText}, top ${searchText} ${locationText}`,

    canonical: canonicalUrl,

    robots: "index, follow",

  };

  const seoContent = seoPageContents?.[0];

  const sanitizedPageContent =
    seoContent?.pageContent
      ? sanitizeSeoHtml(seoContent.pageContent)
      : null;

  // Calculate total reviews and ratings for search results
  const totalReviewCount = results.reduce(
    (acc, curr) => acc + (curr.totalReviews || 0),
    0
  );

  const totalRatingScore = results.reduce(
    (acc, curr) =>
      acc + (curr.averageRating || 0) * (curr.totalReviews || 0),
    0
  );

  const calculatedRating =
    totalReviewCount > 0
      ? (totalRatingScore / totalReviewCount)
      : null;

  const overallRating =
    calculatedRating !== null
      ? Math.max(1, Math.min(5, Number(calculatedRating.toFixed(1))))
      : null;

  // Generate SearchResultsPage schema (semantically correct for category/search pages)
  const searchResultsSchema = generateSearchResultsPageSchema(
    searchText,
    locationText,
    results.length,
    overallRating
  );

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
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.massclick.in" },
    { name: locationText, url: `https://www.massclick.in/${locationSlug}` },
    { name: searchText, url: canonicalUrl }
  ]);

  // Generate WebSite schema
  const websiteSchema = generateWebsiteSchema();

  // Generate Organization schema
  const organizationSchema = generateOrganizationSchema();

  // Generate FAQ schema (if structured FAQs available from seoContent)
  const faqSchema = seoContent?.faqs && seoContent.faqs.length > 0
    ? generateFAQSchema(seoContent.faqs)
    : null;


  return (
    <>
      <OTPLoginModal
        open={openLoginModal}
        handleClose={() => setOpenLoginModal(false)}
      />
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

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

      <div className="results-page">
        <CardsSearch />
        <main>
        <div className="page-spacing" />
        <div className="results-container banner-section">
          <TopBannerAds category={searchText} />
        </div>

        <div className="results-container content-section">
          <Breadcrumbs
            items={[
              { label: "Home", link: "/" },
               {
                label: locationText,
                onClick: () => window.location.reload(),
              },
              { label: searchText },
            ]}
          />
          <div className="results-heading">
            <h1 className="main-seo-heading">
              Best {searchText} in {locationText}
            </h1>
            <h2 className="results-subheading">
              Discover trusted {searchText} in {locationText}. Compare ratings,
              reviews and contact details to find the best near you.
            </h2>

            <div className="category-trust-badges">

              <span className="trust-badge">
                <VerifiedIcon fontSize="small" /> Verified Listings
              </span>

              <span className="trust-badge">
                <StarIcon fontSize="small" /> Top Rated Businesses
              </span>

              <span className="trust-badge">
                <GroupsIcon fontSize="small" /> Trusted by Thousands
              </span>

              <span className="trust-badge">
                <LockIcon fontSize="small" /> Secure Enquiry Platform
              </span>
            </div>

          </div>
          {loading && <GlobalSkeleton type="list" />}

          {!loading && results.length === 0 && (
            <div className="no-results-container">
              <p className="no-results-title">No results found 😔</p>
              <button
                className="go-home-button"
                onClick={() => navigate("/")}
              >
                Go to Homepage
              </button>
            </div>
          )}

          <div className="business-list">

            {results.map((business) => {
              const averageRating =
                typeof business.averageRating === "number"
                  ? business.averageRating.toFixed(1)
                  : "0.0";

              const totalRatings =
                typeof business.totalReviews === "number"
                  ? business.totalReviews
                  : 0;

              const businessUrl = `/business/${createSlug(
                business.location
              )}/${createSlug(business.businessName)}/${business._id}`;

              return (
                <div className="business-card-wrapper" key={business._id}>
                  <CardDesign
                    businessId={business._id}
                    title={business.businessName}
                    phone={business.contact}
                    whatsappNumber={business.whatsappNumber}
                    contactList={business.contactList}
                    // address={business.location}
                    rating={averageRating}
                    reviews={totalRatings}
                    address={business.location}
                    details={`${business.experience}+ years experience`}
                    category={business.category} price={business.category === "Hotels" ? business.price : null}
                    imageSrc={
                      business.bannerImage ||
                      "/header.png"
                    }
                    to={businessUrl}
                  />
                </div>
              );
            })}
          </div>
        </div><br />
        {!seoContentLoading && sanitizedPageContent && (
          <div className="seo-outer-wrapper">
            <div className="seo-article-wrapper">
              <article className="seo-article">
                <div className="seo-divider" />

                <section
                  className="seo-page-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizedPageContent,
                  }}
                />
              </article>
            </div>
          </div>
        )}<br/>
        </main>
        <div className="bottom-sections-wrapper">
          <PopularCategoriesLink />
          <Footer />
        </div>
      </div>
    </>
  );

});

export default SearchResults;
