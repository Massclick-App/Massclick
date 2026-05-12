import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import Badge from "@mui/material/Badge";
import { useSelector, useDispatch } from "react-redux";
import { getPendingBusinessList } from "../redux/actions/businessListAction";
// import CustomDatePicker from "../components/customDatePicker";
import NavbarBreadcrumbs from "./NavbarBreadCrump.js";
import MenuButton from "./MenuButton";
import OptionsMenu from "./OptionsMenu.js";
import NotificationModal from "./notificationModel.js";
import { connectSocket } from "../services/socketService.js";

export default function Header() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

useEffect(() => {
  dispatch(getPendingBusinessList());

  const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
  if (!token) return;

  const ws = connectSocket(token);

  const onBusinessPending = (data) => {
    console.log('[Header] business:pending event received:', data);
    dispatch(getPendingBusinessList());
  };

  // Wait for socket connection before joining room
  if (ws.connected) {
    console.log('[Header] Socket already connected, joining admin:global room');
    ws.emit("room:join", { room: "admin:global" });
  } else {
    console.log('[Header] Socket not connected yet, waiting for connection');
    ws.once("connect", () => {
      console.log('[Header] Socket connected, joining admin:global room');
      ws.emit("room:join", { room: "admin:global" });
    });
  }

  ws.on("business:pending", onBusinessPending);

  return () => {
    ws.off("business:pending", onBusinessPending);
  };
}, [dispatch]);

  const pendingCount = useSelector(
    (state) => state.businessListReducer.pendingBusinessList?.length || 0
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Stack
        direction="row"
        sx={{
          display: { xs: "none", md: "flex" },
          width: "100%",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          maxWidth: { sm: "100%", md: "1700px" },
          pt: 1.5,
        }}
        spacing={2}
      >
        <NavbarBreadcrumbs />

        <Stack direction="row" sx={{ gap: 1 }}>
          {/* <CustomDatePicker /> */}

          <MenuButton aria-label="Open notifications" onClick={handleOpen}>
            <Badge
              badgeContent={pendingCount}
              color="error"
              max={99}
              overlap="circular"
            >
              <NotificationsRoundedIcon />
            </Badge>
          </MenuButton>

          <OptionsMenu />
        </Stack>
      </Stack>

      <NotificationModal open={open} handleClose={handleClose} />
    </>
  );
}
