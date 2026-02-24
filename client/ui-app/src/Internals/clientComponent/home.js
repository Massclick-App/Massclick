import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Box, Drawer, List, ListItem, ListItemText } from '@mui/material';
import HeroSection from '../clientComponent/heroSection/heroSection.js';
import CategoryBar from '../clientComponent/categoryBar';
import FeaturedServices from '../clientComponent/featuredService/featureService.js';
import ServiceCardsGrid from '../clientComponent/serviceCard/serviceCard.js';
import TrendingSearchesCarousel from './trendingSearch/trendingSearch';
import CardCarousel from './popularSearch/popularSearch';
import TopTourist from './topTourist/topTourist';
import MassClickBanner from './massClickBanner/massClickBanner';
import SearchResults from './SearchResult/SearchResult';
import PopularCategories from './popularCategories/popularCategories';
import Footer from './footer/footer';
import CardsSearch from './CardsSearch/CardsSearch';
import OTPLoginModel from './AddBusinessModel.js';
import { viewOtpUser } from '../../redux/actions/otpAction.js';
// import { Helmet } from "react-helmet-async";
// import { HOME_META } from "../clientComponent/seo/seoDocument.js";
import SeoMeta from "./seo/seoMeta";
import { fetchSeoMeta } from "../../redux/actions/seoAction";


const STICKY_SEARCH_BAR_HEIGHT = 85;

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
    const [locationName, setLocationName] = useState('');
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
    const isSearching = searchResults !== null;

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
            {/* <Helmet>
                <title>{HOME_META.title}</title>
                <meta name="description" content={HOME_META.description} />
                <meta name="keywords" content={HOME_META.keywords} />
                <meta name="robots" content="index, follow" />
                <meta name="author" content="Massclick" />
                <meta name="publisher" content="Massclick" />
                <link rel="canonical" href={HOME_META.canonical} />
            </Helmet> */}
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

                {isSearching ? (
                    <Box sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 4, md: 6 } }}>
                        <SearchResults results={searchResults} />
                    </Box>
                ) : (
                    <>
                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <FeaturedServices />
                        </Box>

                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <ServiceCardsGrid />
                        </Box>

                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <MassClickBanner />
                        </Box>

                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <TrendingSearchesCarousel />
                        </Box>

                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <CardCarousel />
                        </Box>

                        <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <TopTourist />
                        </Box>

                        {/* <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
                            <PopularCategories />
                        </Box> */}

                        <Footer />
                    </>
                )}

                <OTPLoginModel
                    open={showLoginModal}
                    handleClose={() => setShowLoginModal(false)}
                />
            </Box>
        </>
    );
};

export default LandingPage;
