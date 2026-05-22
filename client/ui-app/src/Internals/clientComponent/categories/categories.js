import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { handleImageError } from "../../../utils/placeholderImage";
import "./categories.css";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchSubCategories } from "../../../redux/actions/categoryAction";
import { fetchSeoMeta } from "../../../redux/actions/seoAction.js";
import { fetchSeoPageContentMeta } from "../../../redux/actions/seoPageContentAction.js";
import { CLEAR_SEO_META } from "../../../redux/actions/userActionTypes.js";
import SeoMeta from "../seo/seoMeta.js";
import Footer from "../footer/footer.js";
import PopularCategoriesLink from "../popularCategories/popularCategories.js";
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "../../../utils/seoSchemaGenerators";

const createSlug = (text = "") => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const sanitizeSeoHtml = (html = "") => {
  return html
    .replace(/<h1(\s[^>]*)?>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>");
};

const formatText = (text = "") =>
  text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CategoriesPage = () => {
  const { location, category } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");

  const { subCategories = [], loading } = useSelector(
    (state) => state.categoryReducer
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

  useEffect(() => {
    if (category) {
      dispatch(fetchSubCategories(category));
    }
  }, [dispatch, category]);

  useEffect(() => {
    if (!category || !location) return;

    dispatch({ type: CLEAR_SEO_META });

    dispatch(
      fetchSeoMeta({
        pageType: "category",
        category: category.toLowerCase(),
        location: location.toLowerCase(),
      })
    );
  }, [dispatch, category, location]);

  useEffect(() => {
    if (!category) return;

    dispatch(
      fetchSeoPageContentMeta({
        pageType: "category",
        category: category.replace(/-/g, " "),
        ...(location ? { location: location } : {}),
      })
    );
  }, [dispatch, category, location]);

  const filteredCategories = useMemo(() => {
    return subCategories.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subCategories]);

  const handleClick = (sub) => {
    const authUser = JSON.parse(
      localStorage.getItem("authUser") || "{}"
    );

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2 || "",
      email: authUser?.email || "",
    };

    dispatch(
      logSearchActivity(
        sub.name,
        location || "Global",
        userDetails,
        sub.name
      )
    );

    const subSlug = sub.slug || createSlug(sub.name);
    navigate(`/${location}/${category}/${subSlug}`, { state: { logAlreadySent: true } });
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
    robots: "index, follow",
  };

  const seoContent = seoPageContents?.[0];
  const sanitizedPageContent =
    seoContent?.pageContent
      ? sanitizeSeoHtml(seoContent.pageContent)
      : null;

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://massclick.in" },
    { name: locationLabel, url: `https://massclick.in/${locationSlug}` },
    { name: categoryLabel, url: categoryPageUrl }
  ]);

  // Generate ItemList schema for subcategories
  const itemListSchema = generateItemListSchema(
    filteredCategories.map((item, index) => ({
      position: index + 1,
      name: item.name,
      url: `https://massclick.in/${locationSlug}/${categorySlug}/${item.slug}`,
      description: item.description,
      image: item.categoryImageKey || item.categoryImages?.webCard
    })),
    `${categoryLabel} subcategories in ${locationLabel}`,
    seoContent?.excerpt || `Browse ${categoryLabel} options in ${locationLabel}`
  );

  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

      <Helmet>
        {itemListSchema && (
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        )}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="category-container">
        {/* Header Section */}
        <div className="category-header">
          <h1 className="category-title">
            {formatText(category)} in {formatText(location)}
          </h1>

          <input
            type="text"
            placeholder="🔍 Search subcategories..."
            className="category-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search categories"
          />
        </div>

        {/* Content Section */}
        <div className="category-content">
          {loading && (
            <div className="category-loading">
              <div className="spinner" />
              <p>Loading subcategories...</p>
            </div>
          )}

          {!loading && filteredCategories.length === 0 && (
            <div className="category-empty">
              <p className="empty-icon">📭</p>
              <p className="empty-text">No subcategories found</p>
              {search && <p className="empty-subtext">Try a different search term</p>}
            </div>
          )}

          {!loading && filteredCategories.length > 0 && (
            <>
              <p className="category-count">{filteredCategories.length} subcategories available</p>
              <div className="category-grid">
                {filteredCategories.map((item, index) => (
                  <div
                    key={item._id || index}
                    className="category-item"
                    onClick={() => handleClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleClick(item);
                      }
                    }}
                    aria-label={`View ${item.name}`}
                  >
                    <img
                      className="category-icon"
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
                    <span className="category-text">
                      {formatText(item.name)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* SEO Content Section */}
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
      )}
      <br />
      {/* Bottom Sections */}
      <div className="bottom-sections-wrapper">
        <PopularCategoriesLink />
        <Footer />
      </div>
    </>
  );
};

export default CategoriesPage;