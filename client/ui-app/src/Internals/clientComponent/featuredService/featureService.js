import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchHomeCategories } from "../../../redux/actions/categoryAction";
import { getPlaceholderImage, handleImageError } from "../../../utils/placeholderImage";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";

import "./featureService.css";

const PopularCategoriesDrawer = React.lazy(() =>
  import("../cards/popularCategories/popularCategories.js")
);

// Order is now controlled via the admin Category Display Settings page.
// The v2 API returns items pre-sorted; no client-side reorder needed.

const toPascalCase = (str) => {
  if (!str || typeof str !== "string") return str;
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const createSlug = (text) => {
  if (!text) return "";
  if (typeof text === "object") {
    text = text.slug || text.name || text.label || "";
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const generateAltText = (serviceName, districtSlug) => {
  return `${serviceName} services in ${districtSlug} - MassClick local search`;
};

const FeaturedServicesSection = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [openDrawer, setOpenDrawer] = useState(false);

  const { homeCategories = [], loading } = useSelector(
    (state) => state.categoryReducer
  );

  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );

  useEffect(() => {
    dispatch(fetchHomeCategories());
  }, [dispatch]);

  const districtSlug = useMemo(() => {
    return (
      selectedDistrict?.slug ||
      createSlug(selectedDistrict) ||
      localStorage.getItem("selectedDistrictSlug") ||
      "tiruchirappalli"
    );
  }, [selectedDistrict]);

  // v2 API returns items in admin-configured order — use them directly.
  // "Popular Categories" is a real DB category; clicking it opens the drawer
  // instead of navigating to a search result.
  const orderedCategories = useMemo(() => {
    if (!Array.isArray(homeCategories) || !homeCategories.length) return [];

    const seenSlugs = new Set();

    return homeCategories
      .map((cat) => {
        const slug = cat.slug || createSlug(cat.name);
        if (seenSlugs.has(slug)) return null;
        seenSlugs.add(slug);

        if (cat.name?.toLowerCase() === "popular categories") {
          return { ...cat, isDrawer: true };
        }

        return cat;
      })
      .filter(Boolean);
  }, [homeCategories]);

  const handleClick = (service) => {

    // ✅ Drawer
    if (service.isDrawer) {
      setOpenDrawer(true);
      return;
    }

    const categoryName = service.name;
    const locationName = selectedDistrict || "Global";

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    // Log the search activity
    dispatch(
      logSearchActivity(
        categoryName,
        locationName,
        userDetails,
        categoryName
      )
    );

    // Use centralized navigation
    navigateToSearchResult({
      searchTerm: categoryName,
      location: locationName,
      navigate,
      dispatch,
      isKnownCategory: true, // This is a known category from featured services
      logAlreadySent: true,
      userDetails,
    });
  };

  return (
    <>
      <section className="featured-services-container">

        {orderedCategories.map((service, index) => {

          const altText = generateAltText(service.name, districtSlug);

          return (
            <article
              key={service.name}
              className="service-card"
              onClick={() => handleClick(service)}
              role="button"
              tabIndex={0}
              aria-label={`View ${service.name} services`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClick(service);
                }
              }}
            >

              <img
                src={service.icon ? service.icon : getPlaceholderImage()}
                onError={(e) => handleImageError(e)}
                alt={altText}
                title={`${service.name} services in ${districtSlug}`}
                className="service-icons"
                width="60"
                height="60"
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
                fetchpriority={index < 2 ? "high" : "auto"}
                onError={(e) => {
                  e.target.onerror = null;
                  handleImageError(e);
                }}
              />

              <h3 className="service-name">
                {toPascalCase(service.name)}
              </h3>

            </article>
          );
        })}

      </section>

      <Suspense fallback={null}>
        {openDrawer && (
          <PopularCategoriesDrawer
            openFromHome={true}
            onClose={() => setOpenDrawer(false)}
          />
        )}
      </Suspense>
    </>
  );
};

export default FeaturedServicesSection;