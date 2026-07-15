import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import DynamicFeedRoundedIcon from "@mui/icons-material/DynamicFeedRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./MobileHomeDock.module.css";

const cx = createScopedClassNames(styles);

const MobileHomeDock = ({ isLoggedIn, onRequireLogin }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const openProtected = (path) => isLoggedIn ? navigate(path) : onRequireLogin?.();

  const isActive = (tab) => {
    if (tab === "home") return pathname === "/";
    if (tab === "spotlight") return pathname === "/user_feed";
    if (tab === "publicize") return pathname === "/publicize";
    if (tab === "leads") return pathname === "/leads" || pathname.startsWith("/user/search-history");
    if (tab === "editBusiness") return pathname === "/user_edit-profile";
    return false;
  };

  return (
    <nav className={cx("dock")} aria-label="Mobile primary navigation">
      <button type="button" className={cx("dockItem", isActive("home") && "active")} onClick={() => navigate("/")} aria-current={isActive("home") ? "page" : undefined}><HomeRoundedIcon /><span>Home</span></button>
      <button type="button" className={cx("dockItem", isActive("spotlight") && "active")} onClick={() => openProtected("/user_feed")}><DynamicFeedRoundedIcon /><span>Spotlight</span></button>
      <button type="button" className={cx("dockItem", "primaryItem", isActive("publicize") && "active")} onClick={() => openProtected("/publicize")}><span className={cx("primaryIcon")}><CampaignRoundedIcon /></span><span>Publicize</span></button>
      <button type="button" className={cx("dockItem", isActive("leads") && "active")} onClick={() => openProtected("/leads")}><MailOutlineRoundedIcon /><span>Leads</span></button>
      <button type="button" className={cx("dockItem", isActive("editBusiness") && "active")} onClick={() => openProtected("/user_edit-profile")}><EditRoundedIcon /><span>Edit Business</span></button>
    </nav>
  );
};

export default MobileHomeDock;
