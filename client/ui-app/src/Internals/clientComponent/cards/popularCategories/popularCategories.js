import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./popularCategories.css";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

import { logSearchActivity } from "../../../../redux/actions/businessListAction";
import { fetchPopularCategories } from "../../../../redux/actions/categoryAction";

const POPULAR_ORDER = [
  "Astrology",
  "Vastu Consultant",
  "Numerology",
  "Geologist",
  "Chartered Accountant",
  "Computer Training Institutes",
  "Coaching",
  "Vocational training",
  "Lawyer",
  "Registration Consultant",
  "Placement Service",
  "Kids School",
  "Beauty Parlour",
  "Body Massage",
  "Salon",
  "Beauty Spa",
  "Car Hire",
  "Electrician Services",
  "Event Organisers",
  "Real Estate",
  "Textile",
  "Fabricators",
  "Jewellery Showroom",
  "Tailoring",
  "Painting Contractor",
  "Nursing Service",
  "Courier Services",
  "Printing & Publishing Service",
  "Hobbies",
  "Internet Website Designer",
  "Opticals",
  "Organic Shop",
  "Scrap Dealer",
  "Automobiles",
  "Export and Import",
  "Loans",
  "Physiotherapy",
  "Clinical Lab",
  "Homeo Clinic",
  "Cosmetics",
  "Architect",
  "Sports",
  "Ceramic",
  "Book Shop",
  "Fancy Shop",
  "Tattoo Artist",
  "Boutique",
  "Footwear Shop",
  "Nursery Garden",
  "Special School",
  "Mosquito Net",
  "Hearing Aid"
];

const slugify = (text = "") =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const normalize = (text = "") =>
  text.toLowerCase().replace(/s$/, "").trim();

const generateAltText = (label, districtSlug) =>
  `${label} services in ${districtSlug}`;

const PopularCategoriesDrawer = ({ openFromHome = false }) => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [drawerOpen, setDrawerOpen] = useState(openFromHome);
  const [search, setSearch] = useState("");

  const { selectedDistrict } = useSelector(
    (state) => state.locationReducer
  );

  const { popularCategories = [], loading } = useSelector(
    (state) => state.categoryReducer
  );

  useEffect(() => {
    dispatch(fetchPopularCategories());
  }, [dispatch]);

  useEffect(() => {
    if (openFromHome) setDrawerOpen(true);
  }, [openFromHome]);

  const districtSlug = useMemo(
    () => slugify(selectedDistrict || "india"),
    [selectedDistrict]
  );

  const orderedCategories = useMemo(() => {

    if (!popularCategories.length) return [];

    const map = new Map(
      popularCategories.map(cat => [
        normalize(cat.name),
        cat
      ])
    );

    return POPULAR_ORDER.map((name) => {

      const found = map.get(normalize(name));

      return found
        ? found
        : {
          name,
          slug: slugify(name),
          icon: null
        };
    });

  }, [popularCategories]);

  const filtered = useMemo(() => {
    return orderedCategories.filter(cat =>
      cat.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, orderedCategories]);

const handleClick = useCallback((cat) => {
  const authUser = JSON.parse(
    localStorage.getItem("authUser") || "{}"
  );

  const userDetails = {
    userName: authUser?.userName,
    mobileNumber1: authUser?.mobileNumber1,
    mobileNumber2: authUser?.mobileNumber2,
    email: authUser?.email,
  };

  dispatch(
    logSearchActivity(
      cat.name,
      selectedDistrict || "Global",
      userDetails,
      cat.name
    )
  );

  navigate(`/${districtSlug}/${cat.slug}`);
  setDrawerOpen(false);

}, [dispatch, navigate, selectedDistrict, districtSlug]);

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: { width: "70%", maxWidth: "900px", padding: "20px" },
      }}
    >
      <header className="pc-header">
        <h2>Popular Categories</h2>
        <CloseIcon
          className="pc-close"
          onClick={() => setDrawerOpen(false)}
        />
      </header>

      <div className="pc-search">
        <SearchIcon />
        <input
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="pc-grid">

        {loading && <p>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: "center" }}>No categories found</p>
        )}

        {filtered.map((cat) => {

          const altText = generateAltText(cat.name, districtSlug);

          return (
            <article
              key={cat.name}
              className="pc-item"
              onClick={() => handleClick(cat)}
            >
              <img
                src={cat.icon || "/default.webp"}
                className="popular-icons"
                alt={altText}
                width="70"
                height="70"
                loading="lazy"
                decoding="async"
                style={{ objectFit: "contain" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default.webp";
                }}
              />
              <span>{cat.name}</span>
            </article>
          );
        })}

      </section>
    </Drawer>
  );
};

export default PopularCategoriesDrawer;