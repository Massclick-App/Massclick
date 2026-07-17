import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from './redux/actions/authAction.js';
import { clientLogin } from './redux/actions/clientAuthAction.js';
import { fetchMatchedLeads } from './redux/actions/leadsAction.js';
import { setMaintenanceModeOn, setMaintenanceModeOff } from './redux/reducers/maintenanceReducer.js';
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
import { isBusinessPeopleUser } from './utils/userUtils.js';

import ShimmerSkeleton from './Internals/clientComponent/shimmerSkeleton.js';
import GlobalLoaderWrapper from './Internals/clientComponent/common/GlobalLoaderWrapper.js';
import { scheduleIdleCallback } from './utils/scheduleIdleCallback.js';
import { useDrawer } from './Internals/clientComponent/Drawer/drawerContext.js';
import MobileHomeDock from './Internals/clientComponent/mobileHomeDock/MobileHomeDock.js';

const Dashboard = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ './Dashboard'));
const Login = lazy(() => import(/* webpackChunkName: "admin-login" */ './Internals/Login/login.js'));
const User = lazy(() => import(/* webpackChunkName: "admin-users" */ './Internals/user/Users.js'));
const Clients = lazy(() => import(/* webpackChunkName: "admin-clients" */ './Internals/clients/Client.js'));
const Business = lazy(() => import(/* webpackChunkName: "admin-business" */ './Internals/business/Business.js'));
const Category = lazy(() => import(/* webpackChunkName: "admin-category" */ './Internals/categories/Category.js'));
const Roles = lazy(() => import(/* webpackChunkName: "admin-roles" */ './Internals/Roles/Roles.js'));
const Location = lazy(() => import(/* webpackChunkName: "admin-location" */ './Internals/location/Location.js'));
const MasterLocation = lazy(() => import(/* webpackChunkName: "admin-master-location" */ './Internals/location/MasterLocation.js'));
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
const AuthorProfile = lazy(() => import(/* webpackChunkName: "author-profile" */ './Internals/clientComponent/authorProfile/authorProfile.js'));

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
const AuthorMaster = lazy(() => import(/* webpackChunkName: "admin-author-master" */ './Internals/seoData/authorMaster/authorMaster.js'));
const AdminDataAnalytics = lazy(() => import(/* webpackChunkName: "admin-data-analytics" */ './components/adminAnalytics/AdminDataAnalytics.js'));
const UnifiedAnalytics = lazy(() => import(/* webpackChunkName: "admin-unified-analytics" */ './components/unifiedAnalytics/UnifiedAnalytics.js'));
const SiteAnalytics = lazy(() => import(/* webpackChunkName: "admin-site-analytics" */ './components/siteAnalytics/SiteAnalytics.js'));

const MRPDatas = lazy(() => import(/* webpackChunkName: "admin-mrp" */ './Internals/MRPDATA/mrpData.js'));
const FCMMarketing = lazy(() => import(/* webpackChunkName: "admin-fcm" */ './Internals/FCMMarketing/FCMMarketing.js'));
const SystemSettings = lazy(() => import(/* webpackChunkName: "admin-settings" */ './Internals/SystemSettings/SystemSettings.js'));
const CategoryDisplaySettings = lazy(() => import(/* webpackChunkName: "admin-cat-display" */ './Internals/CategoryDisplaySettings/CategoryDisplaySettings.js'));
const GmapsLeads = lazy(() => import(/* webpackChunkName: "admin-gmaps-leads" */ './Internals/gmapsLeads/GmapsLeads.js'));
const Msg91Analytics = lazy(() => import(/* webpackChunkName: "admin-msg91-analytics" */ './Internals/Msg91Analytics/Msg91Analytics.js'));
const AuthConsole = lazy(() => import(/* webpackChunkName: "admin-auth-console" */ './Internals/AuthConsole/AuthConsole.js'));
const PublicUserCounterAdmin = lazy(() => import(/* webpackChunkName: "admin-public-user-counter" */ './Internals/PublicUserCounter/PublicUserCounterAdmin.js'));
const GscAnalytics = lazy(() => import(/* webpackChunkName: "admin-gsc" */ './Internals/gscAnalytics/gscAnalytics.js'));
const Ga4Analytics = lazy(() => import(/* webpackChunkName: "admin-ga4" */ './Internals/ga4Analytics/ga4Analytics.js'));
const Quotation = lazy(() => import(/* webpackChunkName: "admin-quotation" */ './Internals/quotation/Quotation.js'));
const MassclickDocuments = lazy(() => import(/* webpackChunkName: "admin-documents" */ './Internals/massclickDocuments/massclickDocuments.js'));
const MassclickFeedAdmin = lazy(() => import(/* webpackChunkName: "admin-feed" */ './Internals/massclickFeed/massclickFeed.js'));

const UserDashboardPage = lazy(() => import(/* webpackChunkName: "user-dashboard" */ './Internals/clientComponent/userMenu/DashboardPage/Dashboard.js'));
const UserEditProfilePage = lazy(() => import(/* webpackChunkName: "user-edit-profile" */ './Internals/clientComponent/userMenu/EditProfile/EditProfilePage.js'));
const UserMRPPage = lazy(() => import(/* webpackChunkName: "user-mni" */ './Internals/clientComponent/MRP/mrp.js'));
const UserMarketingMaterialsPage = lazy(() => import(/* webpackChunkName: "user-marketing-materials" */ './Internals/clientComponent/userMenu/VisitingCard/MarketingMaterialsPage.js'));
const UserFavoritesPage = lazy(() => import(/* webpackChunkName: "user-favorites" */ './Internals/clientComponent/userMenu/FavouritePage/FavouritePage.js'));
const UserCustomerServicePage = lazy(() => import(/* webpackChunkName: "user-customer-service" */ './Internals/clientComponent/userMenu/CustomerService/CustomerServicePage.js'));
const UserPolicyPage = lazy(() => import(/* webpackChunkName: "user-policy" */ './Internals/clientComponent/userMenu/PolicyPage/PolicyPage.js'));
const UserFeedbackPage = lazy(() => import(/* webpackChunkName: "user-feedback" */ './Internals/clientComponent/userMenu/FeedbackPage/FeedBackPage.js'));
const UserHelpPage = lazy(() => import(/* webpackChunkName: "user-help" */ './Internals/clientComponent/userMenu/HelpPage/HelpPage.js'));
const UserMassclickDocumentsPage = lazy(() => import(/* webpackChunkName: "user-documents" */ './Internals/clientComponent/userMenu/MassclickDocuments/MassclickDocumentsPage.js'));
const UserMassclickFeedPage = lazy(() => import(/* webpackChunkName: "user-feed" */ './Internals/clientComponent/userMenu/MassclickFeed/MassclickFeedPage.js'));

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

const getStoredCustomerUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

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
  const { hasEverOpened: hasDrawerEverOpened } = useDrawer();
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
          {hasDrawerEverOpened && <GlobalDrawer />}
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
          <Route path="/author/:slug" element={<AuthorProfile />} />

          <Route path="/user_dashboard" element={<UserDashboardPage />} />
          <Route path="/user_edit-profile" element={<UserEditProfilePage />} />
          <Route
            path="/user_mni"
            element={isBusinessPeopleUser(getStoredCustomerUser()) ? <UserMRPPage /> : <Navigate to="/user_dashboard" replace />}
          />
          <Route
            path="/user_marketing-materials"
            element={isBusinessPeopleUser(getStoredCustomerUser()) ? <UserMarketingMaterialsPage /> : <Navigate to="/user_dashboard" replace />}
          />
          <Route path="/user_visiting-card" element={<Navigate to="/user_marketing-materials" replace />} />
          <Route path="/user_letterhead" element={<Navigate to="/user_marketing-materials?type=letterhead" replace />} />
          <Route path="/user_quotation" element={<Navigate to="/user_marketing-materials?type=quotation" replace />} />
          <Route path="/user_massclick-documents" element={<UserMassclickDocumentsPage />} />
          <Route path="/user_feed" element={<UserMassclickFeedPage />} />
          <Route path="/user_favorites" element={<UserFavoritesPage />} />
          <Route path="/user_customer-service" element={<UserCustomerServicePage />} />
          <Route path="/user_policy" element={<UserPolicyPage />} />
          <Route path="/user_feedback" element={<UserFeedbackPage />} />
          <Route path="/user_help" element={<UserHelpPage />} />

          {footerRoutes.map(([path, element]) => (
            <Route key={path} path={path} element={element} />
          ))}

          <Route path="/:location" element={<Navigate to="/" replace />} />
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
                <Route path="master-location" element={<MasterLocation />} />
                <Route path="seo" element={<SeoData />} />
                <Route path="seopagecontent" element={<SeoPageContent />} />
                <Route path="seopagecontentblogs" element={<SeoPageContentBlogs />} />
                <Route path="authors" element={<AuthorMaster />} />
                <Route path="data-analytics" element={<AdminDataAnalytics />} />
                <Route path="analytics-overview" element={<UnifiedAnalytics />} />
                <Route path="site-analytics" element={<SiteAnalytics />} />
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
                <Route path="public-users-count" element={<PublicUserCounterAdmin />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="category-display" element={<CategoryDisplaySettings />} />
                <Route path="gmaps-leads" element={<GmapsLeads />} />
                <Route path="msg91-analytics" element={<Msg91Analytics />} />
                <Route path="gsc-analytics" element={<GscAnalytics />} />
                <Route path="ga4-analytics" element={<Ga4Analytics />} />
                <Route path="quotation" element={<Quotation />} />
                <Route path="documents" element={<MassclickDocuments />} />
                <Route path="feed" element={<MassclickFeedAdmin />} />
              </Route>

            </Route>
          </Route>
          {/* ─────────────────────────────────────────────────────────────── */}
        </Routes>

        {/* Login Modal — only mount chunk after first open */}
        {!isAdminSurface && openLoginModal && (
          <OTPLoginModal
            open={true}
            handleClose={() => setOpenLoginModal(false)}
          />
        )}
      </Suspense>
      {!isAdminSurface && (
        <MobileHomeDock
          isLoggedIn={Boolean(getAuthSnapshot()?.customer?.token || localStorage.getItem("authToken"))}
          onRequireLogin={() => setOpenLoginModal(true)}
        />
      )}
    </>
  );
}

/* -------------------------------- App ------------------- ----------------- */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realtimeSocketToken, setRealtimeSocketToken] = useState(() => getRealtimeSocketToken());
  const [authReady, setAuthReady] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const [showGlobalChrome, setShowGlobalChrome] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    const openCustomerLogin = () => setOpenLoginModal(true);
    window.addEventListener("massclick:request-login", openCustomerLogin);
    return () =>
      window.removeEventListener("massclick:request-login", openCustomerLogin);
  }, []);

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

    let cleanup;
    const handleMaintenanceMode = (data) => {
      if (data?.active) {
        dispatch(setMaintenanceModeOn());
      } else {
        dispatch(setMaintenanceModeOff());
      }
    };

    import('./services/socketService.js').then(({ connectSocket }) => {
      try {
        const ws = connectSocket(realtimeSocketToken);
        if (ws) {
          ws.on('app:maintenance', handleMaintenanceMode);
          cleanup = () => ws.off('app:maintenance', handleMaintenanceMode);
        }
      } catch (error) {
        }
    });

    return () => cleanup?.();
  }, [realtimeSocketToken, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

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
