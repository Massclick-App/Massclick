import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import { handleImageError } from "../../../utils/placeholderImage";
import styles from "./categories.module.css";
import { fetchDistrictCategories, resetDistrictCategories, fetchSubCategories } from "../../../redux/actions/categoryAction";
import { buildCategoryPath, navigateToSearchResult } from "../../../utils/searchResultNavigation";
import {
  formatUrlText,
  resolveDistrictRoute,
  slugFromText,
} from "../../../utils/districtRouteResolution.js";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import SeoMeta from "../seo/seoMeta.js";
import { generateItemListSchema } from "../../../utils/seoSchemaGenerators";
import { renderFaqAnswerWithLinks } from "../../../utils/renderFaqAnswerWithLinks";
import useRenderNearViewport from "../../../hooks/useRenderNearViewport.js";
import useInfiniteScrollTrigger from "../../../hooks/useInfiniteScrollTrigger.js";
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs.js";
import { buildCrumbs, crumbsToJsonLd, crumbsToUiItems } from "../../../utils/breadcrumbs";

const Footer = lazy(() =>
  import(/* webpackChunkName: "public-footer" */ "../footer/footer.js")
);
const PopularCategoriesLink = lazy(() =>
  import(
    /* webpackChunkName: "popular-categories" */ "../popularCategories/popularCategories.js"
  )
);

const cx = createScopedClassNames(styles);
const sanitizeSeoHtml = (html = "") =>
  html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");

const CategoriesPage = ({ routeContext = null, mode = "category" } = {}) => {
  const {
    district: districtParam,
    location: locationParam,
    category: categoryParam,
  } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [districtContext, setDistrictContext] = useState(
    routeContext?.districtSlug
      ? { slug: routeContext.districtSlug, name: routeContext.districtName }
      : null
  );
  const [districtNotFound, setDistrictNotFound] = useState(false);
  const {
    targetRef: bottomSectionsRef,
    shouldRender: shouldRenderBottomSections,
  } = useRenderNearViewport();
  const {
    subCategories = [],
    loading,
    districtCategories = [],
    districtCategoriesTotal = 0,
    districtCategoriesPage = 0,
    districtCategoriesHasMore = false,
    districtCategoriesLoading = false,
    districtCategoriesLoadingMore = false,
  } = useSelector((state) => state.categoryReducer);
  const {
    meta: seoMetaData,
  } = useSelector((state) => state.seoReducer || {});
  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false,
  } = useSelector((state) => state.seoPageContentReducer || {});

  const isDistrictLanding = mode === "districtLanding";
  const isLocationLanding = mode === "locationLanding" || routeContext?.routeType === "locationLanding";
  const isDirectoryLanding = isDistrictLanding || isLocationLanding;
  const categorySlug = routeContext?.categorySlug || categoryParam || "";
  const districtSlug = routeContext?.districtSlug || districtContext?.slug || "";
  const districtName = routeContext?.districtName || districtContext?.name || formatUrlText(districtSlug);
  const locationSlug = routeContext?.locationSlug || locationParam || "";
  const locationPath = routeContext?.locationPath || "";
  const routeCanonicalPath = routeContext?.canonicalPath || "";
  const locationLabel = routeContext?.locationName || (districtSlug ? districtName : formatUrlText(locationSlug));
  const categoryLabel = categorySlug ? formatUrlText(categorySlug) : "Categories";
  const listingItems = isDirectoryLanding ? districtCategories : subCategories;
  // Initial/replace load only — "load more" (districtCategoriesLoadingMore)
  // must not trigger this, or every infinite-scroll page load would swap the
  // whole grid for a spinner instead of appending below what's already shown.
  const isInitialLoading = isDirectoryLanding ? districtCategoriesLoading : loading;

  useEffect(() => {
    if (!districtSlug) return;
    localStorage.setItem("selectedLocation", locationLabel || districtName);
    localStorage.setItem("selectedLocationDistrict", districtName);
    localStorage.setItem("selectedLocationDistrictSlug", districtSlug);
    if (locationSlug) {
      localStorage.setItem("selectedPublicLocationSlug", locationSlug);
    } else {
      localStorage.removeItem("selectedPublicLocationSlug");
    }
    if (locationPath) {
      localStorage.setItem("selectedPublicLocationPath", locationPath);
    } else {
      localStorage.removeItem("selectedPublicLocationPath");
    }
  }, [districtName, districtSlug, locationLabel, locationPath, locationSlug]);

  useEffect(() => {
    if (!isDistrictLanding || routeContext?.districtSlug) return;

    let cancelled = false;
    setDistrictNotFound(false);
    setDistrictContext(null);

    resolveDistrictRoute({ district: districtParam })
      .then((data) => {
        if (cancelled) return;
        setDistrictContext(data?.district || null);
      })
      .catch(() => {
        if (cancelled) return;
        setDistrictNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isDistrictLanding, routeContext?.districtSlug, districtParam]);

  useEffect(() => {
    if (isDirectoryLanding) return;

    if (categorySlug) {
      dispatch(fetchSubCategories(categorySlug));
    }
  }, [dispatch, isDirectoryLanding, categorySlug]);

  // Debounced so switching districts or typing in the search box doesn't
  // fire a request per keystroke — only once typing pauses.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (!isDirectoryLanding) return;
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [isDirectoryLanding, search]);

  // Clears any previous district's results immediately on a district switch
  // — Redux state is global and otherwise persists across route changes, so
  // without this the previous district's categories would stay on screen
  // until the new fetch resolves (a wrong-data flash, not just a stale one).
  useEffect(() => {
    if (!isDirectoryLanding || !districtSlug) return;
    dispatch(resetDistrictCategories());
  }, [dispatch, isDirectoryLanding, districtSlug, locationSlug]);

  useEffect(() => {
    if (!isDirectoryLanding || !districtSlug) return;
    dispatch(fetchDistrictCategories({
      district: districtSlug,
      location: isLocationLanding ? locationSlug : "",
      page: 1,
      search: debouncedSearch,
    }));
  }, [dispatch, isDirectoryLanding, isLocationLanding, districtSlug, locationSlug, debouncedSearch]);

  const handleLoadMoreCategories = () => {
    if (!isDirectoryLanding || !districtSlug || !districtCategoriesHasMore || districtCategoriesLoadingMore) {
      return;
    }
    dispatch(fetchDistrictCategories({
      district: districtSlug,
      location: isLocationLanding ? locationSlug : "",
      page: districtCategoriesPage + 1,
      search: debouncedSearch,
    }));
  };

  const infiniteScrollSentinelRef = useInfiniteScrollTrigger({
    onLoadMore: handleLoadMoreCategories,
    hasMore: isDirectoryLanding && districtCategoriesHasMore,
    loading: districtCategoriesLoadingMore || districtCategoriesLoading,
  });

  useEffect(() => {
    if (!categorySlug || !locationLabel) return;

    dispatch({ type: CLEAR_SEO_META });
    dispatch(fetchSeoMeta({
      pageType: "category",
      category: categorySlug.toLowerCase(),
      ...(districtSlug && !locationSlug
        ? {}
        : { location: locationSlug || locationLabel.toLowerCase() }),
      ...(locationPath ? { locationPath } : {}),
      ...(routeCanonicalPath ? { canonicalPath: routeCanonicalPath } : {}),
      ...(districtSlug ? { district: districtSlug } : {}),
    }));
  }, [dispatch, categorySlug, districtSlug, locationLabel, locationPath, locationSlug, routeCanonicalPath]);

  useEffect(() => {
    if (!categorySlug) return;

    dispatch(fetchSeoPageContentMeta({
      pageType: "category",
      category: categorySlug.replace(/-/g, " "),
      ...(locationLabel ? { location: locationLabel } : {}),
    }));
  }, [dispatch, categorySlug, locationLabel]);

  // District landing's listingItems are already server-filtered by
  // debouncedSearch (see the fetch effect above) — re-filtering client-side
  // here would double-apply the filter and, worse, apply the un-debounced
  // `search` value against a list that was fetched for a possibly-stale
  // debounced one, which reads as the grid "lagging" a keystroke behind.
  const filteredCategories = useMemo(
    () => isDirectoryLanding
      ? listingItems
      : listingItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [search, listingItems, isDirectoryLanding],
  );

  const handleClick = (sub) => {
    const itemSlug = sub.slug || slugFromText(sub.name);

    if (isDirectoryLanding && districtSlug) {
      navigate(buildCategoryPath({
        districtSlug,
        locationSlug,
        locationPath,
        categorySlug: itemSlug,
        isDistrictScope: isDistrictLanding || !locationSlug,
      }), {
        state: {
          category: sub.name,
          categoryName: sub.name,
          location: isLocationLanding ? locationLabel : districtName,
          district: districtSlug,
          locationSlug,
          locationPath,
          locationName: locationLabel,
        },
      });
      return;
    }

    if (districtSlug) {
      navigate(buildCategoryPath({
        districtSlug,
        locationSlug,
        locationPath,
        categorySlug,
        subcategorySlug: itemSlug,
        isDistrictScope: !locationSlug,
      }), {
        state: {
          searchTerm: sub.name,
          displayName: sub.name,
          location: locationLabel,
          district: districtSlug,
          locationSlug,
          locationPath,
          locationName: locationLabel,
        },
      });
      return;
    }

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2 || "",
      email: authUser?.email || "",
    };
    navigateToSearchResult({
      searchTerm: sub.name,
      location: locationSlug || "Global",
      navigate,
      dispatch,
      isKnownCategory: true,
      logAlreadySent: false,
      userDetails,
    });
  };

  const pagePath = routeCanonicalPath || (isDistrictLanding
    ? `/${districtSlug}`
    : buildCategoryPath({
        districtSlug,
        locationSlug,
        locationPath,
        categorySlug,
        isDistrictScope: Boolean(districtSlug && !locationSlug),
      }));
  const categoryPageUrl = `https://massclick.in${pagePath === "/" ? "" : pagePath}`;
  const fallbackSeo = isDirectoryLanding
    ? {
        title: `Local Businesses in ${isLocationLanding ? locationLabel : districtName} | Massclick`,
        description: `Discover trusted businesses, services, and professionals in ${isLocationLanding ? locationLabel : districtName} on Massclick.`,
        keywords: `businesses in ${isLocationLanding ? locationLabel : districtName}, ${isLocationLanding ? locationLabel : districtName} local services, Massclick ${isLocationLanding ? locationLabel : districtName}`,
        canonical: categoryPageUrl,
        robots: "index, follow",
      }
    : {
        title: `${categoryLabel} in ${locationLabel} | Subcategories | Massclick`,
        description: `Browse all ${categoryLabel} subcategories in ${locationLabel}. Find and explore verified businesses in your area.`,
        keywords: `${categoryLabel}, ${categoryLabel} in ${locationLabel}, ${categoryLabel} subcategories`,
        canonical: categoryPageUrl,
        robots: "index, follow",
      };
  const seoContent = seoPageContents?.[0];
  const sanitizedPageContent = seoContent?.pageContent
    ? sanitizeSeoHtml(seoContent.pageContent)
    : null;
  const hasFaq = (seoContent?.faq || []).length > 0;

  const breadcrumbCrumbs = districtSlug
    ? buildCrumbs({
        districtSlug,
        districtName,
        locationSlug: isDistrictLanding ? "" : locationSlug,
        locationPath: isDistrictLanding ? "" : locationPath,
        locationName: locationLabel,
        categorySlug: isDirectoryLanding ? "" : categorySlug,
        categoryName: categoryLabel,
      })
    : [
        { name: "Home", path: "/" },
        ...(locationSlug
          ? [{ name: locationLabel, path: `/${locationSlug}` }]
          : []),
        ...(!isDistrictLanding && categorySlug
          ? [{ name: categoryLabel, path: null }]
          : []),
      ];
  const breadcrumbSchema = crumbsToJsonLd(breadcrumbCrumbs, "https://massclick.in", pagePath);
  const breadcrumbItems = crumbsToUiItems(breadcrumbCrumbs);

  const itemListSchema = generateItemListSchema(
    filteredCategories.map((item, index) => ({
      position: index + 1,
      name: item.name,
      url: `https://massclick.in${buildCategoryPath({
        districtSlug,
        locationSlug,
        locationPath,
        categorySlug: isDirectoryLanding ? item.slug || slugFromText(item.name) : categorySlug,
        subcategorySlug: isDirectoryLanding ? "" : item.slug || slugFromText(item.name),
        isDistrictScope: isDistrictLanding || !locationSlug,
      })}`,
      description: item.description,
      image: item.categoryImageKey || item.categoryImages?.webCard,
    })),
    isDirectoryLanding
      ? `Categories in ${isLocationLanding ? locationLabel : districtName}`
      : `${categoryLabel} subcategories in ${locationLabel}`,
    seoContent?.excerpt || (
      isDirectoryLanding
        ? `Browse services in ${isLocationLanding ? locationLabel : districtName}`
        : `Browse ${categoryLabel} options in ${locationLabel}`
    ),
  );

  if (districtNotFound) {
    return <Navigate to="/" replace />;
  }

  if (isDirectoryLanding && !districtSlug) {
    return null;
  }

  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

      <Helmet>
        {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className={cx("category-page")}>
        <StickySearchBar />
        <div className={cx("category-container")}>
          {breadcrumbItems.length > 0 && (
            <div className={cx("category-breadcrumbs")}>
              <Breadcrumbs items={breadcrumbItems} />
            </div>
          )}
          <div className={cx("category-header")}>
            <h1 className={cx("category-title")}>
              {isDirectoryLanding ? `Explore Services in ${isLocationLanding ? locationLabel : districtName}` : `${categoryLabel} in ${locationLabel}`}
            </h1>

            <input
              type="text"
              placeholder={isDirectoryLanding ? "Search categories..." : "Search subcategories..."}
              className={cx("category-search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search categories"
            />
          </div>

          <div className={cx("category-content")}>
            {isInitialLoading && (
              <div className={cx("category-loading")}>
                <div className={cx("spinner")} />
                <p>Loading {isDirectoryLanding ? "categories" : "subcategories"}...</p>
              </div>
            )}

            {!isInitialLoading && filteredCategories.length === 0 && (
              <div className={cx("category-empty")}>
                <p className={cx("empty-text")}>No {isDirectoryLanding ? "categories" : "subcategories"} found</p>
                {search && <p className={cx("empty-subtext")}>Try a different search term</p>}
              </div>
            )}

            {!isInitialLoading && filteredCategories.length > 0 && (
              <>
                <p className={cx("category-count")}>
                  {isDirectoryLanding ? districtCategoriesTotal : filteredCategories.length} {isDirectoryLanding ? "categories" : "subcategories"} available
                </p>
                <div className={cx("category-grid")}>
                  {filteredCategories.map((item, index) => (
                    <div
                      key={item._id || index}
                      className={cx("category-item")}
                      onClick={() => handleClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleClick(item);
                        }
                      }}
                      aria-label={`View ${item.name}`}
                    >
                      <img
                        className={cx("category-icon")}
                        src={item.icon}
                        alt={item.name}
                        width="48"
                        height="48"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.onerror = null;
                          handleImageError(e);
                        }}
                      />
                      <span className={cx("category-text")}>
                        {formatUrlText(item.name)}
                      </span>
                    </div>
                  ))}
                </div>

                {isDirectoryLanding && districtCategoriesHasMore && (
                  <div ref={infiniteScrollSentinelRef} className={cx("category-scroll-sentinel")}>
                    {districtCategoriesLoadingMore && (
                      <div className={cx("category-loading-more")}>
                        <div className={cx("spinner")} />
                        <p>Loading more categories...</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isDirectoryLanding && !seoContentLoading && (sanitizedPageContent || hasFaq) && (
          <div className={cx("seo-outer-wrapper")}>
            <div className={cx("seo-article-wrapper")}>
              <article className={cx("seo-article")}>
                <div className={cx("seo-divider")} />

                {sanitizedPageContent && (
                  <section
                    className={cx("seo-page-content")}
                    dangerouslySetInnerHTML={{ __html: sanitizedPageContent }}
                  />
                )}

                {hasFaq && (
                  <section className={cx("seo-faq-section")}>
                    <h2 className={cx("seo-faq-heading")}>Frequently Asked Questions</h2>
                    {seoContent.faq.map((item, i) => (
                      <div key={i} className={cx("seo-faq-item")}>
                        <h3 className={cx("seo-faq-question")}>{item.question}</h3>
                        <p className={cx("seo-faq-answer")}>
                          {renderFaqAnswerWithLinks(item.answer, item.links)}
                        </p>
                      </div>
                    ))}
                  </section>
                )}
              </article>
            </div>
          </div>
        )}

        <div ref={bottomSectionsRef} className={cx("bottom-sections-wrapper")}>
          {shouldRenderBottomSections && (
            <Suspense fallback={null}>
              <PopularCategoriesLink />
              <Footer />
            </Suspense>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoriesPage;
