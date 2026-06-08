import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import MarkChatReadIcon from "@mui/icons-material/MarkChatRead";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import {
  fetchChatConversations,
  fetchChatMessages,
  getAdminChatToken,
  markChatRead,
  sendChatMessageApi,
  updateChatConversationStatus,
} from "../../services/chatService";
import { connectSocket } from "../../services/socketService";

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "Customer") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const mergeMessage = (list, message) => {
  if (!message) return list;
  const id = message.id || message._id;
  if (id && list.some((item) => (item.id || item._id) === id)) return list;
  return [...list, message];
};

const upsertConversation = (list, conversation) => {
  if (!conversation?.id) return list;
  const next = [conversation, ...list.filter((item) => item.id !== conversation.id)];
  return next.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt));
};

export default function AdminCustomerCareChat() {
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const endRef = useRef(null);

  const token = useMemo(() => getAdminChatToken(), []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const result = await fetchChatConversations({
        token,
        status,
        search,
        pageSize: 50,
      });
      setConversations(result.data || []);
      setSelected((current) => {
        if (!current) return result.data?.[0] || null;
        return result.data?.find((item) => item.id === current.id) || result.data?.[0] || null;
      });
    } finally {
      setLoadingList(false);
    }
  }, [search, status, token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!token || !selected?.id) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const result = await fetchChatMessages({
          conversationId: selected.id,
          token,
          pageSize: 80,
        });
        if (!cancelled) {
          setMessages(result.data || []);
          await markChatRead({ conversationId: selected.id, token });
          setConversations((prev) => prev.map((item) =>
            item.id === selected.id ? { ...item, unreadForAdmin: 0 } : item
          ));
          scrollToEnd();
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [scrollToEnd, selected?.id, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSocket(token);
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleConversationUpdated = (conversation) => {
      setConversations((prev) => upsertConversation(prev, conversation));
      setSelected((current) => current?.id === conversation.id ? conversation : current);
    };
    const handleMessageNew = (payload) => {
      if (payload?.conversation) handleConversationUpdated(payload.conversation);
      if (payload?.message?.conversationId && selected?.id === String(payload.message.conversationId)) {
        setMessages((prev) => mergeMessage(prev, payload.message));
        markChatRead({ conversationId: selected.id, token }).catch(() => {});
        scrollToEnd();
      }
    };

    setConnected(Boolean(socket?.connected));
    socket?.on("connect", handleConnect);
    socket?.on("disconnect", handleDisconnect);
    socket?.on("chat:conversation:updated", handleConversationUpdated);
    socket?.on("chat:message:new", handleMessageNew);

    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.off("chat:conversation:updated", handleConversationUpdated);
      socket?.off("chat:message:new", handleMessageNew);
    };
  }, [scrollToEnd, selected?.id, token]);

  useEffect(() => {
    if (!token || !selected?.id) return undefined;
    const socket = connectSocket(token);
    socket?.emit("chat:join", { conversationId: selected.id });
    return () => socket?.emit("chat:leave", { conversationId: selected.id });
  }, [selected?.id, token]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selected?.id || sending) return;

    setSending(true);
    setInput("");
    try {
      const result = await sendChatMessageApi({
        conversationId: selected.id,
        text,
        token,
      });
      setSelected(result.conversation);
      setConversations((prev) => upsertConversation(prev, result.conversation));
      setMessages((prev) => mergeMessage(prev, result.message));
      scrollToEnd();
    } catch (error) {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (nextStatus) => {
    if (!selected?.id) return;
    const updated = await updateChatConversationStatus({
      conversationId: selected.id,
      status: nextStatus,
      token,
    });
    setSelected(updated);
    setConversations((prev) => upsertConversation(prev, updated));
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto" }}>
      <Box sx={{ mb: 3, width: "100%" }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#111827", mb: 0.5 }}>
              Customer Care Chat
            </Typography>
            <Typography sx={{ color: "#64748b" }}>
              Shared inbox for realtime customer support conversations.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              color={connected ? "success" : "default"}
              label={connected ? "Socket live" : "Socket connecting"}
            />
            <IconButton onClick={loadConversations}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Paper sx={{ width: "100%", height: "calc(100vh - 210px)", minHeight: 560, display: "grid", gridTemplateColumns: { xs: "1fr", md: "360px 1fr" }, overflow: "hidden", borderRadius: 2 }}>
        <Box sx={{ borderRight: { md: "1px solid #e5e7eb" }, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
            <ToggleButtonGroup
              fullWidth
              size="small"
              exclusive
              value={status}
              onChange={(_, value) => value && setStatus(value)}
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="open">Open</ToggleButton>
              <ToggleButton value="closed">Closed</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: "auto" }}>
            {loadingList && <CircularProgress size={28} sx={{ m: 3, color: "#ff7a00" }} />}
            {!loadingList && conversations.length === 0 && (
              <Box sx={{ p: 3, color: "#64748b", textAlign: "center" }}>
                No {status === "all" ? "" : status} chats found.
              </Box>
            )}
            <List disablePadding>
              {conversations.map((conversation) => {
                const active = selected?.id === conversation.id;
                return (
                  <ListItemButton
                    key={conversation.id}
                    selected={active}
                    onClick={() => setSelected(conversation)}
                    sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5, borderBottom: "1px solid #f1f5f9" }}
                  >
                    <Badge badgeContent={conversation.unreadForAdmin || 0} color="error">
                      <Avatar sx={{ bgcolor: active ? "#ff7a00" : "#0f172a" }}>
                        {getInitials(conversation.customerName)}
                      </Avatar>
                    </Badge>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Typography noWrap sx={{ fontWeight: 800, color: "#111827" }}>
                          {conversation.customerName || "Customer"}
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>
                          {formatTime(conversation.lastMessageAt)}
                        </Typography>
                      </Stack>
                      <Typography sx={{ color: "#64748b", fontSize: 12 }}>
                        {conversation.customerMobile || "No mobile"}
                      </Typography>
                      <Typography noWrap sx={{ color: "#475569", fontSize: 13, mt: 0.5 }}>
                        {conversation.lastMessageText || "No messages yet"}
                      </Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {!selected ? (
            <Box sx={{ m: "auto", textAlign: "center", color: "#64748b" }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 54, mb: 1, color: "#cbd5e1" }} />
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Select a conversation</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                    {selected.customerName || "Customer"}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    {selected.customerMobile || "No mobile"} · {selected.status}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<MarkChatReadIcon />}
                    onClick={() => markChatRead({ conversationId: selected.id, token })}
                  >
                    Mark read
                  </Button>
                  <Button
                    size="small"
                    color={selected.status === "closed" ? "success" : "error"}
                    variant="outlined"
                    startIcon={<CloseIcon />}
                    onClick={() => handleStatusUpdate(selected.status === "closed" ? "open" : "closed")}
                  >
                    {selected.status === "closed" ? "Reopen" : "Close"}
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ flex: 1, overflow: "auto", p: 2.5, bgcolor: "#f8fafc" }}>
                {loadingMessages && <CircularProgress size={28} sx={{ color: "#ff7a00" }} />}
                {!loadingMessages && messages.length === 0 && (
                  <Box sx={{ textAlign: "center", color: "#64748b", mt: 8 }}>
                    No messages in this conversation yet.
                  </Box>
                )}
                <Stack spacing={1.5}>
                  {messages.map((message) => {
                    const isAdmin = message.senderType === "admin";
                    return (
                      <Box key={message.id || message._id} sx={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                        <Box sx={{
                          maxWidth: "72%",
                          px: 1.6,
                          py: 1.1,
                          borderRadius: 2,
                          bgcolor: isAdmin ? "#ff7a00" : "#ffffff",
                          color: isAdmin ? "#ffffff" : "#0f172a",
                          border: isAdmin ? "none" : "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
                        }}>
                          <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14 }}>
                            {message.text}
                          </Typography>
                          <Typography sx={{ mt: 0.7, fontSize: 11, opacity: 0.68 }}>
                            {message.senderName || (isAdmin ? "Admin" : "Customer")} · {formatTime(message.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
                <div ref={endRef} />
              </Box>

              <Divider />
              <Box sx={{ p: 1.5, display: "grid", gridTemplateColumns: "1fr auto", gap: 1.2 }}>
                <TextField
                  size="small"
                  multiline
                  maxRows={3}
                  value={input}
                  placeholder={selected.status === "closed" ? "Reply to reopen this chat" : "Type a reply"}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  sx={{ minWidth: 48, bgcolor: "#ff7a00", "&:hover": { bgcolor: "#e65100" } }}
                >
                  {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
