import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import { Typography, Box, Fade } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import MenuButton from "./MenuButton";
import MenuContent from "./MenuContent";
import NotificationDropdown from "./notificationModel.js"; 

export default function SideMenuMobile({ open, toggleDrawer, handleClose }) {
  const [openNotif, setOpenNotif] = React.useState(false);
  const accentColor = "#f57c00";

  const handleNotifToggle = () => {
    setOpenNotif((prev) => !prev);
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
          maxWidth: "75dvw",
          height: "100%",
          position: "relative",
        }}
      >
        <Stack direction="row" sx={{ p: 2, pb: 0, gap: 1 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: "center", flexGrow: 1, p: 1 }}
          >
            <Avatar
              sizes="small"
              alt="Riley Carter"
              src="/static/images/avatar/7.jpg"
              sx={{
                width: 28,
                height: 28,
                border: `2px solid ${accentColor}`,
              }}
            />
            <Typography component="p" variant="h6" sx={{ fontWeight: 600 }}>
              Riley Carter
            </Typography>
          </Stack>

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

        <Stack sx={{ flexGrow: 1, overflowY: "auto" }}>
          <MenuContent onItemClick={handleClose} />
          <Divider />
        </Stack>

        <Stack sx={{ p: 2 }}>
          <Button
            variant="outlined"
            fullWidth
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
