import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import HeroSection from "../clientComponent/heroSection/heroSection.js";
import CategoryBar from "../clientComponent/categoryBar";
import { viewOtpUser } from "../../redux/actions/otpAction.js";
import { fetchMatchedLeads } from "../../redux/actions/leadsAction.js";
import SeoMeta from "./seo/seoMeta";
import { fetchSeoMeta } from "../../redux/actions/seoAction";
import {
  generateWebsiteSchema,
  generateOrganizationSchema,
} from "../../utils/seoSchemaGenerators";
import { scheduleIdleCallback } from "../../utils/scheduleIdleCallback.js";
import useRenderNearViewport from "../../hooks/useRenderNearViewport.js";
import styles from "./homeLayout.module.css";
const cx = createScopedClassNames(styles);
const DEFERRED_INTERACTION_EVENTS = [
  "pointerdown",
  "touchstart",
  "keydown",
  "scroll",
];
const FeaturedServices = lazy(
  () => import("../clientComponent/featuredService/featureService.js"),
);

// const MassclickBanner = lazy(
//   () => import("../clientComponent/massClickBanner/massClickBanner.js"),
// );

const ServiceCardsGrid = lazy(
  () => import("../clientComponent/serviceCard/serviceCard.js"),
);
const LeadAwareness = lazy(
  () => import("./leadAwareness/LeadAwareness.js"),
);
const PublicUserCounter = lazy(
  () => import("./publicUserCounter/PublicUserCounter.js"),
);
const TwoWayAwareness = lazy(
  () => import("./twoWayAwareness/TwoWayAwareness.js"),
);
const EventCarousel = lazy(
  () => import("./events/eventCarousel/eventCarousel.js"),
);
const TrendingSearchesCarousel = lazy(
  () => import("./trendingSearch/trendingSearch"),
);
const CardCarousel = lazy(() => import("./popularSearch/popularSearch"));
const TopTourist = lazy(() => import("./topTourist/topTourist"));
const PopularCategoriesLink = lazy(
  () => import("./popularCategories/popularCategories.js"),
);
const Footer = lazy(() => import("./footer/footer"));
const PageHeaderContents = lazy(
  () => import("./pageHeaderContents/pageHeaderContents.js"),
);
const RelatedBlogs = lazy(() => import("./relatedBlogs/relatedBlogs.js"));
const WeatherWidget = lazy(() => import("./weatherWidget/weatherWidget.js"));
const StickySearchBar = lazy(() =>
  import(
    /* webpackChunkName: "sticky-search" */ "./StickySearchBar/StickySearchBar"
  )
);
const MobileTrustBanner = lazy(() =>
  import(
    /* webpackChunkName: "mobile-trust-banner" */ "./mobileHomeDock/MobileTrustBanner.js"
  )
);
const OTPLoginModel = lazy(() =>
  import(/* webpackChunkName: "otp-modal" */ "./AddBusinessModel.js")
);

const DeferredHomeSection = ({
  children,
  id,
  minHeight,
  rootMargin = "200px 0px",
  style,
}) => {
  const { targetRef, shouldRender } = useRenderNearViewport(rootMargin);

  return (
    <section
      ref={targetRef}
      id={id}
      className={cx("home-section")}
      style={{
        // Never collapse the reservation when async content mounts. The
        // previous placeholder → auto-height transition accumulated CLS as
        // users scrolled through the page.
        minHeight,
        ...style,
      }}
    >
      {shouldRender ? (
        <Suspense
          fallback={<div aria-hidden="true" style={{ minHeight }} />}
        >
          {children}
        </Suspense>
      ) : null}
    </section>
  );
};

const SECTION_HEIGHTS = {
  featured: "var(--featured-services-reserved-height)",
  service: 420,
  events: 380,
  trending: 290,
  popular: 330,
  tourist: 350,
  blogs: 320,
  pageheader: 230,
};

/* ──────────────────────────────────────────────────────────────
   Per-section skeleton loaders
────────────────────────────────────────────────────────────── */
const isUserLoggedIn = () => {
  try {
    const storedUser = localStorage.getItem("authUser");
    if (!storedUser) return false;
    const parsedUser = JSON.parse(storedUser);
    return Boolean(parsedUser?.mobileNumber1Verified);
  } catch {
    return false;
  }
};

const LandingPage = React.memo(() => {
  const dispatch = useDispatch();
  const [fcmNotif, setFcmNotif] = useState(null);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const { meta: seoMetaData } = useSelector((state) => state.seoReducer);
  useEffect(() => {
    dispatch(
      fetchSeoMeta({
        pageType: "home",
      }),
    );
  }, [dispatch]);
  useEffect(() => {
    if (
      !("Notification" in window) ||
      window.Notification.permission !== "granted"
    ) {
      return undefined;
    }

    let cancelled = false;
    let idleHandle = null;
    let unsubscribe;

    const removeInteractionListeners = () => {
      DEFERRED_INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, startMessaging);
      });
    };

    const startMessaging = () => {
      removeInteractionListeners();
      idleHandle = scheduleIdleCallback(() => {
        import("../../firebase")
          .then(({ messaging, onMessage }) => {
            if (
              cancelled ||
              !messaging ||
              typeof onMessage !== "function"
            ) {
              return;
            }

            unsubscribe = onMessage(messaging, (payload) => {
              const { title, body, image } = payload.notification || {};
              const imageUrl = image || payload.data?.imageUrl || null;
              setFcmNotif({
                title: title || "MassClick",
                body: body || "",
                image: imageUrl,
              });
            });
          })
          .catch(() => {});
      });
    };

    DEFERRED_INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, startMessaging, {
        passive: true,
        once: true,
      });
    });

    return () => {
      cancelled = true;
      removeInteractionListeners();
      unsubscribe?.();

      if (
        idleHandle !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      if (idleHandle !== null) {
        window.clearTimeout(idleHandle);
      }
    };
  }, []);
  useEffect(() => {
    if (!fcmNotif) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setFcmNotif(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [fcmNotif]);
  useEffect(() => {
    const activateWeather = () => {
      DEFERRED_INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, activateWeather);
      });
      setShowWeatherWidget(true);
    };

    DEFERRED_INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, activateWeather, {
        passive: true,
        once: true,
      });
    });

    return () => {
      DEFERRED_INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, activateWeather);
      });
    };
  }, []);
  const fallbackSeo = {
    title: "Massclick - India's Leading Local Search Platform",
    description:
      "Find trusted local businesses, services, restaurants, hotels, and professionals near you on Massclick.",
    keywords: "massclick, local search, business directory",
    canonical: "https://massclick.in/",
    robots: "index, follow",
  };
  const [isScrolled, setIsScrolled] = useState(false);
  const [locationName, setLocationName] = useState(
    localStorage.getItem("selectedLocation") || "Trichy",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [loginReminder, setLoginReminder] = useState(false);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(() =>
    isUserLoggedIn(),
  );
  const heroSectionRef = useRef(null);

  useEffect(() => {
    const mobile = localStorage.getItem("mobileNumber");
    const token = localStorage.getItem("authToken");
    if (mobile && token) {
      dispatch(viewOtpUser(mobile));
    }
    if (!token) return;
    let cleanup;
    import("../../services/socketService.js").then(({ connectSocket }) => {
      const ws = connectSocket(token);
      const onLeadUpdate = () => {
        dispatch(viewOtpUser(mobile));
        dispatch(fetchMatchedLeads());
      };
      ws.on("lead:analytics:update", onLeadUpdate);
      cleanup = () => ws.off("lead:analytics:update", onLeadUpdate);
    });
    return () => cleanup?.();
  }, [dispatch]);
  useEffect(() => {
    const refreshLoginState = () => {
      const loggedIn = isUserLoggedIn();
      setCustomerLoggedIn(loggedIn);
      if (loggedIn) setLoginReminder(false);
    };
    window.addEventListener("authChange", refreshLoginState);
    return () => window.removeEventListener("authChange", refreshLoginState);
  }, []);
  useEffect(() => {
    if (!heroSectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        requestAnimationFrame(() => {
          const heroVisible = entry.isIntersecting;
          if (!heroVisible) {
            setIsScrolled(true);
            if (!checkedLogin) {
              setCheckedLogin(true);
              if (!isUserLoggedIn()) {
                setShowLoginModal(true);
              }
            }
          } else {
            setIsScrolled(false);
          }
        });
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "-80px 0px 0px 0px",
      },
    );
    observer.observe(heroSectionRef.current);
    return () => observer.disconnect();
  }, [checkedLogin]);
  // Keep the original visual order while allowing each below-the-fold section
  // to load independently only as the user approaches it.
  const deferredSections = (
    <>
      <DeferredHomeSection minHeight={SECTION_HEIGHTS.events}>
        <EventCarousel locationLabel={locationName} />
      </DeferredHomeSection>

      <DeferredHomeSection
        minHeight={SECTION_HEIGHTS.trending}
      >
        <TrendingSearchesCarousel />
      </DeferredHomeSection>

      <DeferredHomeSection
        minHeight={SECTION_HEIGHTS.popular}
      >
        <CardCarousel />
      </DeferredHomeSection>

      <DeferredHomeSection
        minHeight={SECTION_HEIGHTS.tourist}
      >
        <TopTourist />
      </DeferredHomeSection>

      <DeferredHomeSection
        minHeight={SECTION_HEIGHTS.blogs}
      >
        <RelatedBlogs location={locationName} />
      </DeferredHomeSection>

      <DeferredHomeSection
        minHeight={SECTION_HEIGHTS.pageheader}
      >
        <PageHeaderContents />
      </DeferredHomeSection>
    </>
  );

  // Generate WebSite schema (includes SearchAction for search box in Google)
  const websiteSchema = generateWebsiteSchema();

  // Generate Organization schema
  const organizationSchema = generateOrganizationSchema();

  // WebPage schema for homepage
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: fallbackSeo.title,
    description: fallbackSeo.description,
    url: "https://massclick.in/",
    isPartOf: {
      "@type": "WebSite",
      name: "Massclick",
      url: "https://massclick.in",
    },
  };

  // SSR already injects Organization + WebSite schemas on fresh page loads.
  // Only emit them from React when SSR didn't run (client-side-only navigations).
  const ssrInjectedSchemas = !!window.__SSR_SEO__;

  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
      <Helmet>
        {!ssrInjectedSchemas && websiteSchema && (
          <script type="application/ld+json">
            {JSON.stringify(websiteSchema)}
          </script>
        )}
        {!ssrInjectedSchemas && organizationSchema && (
          <script type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </script>
        )}
        {webPageSchema && (
          <script type="application/ld+json">
            {JSON.stringify(webPageSchema)}
          </script>
        )}
      </Helmet>

      <div className={cx("home-page")}>
        <CategoryBar />

        {isScrolled && (
          <Suspense fallback={null}>
            <StickySearchBar
              isScrolled={true}
              locationName={locationName}
              setLocationName={setLocationName}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryName={categoryName}
              setCategoryName={setCategoryName}
            />
          </Suspense>
        )}

        <main>
          <div ref={heroSectionRef}>
            <HeroSection
              locationName={locationName}
              setLocationName={setLocationName}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryName={categoryName}
              setCategoryName={setCategoryName}
            />
          </div>

          <Suspense fallback={null}>
            <>
                <DeferredHomeSection
                  minHeight={SECTION_HEIGHTS.featured}
                  rootMargin="100px 0px"
                  style={{
                    maxHeight: "none",
                    overflow: "visible",
                  }}
                >
                  <FeaturedServices />
                </DeferredHomeSection>

                <DeferredHomeSection
                  minHeight="var(--public-counter-reserved-height)"
                >
                  <PublicUserCounter />
                </DeferredHomeSection>

                <DeferredHomeSection
                  minHeight="var(--lead-awareness-reserved-height)"
                >
                  <LeadAwareness
                    isLoggedIn={customerLoggedIn}
                    emphasizeLogin={loginReminder}
                    onLoginRequest={() => setShowLoginModal(true)}
                  />
                </DeferredHomeSection>

                <DeferredHomeSection minHeight={SECTION_HEIGHTS.service}>
                  <ServiceCardsGrid />
                </DeferredHomeSection>

                {deferredSections}

                <DeferredHomeSection
                  id="popular-categories"
                  minHeight={520}
                  style={{
                    overflow: "visible",
                  }}
                >
                  <PopularCategoriesLink />
                </DeferredHomeSection>

                <DeferredHomeSection minHeight={100}>
                  <MobileTrustBanner />
                </DeferredHomeSection>

                <DeferredHomeSection minHeight={178}>
                  <TwoWayAwareness
                    isLoggedIn={customerLoggedIn}
                    onLoginRequest={() => setShowLoginModal(true)}
                  />
                </DeferredHomeSection>

                <DeferredHomeSection minHeight={320}>
                  <Footer />
                </DeferredHomeSection>
            </>
          </Suspense>
        </main>

        {showLoginModal && (
          <Suspense fallback={null}>
            <OTPLoginModel
              open={true}
              handleClose={() => setShowLoginModal(false)}
              onMaybeLater={() => setLoginReminder(true)}
            />
          </Suspense>
        )}

        {showWeatherWidget && (
          <Suspense fallback={null}>
            <WeatherWidget locationName={locationName} />
          </Suspense>
        )}
      </div>

      {fcmNotif && (
        <div className={cx("notification-toast")} role="status" aria-live="polite">
          <img
            className={cx("notification-image")}
            src={fcmNotif.image || "/apple-touch-icon.png"}
            alt=""
            width="48"
            height="48"
            onError={(event) => {
              event.currentTarget.src = "/apple-touch-icon.png";
            }}
          />
          <div className={cx("notification-copy")}>
            <strong className={cx("notification-title")}>{fcmNotif.title}</strong>
            <span className={cx("notification-body")}>{fcmNotif.body}</span>
          </div>
          <button
            type="button"
            className={cx("notification-close")}
            aria-label="Dismiss notification"
            onClick={() => setFcmNotif(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
});
export default LandingPage;
