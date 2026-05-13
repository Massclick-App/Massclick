import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  IndianRupee,
  BriefcaseBusiness,
  Clapperboard,
  Handshake,
  MapPinned,
  PackageCheck,
  ReceiptText,
  Sparkles,
  Stethoscope,
  Utensils,
  Wrench,
} from "lucide-react";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import popularCategoriesData from "./popularCategoriesData.json";
import popularCategoriesLinkSections from "./popularCategoriesLinkSections.json";
import popularCategoriesServices from "./popularCategoriesServices.json";
import "./popularCategories.css";

const createSlug = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getDistrictSlug = (selectedDistrict) => {
  if (selectedDistrict?.slug) return selectedDistrict.slug;
  if (selectedDistrict?.name) return createSlug(selectedDistrict.name);
  if (typeof selectedDistrict === "string") return createSlug(selectedDistrict);

  return localStorage.getItem("selectedDistrictSlug") || "tiruchirappalli";
};

const serviceIcons = {
  bill: ReceiptText,
  doctor: Stethoscope,
  food: Utensils,
  handshake: Handshake,
  jobs: BriefcaseBusiness,
  map: MapPinned,
  movies: Clapperboard,
  package: PackageCheck,
  realEstate: IndianRupee,
  repair: Wrench,
  spa: Sparkles,
};

const PopularCategoriesLink = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(
    popularCategoriesData[0]?.category || ""
  );

  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict
  );

  const districtSlug = useMemo(
    () => getDistrictSlug(selectedDistrict),
    [selectedDistrict]
  );

  const activeKeywords = useMemo(() => {
    return (
      popularCategoriesData.find((item) => item.category === activeCategory)
        ?.keywords || []
    );
  }, [activeCategory]);

  const handleKeywordClick = (keyword) => {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    dispatch(
      logSearchActivity(
        keyword,
        selectedDistrict || "Global",
        userDetails,
        keyword
      )
    );  

    navigate(`/${districtSlug}/${createSlug(keyword)}`, {
      state: {
        logAlreadySent: true,
        category: keyword,
        categoryName: keyword,
      },
    });
  };

  const handleServiceClick = (service) => {
    if (service.route) {
      navigate(service.route);
      return;
    }

    const categoryName = service.searchName || service.title;
    const routeSlug = service.routeSlug || createSlug(categoryName);
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };

    dispatch(
      logSearchActivity(
        categoryName,
        selectedDistrict || "Global",
        userDetails,
        categoryName
      )
    );

    navigate(`/${districtSlug}/${routeSlug}`, {
      state: {
        logAlreadySent: true,
        category: categoryName,
        categoryName,
      },
    });
  };

  if (!popularCategoriesData.length) return null;

  return (
    <section className="popular-categories-links" aria-label="Popular Categories">
      <div className="popular-categories-links__inner">
        <div className="popular-categories-links__header">
          <h2 className="popular-categories-links__title">Popular Categories</h2>
          <span className="popular-categories-links__meta">
            {activeKeywords.length} searches
          </span>
        </div>

        <div className="popular-categories-links__tabs" role="tablist">
          {popularCategoriesData.map((item) => {
            const isActive = item.category === activeCategory;

            return (
              <button
                key={item.category}
                type="button"
                className={`popular-categories-links__tab${
                  isActive ? " popular-categories-links__tab--active" : ""
                }`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(item.category)}
              >
                {item.category}
              </button>
            );
          })}
        </div>

        <div className="popular-categories-links__keywords">
          {activeKeywords.map((keyword, index) => (
            <button
              key={`${keyword}-${index}`}
              type="button"
              className="popular-categories-links__keyword"
              onClick={() => handleKeywordClick(keyword)}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      <div className="popular-categories-links__services">
        <h2 className="popular-categories-links__servicesTitle">
          Some of our services that will prove useful to you on a day-to-day basis are :
        </h2>

        <div className="popular-categories-links__servicesGrid">
          {popularCategoriesServices.map((service) => {
            const Icon = serviceIcons[service.icon] || Sparkles;

            return (
              <article
                className="popular-categories-links__service"
                key={service.title}
              >
                <button
                  type="button"
                  className="popular-categories-links__serviceHead"
                  onClick={() => handleServiceClick(service)}
                >
                  <span className="popular-categories-links__serviceIcon">
                    <Icon size={24} strokeWidth={1.7} />
                  </span>
                  <span>{service.title}</span>
                </button>

                <p className="popular-categories-links__serviceText">
                  {service.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="popular-categories-links__collections">
        {popularCategoriesLinkSections.map((section) => (
          <article
            className="popular-categories-links__collection"
            key={section.title}
          >
            <div className="popular-categories-links__collectionHeader">
              <h3 className="popular-categories-links__collectionTitle">
                {section.title}
              </h3>
              <span className="popular-categories-links__collectionCount">
                {section.keywords.length}
              </span>
            </div>

            <div className="popular-categories-links__inlineLinks">
              {section.keywords.map((keyword, index) => (
                <button
                  key={`${section.title}-${keyword}-${index}`}
                  type="button"
                  className="popular-categories-links__inlineLink"
                  onClick={() => handleKeywordClick(keyword)}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PopularCategoriesLink;
