import { io } from "socket.io-client";
import { clearCustomerSession, getCustomerToken, updateAuthDebug } from "../auth/authStore.js";

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "");

let socket = null;
let currentToken = null;
let getTokenFn = null;

export const AUTH_EXPIRED_EVENT = "ws:auth:expired";
export const CUSTOMER_SESSION_REVOKED_EVENT = "customer:session:revoked";
const AUTH_FAILURE_MESSAGES = new Set(["AUTH_REQUIRED", "AUTH_EXPIRED", "INVALID_TOKEN", "TOKEN_REVOKED"]);

const fireAuthExpired = () => {
  updateAuthDebug({
    websocket: {
      state: "auth-expired",
      lastError: AUTH_EXPIRED_EVENT,
    },
  });
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};

const getActiveSocketToken = () => {
  try {
    return getTokenFn?.() || currentToken;
  } catch {
    return currentToken;
  }
};

const handleSocketAuthExpired = ({ clearCustomer = false } = {}) => {
  if (clearCustomer && getActiveSocketToken() === getCustomerToken()) {
    clearCustomerSession();
  }
  fireAuthExpired();
  socket?.io?.reconnection(false);
  socket?.disconnect();
};

export const connectSocket = (token) => {
  if (!token) {
    return socket;
  }

  const resolvedToken = typeof token === "function" ? token() : token;
  if (socket && currentToken === resolvedToken) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = resolvedToken;
  getTokenFn = typeof token === "function" ? token : () => token;

  socket = io(WS_URL, {
    auth: (callback) => {
      const nextToken = getTokenFn();
      callback({ token: nextToken });
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    updateAuthDebug({ websocket: { state: "connected", lastError: null } });
  });

  socket.on("disconnect", (reason) => {
    updateAuthDebug({ websocket: { state: "disconnected", lastError: reason } });
  });

  socket.on("connect_error", (error) => {
    updateAuthDebug({ websocket: { state: "connect_error", lastError: error.message } });

    if (AUTH_FAILURE_MESSAGES.has(error.message)) {
      handleSocketAuthExpired({ clearCustomer: true });
    }
  });

  socket.on(CUSTOMER_SESSION_REVOKED_EVENT, () => {
    handleSocketAuthExpired({ clearCustomer: true });
  });

  socket.on("reconnect", () => {
    updateAuthDebug({ websocket: { state: "reconnected", lastError: null } });
  });

  socket.on("reconnect_failed", () => {
    fireAuthExpired();
  });

  return socket;
};

export const getSocket = () => socket;

export const refreshSocketToken = (newToken) => {
  return connectSocket(newToken);
};

export const emitWithTimeout = (event, data, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("SOCKET_NOT_CONNECTED"));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error("SOCKET_TIMEOUT"));
    }, timeout);

    socket.emit(event, data, (response) => {
      clearTimeout(timeoutId);
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
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
    getTokenFn = null;
    updateAuthDebug({ websocket: { state: "idle", lastError: null } });
  }
};
