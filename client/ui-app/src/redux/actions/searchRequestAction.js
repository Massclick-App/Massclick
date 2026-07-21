import axiosInstance from "../../services/axiosInstance.js";
import { getClientToken } from "./clientAuthAction.js";
import {
  CREATE_SEARCH_REQUEST_FAILURE, CREATE_SEARCH_REQUEST_REQUEST, CREATE_SEARCH_REQUEST_SUCCESS,
  DELETE_SEARCH_REQUEST_FAILURE, DELETE_SEARCH_REQUEST_REQUEST, DELETE_SEARCH_REQUEST_SUCCESS,
  FETCH_SEARCH_REQUESTS_FAILURE, FETCH_SEARCH_REQUESTS_REQUEST, FETCH_SEARCH_REQUESTS_SUCCESS,
  FETCH_SEARCH_REQUEST_FAILURE, FETCH_SEARCH_REQUEST_REQUEST, FETCH_SEARCH_REQUEST_SUCCESS,
  INITIALIZE_SEARCH_REQUEST_FORM, RESET_SEARCH_REQUEST_FORM, SET_SEARCH_REQUEST_FIELD,
  UPDATE_SEARCH_REQUEST_FAILURE, UPDATE_SEARCH_REQUEST_REQUEST, UPDATE_SEARCH_REQUEST_SUCCESS,
} from "./userActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;

export const initializeSearchRequestForm = (payload) => ({ type: INITIALIZE_SEARCH_REQUEST_FORM, payload });
export const setSearchRequestField = (name, value) => ({ type: SET_SEARCH_REQUEST_FIELD, payload: { name, value } });
export const resetSearchRequestForm = () => ({ type: RESET_SEARCH_REQUEST_FORM });

export const createSearchRequest = (requestData) => async (dispatch) => {
  dispatch({ type: CREATE_SEARCH_REQUEST_REQUEST });
  try {
    let token = localStorage.getItem("accessToken");
    if (!token) token = await dispatch(getClientToken());
    if (!token) throw new Error("Unable to start a secure request. Please try again.");
    const response = await axiosInstance.post(`${API_URL}/search-requests`, requestData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const request = response.data.data || response.data;
    dispatch({ type: CREATE_SEARCH_REQUEST_SUCCESS, payload: request });
    return request;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: CREATE_SEARCH_REQUEST_FAILURE, payload });
    throw error;
  }
};

export const getSearchRequests = ({ page = 1, limit = 25, status = "" } = {}) => async (dispatch) => {
  dispatch({ type: FETCH_SEARCH_REQUESTS_REQUEST });
  try {
    const params = new URLSearchParams({ page, limit, status });
    const response = await axiosInstance.get(`${API_URL}/admin/search-requests?${params.toString()}`);
    dispatch({ type: FETCH_SEARCH_REQUESTS_SUCCESS, payload: response.data.data });
    return response.data.data;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: FETCH_SEARCH_REQUESTS_FAILURE, payload });
    throw error;
  }
};

export const getSearchRequestById = (id) => async (dispatch) => {
  dispatch({ type: FETCH_SEARCH_REQUEST_REQUEST });
  try {
    const response = await axiosInstance.get(`${API_URL}/admin/search-requests/${id}`);
    const request = response.data.data || response.data;
    dispatch({ type: FETCH_SEARCH_REQUEST_SUCCESS, payload: request });
    return request;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: FETCH_SEARCH_REQUEST_FAILURE, payload });
    throw error;
  }
};

export const updateSearchRequestStatus = (id, status) => async (dispatch) => {
  dispatch({ type: UPDATE_SEARCH_REQUEST_REQUEST });
  try {
    const response = await axiosInstance.patch(`${API_URL}/admin/search-requests/${id}/status`, { status });
    const request = response.data.data || response.data;
    dispatch({ type: UPDATE_SEARCH_REQUEST_SUCCESS, payload: request });
    return request;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: UPDATE_SEARCH_REQUEST_FAILURE, payload });
    throw error;
  }
};

export const deleteSearchRequest = (id) => async (dispatch) => {
  dispatch({ type: DELETE_SEARCH_REQUEST_REQUEST });
  try {
    await axiosInstance.delete(`${API_URL}/admin/search-requests/${id}`);
    dispatch({ type: DELETE_SEARCH_REQUEST_SUCCESS, payload: id });
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: DELETE_SEARCH_REQUEST_FAILURE, payload });
    throw error;
  }
};
