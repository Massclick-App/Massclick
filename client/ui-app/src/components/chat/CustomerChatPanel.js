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
import { AUTH_EXPIRED_EVENT, connectSocket, getSocket } from "../../services/socketService";
import styles from "./CustomerChatPanel.module.css";

const LOG = (...args) => console.log('[CustomerChat]', ...args);
const WARN = (...args) => console.warn('[CustomerChat]', ...args);
const ERR = (...args) => console.error('[CustomerChat]', ...args);

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
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
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
    LOG('loadConversation: starting — open:', open, '| isLoggedIn:', isLoggedIn);
    setLoading(true);
    setError("");

    try {
      LOG('loadConversation: calling startChatConversation');
      const started = await startChatConversation(token);
      LOG('loadConversation: conversation started/resumed — id:', started.id, '| status:', started.status);
      setConversation(started);

      LOG('loadConversation: fetching messages for conversation:', started.id);
      const history = await fetchChatMessages({ conversationId: started.id, token });
      LOG('loadConversation: got %d messages', history.data?.length ?? 0);
      setMessages(history.data || []);

      await markChatRead({ conversationId: started.id, token });
      LOG('loadConversation: marked as read');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || "Unable to load chat.";
      ERR('loadConversation failed — status:', status, '| error:', msg);
      if (status === 401) {
        LOG('loadConversation: 401 — token expired');
        setAuthExpired(true);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [isLoggedIn, open, scrollToEnd, token]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!connected && open) {
      const timer = setTimeout(() => {
        WARN('Socket has been disconnected for 5s — showing offline warning');
        setShowOfflineWarning(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    setShowOfflineWarning(false);
  }, [connected, open]);

  // Listen for auth expired events from socketService
  useEffect(() => {
    const handleAuthExpired = () => {
      WARN('AUTH_EXPIRED_EVENT received — showing expired UI');
      setAuthExpired(true);
      setConnected(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!open || !isLoggedIn || !conversation?.id) return undefined;

    LOG('Socket effect: open=%s | isLoggedIn=%s | conversationId=%s', open, isLoggedIn, conversation.id);
    // Pass getter function — Socket.IO calls it fresh on every reconnect attempt
    const socket = connectSocket(() => getCustomerChatToken());

    const emitJoinRoom = () => {
      LOG('Emitting chat:join for conversation:', conversation.id);
      socket?.emit("chat:join", { conversationId: conversation.id });
    };

    const handleConnect = () => {
      LOG('socket connect — id:', socket?.id);
      setConnected(true);
      setShowOfflineWarning(false);
      setAuthExpired(false);
      emitJoinRoom();
    };

    const handleReconnect = async (attempt) => {
      LOG('socket reconnect after %d attempt(s) — reloading state', attempt);
      setConnected(true);
      setShowOfflineWarning(false);
      setAuthExpired(false);
      if (conversation?.id) {
        try {
          LOG('Reloading conversation after reconnect');
          const updated = await startChatConversation(getCustomerChatToken());
          setConversation(updated);
          const history = await fetchChatMessages({ conversationId: conversation.id, token: getCustomerChatToken() });
          LOG('Reloaded %d messages after reconnect', history.data?.length ?? 0);
          setMessages(history.data || []);
          emitJoinRoom();
        } catch (err) {
          WARN('State reload after reconnect failed:', err.message);
        }
      }
    };

    const handleDisconnect = (reason) => {
      LOG('socket disconnect — reason:', reason);
      setConnected(false);
    };

    const handleMessage = (payload) => {
      try {
        const matchesConv = payload?.conversation?.id === conversation.id;
        const matchesMsg = String(payload?.message?.conversationId) === conversation.id;
        LOG('chat:message:new — matchesConv:', matchesConv, '| matchesMsg:', matchesMsg, '| from:', payload?.message?.senderType);
        if (matchesConv || matchesMsg) {
          setConversation(payload.conversation || conversation);
          setMessages((prev) => mergeMessage(prev, payload.message));
          markChatRead({ conversationId: conversation.id, token: getCustomerChatToken() }).catch((err) => {
            WARN('markChatRead after new message failed:', err.message);
          });
          scrollToEnd();
        }
      } catch (err) {
        ERR('handleMessage error:', err);
        setError("Failed to update message");
      }
    };

    const handleConversation = (nextConversation) => {
      try {
        LOG('chat:conversation:updated — id:', nextConversation?.id, '| status:', nextConversation?.status);
        if (nextConversation?.id === conversation.id) setConversation(nextConversation);
      } catch (err) {
        ERR('handleConversation error:', err);
      }
    };

    const isConnected = Boolean(socket?.connected);
    LOG('Socket effect: already connected?', isConnected, '| id:', socket?.id);
    setConnected(isConnected);
    emitJoinRoom();

    socket?.on("connect", handleConnect);
    socket?.on("reconnect", handleReconnect);
    socket?.on("disconnect", handleDisconnect);
    socket?.on("chat:message:new", handleMessage);
    socket?.on("chat:conversation:updated", handleConversation);

    return () => {
      LOG('Socket effect cleanup — leaving conversation room:', conversation.id);
      socket?.emit("chat:leave", { conversationId: conversation.id });
      socket?.off("connect", handleConnect);
      socket?.off("reconnect", handleReconnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.off("chat:message:new", handleMessage);
      socket?.off("chat:conversation:updated", handleConversation);
    };
  }, [conversation?.id, isLoggedIn, open, scrollToEnd, token]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversation?.id || sending) return;

    LOG('handleSend: sending to conversation:', conversation.id, '| text length:', text.length);
    setSending(true);
    setInput("");
    setError("");
    try {
      const currentToken = getCustomerChatToken();
      const result = await sendChatMessageApi({ conversationId: conversation.id, text, token: currentToken });
      LOG('handleSend: success — message id:', result.message?.id);
      setConversation(result.conversation);
      setMessages((prev) => mergeMessage(prev, result.message));
      scrollToEnd();
    } catch (err) {
      setInput(text);
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error || err.message || "Message failed. Please try again.";
      ERR('handleSend failed — status:', status, '| error:', errorMsg);
      if (status === 401) {
        setAuthExpired(true);
        return;
      }
      setError(errorMsg);
      setTimeout(() => setError(""), 6000);
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

      {!isLoggedIn || authExpired ? (
        <div className={cx("loginGate")}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>
            {authExpired ? "Session expired" : "Login required"}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {authExpired
              ? "Your session has expired. Please login again to continue chatting."
              : "Please login with your mobile number to start a support chat."}
          </Typography>
          <Button variant="contained" onClick={handleLoginClick} sx={{ bgcolor: "#ff7a00" }}>
            Login / Sign Up
          </Button>
        </div>
      ) : (
        <>
          <div className={cx("messages")}>
            {showOfflineWarning && (
              <Box sx={{ p: 1.5, bgcolor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 1, mb: 1, textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#b45309" }}>
                  Connection lost. Reconnecting...
                </Typography>
              </Box>
            )}
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
