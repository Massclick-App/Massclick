import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { iconMap } from "../../../utils/iconMap";


import PopularCategoriesDrawer from "../cards/popularCategories/popularCategories.js";

import "./featureService.css";

const createSlug = (text) => {

  if (!text) return "";

  if (typeof text === "object") {

    text =
      text.slug ||
      text.name ||
      text.label ||
      "";
  }

  if (typeof text !== "string") return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const generateAltText = (serviceName, districtSlug) => {
  return `${serviceName} services in ${districtSlug} - MassClick local search`;
};

export const featuredServices = [
  { name: "Hotels", icon: "hotel" },
  { name: "Rent And Hire", icon: "rent", subCategories: true },
  { name: "Restaurants", icon: "restuarant" },
  { name: "Education", icon: "education", subCategories: true },
  { name: "Hospitals", icon: "hospital", subCategories: true },
  { name: "Dentist", icon: "dentist" },
  { name: "Dermatologist", icon: "dermatologist" },
  { name: "Sexologist", icon: "sexology" },
  { name: "Contractors", icon: "contractor", subCategories: true },
  { name: "Gym", icon: "gym" },
  { name: "Furnitures", icon: "furniture" },
  { name: "Florists", icon: "florist" },
  { name: "Packers and Movers", icon: "packers" },
  { name: "House Keeping Service", icon: "housekeeper" },
  { name: "Security System", icon: "security-system" },
  { name: "Wedding Mahal", icon: "wedding-hall" },
  { name: "photographers", icon: "photographer" },
  { name: "Matrimony", icon: "matrimony" },
  { name: "Hostel", icon: "hostels" },
  { name: "Popular Categories", icon: "popular", isDrawer: true },
];

const FeaturedServicesSection = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [openDrawer, setOpenDrawer] = useState(false);


  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );


  const districtSlug = useMemo(() => {
    return (
      selectedDistrict?.slug ||
      createSlug(selectedDistrict) ||
      localStorage.getItem("selectedDistrictSlug") ||
      "tiruchirappalli"
    );
  }, [selectedDistrict]);



  const handleClick = (service) => {

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

    const categorySlug = createSlug(service.name);

    navigate(`/${districtSlug}/${categorySlug}`);

  };

  return (
    <>
      <section
        className="featured-services-container"
        aria-label="Featured Services"
      >

        {featuredServices.map((service, index) => {

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
                src={iconMap[service.icon]}
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
                  e.target.src = iconMap["hotel"];
                }}
              />

              <h3 className="service-name">
                {service.name}
              </h3>

            </article>
          );

        })}

      </section>


      {openDrawer && (
        <PopularCategoriesDrawer
          openFromHome={true}
          onClose={() => setOpenDrawer(false)}
        />
      )}

    </>
  );

};


export default FeaturedServicesSection;
