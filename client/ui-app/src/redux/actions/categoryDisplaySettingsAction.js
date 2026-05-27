import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_CATEGORY_DISPLAY_SETTINGS_REQUEST,
  FETCH_CATEGORY_DISPLAY_SETTINGS_SUCCESS,
  FETCH_CATEGORY_DISPLAY_SETTINGS_FAILURE,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_REQUEST,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_SUCCESS,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_FAILURE,
  FETCH_ALL_CATEGORIES_FOR_PICKER_REQUEST,
  FETCH_ALL_CATEGORIES_FOR_PICKER_SUCCESS,
  FETCH_ALL_CATEGORIES_FOR_PICKER_FAILURE,
} from './categoryDisplaySettingsActionTypes';

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchCategoryDisplaySettings = () => async (dispatch) => {
  dispatch({ type: FETCH_CATEGORY_DISPLAY_SETTINGS_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/admin/category-display-settings`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_CATEGORY_DISPLAY_SETTINGS_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_CATEGORY_DISPLAY_SETTINGS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const updateCategoryDisplaySettings = (payload) => async (dispatch) => {
  dispatch({ type: UPDATE_CATEGORY_DISPLAY_SETTINGS_REQUEST });
  try {
    const { data } = await axiosInstance.put(
      `${API_URL}/admin/category-display-settings`,
      payload,
      { headers: authHeaders() }
    );
    dispatch({ type: UPDATE_CATEGORY_DISPLAY_SETTINGS_SUCCESS, payload: data.data });
    return data.data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: UPDATE_CATEGORY_DISPLAY_SETTINGS_FAILURE, payload: msg });
    throw new Error(msg);
  }
};

export const fetchAllCategoriesForPicker = () => async (dispatch) => {
  dispatch({ type: FETCH_ALL_CATEGORIES_FOR_PICKER_REQUEST });
  try {
    const { data } = await axiosInstance.get(`${API_URL}/category/all`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_ALL_CATEGORIES_FOR_PICKER_SUCCESS, payload: data });
  } catch (error) {
    dispatch({
      type: FETCH_ALL_CATEGORIES_FOR_PICKER_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};
