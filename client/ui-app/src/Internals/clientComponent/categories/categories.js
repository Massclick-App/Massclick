import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import { handleImageError } from "../../../utils/placeholderImage";
import styles from "./categories.module.css";
import { fetchHomeCategories, fetchSubCategories } from "../../../redux/actions/categoryAction";
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
import { generateBreadcrumbSchema, generateItemListSchema } from "../../../utils/seoSchemaGenerators";
import { renderFaqAnswerWithLinks } from "../../../utils/renderFaqAnswerWithLinks";
import useRenderNearViewport from "../../../hooks/useRenderNearViewport.js";

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
    homeCategories = [],
    subCategories = [],
    loading,
  } = useSelector((state) => state.categoryReducer);
  const {
    meta: seoMetaData,
  } = useSelector((state) => state.seoReducer || {});
  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false,
  } = useSelector((state) => state.seoPageContentReducer || {});

  const isDistrictLanding = mode === "districtLanding";
  const categorySlug = routeContext?.categorySlug || categoryParam || "";
  const districtSlug = routeContext?.districtSlug || districtContext?.slug || "";
  const districtName = routeContext?.districtName || districtContext?.name || formatUrlText(districtSlug);
  const locationSlug = routeContext?.locationSlug || locationParam || "";
  const locationLabel = routeContext?.locationName || (districtSlug ? districtName : formatUrlText(locationSlug));
  const categoryLabel = categorySlug ? formatUrlText(categorySlug) : "Categories";
  const listingItems = isDistrictLanding ? homeCategories : subCategories;

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
    if (isDistrictLanding) {
      dispatch(fetchHomeCategories());
      return;
    }

    if (categorySlug) {
      dispatch(fetchSubCategories(categorySlug));
    }
  }, [dispatch, isDistrictLanding, categorySlug]);

  useEffect(() => {
    if (!categorySlug || !locationLabel) return;

    dispatch({ type: CLEAR_SEO_META });
    dispatch(fetchSeoMeta({
      pageType: "category",
      category: categorySlug.toLowerCase(),
      ...(districtSlug && !locationSlug
        ? {}
        : { location: locationSlug || locationLabel.toLowerCase() }),
      ...(districtSlug ? { district: districtSlug } : {}),
    }));
  }, [dispatch, categorySlug, districtSlug, locationLabel, locationSlug]);

  useEffect(() => {
    if (!categorySlug) return;

    dispatch(fetchSeoPageContentMeta({
      pageType: "category",
      category: categorySlug.replace(/-/g, " "),
      ...(locationLabel ? { location: locationLabel } : {}),
    }));
  }, [dispatch, categorySlug, locationLabel]);

  const filteredCategories = useMemo(
    () => listingItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [search, listingItems],
  );

  const handleClick = (sub) => {
    const itemSlug = sub.slug || slugFromText(sub.name);

    if (isDistrictLanding && districtSlug) {
      navigate(buildCategoryPath({
        districtSlug,
        categorySlug: itemSlug,
        isDistrictScope: true,
      }), {
        state: {
          category: sub.name,
          categoryName: sub.name,
          location: districtName,
          district: districtSlug,
        },
      });
      return;
    }

    if (districtSlug) {
      navigate(buildCategoryPath({
        districtSlug,
        locationSlug,
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

  const pagePath = isDistrictLanding
    ? `/${districtSlug}`
    : buildCategoryPath({
        districtSlug,
        locationSlug,
        categorySlug,
        isDistrictScope: Boolean(districtSlug && !locationSlug),
      });
  const categoryPageUrl = `https://massclick.in${pagePath === "/" ? "" : pagePath}`;
  const fallbackSeo = isDistrictLanding
    ? {
        title: `Local Businesses in ${districtName} | Massclick`,
        description: `Discover trusted businesses, services, and professionals in ${districtName} on Massclick.`,
        keywords: `businesses in ${districtName}, ${districtName} local services, Massclick ${districtName}`,
        canonical: `https://massclick.in/${districtSlug}`,
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

  const breadcrumbItems = [{
    name: "Home",
    url: "https://massclick.in",
  }];
  if (districtSlug) {
    breadcrumbItems.push({
      name: districtName,
      url: `https://massclick.in/${districtSlug}`,
    });
  } else if (locationSlug) {
    breadcrumbItems.push({
      name: locationLabel,
      url: `https://massclick.in/${locationSlug}`,
    });
  }
  if (!isDistrictLanding && categorySlug) {
    breadcrumbItems.push({
      name: categoryLabel,
      url: categoryPageUrl,
    });
  }
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  const itemListSchema = generateItemListSchema(
    filteredCategories.map((item, index) => ({
      position: index + 1,
      name: item.name,
      url: `https://massclick.in${buildCategoryPath({
        districtSlug,
        locationSlug,
        categorySlug: isDistrictLanding ? item.slug || slugFromText(item.name) : categorySlug,
        subcategorySlug: isDistrictLanding ? "" : item.slug || slugFromText(item.name),
        isDistrictScope: isDistrictLanding || !locationSlug,
      })}`,
      description: item.description,
      image: item.categoryImageKey || item.categoryImages?.webCard,
    })),
    isDistrictLanding
      ? `Categories in ${districtName}`
      : `${categoryLabel} subcategories in ${locationLabel}`,
    seoContent?.excerpt || (
      isDistrictLanding
        ? `Browse services in ${districtName}`
        : `Browse ${categoryLabel} options in ${locationLabel}`
    ),
  );

  if (districtNotFound) {
    return <Navigate to="/" replace />;
  }

  if (isDistrictLanding && !districtSlug) {
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
          <div className={cx("category-header")}>
            <h1 className={cx("category-title")}>
              {isDistrictLanding ? `Explore Services in ${districtName}` : `${categoryLabel} in ${locationLabel}`}
            </h1>

            <input
              type="text"
              placeholder={isDistrictLanding ? "Search categories..." : "Search subcategories..."}
              className={cx("category-search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search categories"
            />
          </div>

          <div className={cx("category-content")}>
            {loading && (
              <div className={cx("category-loading")}>
                <div className={cx("spinner")} />
                <p>Loading {isDistrictLanding ? "categories" : "subcategories"}...</p>
              </div>
            )}

            {!loading && filteredCategories.length === 0 && (
              <div className={cx("category-empty")}>
                <p className={cx("empty-text")}>No {isDistrictLanding ? "categories" : "subcategories"} found</p>
                {search && <p className={cx("empty-subtext")}>Try a different search term</p>}
              </div>
            )}

            {!loading && filteredCategories.length > 0 && (
              <>
                <p className={cx("category-count")}>
                  {filteredCategories.length} {isDistrictLanding ? "categories" : "subcategories"} available
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
              </>
            )}
          </div>
        </div>

        {!isDistrictLanding && !seoContentLoading && (sanitizedPageContent || hasFaq) && (
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
