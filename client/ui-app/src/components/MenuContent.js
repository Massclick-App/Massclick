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
import { useNavigate, useLocation } from "react-router-dom";
import DatasetIcon from '@mui/icons-material/Dataset';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';

export default function SideMenu({ onItemClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const isTabletDown = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const userRole = localStorage.getItem("userRole") || "Guest";

  const mainListItems = [
    {
      text: "Home",
      icon: HomeRoundedIcon,
      path: "/dashboard",
    },
    {
      text: "Clients",
      icon: SupportAgentIcon,
      path: "/dashboard/clients",
    },
    {
      text: "Business",
      icon: BusinessIcon,
      path: "/dashboard/business",
    },
    {
      text: "Category",
      icon: CategoryIcon,
      path: "/dashboard/category",
      roles: ["SuperAdmin"],
    },
   
    {
      text: "Seo Management",
      icon: DatasetIcon,
      path: "/dashboard/seo",
      roles: ["SuperAdmin"],
    },
    {
      text: "Seo PageContent",
      icon: DatasetIcon,
      path: "/dashboard/seopagecontent",
      roles: ["SuperAdmin"],
    },
    {
      text: "Users",
      icon: InterpreterModeIcon,
      path: "/dashboard/user",
      roles: ["SuperAdmin"],
    },
    {
      text: "Role",
      icon: AdminPanelSettingsIcon,
      path: "/dashboard/roles",
      roles: ["SuperAdmin"],
    },
    {
      text: "EnquiryPage",
      icon: TodayIcon,
      path: "/dashboard/enquiry",
      roles: ["SuperAdmin"],
    },
    {
      text: "Advertisements",
      icon: TodayIcon,
      path: "/dashboard/advertisements",
      roles: ["SuperAdmin"],
    },
    {
      text: "MNI",
      icon: CorporateFareIcon,
      path: "/dashboard/mni-data",
      roles: ["SuperAdmin"],
    },
  ];

  const filteredListItems = mainListItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
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
                  // left accent bar when selected
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
                  {/* icon pill */}
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

                {/* label */}
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
