import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import Bangalore from "../../../assets/toptourist/bangalore.webp";
import Chennai from "../../../assets/toptourist/chennai.webp";
import Hyderabad from "../../../assets/toptourist/hyderabad.webp";
import Ooty from "../../../assets/toptourist/ooty.webp";
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import styles from "./topTourist.module.css";
import { fetchTopTouristPlaces } from '../../../redux/actions/categoryAction';
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
const cx = createScopedClassNames(styles);
const staticFallbackMap = {
  Ooty: Ooty,
  Bangalore: Bangalore,
  Chennai: Chennai,
  Hyderabad: Hyderabad
};
const createSlug = (text = "") => String(text).toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const getLocationName = selectedDistrict => {
  if (typeof selectedDistrict === "string") return selectedDistrict;
  if (selectedDistrict?.name) return selectedDistrict.name;
  if (selectedDistrict?.district) return selectedDistrict.district;
  if (selectedDistrict?.label) return selectedDistrict.label;
  return localStorage.getItem("selectedLocation") || "Global";
};
const getTouristCategoryName = place => {
  const configuredCategory = place.categoryName || place.category || place.searchName;
  if (configuredCategory) return configuredCategory;
  const placeName = String(place.name || "").trim();
  if (!placeName) return "";
  return /tourist\s+places/i.test(placeName) ? placeName : `${placeName} tourist places`;
};
const TopTourist = () => {
  const carouselRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const topTouristPlaces = useSelector(state => state.categoryReducer.topTouristPlaces || []);
  const selectedDistrict = useSelector(state => state.locationReducer.selectedDistrict);
  useEffect(() => {
    dispatch(fetchTopTouristPlaces());
  }, [dispatch]);
  const scrollRight = () => {
    carouselRef.current?.scrollBy({
      left: 320,
      behavior: "smooth"
    });
  };
  const scrollLeft = () => {
    carouselRef.current?.scrollBy({
      left: -320,
      behavior: "smooth"
    });
  };
  const handlePlaceClick = (event, place) => {
    event.preventDefault();
    const categoryName = getTouristCategoryName(place);
    const locationName = getLocationName(selectedDistrict);
    if (!categoryName) return;
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    dispatch(logSearchActivity(categoryName, locationName, userDetails, categoryName, true));
    navigateToSearchResult({
      searchTerm: categoryName,
      location: locationName,
      navigate,
      dispatch,
      isKnownCategory: true,
      logAlreadySent: true,
      userDetails
    });
  };
  return <div className={cx("tourist-section")}>

      <div className={cx("tourist-header")}>
        <div>
          <h2 className={cx("tourist-title")}>Top Tourist Places</h2>
          <p className={cx("tourist-subtitle")}>Explore India’s most visited & loved destinations</p>
        </div>

        <div className={cx("tourist-controls")}>
          <button className={cx("tourist-arrow")} onClick={scrollLeft}>
            <KeyboardDoubleArrowLeftIcon />
          </button>
          <button className={cx("tourist-arrow")} onClick={scrollRight}>
            <KeyboardDoubleArrowRightIcon />
          </button>
        </div>
      </div>

      <div className={cx("tourist-carousel-wrapper")}>
        {/* <div className="tourist-fade-left"></div> */}
        {/* <div className="tourist-fade-right"></div> */}

        <div className={cx("tourist-carousel")} ref={carouselRef}>
          {topTouristPlaces.map((place, index) => {
          const imgSrc = place.imageUrl || staticFallbackMap[place.name] || null;
          const categoryName = getTouristCategoryName(place);
          const locationName = getLocationName(selectedDistrict);
          const href = place.path || `/${createSlug(locationName)}/${createSlug(categoryName)}`;
          return <Link key={index} to={href} className={cx("tourist-card")} onClick={event => handlePlaceClick(event, place)}>
                {imgSrc && <div className={cx("tourist-img-wrapper")}>
                    <img src={imgSrc} alt={place.alt} className={cx("tourist-img")} />
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
      </div>

    </div>;
};
export default TopTourist;
