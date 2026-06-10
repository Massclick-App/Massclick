import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from './redux/actions/authAction.js';
import { clientLogin } from './redux/actions/clientAuthAction.js';
import { fetchMatchedLeads } from './redux/actions/leadsAction.js';
import { setMaintenanceModeOn, setMaintenanceModeOff } from './redux/reducers/maintenanceReducer.js';
import { connectSocket } from './services/socketService.js';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import theme from './Internals/clientComponent/theme.js';
import PrivateRoute from './PrivateRoute';
import PermissionRoute from './PermissionRoute';
import ScrollToTop from './scrollTop.js';
import RouteChangeTracker from './RouteChangeTracker.js';
import { userMenuItems } from './Internals/clientComponent/categoryBar.js';

import ShimmerSkeleton from './Internals/clientComponent/shimmerSkeleton.js';
import GlobalLoaderWrapper from './Internals/clientComponent/common/GlobalLoaderWrapper.js';
import VideoPreloader from './components/VideoPreloader.js';

const Dashboard = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ './Dashboard'));
const Login = lazy(() => import(/* webpackChunkName: "admin-login" */ './Internals/Login/login.js'));
const User = lazy(() => import(/* webpackChunkName: "admin-users" */ './Internals/user/Users.js'));
const Clients = lazy(() => import(/* webpackChunkName: "admin-clients" */ './Internals/clients/Client.js'));
const Business = lazy(() => import(/* webpackChunkName: "admin-business" */ './Internals/business/Business.js'));
const Category = lazy(() => import(/* webpackChunkName: "admin-category" */ './Internals/categories/Category.js'));
const Roles = lazy(() => import(/* webpackChunkName: "admin-roles" */ './Internals/Roles/Roles.js'));
const Location = lazy(() => import(/* webpackChunkName: "admin-location" */ './Internals/location/Location.js'));
const TermsAndConditionsDatas = lazy(() => import(/* webpackChunkName: "admin-terms" */ './Internals/footersContents/termsAndConditions/termsAndConditions.js'));
const MainGrid = lazy(() => import(/* webpackChunkName: "admin-maingrid" */ './components/MainGrid.js'));

const BusinessListing = lazy(() => import(/* webpackChunkName: "home" */ './Internals/clientComponent/home.js'));
const SearchResults = lazy(() => import(/* webpackChunkName: "search" */ './Internals/clientComponent/SearchResult/SearchResult.js'));
const BusinessDetails = lazy(() => import(/* webpackChunkName: "business-detail" */ './Internals/clientComponent/cards/cardDetails.js'));
const EventCarousel = lazy(() => import(/* webpackChunkName: "events" */ './Internals/clientComponent/events/eventCarousel/eventCarousel.js'));
const EventDetails = lazy(() => import(/* webpackChunkName: "event-detail" */ './Internals/clientComponent/events/eventDetails/eventDetails.js'));

const AboutUsPage = lazy(() => import(/* webpackChunkName: "footer-aboutus" */ './Internals/clientComponent/footer/aboutUs/aboutUsPage.js'));
const Testimonials = lazy(() => import(/* webpackChunkName: "footer-testimonials" */ './Internals/clientComponent/footer/testimonials/testimonials.js'));
const FeedbackComponent = lazy(() => import(/* webpackChunkName: "footer-feedback" */ './Internals/clientComponent/footer/feedback/feedback.js'));
const CustomerCareComponent = lazy(() => import(/* webpackChunkName: "footer-care" */ './Internals/clientComponent/footer/customerCare/customerCare.js'));
const Portfolio = lazy(() => import(/* webpackChunkName: "footer-portfolio" */ './Internals/clientComponent/footer/portfolio/portfolio.js'));
const TermsAndConditions = lazy(() => import(/* webpackChunkName: "footer-terms" */ './Internals/clientComponent/footer/termsAndConditions/termsAndCondition.js'));
const PrivacyPolicy = lazy(() => import(/* webpackChunkName: "footer-privacy" */ './Internals/clientComponent/footer/privacyPolicy/privacyPolicy.js'));
const RefundPolicy = lazy(() => import(/* webpackChunkName: "footer-refund" */ './Internals/clientComponent/footer/refund/refundPolicy.js'));
const EnquiryNow = lazy(() => import(/* webpackChunkName: "footer-enquiry" */ './Internals/clientComponent/footer/enquiry/enquiry.js'));
const WebDevSection = lazy(() => import(/* webpackChunkName: "footer-webdev" */ './Internals/clientComponent/footer/webDev/webDevSection.js'));
const DigitalMarketing = lazy(() => import(/* webpackChunkName: "footer-digital" */ './Internals/clientComponent/footer/digitalMarketing/digitalMarketing.js'));
const GraphicDesign = lazy(() => import(/* webpackChunkName: "footer-graphic" */ './Internals/clientComponent/footer/graphicDesign/graphicDesign.js'));
const Seo = lazy(() => import(/* webpackChunkName: "footer-seo" */ './Internals/clientComponent/footer/seo/seo.js'));
const DeleteAccount = lazy(() => import(/* webpackChunkName: "footer-delete" */ './Internals/clientComponent/footer/deleteAccount/deleteAccount.js'));
const KnowledgeBasePage = lazy(() => import(/* webpackChunkName: "knowledge-base" */ "./Internals/clientComponent/footer/knowledgeBase/knowledgeBase.js"));

const WriteReviewPage = lazy(() => import(/* webpackChunkName: "review" */ './Internals/clientComponent/rating/submitReviewPage.js'));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ './Internals/Login/profile/profile.js'));
const PaymentStatus = lazy(() => import(/* webpackChunkName: "payment" */ './Internals/phonePay/paymentStatus.js'));
const LeadsPage = lazy(() => import(/* webpackChunkName: "leads" */ './Internals/clientComponent/LeadsPage/leadsPage.js'));
const AdvertisePage = lazy(() => import(/* webpackChunkName: "advertise" */ './Internals/clientComponent/advertise/advertise.js'));
const FreeListingPage = lazy(() => import(/* webpackChunkName: "free-listing" */ './Internals/clientComponent/free-Listing/free-Listing.js'));
const LeadsCardHistory = lazy(() => import(/* webpackChunkName: "leads-history" */ './Internals/clientComponent/LeadsPage/leadsCards/leadsCards.js'));
const BusinessEnquiry = lazy(() => import(/* webpackChunkName: "business-enquiry" */ './Internals/clientComponent/businessEnquiry/businessEnquiry.js'));

const EnquiryPage = lazy(() => import(/* webpackChunkName: "admin-enquiry" */ './Internals/enquiry-page/enquiry-page.js'));
const AdminCustomerCareChat = lazy(() => import(/* webpackChunkName: "admin-customer-care-chat" */ './Internals/CustomerCareChat/AdminCustomerCareChat.js'));
const AdvertisementPage = lazy(() => import(/* webpackChunkName: "admin-advertisement" */ './Internals/advertisement/advertisement.js'));
const EventCategory = lazy(() => import(/* webpackChunkName: "admin-event-category" */ './components/eventCategory/eventCategory.js'));
const EventLocation = lazy(() => import(/* webpackChunkName: "admin-event-location" */ './components/eventLocation/eventLocation.js'));
const EventAdvertisement = lazy(() => import(/* webpackChunkName: "admin-event-advertisement" */ './components/eventAdvertisement/eventAdvertisement.js'));
const EventCreation = lazy(() => import(/* webpackChunkName: "admin-event-creation" */ './components/eventCreation/eventCreation.js'));

const GlobalDrawer = lazy(() => import(/* webpackChunkName: "drawer" */ './Internals/clientComponent/Drawer/globalDrawer.js'));
const SeoData = lazy(() => import(/* webpackChunkName: "admin-seo" */ './Internals/seoData/seoData.js'));
const SeoPageContent = lazy(() => import(/* webpackChunkName: "admin-seo-content" */ './Internals/seoData/seoPageContent/seoPageContent.js'));
const SeoPageContentBlogs = lazy(() => import(/* webpackChunkName: "admin-seo-blogs" */ './Internals/seoData/seoPageContentBlog/seoPageContentBlog.js'));

const MRPDatas = lazy(() => import(/* webpackChunkName: "admin-mrp" */ './Internals/MRPDATA/mrpData.js'));
const FCMMarketing = lazy(() => import(/* webpackChunkName: "admin-fcm" */ './Internals/FCMMarketing/FCMMarketing.js'));
const SystemSettings = lazy(() => import(/* webpackChunkName: "admin-settings" */ './Internals/SystemSettings/SystemSettings.js'));
const CategoryDisplaySettings = lazy(() => import(/* webpackChunkName: "admin-cat-display" */ './Internals/CategoryDisplaySettings/CategoryDisplaySettings.js'));
const GmapsLeads = lazy(() => import(/* webpackChunkName: "admin-gmaps-leads" */ './Internals/gmapsLeads/GmapsLeads.js'));

const FloatingButtons = lazy(() => import(/* webpackChunkName: "floating-buttons" */ './Internals/clientComponent/floating/floatingButtons.js'));
const FloatingAdCard = lazy(() => import(/* webpackChunkName: "floating-ad" */ './Internals/clientComponent/floating/floatingAdCard.js'));
const HomePopupAd = lazy(() => import(/* webpackChunkName: "home-popup-ad" */ './Internals/clientComponent/popup/HomePopupAd.js'));
const OTPLoginModal = lazy(() => import(/* webpackChunkName: "otp-modal" */ './Internals/clientComponent/AddBusinessModel.js'));

const CategoryRouter = lazy(() => import(/* webpackChunkName: "category-router" */ './Internals/clientComponent/categories/categoryRouter.js'));
const BlogDetail = lazy(() => import(/* webpackChunkName: "blog-detail" */ './Internals/clientComponent/relatedBlogs/blogDetails/blogDetails.js'));
const MaintenanceOverlay = lazy(() => import(/* webpackChunkName: "maintenance" */ './components/MaintenanceOverlay.js'));

const DynamicLoader = memo(() => {
  const { pathname } = useLocation();

  // Don't show skeleton on home page - it causes layout shift
  if (pathname === "/") {
    return null;
  }

  // Show minimal shimmer for other pages
  return <ShimmerSkeleton />;
});

const ComingSoon = ({ title }) => (
  <div style={{ textAlign: 'center', marginTop: '20%' }}>
    <h2>{title} Page Coming Soon!</h2>
  </div>
);

function AppRoutes({
  isAuthenticated,
  setIsAuthenticated,
  openLoginModal,
  setOpenLoginModal,
}) {
  const footerRoutes = [
    ['aboutus', <AboutUsPage />],
    ['testimonials', <Testimonials />],
    ['feedbacks', <FeedbackComponent />],
    ['customercare', <CustomerCareComponent />],
    ['portfolio', <Portfolio />],
    ['terms', <TermsAndConditions />],
    ['privacy', <PrivacyPolicy />],
    ['refund', <RefundPolicy />],
    ['enquiry', <EnquiryNow />],
    ['deleteaccount', <DeleteAccount />],
    ['knowledgebase', <KnowledgeBasePage />],
    ['web', <WebDevSection />],
    ['digital', <DigitalMarketing />],
    ['graphic', <GraphicDesign />],
    ['seo', <Seo />],
  ];

  return (
    <>
      <Suspense fallback={<DynamicLoader />}>
        <GlobalDrawer />
        <FloatingAdCard />
        <HomePopupAd />
        <FloatingButtons onRequireLogin={() => setOpenLoginModal(true)} />
      </Suspense>

      <Suspense fallback={<DynamicLoader />}>
        <Routes>
          <Route path="/" element={<BusinessListing />} />
          <Route
            path="/admin"
            element={
              <Login
                setIsAuthenticated={setIsAuthenticated}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/free-listing" element={<FreeListingPage />} />
          <Route path="/advertise" element={<AdvertisePage />} />
          <Route path="/events" element={<EventCarousel />} />
          <Route path="/events/:eventSlug/:id" element={<EventDetails />} />
          <Route path="/user/search-history" element={<LeadsCardHistory />} />
          <Route path="/business-enquiry" element={<BusinessEnquiry />} />
          <Route path="/payment-status/:transactionId" element={<PaymentStatus />} />
          <Route path="/write-review/:businessId/:ratingValue" element={<WriteReviewPage />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />

          {userMenuItems.map((item) => {
            const Component =
              item.component || (() => <ComingSoon title={item.name} />);
            return (
              <Route
                key={item.path}
                path={item.path}
                element={<Component />}
              />
            );
          })}

          {footerRoutes.map(([path, element]) => (
            <Route key={path} path={path} element={element} />
          ))}

          <Route path="/:location/:category" element={<CategoryRouter />} />
          <Route
            path="/:location/:category/:subcategory"
            element={<SearchResults />}
          />

          <Route
            path="/business/:location/:businessSlug/:id"
            element={<BusinessDetails />}
          />

          <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/dashboard" element={<Dashboard />}>

              <Route index element={<MainGrid />} />
              <Route path="profile" element={<Profile />} />

              <Route element={<PermissionRoute />}>
                <Route path="clients" element={<Clients />} />
                <Route path="business" element={<Business />} />
                <Route path="category" element={<Category />} />
                <Route path="location" element={<Location />} />
                <Route path="seo" element={<SeoData />} />
                <Route path="seopagecontent" element={<SeoPageContent />} />
                <Route path="seopagecontentblogs" element={<SeoPageContentBlogs />} />
                <Route path="enquiry" element={<EnquiryPage />} />
                <Route path="customer-care" element={<AdminCustomerCareChat />} />
                <Route path="advertisements" element={<AdvertisementPage />} />
                <Route path="event-category" element={<EventCategory />} />
                <Route path="event-location" element={<EventLocation />} />
                <Route path="event-advertisement" element={<EventAdvertisement />} />
                <Route path="event-creation" element={<EventCreation />} />
                <Route path="mni-data" element={<MRPDatas />} />
                <Route path="terms-conditions-data" element={<TermsAndConditionsDatas />} />
                <Route path="fcm-marketing" element={<FCMMarketing />} />
                <Route path="user" element={<User />} />
                <Route path="roles" element={<Roles />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="category-display" element={<CategoryDisplaySettings />} />
                <Route path="gmaps-leads" element={<GmapsLeads />} />
              </Route>

            </Route>
          </Route>
          {/* ─────────────────────────────────────────────────────────────── */}
        </Routes>

        {/* Login Modal */}
        <OTPLoginModal
          open={openLoginModal}
          handleClose={() => setOpenLoginModal(false)}
        />
      </Suspense>
    </>
  );
}

/* -------------------------------- App ------------------------------------ */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);

  const dispatch = useDispatch();

  /* Fast Auth Check - Synchronous, non-blocking */
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      setIsAuthenticated(true);
    }

    setAuthChecked(true);
  }, []);

  /* Deferred Auth & Data Loading - After first paint */
  useEffect(() => {
    const loadDataAfterPaint = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const clientAccessToken = localStorage.getItem('clientAccessToken');

      try {
        if (clientAccessToken) {
          await dispatch(clientLogin());
        }

        if (accessToken && refreshToken) {
          const result = await dispatch(relogin());
          if (result?.accessToken) {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        localStorage.clear();
        setIsAuthenticated(false);
      }

      dispatch(fetchMatchedLeads());
    };

    if (authChecked) {
      requestIdleCallback(loadDataAfterPaint, { timeout: 3000 });
    }
  }, [dispatch, authChecked]);

  /* WebSocket Listener for Maintenance Mode */
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const ws = connectSocket(token);

      const handleMaintenanceMode = (data) => {
        if (data?.active) {
          dispatch(setMaintenanceModeOn());
        } else {
          dispatch(setMaintenanceModeOff());
        }
      };

      if (ws) {
        ws.on('app:maintenance', handleMaintenanceMode);

        return () => {
          if (ws) {
            ws.off('app:maintenance', handleMaintenanceMode);
          }
        };
      }
    } catch (error) {
      console.warn('Failed to set up maintenance mode listener:', error);
    }
  }, [isAuthenticated, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* <VideoPreloader /> */}

      <GlobalLoaderWrapper>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          autoHideDuration={4000}
          preventDuplicate
        >
          <Router>
            <RouteChangeTracker />
            <ScrollToTop />

            <Suspense fallback={null}>
              <MaintenanceOverlay />
            </Suspense>

            <AppRoutes
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
              openLoginModal={openLoginModal}
              setOpenLoginModal={setOpenLoginModal}
            />
          </Router>
        </SnackbarProvider>
      </GlobalLoaderWrapper>
    </ThemeProvider>
  );
}

export default memo(App);
