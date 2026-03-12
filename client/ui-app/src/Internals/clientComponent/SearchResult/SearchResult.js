import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";

import "./SearchResult.css";

import CardsSearch from "../CardsSearch/CardsSearch";
import CardDesign from "../cards/cards.js";
import SeoMeta from "../seo/seoMeta.js";

import { backendMainSearch, logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import TopBannerAds from "../banners/topBanner/topBanner.js";
import OTPLoginModal from "../AddBusinessModel.js";
import { logUserSearch } from "../../../redux/actions/otpAction.js";

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
  const [openLoginModal, setOpenLoginModal] = useState(false);
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
    const authUser = localStorage.getItem("authUser");
    if (!authUser) {
      setOpenLoginModal(true);
    }
  }, []);

  const searchLoggedRef = useRef(false);

  const logSearchIfLoggedIn = useCallback(() => {

    if (searchLoggedRef.current) return;

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    if (!authUser?._id) return;

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    const term = searchText;
    const location = locationText;
    const category = searchText;

    if (!term) return;

    dispatch(
      logUserSearch(
        authUser._id,
        term,
        location || "Global",
        category || "All Categories"
      )
    );

    dispatch(
      logSearchActivity(
        category || "All Categories",
        location || "Global",
        userDetails,
        term
      )
    );

    searchLoggedRef.current = true;

  }, [dispatch, searchText, locationText]);


  useEffect(() => {
    logSearchIfLoggedIn();
  }, [logSearchIfLoggedIn]);

  useEffect(() => {

    const handleAuthChange = () => {
      logSearchIfLoggedIn();
    };

    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
    };

  }, [logSearchIfLoggedIn]);

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

  const extractFaqFromHtml = (html = "") => {
    if (!html) return [];

    const faqSectionMatch = html.split("Frequently Asked Questions - (FAQs)");
    if (faqSectionMatch.length < 2) return [];

    const faqHtml = faqSectionMatch[1];

    const parser = new DOMParser();
    const doc = parser.parseFromString(faqHtml, "text/html");

    const strongTags = doc.querySelectorAll("strong");

    const faqs = [];

    strongTags.forEach((strongTag) => {
      const question = strongTag.textContent?.trim();

      const answerElement = strongTag.parentElement?.nextElementSibling;
      const answer = answerElement?.textContent?.trim();

      if (question && answer) {
        faqs.push({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        });
      }
    });

    return faqs;
  };

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
            `https://www.massclick.in/${createSlug(business.location)}/${createSlug(business.businessName)}/${business._id}`
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
        item: "https://www.massclick.in"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locationText,
        item: `https://www.massclick.in/${locationSlug}`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: searchText,
        item: canonicalUrl,
      },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Massclick",
    url: "https://massclick.in",
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Massclick",
    url: "https://massclick.in",
    logo: "https://massclick.in/logo.png"
  };

  const extractedFaqs = extractFaqFromHtml(seoContent?.pageContent || "");

  const faqSchema =
    extractedFaqs.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: extractedFaqs,
      }
      : null;

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

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${searchText} in ${locationText}`,
    areaServed: {
      "@type": "City",
      name: locationText,
    },
    provider: {
      "@type": "Organization",
      name: "Massclick",
      url: "https://www.massclick.in",
    },
    ...(overallRating && totalReviewCount > 0
      ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(overallRating),
          reviewCount: totalReviewCount,
          bestRating: 5,
          worstRating: 1
        },
      }
      : {}),
  };

  return (
    <>  
      <OTPLoginModal
        open={openLoginModal}
        handleClose={() => setOpenLoginModal(false)}
      />
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
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>

        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
        <script type="application/ld+json">
          {JSON.stringify(serviceSchema)}
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
          <div className="results-heading">

            <h4 className="results-subheading">
              Discover trusted {searchText} in {locationText}. Compare ratings,
              reviews and contact details to find the best near you.
            </h4>

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
          {loading && (
            <div className="loading-wrapper">
              Searching businesses...
            </div>
          )}

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

              const businessUrl = `/${createSlug(
                business.location
              )}/${createSlug(business.businessName)}/${business._id}`;

              return (
                <div className="business-card-wrapper" key={business._id}>
                  <CardDesign
                    title={business.businessName}
                    phone={business.contact}
                    whatsappNumber={business.whatsappNumber}
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
