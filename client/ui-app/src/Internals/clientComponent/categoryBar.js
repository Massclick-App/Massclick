import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { viewOtpUser } from "../../redux/actions/otpAction.js";
import { useDrawer } from "./Drawer/drawerContext.js";
import { IconButton, Menu, MenuItem, Avatar } from "@mui/material";
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import Badge from "@mui/material/Badge";
import { Notifications as NotificationsIcon, Mail as MailIcon, Menu as MenuIcon, AccountCircle as AccountCircleIcon, ExitToApp as ExitToAppIcon } from "@mui/icons-material";
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditIcon from "@mui/icons-material/Edit";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import PolicyIcon from "@mui/icons-material/Policy";
import FeedbackIcon from "@mui/icons-material/Feedback";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { getDisplayableLeadNotifications } from "./leadsNotification/leadNotificationUtils.js";
import { fetchMatchedLeads } from "../../redux/actions/leadsAction.js";
import styles from "./categoryBar.module.css";
const AddBusinessModal = lazy(() => import("./AddBusinessModel.js"));
const DashboardPage = lazy(() => import("../clientComponent/userMenu/DashboardPage/Dashboard.js"));
const FavoritesPage = lazy(() => import("../clientComponent/userMenu/FavouritePage/FavouritePage.js"));
const EditProfilePage = lazy(() => import("../clientComponent/userMenu/EditProfile/EditProfilePage.js"));
const CustomerServicePage = lazy(() => import("../clientComponent/userMenu/CustomerService/CustomerServicePage.js"));
const PolicyPage = lazy(() => import("../clientComponent/userMenu/PolicyPage/PolicyPage.js"));
const FeedbackPage = lazy(() => import("../clientComponent/userMenu/FeedbackPage/FeedBackPage.js"));
const HelpPage = lazy(() => import("../clientComponent/userMenu/HelpPage/HelpPage.js"));
const LeadsNotificationModal = lazy(() => import("./leadsNotification/leadsNotification.js"));
const MRPPage = lazy(() => import("./MRP/mrp.js"));
const cx = createScopedClassNames(styles);
export const isBusinessPeopleUser = (user = {}) => user?.businessPeople === true;
export const getUserMenuLabel = (item, user = {}) => {
  if (item.path === "/user_edit-profile" && isBusinessPeopleUser(user)) {
    return "Edit Business";
  }
  return item.name.startsWith("User ") ? item.name.replace("User ", "") : item.name;
};
const categories = [{
  name: "Leads",
  icon: <MailIcon />
},
// { name: "MNI", icon: <CorporateFareIcon /> },
{
  name: "Publicize",
  icon: <PublishedWithChangesIcon />
}, {
  name: "Business Enquiry",
  icon: <AppRegistrationIcon />
}];
export const userMenuItems = [{
  name: "User Dashboard",
  path: "/user_dashboard",
  icon: <DashboardIcon color="action" />,
  component: DashboardPage
}, {
  name: "User Edit Profile",
  path: "/user_edit-profile",
  icon: <EditIcon color="action" />,
  component: EditProfilePage
},
// { name: "User Account", path: "/user_account", icon: <AccountBoxIcon color="action" />, component: AccountPage },
{
  name: "MNI",
  path: "/user_mni",
  icon: <BusinessCenterIcon color="action" />,
  component: MRPPage,
  businessPeopleOnly: true
}, {
  name: "User Favorites",
  path: "/user_favorites",
  icon: <FavoriteBorderIcon color="action" />,
  component: FavoritesPage
},
// { name: "User Saved", path: "/user_saved", icon: <BookmarkBorderIcon color="action" />, component: SavedPage },
// { name: "User My Transaction", path: "/user_my-transaction", icon: <AccountBalanceWalletIcon color="action" />, component: MyTransactionPage },
// { name: "User Notifications", path: "/user_notifications", icon: <NotificationsActiveIcon color="action" />, component: NotificationsPage },
{
  name: "User Customer Service",
  path: "/user_customer-service",
  icon: <HeadsetMicIcon color="action" />,
  component: CustomerServicePage
},
// { name: "User Investor Relations", path: "/user_investor-relations", icon: <TrendingUpIcon color="action" />, component: InvestorRelationsPage },
{
  name: "User Policy",
  path: "/user_policy",
  icon: <PolicyIcon color="action" />,
  component: PolicyPage
}, {
  name: "User Feedback",
  path: "/user_feedback",
  icon: <FeedbackIcon color="action" />,
  component: FeedbackPage
}, {
  name: "User Help",
  path: "/user_help",
  icon: <HelpOutlineIcon color="action" />,
  component: HelpPage
},
// { name: "Change Language", isLanguageSwitch: true, icon: <LanguageIcon color="action" /> },
{
  name: "Logout",
  isLogout: true,
  path: "/",
  icon: <ExitToAppIcon color="action" />
}];
export const getVisibleUserMenuItems = (user = {}) =>
  userMenuItems.filter((item) => !item.businessPeopleOnly || isBusinessPeopleUser(user));
const CategoryBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    openDrawer
  } = useDrawer();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const otpState = useSelector(state => state.otp) || {};
  const {
    viewResponse
  } = otpState;
  const authUser = useSelector(state => state.otp?.viewResponse) || {};
  const storedAuthUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
    } catch {
      return {};
    }
  }, []);
  const userData = viewResponse || authUser || storedAuthUser || {};
  const userName = userData?.userName || userData?.name || '';
  const profileImageUrl = userData?.userProfile || userData?.profileImage || userData?.avatar || "";
  const {
    leads: leadsData
  } = useSelector(state => state.leads);
  const notificationLeads = useMemo(
    () => getDisplayableLeadNotifications(leadsData, userData),
    [leadsData, userData]
  );
  useEffect(() => {
    const mobile = localStorage.getItem("mobileNumber");
    const token = localStorage.getItem("authToken");
    if (mobile && token) {
      dispatch(viewOtpUser(mobile));
    }
    dispatch(fetchMatchedLeads());
  }, [dispatch]);
  const handleMenuClick = event => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const checkLogin = () => {
    const token = localStorage.getItem("authToken");
    setIsLoggedIn(!!token);
  };
  useEffect(() => {
    checkLogin();
    window.addEventListener("storage", checkLogin);
    window.addEventListener("authChange", checkLogin);
    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("authChange", checkLogin);
    };
  }, []);
  const handleCategoryClick = name => {
    if (name === "Leads") {
      if (!localStorage.getItem("authUser")) {
        setIsModalOpen(true);
        return;
      }
      navigate("/leads");
    } else if (name === "Publicize") {
      if (!localStorage.getItem("authUser")) {
        setIsModalOpen(true);
        return;
      }
      navigate("/publicize");
    } else if (name === "MNI") {
      if (!localStorage.getItem("authUser")) {
        setIsModalOpen(true);
        return;
      }
      navigate("/mni");
    } else if (name === "Business Enquiry") {
      if (!localStorage.getItem("authUser")) {
        setIsModalOpen(true);
        return;
      }
      navigate("/business-enquiry");
    }
  };
  const goHome = () => navigate("/");
  return <header className={cx("categoryBarContainer")}>
    <div className={cx("categoryBarContent")}>

      <div className={cx("logoGroup")}>
        <div className={cx("logoWrapper")}>
          <button type="button" className={cx("logoButton")} onClick={goHome} aria-label="Go to Massclick home">
            <img src="/header.png" alt="Massclick Logo" className={cx("logoImage")} width="44" height="44" decoding="async" />
          </button>
        </div>
        <div className={cx("brandingText")}>
          <button type="button" className={cx("logoButton")} onClick={goHome} aria-label="Go to Massclick home">
            <img src="/Massclick-India.webp" alt="Massclick India" className={cx("brandLogo")} width="180" height="44" decoding="async" fetchpriority="high" loading="eager" />
          </button>
        </div>
      </div>

      <nav className={cx("desktopNav")}>
        <div className={cx("categoryButtons")}>
          {categories.map((category, index) => <button key={index} className={cx("categoryButton")} onClick={() => handleCategoryClick(category.name)}>
            {category.icon}
            <span>{category.name}</span>
          </button>)}
        </div>
      </nav>

      <div className={cx("actionButtons")}>

        <IconButton className={cx("mobileMenuButton")} onClick={handleMenuClick} aria-label="Open quick links menu">
          <MenuIcon />
        </IconButton>

        {!isLoggedIn ? <button className={cx("authButton loginButton")} onClick={() => setIsModalOpen(true)}>
          <LoginIcon />
          <span className={cx("loginText")}>Login / Sign Up</span>
        </button> : <>
          <IconButton onClick={openDrawer} className={cx("iconButtonPrimary")} aria-label="Open user menu">
            <Avatar src={profileImageUrl} sx={{
              width: 34,
              height: 34,
              bgcolor: 'secondary.main'
            }}>
              {userName ? userName[0].toUpperCase() : <AccountCircleIcon sx={{
                color: 'white'
              }} />}
            </Avatar>
          </IconButton>

          <IconButton className={cx("iconButtonPrimary")} onClick={() => setIsNotificationModalOpen(true)} aria-label="Open notifications">
            <Badge badgeContent={notificationLeads.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </>}
      </div>
    </div>

    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
      {categories.map((category, index) => <MenuItem key={index} onClick={() => handleCategoryClick(category.name)}>
        {category.icon}
        <span style={{
          marginLeft: 10
        }}>{category.name}</span>
      </MenuItem>)}
    </Menu>

    <Suspense fallback={null}>
      <AddBusinessModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} />
    </Suspense>

    <Suspense fallback={null}>
      <LeadsNotificationModal open={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} />
    </Suspense>
  </header>;
};
export default CategoryBar;
export const categoryBarHelpers = {
  checkLogin: () => {
    const token = localStorage.getItem("authToken");
    return !!token;
  },
  handleLogout: navigate => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("mobileNumber");
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  }
};
