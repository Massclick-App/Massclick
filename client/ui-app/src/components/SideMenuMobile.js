import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import { Typography, Box, Fade } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import MenuButton from "./MenuButton";
import MenuContent from "./MenuContent";
import NotificationDropdown from "./notificationModel.js";
import SelectContent from "./SelectContent";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/actions/authAction.js";

export default function SideMenuMobile({ open, toggleDrawer, handleClose }) {
  const [openNotif, setOpenNotif] = React.useState(false);
  const accentColor = "#f57c00";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const username = user?.userName || "Guest";
  const role = user?.userRole || "Guest";

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const closeDrawer = () => {
    handleClose?.();
  };

  const handleNotifToggle = () => {
    setOpenNotif((prev) => !prev);
  };

  const handleProfileClick = () => {
    closeDrawer();
    navigate("/dashboard/profile");
  };

  const handleLogout = async () => {
    const id = user?._id?.$oid || user?._id;
    await dispatch(logout(id));
    closeDrawer();
    navigate("/admin");
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: "none",
          backgroundColor: "background.paper",
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          position: "relative",
          overflow: "hidden",
        },
      }}
    >
      <Stack
        sx={{
          width: "min(82vw, 320px)",
          maxWidth: "82vw",
          height: "100%",
          position: "relative",
          bgcolor: "#fafbfc",
        }}
      >
        <Stack direction="row" sx={{ p: 2, alignItems: "center", gap: 1.5 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <SelectContent />
          </Box>
          <MenuButton showBadge onClick={handleNotifToggle}>
            <NotificationsRoundedIcon
              sx={{
                color: accentColor,
                fontSize: 28,
                "&:hover": { color: "#ef6c00" },
              }}
            />
          </MenuButton>
        </Stack>

        <Divider />

        <Stack
          direction="row"
          onClick={handleProfileClick}
          sx={{
            px: 2,
            py: 1.5,
            gap: 1.5,
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <Avatar
            sizes="small"
            alt={username}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              color: "white",
              fontWeight: 600,
              fontSize: "0.95rem",
              flexShrink: 0,
            }}
          >
            {getInitials(username)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography noWrap variant="body2" sx={{ fontWeight: 600, color: "#222" }}>
              {username}
            </Typography>
            <Typography noWrap variant="caption" sx={{ color: "text.secondary" }}>
              {role}
            </Typography>
          </Box>
          <AccountCircleRoundedIcon sx={{ color: accentColor }} />
        </Stack>

        <Divider />

        <Stack sx={{ flexGrow: 1, overflowY: "auto" }}>
          <MenuContent onItemClick={closeDrawer} />
          <Divider />
        </Stack>

        <Stack sx={{ p: 2, gap: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleProfileClick}
            startIcon={<AccountCircleRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#ffd8bf",
              color: "#8a4d16",
              bgcolor: "#fff",
              "&:hover": {
                backgroundColor: "#fff7f1",
                borderColor: accentColor,
              },
            }}
          >
            View Profile
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={handleLogout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: accentColor,
              color: accentColor,
              "&:hover": {
                backgroundColor: "#fff3e0",
                borderColor: accentColor,
              },
            }}
          >
            Logout
          </Button>
        </Stack>

        <Fade in={openNotif}>
          <Box
            sx={{
              position: "absolute",
              top: "70px",
              right: "15px",
              width: "90%",
              bgcolor: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              borderRadius: 3,
              zIndex: 9999,
            }}
          >
            {openNotif && (
              <NotificationDropdown
                open={openNotif}
                handleClose={() => setOpenNotif(false)}
              />
            )}
          </Box>
        </Fade>
      </Stack>
    </Drawer>
  );
}
