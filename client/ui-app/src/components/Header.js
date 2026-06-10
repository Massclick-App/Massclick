import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import Badge from "@mui/material/Badge";
import { useSelector, useDispatch } from "react-redux";
import { getPendingBusinessList } from "../redux/actions/businessListAction";
import { getAllEnquiry } from "../redux/actions/enquiryAction";
import { getAllEventCreation } from "../redux/actions/eventAction";
// import CustomDatePicker from "../components/customDatePicker";
import NavbarBreadcrumbs from "./NavbarBreadCrump.js";
import MenuButton from "./MenuButton";
import OptionsMenu from "./OptionsMenu.js";
import NotificationModal from "./notificationModel.js";
import { connectSocket } from "../services/socketService.js";
import { fetchChatUnreadCount } from "../services/chatService.js";

const RECENT_DAYS = 7;

const isRecent = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= RECENT_DAYS * 24 * 60 * 60 * 1000;
};

export default function Header() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [modalCount, setModalCount] = useState(null);

useEffect(() => {
  dispatch(getPendingBusinessList());
  dispatch(getAllEnquiry());
  dispatch(getAllEventCreation({ pageNo: 1, pageSize: 25, options: { sortBy: "createdAt", sortOrder: "desc" } }));
  fetchChatUnreadCount().then((data) => setChatUnreadCount(data?.admin || 0)).catch(() => setChatUnreadCount(0));

  const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
  if (!token) return;

  const ws = connectSocket(token);

  const onBusinessPending = (data) => {
    console.log('[Header] business:pending event received:', data);
    dispatch(getPendingBusinessList());
  };
  const onChatUnread = (data) => {
    setChatUnreadCount(data?.admin || 0);
  };
  const onChatChanged = () => {
    fetchChatUnreadCount().then((data) => setChatUnreadCount(data?.admin || 0)).catch(() => {});
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
  ws.on("chat:unread:count", onChatUnread);
  ws.on("chat:conversation:updated", onChatChanged);

  return () => {
    ws.off("business:pending", onBusinessPending);
    ws.off("chat:unread:count", onChatUnread);
    ws.off("chat:conversation:updated", onChatChanged);
  };
}, [dispatch]);

  const pendingCount = useSelector(
    (state) => state.businessListReducer.pendingBusinessList?.length || 0
  );
  const recentEnquiryCount = useSelector(
    (state) => (state.enquiryReducer.enquiries || []).filter((item) => isRecent(item.submittedAt || item.createdAt)).length
  );
  const recentEventCount = useSelector(
    (state) => (state.event?.eventCreation?.data || []).filter((item) => isRecent(item.createdAt)).length
  );
  const notificationCount = modalCount ?? (pendingCount + chatUnreadCount + recentEnquiryCount + recentEventCount);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setModalCount(null);
  };

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
              badgeContent={notificationCount}
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

      <NotificationModal open={open} handleClose={handleClose} onCountChange={setModalCount} />
    </>
  );
}
