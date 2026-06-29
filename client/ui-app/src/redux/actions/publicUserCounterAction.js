import axios from "axios";
import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  FETCH_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  FETCH_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
  FETCH_PUBLIC_USER_COUNTER_FAILURE,
  FETCH_PUBLIC_USER_COUNTER_REQUEST,
  FETCH_PUBLIC_USER_COUNTER_SUCCESS,
  RESET_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  RESET_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  RESET_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
} from "./publicUserCounterActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;

export const fetchPublicUserCounter = () => async (dispatch) => {
  dispatch({ type: FETCH_PUBLIC_USER_COUNTER_REQUEST });
  try {
    const { data } = await axios.get(`${API_URL}/public-user-counter`);
    dispatch({ type: FETCH_PUBLIC_USER_COUNTER_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    dispatch({ type: FETCH_PUBLIC_USER_COUNTER_FAILURE, payload: message });
    throw new Error(message);
  }
};

export const fetchAdminPublicUserCounter = () => async (dispatch) => {
  dispatch({ type: FETCH_ADMIN_PUBLIC_USER_COUNTER_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/admin/public-user-counter`);
    dispatch({ type: FETCH_ADMIN_PUBLIC_USER_COUNTER_SUCCESS, payload: data.data });
    return data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    dispatch({ type: FETCH_ADMIN_PUBLIC_USER_COUNTER_FAILURE, payload: message });
    throw new Error(message);
  }
};

export const updateAdminPublicUserCounter = (payload) => async (dispatch) => {
  dispatch({ type: UPDATE_ADMIN_PUBLIC_USER_COUNTER_REQUEST });
  try {
    const { data } = await axiosInstance.put(`${API_URL}/admin/public-user-counter`, payload);
    dispatch({ type: UPDATE_ADMIN_PUBLIC_USER_COUNTER_SUCCESS, payload: data.data });
    return data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    dispatch({ type: UPDATE_ADMIN_PUBLIC_USER_COUNTER_FAILURE, payload: message });
    throw new Error(message);
  }
};

export const resetAdminPublicUserCounter = (baseCount) => async (dispatch) => {
  dispatch({ type: RESET_ADMIN_PUBLIC_USER_COUNTER_REQUEST });
  try {
    const { data } = await axiosInstance.post(`${API_URL}/admin/public-user-counter/reset`, { baseCount });
    dispatch({ type: RESET_ADMIN_PUBLIC_USER_COUNTER_SUCCESS, payload: data.data });
    return data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    dispatch({ type: RESET_ADMIN_PUBLIC_USER_COUNTER_FAILURE, payload: message });
    throw new Error(message);
  }
};
