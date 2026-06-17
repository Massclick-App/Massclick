export const AUTH_STATE_EVENT = "auth:state-changed";

const STORAGE_KEYS = {
  admin: {
    accessToken: "accessToken",
    refreshToken: "refreshToken",
    accessTokenExpiresAt: "accessTokenExpiresAt",
    userRole: "userRole",
    userName: "userName",
    allowedPages: "allowedPages",
  },
  customer: {
    token: "authToken",
    user: "authUser",
  },
  publicClient: {
    accessToken: "clientAccessToken",
    refreshToken: "clientRefreshToken",
    accessTokenExpiresAt: "clientAccessTokenExpiresAt",
    deviceId: "device_id",
  },
};

const listeners = new Set();
let initialized = false;

const debugState = {
  lastAuthFailure: null,
  lastTokenRefresh: null,
  websocket: {
    state: "idle",
    lastError: null,
    lastUpdatedAt: null,
  },
  fcm: {
    state: "idle",
    lastUpdatedAt: null,
    lastError: null,
  },
};

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const read = (key) => (isBrowser() ? localStorage.getItem(key) : null);
const write = (key, value) => {
  if (!isBrowser()) return;
  if (value === null || value === undefined || value === "") {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
};

const remove = (key) => {
  if (isBrowser()) {
    localStorage.removeItem(key);
  }
};

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseExpiry = (value) => {
  if (!value) return { expiresAt: null, isExpired: true, msRemaining: null };
  const expiresAt = new Date(value);
  const msRemaining = expiresAt.getTime() - Date.now();
  return {
    expiresAt: Number.isNaN(expiresAt.getTime()) ? null : expiresAt.toISOString(),
    isExpired: Number.isNaN(expiresAt.getTime()) ? true : msRemaining <= 0,
    msRemaining: Number.isNaN(expiresAt.getTime()) ? null : msRemaining,
  };
};

const buildAdminSession = () => {
  const expiry = parseExpiry(read(STORAGE_KEYS.admin.accessTokenExpiresAt));
  return {
    sessionType: "adminOAuth",
    isAuthenticated: Boolean(read(STORAGE_KEYS.admin.accessToken) && !expiry.isExpired),
    accessToken: read(STORAGE_KEYS.admin.accessToken),
    refreshToken: read(STORAGE_KEYS.admin.refreshToken),
    userRole: read(STORAGE_KEYS.admin.userRole) || "",
    userName: read(STORAGE_KEYS.admin.userName) || "",
    allowedPages: parseJson(read(STORAGE_KEYS.admin.allowedPages), []),
    ...expiry,
  };
};

const buildCustomerSession = () => {
  const user = parseJson(read(STORAGE_KEYS.customer.user), null);
  return {
    sessionType: "customerOtp",
    isAuthenticated: Boolean(read(STORAGE_KEYS.customer.token)),
    token: read(STORAGE_KEYS.customer.token),
    user,
    mobile: user?.mobileNumber1 || "",
  };
};

const buildPublicClientSession = () => {
  const expiry = parseExpiry(read(STORAGE_KEYS.publicClient.accessTokenExpiresAt));
  return {
    sessionType: "publicClientCredentials",
    isAuthenticated: Boolean(read(STORAGE_KEYS.publicClient.accessToken) && !expiry.isExpired),
    accessToken: read(STORAGE_KEYS.publicClient.accessToken),
    refreshToken: read(STORAGE_KEYS.publicClient.refreshToken),
    deviceId: read(STORAGE_KEYS.publicClient.deviceId) || "",
    ...expiry,
  };
};

export const getAuthSnapshot = () => ({
  admin: buildAdminSession(),
  customer: buildCustomerSession(),
  publicClient: buildPublicClientSession(),
});

const emit = (reason, detail = {}) => {
  const snapshot = getAuthSnapshot();
  listeners.forEach((listener) => listener(snapshot, reason, detail));

  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: { snapshot, reason, ...detail } }));
    window.dispatchEvent(new Event("authChange"));
  }
};

const ensureInitialized = () => {
  if (!isBrowser() || initialized) return;
  initialized = true;
  window.addEventListener("storage", (event) => {
    const watchedKeys = new Set(Object.values(STORAGE_KEYS).flatMap(Object.values));
    if (watchedKeys.has(event.key)) {
      emit("storage-sync", { key: event.key });
    }
  });
};

export const subscribeAuthState = (listener) => {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const ensureWebDeviceId = () => {
  const existing = read(STORAGE_KEYS.publicClient.deviceId);
  if (existing) return existing;

  const nextValue = `web_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  write(STORAGE_KEYS.publicClient.deviceId, nextValue);
  emit("public-device-created", { deviceId: nextValue });
  return nextValue;
};

export const setAdminSession = ({
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  user = {},
} = {}) => {
  write(STORAGE_KEYS.admin.accessToken, accessToken);
  write(STORAGE_KEYS.admin.refreshToken, refreshToken);
  write(STORAGE_KEYS.admin.accessTokenExpiresAt, accessTokenExpiresAt);
  write(STORAGE_KEYS.admin.userRole, user?.userRole || user?.role || "");
  write(STORAGE_KEYS.admin.userName, user?.userName || user?.emailId || "");
  write(STORAGE_KEYS.admin.allowedPages, JSON.stringify(user?.allowedPages || []));
  emit("admin-session-updated");
};

export const clearAdminSession = () => {
  Object.values(STORAGE_KEYS.admin).forEach(remove);
  emit("admin-session-cleared");
};

export const setCustomerSession = ({ token, user } = {}) => {
  write(STORAGE_KEYS.customer.token, token);
  write(STORAGE_KEYS.customer.user, JSON.stringify(user || null));
  emit("customer-session-updated");
};

export const clearCustomerSession = () => {
  Object.values(STORAGE_KEYS.customer).forEach(remove);
  emit("customer-session-cleared");
};

export const setPublicClientSession = ({
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  deviceId,
} = {}) => {
  write(STORAGE_KEYS.publicClient.accessToken, accessToken);
  write(STORAGE_KEYS.publicClient.refreshToken, refreshToken);
  write(STORAGE_KEYS.publicClient.accessTokenExpiresAt, accessTokenExpiresAt);
  if (deviceId) {
    write(STORAGE_KEYS.publicClient.deviceId, deviceId);
  }
  emit("public-client-session-updated");
};

export const clearPublicClientSession = () => {
  remove(STORAGE_KEYS.publicClient.accessToken);
  remove(STORAGE_KEYS.publicClient.refreshToken);
  remove(STORAGE_KEYS.publicClient.accessTokenExpiresAt);
  emit("public-client-session-cleared");
};

export const getAdminAccessToken = () => getAuthSnapshot().admin.accessToken;
export const getAdminRefreshToken = () => getAuthSnapshot().admin.refreshToken;
export const getCustomerToken = () => getAuthSnapshot().customer.token;
export const getCustomerUser = () => getAuthSnapshot().customer.user;
export const getPublicClientToken = () => getAuthSnapshot().publicClient.accessToken;

export const recordAuthFailure = (source, error) => {
  debugState.lastAuthFailure = {
    source,
    message: error?.response?.data?.error || error?.response?.data?.message || error?.message || String(error),
    status: error?.response?.status || null,
    occurredAt: new Date().toISOString(),
  };
  emit("auth-failure-recorded", { source });
};

export const recordTokenRefresh = (sessionType, metadata = {}) => {
  debugState.lastTokenRefresh = {
    sessionType,
    occurredAt: new Date().toISOString(),
    ...metadata,
  };
  emit("auth-refresh-recorded", { sessionType });
};

export const updateAuthDebug = (partial = {}) => {
  if (partial.websocket) {
    debugState.websocket = {
      ...debugState.websocket,
      ...partial.websocket,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  if (partial.fcm) {
    debugState.fcm = {
      ...debugState.fcm,
      ...partial.fcm,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  emit("auth-debug-updated");
};

export const getAuthDebugSnapshot = () => ({
  ...getAuthSnapshot(),
  debug: {
    ...debugState,
  },
});
