import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchServiceCards } from "../../../redux/actions/categoryAction";
import "./serviceCard.css";

// ==============================
// FIXED SECTION ORDER (VERY IMPORTANT)
// ==============================
const SECTION_ORDER = [
  "Repair and Services",
  "Services",
  "Hot Categories",
  "Building Materials"
];

// ==============================
// Helper: Create SEO slug
// ==============================
const createSlug = (text = "") => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// ==============================
// Helper: Generate SEO alt text
// ==============================
const generateAltText = (serviceName, districtSlug) => {
  const safeName = serviceName || "Service";
  return `${safeName} in ${districtSlug} - Best ${safeName.toLowerCase()} services | MassClick`;
};

// ==============================
// MAIN COMPONENT
// ==============================
const ServiceCardsGrid = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { serviceCards = [], loading } = useSelector(
    (state) => state.categoryReducer
  );

  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );

  // ==============================
  // FETCH API
  // ==============================
  useEffect(() => {
    dispatch(fetchServiceCards());
  }, [dispatch]);

  // ==============================
  // DISTRICT SLUG
  // ==============================
  const districtSlug = useMemo(() => {
    return (
      selectedDistrict?.slug ||
      createSlug(selectedDistrict) ||
      localStorage.getItem("selectedDistrictSlug") ||
      "tiruchirappalli"
    );
  }, [selectedDistrict]);

  // ==============================
  // CLICK HANDLER
  // ==============================
  const handleClick = (service) => {

    const categoryName = service.name;
    const locationName = selectedDistrict || "Global";

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    dispatch(
      logSearchActivity(
        categoryName,
        locationName,
        userDetails,
        categoryName
      )
    );

    navigate(`/${districtSlug}/${service.slug}`);
  };

  // ==============================
  // GROUP DATA (FIXED DESIGN LOGIC)
  // ==============================
  const groupedData = useMemo(() => {
    const map = {};

    // Group API data
    serviceCards.forEach((item) => {
      const section = item.section;

      if (!map[section]) {
        map[section] = [];
      }

      map[section].push(item);
    });

    // FORCE ORDER (VERY IMPORTANT)
    return SECTION_ORDER.map((section) => ({
      title: section,
      items: map[section] || []
    }));

  }, [serviceCards]);

  // ==============================
  // RENDER
  // ==============================
  return (

    <section className="service-cards-container">

      {loading && <p>Loading...</p>}

      {!loading && serviceCards.length === 0 && (
        <p>No services found</p>
      )}

      {groupedData.map((category) => (

        <article className="category-card" key={category.title}>

          <h2 className="category-title">
            {category.title}
          </h2>

          <div className="items-grid">

            {category.items.map((item, index) => {

              const altText = generateAltText(item.name, districtSlug);

              return (
                <div
                  key={item.slug || index}
                  className="item-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClick(item);
                    }
                  }}
                >

                  <img
                    src={item.icon || "/default.webp"}
                    alt={altText}
                    title={item.name}
                    className="item-icon"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default.webp";
                    }}
                  />

                  <p className="item-name">
                    {item.name}
                  </p>

                </div>
              );
            })}

          </div>

        </article>

      ))}

    </section>

  );
};

export default ServiceCardsGrid;