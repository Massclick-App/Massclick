import axios from 'axios';
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminRefreshToken,
  getCustomerToken,
  recordAuthFailure,
  recordTokenRefresh,
  setAdminSession,
} from "../auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;
const CLIENT_ID = process.env.REACT_APP_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_OAUTH_CLIENT_SECRET;
const ADMIN_PATH_PREFIXES = ['/admin', '/dashboard'];
const CUSTOMER_AUTH_PATHS = [
  /^\/api\/otp_user(\/|$)/,
  /^\/api\/leadsData(\/|$)/,
  /^\/api\/favorites(\/|$)/,
  /^\/api\/fcm-token(\/|$)/,
  /^\/api\/chat(\/|$)/,
  /^\/api\/rating(\/|$)/,
  /^\/api\/reviews?(\/|$)/,
  /^\/api\/search(\/|$)/,
];

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

// Track number of active requests
let activeRequests = 0;
let store = null;

// Set store reference after it's initialized (called from App.js)
export const setAxiosStore = (reduxStore) => {
  store = reduxStore;
};

const showGlobalLoader = () => {
  try {
    if (store && activeRequests === 0) {
      store.dispatch({ type: 'SHOW_GLOBAL_LOADER', payload: { message: 'Loading...' } });
    }
  } catch (error) {
    console.warn('Error showing global loader:', error);
  }
};

const hideGlobalLoader = () => {
  try {
    if (store && activeRequests === 0) {
      store.dispatch({ type: 'HIDE_GLOBAL_LOADER' });
    }
  } catch (error) {
    console.warn('Error hiding global loader:', error);
  }
};

let isRefreshing = false;
let failedQueue = [];

const getRequestPath = (url) => {
  try {
    return new URL(url || '', API_URL || window.location.origin).pathname;
  } catch (error) {
    return url || '';
  }
};

const isReloginRequest = (url) => getRequestPath(url) === '/oauth/relogin';

const isCustomerAuthRequest = (pathname) => CUSTOMER_AUTH_PATHS.some((pattern) => pattern.test(pathname));

const isAdminArea = () => {
  if (typeof window === 'undefined') return false;
  return ADMIN_PATH_PREFIXES.some((path) => window.location.pathname.startsWith(path));
};

const clearAdminAuth = () => {
  delete axiosInstance.defaults.headers.common.Authorization;
  clearAdminSession();
};

const redirectToAdminLoginIfNeeded = () => {
  if (isAdminArea()) {
    window.location.href = '/admin';
  }
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const parseRetryAfterSeconds = (response) => {
  const rawValue = response?.data?.retryAfterSeconds ?? response?.headers?.["retry-after"];
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.ceil(parsed);
};

const notifyRateLimited = (error) => {
  if (typeof window === "undefined") return;

  const response = error?.response;
  const retryAfterSeconds = parseRetryAfterSeconds(response);
  const message =
    response?.data?.message ||
    "You are sending requests too quickly. Please wait a moment and try again.";

  window.dispatchEvent(
    new CustomEvent("api:rate-limited", {
      detail: {
        message,
        retryAfterSeconds,
        status: response?.status || 429,
        path: getRequestPath(error?.config?.url),
      },
    })
  );
};

// Request interceptor - add token to headers and show loader
axiosInstance.interceptors.request.use(
  (config) => {
    activeRequests++;
    showGlobalLoader();

    // Don't add token to relogin endpoint (it uses refresh token).
    // Also preserve explicit Authorization headers, such as public client tokens.
    config.headers = config.headers || {};
    const hasAuthorizationHeader = config.headers.Authorization || config.headers.authorization;

    if (!isReloginRequest(config.url) && !hasAuthorizationHeader) {
      const requestPath = getRequestPath(config.url);
      const adminAccessToken = getAdminAccessToken();
      const customerToken = getCustomerToken();
      const shouldPreferAdminChatToken =
        requestPath.startsWith('/api/chat') &&
        isAdminArea() &&
        Boolean(adminAccessToken);

      if (isCustomerAuthRequest(requestPath) && customerToken && !shouldPreferAdminChatToken) {
        config.headers.Authorization = `Bearer ${customerToken}`;
      } else if (adminAccessToken) {
        config.headers.Authorization = `Bearer ${adminAccessToken}`;
      } else if (customerToken) {
        config.headers.Authorization = `Bearer ${customerToken}`;
      }
    }
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    hideGlobalLoader();
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and refresh token, hide loader
axiosInstance.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    hideGlobalLoader();
    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    hideGlobalLoader();

    if (error.response?.status === 429) {
      notifyRateLimited(error);
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Only retry once and if it's a 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const qs = require('qs');
      const refreshToken = getAdminRefreshToken();

      if (!refreshToken) {
        clearAdminAuth();
        recordAuthFailure("admin-refresh", error);
        redirectToAdminLoginIfNeeded();
        return Promise.reject(error);
      }

      const data = qs.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
      });

      return axiosInstance
        .post('/oauth/relogin', data, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        .then((response) => {
          const { accessToken, refreshToken: newRefreshToken, accessTokenExpiresAt } = response.data;

          console.log('[Auth] Access token refreshed — notifying socket');
          setAdminSession({
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenExpiresAt,
            user: response.data.user,
          });
          recordTokenRefresh("adminOAuth", { source: "axios-401-retry" });

          // Notify the socket layer so the next reconnect uses the new token.
          // We dispatch an event instead of importing socketService directly
          // to avoid a circular dependency (socketService → axiosInstance → socketService).
          window.dispatchEvent(new CustomEvent('token:refreshed', { detail: { accessToken } }));

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          processQueue(err, null);
          recordAuthFailure("admin-refresh", err);
          clearAdminAuth();
          redirectToAdminLoginIfNeeded();
          return Promise.reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
