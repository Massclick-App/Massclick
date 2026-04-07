import React from "react";
import { useParams } from "react-router-dom";
import CategoriesPage from "./categories.js";
import SearchResults from "../SearchResult/SearchResult";
import { categoriesData } from "./categoriesData";

const CategoryRouter = () => {
  const { category } = useParams();

  const categoryKey = category?.toLowerCase();

  const hasSubcategories =
    categoriesData[categoryKey] &&
    categoriesData[categoryKey].length > 0;

  if (hasSubcategories) {
    return <CategoriesPage />;
  }

  return <SearchResults />;
};

export default CategoryRouter;