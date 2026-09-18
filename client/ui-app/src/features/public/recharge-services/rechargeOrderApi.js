import axiosInstance from "shared/services/axiosInstance.js";

export const createRechargeOrder = (payload) =>
  axiosInstance.post("/recharge/orders", payload).then((res) => res.data);

export const fetchRechargeOrderStatus = (transactionId) =>
  axiosInstance.get(`/recharge/orders/${transactionId}/status`).then((res) => res.data);

export const fetchLiveBill = (payload) =>
  axiosInstance.post("/recharge/bbps/fetch-bill", payload).then((res) => res.data);
