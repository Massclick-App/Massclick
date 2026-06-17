import { io } from "socket.io-client";
import { updateAuthDebug } from "../auth/authStore.js";

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "");

const LOG = (...args) => console.log("[WS]", ...args);
const WARN = (...args) => console.warn("[WS]", ...args);
const ERR = (...args) => console.error("[WS]", ...args);

let socket = null;
let currentToken = null;
let getTokenFn = null;

export const AUTH_EXPIRED_EVENT = "ws:auth:expired";

const fireAuthExpired = () => {
  LOG("Auth expired - firing", AUTH_EXPIRED_EVENT);
  updateAuthDebug({
    websocket: {
      state: "auth-expired",
      lastError: AUTH_EXPIRED_EVENT,
    },
  });
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};

export const connectSocket = (token) => {
  if (!token) {
    WARN("connectSocket called with no token - skipping");
    return socket;
  }

  const resolvedToken = typeof token === "function" ? token() : token;
  if (socket && currentToken === resolvedToken) {
    LOG("Reusing socket - connected:", socket.connected, "| id:", socket.id || "(connecting)");
    return socket;
  }

  if (socket) {
    LOG("Token changed - tearing down old socket before creating new one");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = resolvedToken;
  getTokenFn = typeof token === "function" ? token : () => token;

  LOG("Creating new socket - URL:", WS_URL);

  socket = io(WS_URL, {
    auth: (callback) => {
      const nextToken = getTokenFn();
      LOG(
        "Socket.IO auth callback - providing token:",
        nextToken ? `${nextToken.slice(0, 12)}...` : "null"
      );
      callback({ token: nextToken });
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    LOG("connected - socket.id:", socket.id, "| transport:", socket.io.engine.transport.name);
    updateAuthDebug({ websocket: { state: "connected", lastError: null } });
  });

  socket.on("disconnect", (reason) => {
    LOG("disconnected - reason:", reason);
    updateAuthDebug({ websocket: { state: "disconnected", lastError: reason } });
    if (reason === "io server disconnect") {
      WARN("Server closed the socket - will NOT auto-reconnect");
    }
  });

  socket.on("connect_error", (error) => {
    WARN("connect_error:", error.message);
    updateAuthDebug({ websocket: { state: "connect_error", lastError: error.message } });

    if (error.message === "INVALID_TOKEN" || error.message === "AUTH_REQUIRED") {
      ERR("Token rejected by server - stopping reconnection, firing auth expired event");
      socket.io.reconnection(false);
      socket.disconnect();
      fireAuthExpired();
    }
  });

  socket.on("reconnect_attempt", (attempt) => {
    const freshToken = getTokenFn?.();
    LOG(
      `reconnect attempt #${attempt} - token starts with:`,
      freshToken ? `${freshToken.slice(0, 12)}...` : "null"
    );
  });

  socket.on("reconnect", (attempt) => {
    LOG(`reconnected after ${attempt} attempt(s) - socket.id:`, socket.id);
    updateAuthDebug({ websocket: { state: "reconnected", lastError: null } });
  });

  socket.on("reconnect_failed", () => {
    ERR("reconnect_failed - exhausted all attempts");
    fireAuthExpired();
  });

  socket.on("ws:error", (errorPayload) => {
    ERR("Server-side ws:error:", errorPayload);
  });

  socket.on("room:joined", ({ room }) => {
    LOG("room:joined -", room);
  });

  socket.on("room:left", ({ room }) => {
    LOG("room:left -", room);
  });

  socket.on("connected", (data) => {
    LOG("server welcomed us - rooms:", data?.rooms, "| ts:", data?.ts);
  });

  return socket;
};

export const getSocket = () => socket;

export const refreshSocketToken = (newToken) => {
  LOG("refreshSocketToken called - forcing reconnect with new token");
  return connectSocket(newToken);
};

export const emitWithTimeout = (event, data, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      WARN("emitWithTimeout: socket not connected, event:", event);
      reject(new Error("SOCKET_NOT_CONNECTED"));
      return;
    }

    LOG(`emitWithTimeout: emitting "${event}" with ${timeout}ms timeout`);

    const timeoutId = setTimeout(() => {
      ERR(`emitWithTimeout: timeout after ${timeout}ms for event "${event}"`);
      reject(new Error("SOCKET_TIMEOUT"));
    }, timeout);

    socket.emit(event, data, (response) => {
      clearTimeout(timeoutId);
      LOG(`emitWithTimeout: ACK received for "${event}" - ok:`, response?.ok);
      if (response?.ok === false) {
        reject(new Error(response?.error || "Socket operation failed"));
      } else {
        resolve(response);
      }
    });
  });
};

export const disconnectSocket = () => {
  if (socket) {
    LOG("disconnectSocket - cleaning up");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
    getTokenFn = null;
    updateAuthDebug({ websocket: { state: "idle", lastError: null } });
  }
};
