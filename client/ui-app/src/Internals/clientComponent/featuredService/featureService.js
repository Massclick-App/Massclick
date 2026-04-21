import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { fetchHomeCategories } from "../../../redux/actions/categoryAction";
import { Skeleton } from "@mui/material";

import "./featureService.css";

const FeaturedSkeleton = () => (
  <section className="featured-services-container">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="service-card" style={{ width: 130, height: 160 }}>
        <Skeleton variant="circular" width={80} height={80} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mx: "auto", mb: 1.5 }} />
        <Skeleton variant="rounded" width="70%" height={14} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mx: "auto" }} />
        <Skeleton variant="rounded" width="50%" height={11} animation="wave" sx={{ bgcolor: "rgba(255,107,44,0.055)", mx: "auto", mt: 0.5 }} />
      </div>
    ))}
  </section>
);

const PopularCategoriesDrawer = React.lazy(() =>
  import("../cards/popularCategories/popularCategories.js")
);

const FEATURED_ORDER = [
  "Hotels",
  "Rent And Hire",
  "Restaurants",
  "Education",
  "Hospitals",
  "Dentist",
  "Dermatologist",
  "Sexologist",
  "Contractors",
  "Gym",
  "Furnitures",
  "Florists",
  "Packers and Movers",
  "House Keeping Service",
  "Security System",
  "Wedding Mahal",
  "photographers",
  "Matrimony",
  "Hostel",
  "Popular Categories"
];

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

  const normalize = (name) =>
    name.toLowerCase().replace(/s$/, "").trim();

  const orderedCategories = useMemo(() => {

    if (!homeCategories.length) return [];

    const map = new Map(
      homeCategories.map((cat) => [
        normalize(cat.name),
        cat
      ])
    );

    return FEATURED_ORDER.map((name) => {

      if (name === "Popular Categories") {

        const found = map.get(normalize(name));

        return found
          ? {
            ...found,
            isDrawer: true
          }
          : {
            name,
            slug: "popular",
            icon: "/default.webp",
            isDrawer: true
          };
      }

      const found = map.get(normalize(name));

      return found || {
        name,
        slug: createSlug(name),
        icon: "/default.webp"
      };

    });

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

  if (loading) return <FeaturedSkeleton />;

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
                src={service.icon ? service.icon : "/default.webp"}
                alt={altText}
                title={`${service.name} services in ${districtSlug}`}
                className="service-icons"
                width="80"
                height="80"
                loading="lazy"
                decoding="async"
                fetchpriority={index < 2 ? "high" : "low"}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default.webp";
                }}
              />

              <h3 className="service-name">
                {service.name}
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