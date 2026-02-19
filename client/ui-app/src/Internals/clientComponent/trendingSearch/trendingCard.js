import React, { useEffect, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import { useNavigate, useParams } from "react-router-dom";


import "./trendingCard.css";


import CardDesign from "../../clientComponent/cards/cards.js";

import CardsSearch from "../../clientComponent/CardsSearch/CardsSearch.js";

import TopBannerAds from "../../clientComponent/banners/topBanner/topBanner.js";


import { getBusinessByCategory }
from "../../../redux/actions/businessListAction.js";


const createSlug = (text) => {

  if (!text) return "unknown";

  if (typeof text === "object") {

    text =
      text.slug ||
      text.name ||
      text.location ||
      "";

  }

  if (typeof text !== "string") return "unknown";


  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

};






const TrendingCards = () => {


  const dispatch = useDispatch();

  const navigate = useNavigate();



  const { categorySlug } = useParams();


  const CATEGORY =
    createSlug(categorySlug);




  const { selectedDistrict } =
    useSelector((state) => state.locationReducer);



  const districtSlug =

    selectedDistrict?.slug ||

    createSlug(selectedDistrict) ||

    localStorage.getItem("selectedDistrictSlug") ||

    "tiruchirappalli";




  const {
    categoryBusinessList = {},
    loading,
    error

  } = useSelector(

    (state) => state.businessListReducer

  );



  const businessList =
    categoryBusinessList[CATEGORY] || [];




  useEffect(() => {

    if (CATEGORY && districtSlug) {

      dispatch(
        getBusinessByCategory(
          CATEGORY,
          districtSlug
        )
      );

    }

  }, [

    dispatch,
    CATEGORY,
    districtSlug

  ]);





  const handleRetry =
    useCallback(() => {

      if (CATEGORY && districtSlug) {

        dispatch(
          getBusinessByCategory(
            CATEGORY,
            districtSlug
          )
        );

      }

    }, [

      dispatch,
      CATEGORY,
      districtSlug

    ]);




  if (error) {

    return (

      <div className="no-results-container">

        <p className="no-results-title">

          Something went wrong 😕

        </p>


        <p className="no-results-suggestion">

          Please try again later.

        </p>


        <button
          className="go-home-button"
          onClick={handleRetry}
        >

          Retry

        </button>

      </div>

    );

  }



  return (

    <>

      <CardsSearch />


      <div className="page-spacing" />


      <TopBannerAds category={CATEGORY} />


      {loading && (

        <p className="loading-text">

          Loading {CATEGORY}...

        </p>

      )}



      {!loading && businessList.length === 0 && (

        <div className="no-results-container">

          <p className="no-results-title">

            No {CATEGORY} Found 😔

          </p>


          <button
            className="go-home-button"
            onClick={() => navigate("/home")}
          >

            Go to Homepage

          </button>

        </div>

      )}



      <div className="restaurants-list-wrapper">

        {businessList.map((business) => {


          const averageRating =
            typeof business.averageRating === "number"
              ? business.averageRating.toFixed(1)
              : "0.0";


          const totalRatings =
            typeof business.totalReviews === "number"
              ? business.totalReviews
              : 0;



          const locationSlug =
            createSlug(business.location);



          const businessSlug =
            createSlug(
              `${business.businessName}-${business.street}`
            );



          const businessUrl =
            `/${locationSlug}/${businessSlug}/${business._id}`;



          return (

            <CardDesign
              key={business._id}

              title={business.businessName}

              phone={business.contact}

              whatsapp={business.whatsappNumber}

              address={business.location}

              details={
                `Experience: ${business.experience}
                | Category: ${business.category}`
              }

              imageSrc={
                business.bannerImage ||
                "https://via.placeholder.com/120x100?text=Logo"
              }

              rating={averageRating}

              reviews={totalRatings}

              to={businessUrl}

              state={{ id: business._id }}

            />

          );

        })}

      </div>

    </>

  );

};



export default TrendingCards;
