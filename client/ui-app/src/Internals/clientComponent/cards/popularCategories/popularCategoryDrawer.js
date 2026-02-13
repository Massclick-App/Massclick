import React, { useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import "./popularCategories.css";

import CardsSearch from "../../CardsSearch/CardsSearch";
import CardDesign from "../cards";
import TopBannerAds from "../../banners/topBanner/topBanner";

import { getBusinessByCategory } from "../../../../redux/actions/businessListAction";

const createSlug = (text) => {
  if (typeof text !== "string" || !text.trim()) return "unknown";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const CategoryDynamicPage = () => {
  const { categorySlug } = useParams();
  const { state } = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const realCategoryName =
    state?.categoryName || categorySlug.replace(/-/g, " ");

  const { categoryBusinessList = {}, loading, error } = useSelector(
    (s) => s.businessListReducer
  );

  const businessList = categoryBusinessList[realCategoryName] || [];

  const { selectedDistrict } = useSelector(
    (state) => state.locationReducer
  );

  const district = selectedDistrict;

  useEffect(() => {
    if (
      typeof district === "string" &&
      district.trim().length > 0
    ) {
      dispatch(
        getBusinessByCategory(realCategoryName, district.trim())
      );
    }
  }, [dispatch, realCategoryName, district]);

  const handleRetry = useCallback(() => {
    if (district) {
      dispatch(getBusinessByCategory(realCategoryName, district));
    }
  }, [dispatch, realCategoryName, district]);

  if (error) {
    return (
      <div className="no-results-container">
        <p className="no-results-title">Something went wrong 😕</p>
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
          Loading {realCategoryName}...
        </p>
      )}

      {!loading && businessList.length === 0 && (
        <div className="no-results-container">
          <p className="no-results-title">
            No {realCategoryName} Found 😔
          </p>
          <p className="no-results-suggestion">
            We don’t have businesses listed under this category right now.
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

          const locationSlug = createSlug(business.location);
          const businessSlug = createSlug(
            `${business.businessName}-${business.street}`
          );

          const businessUrl = `/${locationSlug}/${businessSlug}/${business._id}`;

          return (
            <CardDesign
              key={business._id}
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
