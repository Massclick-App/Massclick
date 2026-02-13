import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import "./acService.css";

import CardDesign from "../../cards/cards.js";
import CardsSearch from "../../../clientComponent/CardsSearch/CardsSearch.js";
import TopBannerAds from "../../../clientComponent/banners/topBanner/topBanner.js";

import { getBusinessByCategory } from "../../../../redux/actions/businessListAction.js";

const CATEGORY = "AC Service";

const createSlug = (text) => {
  if (typeof text !== "string" || !text.trim()) return "unknown";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const ACServiceCards = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { categoryBusinessList = {}, loading, error } = useSelector(
    (state) => state.businessListReducer
  );

  const acServiceList = categoryBusinessList[CATEGORY] || [];

  const { selectedDistrict } = useSelector(
    (state) => state.locationReducer
  );

  const district = selectedDistrict;

  useEffect(() => {
    if (typeof district === "string" && district.trim().length > 0) {
      dispatch(getBusinessByCategory(CATEGORY, district.trim()));
    }
  }, [dispatch, district]);


  const handleRetry = useCallback(() => {
    if (district) {
      dispatch(getBusinessByCategory(CATEGORY, district));
    }
  }, [dispatch, district]);

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

      <TopBannerAds category={CATEGORY} />

      {loading && (
        <p className="loading-text">Loading Ac Services...</p>
      )}

      {!loading && acServiceList.length === 0 && (
        <div className="no-results-container">
          <p className="no-results-title">No AC Services Found 😔</p>
          <p className="no-results-suggestion">
            We don’t have ac services listed right now.
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
        {acServiceList.map((business) => {
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

export default ACServiceCards;
