import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Box, Drawer, Grid, List, ListItem, ListItemText, Skeleton } from '@mui/material';
import HeroSection from '../clientComponent/heroSection/heroSection.js';
import CategoryBar from '../clientComponent/categoryBar';
import CardsSearch from './CardsSearch/CardsSearch';
import OTPLoginModel from './AddBusinessModel.js';
import { viewOtpUser } from '../../redux/actions/otpAction.js';
import SeoMeta from "./seo/seoMeta";
import { fetchSeoMeta } from "../../redux/actions/seoAction";

const S = ({ variant = "rounded", w, h, r, sx, ...rest }) => (
  <Skeleton
    variant={variant}
    width={w}
    height={h}
    animation="wave"
    sx={{ borderRadius: r ?? 2, flexShrink: 0, bgcolor: "rgba(255,107,44,0.055)", ...sx }}
    {...rest}
  />
);

const Txt = ({ w = "100%", h = 14, sx } = {}) => (
  <S variant="rounded" w={w} h={h} r={1} sx={sx} />
);

const FeaturedServices = lazy(() => import('../clientComponent/featuredService/featureService.js'));
const ServiceCardsGrid = lazy(() => import('../clientComponent/serviceCard/serviceCard.js'));
const TrendingSearchesCarousel = lazy(() => import('./trendingSearch/trendingSearch'));
const CardCarousel = lazy(() => import('./popularSearch/popularSearch'));
const TopTourist = lazy(() => import('./topTourist/topTourist'));
const MassClickBanner = lazy(() => import('./massClickBanner/massClickBanner'));
const SearchResults = lazy(() => import('./SearchResult/SearchResult'));
const Footer = lazy(() => import('./footer/footer'));
const PageHeaderContents = lazy(() => import('./pageHeaderContents/pageHeaderContents.js'));
const RelatedBlogs = lazy(() => import('./relatedBlogs/relatedBlogs.js'));

const STICKY_SEARCH_BAR_HEIGHT = 85;

/* ──────────────────────────────────────────────────────────────
   Per-section skeleton loaders
────────────────────────────────────────────────────────────── */
const SkeletonCard = ({ w = 80, h = 80, r = 50, mb = 1.5, mt = 0.5 }) => (
  <S w={w} h={h} r={r} sx={{ mx: "auto", mb, mt }} />
);

const SkeletonCards = ({ type }) => {
  const configs = {
    featured: { count: 8, cardW: 130, cardH: 160, iconW: 80, iconH: 80 },
    service: { count: 12, cardW: 80, cardH: 80, iconW: 70, iconH: 70 },
    pageheader: { count: 4, cardW: 140, cardH: 80, iconW: 60, iconH: 60 },
  };
  const c = configs[type] || configs.featured;
  return (
    <div className="sk-hscroll" style={{ padding: "0 16px" }}>
      {[...Array(c.count)].map((_, i) => (
        <div
          key={i}
          className="service-card"
          style={{ width: c.cardW, height: c.cardH, flexShrink: 0 }}
        >
          <SkeletonCard w={c.iconW} h={c.iconH} r={50} mb={1.5} mt={0} />
          <Txt w="70%" h={14} sx={{ mx: "auto" }} />
          <Txt w="50%" h={11} sx={{ mx: "auto", mt: 0.5 }} />
        </div>
      ))}
    </div>
  );
};

const SkeletonBanner = () => (
  <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
    <S w="100%" h={110} r={18} />
  </Box>
);

const SkeletonCarousel = ({ type }) => {
  const isTrending = type === "trending";
  const cardW = isTrending ? 240 : 280;
  const cardH = isTrending ? 150 : 180;
  const count = isTrending ? 5 : 4;
  return (
    <div style={{ px: { xs: 2, sm: 4, md: 6 } }}>
      <div
        className={isTrending ? "trending-search__track" : "popular-search__track"}
        style={{ display: "flex", gap: "1rem", overflow: "hidden" }}
      >
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className={isTrending ? "trending-search__card" : "popular-search__card"}
            style={{ width: cardW, flexShrink: 0 }}
          >
            <S w={cardW} h={cardH} r={14} />
            <Txt w="60%" h={14} sx={{ mt: 1 }} />
            {!isTrending && <S w={120} h={36} r={8} sx={{ mt: 1 }} />}
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
  return (
    <Grid container spacing={2} sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
      {[...Array(count)].map((_, i) => (
        <Grid item xs={6} sm={isTourist ? 3 : 4} md={isTourist ? 3 : 4} key={i}>
          <S w="100%" h={h} r={12} />
          <Txt w="60%" h={14} sx={{ mt: 1.5 }} />
          {isTourist && <Txt w="40%" h={11} sx={{ mt: 0.5 }} />}
        </Grid>
      ))}
    </Grid>
  );
};

/* ──────────────────────────────────────────────────────────────
   Main LandingPage
────────────────────────────────────────────────────────────── */

const LandingPage = () => {

    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "home" }));
    }, [dispatch]);

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
        localStorage.getItem("selectedLocation") || "trichy"
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [checkedLogin, setCheckedLogin] = useState(false);

    const heroSectionRef = useRef(null);

    useEffect(() => {
        const mobile = localStorage.getItem("mobileNumber");
        if (!mobile) return;

        dispatch(viewOtpUser(mobile));

        const interval = setInterval(() => {
            dispatch(viewOtpUser(mobile));
        }, 20000);

        return () => clearInterval(interval);
    }, [dispatch]);

    const isUserLoggedIn = () => {
        try {
            const storedUser = localStorage.getItem('authUser');
            if (!storedUser) return false;
            const parsedUser = JSON.parse(storedUser);
            return !!parsedUser?.mobileNumber1Verified;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        if (!heroSectionRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
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
            },
            
            {
                root: null,
                threshold: 0,
                rootMargin: '-80px 0px 0px 0px',
            }
        );

        observer.observe(heroSectionRef.current);

        return () => observer.disconnect();
    }, [checkedLogin]);

    const handleMobileMenuClose = () => setMobileMenuOpen(false);

    const isSearching = searchResults && searchResults.length > 0;

    const drawerContent = (
        <Box onClick={handleMobileMenuClose} sx={{ textAlign: 'center' }}>
            <List>
                {['About Us', 'Services', 'Testimonials', 'Portfolio'].map(text => (
                    <ListItem button key={text}>
                        <ListItemText primary={text} />
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

            <Box sx={{ flexGrow: 1, bgcolor: 'background.default', width: '100%' }}>

                <Drawer anchor="right" open={mobileMenuOpen} onClose={handleMobileMenuClose}>
                    {drawerContent}
                </Drawer>

                {!isScrolled && <CategoryBar />}

                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        bgcolor: 'background.paper',
                        boxShadow: 3,
                        transform: isScrolled ? 'translateY(0)' : 'translateY(-110%)',
                        opacity: isScrolled ? 1 : 0,
                        transition: 'transform 0.3s ease, opacity 0.3s ease',
                        pointerEvents: isScrolled ? 'auto' : 'none',
                    }}
                >
                    <CardsSearch
                        locationName={locationName}
                        setLocationName={setLocationName}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        categoryName={categoryName}
                        setCategoryName={setCategoryName}
                    />
                </Box>

                <Box sx={{ height: isScrolled ? STICKY_SEARCH_BAR_HEIGHT : 0 }} />

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
                        <Box sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 4, md: 6 } }}>
                            <SearchResults results={searchResults} />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonCards type="featured" />}>
                                    <FeaturedServices />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonCards type="service" />}>
                                    <ServiceCardsGrid />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonBanner />}>
                                    <MassClickBanner />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonCarousel type="trending" />}>
                                    <TrendingSearchesCarousel />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonCarousel type="popular" />}>
                                    <CardCarousel />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonGrid type="tourist" />}>
                                    <TopTourist />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonGrid type="blogs" />}>
                                    <RelatedBlogs location={locationName} />
                                </Suspense>
                            </Box>

                            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                                <Suspense fallback={<SkeletonCards type="pageheader" />}>
                                    <PageHeaderContents />
                                </Suspense>
                            </Box>

                            <Footer />
                        </>
                    )}

                </Suspense>

                <OTPLoginModel
                    open={showLoginModal}
                    handleClose={() => setShowLoginModal(false)}
                />
            </Box>
        </>
    );
};

export default LandingPage;