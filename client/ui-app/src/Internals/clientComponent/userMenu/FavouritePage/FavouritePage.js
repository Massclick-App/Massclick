import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import RefreshIcon from "@mui/icons-material/Refresh";
import CardsSearch from "../../CardsSearch/CardsSearch";
import Footer from "../../footer/footer";
import Cards from "../../cards/cards";
import {
  fetchFavorites,
  getAuthUser,
} from "../../../../redux/actions/favoriteAction";
import "./FavouritePage.css";

const createSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export default function FavoritesPage() {
  const dispatch = useDispatch();
  const { favorites, loading, error } = useSelector((state) => state.favorites);

  const user = getAuthUser();
  const isLoggedIn = !!user?._id;

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, isLoggedIn]);

  return (
    <>
      <CardsSearch />

      <div className="fav-page">

        {!isLoggedIn ? (
          <div className="fav-empty">
            <FavoriteBorderIcon className="fav-empty-icon" />
            <h2>Login to See Your Favorites</h2>
            <p>Save businesses you love by tapping the heart icon on any listing.</p>
            <Link to="/" className="fav-empty-home-btn">Go to Home</Link>
          </div>
        ) : (
          <>
            <div className="fav-page-header">
              <h1 className="fav-page-title">
                <FavoriteIcon className="fav-page-title-icon" />
                My Favorites
                {!loading && favorites.length > 0 && (
                  <span className="fav-page-count">{favorites.length}</span>
                )}
              </h1>
              <button
                className="fav-refresh-btn"
                onClick={() => dispatch(fetchFavorites())}
              >
                <RefreshIcon style={{ fontSize: 18 }} />
                Refresh
              </button>
            </div>

            {loading && (
              <div className="fav-loading">
                <div className="fav-spinner" />
                <p>Loading your favorites...</p>
              </div>
            )}

            {!loading && error && (
              <div className="fav-error">
                <p>Failed to load favorites. Please try again.</p>
                <button
                  className="fav-error-btn"
                  onClick={() => dispatch(fetchFavorites())}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && favorites.length === 0 && (
              <div className="fav-empty">
                <FavoriteBorderIcon className="fav-empty-icon" />
                <h2>No Favorites Yet</h2>
                <p>Tap the heart on any business to save it here.</p>
                <Link to="/" className="fav-empty-home-btn">Browse Businesses</Link>
              </div>
            )}

            {!loading && favorites.length > 0 && (
              <div className="fav-list">
                {favorites.map((business, index) => {
                  const loc = createSlug(business.location || "");
                  const name = createSlug(business.businessName || "");
                  const businessUrl = `/business/${loc}/${name}/${business._id}`;
                  const rating =
                    typeof business.averageRating === "number"
                      ? business.averageRating.toFixed(1)
                      : "0.0";

                  return (
                    <Cards
                      key={business._id}
                      businessId={business._id}
                      index={index}
                      title={business.businessName}
                      phone={business.contact}
                      whatsappNumber={business.whatsappNumber || business.contact}
                      address={business.globalAddress || business.location}
                      details={business.description}
                      imageSrc={business.bannerImage || ""}
                      rating={rating}
                      reviews={business.totalReviews || 0}
                      category={business.category}
                      to={businessUrl}
                      state={{ id: business._id }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      <Footer />
    </>
  );
}
