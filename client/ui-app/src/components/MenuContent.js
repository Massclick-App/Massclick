import React, { useEffect, useState } from "react";
import {
  Badge,
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
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import InterpreterModeIcon from "@mui/icons-material/InterpreterMode";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import SearchIcon from '@mui/icons-material/Search';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import GavelIcon from '@mui/icons-material/Gavel';
import NavigationIcon from '@mui/icons-material/Navigation';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ClassIcon from '@mui/icons-material/Class';
import FeaturedVideoIcon from '@mui/icons-material/FeaturedVideo';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import { fetchChatUnreadCount, getAdminChatToken } from "../services/chatService";
import { connectSocket } from "../services/socketService";
import { getAuthSnapshot } from "../auth/authStore.js";

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
      { text: "Authors", icon: CategoryIcon, path: "/dashboard/authors" },
      { text: "GSC Analytics", icon: AnalyticsRoundedIcon, path: "/dashboard/gsc-analytics" },
      { text: "GA4 Analytics", icon: AnalyticsRoundedIcon, path: "/dashboard/ga4-analytics" },
    ]
  },
  {
    label: "Manage",
    items: [
      { text: "Enquiries", icon: MailOutlineIcon, path: "/dashboard/enquiry" },
      { text: "Care Chat", icon: HeadsetMicIcon, path: "/dashboard/customer-care", badgeKey: "chat" },
      { text: "Ads", icon: NotificationsIcon, path: "/dashboard/advertisements" },
      { text: "Data Analytics", icon: AnalyticsRoundedIcon, path: "/dashboard/data-analytics" },
      { text: "Quotations", icon: RequestQuoteIcon, path: "/dashboard/quotation" },
      { text: "Documents", icon: FolderCopyIcon, path: "/dashboard/documents" },
      { text: "Feed", icon: DynamicFeedIcon, path: "/dashboard/feed" },
      { text: "MNI", icon: StorefrontIcon, path: "/dashboard/mni-data" },
      { text: "Notifications", icon: NotificationsIcon, path: "/dashboard/fcm-marketing" },
      { text: "GMaps Leads", icon: TravelExploreIcon, path: "/dashboard/gmaps-leads" },
      { text: "MSG91 Analytics", icon: MarkEmailReadIcon, path: "/dashboard/msg91-analytics" },
    ]
  },
  {
    label: "Events",
    items: [
      { text: "EventLocation", icon: NavigationIcon, path: "/dashboard/event-location" },
      { text: "EventCategory", icon: ClassIcon, path: "/dashboard/event-category" },
      { text: "EventCreation", icon: EmojiEventsIcon, path: "/dashboard/event-creation" },
      { text: "EventAdvertisement", icon: FeaturedVideoIcon, path: "/dashboard/event-advertisement" },
    ]
  },
  {
    label: "Settings",
    items: [
      { text: "Users", icon: InterpreterModeIcon, path: "/dashboard/user" },
      { text: "Roles", icon: AdminPanelSettingsIcon, path: "/dashboard/roles" },
      { text: "Display", icon: CategoryIcon, path: "/dashboard/category-display" },
      { text: "Public Count", icon: GroupsRoundedIcon, path: "/dashboard/public-users-count" },
      { text: "Terms", icon: GavelIcon, path: "/dashboard/terms-conditions-data" },
      { text: "Auth Console", icon: SettingsIcon, path: "/dashboard/auth-console" },
      { text: "Config", icon: SettingsIcon, path: "/dashboard/system-settings" },
    ]
  },
];

export default function SideMenu({ onItemClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isTabletDown = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const authSnapshot = getAuthSnapshot();

  const userRole =
    useSelector((state) => state.auth?.user?.userRole) ||
    authSnapshot.admin.userRole || "";

  const allowedPages =
    useSelector((state) => state.auth?.allowedPages) ||
    authSnapshot.admin.allowedPages;

  const isSuperAdmin = userRole === SUPERADMIN;
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    const token = getAdminChatToken();
    if (!token) return undefined;

    fetchChatUnreadCount(token)
      .then((data) => setChatUnread(data.admin || 0))
      .catch(() => {});

    const socket = connectSocket(token);
    const handleUnread = (data) => setChatUnread(data?.admin || 0);
    socket?.on("chat:unread:count", handleUnread);

    return () => {
      socket?.off("chat:unread:count", handleUnread);
    };
  }, []);

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
                position: "relative",
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
              {item.badgeKey === "chat" && chatUnread > 0 && (
                <Badge
                  badgeContent={chatUnread}
                  color="error"
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    "& .MuiBadge-badge": {
                      minWidth: 16,
                      height: 16,
                      fontSize: "0.62rem",
                    },
                  }}
                />
              )}
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
