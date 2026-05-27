import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_REDIS_STATUS_REQUEST,
  FETCH_REDIS_STATUS_SUCCESS,
  FETCH_REDIS_STATUS_FAILURE,
  INVALIDATE_CACHE_REQUEST,
  INVALIDATE_CACHE_SUCCESS,
  INVALIDATE_CACHE_FAILURE,
  CLEAR_ALL_CACHES_REQUEST,
  CLEAR_ALL_CACHES_SUCCESS,
  CLEAR_ALL_CACHES_FAILURE,
  FETCH_REDIS_KEYS_REQUEST,
  FETCH_REDIS_KEYS_SUCCESS,
  FETCH_REDIS_KEYS_FAILURE,
  DELETE_REDIS_KEYS_REQUEST,
  DELETE_REDIS_KEYS_SUCCESS,
  DELETE_REDIS_KEYS_FAILURE,
  FETCH_REDIS_INFO_REQUEST,
  FETCH_REDIS_INFO_SUCCESS,
  FETCH_REDIS_INFO_FAILURE,
  FLUSH_REDIS_DB_REQUEST,
  FLUSH_REDIS_DB_SUCCESS,
  FLUSH_REDIS_DB_FAILURE,
  DELETE_REDIS_PATTERN_REQUEST,
  DELETE_REDIS_PATTERN_SUCCESS,
  DELETE_REDIS_PATTERN_FAILURE,
} from "./cacheActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchRedisStatus = () => async (dispatch) => {
  dispatch({ type: FETCH_REDIS_STATUS_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/admin/redis/status`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_REDIS_STATUS_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_REDIS_STATUS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const invalidateCache = (cacheType) => async (dispatch) => {
  dispatch({ type: INVALIDATE_CACHE_REQUEST });
  try {
    const { data } = await axiosInstance.post(
      `${API_URL}/admin/cache/invalidate`,
      { cacheType },
      { headers: authHeaders() }
    );
    dispatch({ type: INVALIDATE_CACHE_SUCCESS, payload: data.data });
    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: INVALIDATE_CACHE_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const fetchRedisKeys = (pattern = '*') => async (dispatch) => {
  dispatch({ type: FETCH_REDIS_KEYS_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/admin/redis/keys`, {
      headers: authHeaders(),
      params: { pattern },
    });
    dispatch({ type: FETCH_REDIS_KEYS_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_REDIS_KEYS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const deleteRedisKeys = (keys) => async (dispatch) => {
  dispatch({ type: DELETE_REDIS_KEYS_REQUEST });
  try {
    const { data } = await axiosInstance.delete(`${API_URL}/admin/redis/keys`, {
      headers: authHeaders(),
      data: { keys },
    });
    dispatch({ type: DELETE_REDIS_KEYS_SUCCESS, payload: data.data });
    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: DELETE_REDIS_KEYS_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const fetchRedisInfo = () => async (dispatch) => {
  dispatch({ type: FETCH_REDIS_INFO_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/admin/redis/info`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_REDIS_INFO_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_REDIS_INFO_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const flushRedisDb = () => async (dispatch) => {
  dispatch({ type: FLUSH_REDIS_DB_REQUEST });
  try {
    const { data } = await axiosInstance.post(
      `${API_URL}/admin/redis/flush`,
      {},
      { headers: authHeaders() }
    );
    dispatch({ type: FLUSH_REDIS_DB_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: FLUSH_REDIS_DB_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const deleteRedisPattern = (pattern) => async (dispatch) => {
  dispatch({ type: DELETE_REDIS_PATTERN_REQUEST });
  try {
    const { data } = await axiosInstance.delete(
      `${API_URL}/admin/redis/pattern`,
      { headers: authHeaders(), data: { pattern } }
    );
    dispatch({ type: DELETE_REDIS_PATTERN_SUCCESS, payload: data.data });
    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: DELETE_REDIS_PATTERN_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const clearAllCaches = () => async (dispatch) => {
  dispatch({ type: CLEAR_ALL_CACHES_REQUEST });
  try {
    const { data } = await axiosInstance.post(
      `${API_URL}/admin/cache/clear-all`,
      {},
      { headers: authHeaders() }
    );
    dispatch({ type: CLEAR_ALL_CACHES_SUCCESS, payload: data.data });
    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: CLEAR_ALL_CACHES_FAILURE, payload: msg });
    throw new Error(msg);
  }
};
