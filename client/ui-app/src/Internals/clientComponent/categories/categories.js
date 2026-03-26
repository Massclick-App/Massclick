import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./categories.css";
import { categoriesData } from "./categoriesData";

import DefaultIcon from "../../../assets/features/contractor.webp";

const createSlug = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const formatText = (text = "") =>
  text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CategoriesPage = () => {
  const { location, category } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const categoryKey = useMemo(
    () => category?.toLowerCase(),
    [category]
  );

  const subcategories = useMemo(
    () => categoriesData[categoryKey] || [],
    [categoryKey]
  );

  const filteredCategories = useMemo(() => {
    return subcategories.filter((item) =>
      item.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subcategories]);

  const handleClick = (sub) => {
    const subSlug = createSlug(sub);

    navigate(`/${location}/${category}/${subSlug}`);
  };

  return (
    <div className="category-container">

      <h2 className="category-title">
        {formatText(category)}
      </h2>

      <input
        type="text"
        placeholder="Search All Category"
        className="category-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="category-grid">

        {filteredCategories.length > 0 ? (
          filteredCategories.map((sub, index) => (
            <div
              key={index}
              className="category-item"
              onClick={() => handleClick(sub)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClick(sub);
              }}
            >
              <img
                src={DefaultIcon}
                alt={sub}
                className="category-icon"
                loading="lazy"
              />

              <span className="category-text">
                {sub}
              </span>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px" }}>
            <p>No categories found</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoriesPage;