import axiosInstance from "shared/services/axiosInstance.js";

const URL = `${process.env.REACT_APP_API_URL}/admin/notifications`;

export const fetchDeletedNotifications = () =>
  axiosInstance.get(`${URL}/deleted`).then((res) => res.data.data);

export const softDeleteNotification = (id) =>
  axiosInstance.delete(`${URL}/${encodeURIComponent(id)}`).then((res) => res.data.data);
