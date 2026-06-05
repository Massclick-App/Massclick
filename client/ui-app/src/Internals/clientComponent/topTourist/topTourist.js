import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useRef, useEffect } from 'react';
import { Link } from "react-router-dom";
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
const cx = createScopedClassNames(styles);
const staticFallbackMap = {
  Ooty: Ooty,
  Bangalore: Bangalore,
  Chennai: Chennai,
  Hyderabad: Hyderabad
};
const TopTourist = () => {
  const carouselRef = useRef(null);
  const dispatch = useDispatch();
  const topTouristPlaces = useSelector(state => state.categoryReducer.topTouristPlaces || []);
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
          return <Link key={index} to={place.path} className={cx("tourist-card")}>
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
