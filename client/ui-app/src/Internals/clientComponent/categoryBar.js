import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { viewOtpUser } from "../../redux/actions/otpAction.js";
import { useDrawer } from "./Drawer/drawerContext.js";
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import { Notifications as NotificationsIcon, Mail as MailIcon, Menu as MenuIcon, AccountCircle as AccountCircleIcon } from "@mui/icons-material";
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import LoginIcon from '@mui/icons-material/Login';
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import { getDisplayableLeadNotifications } from "./leadsNotification/leadNotificationUtils.js";
import { fetchMatchedLeads } from "../../redux/actions/leadsAction.js";
import styles from "./categoryBar.module.css";

const AddBusinessModal = lazy(() => import("./AddBusinessModel.js"));
const LeadsNotificationModal = lazy(() => import("./leadsNotification/leadsNotification.js"));
const QuickLinksMenu = lazy(() =>
  import(
    /* webpackChunkName: "quick-links-menu" */ "./quickLinksMenu/QuickLinksMenu.js"
  )
);
const cx = createScopedClassNames(styles);

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
}, {
  name: "Spotlight",
  icon: <DynamicFeedIcon />
}];

const CategoryBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    openDrawer
  } = useDrawer();
  const quickLinksButtonRef = useRef(null);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("authToken"));
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
      dispatch(fetchMatchedLeads());
    }
  }, [dispatch]);
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
    setIsQuickLinksOpen(false);
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
    } else if (name === "Spotlight") {
      if (!localStorage.getItem("authUser")) {
        setIsModalOpen(true);
        return;
      }
      navigate("/user_feed");
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
            <img src="/Massclick-India01.svg" alt="Massclick India" className={cx("brandLogo")} width="180" height="44" decoding="async" fetchpriority="high" loading="eager" />
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

        <div className={cx("mobileMenuGroup")}>
          <button
            ref={quickLinksButtonRef}
            type="button"
            className={cx("mobileMenuButton")}
            onClick={() => setIsQuickLinksOpen((open) => !open)}
            aria-label="Open quick links menu"
            aria-expanded={isQuickLinksOpen}
            aria-controls={isQuickLinksOpen ? "quick-links-menu" : undefined}
          >
            <MenuIcon />
          </button>
          {isQuickLinksOpen && (
            <Suspense fallback={null}>
              <QuickLinksMenu
                items={categories}
                onClose={() => setIsQuickLinksOpen(false)}
                onSelect={handleCategoryClick}
                triggerRef={quickLinksButtonRef}
              />
            </Suspense>
          )}
        </div>

        {!isLoggedIn ? <button type="button" className={cx("authButton loginButton")} aria-label="Login or sign up" onClick={() => setIsModalOpen(true)}>
          <LoginIcon />
          <span className={cx("loginText")}>Login / Sign Up</span>
        </button> : <>
          <button type="button" onClick={openDrawer} className={cx("iconButtonPrimary")} aria-label="Open user menu">
            <span className={cx("userAvatar")} aria-hidden="true">
              {profileImageUrl ? (
                <img
                  className={cx("userAvatarImage")}
                  src={profileImageUrl}
                  alt=""
                  width="34"
                  height="34"
                />
              ) : userName ? (
                userName[0].toUpperCase()
              ) : (
                <AccountCircleIcon />
              )}
            </span>
          </button>

          <button type="button" className={cx("iconButtonPrimary")} onClick={() => setIsNotificationModalOpen(true)} aria-label="Open notifications">
            <span className={cx("notificationIcon")} aria-hidden="true">
              <NotificationsIcon />
              {notificationLeads.length > 0 && (
                <span className={cx("notificationBadge")}>{notificationLeads.length > 99 ? "99+" : notificationLeads.length}</span>
              )}
            </span>
          </button>
        </>}
      </div>
    </div>

    {isModalOpen && (
      <Suspense fallback={null}>
        <AddBusinessModal open={true} handleClose={() => setIsModalOpen(false)} />
      </Suspense>
    )}

    {isNotificationModalOpen && (
      <Suspense fallback={null}>
        <LeadsNotificationModal open={true} onClose={() => setIsNotificationModalOpen(false)} />
      </Suspense>
    )}
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
