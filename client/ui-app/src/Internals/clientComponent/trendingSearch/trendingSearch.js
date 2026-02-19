import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { getTrendingCategories } from "../../../redux/actions/businessListAction";

import "./trendingSearch.css";


/* ============================= */
/* CREATE SLUG */
/* ============================= */

const createSlug = (text) => {

  if (!text) return "unknown";

  if (typeof text === "object") {

    text =
      text.slug ||
      text.name ||
      text.categoryName ||
      "";

  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

};



const TrendingSearchesCarousel = () => {

  const carouselRef = useRef(null);

  const dispatch = useDispatch();


  const { trendingList = [] } =
    useSelector(
      (state) => state.businessListReducer
    );


  const { selectedDistrict } =
    useSelector(
      (state) => state.locationReducer
    );




  const districtSlug =

    selectedDistrict?.slug ||

    createSlug(selectedDistrict) ||

    localStorage.getItem("selectedDistrictSlug") ||

    "tiruchirappalli";



  useEffect(() => {

    dispatch(getTrendingCategories());

  }, [dispatch]);



  const scrollAmount = 280;


  const scrollRight = () => {

    carouselRef.current?.scrollBy({

      left: scrollAmount,

      behavior: "smooth"

    });

  };


  const scrollLeft = () => {

    carouselRef.current?.scrollBy({

      left: -scrollAmount,

      behavior: "smooth"

    });

  };



  return (

    <section className="trending-search">

      <div className="trending-search__inner">


        <div className="trending-search__header">

          <div>

            <h2 className="trending-search__title">

              Trending Searches Near You

            </h2>


            <p className="trending-search__subtitle">

              Discover what people around you are searching for right now.

            </p>

          </div>

        </div>



        <div className="trending-search__controls">


          <button
            className="trending-search__control trending-search__control--left"
            onClick={scrollLeft}
          >

            <KeyboardDoubleArrowLeftIcon />

          </button>


          <button
            className="trending-search__control trending-search__control--right"
            onClick={scrollRight}
          >

            <KeyboardDoubleArrowRightIcon />

          </button>

        </div>



        <div className="trending-search__viewport">

          <div className="trending-search__fade trending-search__fade--left" />

          <div className="trending-search__fade trending-search__fade--right" />


          <div
            className="trending-search__track"
            ref={carouselRef}
          >

            {trendingList.map((service, index) => {

              const categorySlug =
                createSlug(service.categoryName);


              return (

                <Link
                  key={index}
                  to={`/${districtSlug}/${categorySlug}`}
                  className="trending-search__card"
                >

                  <div className="trending-search__card-image-wrapper">

                    <img
                      src={service.categoryImage}
                      alt={service.categoryName}
                      className="trending-search__card-image"
                    />

                  </div>



                  <div className="trending-search__card-body">

                    <p className="trending-search__card-title">

                      {service.categoryName}

                    </p>


                    <div className="trending-search__card-cta">

                      <span>Explore</span>

                      <ChevronRightIcon />

                    </div>

                  </div>

                </Link>

              );

            })}

          </div>

        </div>

      </div>

    </section>

  );

};


export default TrendingSearchesCarousel;
