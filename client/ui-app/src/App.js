import React, { useState, useEffect, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from 'state/actions/authAction.js';
import { clientLogin } from 'state/actions/clientAuthAction.js';
import { fetchMatchedLeads } from 'state/actions/leadsAction.js';
import { setMaintenanceModeOn, setMaintenanceModeOff } from 'state/reducers/maintenanceReducer.js';
import {
  clearAdminSession,
  getAuthSnapshot,
  subscribeAuthState,
} from 'app/auth/authStore.js';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  SnackbarProvider,
  useSnackbar,
} from 'shared/components/snackbar/SnackbarProvider.js';

import {
  AdminPages,
  AppShellSurfaces,
  FooterPages,
  FOOTER_ROUTES,
  PublicPages,
  UserPages,
} from 'app/routes/lazyRouteComponents.js';
import theme from 'shared/theme/publicTheme.js';
import PrivateRoute from 'app/routes/PrivateRoute.js';
import PermissionRoute from 'app/routes/PermissionRoute.js';
import ScrollToTop from 'app/routes/ScrollToTop.js';
import RouteChangeTracker from 'app/routes/RouteChangeTracker.js';
import { isBusinessPeopleUser } from 'shared/utils/userUtils.js';

import GlobalLoaderWrapper from 'features/public/common/GlobalLoaderWrapper.js';
import RouteLoadingFallback from 'shared/components/RouteLoadingFallback.js';
import { scheduleIdleCallback } from 'shared/utils/scheduleIdleCallback.js';
import { useDrawer } from 'features/public/drawer/drawerContext.js';

const DEFERRED_CHROME_EVENTS = [
  "pointerdown",
  "touchstart",
  "keydown",
  "scroll",
];

const isSmallMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(max-width: 767px)")?.matches;

const {
  Dashboard,
  Login,
  User,
  Clients,
  Business,
  Category,
  Roles,
  Location,
  MasterLocation,
  LocationCoverage,
  TermsAndConditionsDatas,
  LegalDocuments,
  MainGrid,
  EnquiryPage,
  SearchRequestsAdmin,
  RewardAdmin,
  RewardsConceptPage,
  RewardClaimsAdmin,
  AdminCustomerCareChat,
  AdvertisementPage,
  EventCategory,
  EventLocation,
  EventAdvertisement,
  EventCreation,
  MassclickEvent,
  SeoData,
  SeoPageContent,
  SeoPageContentBlogs,
  SeoTemplate,
  AuthorMaster,
  AdminDataAnalytics,
  UnifiedAnalytics,
  SiteAnalytics,
  AppAnalytics,
  BusinessPersonReport,
  MRPDatas,
  FCMMarketing,
  SystemSettings,
  CategoryDisplaySettings,
  GmapsLeads,
  BusinessDuplicates,
  Msg91Analytics,
  AuthControl,
  PublicUserCounterAdmin,
  HiringAdmin,
  GscAnalytics,
  Ga4Analytics,
  Quotation,
  MassclickDocuments,
  MassclickFeedAdmin,
} = AdminPages;

const {
  BusinessListing,
  BusinessDetails,
  EventCarousel,
  EventDetails,
  WriteReviewPage,
  PaymentStatus,
  LeadsPage,
  PublicizePage,
  FreeListingPage,
  LeadsCardHistory,
  BusinessEnquiry,
  AuthorProfile,
  RewardClaimPage,
  MassclickEventDetails,
  DistrictRouteResolver,
  CategoriesPage,
  BlogDetail,
  Profile,
} = PublicPages;

const {
  UserDashboardPage,
  UserEditProfilePage,
  UserMRPPage,
  UserMarketingMaterialsPage,
  UserFavoritesPage,
  UserCustomerServicePage,
  UserPolicyPage,
  UserFeedbackPage,
  UserHelpPage,
  UserMassclickDocumentsPage,
  UserMassclickFeedPage,
  SpotlightWorkspacePage,
  SpotlightCreatePage,
  UserRewardsPage,
} = UserPages;

const {
  GlobalDrawer,
  FloatingButtons,
  MobileHomeDock,
  AppInstallPrompt,
  OTPLoginModal,
  MaintenanceOverlay,
} = AppShellSurfaces;

const {
  JobResultsPage,
  JobApplicationPage,
} = FooterPages;

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

const getStoredCustomerUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const getRealtimeSocketToken = (
  snapshot = getAuthSnapshot(),
  pathname = typeof window === "undefined" ? "" : window.location.pathname || ""
) => {
  const isAdminSurface = pathname === "/admin" || pathname.startsWith("/dashboard");

  return isAdminSurface
    ? snapshot?.admin?.accessToken || null
    : snapshot?.customer?.token || snapshot?.admin?.accessToken || null;
};

function AppRoutes({
  isAuthenticated,
  authReady,
  showGlobalChrome,
  setIsAuthenticated,
  setRealtimeSocketToken,
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

  useEffect(() => {
    setRealtimeSocketToken(getRealtimeSocketToken(getAuthSnapshot(), pathname));
  }, [pathname, setRealtimeSocketToken]);

  return (
    <>
      {!isAdminSurface && showGlobalChrome && (
        <Suspense fallback={null}>
          {hasDrawerEverOpened && <GlobalDrawer />}
          {/* Google ad widgets are disabled for now. Re-enable when needed. */}
          {/*
          <FloatingAdCard />
          <HomePopupAd />
          */}
          <FloatingButtons onRequireLogin={() => setOpenLoginModal(true)} />
        </Suspense>
      )}

      <Suspense fallback={<RouteLoadingFallback />}>
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
          <Route path="/massclick-events/:id" element={<MassclickEventDetails />} />
          <Route path="/user/search-history" element={<LeadsCardHistory />} />
          <Route path="/business-enquiry" element={<BusinessEnquiry />} />
          <Route path="/claim-rewards" element={<RewardClaimPage />} />
          <Route path="/reward-members" element={<Navigate to="/user_rewards#member-points" replace />} />
          <Route path="/payment-status/:transactionId" element={<PaymentStatus />} />
          <Route path="/write-review/:businessId/:ratingValue" element={<WriteReviewPage />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/author/:slug" element={<AuthorProfile />} />
          <Route path="/careers/jobs" element={<JobResultsPage />} />
          <Route path="/careers/jobs/:idOrSlug" element={<JobApplicationPage />} />

          <Route path="/user_dashboard" element={<UserDashboardPage />} />
          <Route path="/user_edit-profile" element={<UserEditProfilePage />} />
          <Route path="/user_edit-user-profile" element={<UserEditProfilePage mode="user" />} />
          <Route
            path="/user_mni"
            element={isBusinessPeopleUser(getStoredCustomerUser()) ? <UserMRPPage /> : <Navigate to="/user_dashboard" replace />}
          />
          <Route
            path="/user_marketing-materials"
            element={isBusinessPeopleUser(getStoredCustomerUser()) ? <UserMarketingMaterialsPage /> : <Navigate to="/user_dashboard" replace />}
          />
          <Route path="/user/marketing-materials" element={<Navigate to="/user_marketing-materials" replace />} />
          <Route path="/user_visiting-card" element={<Navigate to="/user_marketing-materials" replace />} />
          <Route path="/user_letterhead" element={<Navigate to="/user_marketing-materials?type=letterhead" replace />} />
          <Route path="/user_quotation" element={<Navigate to="/user_marketing-materials?type=quotation" replace />} />
          <Route path="/user_voucher" element={<Navigate to="/user_marketing-materials?type=voucher" replace />} />
          <Route path="/user_massclick-documents" element={<UserMassclickDocumentsPage />} />
          <Route path="/user_feed" element={<UserMassclickFeedPage />} />
          <Route path="/user_spotlight/calendar" element={<SpotlightWorkspacePage mode="calendar" />} />
          <Route path="/user_spotlight/create" element={<SpotlightCreatePage />} />
          <Route path="/user_spotlight/media" element={<SpotlightWorkspacePage mode="media" />} />
          <Route path="/user_spotlight/posts" element={<SpotlightWorkspacePage mode="posts" />} />
          <Route path="/user_spotlight/settings" element={<SpotlightWorkspacePage mode="settings" />} />
          <Route path="/user_favorites" element={<UserFavoritesPage />} />
          <Route path="/user_rewards" element={<UserRewardsPage />} />
          <Route path="/user_customer-service" element={<UserCustomerServicePage />} />
          <Route path="/user_policy" element={<UserPolicyPage />} />
          <Route path="/user_feedback" element={<UserFeedbackPage />} />
          <Route path="/user_help" element={<UserHelpPage />} />

          {FOOTER_ROUTES.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}

          <Route path="/:district" element={<CategoriesPage mode="districtLanding" />} />
          <Route
            path="/:district/:p2"
            element={<DistrictRouteResolver />}
          />
          <Route
            path="/:district/:p2/:p3"
            element={<DistrictRouteResolver />}
          />
          <Route
            path="/:district/:p2/:p3/:p4"
            element={<DistrictRouteResolver />}
          />

          {/* Current shape. The trailing segment is <name-slug>-<publicId>;
              the page resolves by the publicId and the slug is cosmetic. */}
          <Route
            path="/business/:district/:businessSegment"
            element={<BusinessDetails />}
          />
          {/* Superseded shapes, kept live so already-indexed URLs and printed
              QR codes still render while the server 301s them to the above.
              Removing them would turn those redirects into dead ends for any
              business that has no publicId yet. */}
          <Route
            path="/business/:district/:location/:businessSlug/:id"
            element={<BusinessDetails />}
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
                <Route path="location-coverage" element={<LocationCoverage />} />
                <Route path="seo" element={<SeoData />} />
                <Route path="seopagecontent" element={<SeoPageContent />} />
                <Route path="seopagecontentblogs" element={<SeoPageContentBlogs />} />
                <Route path="seotemplates" element={<SeoTemplate />} />
                <Route path="authors" element={<AuthorMaster />} />
                <Route path="data-analytics" element={<AdminDataAnalytics />} />
                <Route path="analytics-overview" element={<UnifiedAnalytics />} />
                <Route path="site-analytics" element={<SiteAnalytics />} />
                <Route path="app-analytics" element={<AppAnalytics />} />
                <Route path="business-person-report" element={<BusinessPersonReport />} />
                <Route path="enquiry" element={<EnquiryPage />} />
                <Route path="search-requests" element={<SearchRequestsAdmin />} />
                <Route path="rewards" element={<RewardAdmin />} />
                <Route path="reward-claims" element={<RewardClaimsAdmin />} />
                <Route path="rewards-concept" element={<RewardsConceptPage />} />
                <Route path="customer-care" element={<AdminCustomerCareChat />} />
                <Route path="advertisements" element={<AdvertisementPage />} />
                <Route path="event-category" element={<EventCategory />} />
                <Route path="event-location" element={<EventLocation />} />
                <Route path="event-advertisement" element={<EventAdvertisement />} />
                <Route path="event-creation" element={<EventCreation />} />
                <Route path="massclick-events" element={<MassclickEvent />} />
                <Route path="mni-data" element={<MRPDatas />} />
                <Route path="terms-conditions-data" element={<TermsAndConditionsDatas />} />
                <Route path="legal-documents" element={<LegalDocuments />} />
                <Route path="hiring" element={<HiringAdmin />} />
                <Route path="fcm-marketing" element={<FCMMarketing />} />
                <Route path="user" element={<User />} />
                <Route path="roles" element={<Roles />} />
                <Route path="auth-console" element={<AuthControl />} />
                <Route path="public-users-count" element={<PublicUserCounterAdmin />} />
                <Route path="system-settings" element={<SystemSettings />} />
                <Route path="category-display" element={<CategoryDisplaySettings />} />
                <Route path="gmaps-leads" element={<GmapsLeads />} />
                <Route path="business-duplicates" element={<BusinessDuplicates />} />
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
      {!isAdminSurface && showGlobalChrome && (
        <Suspense fallback={null}>
          <AppInstallPrompt />
          <MobileHomeDock
            isLoggedIn={Boolean(getAuthSnapshot()?.customer?.token || localStorage.getItem("authToken"))}
            onRequireLogin={() => setOpenLoginModal(true)}
          />
        </Suspense>
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
    let idleHandle = null;
    let fallbackTimer = null;

    const showChrome = () => {
      DEFERRED_CHROME_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, showChrome);
      });
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      setShowGlobalChrome(true);
    };

    if (isSmallMobileViewport()) {
      DEFERRED_CHROME_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, showChrome, {
          passive: true,
          once: true,
        });
      });
      fallbackTimer = window.setTimeout(showChrome, 7000);
    } else {
      idleHandle = scheduleIdleCallback(
        () => setShowGlobalChrome(true),
        { timeout: 2500 },
      );
    }

    return () => {
      DEFERRED_CHROME_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, showChrome);
      });
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      if (idleHandle !== null) {
        window.clearTimeout(idleHandle);
      }
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

    import('shared/services/socketService.js').then(({ connectSocket }) => {
      try {
        const ws = connectSocket(realtimeSocketToken);
        if (ws) {
          ws.on('app:maintenance', handleMaintenanceMode);
          cleanup = () => ws.off('app:maintenance', handleMaintenanceMode);
        }
      } catch {
        // Realtime maintenance updates are optional; HTTP state remains active.
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
              setRealtimeSocketToken={setRealtimeSocketToken}
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
