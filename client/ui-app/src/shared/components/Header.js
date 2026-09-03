import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import Badge from "@mui/material/Badge";
import { useSelector, useDispatch } from "react-redux";
import { getPendingBusinessList } from "state/actions/businessListAction.js";
import { getAllEnquiry } from "state/actions/enquiryAction.js";
import { getAllEventCreation } from "state/actions/eventAction.js";
import { getSearchRequests } from "state/actions/searchRequestAction.js";
// import CustomDatePicker from "../components/customDatePicker";
import NavbarBreadcrumbs from "shared/components/NavbarBreadCrump.js";
import MenuButton from "shared/components/MenuButton.js";
import OptionsMenu from "shared/components/OptionsMenu.js";
import NotificationModal from "shared/components/notificationModel.js";
import { connectSocket } from "shared/services/socketService.js";
import { fetchChatUnreadCount } from "shared/services/chatService.js";
import { fetchRewardClaims } from "shared/services/rewardService.js";
import { getAuthSnapshot } from "app/auth/authStore.js";

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
  const [pendingRewardClaimCount, setPendingRewardClaimCount] = useState(0);

useEffect(() => {
  dispatch(getPendingBusinessList());
  dispatch(getAllEnquiry());
  dispatch(getAllEventCreation({ pageNo: 1, pageSize: 25, options: { sortBy: "createdAt", sortOrder: "desc" } }));
  dispatch(getSearchRequests({ page: 1, limit: 100, status: "new" }));
  fetchChatUnreadCount().then((data) => setChatUnreadCount(data?.admin || 0)).catch(() => setChatUnreadCount(0));
  const loadRewardClaimCount = () => fetchRewardClaims({ status: "pending", page: 1, limit: 1 })
    .then((data) => setPendingRewardClaimCount(data?.total || 0))
    .catch(() => setPendingRewardClaimCount(0));
  loadRewardClaimCount();

  const authSnapshot = getAuthSnapshot();
  const token = authSnapshot.admin.accessToken;
  if (!token) return;

  const ws = connectSocket(token);

  const onBusinessPending = () => {
    dispatch(getPendingBusinessList());
  };
  const onChatUnread = (data) => {
    setChatUnreadCount(data?.admin || 0);
  };
  const onChatChanged = () => {
    fetchChatUnreadCount().then((data) => setChatUnreadCount(data?.admin || 0)).catch(() => {});
  };
  const onRewardClaimChanged = () => {
    loadRewardClaimCount();
    window.dispatchEvent(new Event("reward-claims:changed"));
  };

  // Wait for socket connection before joining room
  if (ws.connected) {
    ws.emit("room:join", { room: "admin:global" });
  } else {
    ws.once("connect", () => {
      ws.emit("room:join", { room: "admin:global" });
    });
  }

  ws.on("business:pending", onBusinessPending);
  ws.on("chat:unread:count", onChatUnread);
  ws.on("chat:conversation:updated", onChatChanged);
  ws.on("reward:claim:changed", onRewardClaimChanged);

  return () => {
    ws.off("business:pending", onBusinessPending);
    ws.off("chat:unread:count", onChatUnread);
    ws.off("chat:conversation:updated", onChatChanged);
    ws.off("reward:claim:changed", onRewardClaimChanged);
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
  const recentSearchRequestCount = useSelector(
    (state) => (state.searchRequests.requests || []).filter((item) => item.status === "new" && item.isRead !== true && isRecent(item.createdAt)).length
  );
  const notificationCount = modalCount ?? (pendingCount + pendingRewardClaimCount + chatUnreadCount + recentEnquiryCount + recentEventCount + recentSearchRequestCount);

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
