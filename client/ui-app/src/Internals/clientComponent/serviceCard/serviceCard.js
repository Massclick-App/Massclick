import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import "./serviceCard.css";
import { iconMap } from "../../../utils/iconMap";

// ==============================
// Helper: Create SEO slug
// ==============================
const createSlug = (text) => {

  if (!text) return "";

  if (typeof text === "object") {
    text = text.slug || text.name || "";
  }

  if (typeof text !== "string") return "";

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
  return `${serviceName} in ${districtSlug} - Best ${serviceName.toLowerCase()} services | MassClick`;
};


// ==============================
// Categories Data
// ==============================
export const categoriesServices = [
  {
    title: "Repair and Services",
    items: [
      { name: "Car Service", slug: "car-service", icon: "car-service" },
      { name: "TV Service", slug: "tv-service", icon: "tv-service" },
      { name: "Bike Service", slug: "bike-service", icon: "bike-service" }
    ]
  },
  {
    title: "Services",
    items: [
      { name: "Pest Control Service", slug: "pest-control-service", icon: "pest-control-service" },
      { name: "AC Service", slug: "ac-service", icon: "ac-service" },
      { name: "Computer And Laptop Service", slug: "computer-laptop-service", icon: "computer-laptop-service" }
    ]
  },
  {
    title: "Hot Categories",
    items: [
      { name: "Catering Services", slug: "catering-services", icon: "catering-services" },
      { name: "Transports", slug: "transporter", icon: "transporter" },
      { name: "Driving School", slug: "driving-school", icon: "driving-school" }
    ]
  },
  {
    title: "Building Materials",
    items: [
      { name: "Fencing", slug: "fencing", icon: "fencing" },
      { name: "Interlock Bricks", slug: "interlock-bricks", icon: "interlock-bricks" },
      { name: "Steel Dealer", slug: "steel-dealer", icon: "steel-dealer" }
    ]
  }
];


// ==============================
// Find service helper
// ==============================
const findServiceByAlias = (input) => {

  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  for (const section of categoriesServices) {
    for (const item of section.items) {
      if (
        item.slug === normalized ||
        item.name.toLowerCase() === normalized ||
        item.aliases?.includes(normalized)
      ) {
        return item;
      }
    }
  }

  return null;

};


// ==============================
// Main Component
// ==============================
const ServiceCardsGrid = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );

  // Memoized slug
  const districtSlug = useMemo(() => {
    return (
      selectedDistrict?.slug ||
      createSlug(selectedDistrict) ||
      localStorage.getItem("selectedDistrictSlug") ||
      "tiruchirappalli"
    );
  }, [selectedDistrict]);


  // Click handler
  const handleClick = (service) => {

    const found = findServiceByAlias(service.slug);

    if (!found) return;

    const categoryName = found.name;
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

    navigate(`/${districtSlug}/${found.slug}`);

  };


  // Render
  return (

    <section
      className="service-cards-container"
      aria-label="Service Categories"
    >

      {categoriesServices.map((category) => (

        <article
          className="category-card"
          key={category.title}
        >

          <h2 className="category-title">
            {category.title}
          </h2>

          <div className="items-grid">

            {category.items.map((item, index) => {

              const altText = generateAltText(item.name, districtSlug);

              return (

                <div
                  key={item.slug}
                  className="item-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${item.name}`}
                  onClick={() => handleClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClick(item);
                    }
                  }}
                >

                  {/* SEO Optimized Image */}
                  <img
                    src={iconMap[item.icon]}
                    alt={altText}
                    title={`${item.name} in ${districtSlug}`}
                    className="item-icon"
                    width="64"
                    height="64"
                    loading="lazy"
                    decoding="async"
                    fetchpriority={index < 2 ? "high" : "low"}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = iconMap["car-service"];
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