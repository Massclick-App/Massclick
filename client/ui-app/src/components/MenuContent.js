import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Collapse,
  InputBase,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import SupportAgentIcon from "@mui/icons-material/SupportAgentOutlined";
import InterpreterModeIcon from "@mui/icons-material/InterpreterModeOutlined";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMicOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ArticleIcon from "@mui/icons-material/ArticleOutlined";
import StorefrontIcon from "@mui/icons-material/StorefrontOutlined";
import NewspaperIcon from "@mui/icons-material/NewspaperOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsOutlined";
import NotificationsIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import NavigationIcon from "@mui/icons-material/NavigationOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsOutlined";
import ClassIcon from "@mui/icons-material/ClassOutlined";
import FeaturedVideoIcon from "@mui/icons-material/FeaturedVideoOutlined";
import TravelExploreIcon from "@mui/icons-material/TravelExploreOutlined";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailReadOutlined";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsOutlined";
import WebRoundedIcon from "@mui/icons-material/WebOutlined";
import GroupsRoundedIcon from "@mui/icons-material/GroupsOutlined";
import RequestQuoteIcon from "@mui/icons-material/RequestQuoteOutlined";
import FolderCopyIcon from "@mui/icons-material/FolderCopyOutlined";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeedOutlined";
import { fetchChatUnreadCount, getAdminChatToken } from "../services/chatService";
import { connectSocket } from "../services/socketService";
import { getAuthSnapshot } from "../auth/authStore.js";

const SUPERADMIN = "SuperAdmin";

const ACTIVE_GRADIENT = "linear-gradient(90deg, #f2913f 0%, #f6ad6a 100%)";
const BADGE_GRADIENT = "linear-gradient(135deg, #ef7c1a 0%, #f59a4a 100%)";
const HOVER_BG = "rgba(234, 109, 17, 0.06)";
const TEXT = "#0F172A";
const ICON = "#64748B";
const MUTED = "#94A3B8";

const MENU_SECTIONS = [
  {
    label: "Main",
    items: [
      { text: "Home", icon: HomeRoundedIcon, path: "/dashboard" },
      { text: "Clients", icon: SupportAgentIcon, path: "/dashboard/clients" },
      { text: "Business", icon: StorefrontIcon, path: "/dashboard/business" },
    ],
  },
  {
    label: "Content",
    items: [
      { text: "Categories", icon: CategoryIcon, path: "/dashboard/category" },
      { text: "Locations", icon: LocationOnIcon, path: "/dashboard/location" },
      { text: "Master Locations", icon: LocationOnIcon, path: "/dashboard/master-location" },
      { text: "SEO", icon: SearchIcon, path: "/dashboard/seo" },
      { text: "Pages", icon: ArticleIcon, path: "/dashboard/seopagecontent" },
      { text: "Blogs", icon: NewspaperIcon, path: "/dashboard/seopagecontentblogs" },
      { text: "SEO Templates", icon: ArticleIcon, path: "/dashboard/seotemplates" },
      { text: "Authors", icon: CategoryIcon, path: "/dashboard/authors" },
    ],
  },
  {
    label: "Manage",
    items: [
      { text: "Enquiries", icon: MailOutlineIcon, path: "/dashboard/enquiry" },
      { text: "Care Chat", icon: HeadsetMicIcon, path: "/dashboard/customer-care", badgeKey: "chat" },
      { text: "Ads", icon: NotificationsIcon, path: "/dashboard/advertisements" },
      { text: "Quotations", icon: RequestQuoteIcon, path: "/dashboard/quotation" },
      { text: "Documents", icon: FolderCopyIcon, path: "/dashboard/documents" },
      { text: "Feed", icon: DynamicFeedIcon, path: "/dashboard/feed" },
      { text: "MNI", icon: StorefrontIcon, path: "/dashboard/mni-data" },
      { text: "Notifications", icon: NotificationsIcon, path: "/dashboard/fcm-marketing" },
    ],
  },
  {
    label: "Events",
    items: [
      { text: "EventLocation", icon: NavigationIcon, path: "/dashboard/event-location" },
      { text: "EventCategory", icon: ClassIcon, path: "/dashboard/event-category" },
      { text: "EventCreation", icon: EmojiEventsIcon, path: "/dashboard/event-creation" },
      { text: "EventAdvertisement", icon: FeaturedVideoIcon, path: "/dashboard/event-advertisement" },
      { text: "MassclickEvents", icon: EmojiEventsIcon, path: "/dashboard/massclick-events" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { text: "Analytics Overview", icon: AnalyticsRoundedIcon, path: "/dashboard/analytics-overview" },
      { text: "Site Analytics", icon: QueryStatsRoundedIcon, path: "/dashboard/site-analytics" },
      { text: "Category Coverage", icon: CategoryIcon, path: "/dashboard/data-analytics" },
      { text: "Google Analytics 4", icon: WebRoundedIcon, path: "/dashboard/ga4-analytics" },
      { text: "Google Search Console", icon: QueryStatsRoundedIcon, path: "/dashboard/gsc-analytics" },
      { text: "MSG91 Analytics", icon: MarkEmailReadIcon, path: "/dashboard/msg91-analytics" },
      { text: "Google Maps Leads", icon: TravelExploreIcon, path: "/dashboard/gmaps-leads" },
    ],
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
    ],
  },
];

export default function SideMenu({ onItemClick, railCollapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const authSnapshot = getAuthSnapshot();

  const userRole =
    useSelector((state) => state.auth?.user?.userRole) ||
    authSnapshot.admin.userRole ||
    "";

  const allowedPages =
    useSelector((state) => state.auth?.allowedPages) ||
    authSnapshot.admin.allowedPages;

  const isSuperAdmin = userRole === SUPERADMIN;
  const [chatUnread, setChatUnread] = useState(0);
  const [query, setQuery] = useState("");

  const COLLAPSE_KEY = "massclick:sidemenu:collapsed";
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
      /* ignore */
    }
    return {};
  });

  const isSectionOpen = (label) => collapsedSections[label] !== true;

  const toggleSection = (label) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [label]: prev[label] !== true };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  };

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

  const filteredSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAccess(item.path)),
  })).filter((section) => section.items.length > 0);

  // Auto-expand the section containing the active route.
  useEffect(() => {
    const active = filteredSections.find((s) =>
      s.items.some((i) => i.path === location.pathname)
    );
    if (active) {
      setCollapsedSections((prev) =>
        prev[active.label] === true ? { ...prev, [active.label]: false } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0 && !railCollapsed;
  const displaySections = searching
    ? filteredSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            item.text.toLowerCase().includes(q)
          ),
        }))
        .filter((section) => section.items.length > 0)
    : filteredSections;

  const renderMenuItem = (item) => {
    const selected = location.pathname === item.path;
    const IconComp = item.icon;
    const showBadge = item.badgeKey === "chat" && chatUnread > 0;

    const button = (
      <ListItemButton
        selected={selected}
        onClick={() => {
          navigate(item.path);
          if (onItemClick) onItemClick();
        }}
        disableRipple
        sx={{
          minHeight: 40,
          borderRadius: "10px",
          justifyContent: railCollapsed ? "center" : "flex-start",
          px: railCollapsed ? 0 : 1.25,
          py: 0.5,
          gap: railCollapsed ? 0 : 1.25,
          background: selected ? ACTIVE_GRADIENT : "transparent",
          boxShadow: selected ? "0 4px 12px rgba(234,109,17,0.25)" : "none",
          transition: "background 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            background: selected ? ACTIVE_GRADIENT : HOVER_BG,
          },
          "&.Mui-selected": { background: ACTIVE_GRADIENT },
          "&.Mui-selected:hover": { background: ACTIVE_GRADIENT },
        }}
      >
        <ListItemIcon sx={{ minWidth: "auto", color: "inherit" }}>
          <Badge
            badgeContent={railCollapsed && showBadge ? chatUnread : undefined}
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                background: BADGE_GRADIENT,
                color: "#fff",
                minWidth: 14,
                height: 14,
                fontSize: "0.55rem",
                fontWeight: 700,
              },
            }}
          >
            <IconComp
              sx={{
                fontSize: 20,
                color: selected ? "#fff" : ICON,
                transition: "color 0.2s ease",
              }}
            />
          </Badge>
        </ListItemIcon>

        {!railCollapsed && (
          <Typography
            noWrap
            sx={{
              flex: 1,
              fontSize: "0.92rem",
              fontWeight: 900,
              color: selected ? "#fff" : TEXT,
              WebkitTextStroke: "0.4px currentColor",
              transition: "color 0.2s ease",
            }}
          >
            {item.text}
          </Typography>
        )}

        {!railCollapsed && showBadge && (
          <Box
            sx={{
              ml: "auto",
              minWidth: 20,
              height: 18,
              px: 0.75,
              borderRadius: "999px",
              background: selected ? "rgba(255,255,255,0.28)" : BADGE_GRADIENT,
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {chatUnread}
          </Box>
        )}
      </ListItemButton>
    );

    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
        {railCollapsed ? (
          <Tooltip title={item.text} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  return (
    <Stack
      sx={{
        flexGrow: 1,
        minHeight: 0,
        height: "100%",
        px: railCollapsed ? 0.75 : 1.25,
        pt: 0.5,
        pb: 1,
        bgcolor: "transparent",
        overflowY: "auto",
        overflowX: "hidden",
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: "transparent",
          borderRadius: 8,
          transition: "background 0.25s ease",
        },
        "&:hover::-webkit-scrollbar-thumb": {
          background: "rgba(148,163,184,0.4)",
        },
      }}
    >
      {!railCollapsed && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            mb: 1,
            borderRadius: "999px",
            background: "#f4f5f7",
            border: "1px solid #eceef1",
            transition: "all 0.2s ease",
            "&:focus-within": {
              borderColor: "#f2b784",
              background: "#fff",
              boxShadow: "0 0 0 3px rgba(234,109,17,0.1)",
            },
          }}
        >
          <SearchIcon sx={{ fontSize: 17, color: MUTED }} />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
            sx={{
              flex: 1,
              fontSize: "0.82rem",
              color: "#334155",
              "& input::placeholder": { color: MUTED, opacity: 1 },
            }}
          />
          {query && (
            <CloseRoundedIcon
              onClick={() => setQuery("")}
              sx={{
                fontSize: 16,
                color: MUTED,
                cursor: "pointer",
                "&:hover": { color: "#ea6d11" },
              }}
            />
          )}
        </Box>
      )}

      {searching && displaySections.length === 0 && (
        <Typography
          sx={{ px: 1.5, py: 2, fontSize: "0.8rem", color: MUTED, textAlign: "center" }}
        >
          No matches for “{query}”
        </Typography>
      )}

      {displaySections.map((section, sectionIndex) => {
        const open = searching ? true : isSectionOpen(section.label);

        if (railCollapsed) {
          return (
            <Box key={section.label}>
              {sectionIndex > 0 && (
                <Box
                  sx={{
                    height: "1px",
                    mx: 1,
                    my: 0.75,
                    background: "rgba(148,163,184,0.2)",
                  }}
                />
              )}
              <List dense disablePadding>
                {section.items.map(renderMenuItem)}
              </List>
            </Box>
          );
        }

        return (
          <Box key={section.label} sx={{ mb: 0.25 }}>
            <ListItemButton
              onClick={() => !searching && toggleSection(section.label)}
              disableRipple={searching}
              sx={{
                px: 1.5,
                py: 0.5,
                mt: sectionIndex === 0 ? 0 : 0.75,
                borderRadius: "8px",
                cursor: searching ? "default" : "pointer",
                "&:hover": {
                  background: searching ? "transparent" : "rgba(148,163,184,0.08)",
                },
              }}
            >
              <Typography
                sx={{
                  flexGrow: 1,
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                {section.label}
              </Typography>
              {!searching && (
                <KeyboardArrowDownRoundedIcon
                  sx={{
                    fontSize: 17,
                    color: "#b8bec7",
                    transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              )}
            </ListItemButton>

            <Collapse in={open} timeout={240} unmountOnExit>
              <List dense disablePadding sx={{ pt: 0.25 }}>
                {section.items.map(renderMenuItem)}
              </List>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
  );
}
