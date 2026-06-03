import React from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Stack,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import InterpreterModeIcon from "@mui/icons-material/InterpreterMode";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import GavelIcon from '@mui/icons-material/Gavel';

const SUPERADMIN = 'SuperAdmin';

const MENU_SECTIONS = [
  {
    label: "Main",
    items: [
      { text: "Home", icon: HomeRoundedIcon, path: "/dashboard" },
      { text: "Clients", icon: SupportAgentIcon, path: "/dashboard/clients" },
      { text: "Business", icon: StorefrontIcon, path: "/dashboard/business" },
    ]
  },
  {
    label: "Content",
    items: [
      { text: "Categories", icon: CategoryIcon, path: "/dashboard/category" },
      { text: "Locations", icon: LocationOnIcon, path: "/dashboard/location" },
      { text: "SEO", icon: SearchIcon, path: "/dashboard/seo" },
      { text: "Pages", icon: ArticleIcon, path: "/dashboard/seopagecontent" },
      { text: "Blogs", icon: NewspaperIcon, path: "/dashboard/seopagecontentblogs" },
    ]
  },
  {
    label: "Manage",
    items: [
      { text: "Enquiries", icon: MailOutlineIcon, path: "/dashboard/enquiry" },
      { text: "Ads", icon: NotificationsIcon, path: "/dashboard/advertisements" },
      { text: "MNI", icon: StorefrontIcon, path: "/dashboard/mni-data" },
      { text: "Notifications", icon: NotificationsIcon, path: "/dashboard/fcm-marketing" },
    ]
  },
  {
    label: "Events",
    items: [
      { text: "EventCategory", icon: MailOutlineIcon, path: "/dashboard/event-category" },
      { text: "EventLocation", icon: NotificationsIcon, path: "/dashboard/event-location" },
      { text: "EventAdvertisement", icon: StorefrontIcon, path: "/dashboard/event-advertisement" },
      { text: "EventCreation", icon: NotificationsIcon, path: "/dashboard/event-creation" },
    ]
  },
  {
    label: "Settings",
    items: [
      { text: "Users", icon: InterpreterModeIcon, path: "/dashboard/user" },
      { text: "Roles", icon: AdminPanelSettingsIcon, path: "/dashboard/roles" },
      { text: "Display", icon: CategoryIcon, path: "/dashboard/category-display" },
      { text: "Terms", icon: GavelIcon, path: "/dashboard/terms-conditions-data" },
      { text: "Config", icon: SettingsIcon, path: "/dashboard/system-settings" },
    ]
  },
];

const flattenedItems = MENU_SECTIONS.flatMap(section => section.items);

export default function SideMenu({ onItemClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isTabletDown = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const userRole =
    useSelector((state) => state.auth?.user?.userRole) ||
    localStorage.getItem("userRole") || "";

  const allowedPages =
    useSelector((state) => state.auth?.allowedPages) ||
    JSON.parse(localStorage.getItem("allowedPages") || "[]");

  const isSuperAdmin = userRole === SUPERADMIN;

  const hasAccess = (path) => {
    if (path === "/dashboard") return true;
    if (isSuperAdmin) return true;
    return allowedPages.includes(path);
  };

  const filteredSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => hasAccess(item.path))
  })).filter(section => section.items.length > 0);

  const iconSize = isMobile ? 30 : isTabletDown ? 34 : 38;
  const fontSize = isMobile ? "0.95rem" : "1.05rem";

  const renderMenuItem = (item) => {
    const selected = location.pathname === item.path;
    const IconComp = item.icon;

    return (
      <ListItem
        key={item.path}
        disablePadding
        sx={{ mb: 0.5 }}
      >
        <ListItemButton
          selected={selected}
          onClick={() => {
            navigate(item.path);
            if (onItemClick) onItemClick();
          }}
          sx={{
            position: "relative",
            borderRadius: 1.5,
            px: isMobile ? 1.2 : 1.5,
            py: isMobile ? 0.65 : 0.85,
            gap: 1.2,
            alignItems: "center",
            backgroundColor: selected ? "rgba(255, 140, 66, 0.08)" : "transparent",
            "&:hover": {
              backgroundColor: selected ? "rgba(255, 140, 66, 0.12)" : "rgba(0, 0, 0, 0.03)",
            },
            color: selected ? "#e1580f" : "#555",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            "&::before": selected
              ? {
                content: '""',
                position: "absolute",
                left: 0,
                top: "12%",
                bottom: "12%",
                width: 2.5,
                borderRadius: 999,
                background: "linear-gradient(180deg, #ff8c42, #ff5a1f)",
              }
              : {},
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: "auto",
              mr: 1.2,
            }}
          >
            <Box
              sx={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: selected ? "#ff8c42" : "#f5f5f7",
                boxShadow: selected
                  ? "0 4px 12px rgba(255, 140, 66, 0.3)"
                  : "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "none",
                color: selected ? "#fff" : "#ea6d11",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "scale(1.08)",
                }
              }}
            >
              <IconComp sx={{ fontSize: iconSize }} />
            </Box>
          </ListItemIcon>

          <Typography
            noWrap
            sx={{
              fontSize,
              fontWeight: selected ? 600 : 500,
              color: selected ? "#e1580f" : "#444",
              letterSpacing: 0.3,
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {item.text}
          </Typography>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Stack
      sx={{
        flexGrow: 1,
        pt: isMobile ? 0.5 : 1,
        pb: isMobile ? 1 : 1.5,
        px: isMobile ? 1 : 1.5,
        justifyContent: "flex-start",
        bgcolor: "#fafbfc",
        gap: 1,
        overflow: "auto",
      }}
    >
      {filteredSections.map((section, sectionIndex) => (
        <div key={section.label}>
          <Typography
            variant="caption"
            sx={{
              px: isMobile ? 1.2 : 1.5,
              py: 0.5,
              fontWeight: 700,
              fontSize: "0.75rem",
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
            }}
          >
            {section.label}
          </Typography>
          <List dense disablePadding>
            {section.items.map(renderMenuItem)}
          </List>
          {sectionIndex < filteredSections.length - 1 && (
            <Divider
              sx={{
                my: 1,
                opacity: 0.3,
              }}
            />
          )}
        </div>
      ))}
    </Stack>
  );
}
