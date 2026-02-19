import React, { useRef } from 'react';
import { Link } from "react-router-dom";

import Bangalore from "../../../assets/TopTourist/Bangalore.webp";
import Chennai from "../../../assets/TopTourist/Chennai.webp";
import Hyderabad from "../../../assets/TopTourist/Hyderabad.webp";
import Ooty from "../../../assets/TopTourist/Ooty.webp";

import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import './topTourist.css';

const trendingServices = [
  { id: 1, name: "Ooty", image: Ooty, alt: "Ooty Hills", path: "/trending/ooty" },
  { id: 2, name: "Bangalore", image: Bangalore, alt: "Bangalore City", path: "/trending/bangalore" },
  { id: 3, name: "Chennai", image: Chennai, alt: "Chennai City", path: "/trending/chennai" },
  { id: 4, name: "Hyderabad", image: Hyderabad, alt: "Hyderabad City", path: "/trending/hyderabad" },
];

const TopTourist = () => {
  const carouselRef = useRef(null);

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
        <div className="tourist-fade-left"></div>
        <div className="tourist-fade-right"></div>

        <div className="tourist-carousel" ref={carouselRef}>
          {trendingServices.map((service) => (
            <Link key={service.id} to={service.path} className="tourist-card">

              <div className="tourist-img-wrapper">
                <img src={service.image} alt={service.alt} className="tourist-img" />
              </div>

              <div className="tourist-info">
                <p className="tourist-name">{service.name}</p>
                <div className="tourist-explore">
                  Explore <ChevronRightIcon />
                </div>
              </div>

            </Link>
          ))}
        </div>
      </div>

    </div>
  );
};

export default TopTourist;
