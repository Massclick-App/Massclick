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

import './topTourist.css';
import { fetchTopTouristPlaces } from '../../../redux/actions/categoryAction';

const staticFallbackMap = {
  Ooty:      Ooty,
  Bangalore: Bangalore,
  Chennai:   Chennai,
  Hyderabad: Hyderabad,
};

const TopTourist = () => {
  const carouselRef = useRef(null);
  const dispatch = useDispatch();
  const topTouristPlaces = useSelector((state) => state.categoryReducer.topTouristPlaces || []);

  useEffect(() => {
    dispatch(fetchTopTouristPlaces());
  }, [dispatch]);

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  };

  const scrollLeft = () => {
    carouselRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  };

  return (
    <div className="tourist-section">

      <div className="tourist-header">
        <div>
          <h2 className="tourist-title">Top Tourist Places</h2>
          <p className="tourist-subtitle">Explore India’s most visited & loved destinations</p>
        </div>

        <div className="tourist-controls">
          <button className="tourist-arrow" onClick={scrollLeft}>
            <KeyboardDoubleArrowLeftIcon />
          </button>
          <button className="tourist-arrow" onClick={scrollRight}>
            <KeyboardDoubleArrowRightIcon />
          </button>
        </div>
      </div>

      <div className="tourist-carousel-wrapper">
        {/* <div className="tourist-fade-left"></div> */}
        {/* <div className="tourist-fade-right"></div> */}

        <div className="tourist-carousel" ref={carouselRef}>
          {topTouristPlaces.map((place, index) => {
            const imgSrc = place.imageUrl || staticFallbackMap[place.name] || null;
            return (
              <Link key={index} to={place.path} className="tourist-card">
                {imgSrc && (
                  <div className="tourist-img-wrapper">
                    <img src={imgSrc} alt={place.alt} className="tourist-img" />
                  </div>
                )}
                <div className="tourist-info">
                  <p className="tourist-name">{place.name}</p>
                  <div className="tourist-explore">
                    Explore <ChevronRightIcon />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default TopTourist;
