import * as React from "react";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SelectContent from "./SelectContent";
import MenuContent from "./MenuContent";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const AVATAR_GRADIENT = "linear-gradient(135deg, #f2913f 0%, #ea6d11 100%)";
const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 74;

export default function SideMenu() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const username = user?.userName || "Guest";
  const role = user?.userRole || "Guest";
  const [collapsed, setCollapsed] = React.useState(false);

  const cardWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const collapseButton = (
    <Tooltip title={collapsed ? "Expand" : "Collapse"} placement="right" arrow>
      <IconButton
        onClick={() => setCollapsed((prev) => !prev)}
        disableRipple
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: "50%",
          color: "#94A3B8",
          background: "#f4f5f7",
          border: "1px solid #eceef1",
          transition: "all 0.2s ease",
          "&:hover": { color: "#ea6d11", background: "#fdf2e8" },
        }}
      >
        {collapsed ? (
          <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
        ) : (
          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  );

  const avatar = (
    <Avatar
      alt={username}
      onClick={() => navigate("/dashboard/profile")}
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        background: AVATAR_GRADIENT,
        color: "#fff",
        fontWeight: 600,
        fontSize: "0.82rem",
        cursor: "pointer",
      }}
    >
      {getInitials(username)}
    </Avatar>
  );

  return (
    <MuiDrawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width: cardWidth,
        flexShrink: 0,
        transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        [`& .${drawerClasses.paper}`]: {
          width: cardWidth,
          boxSizing: "border-box",
          border: "none",
          borderRight: "1px solid rgba(15, 23, 42, 0.06)",
          background: "#ffffff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      }}
    >
      {collapsed ? (
        <Stack alignItems="center" spacing={1.25} sx={{ px: 1, pt: 2, pb: 1 }}>
          <Box
            component="img"
            src="/apple-touch-icon.png"
            alt="Logo"
            sx={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
          />
          {collapseButton}
        </Stack>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2,
            pt: 2,
            pb: 1.25,
          }}
        >
          <Box sx={{ minWidth: 0, transform: "scale(0.78)", transformOrigin: "left center" }}>
            <SelectContent />
          </Box>
          {collapseButton}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <MenuContent railCollapsed={collapsed} />
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
        {collapsed ? (
          <Stack alignItems="center" sx={{ py: 1.5 }}>
            <Tooltip title={`${username} · ${role}`} placement="right" arrow>
              {avatar}
            </Tooltip>
          </Stack>
        ) : (
          <Stack
            direction="row"
            onClick={() => navigate("/dashboard/profile")}
            sx={{
              px: 1.5,
              py: 1.25,
              gap: 1.25,
              alignItems: "center",
              cursor: "pointer",
              borderRadius: "12px",
              m: 1,
              transition: "background 0.2s ease",
              "&:hover": { background: "rgba(234, 109, 17, 0.06)" },
            }}
          >
            {avatar}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#1E293B", lineHeight: 1.3 }}
              >
                {username}
              </Typography>
              <Typography noWrap sx={{ fontSize: "0.72rem", color: "#64748B" }}>
                {role}
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>
    </MuiDrawer>
  );
}
