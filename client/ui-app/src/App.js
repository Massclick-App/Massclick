import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from './redux/actions/authAction.js';
import { clientLogin } from './redux/actions/clientAuthAction.js';
import { fetchMatchedLeads } from './redux/actions/leadsAction.js';
import { setMaintenanceModeOn, setMaintenanceModeOff } from './redux/reducers/maintenanceReducer.js';
import { connectSocket } from './services/socketService.js';
import {
  clearAdminSession,
  getAuthSnapshot,
  subscribeAuthState,
} from './auth/authStore.js';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider, useSnackbar } from 'notistack';

import theme from './Internals/clientComponent/theme.js';
import PrivateRoute from './PrivateRoute';
import PermissionRoute from './PermissionRoute';
import ScrollToTop from './scrollTop.js';
import RouteChangeTracker from './RouteChangeTracker.js';
import { userMenuItems } from './Internals/clientComponent/categoryBar.js';

import ShimmerSkeleton from './Internals/clientComponent/shimmerSkeleton.js';
import GlobalLoaderWrapper from './Internals/clientComponent/common/GlobalLoaderWrapper.js';
import { scheduleIdleCallback } from './utils/scheduleIdleCallback.js';

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
const PublicizePage = lazy(() => import(/* webpackChunkName: "publicize" */ './Internals/clientComponent/publicize/publicize.js'));
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
const AdminDataAnalytics = lazy(() => import(/* webpackChunkName: "admin-data-analytics" */ './components/adminAnalytics/AdminDataAnalytics.js'));

const MRPDatas = lazy(() => import(/* webpackChunkName: "admin-mrp" */ './Internals/MRPDATA/mrpData.js'));
const FCMMarketing = lazy(() => import(/* webpackChunkName: "admin-fcm" */ './Internals/FCMMarketing/FCMMarketing.js'));
const SystemSettings = lazy(() => import(/* webpackChunkName: "admin-settings" */ './Internals/SystemSettings/SystemSettings.js'));
const CategoryDisplaySettings = lazy(() => import(/* webpackChunkName: "admin-cat-display" */ './Internals/CategoryDisplaySettings/CategoryDisplaySettings.js'));
const GmapsLeads = lazy(() => import(/* webpackChunkName: "admin-gmaps-leads" */ './Internals/gmapsLeads/GmapsLeads.js'));
const Msg91Analytics = lazy(() => import(/* webpackChunkName: "admin-msg91-analytics" */ './Internals/Msg91Analytics/Msg91Analytics.js'));
const AuthConsole = lazy(() => import(/* webpackChunkName: "admin-auth-console" */ './Internals/AuthConsole/AuthConsole.js'));

const FloatingButtons = lazy(() => import(/* webpackChunkName: "floating-buttons" */ './Internals/clientComponent/floating/floatingButtons.js'));
// Google ad surfaces are intentionally disabled for now.
// Uncomment these lines if you want to restore them later.
// const FloatingAdCard = lazy(() => import(/* webpackChunkName: "floating-ad" */ './Internals/clientComponent/floating/floatingAdCard.js'));
// const HomePopupAd = lazy(() => import(/* webpackChunkName: "home-popup-ad" */ './Internals/clientComponent/popup/HomePopupAd.js'));
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

const RateLimitNotifier = memo(() => {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const handleRateLimit = (event) => {
      const detail = event?.detail || {};
      const waitText = detail.retryAfterSeconds
        ? ` Try again in ${detail.retryAfterSeconds} second${detail.retryAfterSeconds === 1 ? "" : "s"}.`
        : "";

      enqueueSnackbar(`${detail.message || "Too many requests."}${waitText}`, {
        variant: "warning",
        preventDuplicate: true,
        autoHideDuration: 6000,
      });
    };

    window.addEventListener("api:rate-limited", handleRateLimit);
    return () => window.removeEventListener("api:rate-limited", handleRateLimit);
  }, [enqueueSnackbar]);

  return null;
});

const ComingSoon = ({ title }) => (
  <div style={{ textAlign: 'center', marginTop: '20%' }}>
    <h2>{title} Page Coming Soon!</h2>
  </div>
);

const getRealtimeSocketToken = (snapshot = getAuthSnapshot()) =>
  snapshot?.admin?.accessToken ||
  snapshot?.customer?.token ||
  snapshot?.publicClient?.accessToken ||
  null;

function AppRoutes({
  isAuthenticated,
  authReady,
  showGlobalChrome,
  setIsAuthenticated,
  openLoginModal,
  setOpenLoginModal,
}) {
  const location = useLocation();
  const pathname = location.pathname || "";
  const isAdminSurface = pathname === "/admin" || pathname.startsWith("/dashboard");
  const authSnapshot = getAuthSnapshot();
  const shouldHoldAdminRoute =
    !authReady && isAdminSurface && Boolean(authSnapshot.admin.refreshToken);

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
      {!isAdminSurface && showGlobalChrome && (
        <Suspense fallback={<DynamicLoader />}>
          <GlobalDrawer />
          {/* Google ad widgets are disabled for now. Re-enable when needed. */}
          {/*
          <FloatingAdCard />
          <HomePopupAd />
          */}
          <FloatingButtons onRequireLogin={() => setOpenLoginModal(true)} />
        </Suspense>
      )}

      <Suspense fallback={<DynamicLoader />}>
        <Routes>
          <Route path="/" element={<BusinessListing />} />
          <Route
            path="/admin"
            element={
              shouldHoldAdminRoute ? null : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
              <Login
                setIsAuthenticated={setIsAuthenticated}
                isAuthenticated={isAuthenticated}
              />
              )
            }
          />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/free-listing" element={<FreeListingPage />} />
          <Route path="/publicize" element={<PublicizePage />} />
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

          <Route element={<PrivateRoute isAuthenticated={isAuthenticated} isReady={authReady} />}>
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
                <Route path="data-analytics" element={<AdminDataAnalytics />} />
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
                <Route path="auth-console" element={<AuthConsole />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="category-display" element={<CategoryDisplaySettings />} />
                <Route path="gmaps-leads" element={<GmapsLeads />} />
                <Route path="msg91-analytics" element={<Msg91Analytics />} />
              </Route>

            </Route>
          </Route>
          {/* ─────────────────────────────────────────────────────────────── */}
        </Routes>

        {/* Login Modal */}
        {!isAdminSurface && (
          <OTPLoginModal
            open={openLoginModal}
            handleClose={() => setOpenLoginModal(false)}
          />
        )}
      </Suspense>
    </>
  );
}

/* -------------------------------- App ------------------------------------ */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realtimeSocketToken, setRealtimeSocketToken] = useState(() => getRealtimeSocketToken());
  const [authReady, setAuthReady] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const [showGlobalChrome, setShowGlobalChrome] = useState(false);

  const dispatch = useDispatch();

  /* Initial auth snapshot */
  useEffect(() => {
    const snapshot = getAuthSnapshot();
    setIsAuthenticated(snapshot.admin.isAuthenticated);
    setRealtimeSocketToken(getRealtimeSocketToken(snapshot));
  }, []);

  /* Admin session bootstrap */
  useEffect(() => {
    let cancelled = false;

    const bootstrapAdminSession = async () => {
      const snapshot = getAuthSnapshot();

      if (!snapshot.admin.refreshToken) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      try {
        const result = await dispatch(relogin());
        if (!cancelled) {
          setIsAuthenticated(Boolean(result?.accessToken));
        }
      } catch (error) {
        if (!cancelled) {
          clearAdminSession();
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    bootstrapAdminSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((snapshot) => {
      setIsAuthenticated(snapshot.admin.isAuthenticated);
      setRealtimeSocketToken(getRealtimeSocketToken(snapshot));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const idleHandle = scheduleIdleCallback(
      () => setShowGlobalChrome(true),
      { timeout: 2500 },
    );

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      window.clearTimeout(idleHandle);
    };
  }, []);

  /* Deferred public bootstrap */
  useEffect(() => {
    const loadPublicBootstrap = async () => {
      try {
        await dispatch(clientLogin());
      } catch (error) {
        // Public-client bootstrap failures should not destabilize admin auth routes.
      }

      if (!window.location.pathname.startsWith("/dashboard") && window.location.pathname !== "/admin") {
        dispatch(fetchMatchedLeads());
      }
    };

    if (authReady) {
      scheduleIdleCallback(loadPublicBootstrap, { timeout: 3000 });
    }
  }, [dispatch, authReady]);

  /* WebSocket Listener for Maintenance Mode */
  useEffect(() => {
    if (!realtimeSocketToken) return;

    try {
      const ws = connectSocket(realtimeSocketToken);

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
  }, [realtimeSocketToken, dispatch]);

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
          <RateLimitNotifier />
          <Router>
            <RouteChangeTracker />
            <ScrollToTop />

            <Suspense fallback={null}>
              <MaintenanceOverlay />
            </Suspense>

            <AppRoutes
              isAuthenticated={isAuthenticated}
              authReady={authReady}
              showGlobalChrome={showGlobalChrome}
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
