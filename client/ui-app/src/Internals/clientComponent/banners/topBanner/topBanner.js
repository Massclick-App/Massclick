import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAdvertisementByCategory } from "../../../../redux/actions/advertisementAction";
import "./topBanner.css";
import defaultBanner from "../../../../assets/new_banner.webp";

const SLIDE_INTERVAL = 2000;

const parseDate = (date) => {
  if (!date) return null;

  if (typeof date === "string") {
    return new Date(date);
  }

  if (typeof date === "object" && date.$date) {
    return new Date(date.$date);
  }
  return null;
};

const normalizeCategory = (value = "") =>
  value.toString().trim().toLowerCase().replace(/[^a-z]/g, "");

const TopBannerAds = ({ category }) => {

  const dispatch = useDispatch();

  useEffect(() => {
    if (category) {
      dispatch(getAdvertisementByCategory(category));
    }
  }, [dispatch, category]);

  const { categoryAdvertisements = [], loading } = useSelector(
    (state) => state.advertisement || {}
  );

  const DEFAULT_BANNER = {
    _id: "default-banner",
    title: "Default Banner",
    redirectUrl: null,
    image: defaultBanner,
    isDefault: true
  };

  const bannerAds = useMemo(() => {

    if (!category) {
      return [DEFAULT_BANNER];
    }

    const nowTime = Date.now();

    const apiBanners = categoryAdvertisements
      .filter((ad) => {

        const start = parseDate(ad.startTime);
        const end = parseDate(ad.endTime);

        if (!start || !end) return false;

        if (nowTime < start.getTime() || nowTime > end.getTime()) {
          return false;
        }

        const imageKey = ad.bannerImageKey;

        return (
          ad.isActive &&
          !ad.isDeleted &&
          ad.position === "TOP_BANNER" &&
          normalizeCategory(ad.category) === normalizeCategory(category) &&
          imageKey
        );
      })
      .map((ad) => {

        const baseUrl =
          `https://massclickdev.s3.ap-southeast-2.amazonaws.com/${ad.bannerImageKey}`;

        return {
          ...ad,
          image: baseUrl
        };
      });

    return [DEFAULT_BANNER, ...apiBanners];

  }, [categoryAdvertisements, category]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {

    if (bannerAds.length <= 1) return;

    const timer = setInterval(() => {

      setCurrentIndex((prev) => {

        if (prev === bannerAds.length - 1) {
          return 0;
        }

        return prev + 1;

      });

    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);

  }, [bannerAds.length]);

  if (loading) {
    return null;
  }

  return (
    <div className="top-banner-carousel">

      <div
        className="carousel-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: "transform 0.5s ease-in-out"
        }}
      >

        {bannerAds.map((ad) => (

          <a
            key={ad._id}
            href={ad.redirectUrl || "#"}
            target={ad.redirectUrl ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="carousel-slide"
          >

            <div className="banner-image-wrapper">

              <img
                src={ad.image}
                alt={ad.title || "Top banner"}
                width="1200"
                height="400"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "cover"
                }}
              />

            </div>

          </a>

        ))}

      </div>

    </div>
  );
};

export default TopBannerAds;