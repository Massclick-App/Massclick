import React, { useState, useEffect } from "react"; // <-- added useEffect
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { viewOtpUser } from "../../redux/actions/otpAction.js";
import { useDrawer } from "./Drawer/drawerContext.js";
import {
    Select,
    FormControl,
    IconButton,
    Menu,
    MenuItem,
    Avatar,
} from "@mui/material";
import Badge from "@mui/material/Badge";
import {
    ListAlt as ListAltIcon,
    Notifications as NotificationsIcon,
    Campaign as CampaignIcon,
    Mail as MailIcon,
    Menu as MenuIcon,
    AccountCircle as AccountCircleIcon,
    Add as AddIcon,
    Close as CloseIcon,
    ExitToApp as ExitToAppIcon,
    Language as LanguageIcon

} from "@mui/icons-material";
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import MI from "../../assets/Mi.png";
import AddBusinessModal from "./AddBusinessModel.js";
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PolicyIcon from "@mui/icons-material/Policy";
import FeedbackIcon from "@mui/icons-material/Feedback";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Divider } from "@mui/material";

import DashboardPage from "../clientComponent/userMenu/DashboardPage/Dashboard.js";
import AccountPage from "../clientComponent/userMenu/AccountPage/AccountPage.js";
import BusinessListPage from "../clientComponent/userMenu/BusinessList/BusinessListPage.js";
import FavoritesPage from "../clientComponent/userMenu/FavouritePage/FavouritePage.js";
import SavedPage from "../clientComponent/userMenu/SavedPage/SavedPage.js";
import EditProfilePage from "../clientComponent/userMenu/EditProfile/EditProfilePage.js";
import MyTransactionPage from "../clientComponent/userMenu/MyTransaction/MyTransaction.js";
import NotificationsPage from "../clientComponent/userMenu/NotificationPage/NotificaPage.js";
import CustomerServicePage from "../clientComponent/userMenu/CustomerService/CustomerServicePage.js";
import InvestorRelationsPage from "../clientComponent/userMenu/InvesterRelation/InvestorRelationPage.js";
import PolicyPage from "../clientComponent/userMenu/PolicyPage/PolicyPage.js";
import FeedbackPage from "../clientComponent/userMenu/FeedbackPage/FeedBackPage.js";
import HelpPage from "../clientComponent/userMenu/HelpPage/HelpPage.js";
import LeadsNotificationModal from "./leadsNotification/leadsNotification.js";
import { fetchMatchedLeads } from "../../redux/actions/leadsAction.js";

import './categoryBar.css'

const categories = [
    { name: "Leads", icon: <MailIcon /> },
    // { name: "MNI", icon: <CorporateFareIcon /> },
    { name: "Advertise", icon: <CampaignIcon /> },
    { name: "Business Enquiry", icon: <AppRegistrationIcon /> },
];

const languages = [
    { name: "Tamil", nativeName: "தமிழ்" },
    { name: "English", nativeName: "English" },
    { name: "Hindi", nativeName: "हिन्दी" },
    { name: "Kannada", nativeName: "ಕನ್ನಡ" },
    { name: "Telugu", nativeName: "తెలుగు" },
];

export const userMenuItems = [
    { name: "User Dashboard", path: "/user_dashboard", icon: <DashboardIcon color="action" />, component: DashboardPage },
    { name: "User Edit Profile", path: "/user_edit-profile", icon: <EditIcon color="action" />, component: EditProfilePage },
    // { name: "User Account", path: "/user_account", icon: <AccountBoxIcon color="action" />, component: AccountPage },
    { name: "User BusinessList", path: "/user_business-list", icon: <BusinessCenterIcon color="action" />, component: BusinessListPage },
    { name: "User Favorites", path: "/user_favorites", icon: <FavoriteBorderIcon color="action" />, component: FavoritesPage },
    { name: "User Saved", path: "/user_saved", icon: <BookmarkBorderIcon color="action" />, component: SavedPage },
    { name: "User My Transaction", path: "/user_my-transaction", icon: <AccountBalanceWalletIcon color="action" />, component: MyTransactionPage },
    { name: "User Notifications", path: "/user_notifications", icon: <NotificationsActiveIcon color="action" />, component: NotificationsPage },
    { name: "User Customer Service", path: "/user_customer-service", icon: <HeadsetMicIcon color="action" />, component: CustomerServicePage },
    { name: "User Investor Relations", path: "/user_investor-relations", icon: <TrendingUpIcon color="action" />, component: InvestorRelationsPage },
    { name: "User Policy", path: "/user_policy", icon: <PolicyIcon color="action" />, component: PolicyPage },
    { name: "User Feedback", path: "/user_feedback", icon: <FeedbackIcon color="action" />, component: FeedbackPage },
    { name: "User Help", path: "/user_help", icon: <HelpOutlineIcon color="action" />, component: HelpPage },
    { name: "Change Language", isLanguageSwitch: true, icon: <LanguageIcon color="action" /> },
    { name: "Logout", isLogout: true, path: "/home", icon: <ExitToAppIcon color="action" /> },
];

const CategoryBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { openDrawer } = useDrawer();

    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [anchorEl, setAnchorEl] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    const otpState = useSelector((state) => state.otpReducer || {});
    const { viewResponse } = otpState;
    const userName = viewResponse?.user?.userName || '';
    const authUser = useSelector((state) => state.otp?.viewResponse) || {};

    const { leads: leadsData, loading } = useSelector(
        (state) => state.leads
    );

    useEffect(() => {
        const mobile = localStorage.getItem("mobileNumber");
        if (mobile) {
            dispatch(viewOtpUser(mobile));
        }
        dispatch(fetchMatchedLeads());
    }, [dispatch]);

    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const checkLogin = () => {
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("mobileNumber");
        localStorage.removeItem("authUser");
        setIsLoggedIn(false);
        setIsDrawerOpen(false);
        navigate("/home");
        window.dispatchEvent(new Event('authChange'));
    };

    useEffect(() => {
        checkLogin();
        window.addEventListener("storage", checkLogin);
        window.addEventListener("authChange", checkLogin);
        const handleOpenDrawer = () => setIsDrawerOpen(true);
        window.addEventListener("openUserDrawer", handleOpenDrawer);

        return () => {
            window.removeEventListener("storage", checkLogin);
            window.removeEventListener("authChange", checkLogin);
            window.removeEventListener("openUserDrawer", handleOpenDrawer);
        };
    }, []);

    const handleDrawerToggle = (open) => (event) => {
        if (event && event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
            return;
        }
        setIsDrawerOpen(open);
    };

    const handleDrawerItemClick = (item) => {
        setIsDrawerOpen(false);
        if (item.isLogout) {
            handleLogout();
        } else if (item.path) {
            navigate(item.path);
        }
    };

    const handleCategoryClick = (name) => {
        if (name === "Leads") {
            if (!localStorage.getItem("authUser")) {
                setIsModalOpen(true);
                return;
            }
            navigate("/leads");
        } else if (name === "Advertise") {
            navigate("/advertise");
        } else if (name === "MNI") {
            navigate("/mni");
        } else if (name === "Business Enquiry") {
            navigate("/business-enquiry");
        }
    };

    const drawerList = (currentPath) => (
        <div className="drawerList" role="presentation" onClick={handleDrawerToggle(false)} onKeyDown={handleDrawerToggle(false)}>
            <div className="drawerHeader">
                <IconButton onClick={handleDrawerToggle(false)} className="closeButton">
                    <CloseIcon />
                </IconButton>
                <div className="userInfo">
                    <h3 className="userName">{userName || 'Guest User'}</h3>
                    <p className="viewProfileText">Click to view profile</p>
                </div>
                <Avatar sx={{ width: 48, height: 48, ml: 2, bgcolor: '#F7941D' }}>
                    {userName ? userName[0].toUpperCase() : 'G'}
                </Avatar>
            </div>

            <ul className="menuList">
                {userMenuItems.map((item, index) => {
                    const isActive = currentPath === item.path;
                    const isDividerBefore = item.name === "User Edit Profile" || item.name === "User Policy";

                    if (item.isLanguageSwitch) {
                        return (
                            <li key={item.name} className="languageSwitchItem">
                                <div className="languageIconAndText">
                                    <div className="menuIcon">{item.icon}</div>
                                    <span className="menuText">{item.name}</span>
                                </div>
                                <FormControl size="small" className="languageSelectControl">
                                    <Select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="languageSelect"
                                    >
                                        {languages.map((lang) => (
                                            <MenuItem key={lang.name} value={lang.name}>{lang.nativeName}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </li>
                        );
                    }

                    return (
                        <React.Fragment key={index}>
                            {isDividerBefore && <Divider className="menuDivider" />}
                            <li
                                className={`menuItem ${isActive ? 'active' : ''} ${item.isLogout ? 'logout' : ''}`}
                                onClick={() => handleDrawerItemClick(item)}
                            >
                                <div className="menuIcon">{item.icon}</div>
                                <span className="menuText">
                                    {item.name.startsWith('User ') ? item.name.replace('User ', '') : item.name}
                                </span>
                            </li>
                        </React.Fragment>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <header className="categoryBarContainer">
            <div className="categoryBarContent">

                <div className="logoGroup">
                    <div className="logoWrapper">
                        <img src={MI} alt="Massclick Logo" className="logoImage" />
                    </div>
                    <div className="brandingText">
                        <h1 className="mainTitle">Mass<span>click</span></h1>
                        <p className="subTitle">India's Leading Local Search Engine</p>
                    </div>
                </div>

                <nav className="desktopNav">
                    {/* <FormControl size="small" className="languageSelectControlDesktop">
                        <Select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="languageSelectDesktop"
                        >
                            {languages.map((lang) => (
                                <MenuItem key={lang.name} value={lang.name}>
                                    {lang.nativeName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}

                    <div className="categoryButtons">
                        {categories.map((category, index) => (
                            <button
                                key={index}
                                className="categoryButton"
                                onClick={() => handleCategoryClick(category.name)}
                            >
                                {category.icon}
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="actionButtons">

                    <IconButton
                        className="mobileMenuButton"
                        onClick={handleMenuClick}
                    >
                        <MenuIcon />
                    </IconButton>

                    {!isLoggedIn ? (
                        <button
                            className="authButton loginButton"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <LoginIcon />
                            <span className="loginText">Login / Sign Up</span>
                        </button>
                    ) : (
                        <>
                            <IconButton onClick={openDrawer} className="iconButtonPrimary">
                                <AccountCircleIcon />
                            </IconButton>

                            <IconButton
                                className="iconButtonPrimary"
                                onClick={() => setIsNotificationModalOpen(true)}
                            >
                                <Badge badgeContent={leadsData.length} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </>
                    )}
                </div>
            </div>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {categories.map((category, index) => (
                    <MenuItem
                        key={index}
                        onClick={() => handleCategoryClick(category.name)}
                    >
                        {category.icon}
                        <span style={{ marginLeft: 10 }}>{category.name}</span>
                    </MenuItem>
                ))}
            </Menu>

            <AddBusinessModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} />

            <LeadsNotificationModal
                open={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
            />
        </header>
    );
};

export default CategoryBar;

export const categoryBarHelpers = {
    checkLogin: () => {
        const token = localStorage.getItem("authToken");
        return !!token;
    },
    handleLogout: (navigate) => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("mobileNumber");
        window.dispatchEvent(new Event("authChange"));
        navigate("/home");
    },
};