import axios from "axios";
import {
  FETCH_SYSTEM_SETTINGS_REQUEST,
  FETCH_SYSTEM_SETTINGS_SUCCESS,
  FETCH_SYSTEM_SETTINGS_FAILURE,
  UPDATE_SYSTEM_SETTINGS_REQUEST,
  UPDATE_SYSTEM_SETTINGS_SUCCESS,
  UPDATE_SYSTEM_SETTINGS_FAILURE,
} from "./systemSettingsActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchSystemSettings = () => async (dispatch) => {
  dispatch({ type: FETCH_SYSTEM_SETTINGS_REQUEST });
  try {
    const { data } = await axios.get(`${API_URL}/admin/system-settings`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_SYSTEM_SETTINGS_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_SYSTEM_SETTINGS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const updateSystemSettings = (updates) => async (dispatch) => {
  dispatch({ type: UPDATE_SYSTEM_SETTINGS_REQUEST });
  try {
    const { data } = await axios.put(`${API_URL}/admin/system-settings`, updates, {
      headers: authHeaders(),
    });
    dispatch({ type: UPDATE_SYSTEM_SETTINGS_SUCCESS, payload: data.data });
    return data.data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: UPDATE_SYSTEM_SETTINGS_FAILURE, payload: msg });
    throw new Error(msg);
  }
};
