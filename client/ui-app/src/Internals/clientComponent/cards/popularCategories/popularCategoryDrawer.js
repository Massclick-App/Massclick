import React, { useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import "./popularCategories.css";

import CardsSearch from "../../CardsSearch/CardsSearch";
import CardDesign from "../cards";
import TopBannerAds from "../../banners/topBanner/topBanner";

import { getBusinessByCategory } from "../../../../redux/actions/businessListAction";


/* ========================================= */
/* SLUG → NORMAL TEXT CONVERTER */
/* tiruchirappalli → Tiruchirappalli */
/* beauty-parlour → Beauty Parlour */
/* ========================================= */
const unslugify = (text) => {
  if (!text) return "";

  return text
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};


/* ========================================= */
/* NORMAL TEXT → SLUG */
/* Tiruchirappalli → tiruchirappalli */
/* ========================================= */
const createSlug = (text) => {
  if (!text || typeof text !== "string") return "unknown";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};


const CategoryDynamicPage = () => {

  /* ========================================= */
  /* GET PARAMS FROM URL */
  /* URL example: /tiruchirappalli/restaurants */
  /* ========================================= */
  const { district, categorySlug } = useParams();

  const location = useLocation();

  const dispatch = useDispatch();
  const navigate = useNavigate();


  /* ========================================= */
  /* CONVERT SLUG TO REAL NAMES */
  /* ========================================= */
  const realDistrict =
    unslugify(district);

  const realCategoryName =
    location.state?.categoryName ||
    unslugify(categorySlug);



  const {
    categoryBusinessList = {},
    loading,
    error
  } = useSelector((state) => state.businessListReducer);



  const businessList =
    categoryBusinessList[realCategoryName] || [];



  useEffect(() => {

    if (realDistrict && realCategoryName) {

      dispatch(
        getBusinessByCategory(
          realCategoryName,
          realDistrict
        )
      );

    }

  }, [dispatch, realDistrict, realCategoryName]);


  const handleRetry = useCallback(() => {

    dispatch(
      getBusinessByCategory(
        realCategoryName,
        realDistrict
      )
    );

  }, [dispatch, realDistrict, realCategoryName]);



  if (error && !businessList.length) {

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


      <TopBannerAds category={realCategoryName} />


      {loading && (

        <p className="loading-text">

          Loading {realCategoryName} in {realDistrict}...

        </p>

      )}


      {!loading && businessList.length === 0 && (

        <div className="no-results-container">

          <p className="no-results-title">

            No {realCategoryName} Found in {realDistrict} 😔

          </p>

          <p className="no-results-suggestion">

            We don’t have businesses listed under this category right now.

          </p>

          <button
            className="go-home-button"
            onClick={() => navigate("/")}
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


          const businessUrl =
            `/${createSlug(realDistrict)}/${createSlug(business.businessName)}/${business._id}`;


          return (

            <CardDesign

              key={business._id}

              businessId={business._id}

              title={business.businessName}

              phone={business.contact}

              whatsapp={business.whatsappNumber}

              address={business.location}

              details={`Experience: ${business.experience} | Category: ${business.category}`}

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


export default CategoryDynamicPage;
