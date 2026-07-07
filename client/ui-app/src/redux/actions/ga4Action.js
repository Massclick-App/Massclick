import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_GA4_OVERVIEW_REQUEST, FETCH_GA4_OVERVIEW_SUCCESS, FETCH_GA4_OVERVIEW_FAILURE,
  FETCH_GA4_TRENDS_REQUEST, FETCH_GA4_TRENDS_SUCCESS, FETCH_GA4_TRENDS_FAILURE,
  FETCH_GA4_TRAFFIC_SOURCES_REQUEST, FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, FETCH_GA4_TRAFFIC_SOURCES_FAILURE,
  FETCH_GA4_LOCATIONS_REQUEST, FETCH_GA4_LOCATIONS_SUCCESS, FETCH_GA4_LOCATIONS_FAILURE,
  FETCH_GA4_DEVICES_REQUEST, FETCH_GA4_DEVICES_SUCCESS, FETCH_GA4_DEVICES_FAILURE,
  FETCH_GA4_CONVERSIONS_REQUEST, FETCH_GA4_CONVERSIONS_SUCCESS, FETCH_GA4_CONVERSIONS_FAILURE,
} from "./ga4ActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchGa4Overview = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_OVERVIEW_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/overview?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_OVERVIEW_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_OVERVIEW_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Trends = (days = 90) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_TRENDS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/trends?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_TRENDS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_TRENDS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4TrafficSources = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/traffic-sources?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Locations = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_LOCATIONS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/locations?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_LOCATIONS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_LOCATIONS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Devices = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_DEVICES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/devices?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_DEVICES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_DEVICES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Conversions = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_CONVERSIONS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/conversions?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_CONVERSIONS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_CONVERSIONS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};
