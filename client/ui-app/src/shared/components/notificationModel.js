import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import PhoneInTalkRoundedIcon from "@mui/icons-material/PhoneInTalkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { editBusinessList, getPendingBusinessList } from "state/actions/businessListAction.js";
import { getAllEnquiry } from "state/actions/enquiryAction.js";
import { getAllEventCreation } from "state/actions/eventAction.js";
import { getSearchRequests } from "state/actions/searchRequestAction.js";
import { fetchRewardClaims } from "shared/services/rewardService.js";
import {
  fetchChatConversations,
  fetchChatUnreadCount,
  markChatRead,
} from "shared/services/chatService.js";

const CATEGORY_META = {
  all: { label: "All" },
  business: { label: "Business", icon: BusinessCenterRoundedIcon },
  chat: { label: "CareChat", icon: ChatBubbleRoundedIcon },
  event: { label: "Events", icon: EventAvailableRoundedIcon },
  enquiry: { label: "Enquiries", icon: MailRoundedIcon },
  searchRequest: { label: "Search Requests", icon: SearchRoundedIcon },
  rewardClaim: { label: "Reward Claims", icon: RedeemRoundedIcon },
};

const CATEGORY_ORDER = ["all", "rewardClaim", "business", "chat", "event", "enquiry", "searchRequest"];
const RECENT_DAYS = 7;
const BRAND_ORANGE = "#ff6a00";
const BRAND_NAVY = "#07145f";

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (value) => {
  const date = toDate(value);
  if (!date) return "No date";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateLabel = (value) => {
  const date = toDate(value);
  if (!date) return "Earlier";

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday - startDate) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isRecent = (value) => {
  const date = toDate(value);
  if (!date) return false;
  return Date.now() - date.getTime() <= RECENT_DAYS * 24 * 60 * 60 * 1000;
};

const getInitials = (value = "N") => {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "N";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};

const compact = (value, fallback = "Not available") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

export default function NotificationDropdown({ open, handleClose, onCountChange }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    pendingBusinessList = [],
    pendingBusinessLoading,
  } = useSelector((state) => state.businessListReducer);
  const { users = [] } = useSelector((state) => state.userReducer);
  const { enquiries = [], loading: enquiryLoading } = useSelector((state) => state.enquiryReducer);
  const { requests: searchRequests = [], loading: searchRequestLoading } = useSelector((state) => state.searchRequests);
  const eventCreation = useSelector((state) => state.event?.eventCreation || {});

  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [chatConversations, setChatConversations] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [rewardClaims, setRewardClaims] = useState([]);
  const [rewardClaimsLoading, setRewardClaimsLoading] = useState(false);
  const categoryScrollerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const scrollCategories = (direction) => {
    categoryScrollerRef.current?.scrollBy({
      left: direction * Math.min(260, categoryScrollerRef.current.clientWidth * 0.65),
      behavior: "smooth",
    });
  };

  const getUserName = (id) => users.find((u) => u._id === id)?.userName || "Admin";

  const loadChatNotifications = useCallback(async () => {
    setChatLoading(true);
    try {
      const [unread, conversations] = await Promise.all([
        fetchChatUnreadCount().catch(() => ({ admin: 0 })),
        fetchChatConversations({ status: "open", pageSize: 20 }).catch(() => ({ data: [] })),
      ]);
      setChatUnreadCount(unread?.admin || 0);
      setChatConversations(
        (conversations?.data || []).filter((conversation) => Number(conversation.unreadForAdmin || 0) > 0)
      );
    } finally {
      setChatLoading(false);
    }
  }, []);

  const loadRewardClaimNotifications = useCallback(async () => {
    setRewardClaimsLoading(true);
    try {
      const result = await fetchRewardClaims({ status: "pending", page: 1, limit: 100 });
      setRewardClaims(result?.data || []);
    } catch {
      setRewardClaims([]);
    } finally {
      setRewardClaimsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(() => {
    dispatch(getPendingBusinessList());
    dispatch(getAllEnquiry());
    dispatch(getAllEventCreation({ pageNo: 1, pageSize: 25, options: { sortBy: "createdAt", sortOrder: "desc" } }));
    dispatch(getSearchRequests({ page: 1, limit: 100, status: "new" }));
    loadChatNotifications();
    loadRewardClaimNotifications();
  }, [dispatch, loadChatNotifications, loadRewardClaimNotifications]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [loadNotifications, open]);

  useEffect(() => {
    const refreshRewardClaims = () => {
      if (open) loadRewardClaimNotifications();
    };
    window.addEventListener("reward-claims:changed", refreshRewardClaims);
    return () => window.removeEventListener("reward-claims:changed", refreshRewardClaims);
  }, [loadRewardClaimNotifications, open]);

  const handleMakeLive = async (business) => {
    try {
      setLoadingId(business._id);
      await dispatch(
        editBusinessList(business._id, {
          businessName: business.businessName,
          category: business.category,
          location: business.location,
          businessesLive: true,
        })
      );
      setToastMessage(`${business.businessName || "Business"} is now live.`);
      setToastOpen(true);
    } finally {
      setLoadingId(null);
    }
  };

  const handleNavigate = (path) => {
    handleClose();
    navigate(path);
  };

  const handleMarkChatRead = async (conversationId) => {
    await markChatRead({ conversationId });
    await loadChatNotifications();
  };

  const notifications = useMemo(() => {
    const rewardClaimItems = rewardClaims.map((claim) => ({
      id: `reward-claim-${claim._id}`,
      category: "rewardClaim",
      raw: claim,
      title: claim.businessName || "New reward claim",
      subtitle: `${claim.customerName || claim.customerKey} claims ${Number(claim.projectedPoints || 0).toLocaleString("en-IN")} points`,
      details: [
        { icon: SmartphoneRoundedIcon, label: "Customer", value: claim.customerKey },
        { icon: BusinessCenterRoundedIcon, label: "Business", value: claim.businessName },
        { icon: RedeemRoundedIcon, label: "Expected points", value: `${Number(claim.projectedPoints || 0).toLocaleString("en-IN")} points` },
        { icon: AccessTimeRoundedIcon, label: "Submitted", value: formatTime(claim.createdAt) },
      ],
      createdAt: claim.createdAt,
      unread: 1,
      actionLabel: "Review claim",
    }));

    const businessItems = pendingBusinessList.map((business) => ({
      id: `business-${business._id}`,
      category: "business",
      raw: business,
      title: business.businessName || business.name || "New business listing",
      subtitle: `${compact(business.category, "No category")} in ${compact(business.location, "No location")}`,
      details: [
        { icon: SmartphoneRoundedIcon, label: "Mobile", value: business.contact },
        { icon: PlaceRoundedIcon, label: "Location", value: business.location },
        { icon: AccessTimeRoundedIcon, label: "Created", value: formatTime(business.createdAt) },
      ],
      createdAt: business.createdAt,
      actionLabel: "Make live",
    }));

    const chatItems = chatConversations.map((conversation) => ({
      id: `chat-${conversation.id}`,
      category: "chat",
      raw: conversation,
      title: conversation.customerName || "CareChat customer",
      subtitle: conversation.lastMessageText || "New chat message",
      details: [
        { icon: SmartphoneRoundedIcon, label: "Mobile", value: conversation.customerMobile },
        { icon: ChatBubbleRoundedIcon, label: "Unread", value: `${conversation.unreadForAdmin || 0} message(s)` },
        { icon: AccessTimeRoundedIcon, label: "Last active", value: formatTime(conversation.lastMessageAt || conversation.updatedAt) },
      ],
      createdAt: conversation.lastMessageAt || conversation.updatedAt,
      unread: conversation.unreadForAdmin || 0,
      actionLabel: "Open chat",
    }));

    const eventItems = (eventCreation.data || [])
      .filter((event) => isRecent(event.createdAt))
      .map((event) => ({
        id: `event-${event._id}`,
        category: "event",
        raw: event,
        title: event.eventName || "New event created",
        subtitle: `${compact(event.eventType, "Event")} - ${compact(event.status, "upcoming")}`,
        details: [
          { icon: EventAvailableRoundedIcon, label: "Event date", value: formatTime(event.startDate) },
          { icon: AccessTimeRoundedIcon, label: "Created", value: formatTime(event.createdAt) },
        ],
        createdAt: event.createdAt,
        actionLabel: "Review event",
      }));

    const enquiryItems = enquiries
      .filter((enquiry) => isRecent(enquiry.submittedAt || enquiry.createdAt))
      .map((enquiry) => ({
        id: `enquiry-${enquiry._id}`,
        category: "enquiry",
        raw: enquiry,
        title: enquiry.fullName || "New enquiry",
        subtitle: `${compact(enquiry.businessName, "Business enquiry")} - ${compact(enquiry.businessCategory, "General")}`,
        details: [
          { icon: SmartphoneRoundedIcon, label: "Contact", value: enquiry.contactNumber },
          { icon: MailRoundedIcon, label: "Email", value: enquiry.email },
          { icon: AccessTimeRoundedIcon, label: "Submitted", value: formatTime(enquiry.submittedAt || enquiry.createdAt) },
        ],
        createdAt: enquiry.submittedAt || enquiry.createdAt,
        actionLabel: "View enquiry",
      }));

    const searchRequestItems = searchRequests
      .filter((request) => request.status === "new" && request.isRead !== true && isRecent(request.createdAt))
      .map((request) => ({
        id: `search-request-${request._id}`,
        category: "searchRequest",
        raw: request,
        title: request.fullName || "New search request",
        subtitle: `${compact(request.category, "Requested service")} in ${compact(request.location, "No location")}`,
        details: [
          { icon: SmartphoneRoundedIcon, label: "Contact", value: request.contactNumber },
          { icon: MailRoundedIcon, label: "Email", value: request.email },
          { icon: SearchRoundedIcon, label: "Requirement", value: request.details },
          { icon: AccessTimeRoundedIcon, label: "Submitted", value: formatTime(request.createdAt) },
        ],
        createdAt: request.createdAt,
        actionLabel: "View requests",
      }));

    return [...rewardClaimItems, ...businessItems, ...chatItems, ...eventItems, ...enquiryItems, ...searchRequestItems]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  }, [chatConversations, enquiries, eventCreation.data, pendingBusinessList, rewardClaims, searchRequests]);

  const counts = useMemo(() => ({
    all: notifications.length,
    business: notifications.filter((item) => item.category === "business").length,
    chat: chatUnreadCount || notifications.filter((item) => item.category === "chat").length,
    event: notifications.filter((item) => item.category === "event").length,
    enquiry: notifications.filter((item) => item.category === "enquiry").length,
    searchRequest: notifications.filter((item) => item.category === "searchRequest").length,
    rewardClaim: notifications.filter((item) => item.category === "rewardClaim").length,
  }), [chatUnreadCount, notifications]);

  useEffect(() => {
    onCountChange?.(counts.all);
  }, [counts.all, onCountChange]);

  const filteredNotifications = activeFilter === "all"
    ? notifications
    : notifications.filter((item) => item.category === activeFilter);

  const groupedNotifications = useMemo(() => (
    filteredNotifications.reduce((groups, item) => {
      const label = formatDateLabel(item.createdAt);
      const existing = groups.find((group) => group.label === label);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
      return groups;
    }, [])
  ), [filteredNotifications]);

  const isLoading = pendingBusinessLoading || enquiryLoading || eventCreation.loading || chatLoading || searchRequestLoading || rewardClaimsLoading;

  const runPrimaryAction = async (item) => {
    if (item.category === "business") return handleMakeLive(item.raw);
    if (item.category === "chat") return handleNavigate("/dashboard/customer-care");
    if (item.category === "event") return handleNavigate("/dashboard/event-creation");
    if (item.category === "rewardClaim") return handleNavigate("/dashboard/reward-claims");
    if (item.category === "searchRequest") return handleNavigate("/dashboard/search-requests");
    return handleNavigate("/dashboard/enquiry");
  };

  if (!open) return null;

  return (
    <>
      <Box
        onClick={handleClose}
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1398,
          bgcolor: { xs: "rgba(15, 23, 42, 0.28)", md: "transparent" },
        }}
      />
      <Box
        role="dialog"
        aria-label="Admin notifications"
        onClick={(event) => event.stopPropagation()}
        sx={{
          position: "fixed",
          zIndex: 1399,
          top: { xs: "auto", sm: 76, md: 84 },
          bottom: { xs: 0, sm: 16, md: "auto" },
          right: { xs: 0, sm: 16, md: 32 },
          left: { xs: 0, sm: "auto" },
          width: { xs: "100%", sm: 500, md: 560 },
          maxWidth: { xs: "100%", sm: "calc(100vw - 32px)" },
          height: { xs: "min(82dvh, 680px)", sm: "min(76dvh, 720px)", md: "min(72dvh, 760px)" },
          maxHeight: { xs: "calc(100dvh - 16px)", sm: "calc(100dvh - 92px)", md: "calc(100dvh - 108px)" },
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          border: "1px solid #edf0f6",
          borderRadius: { xs: "22px 22px 0 0", sm: "20px" },
          boxShadow: "0 24px 70px rgba(7, 20, 95, 0.20)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 1.8 }, borderBottom: "1px solid #edf2f7", flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: "#fff3e8", color: BRAND_ORANGE }}>
                <NotificationsActiveRoundedIcon />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, color: BRAND_NAVY, fontSize: { xs: 18, sm: 20 }, lineHeight: 1.1 }}>
                  Notifications
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: 13, mt: 0.4 }}>
                  Date-wise admin activity feed
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={0.5}>
              <IconButton
                onClick={loadNotifications}
                aria-label="Refresh notifications"
                sx={{ border: "1px solid #e4e8f1", borderRadius: 2, color: BRAND_NAVY }}
              >
                <RefreshRoundedIcon />
              </IconButton>
              <IconButton
                onClick={handleClose}
                aria-label="Close notifications"
                sx={{ border: "1px solid #e4e8f1", borderRadius: 2, color: BRAND_NAVY }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        <Stack direction="row" alignItems="center" sx={{
          px: { xs: 1, sm: 1.25 },
          py: 0.9,
          borderBottom: "1px solid #edf2f7",
          flexShrink: 0,
          bgcolor: "#fff",
        }}>
          <IconButton aria-label="Scroll categories left" onClick={() => scrollCategories(-1)} size="small" sx={{ flexShrink: 0, color: BRAND_NAVY }}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Box ref={categoryScrollerRef} sx={{ overflowX: "auto", flex: 1, scrollBehavior: "smooth", scrollbarWidth: "thin", scrollbarColor: "#b8c1d6 transparent", pb: 0.5, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "#b8c1d6", borderRadius: 99 } }}>
          <Stack direction="row" gap={0.75} sx={{ minWidth: "max-content" }}>
            {CATEGORY_ORDER.map((category) => {
              const active = activeFilter === category;
              return (
                <Chip
                  key={category}
                  label={`${CATEGORY_META[category].label} ${counts[category] || 0}`}
                  onClick={() => setActiveFilter(category)}
                  variant={active ? "filled" : "outlined"}
                  sx={{
                    height: 30,
                    borderRadius: "8px",
                    fontWeight: 800,
                    color: active ? "#ffffff" : BRAND_NAVY,
                    bgcolor: active ? BRAND_NAVY : "#ffffff",
                    borderColor: active ? BRAND_NAVY : "#d9dfeb",
                    "&:hover": {
                      bgcolor: active ? BRAND_NAVY : "#fff7f0",
                      borderColor: active ? BRAND_NAVY : BRAND_ORANGE,
                    },
                  }}
                />
              );
            })}
          </Stack>
          </Box>
          <IconButton aria-label="Scroll categories right" onClick={() => scrollCategories(1)} size="small" sx={{ flexShrink: 0, color: BRAND_NAVY }}>
            <ChevronRightRoundedIcon />
          </IconButton>
        </Stack>

        {isLoading ? (
          <Box sx={{ py: 7, display: "flex", justifyContent: "center" }}>
            <CircularProgress sx={{ color: "#f97316" }} />
          </Box>
        ) : (
          <List
            disablePadding
            sx={{
              flex: 1,
              minHeight: 0,
              overscrollBehavior: "contain",
              overflowY: "auto",
              bgcolor: "#f8fafc",
              scrollbarWidth: "thin",
              scrollbarColor: `${BRAND_NAVY} transparent`,
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "rgba(7, 20, 95, 0.34)",
                borderRadius: 999,
              },
            }}
          >
            {filteredNotifications.length === 0 ? (
              <Box sx={{ px: 3, py: 7, textAlign: "center" }}>
                <Avatar sx={{ mx: "auto", mb: 1.5, bgcolor: "#fff3e8", color: BRAND_ORANGE }}>
                  <TaskAltRoundedIcon />
                </Avatar>
                <Typography sx={{ fontWeight: 900, color: BRAND_NAVY }}>No new notifications</Typography>
                <Typography sx={{ color: "#64748b", fontSize: 13, mt: 0.5 }}>
                  New admin alerts will appear here only.
                </Typography>
              </Box>
            ) : (
              groupedNotifications.map((group) => (
                <Box key={group.label}>
                  <Box
                    sx={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      px: 2,
                      py: 0.85,
                      bgcolor: "#f8fafc",
                      borderBottom: "1px solid #e8edf5",
                    }}
                  >
                    <Typography sx={{ color: BRAND_NAVY, fontSize: 12, fontWeight: 900, letterSpacing: 0 }}>
                      {group.label}
                    </Typography>
                  </Box>

                  {group.items.map((item) => {
                    const meta = CATEGORY_META[item.category];
                    const Icon = meta.icon;
                    const expanded = expandedId === item.id;
                    const isSearchRequest = item.category === "searchRequest";

                    return (
                      <Box key={item.id} sx={{ bgcolor: "#ffffff", px: isSearchRequest ? 1 : 0, py: isSearchRequest ? 0.6 : 0 }}>
                        <ListItemButton
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          sx={{
                            alignItems: "flex-start",
                            gap: { xs: 1, sm: 1.35 },
                            px: { xs: 1.25, sm: 2 },
                            py: 1.35,
                            borderLeft: `3px solid ${expanded || item.unread || isSearchRequest ? BRAND_ORANGE : "transparent"}`,
                            borderRadius: isSearchRequest ? "12px 12px 0 0" : 0,
                            border: isSearchRequest ? "1px solid #f3e2d4" : undefined,
                            borderLeftWidth: isSearchRequest ? 4 : 3,
                            borderLeftColor: expanded || item.unread || isSearchRequest ? BRAND_ORANGE : "transparent",
                            bgcolor: expanded || isSearchRequest ? "#fffaf6" : "#ffffff",
                            "&:hover": { bgcolor: isSearchRequest ? "#fff6ee" : "#fff8f2" },
                          }}
                        >
                          <Badge badgeContent={item.unread || 0} color="error" invisible={!item.unread}>
                            <Avatar sx={{ bgcolor: isSearchRequest ? "#ff6a00" : "#fff3e8", color: isSearchRequest ? "#fff" : BRAND_ORANGE, boxShadow: isSearchRequest ? "0 6px 14px rgba(255,106,0,.22)" : "none", fontWeight: 900, width: 38, height: 38 }}>
                              {Icon ? <Icon fontSize="small" /> : getInitials(item.title)}
                            </Avatar>
                          </Badge>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} gap={{ xs: 0.35, sm: 1 }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontWeight: 900, color: BRAND_NAVY, fontSize: 14.5 }}>
                                  {item.title}
                                </Typography>
                                <Typography noWrap sx={{ color: "#334155", fontSize: 12.5, mt: 0.25 }}>
                                  {item.subtitle}
                                </Typography>
                              </Box>
                              <Typography sx={{ color: "#7c89a3", fontSize: 11, whiteSpace: "nowrap", pt: 0.2, order: { xs: -1, sm: 0 } }}>
                                {formatTime(item.createdAt)}
                              </Typography>
                            </Stack>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{
                                mt: 0.85,
                                height: 21,
                                borderRadius: "7px",
                                bgcolor: isSearchRequest ? "#fff0e5" : "#f3f5fa",
                                color: isSearchRequest ? "#c2410c" : BRAND_NAVY,
                                border: isSearchRequest ? "1px solid #fed7aa" : "1px solid #dfe5f0",
                                fontWeight: 800,
                              }}
                            />
                          </Box>
                        </ListItemButton>

                        {expanded && (
                          <Box sx={{ px: 2, pb: 1.6, pt: isSearchRequest ? 1.1 : 0, pl: { xs: 2, sm: 8 }, bgcolor: isSearchRequest ? "#fffaf6" : "#fff8f2", border: isSearchRequest ? "1px solid #f3e2d4" : 0, borderTop: 0, borderRadius: isSearchRequest ? "0 0 12px 12px" : 0 }}>
                            <Stack gap={isSearchRequest ? 1 : 0.75} sx={{ mb: 1.35, p: isSearchRequest ? 1.25 : 0, bgcolor: isSearchRequest ? "#fff" : "transparent", border: isSearchRequest ? "1px solid #f1e8e0" : 0, borderRadius: isSearchRequest ? 2 : 0 }}>
                              {item.details.map(({ icon: DetailIcon, label, value }) => (
                                <Stack key={label} direction="row" alignItems="center" gap={1}>
                                  <DetailIcon sx={{ color: BRAND_ORANGE, fontSize: 17 }} />
                                  <Typography sx={{ color: "#334155", fontSize: 12.8 }}>
                                    <Box component="span" sx={{ fontWeight: 900, color: BRAND_NAVY }}>{label}:</Box>{" "}
                                    {compact(value)}
                                  </Typography>
                                </Stack>
                              ))}
                              {item.category === "business" && (
                                <Typography sx={{ color: "#334155", fontSize: 12.8 }}>
                                  <Box component="span" sx={{ fontWeight: 900, color: BRAND_NAVY }}>Created by:</Box>{" "}
                                  {getUserName(item.raw.createdBy)}
                                </Typography>
                              )}
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                              <Button
                                variant="contained"
                                onClick={() => runPrimaryAction(item)}
                                disabled={loadingId === item.raw._id}
                                endIcon={item.category === "business" ? <TaskAltRoundedIcon /> : isSearchRequest ? <PhoneInTalkRoundedIcon /> : <OpenInNewRoundedIcon />}
                                sx={{
                                  borderRadius: "8px",
                                  textTransform: "none",
                                  fontWeight: 900,
                                  bgcolor: isSearchRequest ? BRAND_NAVY : BRAND_ORANGE,
                                  color: "#ffffff",
                                  boxShadow: "0 8px 18px rgba(255, 106, 0, 0.24)",
                                  "&:hover": { bgcolor: isSearchRequest ? "#13247d" : "#e85f00" },
                                  "&:disabled": { bgcolor: "#f5b07b", color: "#ffffff" },
                                }}
                              >
                                {loadingId === item.raw._id ? "Updating..." : item.actionLabel}
                              </Button>
                              {item.category === "chat" && (
                                <Button
                                  variant="outlined"
                                  onClick={() => handleMarkChatRead(item.raw.id)}
                                  sx={{
                                    borderRadius: "8px",
                                    textTransform: "none",
                                    fontWeight: 900,
                                    color: BRAND_NAVY,
                                    borderColor: BRAND_NAVY,
                                    "&:hover": { borderColor: BRAND_NAVY, bgcolor: "rgba(7, 20, 95, 0.06)" },
                                  }}
                                >
                                  Mark read
                                </Button>
                              )}
                            </Stack>
                          </Box>
                        )}
                        <Divider sx={{ borderColor: "#eef2f7" }} />
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}
          </List>
        )}
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
