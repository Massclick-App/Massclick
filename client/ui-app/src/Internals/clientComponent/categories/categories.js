import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./categories.css";
import { categoriesData } from "./categoriesData";
import { iconMap } from "../../../utils/iconMap"; 

const createSlug = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const formatText = (text = "") =>
  text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subcategories]);

  const handleClick = (subName) => {
    const subSlug = createSlug(subName);
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
          filteredCategories.map((item, index) => {
            const iconSrc = iconMap[item.icon];

            return (
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
                <img
                  src={iconSrc}
                  alt={item.name}
                  className="category-icon"
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = iconMap["construction"]; // fallback
                  }}
                />

                <span className="category-text">
                  {item.name}
                </span>
              </div>
            );
          })
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