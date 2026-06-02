import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { handleImageError } from "../../../utils/placeholderImage";
import styles from "./categories.module.css";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchSubCategories } from "../../../redux/actions/categoryAction";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import SeoMeta from "../seo/seoMeta.js";
import Footer from "../footer/footer.js";
import PopularCategoriesLink from "../popularCategories/popularCategories.js";
import { generateBreadcrumbSchema, generateItemListSchema } from "../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const sanitizeSeoHtml = (html = "") => {
  return html.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
};
const formatText = (text = "") => text.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const CategoriesPage = () => {
  const {
    location,
    category
  } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const {
    subCategories = [],
    loading
  } = useSelector(state => state.categoryReducer);
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer || {});
  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false
  } = useSelector(state => state.seoPageContentReducer || {});
  useEffect(() => {
    if (category) {
      dispatch(fetchSubCategories(category));
    }
  }, [dispatch, category]);
  useEffect(() => {
    if (!category || !location) return;
    dispatch({
      type: CLEAR_SEO_META
    });
    dispatch(fetchSeoMeta({
      pageType: "category",
      category: category.toLowerCase(),
      location: location.toLowerCase()
    }));
  }, [dispatch, category, location]);
  useEffect(() => {
    if (!category) return;
    dispatch(fetchSeoPageContentMeta({
      pageType: "category",
      category: category.replace(/-/g, " "),
      ...(location ? {
        location: location
      } : {})
    }));
  }, [dispatch, category, location]);
  const filteredCategories = useMemo(() => {
    return subCategories.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, subCategories]);
  const handleClick = sub => {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2 || "",
      email: authUser?.email || ""
    };
    dispatch(logSearchActivity(sub.name, location || "Global", userDetails, sub.name));
    navigateToSearchResult({
      searchTerm: sub.name,
      location: location || "Global",
      navigate,
      dispatch,
      isKnownCategory: true,
      // Subcategory selection - known category
      logAlreadySent: true,
      userDetails
    });
  };
  const locationSlug = location || "";
  const categorySlug = category || "";
  const categoryPageUrl = `https://massclick.in/${locationSlug}/${categorySlug}`;
  const locationLabel = formatText(locationSlug);
  const categoryLabel = formatText(categorySlug);
  const fallbackSeo = {
    title: `${categoryLabel} in ${locationLabel} | Subcategories | Massclick`,
    description: `Browse all ${categoryLabel} subcategories in ${locationLabel}. Find and explore verified businesses in your area.`,
    keywords: `${categoryLabel}, ${categoryLabel} in ${locationLabel}, ${categoryLabel} subcategories`,
    canonical: categoryPageUrl,
    robots: "index, follow"
  };
  const seoContent = seoPageContents?.[0];
  const sanitizedPageContent = seoContent?.pageContent ? sanitizeSeoHtml(seoContent.pageContent) : null;

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: locationLabel,
    url: `https://massclick.in/${locationSlug}`
  }, {
    name: categoryLabel,
    url: categoryPageUrl
  }]);

  // Generate ItemList schema for subcategories
  const itemListSchema = generateItemListSchema(filteredCategories.map((item, index) => ({
    position: index + 1,
    name: item.name,
    url: `https://massclick.in/${locationSlug}/${categorySlug}/${item.slug}`,
    description: item.description,
    image: item.categoryImageKey || item.categoryImages?.webCard
  })), `${categoryLabel} subcategories in ${locationLabel}`, seoContent?.excerpt || `Browse ${categoryLabel} options in ${locationLabel}`);
  return <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

      <Helmet>
        {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className={cx("category-page")}>
      <div className={cx("category-container")}>
        {/* Header Section */}
        <div className={cx("category-header")}>
          <h1 className={cx("category-title")}>
            {formatText(category)} in {formatText(location)}
          </h1>

          <input type="text" placeholder="🔍 Search subcategories..." className={cx("category-search")} value={search} onChange={e => setSearch(e.target.value)} aria-label="Search categories" />
        </div>

        {/* Content Section */}
        <div className={cx("category-content")}>
          {loading && <div className={cx("category-loading")}>
              <div className={cx("spinner")} />
              <p>Loading subcategories...</p>
            </div>}

          {!loading && filteredCategories.length === 0 && <div className={cx("category-empty")}>
              <p className={cx("empty-icon")}>📭</p>
              <p className={cx("empty-text")}>No subcategories found</p>
              {search && <p className={cx("empty-subtext")}>Try a different search term</p>}
            </div>}

          {!loading && filteredCategories.length > 0 && <>
              <p className={cx("category-count")}>{filteredCategories.length} subcategories available</p>
              <div className={cx("category-grid")}>
                {filteredCategories.map((item, index) => <div key={item._id || index} className={cx("category-item")} onClick={() => handleClick(item)} role="button" tabIndex={0} onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick(item);
              }
            }} aria-label={`View ${item.name}`}>
                    <img className={cx("category-icon")} src={item.icon} alt={item.name} width="48" height="48" loading="lazy" decoding="async" onError={e => {
                e.target.onerror = null;
                handleImageError(e);
              }} />
                    <span className={cx("category-text")}>
                      {formatText(item.name)}
                    </span>
                  </div>)}
              </div>
            </>}
        </div>
      </div>

      {/* SEO Content Section */}
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
      {/* Bottom Sections */}
      <div className={cx("bottom-sections-wrapper")}>
        <PopularCategoriesLink />
        <Footer />
      </div>
      </div>
    </>;
};
export default CategoriesPage;
