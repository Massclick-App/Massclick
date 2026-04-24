import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import "./categories.css";

import { fetchSubCategories } from "../../../redux/actions/categoryAction";

const createSlug = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

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

  useEffect(() => {
    if (category) {
      dispatch(fetchSubCategories(category));
    }
  }, [dispatch, category]);

  const filteredCategories = useMemo(() => {
    return subCategories.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subCategories]);

  const handleClick = (sub) => {
    navigate(`/${location}/${category}/${sub.slug}`);
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

        {loading && <p style={{ textAlign: "center" }}>Loading...</p>}

        {!loading && filteredCategories.length === 0 && (
          <p style={{ textAlign: "center" }}>
            No categories found
          </p>
        )}

        {/* ✅ DATA */}
        {filteredCategories.map((item, index) => (
          <div
            key={item._id || index}
            className="category-item"
            onClick={() => handleClick(item)}
          >

            <img
              className="category-icon"
              src={item.icon}
              alt={item.name}
              width="48"
              height="48"
              loading="lazy"
              decoding="async"
              style={{ objectFit: "contain" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/icons/default.webp";
              }}
            />

            <span className="category-text">
              {item.name}
            </span>

          </div>
        ))}

      </div>

    </div>
  );
};

export default CategoriesPage;