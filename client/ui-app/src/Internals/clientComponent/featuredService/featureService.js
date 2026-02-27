import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import RestuarantIcon from "../../../assets/features/restuarant.webp";
import HotelIcon from "../../../assets/features/hotel.webp";
import InteriorDesignerIcon from "../../../assets/features/interiors-Designers.webp";
import FurnitureIcon from "../../../assets/features/furniture.webp";
import RentIcon from "../../../assets/features/rent.webp";
import HospitalIcon from "../../../assets/features/hospital.webp";
import ContractIcon from "../../../assets/features/contractor.webp";
import HousekeeperIcon from "../../../assets/features/housekeeper.webp";
import HostelsIcon from "../../../assets/features/hostels.webp";
import SecuritySystemIcon from "../../../assets/features/security-system.webp";
import DentistIcon from "../../../assets/features/dentist.webp";
import FloristIcon from "../../../assets/features/florist.webp";
import WeddingHallIcon from "../../../assets/features/wedding-hall.webp";
import PhotographerIcon from "../../../assets/features/photographer.webp";
import DermatologistIcon from "../../../assets/features/dermatologist.webp";
import PackersIcon from "../../../assets/features/packers.webp";
import MatrimonyIcon from "../../../assets/features/matrimony.webp";
import PopularIcon from "../../../assets/features/popular.webp";
import SexologyIcon from "../../../assets/features/sexology.webp";
import GymIcon from "../../../assets/features/gym.webp";

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

  { name: "Hotels", icon: HotelIcon },

  { name: "Rent And Hire", icon: RentIcon },

  { name: "Restaurants", icon: RestuarantIcon },

  { name: "Hospitals", icon: HospitalIcon },

  { name: "Dentist", icon: DentistIcon },

  { name: "Dermatologist", icon: DermatologistIcon },

  { name: "Sexologist", icon: SexologyIcon },

  { name: "Contractors", icon: ContractIcon },

  { name: "Interior Designer", icon: InteriorDesignerIcon },

  { name: "Gym", icon: GymIcon },

  { name: "Furnitures", icon: FurnitureIcon },

  { name: "Florists", icon: FloristIcon },

  { name: "Packers and Movers", icon: PackersIcon },

  { name: "House Keeping Service", icon: HousekeeperIcon },

  { name: "Security System", icon: SecuritySystemIcon },

  { name: "Wedding Mahal", icon: WeddingHallIcon },

  { name: "photographers", icon: PhotographerIcon },

  { name: "Matrimony", icon: MatrimonyIcon },

  { name: "Hostel", icon: HostelsIcon },

  { name: "Popular Categories", icon: PopularIcon, isDrawer: true },

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
                src={service.icon}
                alt={altText}
                title={`${service.name} services in ${districtSlug}`}
                className="service-icons"
                width="80"
                height="80"
                loading="lazy"
                decoding="async"
                fetchpriority={index < 4 ? "high" : "auto"}
                itemProp="image"
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
