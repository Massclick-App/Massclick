import axiosInstance from "../../services/axiosInstance.js";
import { getClientToken } from "./clientAuthAction.js";

import {
  FETCH_MASSCLICK_EVENTS_FAILURE,
  FETCH_MASSCLICK_EVENTS_REQUEST,
  FETCH_MASSCLICK_EVENTS_SUCCESS,
  SAVE_MASSCLICK_EVENT_FAILURE,
  SAVE_MASSCLICK_EVENT_REQUEST,
  SAVE_MASSCLICK_EVENT_SUCCESS,
  DELETE_MASSCLICK_EVENT_FAILURE,
  DELETE_MASSCLICK_EVENT_REQUEST,
  DELETE_MASSCLICK_EVENT_SUCCESS,
  VIEW_MASSCLICK_EVENT_FAILURE,
  VIEW_MASSCLICK_EVENT_REQUEST,
  VIEW_MASSCLICK_EVENT_SUCCESS,
} from "./massclickEventActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;

export const viewMassclickEvent = (eventId) => async (dispatch) => {
  dispatch({ type: VIEW_MASSCLICK_EVENT_REQUEST });
  try {
    const response = await axiosInstance.get(`${API_URL}/massclick-events/view/${eventId}`);
    dispatch({ type: VIEW_MASSCLICK_EVENT_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    dispatch({ type: VIEW_MASSCLICK_EVENT_FAILURE, payload: error.response?.data?.message || error.message });
    throw error;
  }
};

export const getAllMassclickEvents =
  ({ pageNo = 1, pageSize = 20, options = {} } = {}) =>
  async (dispatch) => {
  dispatch({ type: FETCH_MASSCLICK_EVENTS_REQUEST });
  try {
    let config;
    if (options.includeUnpublished) {
      const token = await authToken(dispatch);
      config = { headers: { Authorization: `Bearer ${token}` } };
    }
    const response = await axiosInstance.get(
      `${API_URL}/massclick-events${options.includeUnpublished ? "/admin" : ""}?${new URLSearchParams({
        pageNo,
        pageSize,
        search: options.search || "",
        status: options.status || "all",
        sortBy: options.sortBy || "",
        sortOrder: options.sortOrder || "",
      }).toString()}`,
      config,
    );
    dispatch({ type: FETCH_MASSCLICK_EVENTS_SUCCESS, payload: response.data });
  } catch (error) {
    dispatch({
      type: FETCH_MASSCLICK_EVENTS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
  };

const authToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("Authentication required");
  return token;
};

export const deleteMassclickEvent = (eventId) => async (dispatch) => {
  dispatch({ type: DELETE_MASSCLICK_EVENT_REQUEST });
  try {
    const token = await authToken(dispatch);
    await axiosInstance.delete(`${API_URL}/massclick-events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_MASSCLICK_EVENT_SUCCESS, payload: eventId });
  } catch (error) {
    dispatch({ type: DELETE_MASSCLICK_EVENT_FAILURE, payload: error.response?.data || { message: error.message } });
    throw error;
  }
};

export const uploadMassclickEventMedia = (fileData, mediaType, thumbnailData = "") => async (dispatch) => {
  const token = await authToken(dispatch);
  const response = await axiosInstance.post(
    `${API_URL}/massclick-events/media`,
    { fileData, mediaType, thumbnailData },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data.data;
};

export const saveMassclickEvent = (event, id) => async (dispatch) => {
  dispatch({ type: SAVE_MASSCLICK_EVENT_REQUEST });
  try {
    const token = await authToken(dispatch);
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = id
      ? await axiosInstance.put(`${API_URL}/massclick-events/${id}`, event, config)
      : await axiosInstance.post(`${API_URL}/massclick-events`, event, config);
    dispatch({ type: SAVE_MASSCLICK_EVENT_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    dispatch({ type: SAVE_MASSCLICK_EVENT_FAILURE, payload: error.response?.data || { message: error.message } });
    throw error;
  }
};
