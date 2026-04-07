import React from "react";
import "./popularCategories.css";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";




const createSlug = (text) => {

    if (!text) return "unknown";

    if (typeof text === "object") {

        text =
            text.slug ||
            text.name ||
            text.label ||
            "";

    }

    if (typeof text !== "string") return "unknown";

    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

};



/* ============================= */
/* POPULAR SEARCH LIST */
/* ============================= */

const popularSearches = [

    "Dealers",
    "Gym",
    "Mandapam",
    "Pediatric Hospital",
    "Color Therapy",
    "Ultrasound Scan",
    "Homeo Clinic",
    "Interior Designer",
    "Live Music Concert",
    "Tattoo Shop",
    "Boutique Halls",
    "Catering Services",
    "Women Beauty Salon",
    "Naturopathy",
    "Aariworks Services",
    "Moles and Warts",
    "Yenp",
    "Visa Booking",
    "Janavasam",
    "Shop",
    "Wholesale Dealers",
    "Pre Wedding Photography",
    "Interlock Bricks",
    "Band Music",
    "Acupuncture",
    "Mosquito Net",
    "Neurology and Neuro Surgery",
    "M Sand",
    "Events",
    "Mixer Repair Services",
    "Gas Cylinder Services",
    "Health Check Up",
    "Dental Care",
    "Paediatric Ortho",
    "GATE Coaching Center",
    "Skin Discolouration",
    "Mehendi Artist",
    "Saree Polishing",
    "Medical Lab",
    "Air Therapy",
    "Melam",
    "Crane Service",
    "Creative Photography Services",
    "Multi Speciality Hospital",
    "Granites Marbles",
    "Steel Dealer",
    "Air Travels",
    "Bridal Hairstyles",
    "Mammography",
    "Bridal Jewels rental services",
    "Hospital"

];



/* ============================= */
/* COMPONENT */
/* ============================= */

const PopularCategories = () => {

    const navigate = useNavigate();


    /* GET DISTRICT FROM REDUX */

    const selectedDistrict = useSelector(
        (state) => state.locationReducer.selectedDistrict
    );


    /* CREATE DISTRICT SLUG */

    const districtSlug =

        selectedDistrict?.slug ||

        createSlug(selectedDistrict) ||

        localStorage.getItem("selectedDistrictSlug") ||

        "tiruchirappalli";



    /* HANDLE CLICK */

    const handleCategoryClick = (category) => {

        const categorySlug =
            createSlug(category);


        /* NAVIGATE USING CORRECT ROUTE */

        navigate(`/${districtSlug}/${categorySlug}`);

    };



    return (

        <div className="popular-categories-container-text">

            <h2 className="popular-categories-heading-text">

                Popular Search

            </h2>


            <div className="search-links-wrapper">

                {popularSearches.map((link, index) => (

                    <React.Fragment key={index}>

                        <a
                            href="#"
                            onClick={(e) => {

                                e.preventDefault();

                                handleCategoryClick(link);

                            }}
                            className="search-link"
                            title={`Search for ${link}`}
                        >

                            {link}

                        </a>


                        {index < popularSearches.length - 1 && (

                            <span className="link-separator">

                                {" | "}

                            </span>

                        )}

                    </React.Fragment>

                ))}

            </div>

        </div>

    );

};


export default PopularCategories;
