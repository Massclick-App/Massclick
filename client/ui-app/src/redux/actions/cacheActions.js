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
