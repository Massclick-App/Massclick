import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import styles from "./topTourist.module.css";
import { fetchTopTouristPlaces } from '../../../redux/actions/categoryAction';
import { navigateToSearchResult, getEffectiveSearchLocation } from "../../../utils/searchResultNavigation";
const cx = createScopedClassNames(styles);
const createSlug = (text = "") => String(text).toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const getTouristCategoryName = place => {
  const configuredCategory = place.categoryName || place.category || place.searchName;
  if (configuredCategory) return configuredCategory;
  const placeName = String(place.name || "").trim();
  if (!placeName) return "";
  return /tourist\s+places/i.test(placeName) ? placeName : `${placeName} tourist places`;
};
const TopTourist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const topTouristPlaces = useSelector(state => state.categoryReducer.topTouristPlaces || []);
  const selectedDistrict = useSelector(state => state.locationReducer.selectedDistrict);
  useEffect(() => {
    dispatch(fetchTopTouristPlaces());
  }, [dispatch]);
  const handlePlaceClick = (event, place) => {
    event.preventDefault();
    const categoryName = getTouristCategoryName(place);
    if (!categoryName) return;
    // Navigate to the specific location the user picked (falls back to the
    // selected district only when the location field is empty).
    const { location, masterLocationSlug } = getEffectiveSearchLocation(selectedDistrict);
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    navigateToSearchResult({
      searchTerm: categoryName,
      location,
      masterLocationSlug,
      navigate,
      dispatch,
      isKnownCategory: true,
      logAlreadySent: false,
      userDetails
    });
  };
  return <div className={cx("tourist-section")}>

      <div className={cx("tourist-header")}>
        <h2 className={cx("tourist-title")}>Top Tourist Places</h2>
        <p className={cx("tourist-subtitle")}>Explore India’s most visited & loved destinations</p>
      </div>

      <div className={cx("tourist-grid")}>
        {topTouristPlaces.map((place, index) => {
          const imgSrc = place.imageUrl || null;
          const categoryName = getTouristCategoryName(place);
          const { location: locationName } = getEffectiveSearchLocation(selectedDistrict);
          const href = place.path || `/${createSlug(locationName)}/${createSlug(categoryName)}`;
          return <Link key={index} to={href} className={cx("tourist-card")} onClick={event => handlePlaceClick(event, place)}>
                {imgSrc && <div className={cx("tourist-img-wrapper")}>
                    <img src={imgSrc} alt={place.alt} className={cx("tourist-img")} width="600" height="400" loading="lazy" decoding="async" />
                  </div>}
                <div className={cx("tourist-info")}>
                  <p className={cx("tourist-name")}>{place.name}</p>
                  <div className={cx("tourist-explore")}>
                    Explore <ChevronRightIcon />
                  </div>
                </div>
              </Link>;
        })}
      </div>

    </div>;
};
export default TopTourist;
