import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_GSC_OVERVIEW_REQUEST, FETCH_GSC_OVERVIEW_SUCCESS, FETCH_GSC_OVERVIEW_FAILURE,
  FETCH_GSC_TRENDS_REQUEST, FETCH_GSC_TRENDS_SUCCESS, FETCH_GSC_TRENDS_FAILURE,
  FETCH_GSC_QUERIES_REQUEST, FETCH_GSC_QUERIES_SUCCESS, FETCH_GSC_QUERIES_FAILURE,
  FETCH_GSC_PAGES_REQUEST, FETCH_GSC_PAGES_SUCCESS, FETCH_GSC_PAGES_FAILURE,
  FETCH_GSC_DEVICES_REQUEST, FETCH_GSC_DEVICES_SUCCESS, FETCH_GSC_DEVICES_FAILURE,
  FETCH_GSC_COUNTRIES_REQUEST, FETCH_GSC_COUNTRIES_SUCCESS, FETCH_GSC_COUNTRIES_FAILURE,
  FETCH_GSC_OPPORTUNITIES_REQUEST, FETCH_GSC_OPPORTUNITIES_SUCCESS, FETCH_GSC_OPPORTUNITIES_FAILURE,
  FETCH_GSC_KEYWORD_GAPS_REQUEST, FETCH_GSC_KEYWORD_GAPS_SUCCESS, FETCH_GSC_KEYWORD_GAPS_FAILURE,
} from "./gscActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchGscOverview = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_OVERVIEW_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/overview?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_OVERVIEW_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_OVERVIEW_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscTrends = (days = 90) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_TRENDS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/trends?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_TRENDS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_TRENDS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscQueries = (limit = 50, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_QUERIES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/queries?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_QUERIES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_QUERIES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscPages = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_PAGES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/pages?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_PAGES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_PAGES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscDevices = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_DEVICES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/devices?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_DEVICES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_DEVICES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscCountries = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_COUNTRIES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/countries?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_COUNTRIES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_COUNTRIES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscOpportunities = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_OPPORTUNITIES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/opportunities?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_OPPORTUNITIES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_OPPORTUNITIES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGscKeywordGaps = (days = 90) => async (dispatch) => {
  dispatch({ type: FETCH_GSC_KEYWORD_GAPS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/keyword-gaps?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GSC_KEYWORD_GAPS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GSC_KEYWORD_GAPS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};
