import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Drawer,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Snackbar,
  Alert,
  Avatar,
} from "@mui/material";
import { Helmet } from "react-helmet-async";
import HeroSection from "../clientComponent/heroSection/heroSection.js";
import CategoryBar from "../clientComponent/categoryBar";
import StickySearchBar from './StickySearchBar/StickySearchBar';
import OTPLoginModel from "./AddBusinessModel.js";
import { viewOtpUser } from "../../redux/actions/otpAction.js";
import { fetchMatchedLeads } from "../../redux/actions/leadsAction.js";
import SeoMeta from "./seo/seoMeta";
import { fetchSeoMeta } from "../../redux/actions/seoAction";
import { connectSocket } from "../../services/socketService.js";
import {
  generateWebsiteSchema,
  generateOrganizationSchema,
} from "../../utils/seoSchemaGenerators";
import { scheduleIdleCallback } from "../../utils/scheduleIdleCallback.js";
import styles from "./homeLayout.module.css";
const cx = createScopedClassNames(styles);

// Design System Constants - Enforce uniformity across all components
const DESIGN_TOKENS = {
  // Spacing (vertical gaps between sections)
  sectionGap: {
    xs: 2.5,
    sm: 3,
    md: 3.5,
  },
  // Padding (horizontal - applied to all sections)
  sectionPadding: {
    xs: 2,
    sm: 4,
    md: 6,
  },
  // Font sizes
  fontSize: {
    lg: 14, // Labels, titles
    md: 13, // Body text
    sm: 11, // Secondary text
  },
  // Component sizes
  avatar: {
    notification: 48,
  },
  gap: {
    xs: 1,
    sm: 1.5,
  },
};

const S = ({ variant = "rounded", w, h, r, sx, ...rest }) => (
  <Skeleton
    variant={variant}
    width={w}
    height={h}
    animation="wave"
    sx={{
      borderRadius: r ?? 2,
      flexShrink: 0,
      bgcolor: "rgba(255,107,44,0.055)",
      ...sx,
    }}
    {...rest}
  />
);
const Txt = ({ w = "100%", h = DESIGN_TOKENS.fontSize.lg, sx } = {}) => (
  <S variant="rounded" w={w} h={h} r={1} sx={sx} />
);
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
const SearchResults = lazy(() => import("./SearchResult/SearchResult"));
const Footer = lazy(() => import("./footer/footer"));
const PageHeaderContents = lazy(
  () => import("./pageHeaderContents/pageHeaderContents.js"),
);
const RelatedBlogs = lazy(() => import("./relatedBlogs/relatedBlogs.js"));

const HOME_SECTION_GAP = DESIGN_TOKENS.sectionGap;

const homeSectionSx = {
  mb: HOME_SECTION_GAP,
  contain: "layout style paint",
};

// Reserve exact heights for each skeleton type to match actual content
const SKELETON_HEIGHTS = {
  featured: {
    skeleton: 280,
    actual: 280,
  },
  service: {
    skeleton: 420,
    actual: 420,
  },
  trending: {
    skeleton: 290,
    actual: 290,
  },
  popular: {
    skeleton: 330,
    actual: 330,
  },
  tourist: {
    skeleton: 350,
    actual: 350,
  },
  blogs: {
    skeleton: 320,
    actual: 320,
  },
  pageheader: {
    skeleton: 230,
    actual: 230,
  },
};

/* ──────────────────────────────────────────────────────────────
   Per-section skeleton loaders
────────────────────────────────────────────────────────────── */
const SkeletonCard = ({ w = 80, h = 80, r = 50, mb = 1.5, mt = 0.5 }) => (
  <S
    w={w}
    h={h}
    r={r}
    sx={{
      mx: "auto",
      mb,
      mt,
    }}
  />
);
const SkeletonCards = ({ type }) => {
  const configs = {
    featured: {
      count: 8,
      cardW: 130,
      cardH: 160,
      iconW: 80,
      iconH: 80,
      containerH: SKELETON_HEIGHTS.featured.skeleton,
    },
    service: {
      count: 12,
      cardW: 80,
      cardH: 80,
      iconW: 70,
      iconH: 70,
      containerH: SKELETON_HEIGHTS.service.skeleton,
    },
    pageheader: {
      count: 4,
      cardW: 140,
      cardH: 80,
      iconW: 60,
      iconH: 60,
      containerH: SKELETON_HEIGHTS.pageheader.skeleton,
    },
  };
  const c = configs[type] || configs.featured;
  return (
    <div
      className={cx("sk-hscroll")}
      style={{
        padding: "0 16px",
        height: c.containerH,
        display: "flex",
        alignItems: "center",
        contain: "layout style paint",
      }}
    >
      {[...Array(c.count)].map((_, i) => (
        <div
          key={i}
          className={cx("service-card")}
          style={{
            width: c.cardW,
            height: c.cardH,
            flexShrink: 0,
          }}
        >
          <SkeletonCard w={c.iconW} h={c.iconH} r={50} mb={1.5} mt={0} />
          <Txt
            w="70%"
            h={DESIGN_TOKENS.fontSize.lg}
            sx={{
              mx: "auto",
            }}
          />
          <Txt
            w="50%"
            h={DESIGN_TOKENS.fontSize.sm}
            sx={{
              mx: "auto",
              mt: 0.5,
            }}
          />
        </div>
      ))}
    </div>
  );
};
const SkeletonCarousel = ({ type }) => {
  const isTrending = type === "trending";
  const cardW = isTrending ? 240 : 280;
  const cardH = isTrending ? 150 : 180;
  const count = isTrending ? 5 : 4;
  const containerH = isTrending
    ? SKELETON_HEIGHTS.trending.skeleton
    : SKELETON_HEIGHTS.popular.skeleton;
  return (
    <div
      style={{
        height: containerH,
        display: "flex",
        alignItems: "center",
        contain: "layout style paint",
        overflow: "auto",
      }}
    >
      <div
        className={cx(
          isTrending ? "trending-search__track" : "popular-search__track",
        )}
        style={{
          display: "flex",
          gap: "1rem",
          overflow: "hidden",
        }}
      >
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className={cx(
              isTrending ? "trending-search__card" : "popular-search__card",
            )}
            style={{
              width: cardW,
              flexShrink: 0,
            }}
          >
            <S w={cardW} h={cardH} r={14} />
            <Txt
              w="60%"
              h={DESIGN_TOKENS.fontSize.lg}
              sx={{
                mt: 1,
              }}
            />
            {!isTrending && (
              <S
                w={120}
                h={36}
                r={8}
                sx={{
                  mt: 1,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
const SkeletonGrid = ({ type }) => {
  const isTourist = type === "tourist";
  const count = isTourist ? 4 : 3;
  const h = isTourist ? 200 : 170;
  const containerH = isTourist
    ? SKELETON_HEIGHTS.tourist.skeleton
    : SKELETON_HEIGHTS.blogs.skeleton;
  return (
    <Grid
      container
      spacing={2}
      sx={{
        height: containerH,
        display: "flex",
        alignItems: "center",
        contain: "layout style paint",
      }}
    >
      {[...Array(count)].map((_, i) => (
        <Grid
          size={{
            xs: 6,
            sm: isTourist ? 3 : 4,
            md: isTourist ? 3 : 4,
          }}
          key={i}
        >
          <S w="100%" h={h} r={12} />
          <Txt
            w="60%"
            h={DESIGN_TOKENS.fontSize.lg}
            sx={{
              mt: 1.5,
            }}
          />
          {isTourist && (
            <Txt
              w="40%"
              h={DESIGN_TOKENS.fontSize.sm}
              sx={{
                mt: 0.5,
              }}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
};

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
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const { meta: seoMetaData } = useSelector((state) => state.seoReducer);
  useEffect(() => {
    dispatch(
      fetchSeoMeta({
        pageType: "home",
      }),
    );
  }, [dispatch]);
  useEffect(() => {
    const idleHandle = scheduleIdleCallback(
      () => {
        import("../../firebase")
          .then(({ messaging, onMessage }) => {
            if (!messaging || typeof onMessage !== "function") {
              console.warn("[FCM] Skipping foreground messaging setup in this browser");
              return undefined;
            }

            const unsubscribe = onMessage(messaging, (payload) => {
              console.log("[FCM] Foreground message received:", payload);
              const { title, body, image } = payload.notification || {};
              const imageUrl = image || payload.data?.imageUrl || null;
              console.log("[FCM] Showing in-app notification:", {
                title,
                body,
                imageUrl,
              });
              setFcmNotif({
                title: title || "MassClick",
                body: body || "",
                image: imageUrl,
              });
            });
            return unsubscribe;
          })
          .catch((err) => console.warn("[FCM] Failed to load Firebase:", err));
      },
      { timeout: 4000 },
    );

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      window.clearTimeout(idleHandle);
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
  const [searchResults, setSearchResults] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const idleHandle = scheduleIdleCallback(
      () => setShowDeferredSections(true),
      { timeout: 3000 },
    );

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      window.clearTimeout(idleHandle);
    };
  }, []);

  useEffect(() => {
    const mobile = localStorage.getItem("mobileNumber");
    const token = localStorage.getItem("authToken");
    if (mobile && token) {
      dispatch(viewOtpUser(mobile));
    }
    if (!token) return;
    const ws = connectSocket(token);
    const onLeadUpdate = () => {
      dispatch(viewOtpUser(mobile));
      dispatch(fetchMatchedLeads());
    };
    ws.on("lead:analytics:update", onLeadUpdate);
    return () => {
      ws.off("lead:analytics:update", onLeadUpdate);
    };
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
  const handleMobileMenuClose = () => setMobileMenuOpen(false);
  const isSearching = searchResults && searchResults.length > 0;
  // Keep the original visual order, but defer the below-the-fold sections until idle
  // so the homepage stays faster on mobile and desktop.
  const deferredSections = (
    <>
      <Box className="home-section" sx={homeSectionSx}>
        <Suspense fallback={<SkeletonCarousel type="popular" />}>
          <EventCarousel locationLabel={locationName} />
        </Suspense>
      </Box>

      {/* <Box className="home-section" sx={homeSectionSx}>
        <Suspense fallback={<SkeletonCards type="service" />}>
          <MassclickBanner />
        </Suspense>
      </Box> */}

      <Box className={cx("home-section")} sx={homeSectionSx}>
        <Suspense fallback={<SkeletonCarousel type="trending" />}>
          <TrendingSearchesCarousel />
        </Suspense>
      </Box>

      <Box className={cx("home-section")} sx={homeSectionSx}>
        <Suspense fallback={<SkeletonCarousel type="popular" />}>
          <CardCarousel />
        </Suspense>
      </Box>

      <Box className={cx("home-section")} sx={homeSectionSx}>
        <Suspense fallback={<SkeletonGrid type="tourist" />}>
          <TopTourist />
        </Suspense>
      </Box>

      <Box className={cx("home-section")} sx={homeSectionSx}>
        <Suspense fallback={<SkeletonGrid type="blogs" />}>
          <RelatedBlogs location={locationName} />
        </Suspense>
      </Box>

      <Box className={cx("home-section")} sx={homeSectionSx}>
        <Suspense fallback={<SkeletonCards type="pageheader" />}>
          <PageHeaderContents />
        </Suspense>
      </Box>
    </>
  );
  const drawerContent = (
    <Box
      onClick={handleMobileMenuClose}
      sx={{
        textAlign: "center",
      }}
    >
      <List>
        {["About Us", "Services", "Testimonials", "Portfolio"].map((text) => (
          <ListItem button key={text}>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    </Box>
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
  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
      <Helmet>
        {websiteSchema && (
          <script type="application/ld+json">
            {JSON.stringify(websiteSchema)}
          </script>
        )}
        {organizationSchema && (
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

      <Box
        className={cx("home-page")}
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          width: "100%",
        }}
      >
        <Drawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={handleMobileMenuClose}
        >
          {drawerContent}
        </Drawer>

        <CategoryBar />

        <StickySearchBar
          isScrolled={isScrolled}
          locationName={locationName}
          setLocationName={setLocationName}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
        />

        <main>
          <Box ref={heroSectionRef}>
            <HeroSection
              locationName={locationName}
              setLocationName={setLocationName}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryName={categoryName}
              setCategoryName={setCategoryName}
              setSearchResults={setSearchResults}
            />
          </Box>

          <Suspense fallback={null}>
            {isSearching ? (
              <SearchResults results={searchResults} />
            ) : (
              <>
                <Box
                  className={cx("home-section")}
                  sx={{
                    ...homeSectionSx,
                    minHeight: 280,
                    maxHeight: "none",
                    overflow: "visible",
                  }}
                >
                  <Suspense fallback={<SkeletonCards type="featured" />}>
                    <FeaturedServices />
                  </Suspense>
                </Box>

                <Box className={cx("home-section")} sx={homeSectionSx}>
                  <Suspense fallback={null}>
                    <LeadAwareness
                      isLoggedIn={customerLoggedIn}
                      emphasizeLogin={loginReminder}
                      onLoginRequest={() => setShowLoginModal(true)}
                    />
                  </Suspense>
                </Box>

                <Box className={cx("home-section")} sx={homeSectionSx}>
                  <Suspense fallback={<SkeletonCards type="service" />}>
                    <ServiceCardsGrid />
                  </Suspense>
                </Box>

                {showDeferredSections ? deferredSections : null}

                <Box
                  className={cx("home-section")}
                  sx={{
                    ...homeSectionSx,
                    minHeight: { xs: 520, md: 620 },
                  }}
                >
                  <Suspense fallback={null}>
                    <PopularCategoriesLink />
                  </Suspense>
                </Box>

                <Box className={cx("home-section")} sx={homeSectionSx}>
                  <Suspense fallback={null}>
                    <TwoWayAwareness
                      isLoggedIn={customerLoggedIn}
                      onLoginRequest={() => setShowLoginModal(true)}
                    />
                  </Suspense>
                </Box>

                <Footer />
              </>
            )}
          </Suspense>
        </main>

        <OTPLoginModel
          open={showLoginModal}
          handleClose={() => setShowLoginModal(false)}
          onMaybeLater={() => setLoginReminder(true)}
        />
      </Box>

      <Snackbar
        open={!!fcmNotif}
        autoHideDuration={6000}
        onClose={() => setFcmNotif(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={() => setFcmNotif(null)}
          severity="info"
          icon={false}
          sx={{
            width: "100%",
            maxWidth: 360,
            bgcolor: "#fff",
            color: "#333",
            boxShadow: 4,
            borderRadius: 2,
            display: "flex",
            alignItems: "flex-start",
            gap: DESIGN_TOKENS.gap.sm,
            p: DESIGN_TOKENS.gap.sm,
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: DESIGN_TOKENS.gap.sm,
              alignItems: "flex-start",
            }}
          >
            {fcmNotif?.image ? (
              <Avatar
                src={fcmNotif.image}
                variant="rounded"
                sx={{
                  width: DESIGN_TOKENS.avatar.notification,
                  height: DESIGN_TOKENS.avatar.notification,
                  flexShrink: 0,
                }}
                imgProps={{
                  onError: (e) => {
                    e.target.style.display = "none";
                  },
                }}
              />
            ) : (
              <Avatar
                src="/apple-touch-icon.png"
                variant="rounded"
                sx={{
                  width: DESIGN_TOKENS.avatar.notification,
                  height: DESIGN_TOKENS.avatar.notification,
                  flexShrink: 0,
                }}
              />
            )}
            <Box>
              <Box
                sx={{
                  fontWeight: 700,
                  fontSize: DESIGN_TOKENS.fontSize.lg,
                  mb: 0.25,
                }}
              >
                {fcmNotif?.title}
              </Box>
              <Box
                sx={{
                  fontSize: DESIGN_TOKENS.fontSize.md,
                  color: "#555",
                }}
              >
                {fcmNotif?.body}
              </Box>
            </Box>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
});
export default LandingPage;
