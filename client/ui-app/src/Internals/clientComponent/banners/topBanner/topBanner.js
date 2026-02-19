import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAdvertisementByCategory } from "../../../../redux/actions/advertisementAction";
import "./topBanner.css";
import defaultBanner from "../../../../assets/new_banner.webp";

const SLIDE_INTERVAL = 2000; 
const DEFAULT_DELAY = 0; 

const parseDate = (date) => {
  if (!date) return null;
  if (typeof date === "string") return new Date(date);
  if (typeof date === "object" && date.$date) return new Date(date.$date);
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
    imageWebp: defaultBanner,
    isDefault: true,
  };

  const bannerAds = useMemo(() => {
    if (!category) return [DEFAULT_BANNER];

    const nowTime = Date.now();

    const apiBanners = categoryAdvertisements
      .filter((ad) => {
        const start = parseDate(ad.startTime);
        const end = parseDate(ad.endTime);

        if (!start || !end) return false;
        if (nowTime < start.getTime() || nowTime > end.getTime()) return false;

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
          image: baseUrl,
          imageWebp: baseUrl.endsWith(".webp")
            ? baseUrl
            : baseUrl.replace(/\.(jpg|jpeg|png)$/i, ".webp"),
        };
      });


    return [DEFAULT_BANNER, ...apiBanners];
  }, [categoryAdvertisements, category]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (bannerAds.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === bannerAds.length - 1 ? 0 : prev + 1
      );
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [bannerAds.length]);

  if (loading || bannerAds.length === 0) return null;

  return (
    <div className="top-banner-carousel">
      <div
        className="carousel-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: "transform 0.5s ease-in-out",
        }}
      >
        {bannerAds.map((ad, index) => (
          <a
            key={ad._id}
            href={ad.redirectUrl || "#"}
            target={ad.redirectUrl ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="carousel-slide"
          >
            <div className="banner-image-wrapper">
              <picture>

                {ad.imageWebp && (
                  <source
                    srcSet={ad.imageWebp}
                    type="image/webp"
                  />
                )}

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

              </picture>

            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default TopBannerAds;
