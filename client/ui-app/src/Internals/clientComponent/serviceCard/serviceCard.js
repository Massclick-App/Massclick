import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import TvService from "../../../assets/services/tv-service.webp";
import PestService from "../../../assets/services/pestService.webp";
import CarMechanic from "../../../assets/services/car-service.webp";
import BikeService from "../../../assets/features/bike-service.webp";
import ComputerAndLaptopIcon from "../../../assets/services/computer-services.webp";
import CateringIcon from "../../../assets/features/caterors.webp";
import Fencing from "../../../assets/services/fencing.webp";
import Interlock from "../../../assets/services/interlockBricks.webp";
import SteelDealers from "../../../assets/services/steelDealers.webp";
import Transports from "../../../assets/features/transportation.webp";
import DrivingSchool from "../../../assets/features/driving.webp";
import ACServiceIcon from "../../../assets/features/ACservice.webp";

import "./serviceCard.css";

const createSlug = (text) => {

  if (!text) return "";

  if (typeof text === "object") {

    text =
      text.slug ||
      text.name ||
      "";

  }

  if (typeof text !== "string") return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

};


export const categoriesServices = [

  {
    title: "Repair and Services",

    items: [

      {
        name: "Car Service",
        slug: "car-service",
        icon: CarMechanic,

        aliases: [
          "car service",
          "car repair",
          "car mechanic",
          "vehicle repair",
          "auto repair"
        ]

      },

      {
        name: "TV Service",
        slug: "tv-service",
        icon: TvService,

        aliases: [
          "tv repair",
          "tv service",
          "television repair",
          "tv mechanic"
        ]

      },

      {
        name: "Bike Service",
        slug: "bike-service",
        icon: BikeService,

        aliases: [
          "bike repair",
          "bike mechanic",
          "motorcycle repair",
          "two wheeler repair"
        ]

      }

    ]

  },



  {
    title: "Services",

    items: [

      {
        name: "Pest Control Service",
        slug: "pest-control-service",
        icon: PestService,

        aliases: [
          "pest control",
          "pest control service",
          "termite control",
          "pest removal"
        ]

      },

      {
        name: "AC Service",
        slug: "ac-service",
        icon: ACServiceIcon,

        aliases: [
          "ac service",
          "ac repair",
          "air conditioner repair",
          "air conditioner service"
        ]

      },

      {
        name: "Computer And Laptop Service",
        slug: "computer-laptop-service",
        icon: ComputerAndLaptopIcon,

        aliases: [
          "computer repair",
          "laptop repair",
          "pc repair",
          "computer service"
        ]

      }

    ]

  },

  {
    title: "Hot Categories",

    items: [

      {
        name: "Catering Services",
        slug: "catering-services",
        icon: CateringIcon,

        aliases: [
          "catering",
          "catering service",
          "food catering"
        ]

      },

      {
        name: "Transports",
        slug: "transporter",   
        icon: Transports,

        aliases: [
          "Transporter",
          "transport",
          "transports",
          "transporter",
          "transporters",
          "transportation",
          "transport service",
          "transport services",
          "logistics",
          "delivery service",
          "delivery"
        ]

      },

      {
        name: "Driving School",
        slug: "driving-school",
        icon: DrivingSchool,

        aliases: [
          "driving school",
          "driving schools",
          "driving class",
          "driving classes"
        ]

      }

    ]

  },

  {
    title: "Building Materials",

    items: [

      {
        name: "Fencing",
        slug: "fencing",
        icon: Fencing,

        aliases: [
          "fencing",
          "fence work"
        ]

      },

      {
        name: "Interlock Bricks",
        slug: "interlock-bricks",
        icon: Interlock,

        aliases: [
          "interlock",
          "interlock bricks"
        ]

      },

      {
        name: "Steel Dealer",
        slug: "steel-dealer",
        icon: SteelDealers,

        aliases: [
          "steel",
          "steel dealer",
          "steel supplier"
        ]

      }

    ]

  }

];

const findServiceByAlias = (input) => {

  if (!input) return null;

  const normalized =
    input.toLowerCase().trim();


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


const ServiceCardsGrid = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();


  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );


  const districtSlug =
    selectedDistrict?.slug ||
    createSlug(selectedDistrict) ||
    localStorage.getItem("selectedDistrictSlug") ||
    "tiruchirappalli";



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

  return (

    <div className="service-cards-container">

      {categoriesServices.map((category, index) => (

        <div className="category-card" key={index}>

          <h2 className="category-title">

            {category.title}

          </h2>

          <div className="items-grid">

            {category.items.map((item, idx) => (

              <div
                key={idx}
                className="item-card"
                onClick={() => handleClick(item)}
              >

                <img
                  src={item.icon}
                  alt={item.name}
                  className="item-icon"
                />

                <p className="item-name">

                  {item.name}

                </p>

              </div>

            ))}

          </div>

        </div>

      ))}

    </div>

  );

};



export default ServiceCardsGrid;
