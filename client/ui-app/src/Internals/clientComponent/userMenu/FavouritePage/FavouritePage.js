import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import RefreshIcon from "@mui/icons-material/Refresh";
import CardsSearch from "../../CardsSearch/CardsSearch";
import Footer from "../../footer/footer";
import Cards from "../../cards/cards";
import { fetchFavorites, getAuthUser } from "../../../../redux/actions/favoriteAction";
import styles from "./FavouritePage.module.css";
const cx = createScopedClassNames(styles);
const createSlug = (text = "") => text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
export default function FavoritesPage() {
  const dispatch = useDispatch();
  const {
    favorites,
    loading,
    error
  } = useSelector(state => state.favorites);
  const user = getAuthUser();
  const isLoggedIn = !!user?._id;
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, isLoggedIn]);
  return <>
      <CardsSearch />

      <div className={cx("fav-page")}>

        {!isLoggedIn ? <div className={cx("fav-empty")}>
            <FavoriteBorderIcon className={cx("fav-empty-icon")} />
            <h2>Login to See Your Favorites</h2>
            <p>Save businesses you love by tapping the heart icon on any listing.</p>
            <Link to="/" className={cx("fav-empty-home-btn")}>Go to Home</Link>
          </div> : <>
            <div className={cx("fav-page-header")}>
              <h1 className={cx("fav-page-title")}>
                <FavoriteIcon className={cx("fav-page-title-icon")} />
                My Favorites
                {!loading && favorites.length > 0 && <span className={cx("fav-page-count")}>{favorites.length}</span>}
              </h1>
              <button className={cx("fav-refresh-btn")} onClick={() => dispatch(fetchFavorites())}>
                <RefreshIcon style={{
              fontSize: 18
            }} />
                Refresh
              </button>
            </div>

            {loading && <div className={cx("fav-loading")}>
                <div className={cx("fav-spinner")} />
                <p>Loading your favorites...</p>
              </div>}

            {!loading && error && <div className={cx("fav-error")}>
                <p>Failed to load favorites. Please try again.</p>
                <button className={cx("fav-error-btn")} onClick={() => dispatch(fetchFavorites())}>
                  Retry
                </button>
              </div>}

            {!loading && !error && favorites.length === 0 && <div className={cx("fav-empty")}>
                <FavoriteBorderIcon className={cx("fav-empty-icon")} />
                <h2>No Favorites Yet</h2>
                <p>Tap the heart on any business to save it here.</p>
                <Link to="/" className={cx("fav-empty-home-btn")}>Browse Businesses</Link>
              </div>}

            {!loading && favorites.length > 0 && <div className={cx("fav-list")}>
                {favorites.map((business, index) => {
            const loc = createSlug(business.location || "");
            const name = createSlug(business.businessName || "");
            const businessUrl = `/business/${loc}/${name}/${business._id}`;
            const averageRating = Number(business.averageRating);
            const rating = Number.isFinite(averageRating) && averageRating > 0 ? averageRating : null;
            return <Cards key={business._id} businessId={business._id} index={index} title={business.businessName} phone={business.contact} whatsappNumber={business.whatsappNumber || business.contact} address={business.globalAddress || business.location} details={business.description} imageSrc={business.bannerImage || ""} rating={rating} reviews={business.totalReviews || 0} category={business.category} to={businessUrl} state={{
              id: business._id
            }} />;
          })}
              </div>}
          </>}

      </div>

      <Footer />
    </>;
}
