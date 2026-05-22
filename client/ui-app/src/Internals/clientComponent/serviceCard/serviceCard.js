import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchServiceCards } from "../../../redux/actions/categoryAction";
import { Skeleton } from "@mui/material";
import { getPlaceholderImage, handleImageError } from "../../../utils/placeholderImage";
import "./serviceCard.css";

const ServiceCardsSkeleton = () => (
  <section className="service-cards-container">
    {[...Array(4)].map((_, gi) => (
      <article className="category-card" key={gi}>
        <Skeleton variant="rounded" width="60%" height={22} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mb: 1.5 }} />
        <div className="items-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="item-card">
              <Skeleton variant="circular" width={70} height={70} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mx: "auto", mb: 1 }} />
              <Skeleton variant="rounded" width="80%" height={12} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mx: "auto" }} />
            </div>
          ))}
        </div>
      </article>
    ))}
  </section>
);

// Section order is now driven by the v2 API response (admin-configurable).
// Sections appear in the order items are returned from the server.

const toPascalCase = (str) => {
  if (!str || typeof str !== "string") return str;
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const createSlug = (text) => {
  if (!text || typeof text !== "string") return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const generateAltText = (serviceName, districtSlug) => {
  const safeName = serviceName || "Service";

  return `${safeName} in ${districtSlug} - Best ${
    typeof safeName === "string" ? safeName.toLowerCase() : "service"
  } services | MassClick`;
};

const ServiceCardsGrid = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { serviceCards = [], loading } = useSelector(
    (state) => state.categoryReducer
  );

  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );

  useEffect(() => {
    dispatch(fetchServiceCards());
  }, [dispatch]);


 const districtSlug = useMemo(() => {
  if (selectedDistrict?.slug) return selectedDistrict.slug;

  if (typeof selectedDistrict === "string") {
    return createSlug(selectedDistrict);
  }

  if (selectedDistrict?.name) {
    return createSlug(selectedDistrict.name);
  }

  return localStorage.getItem("selectedDistrictSlug") || "tiruchirappalli";
}, [selectedDistrict]);

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

    navigate(`/${districtSlug}/${service.slug}`, { state: { logAlreadySent: true } });
  };

  // Build sections preserving the order they first appear in the API response.
  const groupedData = useMemo(() => {
    const map = {};
    const sectionOrder = [];

    serviceCards.forEach((item) => {
      const section = item.section;
      if (!map[section]) {
        map[section] = [];
        sectionOrder.push(section);
      }
      map[section].push(item);
    });

    return sectionOrder.map((section) => ({
      title: section,
      items: map[section],
    }));
  }, [serviceCards]);

  if (loading) return <ServiceCardsSkeleton />;

  return (

    <section className="service-cards-container">

      {serviceCards.length === 0 && (
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

              // Get image URL with fallback priority:
              // 1. categoryImages.webCard (new structure)
              // 2. categoryImageKey (legacy)
              // 3. empty
              const imageUrl = (() => {
                if (item.categoryImages?.webCard) {
                  return item.categoryImages.webCard;
                }
                return item.categoryImageKey || getPlaceholderImage();
              })();

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
                    src={imageUrl}
                    alt={altText}
                    title={item.name}
                    className="item-icon"
                    width={90}
                    height={90}
                    loading="eager"
                    onError={(e) => {
                      e.target.onerror = null;
                      handleImageError(e);
                    }}
                  />

                  <p className="item-name">
                    {toPascalCase(item.name)}
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
