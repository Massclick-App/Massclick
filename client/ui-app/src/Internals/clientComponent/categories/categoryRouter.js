import React, { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  performSearch,
} from "../../../redux/actions/businessListAction";
import axiosInstance from "../../../services/axiosInstance.js";
import {
  buildDistrictCategoryContext,
  buildLegacyRouteContext,
  formatUrlText,
  resolveDistrictRoute,
} from "../../../utils/districtRouteResolution.js";

const CategoriesPage = lazy(() =>
  import(/* webpackChunkName: "category-directory" */ "./categories.js")
);
let searchResultsModulePromise;
const loadSearchResults = () => {
  if (!searchResultsModulePromise) {
    searchResultsModulePromise = import(
      /* webpackChunkName: "search" */ "../SearchResult/SearchResult.js"
    );
  }
  return searchResultsModulePromise;
};
const SearchResults = lazy(loadSearchResults);

const CategoryRouter = ({ routeContext = null } = {}) => {
  const params = useParams();
  const routerLocation = useLocation();
  const dispatch = useDispatch();

  const [resolvedCategory, setResolvedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [prefetchedResults, setPrefetchedResults] = useState(null);
  const [resolvedRouteContext, setResolvedRouteContext] = useState(routeContext);

  const isSearchFlow = routerLocation.state?.isSearch;
  const searchText = routerLocation.state?.searchText;
  const passedCategoryName = routerLocation.state?.categoryName;

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    setResolvedCategory(null);
    setPrefetchedResults(null);

    if (routeContext) {
      setResolvedRouteContext(routeContext);
      return;
    }

    let cancelled = false;
    setResolvedRouteContext(null);

    resolveDistrictRoute({ district: params.district })
      .then((data) => {
        if (cancelled) return;
        const built = buildDistrictCategoryContext({
          district: data?.district,
          category: params.category,
          subcategory: params.subcategory,
        });
        setResolvedRouteContext(built);
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedRouteContext(buildLegacyRouteContext({
          location: params.district || params.location,
          category: params.category,
          subcategory: params.subcategory,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [routeContext, params.district, params.location, params.category, params.subcategory]);

  // Fetch home categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/v2/category/home`);
        setCategories(response.data || []);
      } catch (error) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, [API_URL]);

  const hasSubcategories = (cat) => {
    if (!cat) return false;
    const categoryObj = categories.find(
      (c) => c.slug === cat.toLowerCase().replace(/\s+/g, "-")
    );
    return categoryObj?.hasSubcategories || false;
  };

  useEffect(() => {
    const loadCategory = async () => {
      if (!resolvedRouteContext) return;
      setPrefetchedResults(null);
      try {
        const {
          districtSlug,
          locationSlug,
          categorySlug,
          subcategorySlug,
        } = resolvedRouteContext;
        const searchLocation = districtSlug ? locationSlug || "" : locationSlug;
        const searchExtraParams = districtSlug ? { district: districtSlug } : {};

        // If category name was passed directly from featured service, use it
        if (passedCategoryName) {
          setResolvedCategory(passedCategoryName);
          return;
        }

        if (isSearchFlow && searchText) {
          setResolvedCategory(searchText);

          // Fetch the route bundle alongside the data instead of creating an
          // API -> JavaScript -> image waterfall on direct mobile visits.
          loadSearchResults();
          const response = await dispatch(
            performSearch(
              searchText,
              searchLocation,
              false,  // isKnownCategory: user search flow
              searchExtraParams,
            )
          );

          setPrefetchedResults(response?.payload || {});

          return;
        }

        if (subcategorySlug) {
          const searchValue = subcategorySlug.replace(/-/g, " ");

          loadSearchResults();
          const response = await dispatch(
            performSearch(
              searchValue,
              searchLocation,
              false,  // isKnownCategory: subcategory is flexible search
              searchExtraParams,
            )
          );

          const payload = response?.payload || {};
          const results = payload.results || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatUrlText(subcategorySlug));
          }
          setPrefetchedResults(payload);

          return;
        }


        if (categorySlug) {
          loadSearchResults();
          const response = await dispatch(
            performSearch(
              categorySlug,
              searchLocation,
              true,  // isKnownCategory: category from URL is always a known category
              searchExtraParams,
            )
          );

          const payload = response?.payload || {};
          const results = payload.results || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatUrlText(categorySlug));
          }
          setPrefetchedResults(payload);

          return;
        }
      } catch (error) {
        setResolvedCategory(
          formatUrlText(resolvedRouteContext?.subcategorySlug || resolvedRouteContext?.categorySlug || "")
        );
      }
    };

    loadCategory();

  }, [
    resolvedRouteContext,
    isSearchFlow,
    searchText,
    passedCategoryName,
    dispatch
  ]);

  if (
    !isSearchFlow &&
    resolvedRouteContext?.categorySlug &&
    !resolvedRouteContext?.subcategorySlug &&
    hasSubcategories(resolvedRouteContext.categorySlug)
  ) {
    return (
      <Suspense fallback={null}>
        <CategoriesPage routeContext={resolvedRouteContext} />
      </Suspense>
    );
  }

  if (!resolvedCategory) return null;

  return (
    <Suspense fallback={null}>
      <SearchResults
        routeContext={resolvedRouteContext}
        overrideCategory={resolvedCategory}
        overrideLocation={resolvedRouteContext?.locationName || formatUrlText(resolvedRouteContext?.locationSlug)}
        initialResults={prefetchedResults?.results}
        initialTotal={prefetchedResults?.total}
        initialHasMore={prefetchedResults?.hasMore}
        initialSearchIntent={prefetchedResults?.searchIntent}
      />
    </Suspense>
  );
};

export default CategoryRouter;
