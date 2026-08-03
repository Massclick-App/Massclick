import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import PolicyIcon from "@mui/icons-material/Policy";
import FeedbackIcon from "@mui/icons-material/Feedback";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { isBusinessPeopleUser } from "../../../utils/userUtils.js";

export { isBusinessPeopleUser };

export const getUserMenuLabel = (item, user = {}) => {
  if (item.path === "/user_edit-profile" && isBusinessPeopleUser(user)) {
    return "Edit Business";
  }
  return item.name.startsWith("User ")
    ? item.name.replace("User ", "")
    : item.name;
};

const userMenuItems = [
  {
    name: "User Dashboard",
    path: "/user_dashboard",
    icon: <DashboardIcon color="action" />,
  },
  {
    name: "User Edit Profile",
    path: "/user_edit-profile",
    icon: <EditIcon color="action" />,
  },
  {
    name: "MNI",
    path: "/user_mni",
    icon: <BusinessCenterIcon color="action" />,
    businessPeopleOnly: true,
  },
  {
    name: "Marketing Materials",
    path: "/user_marketing-materials",
    icon: <DescriptionIcon color="action" />,
    businessPeopleOnly: true,
  },
  {
    name: "Spotlight",
    path: "/user_feed",
    icon: <DynamicFeedIcon color="action" />,
  },
  {
    name: "Knowledge Hub",
    path: "/user_massclick-documents",
    icon: <FolderCopyIcon color="action" />,
  },
  {
    name: "User Favorites",
    path: "/user_favorites",
    icon: <FavoriteBorderIcon color="action" />,
  },
  {
    name: "User Customer Service",
    path: "/user_customer-service",
    icon: <HeadsetMicIcon color="action" />,
  },
  {
    name: "User Policy",
    path: "/user_policy",
    icon: <PolicyIcon color="action" />,
  },
  {
    name: "User Feedback",
    path: "/user_feedback",
    icon: <FeedbackIcon color="action" />,
  },
  {
    name: "User Help",
    path: "/user_help",
    icon: <HelpOutlineIcon color="action" />,
  },
  {
    name: "Logout",
    isLogout: true,
    path: "/",
    icon: <ExitToAppIcon color="action" />,
  },
];

export const getVisibleUserMenuItems = (user = {}) =>
  userMenuItems.filter(
    (item) => !item.businessPeopleOnly || isBusinessPeopleUser(user),
  );
