import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import {
  fetchChatMessages,
  getCustomerChatToken,
  markChatRead,
  sendChatMessageApi,
  startChatConversation,
} from "../../services/chatService";
import { connectSocket, getSocket } from "../../services/socketService";
import styles from "./CustomerChatPanel.module.css";

const cx = createScopedClassNames(styles);

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const mergeMessage = (list, message) => {
  if (!message?.id && !message?._id) return list;
  const id = message.id || message._id;
  if (list.some((item) => (item.id || item._id) === id)) return list;
  return [...list, message];
};

export default function CustomerChatPanel({
  open = true,
  onClose,
  embedded = false,
  onRequireLogin,
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [, setAuthVersion] = useState(0);
  const endRef = useRef(null);

  const token = getCustomerChatToken();
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    const refreshAuth = () => setAuthVersion((value) => value + 1);
    window.addEventListener("authChange", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("authChange", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const loadConversation = useCallback(async () => {
    if (!open || !isLoggedIn) return;
    setLoading(true);
    setError("");

    try {
      const started = await startChatConversation(token);
      setConversation(started);

      const history = await fetchChatMessages({
        conversationId: started.id,
        token,
      });
      setMessages(history.data || []);
      await markChatRead({ conversationId: started.id, token });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to load chat.");
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [isLoggedIn, open, scrollToEnd, token]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!open || !isLoggedIn || !conversation?.id) return undefined;

    const socket = connectSocket(token);
    const handleConnect = () => {
      setConnected(true);
      getSocket()?.emit("chat:join", { conversationId: conversation.id });
    };
    const handleDisconnect = () => setConnected(false);
    const handleMessage = (payload) => {
      if (payload?.conversation?.id === conversation.id || payload?.message?.conversationId === conversation.id) {
        setConversation(payload.conversation || conversation);
        setMessages((prev) => mergeMessage(prev, payload.message));
        markChatRead({ conversationId: conversation.id, token }).catch(() => {});
        scrollToEnd();
      }
    };
    const handleConversation = (nextConversation) => {
      if (nextConversation?.id === conversation.id) setConversation(nextConversation);
    };

    setConnected(Boolean(socket?.connected));
    socket?.emit("chat:join", { conversationId: conversation.id });
    socket?.on("connect", handleConnect);
    socket?.on("disconnect", handleDisconnect);
    socket?.on("chat:message:new", handleMessage);
    socket?.on("chat:conversation:updated", handleConversation);

    return () => {
      socket?.emit("chat:leave", { conversationId: conversation.id });
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.off("chat:message:new", handleMessage);
      socket?.off("chat:conversation:updated", handleConversation);
    };
  }, [conversation, isLoggedIn, open, scrollToEnd, token]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversation?.id || sending) return;

    setSending(true);
    setInput("");
    try {
      const result = await sendChatMessageApi({
        conversationId: conversation.id,
        text,
        token,
      });
      setConversation(result.conversation);
      setMessages((prev) => mergeMessage(prev, result.message));
      scrollToEnd();
    } catch (err) {
      setInput(text);
      setError(err.response?.data?.error || err.message || "Message failed.");
    } finally {
      setSending(false);
    }
  };

  const handleLoginClick = () => {
    if (onRequireLogin) onRequireLogin();
  };

  if (!open) return null;

  return (
    <div className={cx(`chatShell ${embedded ? "embedded" : ""}`)}>
      <div className={cx("header")}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <SupportAgentIcon />
          <Box>
            <h3 className={cx("headerTitle")}>Massclick Support</h3>
            <p className={cx("headerSubtitle")}>
              {conversation?.status === "closed" ? "Conversation closed" : "We usually reply quickly"}
            </p>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span className={cx("status")}>
            <span className={cx("statusDot")} style={{ background: connected ? "#22c55e" : "#cbd5e1" }} />
            {connected ? "Live" : "Connecting"}
          </span>
          {!embedded && onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </div>

      {!isLoggedIn ? (
        <div className={cx("loginGate")}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Login required</Typography>
          <Typography sx={{ mb: 2 }}>Please login with your mobile number to start a support chat.</Typography>
          <Button variant="contained" onClick={handleLoginClick} sx={{ bgcolor: "#ff7a00" }}>
            Login / Sign Up
          </Button>
        </div>
      ) : (
        <>
          <div className={cx("messages")}>
            {loading && <CircularProgress size={28} sx={{ m: "auto", color: "#ff7a00" }} />}
            {!loading && messages.length === 0 && (
              <div className={cx("emptyState")}>
                <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>How can we help?</Typography>
                Send your question and the Massclick team will reply here.
              </div>
            )}
            {messages.map((message) => {
              const isCustomer = message.senderType === "customer";
              return (
                <div
                  key={message.id || message._id}
                  className={cx(`bubbleRow ${isCustomer ? "bubbleRowCustomer" : "bubbleRowAdmin"}`)}
                >
                  <div className={cx(`bubble ${isCustomer ? "bubbleCustomer" : "bubbleAdmin"}`)}>
                    {message.text}
                    <span className={cx("messageMeta")}>
                      {message.senderName || (isCustomer ? "You" : "Support")} · {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            {error && (
              <Typography sx={{ color: "#dc2626", fontSize: "0.85rem", textAlign: "center" }}>
                {error}
              </Typography>
            )}
            <div ref={endRef} />
          </div>

          <div className={cx("composer")}>
            <TextField
              size="small"
              value={input}
              placeholder={conversation?.status === "closed" ? "Reply to reopen this chat" : "Type your message"}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              multiline
              maxRows={3}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              sx={{ minWidth: 46, bgcolor: "#ff7a00", "&:hover": { bgcolor: "#e65100" } }}
            >
              {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
