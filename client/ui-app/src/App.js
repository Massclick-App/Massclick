import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from './redux/actions/authAction.js';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './Internals/clientComponent/theme.js';

import Dashboard from './Dashboard';
import Login from './Internals/Login/login.js';
import User from './Internals/user/Users.js';
import Clients from './Internals/clients/Client.js';
import Business from './Internals/business/Business.js';
import Category from './Internals/categories/Category.js';
import Roles from './Internals/Roles/Roles.js';
import Location from './Internals/location/Location.js';
import MainGrid from './components/MainGrid.js';
import PrivateRoute from './PrivateRoute';
import BusinessListing from './Internals/clientComponent/home.js';
import { featuredServices } from './Internals/clientComponent/featuredService/featureService.js';
import { SnackbarProvider } from 'notistack';
import SearchResults from './Internals/clientComponent/SearchResult/SearchResult.js';
import { categoriesServices } from './Internals/clientComponent/serviceCard/serviceCard.js';
import TrendingCards from './Internals/clientComponent/trendingSearch/trendingCard.js';
import BusinessDetails from './Internals/clientComponent/cards/cardDetails.js';
import AboutUsPage from './Internals/clientComponent/footer/aboutUs/aboutUsPage.js';
import Testimonials from './Internals/clientComponent/footer/testimonials/testimonials.js';
import FeedbackComponent from './Internals/clientComponent/footer/feedback/feedback.js';
import CustomerCareComponent from './Internals/clientComponent/footer/customerCare/customerCare.js';
import Portfolio from './Internals/clientComponent/footer/portfolio/portfolio.js';
import TermsAndConditions from './Internals/clientComponent/footer/termsAndConditions/termsAndCondition.js';
import PrivacyPolicy from './Internals/clientComponent/footer/privacyPolicy/privacyPolicy.js';
import RefundPolicy from './Internals/clientComponent/footer/refund/refundPolicy.js';
import EnquiryNow from './Internals/clientComponent/footer/enquiry/enquiry.js';
import WebDevSection from './Internals/clientComponent/footer/webDev/webDevSection.js';
import DigitalMarketing from './Internals/clientComponent/footer/digitalMarketing/digitalMarketing.js';
import GraphicDesign from './Internals/clientComponent/footer/graphicDesign/graphicDesign.js';
import Seo from './Internals/clientComponent/footer/seo/seo.js';
import WriteReviewPage from './Internals/clientComponent/rating/submitReviewPage.js';
import { userMenuItems } from './Internals/clientComponent/categoryBar.js';
import PopularCategoryPage from './Internals/clientComponent/popularCategories/popularCategoriesPage.js';
import Profile from './Internals/Login/profile/profile.js';
import { clientLogin } from './redux/actions/clientAuthAction.js';
import PaymentStatus from './Internals/phonePay/paymentStatus.js';
import ScrollToTop from './scrollTop.js';
import LeadsPage from './Internals/clientComponent/LeadsPage/leadsPage.js';
import AdvertisePage from './Internals/clientComponent/advertise/advertise.js';
import FreeListingPage from './Internals/clientComponent/free-Listing/free-Listing.js';
import MRPPage from './Internals/clientComponent/MRP/mrp.js';
import LeadsCardHistory from './Internals/clientComponent/LeadsPage/leadsCards/leadsCards.js';
import TokenExpiredModal from './Internals/tokenModel/tokenModel.js';
import BusinessEnquiry from './Internals/clientComponent/businessEnquiry/businessEnquiry.js';
import CategoryDynamicPage from './Internals/clientComponent/cards/popularCategories/popularCategoryDrawer.js';
import EnquiryPage from './Internals/enquiry-page/enquiry-page.js';
import AdvertisementPage from './Internals/advertisement/advertisement.js';
import GlobalDrawer from "./Internals/clientComponent/Drawer/globalDrawer.js";
// import { useSelector } from "react-redux";
// import { sendWhatsAppForLead } from "./redux/actions/otpAction.js";
import { fetchMatchedLeads } from "./redux/actions/leadsAction.js";
import SeoData from './Internals/seoData/seoData.js';
import SeoPageContent from './Internals/seoData/seoPageContent/seoPageContent.js';
import MRPDatas from './Internals/MRPDATA/mrpData.js';
import RouteChangeTracker from './RouteChangeTracker.js';
import FloatingButtons from './Internals/clientComponent/floating/floatingButtons.js';
import FloatingAdCard from './Internals/clientComponent/floating/floatingAdCard.js';

const ComingSoon = ({ title }) => (
  <div style={{ textAlign: 'center', marginTop: '20%' }}>
    <h2>{title} Page Coming Soon!</h2>
  </div>
);

const FooterRoutes = [
  { path: 'aboutus', title: 'About Us', element: <AboutUsPage /> },
  { path: 'testimonials', title: 'Testimonials', element: <Testimonials /> },
  { path: 'feedbacks', title: 'Feedbacks', element: <FeedbackComponent /> },
  { path: 'customercare', title: 'Customer Care', element: <CustomerCareComponent /> },
  { path: 'portfolio', title: 'Portfolio', element: <Portfolio /> },
  { path: 'terms', title: 'Terms and Conditions', element: <TermsAndConditions /> },
  { path: 'privacy', title: 'Privacy Policy', element: <PrivacyPolicy /> },
  { path: 'refund', title: 'Refund Policy', element: <RefundPolicy /> },
  { path: 'enquiry', title: 'Enquiry Now', element: <EnquiryNow /> },
  { path: 'services/web', title: 'Web Design & Development', element: <WebDevSection /> },
  { path: 'services/digital', title: 'Digital Marketing', element: <DigitalMarketing /> },
  { path: 'services/graphic', title: 'Graphic Design', element: <GraphicDesign /> },
  { path: 'services/seo', title: 'SEO', element: <Seo /> },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showTokenExpired, setShowTokenExpired] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMatchedLeads());
  }, [dispatch]);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const clientAccessToken = localStorage.getItem("clientAccessToken");

      try {
        if (clientAccessToken) {
          await dispatch(clientLogin());
        }

        if (!accessToken || !refreshToken) {
          setIsAuthenticated(false);
          setAuthChecked(true);
          return;
        }

        const result = await dispatch(relogin());
        if (result && result.accessToken) {
          setIsAuthenticated(true);
        } else {
          throw new Error("Token refresh failed");
        }
      } catch (err) {
        console.warn("Invalid token, clearing storage");
        localStorage.clear();
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    initAuth();
  }, [dispatch]);

  if (!authChecked) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        Loading...
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={5000}
        preventDuplicate
      >
        <Router>
          <RouteChangeTracker />
          <ScrollToTop />
          <GlobalDrawer />
          <FloatingAdCard />
          <FloatingButtons />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/admin" element={<Login setIsAuthenticated={setIsAuthenticated} isAuthenticated={isAuthenticated} />} />
            <Route path="/home" element={<BusinessListing />} />
            <Route path="/category/:categorySlug" element={<CategoryDynamicPage />} />

            {userMenuItems.map((item) => {
              const Component = item.component || (() => <ComingSoon title={item.name} />);
              return <Route key={item.path} path={item.path} element={<Component />} />;
            })}

            {FooterRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            <Route path="/:location/:searchTerm" element={<SearchResults />} />
            <Route path="/trending/:categorySlug" element={<TrendingCards />} />

            {featuredServices.map((service) => {
              const Component = service.component || (() => <ComingSoon title={service.name} />);
              return <Route key={service.path} path={service.path} element={<Component />} />;
            })}

            <Route
              path="/:location/:businessSlug/:id?"
              element={<BusinessDetails />}
            />
            <Route path="/payment-status/:transactionId" element={<PaymentStatus />} />
            <Route path="/write-review/:businessId/:ratingValue" element={<WriteReviewPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/free-listing" element={<FreeListingPage />} />
            <Route path="/mni" element={<MRPPage />} />
            <Route path="/advertise" element={<AdvertisePage />} />
            <Route path="/user/search-history" element={<LeadsCardHistory />} />
            <Route path="/business-enquiry" element={<BusinessEnquiry />} />
            {categoriesServices.flatMap((category, categoryIndex) =>
              category.items.map((item, itemIndex) => {
                const path = item.path || item.route || `auto-path-${categoryIndex}-${itemIndex}`;
                const Component = item.component || (() => <ComingSoon title={item.name} />);
                return <Route key={path} path={path} element={<Component />} />;
              })
            )}
            <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
              <Route path="/dashboard" element={<Dashboard />}>
                <Route index element={<MainGrid />} />
                <Route path="user" element={<User />} />
                <Route path="profile" element={<Profile />} />
                <Route path="clients" element={<Clients />} />
                <Route path="business" element={<Business />} />
                <Route path="category" element={<Category />} />
                <Route path="location" element={<Location />} />
                <Route path="seo" element={<SeoData />} />
                <Route path="seopagecontent" element={<SeoPageContent />} />
                <Route path="roles" element={<Roles />} />
                <Route path="enquiry" element={<EnquiryPage />} />
                <Route path="advertisements" element={<AdvertisementPage />} />
                <Route path="mni-data" element={<MRPDatas />} />
              </Route>
            </Route>
          </Routes>
        </Router>
        {showTokenExpired && <TokenExpiredModal onClose={() => setShowTokenExpired(false)} />}
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;