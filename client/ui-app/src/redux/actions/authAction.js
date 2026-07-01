import axiosInstance from '../../services/axiosInstance.js';
import qs from 'qs';
import { getPendingBusinessList } from './businessListAction.js';
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminRefreshToken,
  recordAuthFailure,
  setAdminSession,
} from "../../auth/authStore.js";

export const LOGIN_REQUEST = 'LOGIN_REQUEST';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILURE = 'LOGIN_FAILURE';

export const RELOGIN_REQUEST = "RELOGIN_REQUEST";
export const RELOGIN_SUCCESS = "RELOGIN_SUCCESS";
export const RELOGIN_FAILURE = "RELOGIN_FAILURE";

export const CLIENT_LOGIN_REQUEST = 'CLIENT_LOGIN_REQUEST';
export const CLIENT_LOGIN_SUCCESS = 'CLIENT_LOGIN_SUCCESS';
export const CLIENT_LOGIN_FAILURE = 'CLIENT_LOGIN_FAILURE';

export const LOGOUT = 'LOGOUT';

const API_URL = process.env.REACT_APP_API_URL;
const CLIENT_ID = process.env.REACT_APP_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_OAUTH_CLIENT_SECRET;

export const login = (userName, password) => async (dispatch) => {
  dispatch({ type: LOGIN_REQUEST });

  try {
    const data = qs.stringify({
      grant_type: 'password',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: userName,
      password,
    });

    const response = await axiosInstance.post(`${API_URL}/oauth/login`, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { accessToken, refreshToken, user = {} } = response.data;

        setAdminSession({
      accessToken,
      refreshToken,
      accessTokenExpiresAt: response.data.accessTokenExpiresAt,
      user,
    });

    dispatch({
      type: LOGIN_SUCCESS,
      payload: { user, accessToken, refreshToken },
    });

    // Fetch pending businesses for the logged-in user
    dispatch(getPendingBusinessList());
  } catch (error) {
    recordAuthFailure("admin-login", error);
    dispatch({
      type: LOGIN_FAILURE,
      payload: error.response?.data?.error || error.message,
    });
  }
};

export const relogin = () => async (dispatch) => {
  dispatch({ type: RELOGIN_REQUEST });
  try {
    const refreshToken = getAdminRefreshToken();

    const data = qs.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const response = await axiosInstance.post(`${API_URL}/oauth/relogin`, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { accessToken, accessTokenExpiresAt, refreshToken: newRefreshToken, user } = response.data;

    setAdminSession({
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt,
      user,
    });

    dispatch({
      type: RELOGIN_SUCCESS,
      payload: { accessToken, refreshToken: newRefreshToken, user },
    });

    // Fetch pending businesses for the logged-in user
    dispatch(getPendingBusinessList());

    return response.data;
  } catch (error) {
    recordAuthFailure("admin-relogin", error);
    const message =
      error.response?.data?.error || 
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";
    dispatch({
      type: RELOGIN_FAILURE,
      payload: message,
    });
    throw error;
  }
};

export const logout = () => async (dispatch) => {
  const token = getAdminAccessToken();

  try {
    if (token) {
      const url = `${API_URL}/oauth/logout`;
      await axiosInstance.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    // Error silently caught
  } finally {
    delete axiosInstance.defaults.headers.common["Authorization"];
    clearAdminSession();

    dispatch({ type: LOGOUT });

    window.location.href = "/admin";
  }
};




