import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import styles from "features/public/top-tourist/topTourist.module.css";
import { fetchTopTouristPlaces } from 'state/actions/categoryAction.js';
import { navigateToSearchResult } from "shared/utils/searchResultNavigation.js";
const cx = createScopedClassNames(styles);
// Fixed search term, same as mobile (home_top_tourist.dart) — a tap here
// does not search the currently selected district; it scopes the search to
// the tapped place itself (used as `location`, not baked into the term).
const TOURIST_SEARCH_TERM = "tourist places";
const TopTourist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const topTouristPlaces = useSelector(state => state.categoryReducer.topTouristPlaces || []);
  useEffect(() => {
    dispatch(fetchTopTouristPlaces());
  }, [dispatch]);
  const handlePlaceClick = (event, place) => {
    event.preventDefault();
    const location = String(place.name || "").trim();
    if (!location) return;
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    navigateToSearchResult({
      searchTerm: TOURIST_SEARCH_TERM,
      location,
      navigate,
      dispatch,
      isKnownCategory: false,
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
          // SEO anchor only — handlePlaceClick preventDefault()s and always
          // navigates via the search flow instead.
          const href = place.path || "/";
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
