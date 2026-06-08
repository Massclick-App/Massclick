import axiosInstance from "./axiosInstance";

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

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
  axiosInstance
    .get(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      ...getAuthHeader(token),
      params: { pageNo, pageSize },
    })
    .then((res) => res.data);

export const sendChatMessageApi = ({ conversationId, text, token }) =>
  axiosInstance
    .post(
      `${API_URL}/chat/conversations/${conversationId}/messages`,
      { text },
      getAuthHeader(token)
    )
    .then((res) => res.data);

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
