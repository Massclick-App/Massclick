export const WS_EVENTS = {
  // ── Client → Server ──────────────────────────────────────────────────────────
  ROOM_JOIN:             "room:join",
  ROOM_LEAVE:            "room:leave",
  PING:                  "ping",

  // ── Server → Client ──────────────────────────────────────────────────────────
  ROOM_JOINED:           "room:joined",
  ROOM_LEFT:             "room:left",
  PONG:                  "pong",
  CONNECTED:             "connected",
  WS_ERROR:              "ws:error",

  // ── Lead domain ───────────────────────────────────────────────────────────────
  LEAD_ANALYTICS_UPDATE: "lead:analytics:update",

  // ── Reserved for future domains ───────────────────────────────────────────────
  // NOTIFICATION:       "notification"
  // CHAT_MESSAGE:       "chat:message"
  // TRACKING_UPDATE:    "tracking:update"
};

export const buildRoom = {
  // mobileNumber is always 10-digit (no 91 prefix) — matches userModel.mobileNumber1
  business: (mobile) => `business:${mobile}`,
  user:     (userId) => `user:${userId}`,
  admin:    ()       => `admin:global`,
};
