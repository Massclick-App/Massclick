import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import CategoriesPage from "./categories.js";
import SearchResults from "../SearchResult/SearchResult";
import { categoriesData } from "./categoriesData";

import {
  backendMainSearch,
} from "../../../redux/actions/businessListAction";

const createSlug = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const formatText = (text = "") =>
  text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CategoryRouter = () => {
  const { location, category } = useParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [resolvedCategory, setResolvedCategory] = useState(null);

  const isSearchFlow = routerLocation.state?.isSearch;
  const searchText = routerLocation.state?.searchText;

  useEffect(() => {
    if (!category && !searchText) return;

    if (isSearchFlow && searchText) {
      setResolvedCategory(searchText);

      dispatch(
        backendMainSearch(searchText, location, searchText)
      );

      return;
    }

    const isParentCategory = categoriesData[category];

    if (isParentCategory) {
      setResolvedCategory(formatText(category));
      return;
    }

    const resolveCategoryFromAPI = async () => {
      try {
        const response = await dispatch(
          backendMainSearch(category, location, category)
        );

        const results = response?.payload || [];

        if (results.length > 0) {
          const realCategory = results[0].category;
          const correctSlug = createSlug(realCategory);

          setResolvedCategory(realCategory);

          if (category !== correctSlug) {
            navigate(`/${location}/${correctSlug}`, { replace: true });
          }
        } else {
          setResolvedCategory(formatText(category));
        }
      } catch (err) {
        console.error(err);
        setResolvedCategory(formatText(category));
      }
    };

    resolveCategoryFromAPI();

  }, [category, location, searchText, isSearchFlow, dispatch, navigate]);

  if (!resolvedCategory) return null;

  if (!isSearchFlow && categoriesData[category]) {
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