import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import "./SearchResult.css";

import CardsSearch from "../CardsSearch/CardsSearch";
import CardDesign from "../cards/cards.js";
import SeoMeta from "../seo/seoMeta.js";

import { backendMainSearch } from "../../../redux/actions/businessListAction";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import TopBannerAds from "../banners/topBanner/topBanner.js";



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



const SearchResults = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { location: locParam, searchTerm: termParam } = useParams();
  const locationState = useLocation();

  const locationText = locParam?.trim() || "";
  const searchText = termParam?.trim() || "";

  const locationSlug = createSlug(locationText);
  const searchSlug = createSlug(searchText);

  const canonicalUrl = `https://massclick.in/${locationSlug}/${searchSlug}`;


  const { loading, error } = useSelector(
    (state) => state.businessListReducer || {}
  );

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

  useEffect(() => {

    const resultsFromState = locationState.state?.results;

    if (
      Array.isArray(resultsFromState) &&
      resultsFromState.length > 0 &&
      !stateAppliedRef.current
    ) {
      setResults(resultsFromState);
      stateAppliedRef.current = true;
      return;
    }

    dispatch(
      backendMainSearch(searchText, locationText, searchText)
    ).then((action) => {
      setResults(action?.payload || []);
    });

  }, [searchText, locationText, dispatch]);

  useEffect(() => {
    if (!searchText || !locationText) return;

    dispatch({ type: CLEAR_SEO_META });

    dispatch(
      fetchSeoMeta({
        pageType: "category",
        category: searchText.toLowerCase(),
        location: locationText.toLowerCase(),
      })
    );
  }, [dispatch, searchText, locationText]);

  useEffect(() => {
    if (!searchText) return;

    dispatch(
      fetchSeoPageContentMeta({
        pageType: "category",
        category: searchText,
        ...(locationText ? { location: locationText } : {}),
      })
    );

  }, [dispatch, searchText, locationText]);


  const handleRetry = useCallback(() => {

    dispatch(
      backendMainSearch(searchText, locationText, searchText)
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

const sanitizedHeaderContent = seoContent?.headerContent || null;

  const sanitizedPageContent =
    seoContent?.pageContent
      ? sanitizeSeoHtml(seoContent.pageContent)
      : null;

  const itemListSchema =
    results.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Best ${searchText} in ${locationText}`,
        itemListElement: results.map((business, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: business.businessName,
          url:
            `https://massclick.in/${createSlug(business.location)}/${createSlug(business.businessName)}/${business._id}`,
        })),
      }
      : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://massclick.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locationText,
        item: `https://massclick.in/${locationSlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: searchText,
        item: canonicalUrl,
      },
    ],
  };


 return (
  <>
    <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

    <Helmet>
      {itemListSchema && (
        <script type="application/ld+json">
          {JSON.stringify(itemListSchema)}
        </script>
      )}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Helmet>

    <div className="results-page">
      <CardsSearch />
      <div className="page-spacing" />
      <div className="results-container banner-section">
        <TopBannerAds category={searchText} />
      </div>

      <div className="results-container content-section">

        {!seoContentLoading && sanitizedHeaderContent && (
          <section
            className="seo-header-content premium-section"
            dangerouslySetInnerHTML={{
              __html: sanitizedHeaderContent,
            }}
          />
        )}

        {/* LOADING */}
        {loading && (
          <div className="loading-wrapper">
            Searching businesses...
          </div>
        )}

        {/* NO RESULTS */}
        {!loading && results.length === 0 && (
          <div className="no-results-container">
            <p className="no-results-title">No results found 😔</p>
            <button
              className="go-home-button"
              onClick={() => navigate("/home")}
            >
              Go to Homepage
            </button>
          </div>
        )}

        {/* BUSINESS LIST */}
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

            const businessUrl = `/${createSlug(
              business.location
            )}/${createSlug(business.businessName)}/${business._id}`;

            return (
              <div className="business-card-wrapper" key={business._id}>
                <CardDesign
                  title={business.businessName}
                  phone={business.contact}
                  address={business.location}
                  details={`Experience: ${business.experience} | Category: ${business.category}`}
                  rating={averageRating}
                  reviews={totalRatings}
                  imageSrc={
                    business.bannerImage ||
                    "https://via.placeholder.com/120"
                  }
                  to={businessUrl}
                />
              </div>
            );
          })}

        </div>

        {/* SEO CONTENT */}
        {!seoContentLoading && sanitizedPageContent && (
          <article className="seo-article">
            <div className="seo-divider" />
            <section
              className="seo-page-content"
              dangerouslySetInnerHTML={{
                __html: sanitizedPageContent,
              }}
            />
          </article>
        )}

      </div>
    </div>
  </>
);


};

export default SearchResults;
