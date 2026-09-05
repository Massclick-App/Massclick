import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import { handleImageError } from "shared/utils/placeholderImage.js";
import styles from "features/public/categories/categories.module.css";
import { fetchDistrictCategories, resetDistrictCategories, fetchSubCategories, fetchSubCategoryGroups } from "state/actions/categoryAction.js";
import { buildCategoryPath, navigateToSearchResult } from "shared/utils/searchResultNavigation.js";
import {
  formatUrlText,
  resolveDistrictRoute,
  slugFromText,
} from "shared/utils/districtRouteResolution.js";
import { fetchSeoMeta } from "state/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "state/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "state/actions/userActionTypes.js";
import SeoMeta from "features/public/seo/seoMeta.js";
import { generateItemListSchema } from "shared/utils/seoSchemaGenerators.js";
import { renderFaqAnswerWithLinks } from "shared/utils/renderFaqAnswerWithLinks.js";
import useRenderNearViewport from "shared/hooks/useRenderNearViewport.js";
import useInfiniteScrollTrigger from "shared/hooks/useInfiniteScrollTrigger.js";
import Breadcrumbs from "features/public/breadcrumbs/Breadcrumbs.js";
import { buildCrumbs, crumbsToJsonLd, crumbsToUiItems } from "shared/utils/breadcrumbs.js";

const Footer = lazy(() =>
  import(/* webpackChunkName: "public-footer" */ "features/public/footer/Footer.js")
);
const PopularCategoriesLink = lazy(() =>
  import(
    /* webpackChunkName: "popular-categories" */ "features/public/popular-categories/popularCategories.js"
  )
);

const cx = createScopedClassNames(styles);
const sanitizeSeoHtml = (html = "") =>
  html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");

// Deterministic (not random) so the banner's gradient fallback doesn't shift
// between renders — same palette rotation the group cards already use.
const hashIndex = (str = "", mod = 5) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 1000003;
  return Math.abs(hash) % mod;
};

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
    subCategoryGroups = [],
    subCategoryGroupsParent = {},
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
  const groupSlug = routeContext?.groupSlug || "";
  const districtSlug = routeContext?.districtSlug || districtContext?.slug || "";
  const districtName = routeContext?.districtName || districtContext?.name || formatUrlText(districtSlug);
  const locationSlug = routeContext?.locationSlug || locationParam || "";
  const locationPath = routeContext?.locationPath || "";
  const routeCanonicalPath = routeContext?.canonicalPath || "";
  const locationLabel = routeContext?.locationName || (districtSlug ? districtName : formatUrlText(locationSlug));
  const categoryLabel = categorySlug ? formatUrlText(categorySlug) : "Categories";

  // Sub-category groups (3rd tier) — additive: a category with no group data
  // (subCategoryGroups stays []) falls straight through to the existing flat
  // subCategories path below, unchanged.
  const activeGroup = groupSlug ? subCategoryGroups.find((g) => g.groupSlug === groupSlug) : null;
  const isGroupListingView = !isDirectoryLanding && !groupSlug && subCategoryGroups.length > 0;
  const isGroupDetailView = !isDirectoryLanding && Boolean(groupSlug);
  const groupLabel = activeGroup?.groupName || (groupSlug ? formatUrlText(groupSlug) : "");
  // What the page is actually ABOUT right now — the group's own name once
  // drilled into one, otherwise the category (unchanged today).
  const pageLabel = isGroupDetailView && groupLabel ? groupLabel : categoryLabel;
  // Group tiles are collections you drill into further, not a leaf you click
  // straight through to search — worth its own noun in the loading/count/empty copy.
  const listingKind = isDirectoryLanding ? "categories" : isGroupListingView ? "collections" : "subcategories";

  const listingItems = isDirectoryLanding
    ? districtCategories
    : isGroupListingView
      ? subCategoryGroups.map((g) => ({ _id: g.groupSlug, name: g.groupName, slug: g.groupSlug, icon: g.groupIcon, count: g.subCategories?.length || 0 }))
      : isGroupDetailView
        ? (activeGroup?.subCategories || [])
        : subCategories;
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

  // Parallel to the fetch above — cheap/cached, resolves to [] for any
  // category with no group data, which is what keeps a 2-level category's
  // page identical to before this feature existed.
  useEffect(() => {
    if (isDirectoryLanding) return;

    if (categorySlug) {
      dispatch(fetchSubCategoryGroups(categorySlug));
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

    // Tier 2 (group-listing) isn't meant to rank at all — see fallbackSeo's
    // noindex below — so skip the fetch entirely rather than let a stale
    // admin-configured SEO override for the flat "restaurants" category page
    // (same categorySlug, different view) win over the noindex fallback.
    // Still clear whatever SEO data a PREVIOUS page left in Redux, or that
    // stale record would render here regardless of this effect not running.
    if (isGroupListingView) {
      dispatch({ type: CLEAR_SEO_META });
      return;
    }

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
  }, [dispatch, categorySlug, districtSlug, locationLabel, locationPath, locationSlug, routeCanonicalPath, isGroupListingView]);

  useEffect(() => {
    if (!categorySlug || isGroupListingView) return;

    dispatch(fetchSeoPageContentMeta({
      pageType: "category",
      category: categorySlug.replace(/-/g, " "),
      ...(locationLabel ? { location: locationLabel } : {}),
    }));
  }, [dispatch, categorySlug, locationLabel, isGroupListingView]);

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
        // A group is addressed by the same flat single-slug scheme as a
        // subcategory (buildCategoryPath collapses to whichever of
        // category/subcategory is more specific) — passing it as
        // subcategorySlug here produces the correct /district/groupSlug
        // canonical for the group-detail view; absent (undefined) for every
        // other view, so this is a no-op when there's no group.
        subcategorySlug: isGroupDetailView ? groupSlug : undefined,
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
        title: `${pageLabel} in ${locationLabel} | Subcategories | Massclick`,
        description: `Browse all ${pageLabel} subcategories in ${locationLabel}. Find and explore verified businesses in your area.`,
        keywords: `${pageLabel}, ${pageLabel} in ${locationLabel}, ${pageLabel} subcategories`,
        canonical: categoryPageUrl,
        // Tier 2 (group-listing) isn't meant to rank itself — noindex — but
        // still passes crawl equity through to the tier-3/leaf pages it
        // links to, which DO want to be indexed — follow.
        robots: isGroupListingView ? "noindex, follow" : "index, follow",
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
        groupSlug: isDirectoryLanding || !isGroupDetailView ? "" : groupSlug,
        groupName: groupLabel,
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
      : `${pageLabel} subcategories in ${locationLabel}`,
    seoContent?.excerpt || (
      isDirectoryLanding
        ? `Browse services in ${isLocationLanding ? locationLabel : districtName}`
        : `Browse ${pageLabel} options in ${locationLabel}`
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

      {/* Tier 2 (group-listing) deliberately carries no structured data —
          it isn't meant to rank itself, see fallbackSeo's noindex above. */}
      {!isGroupListingView && (
        <Helmet>
          {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        </Helmet>
      )}

      <div className={cx("category-page")}>
        <StickySearchBar />
        <div className={cx("category-container")}>
          {!isGroupListingView && breadcrumbItems.length > 0 && (
            <div className={cx("category-breadcrumbs")}>
              <Breadcrumbs items={breadcrumbItems} />
            </div>
          )}
          {isGroupListingView ? (
            // Tier 2's own hero — replaces the plain title+search header
            // rather than sitting alongside it, so there's one glorified
            // heading treatment instead of a plain title stacked on a fancy
            // banner. Real photo when the category has one uploaded
            // (categoryImages.webHero — already admin-editable, unused
            // elsewhere on this page), else the same gradient rotation the
            // group cards below use, keyed by category so it's stable.
            <div
              className={cx(`group-banner ${subCategoryGroupsParent.webHero ? "" : `group-card--gradient-${hashIndex(categorySlug)}`}`)}
              style={subCategoryGroupsParent.webHero ? { backgroundImage: `url(${subCategoryGroupsParent.webHero})` } : undefined}
            >
              <div className={cx("group-banner__overlay")}>
                <h1 className={cx("group-banner__title")}>{subCategoryGroupsParent.title || pageLabel}</h1>
                {subCategoryGroupsParent.description && (
                  <p className={cx("group-banner__subtitle")}>{subCategoryGroupsParent.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className={cx("category-header")}>
              <h1 className={cx("category-title")}>
                {isDirectoryLanding ? `Explore Services in ${isLocationLanding ? locationLabel : districtName}` : `${pageLabel} in ${locationLabel}`}
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
          )}

          <div className={cx("category-content")}>
            {isInitialLoading && (
              <div className={cx("category-loading")}>
                <div className={cx("spinner")} />
                <p>Loading {listingKind}...</p>
              </div>
            )}

            {!isInitialLoading && filteredCategories.length === 0 && (
              <div className={cx("category-empty")}>
                <p className={cx("empty-text")}>No {listingKind} found</p>
                {search && <p className={cx("empty-subtext")}>Try a different search term</p>}
              </div>
            )}

            {!isInitialLoading && filteredCategories.length > 0 && (
              <>
                <p className={cx("category-count")}>
                  {isDirectoryLanding ? districtCategoriesTotal : filteredCategories.length} {listingKind} available
                </p>

                {isGroupListingView ? (
                  // Tier 2 (groups) — deliberately different from the leaf
                  // grid below: a group is a collection you drill into
                  // further, not a leaf you click straight through to
                  // search, so it gets a bigger, photo-forward card instead
                  // of the small icon+label tile. Falls back to a rotating
                  // gradient (cycling every 5 cards) for any group with no
                  // uploaded image — true for most groups today.
                  <div className={cx("group-grid")}>
                    {filteredCategories.map((item, index) => (
                      <div
                        key={item._id || index}
                        className={cx(`group-card ${item.icon ? "" : `group-card--gradient-${index % 5}`}`)}
                        style={item.icon ? { backgroundImage: `url(${item.icon})` } : undefined}
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
                        <div className={cx("group-card__overlay")}>
                          <span className={cx("group-card__title")}>{formatUrlText(item.name)}</span>
                          <span className={cx("group-card__count")}>{item.count} {item.count === 1 ? "category" : "categories"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                )}

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

        {!isDirectoryLanding && !isGroupListingView && !seoContentLoading && (sanitizedPageContent || hasFaq) && (
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

