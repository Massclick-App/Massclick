import React, { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  performSearch,
} from "../../../redux/actions/businessListAction";
import axiosInstance from "../../../services/axiosInstance.js";

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

const formatText = (text = "") =>
  text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CategoryRouter = () => {
  const { location, category, subcategory } = useParams();
  const routerLocation = useLocation();
  const dispatch = useDispatch();

  const [resolvedCategory, setResolvedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [prefetchedResults, setPrefetchedResults] = useState(null);

  const isSearchFlow = routerLocation.state?.isSearch;
  const searchText = routerLocation.state?.searchText;
  const passedCategoryName = routerLocation.state?.categoryName;

  const API_URL = process.env.REACT_APP_API_URL;

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
  }, []);

  const hasSubcategories = (cat) => {
    if (!cat) return false;
    const categoryObj = categories.find(
      (c) => c.slug === cat.toLowerCase().replace(/\s+/g, "-")
    );
    return categoryObj?.hasSubcategories || false;
  };

  useEffect(() => {
    const loadCategory = async () => {
      setPrefetchedResults(null);
      try {
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
              location,
              false  // isKnownCategory: user search flow
            )
          );

          setPrefetchedResults(response?.payload || {});

          return;
        }

        if (subcategory) {
          const searchValue = subcategory.replace(/-/g, " ");

          loadSearchResults();
          const response = await dispatch(
            performSearch(
              searchValue,
              location,
              false  // isKnownCategory: subcategory is flexible search
            )
          );

          const payload = response?.payload || {};
          const results = payload.results || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatText(subcategory));
          }
          setPrefetchedResults(payload);

          return;
        }


        if (category) {
          loadSearchResults();
          const response = await dispatch(
            performSearch(
              category,
              location,
              true  // isKnownCategory: category from URL is always a known category
            )
          );

          const payload = response?.payload || {};
          const results = payload.results || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatText(category));
          }
          setPrefetchedResults(payload);

          return;
        }
      } catch (error) {
        setResolvedCategory(
          formatText(subcategory || category || "")
        );
      }
    };

    loadCategory();

  }, [
    location,
    category,
    subcategory,
    isSearchFlow,
    searchText,
    passedCategoryName,
    dispatch
  ]);

  if (
    !isSearchFlow &&
    category &&
    !subcategory &&
    hasSubcategories(category)
  ) {
    return (
      <Suspense fallback={null}>
        <CategoriesPage />
      </Suspense>
    );
  }

  if (!resolvedCategory) return null;

  return (
    <Suspense fallback={null}>
      <SearchResults
        overrideCategory={resolvedCategory}
        overrideLocation={formatText(location)}
        initialResults={prefetchedResults?.results}
        initialTotal={prefetchedResults?.total}
        initialHasMore={prefetchedResults?.hasMore}
      />
    </Suspense>
  );
};

export default CategoryRouter;
