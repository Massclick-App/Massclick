import axiosInstance from "./axiosInstance";
import { getCustomerToken } from "../auth/authStore";

const API_URL = process.env.REACT_APP_API_URL;
const config = () => ({ headers: { Authorization: `Bearer ${getCustomerToken()}`, "Content-Type": "application/json" } });

export const listTicketsApi = (status = "all") => axiosInstance.get(`${API_URL}/chat/tickets`, { ...config(), params: { status } }).then((res) => res.data);
export const createTicketApi = (payload) => axiosInstance.post(`${API_URL}/chat/tickets`, payload, config()).then((res) => res.data.ticket);
export const getTicketApi = (id) => axiosInstance.get(`${API_URL}/chat/tickets/${id}`, config()).then((res) => res.data.ticket);
export const replyTicketApi = (id, message) => axiosInstance.post(`${API_URL}/chat/tickets/${id}/replies`, { message }, config()).then((res) => res.data.ticket);
export const updateTicketStatusApi = (id, status) => axiosInstance.patch(`${API_URL}/chat/tickets/${id}/status`, { status }, config()).then((res) => res.data.ticket);
