import axiosInstance from "./axiosInstance";

const API_URL = process.env.REACT_APP_API_URL;

// WHY token is optional here:
// Admin calls: don't pass token at all. The axiosInstance request interceptor
// (axiosInstance.js line ~102) automatically injects the fresh accessToken from
// localStorage — but ONLY when no Authorization header is already set.
// Passing a stale token explicitly bypasses that logic and causes 401s.
//
// Customer calls: always pass the JWT explicitly because the interceptor only
// injects the OAuth accessToken, not the customer JWT.
const getAuthHeader = (token) => {
  if (!token) return {};   // Let axiosInstance interceptor inject fresh token
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout') ||
        (error.response?.status >= 500);

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

export const getCustomerChatToken = () => localStorage.getItem("authToken");
export const getAdminChatToken = () => localStorage.getItem("accessToken");

export const startChatConversation = (token = getCustomerChatToken()) =>
  axiosInstance
    .post(`${API_URL}/chat/conversations/start`, {}, getAuthHeader(token))
    .then((res) => res.data.conversation);

export const fetchChatMessages = ({
  conversationId,
  token,
  pageNo = 1,
  pageSize = 50,
}) =>
  retryWithBackoff(() =>
    axiosInstance
      .get(`${API_URL}/chat/conversations/${conversationId}/messages`, {
        ...getAuthHeader(token),
        params: { pageNo, pageSize },
      })
      .then((res) => res.data)
  );

export const sendChatMessageApi = ({ conversationId, text, token }) =>
  retryWithBackoff(() =>
    axiosInstance
      .post(
        `${API_URL}/chat/conversations/${conversationId}/messages`,
        { text },
        getAuthHeader(token)
      )
      .then((res) => res.data),
    3,
    500
  );

export const markChatRead = ({ conversationId, token }) =>
  axiosInstance
    .patch(`${API_URL}/chat/conversations/${conversationId}/read`, {}, getAuthHeader(token))
    .then((res) => res.data);

export const fetchChatConversations = ({
  token = getAdminChatToken(),
  status = "open",
  search = "",
  pageNo = 1,
  pageSize = 30,
}) =>
  axiosInstance
    .get(`${API_URL}/chat/conversations`, {
      ...getAuthHeader(token),
      params: { status, search, pageNo, pageSize },
    })
    .then((res) => res.data);

export const updateChatConversationStatus = ({ conversationId, status, token = getAdminChatToken() }) =>
  axiosInstance
    .patch(
      `${API_URL}/chat/conversations/${conversationId}/status`,
      { status },
      getAuthHeader(token)
    )
    .then((res) => res.data.conversation);

export const fetchChatUnreadCount = (token = getAdminChatToken()) =>
  axiosInstance
    .get(`${API_URL}/chat/unread-count`, getAuthHeader(token))
    .then((res) => res.data);
