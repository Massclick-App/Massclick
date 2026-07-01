import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import CategoriesPage from "./categories.js";
import SearchResults from "../SearchResult/SearchResult";

import {
  performSearch,
} from "../../../redux/actions/businessListAction";
import axiosInstance from "../../../services/axiosInstance.js";

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
      try {
        // If category name was passed directly from featured service, use it
        if (passedCategoryName) {
          setResolvedCategory(passedCategoryName);
          return;
        }

        if (isSearchFlow && searchText) {
          setResolvedCategory(searchText);

          await dispatch(
            performSearch(
              searchText,
              location,
              false  // isKnownCategory: user search flow
            )
          );

          return;
        }

        // Check if category has subcategories using API data
        if (category && !subcategory && hasSubcategories(category)) {
          setResolvedCategory(formatText(category));
          return;
        }


        if (subcategory) {
          const searchValue = subcategory.replace(/-/g, " ");

          const response = await dispatch(
            performSearch(
              searchValue,
              location,
              false  // isKnownCategory: subcategory is flexible search
            )
          );

          const results = response?.payload || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatText(subcategory));
          }

          return;
        }


        if (category) {
          const response = await dispatch(
            performSearch(
              category,
              location,
              true  // isKnownCategory: category from URL is always a known category
            )
          );

          const results = response?.payload || [];

          if (results.length > 0) {
            setResolvedCategory(results[0].category);
          } else {
            setResolvedCategory(formatText(category));
          }

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
    dispatch,
    categories
  ]);

  if (!resolvedCategory) return null;

  if (
    !isSearchFlow &&
    category &&
    !subcategory &&
    hasSubcategories(category)
  ) {
    return <CategoriesPage />;
  }

  return (
    <SearchResults
      overrideCategory={resolvedCategory}
      overrideLocation={formatText(location)}
    />
  );
};

export default CategoryRouter;
