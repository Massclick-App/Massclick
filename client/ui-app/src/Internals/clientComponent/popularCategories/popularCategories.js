import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IndianRupee, BriefcaseBusiness, Clapperboard, Handshake, MapPinned, PackageCheck, ReceiptText, Sparkles, Stethoscope, Utensils, Wrench } from "lucide-react";
import { logSearchActivity } from "../../../redux/actions/businessListAction";
import { navigateToSearchResult } from "../../../utils/searchResultNavigation";
import { fetchPopularCategoryContent } from "../../../redux/actions/categoryAction";
import styles from "./popularCategories.module.css";
const cx = createScopedClassNames(styles);
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
  spa: Sparkles
};
const PopularCategoriesLink = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    tabs = [],
    services: popularCategoriesServices = [],
    linkSections: popularCategoriesLinkSections = []
  } = useSelector(state => state.categoryReducer.popularCategoryContent || {});
  const [activeCategory, setActiveCategory] = useState("");
  useEffect(() => {
    dispatch(fetchPopularCategoryContent());
  }, [dispatch]);
  useEffect(() => {
    if (tabs.length > 0 && !activeCategory) {
      setActiveCategory(tabs[0].category);
    }
  }, [tabs, activeCategory]);
  const selectedDistrict = useSelector(state => state.locationReducer.selectedDistrict);
  const activeKeywords = useMemo(() => {
    return tabs.find(item => item.category === activeCategory)?.keywords || [];
  }, [activeCategory, tabs]);
  const handleKeywordClick = keyword => {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    dispatch(logSearchActivity(keyword, selectedDistrict || "Global", userDetails, keyword));
    navigateToSearchResult({
      searchTerm: keyword,
      location: selectedDistrict || "Global",
      navigate,
      dispatch,
      isKnownCategory: false,
      // Popular category - known category
      logAlreadySent: true,
      userDetails
    });
  };
  const handleServiceClick = service => {
    if (service.route) {
      navigate(service.route);
      return;
    }
    const categoryName = service.searchName || service.title;
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    dispatch(logSearchActivity(categoryName, selectedDistrict || "Global", userDetails, categoryName));
    navigateToSearchResult({
      searchTerm: categoryName,
      location: selectedDistrict || "Global",
      navigate,
      dispatch,
      logAlreadySent: true,
      userDetails
    });
  };
  if (!tabs.length) return null;
  return <section className={cx("popular-categories-links")} aria-label="Popular Categories">
      <div className={cx("popular-categories-links__inner")}>
        <div className={cx("popular-categories-links__header")}>
          <h2 className={cx("popular-categories-links__title")}>Popular Categories</h2>
          <span className={cx("popular-categories-links__meta")}>
            {activeKeywords.length} searches
          </span>
        </div>

        <div className={cx("popular-categories-links__tabs")} role="tablist">
          {tabs.map(item => {
          const isActive = item.category === activeCategory;
          return <button key={item.category} type="button" className={cx(`popular-categories-links__tab${isActive ? " popular-categories-links__tab--active" : ""}`)} role="tab" aria-selected={isActive} onClick={() => setActiveCategory(item.category)}>
                {item.category}
              </button>;
        })}
        </div>

        <div className={cx("popular-categories-links__keywords")}>
          {activeKeywords.map(keyword => <button key={keyword} type="button" className={cx("popular-categories-links__keyword")} onClick={() => handleKeywordClick(keyword)}>
              {keyword}
            </button>)}
        </div>
      </div>

      <div className={cx("popular-categories-links__services")}>
        <h2 className={cx("popular-categories-links__servicesTitle")}>
          Some of our services that will prove useful to you on a day-to-day basis are :
        </h2>

        <div className={cx("popular-categories-links__servicesGrid")}>
          {popularCategoriesServices.map(service => {
          const Icon = serviceIcons[service.icon] || Sparkles;
          return <article className={cx("popular-categories-links__service")} key={service._id || service.title}>
                <button type="button" className={cx("popular-categories-links__serviceHead")} onClick={() => handleServiceClick(service)}>
                  <span className={cx("popular-categories-links__serviceIcon")}>
                    <Icon size={24} strokeWidth={1.7} />
                  </span>
                  <span>{service.title}</span>
                </button>

                <p className={cx("popular-categories-links__serviceText")}>
                  {service.description}
                </p>
              </article>;
        })}
        </div>
      </div>

      <div className={cx("popular-categories-links__collections")}>
        {popularCategoriesLinkSections.map(section => <article className={cx("popular-categories-links__collection")} key={section.title}>
            <div className={cx("popular-categories-links__collectionHeader")}>
              <h3 className={cx("popular-categories-links__collectionTitle")}>
                {section.title}
              </h3>
              <span className={cx("popular-categories-links__collectionCount")}>
                {section.keywords.length}
              </span>
            </div>

            <div className={cx("popular-categories-links__inlineLinks")}>
              {section.keywords.map(keyword => <button key={`${section.title}-${keyword}`} type="button" className={cx("popular-categories-links__inlineLink")} onClick={() => handleKeywordClick(keyword)}>
                  {keyword}
                </button>)}
            </div>
          </article>)}
      </div>
    </section>;
};
export default PopularCategoriesLink;
