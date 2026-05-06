import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import "./categories.css";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchSubCategories } from "../../../redux/actions/categoryAction";
import { shouldSendSearch } from "../../../utils/searchLock";

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
    const authUser = JSON.parse(
      localStorage.getItem("authUser") || "{}"
    );

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2 || "",
      email: authUser?.email || "",
    };

    dispatch(
      logSearchActivity(
        sub.name,
        location || "Global",
        userDetails,
        sub.name
      )
    );

    navigate(`/${location}/${category}/${sub.slug}`, { state: { logAlreadySent: true } });
  };

  const locationSlug = location || "";
  const categorySlug = category || "";
  const categoryPageUrl = `https://massclick.in/${locationSlug}/${categorySlug}`;
  const locationLabel = formatText(locationSlug);
  const categoryLabel = formatText(categorySlug);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://massclick.in" },
      { "@type": "ListItem", position: 2, name: locationLabel, item: `https://massclick.in/${locationSlug}` },
      { "@type": "ListItem", position: 3, name: categoryLabel, item: categoryPageUrl },
    ],
  };

  const itemListSchema = filteredCategories.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${categoryLabel} subcategories in ${locationLabel}`,
        itemListElement: filteredCategories.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          url: `https://massclick.in/${locationSlug}/${categorySlug}/${item.slug}`,
        })),
      }
    : null;

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {itemListSchema && (
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        )}
      </Helmet>
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
    </>
  );
};

export default CategoriesPage;