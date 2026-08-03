export const WS_EVENTS = {
  // ── Client → Server ──────────────────────────────────────────────────────────
  ROOM_JOIN:             "room:join",
  ROOM_LEAVE:            "room:leave",
  PING:                  "ping",
  HEARTBEAT:             "heartbeat",
  CHAT_JOIN:             "chat:join",
  CHAT_LEAVE:            "chat:leave",
  CHAT_SEND:             "chat:send",
  CHAT_TYPING:           "chat:typing",
  CHAT_READ:             "chat:read",

  // ── Server → Client ──────────────────────────────────────────────────────────
  ROOM_JOINED:           "room:joined",
  ROOM_LEFT:             "room:left",
  PONG:                  "pong",
  CONNECTED:             "connected",
  WS_ERROR:              "ws:error",
  CHAT_MESSAGE_NEW:      "chat:message:new",
  CHAT_CONVERSATION_UPDATED: "chat:conversation:updated",
  CHAT_UNREAD_COUNT:     "chat:unread:count",

  // ── Lead domain ───────────────────────────────────────────────────────────────
  LEAD_ANALYTICS_UPDATE: "lead:analytics:update",

  // ── Business domain ───────────────────────────────────────────────────────────
  BUSINESS_PENDING:      "business:pending",
  REWARD_CLAIM_CHANGED:  "reward:claim:changed",

  // ── App-wide system events ────────────────────────────────────────────────────
  APP_MAINTENANCE:       "app:maintenance",
  CUSTOMER_SESSION_REVOKED: "customer:session:revoked",
  ADMIN_SESSION_REVOKED: "admin:session:revoked",

  // ── Reserved for future domains ───────────────────────────────────────────────
  // NOTIFICATION:       "notification"
  // CHAT_MESSAGE:       "chat:message"
  // TRACKING_UPDATE:    "tracking:update"
};

export const buildRoom = {
  // mobileNumber is always 10-digit (no 91 prefix) — matches userModel.mobileNumber1
  business: (mobile) => `business:${mobile}`,
  user:     (userId) => `user:${userId}`,
  customers: ()      => `customers:global`,
  admin:    ()       => `admin:global`,
  adminChat: ()      => `admin:chat`,
  chat:     (id)     => `chat:${id}`,
};
