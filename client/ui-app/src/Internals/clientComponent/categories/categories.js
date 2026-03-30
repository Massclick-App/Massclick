import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./categories.css";
import { categoriesData } from "./categoriesData";

import DefaultIcon from "../../../assets/features/contractor.webp";

// 🔹 Convert text to URL slug
const createSlug = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

// 🔹 Format heading text
const formatText = (text = "") =>
  text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CategoriesPage = () => {
  const { location, category } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // 🔹 Get category key
  const categoryKey = useMemo(
    () => category?.toLowerCase(),
    [category]
  );

  // 🔹 Get subcategories (now objects)
  const subcategories = useMemo(
    () => categoriesData[categoryKey] || [],
    [categoryKey]
  );

  // 🔹 Filter based on name
  const filteredCategories = useMemo(() => {
    return subcategories.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subcategories]);

  // 🔹 Handle click
  const handleClick = (subName) => {
    const subSlug = createSlug(subName);
    navigate(`/${location}/${category}/${subSlug}`);
  };

  return (
    <div className="category-container">

      {/* 🔹 Title */}
      <h2 className="category-title">
        {formatText(category)}
      </h2>

      {/* 🔹 Search */}
      <input
        type="text"
        placeholder="Search All Category"
        className="category-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* 🔹 Grid */}
      <div className="category-grid">

        {filteredCategories.length > 0 ? (
          filteredCategories.map((item, index) => (
            <div
              key={index}
              className="category-item"
              onClick={() => handleClick(item.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClick(item.name);
              }}
            >
              {/* 🔹 Icon */}
              <img
                src={item.icon || DefaultIcon}
                alt={item.name}
                className="category-icon"
                loading="lazy"
              />

              {/* 🔹 Text */}
              <span className="category-text">
                {item.name}
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