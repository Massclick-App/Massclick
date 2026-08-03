import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Skeleton } from "@mui/material";
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
import { navigateToSearchResult, getEffectiveSearchLocation } from "../../../utils/searchResultNavigation";
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
  spa: Sparkles,
};

const PopularCategoriesSkeleton = () => (
  <section className={cx("popular-categories-links")} aria-hidden="true">
    <div className={cx("popular-categories-links__inner")}>
      <div className={cx("popular-categories-links__header")}>
        <Skeleton variant="rounded" width={220} height={28} />
        <Skeleton variant="rounded" width={96} height={28} />
      </div>

      <div className={cx("popular-categories-links__tabs")}>
        {[...Array(4)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={36}
            sx={{ borderRadius: "6px" }}
          />
        ))}
      </div>

      <div className={cx("popular-categories-links__keywords")}>
        {[...Array(8)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            width={index % 3 === 0 ? 160 : 120}
            height={32}
            sx={{ borderRadius: 999 }}
          />
        ))}
      </div>
    </div>

    <div className={cx("popular-categories-links__collections")}>
      {[...Array(3)].map((_, sectionIndex) => (
        <article
          className={cx("popular-categories-links__collection")}
          key={sectionIndex}
        >
          <div className={cx("popular-categories-links__collectionHeader")}>
            <Skeleton variant="rounded" width={180} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 10px",
            }}
          >
            {[...Array(10)].map((__, keywordIndex) => (
              <Skeleton
                key={keywordIndex}
                variant="rounded"
                width={keywordIndex % 4 === 0 ? 120 : 88}
                height={28}
                sx={{ borderRadius: 999 }}
              />
            ))}
          </Box>
        </article>
      ))}
    </div>

    <div className={cx("popular-categories-links__services")}>
      <Skeleton
        variant="rounded"
        width={360}
        height={28}
        sx={{ mb: 3 }}
      />
      <div className={cx("popular-categories-links__servicesGrid")}>
        {[...Array(4)].map((_, serviceIndex) => (
          <article
            className={cx("popular-categories-links__service")}
            key={serviceIndex}
          >
            <Skeleton
              variant="circular"
              width={26}
              height={26}
              sx={{ mb: 1.5 }}
            />
            <Skeleton
              variant="rounded"
              width="70%"
              height={22}
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant="rounded"
              width="92%"
              height={14}
              sx={{ mb: 0.75 }}
            />
            <Skeleton variant="rounded" width="88%" height={14} />
          </article>
        ))}
      </div>
    </div>
  </section>
);
const PopularCategoriesLink = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    tabs = [],
    services: popularCategoriesServices = [],
    linkSections: popularCategoriesLinkSections = [],
  } = useSelector(
    (state) => state.categoryReducer.popularCategoryContent || {},
  );
  const [activeCategory, setActiveCategory] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setIsLoadingContent(true);
    dispatch(fetchPopularCategoryContent())
      .finally(() => {
        if (!cancelled) {
          setIsLoadingContent(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
  useEffect(() => {
    if (tabs.length > 0 && !activeCategory) {
      setActiveCategory(tabs[0].category);
    }
  }, [tabs, activeCategory]);
  const selectedDistrict = useSelector(
    (state) => state.locationReducer.selectedDistrict,
  );
  const activeKeywords = useMemo(() => {
    return (
      tabs.find((item) => item.category === activeCategory)?.keywords || []
    );
  }, [activeCategory, tabs]);
  const handleKeywordClick = (keyword) => {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email,
    };
    // Navigate to the specific location the user picked (falls back to the
    // selected district only when the location field is empty).
    const { location, masterLocationSlug } = getEffectiveSearchLocation(selectedDistrict);
    navigateToSearchResult({
      searchTerm: keyword,
      location,
      masterLocationSlug,
      navigate,
      dispatch,
      isKnownCategory: false,
      // Popular keyword chip - flexible term search
      logAlreadySent: false,
      userDetails,
    });
  };
  const handleServiceClick = (service) => {
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
      email: authUser?.email,
    };
    // Navigate to the specific location the user picked (falls back to the
    // selected district only when the location field is empty).
    const { location, masterLocationSlug } = getEffectiveSearchLocation(selectedDistrict);
    navigateToSearchResult({
      searchTerm: categoryName,
      location,
      masterLocationSlug,
      navigate,
      dispatch,
      isKnownCategory: true,
      logAlreadySent: false,
      userDetails,
    });
  };
  if (isLoadingContent && !tabs.length && !popularCategoriesServices.length && !popularCategoriesLinkSections.length) {
    return <PopularCategoriesSkeleton />;
  }

  if (!tabs.length && !popularCategoriesServices.length && !popularCategoriesLinkSections.length) return null;
  return (
    <section
      className={cx("popular-categories-links")}
      aria-label="Popular Categories"
    >
      <div className={cx("popular-categories-links__inner")}>
        <div className={cx("popular-categories-links__header")}>
          <h2 className={cx("popular-categories-links__title")}>
            Popular Categories
          </h2>
          <span className={cx("popular-categories-links__meta")}>
            {activeKeywords.length} searches
          </span>
        </div>

        <div className={cx("popular-categories-links__tabs")} role="tablist">
          {tabs.map((item, index) => {
            const isActive = item.category === activeCategory;
            return (
              <button
                key={`${item.category}-${index}`}
                type="button"
                className={cx(
                  `popular-categories-links__tab${isActive ? " popular-categories-links__tab--active" : ""}`,
                )}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(item.category)}
              >
                {item.category}
              </button>
            );
          })}
        </div>

        <div className={cx("popular-categories-links__keywords")}>
          {activeKeywords.map((keyword, index) => (
            <button
              key={`${activeCategory}-${keyword}-${index}`}
              type="button"
              className={cx("popular-categories-links__keyword")}
              onClick={() => handleKeywordClick(keyword)}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      <div className={cx("popular-categories-links__services")}>
        <h2 className={cx("popular-categories-links__servicesTitle")}>
          Some of our services that will prove useful to you on a day-to-day
          basis are :
        </h2>

        <div className={cx("popular-categories-links__servicesGrid")}>
          {popularCategoriesServices.map((service, index) => {
            const Icon = serviceIcons[service.icon] || Sparkles;
            return (
              <article
                className={cx("popular-categories-links__service")}
                key={service._id || `${service.title}-${index}`}
              >
                <button
                  type="button"
                  className={cx("popular-categories-links__serviceHead")}
                  onClick={() => handleServiceClick(service)}
                >
                  <span className={cx("popular-categories-links__serviceIcon")}>
                    <Icon size={24} strokeWidth={1.7} />
                  </span>
                  <span>{service.title}</span>
                </button>

                <p className={cx("popular-categories-links__serviceText")}>
                  {service.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className={cx("popular-categories-links__collections")}>
        {popularCategoriesLinkSections.map((section, sectionIndex) => (
          <article
            className={cx("popular-categories-links__collection")}
            key={`${section.title}-${sectionIndex}`}
          >
            <div className={cx("popular-categories-links__collectionHeader")}>
              <h3 className={cx("popular-categories-links__collectionTitle")}>
                {section.title}
              </h3>
              <span className={cx("popular-categories-links__collectionCount")}>
                {section.keywords.length}
              </span>
            </div>

            <div className={cx("popular-categories-links__inlineLinks")}>
              {section.keywords.map((keyword, keywordIndex) => (
                <button
                  key={`${section.title}-${keyword}-${keywordIndex}`}
                  type="button"
                  className={cx("popular-categories-links__inlineLink")}
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
