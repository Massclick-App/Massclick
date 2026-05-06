import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import CategoriesPage from "./categories.js";
import SearchResults from "../SearchResult/SearchResult";
import { categoriesData } from "./categoriesData";

import {
  backendMainSearch,
} from "../../../redux/actions/businessListAction";

const formatText = (text = "") =>
  text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CategoryRouter = () => {
  const { location, category, subcategory } = useParams();
  const routerLocation = useLocation();
  const dispatch = useDispatch();

  const [resolvedCategory, setResolvedCategory] = useState(null);

  const isSearchFlow = routerLocation.state?.isSearch;
  const searchText = routerLocation.state?.searchText;

  useEffect(() => {
    const loadCategory = async () => {
      try {
        if (isSearchFlow && searchText) {
          setResolvedCategory(searchText);

          await dispatch(
            backendMainSearch(
              searchText,
              location,
              searchText
            )
          );

          return;
        }


        if (category && !subcategory && categoriesData[category]) {
          setResolvedCategory(formatText(category));
          return;
        }


        if (subcategory) {
          const searchValue = subcategory.replace(/-/g, " ");

          const response = await dispatch(
            backendMainSearch(
              searchValue,
              location,
              searchValue
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
            backendMainSearch(
              category,
              location,
              category
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
        console.error(error);

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
    dispatch
  ]);

  if (!resolvedCategory) return null;

  if (
    !isSearchFlow &&
    category &&
    !subcategory &&
    categoriesData[category]
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