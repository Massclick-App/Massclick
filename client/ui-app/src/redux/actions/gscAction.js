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
  FETCH_TRACKED_KEYWORDS_REQUEST, FETCH_TRACKED_KEYWORDS_SUCCESS, FETCH_TRACKED_KEYWORDS_FAILURE,
  ADD_TRACKED_KEYWORD_REQUEST, ADD_TRACKED_KEYWORD_SUCCESS, ADD_TRACKED_KEYWORD_FAILURE,
  UPDATE_TRACKED_KEYWORD_SUCCESS, DELETE_TRACKED_KEYWORD_SUCCESS,
  CHECK_KEYWORD_RANK_REQUEST, CHECK_KEYWORD_RANK_SUCCESS, CHECK_KEYWORD_RANK_FAILURE,
  CHECK_ALL_KEYWORDS_REQUEST, CHECK_ALL_KEYWORDS_SUCCESS, CHECK_ALL_KEYWORDS_FAILURE,
  FETCH_KEYWORD_HISTORY_REQUEST, FETCH_KEYWORD_HISTORY_SUCCESS, FETCH_KEYWORD_HISTORY_FAILURE,
  FETCH_KEYWORD_QUOTA_SUCCESS,
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

export const fetchTrackedKeywords = () => async (dispatch) => {
  dispatch({ type: FETCH_TRACKED_KEYWORDS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/keywords`, { headers: authHeaders() });
    dispatch({ type: FETCH_TRACKED_KEYWORDS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_TRACKED_KEYWORDS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const addTrackedKeyword = (keywordData) => async (dispatch) => {
  dispatch({ type: ADD_TRACKED_KEYWORD_REQUEST });
  try {
    const res = await axiosInstance.post(`${API_URL}/gsc/keywords`, keywordData, {
      headers: authHeaders(),
    });
    dispatch({ type: ADD_TRACKED_KEYWORD_SUCCESS, payload: res.data });
    return res.data;
  } catch (err) {
    dispatch({ type: ADD_TRACKED_KEYWORD_FAILURE, payload: err.response?.data?.message || err.message });
    throw err;
  }
};

export const updateTrackedKeyword = (id, data) => async (dispatch) => {
  const res = await axiosInstance.patch(`${API_URL}/gsc/keywords/${id}`, data, {
    headers: authHeaders(),
  });
  dispatch({ type: UPDATE_TRACKED_KEYWORD_SUCCESS, payload: res.data });
  return res.data;
};

export const deleteTrackedKeyword = (id) => async (dispatch) => {
  await axiosInstance.delete(`${API_URL}/gsc/keywords/${id}`, { headers: authHeaders() });
  dispatch({ type: DELETE_TRACKED_KEYWORD_SUCCESS, payload: id });
};

export const checkKeywordRank = (id) => async (dispatch) => {
  dispatch({ type: CHECK_KEYWORD_RANK_REQUEST, payload: id });
  try {
    const res = await axiosInstance.post(`${API_URL}/gsc/keywords/${id}/check`, {}, {
      headers: authHeaders(),
    });
    dispatch({ type: CHECK_KEYWORD_RANK_SUCCESS, payload: res.data });
    return res.data;
  } catch (err) {
    dispatch({ type: CHECK_KEYWORD_RANK_FAILURE, payload: err.response?.data?.message || err.message });
    throw err;
  }
};

export const manualCheckKeywordRank = (id, data) => async (dispatch) => {
  dispatch({ type: CHECK_KEYWORD_RANK_REQUEST, payload: id });
  try {
    const res = await axiosInstance.post(`${API_URL}/gsc/keywords/${id}/manual-check`, data, {
      headers: authHeaders(),
    });
    dispatch({ type: CHECK_KEYWORD_RANK_SUCCESS, payload: res.data });
    return res.data;
  } catch (err) {
    dispatch({ type: CHECK_KEYWORD_RANK_FAILURE, payload: err.response?.data?.message || err.message });
    throw err;
  }
};

export const checkAllKeywords = () => async (dispatch) => {
  dispatch({ type: CHECK_ALL_KEYWORDS_REQUEST });
  try {
    const res = await axiosInstance.post(`${API_URL}/gsc/keywords/check-all`, {}, {
      headers: authHeaders(),
    });
    dispatch({ type: CHECK_ALL_KEYWORDS_SUCCESS, payload: res.data });
    dispatch(fetchTrackedKeywords());
    dispatch(fetchKeywordQuota());
    return res.data;
  } catch (err) {
    dispatch({ type: CHECK_ALL_KEYWORDS_FAILURE, payload: err.response?.data?.message || err.message });
    throw err;
  }
};

export const fetchKeywordHistory = (id) => async (dispatch) => {
  dispatch({ type: FETCH_KEYWORD_HISTORY_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/keywords/${id}/history`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_KEYWORD_HISTORY_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_KEYWORD_HISTORY_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchKeywordQuota = () => async (dispatch) => {
  try {
    const res = await axiosInstance.get(`${API_URL}/gsc/keywords/quota`, { headers: authHeaders() });
    dispatch({ type: FETCH_KEYWORD_QUOTA_SUCCESS, payload: res.data });
  } catch (err) {
    // Non-critical — quota display just stays empty
  }
};
