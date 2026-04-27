import axios from "axios";
import {
  FETCH_FCM_USERS_REQUEST, FETCH_FCM_USERS_SUCCESS, FETCH_FCM_USERS_FAILURE,
  SEND_FCM_MARKETING_REQUEST, SEND_FCM_MARKETING_SUCCESS, SEND_FCM_MARKETING_FAILURE,
  FETCH_FCM_CAMPAIGNS_REQUEST, FETCH_FCM_CAMPAIGNS_SUCCESS, FETCH_FCM_CAMPAIGNS_FAILURE,
} from "./fcmMarketingActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const fetchFCMUsers = () => async (dispatch) => {
  dispatch({ type: FETCH_FCM_USERS_REQUEST });
  try {
    const { data } = await axios.get(`${API_URL}/api/admin/fcm/users-with-tokens`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_FCM_USERS_SUCCESS, payload: data.data });
  } catch (error) {
    dispatch({
      type: FETCH_FCM_USERS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const sendFCMMarketing = (payload) => async (dispatch) => {
  dispatch({ type: SEND_FCM_MARKETING_REQUEST });
  try {
    const { data } = await axios.post(`${API_URL}/api/admin/fcm/send-marketing`, payload, {
      headers: authHeaders(),
    });
    dispatch({ type: SEND_FCM_MARKETING_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    dispatch({ type: SEND_FCM_MARKETING_FAILURE, payload: errMsg });
    throw new Error(errMsg);
  }
};

export const fetchFCMCampaigns = (page = 1, limit = 20) => async (dispatch) => {
  dispatch({ type: FETCH_FCM_CAMPAIGNS_REQUEST });
  try {
    const { data } = await axios.get(
      `${API_URL}/api/admin/fcm/campaigns?page=${page}&limit=${limit}`,
      { headers: authHeaders() }
    );
    dispatch({ type: FETCH_FCM_CAMPAIGNS_SUCCESS, payload: data });
  } catch (error) {
    dispatch({
      type: FETCH_FCM_CAMPAIGNS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};
