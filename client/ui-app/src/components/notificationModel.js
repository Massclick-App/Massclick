import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { editBusinessList, getPendingBusinessList } from "../redux/actions/businessListAction";
import { getAllEnquiry } from "../redux/actions/enquiryAction";
import { getAllEventCreation } from "../redux/actions/eventAction";
import {
  fetchChatConversations,
  fetchChatUnreadCount,
  markChatRead,
} from "../services/chatService";

const CATEGORY_META = {
  all: { label: "All" },
  business: { label: "Business", icon: BusinessCenterRoundedIcon },
  chat: { label: "CareChat", icon: ChatBubbleRoundedIcon },
  event: { label: "Events", icon: EventAvailableRoundedIcon },
  enquiry: { label: "Enquiries", icon: MailRoundedIcon },
};

const CATEGORY_ORDER = ["all", "business", "chat", "event", "enquiry"];
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
  const eventCreation = useSelector((state) => state.event?.eventCreation || {});

  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [chatConversations, setChatConversations] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

  const loadNotifications = useCallback(() => {
    dispatch(getPendingBusinessList());
    dispatch(getAllEnquiry());
    dispatch(getAllEventCreation({ pageNo: 1, pageSize: 25, options: { sortBy: "createdAt", sortOrder: "desc" } }));
    loadChatNotifications();
  }, [dispatch, loadChatNotifications]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [loadNotifications, open]);

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

    return [...businessItems, ...chatItems, ...eventItems, ...enquiryItems]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  }, [chatConversations, enquiries, eventCreation.data, pendingBusinessList]);

  const counts = useMemo(() => ({
    all: notifications.length,
    business: notifications.filter((item) => item.category === "business").length,
    chat: chatUnreadCount || notifications.filter((item) => item.category === "chat").length,
    event: notifications.filter((item) => item.category === "event").length,
    enquiry: notifications.filter((item) => item.category === "enquiry").length,
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

  const isLoading = pendingBusinessLoading || enquiryLoading || eventCreation.loading || chatLoading;

  const runPrimaryAction = (item) => {
    if (item.category === "business") return handleMakeLive(item.raw);
    if (item.category === "chat") return handleNavigate("/dashboard/customer-care");
    if (item.category === "event") return handleNavigate("/dashboard/event-creation");
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
          top: { xs: "auto", md: 84 },
          bottom: { xs: 0, md: "auto" },
          right: { xs: 0, sm: 16, md: 32 },
          left: { xs: 0, sm: "auto" },
          width: { xs: "100%", sm: 480, md: 540 },
          maxWidth: { xs: "100%", sm: "calc(100vw - 32px)" },
          height: { xs: "72vh", sm: "62vh", md: "56vh" },
          maxHeight: { xs: "72vh", sm: "62vh", md: "56vh" },
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          border: "1px solid #edf0f6",
          borderRadius: { xs: "20px 20px 0 0", sm: "18px" },
          boxShadow: "0 22px 60px rgba(7, 20, 95, 0.16)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 2.25, py: 1.8, borderBottom: "1px solid #edf2f7" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: "#fff3e8", color: BRAND_ORANGE }}>
                <NotificationsActiveRoundedIcon />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, color: BRAND_NAVY, fontSize: 20, lineHeight: 1.1 }}>
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

        <Box sx={{
          px: 2,
          py: 1.1,
          borderBottom: "1px solid #edf2f7",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}>
          <Stack direction="row" gap={1} sx={{ minWidth: "max-content" }}>
            {CATEGORY_ORDER.map((category) => {
              const active = activeFilter === category;
              return (
                <Chip
                  key={category}
                  label={`${CATEGORY_META[category].label} ${counts[category] || 0}`}
                  onClick={() => setActiveFilter(category)}
                  variant={active ? "filled" : "outlined"}
                  sx={{
                    height: 28,
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

        {isLoading ? (
          <Box sx={{ py: 7, display: "flex", justifyContent: "center" }}>
            <CircularProgress sx={{ color: "#f97316" }} />
          </Box>
        ) : (
          <List
            disablePadding
            sx={{
              flex: 1,
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

                    return (
                      <Box key={item.id} sx={{ bgcolor: "#ffffff" }}>
                        <ListItemButton
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          sx={{
                            alignItems: "flex-start",
                            gap: 1.35,
                            px: 2,
                            py: 1.35,
                            borderLeft: `3px solid ${expanded || item.unread ? BRAND_ORANGE : "transparent"}`,
                            bgcolor: expanded ? "#fff8f2" : "#ffffff",
                            "&:hover": { bgcolor: "#fff8f2" },
                          }}
                        >
                          <Badge badgeContent={item.unread || 0} color="error" invisible={!item.unread}>
                            <Avatar sx={{ bgcolor: "#fff3e8", color: BRAND_ORANGE, fontWeight: 900, width: 38, height: 38 }}>
                              {Icon ? <Icon fontSize="small" /> : getInitials(item.title)}
                            </Avatar>
                          </Badge>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontWeight: 900, color: BRAND_NAVY, fontSize: 14.5 }}>
                                  {item.title}
                                </Typography>
                                <Typography noWrap sx={{ color: "#334155", fontSize: 12.5, mt: 0.25 }}>
                                  {item.subtitle}
                                </Typography>
                              </Box>
                              <Typography sx={{ color: "#7c89a3", fontSize: 11, whiteSpace: "nowrap", pt: 0.2 }}>
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
                                bgcolor: "#f3f5fa",
                                color: BRAND_NAVY,
                                border: "1px solid #dfe5f0",
                                fontWeight: 800,
                              }}
                            />
                          </Box>
                        </ListItemButton>

                        {expanded && (
                          <Box sx={{ px: 2, pb: 1.6, pl: { xs: 2, sm: 8 }, bgcolor: "#fff8f2" }}>
                            <Stack gap={0.75} sx={{ mb: 1.35 }}>
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
                                endIcon={item.category === "business" ? <TaskAltRoundedIcon /> : <OpenInNewRoundedIcon />}
                                sx={{
                                  borderRadius: "8px",
                                  textTransform: "none",
                                  fontWeight: 900,
                                  bgcolor: BRAND_ORANGE,
                                  color: "#ffffff",
                                  boxShadow: "0 8px 18px rgba(255, 106, 0, 0.24)",
                                  "&:hover": { bgcolor: "#e85f00" },
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
