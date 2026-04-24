import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { relogin } from './redux/actions/authAction.js';
import { clientLogin } from './redux/actions/clientAuthAction.js';
import { fetchMatchedLeads } from './redux/actions/leadsAction.js';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import theme from './Internals/clientComponent/theme.js';
import PrivateRoute from './PrivateRoute';
import ScrollToTop from './scrollTop.js';
import RouteChangeTracker from './RouteChangeTracker.js';
import { userMenuItems } from './Internals/clientComponent/categoryBar.js';

import GlobalSkeleton from './Internals/clientComponent/globalSkeleton.js';

const Dashboard = lazy(() => import('./Dashboard'));
const Login = lazy(() => import('./Internals/Login/login.js'));
const User = lazy(() => import('./Internals/user/Users.js'));
const Clients = lazy(() => import('./Internals/clients/Client.js'));
const Business = lazy(() => import('./Internals/business/Business.js'));
const Category = lazy(() => import('./Internals/categories/Category.js'));
const Roles = lazy(() => import('./Internals/Roles/Roles.js'));
const Location = lazy(() => import('./Internals/location/Location.js'));
const TermsAndConditionsDatas = lazy(() => import('./Internals/footersContents/termsAndConditions/termsAndConditions.js'));
const MainGrid = lazy(() => import('./components/MainGrid.js'));

const BusinessListing = lazy(() => import('./Internals/clientComponent/home.js'));
const SearchResults = lazy(() => import('./Internals/clientComponent/SearchResult/SearchResult.js'));
const BusinessDetails = lazy(() => import('./Internals/clientComponent/cards/cardDetails.js'));

const AboutUsPage = lazy(() => import('./Internals/clientComponent/footer/aboutUs/aboutUsPage.js'));
const Testimonials = lazy(() => import('./Internals/clientComponent/footer/testimonials/testimonials.js'));
const FeedbackComponent = lazy(() => import('./Internals/clientComponent/footer/feedback/feedback.js'));
const CustomerCareComponent = lazy(() => import('./Internals/clientComponent/footer/customerCare/customerCare.js'));
const Portfolio = lazy(() => import('./Internals/clientComponent/footer/portfolio/portfolio.js'));
const TermsAndConditions = lazy(() => import('./Internals/clientComponent/footer/termsAndConditions/termsAndCondition.js'));
const PrivacyPolicy = lazy(() => import('./Internals/clientComponent/footer/privacyPolicy/privacyPolicy.js'));
const RefundPolicy = lazy(() => import('./Internals/clientComponent/footer/refund/refundPolicy.js'));
const EnquiryNow = lazy(() => import('./Internals/clientComponent/footer/enquiry/enquiry.js'));
const WebDevSection = lazy(() => import('./Internals/clientComponent/footer/webDev/webDevSection.js'));
const DigitalMarketing = lazy(() => import('./Internals/clientComponent/footer/digitalMarketing/digitalMarketing.js'));
const GraphicDesign = lazy(() => import('./Internals/clientComponent/footer/graphicDesign/graphicDesign.js'));
const Seo = lazy(() => import('./Internals/clientComponent/footer/seo/seo.js'));
const DeleteAccount = lazy(() => import('./Internals/clientComponent/footer/deleteAccount/deleteAccount.js'));

const WriteReviewPage = lazy(() => import('./Internals/clientComponent/rating/submitReviewPage.js'));
const Profile = lazy(() => import('./Internals/Login/profile/profile.js'));
const PaymentStatus = lazy(() => import('./Internals/phonePay/paymentStatus.js'));
const LeadsPage = lazy(() => import('./Internals/clientComponent/LeadsPage/leadsPage.js'));
const AdvertisePage = lazy(() => import('./Internals/clientComponent/advertise/advertise.js'));
const FreeListingPage = lazy(() => import('./Internals/clientComponent/free-Listing/free-Listing.js'));
const LeadsCardHistory = lazy(() => import('./Internals/clientComponent/LeadsPage/leadsCards/leadsCards.js'));
const BusinessEnquiry = lazy(() => import('./Internals/clientComponent/businessEnquiry/businessEnquiry.js'));

const EnquiryPage = lazy(() => import('./Internals/enquiry-page/enquiry-page.js'));
const AdvertisementPage = lazy(() => import('./Internals/advertisement/advertisement.js'));

const GlobalDrawer = lazy(() => import('./Internals/clientComponent/Drawer/globalDrawer.js'));
const SeoData = lazy(() => import('./Internals/seoData/seoData.js'));
const SeoPageContent = lazy(() => import('./Internals/seoData/seoPageContent/seoPageContent.js'));
const SeoPageContentBlogs = lazy(() => import('./Internals/seoData/seoPageContentBlog/seoPageContentBlog.js'));

const MRPDatas = lazy(() => import('./Internals/MRPDATA/mrpData.js'));

const FloatingButtons = lazy(() => import('./Internals/clientComponent/floating/floatingButtons.js'));
const FloatingAdCard = lazy(() => import('./Internals/clientComponent/floating/floatingAdCard.js'));
const OTPLoginModal = lazy(() => import('./Internals/clientComponent/AddBusinessModel.js'));

const CategoryRouter = lazy(() => import('./Internals/clientComponent/categories/categoryRouter.js'));
const BlogDetail = lazy(() => import('./Internals/clientComponent/relatedBlogs/blogDetails/blogDetails.js'));

const DynamicLoader = memo(() => {
  const { pathname } = useLocation();

  if (pathname.startsWith('/business/')) {
    return <GlobalSkeleton type="details" />;
  }

  if (
    pathname.includes('/search') ||
    pathname.includes('/category') ||
    pathname.split('/').length >= 3
  ) {
    return <GlobalSkeleton type="list" />;
  }

  if (pathname.startsWith('/dashboard')) {
    return <GlobalSkeleton type="dashboard" />;
  }

  return pathname === "/" ? <GlobalSkeleton type="landing" /> : <GlobalSkeleton type="cards" />;
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

          {/* Footer Routes */}
          {footerRoutes.map(([path, element]) => (
            <Route key={path} path={path} element={element} />
          ))}

          {/* Search Routes */}
          <Route path="/:location/:category" element={<CategoryRouter />} />
          <Route
            path="/:location/:category/:subcategory"
            element={<SearchResults />}
          />

          {/* Business Details */}
          <Route
            path="/business/:location/:businessSlug/:id"
            element={<BusinessDetails />}
          />

          {/* Protected Dashboard */}
          <Route
            element={<PrivateRoute isAuthenticated={isAuthenticated} />}
          >
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
              <Route path="seopagecontentblogs" element={<SeoPageContentBlogs />} />
              <Route path="roles" element={<Roles />} />
              <Route path="enquiry" element={<EnquiryPage />} />
              <Route path="advertisements" element={<AdvertisementPage />} />
              <Route path="mni-data" element={<MRPDatas />} />
              <Route path="terms-conditions-data" element={<TermsAndConditionsDatas />} />
            </Route>
          </Route>
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

  /* Initial Fast Fetch */
  useEffect(() => {
    dispatch(fetchMatchedLeads());
  }, [dispatch]);

  /* Restore Login Session */
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const clientAccessToken = localStorage.getItem('clientAccessToken');

      try {
        if (clientAccessToken) {
          await dispatch(clientLogin());
        }

        if (!accessToken || !refreshToken) {
          setAuthChecked(true);
          return;
        }

        const result = await dispatch(relogin());

        if (result?.accessToken) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        localStorage.clear();
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    initAuth();
  }, [dispatch]);

  /* Global First Load */
  if (!authChecked) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalSkeleton type="cards" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

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

          <AppRoutes
            isAuthenticated={isAuthenticated}
            setIsAuthenticated={setIsAuthenticated}
            openLoginModal={openLoginModal}
            setOpenLoginModal={setOpenLoginModal}
          />
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default memo(App);