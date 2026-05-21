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
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import InterpreterModeIcon from "@mui/icons-material/InterpreterMode";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import TodayIcon from "@mui/icons-material/Today";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import DatasetIcon from '@mui/icons-material/Dataset';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import SourceIcon from '@mui/icons-material/Source';
import CampaignIcon from '@mui/icons-material/Campaign';
import TuneIcon from '@mui/icons-material/Tune';

const SUPERADMIN = 'SuperAdmin';

const ALL_ITEMS = [
  { text: "Home",                icon: HomeRoundedIcon,        path: "/dashboard" },
  { text: "Clients",             icon: SupportAgentIcon,       path: "/dashboard/clients" },
  { text: "Business",            icon: BusinessIcon,           path: "/dashboard/business" },
  { text: "Category",            icon: CategoryIcon,           path: "/dashboard/category" },
  { text: "Location",            icon: LocationOnIcon,         path: "/dashboard/location" },
  { text: "SEO Management",      icon: SourceIcon,             path: "/dashboard/seo" },
  { text: "SEO Page Content",    icon: DatasetIcon,            path: "/dashboard/seopagecontent" },
  { text: "SEO Blogs",           icon: NewspaperIcon,          path: "/dashboard/seopagecontentblogs" },
  { text: "Enquiry",             icon: TodayIcon,              path: "/dashboard/enquiry" },
  { text: "Advertisements",      icon: CampaignIcon,           path: "/dashboard/advertisements" },
  { text: "MNI Data",            icon: CorporateFareIcon,      path: "/dashboard/mni-data" },
  { text: "Terms & Conditions",  icon: CorporateFareIcon,      path: "/dashboard/terms-conditions-data" },
  { text: "Push Notify",         icon: CampaignIcon,           path: "/dashboard/fcm-marketing" },
  { text: "Users",               icon: InterpreterModeIcon,    path: "/dashboard/user" },
  { text: "Roles",               icon: AdminPanelSettingsIcon, path: "/dashboard/roles" },
  { text: "System Settings",     icon: TuneIcon,               path: "/dashboard/system-settings" },
  { text: "Category Display",   icon: CategoryIcon,           path: "/dashboard/category-display" },
];

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

  const filteredListItems = ALL_ITEMS.filter((item) => {
    if (item.path === "/dashboard") return true;
    if (isSuperAdmin) return true;
    return allowedPages.includes(item.path);
  });

  const iconSize = isMobile ? 30 : isTabletDown ? 34 : 38;
  const fontSize = isMobile ? "1rem" : "1.15rem";

  return (
    <Stack
      sx={{
        flexGrow: 1,
        p: 1.5,
        justifyContent: "space-between",
        bgcolor: "#fafafa",
      }}
    >
      <List dense disablePadding>
        {filteredListItems.map((item, index) => {
          const selected = location.pathname === item.path;
          const IconComp = item.icon;

          return (
            <ListItem
              key={index}
              disablePadding
              sx={{
                marginBottom: 0,
                paddingBottom: 5,
              }}
            >
              <ListItemButton
                selected={selected}
                onClick={() => {
                  navigate(item.path);
                  if (onItemClick) onItemClick();
                }}
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  px: isMobile ? 1.2 : 1.6,
                  py: isMobile ? 0.7 : 0.9,
                  gap: 1.2,
                  alignItems: "center",
                  backgroundColor: selected ? "#fff3e8" : "transparent",
                  "&:hover": {
                    backgroundColor: selected ? "#ffe1c5" : "#f6f7fb",
                  },
                  color: selected ? "#e1580f" : "#394150",
                  transition: "all 0.18s ease-in-out",
                  "&::before": selected
                    ? {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "16%",
                      bottom: "16%",
                      width: 3,
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg,#ff8c42,#ff5a1f)",
                    }
                    : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: "auto",
                    mr: 1.3,
                  }}
                >
                  <Box
                    sx={{
                      width: isMobile ? 34 : 38,
                      height: isMobile ? 34 : 38,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: selected ? "#ff8c42" : "#fff",
                      boxShadow: selected
                        ? "0 4px 10px rgba(255,140,66,0.4)"
                        : "0 2px 6px rgba(15,23,42,0.08)",
                      border: selected ? "none" : "1px solid #f0f0f5",
                      color: selected ? "#fff" : "#ea6d11",
                      transition: "all 0.18s ease-in-out",
                    }}
                  >
                    <IconComp sx={{ fontSize: iconSize }} />
                  </Box>
                </ListItemIcon>

                <Typography
                  noWrap
                  sx={{
                    fontSize,
                    fontWeight: selected ? 700 : 500,
                    color: selected ? "#e1580f" : "#333",
                    letterSpacing: 0.2,
                  }}
                >
                  {item.text}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
