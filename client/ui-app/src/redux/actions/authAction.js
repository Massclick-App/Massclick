import axiosInstance from '../../services/axiosInstance.js';
import qs from 'qs';
import { getPendingBusinessList } from './businessListAction.js';

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

        console.log("result", response.data);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userRole', user?.userRole || '');
    localStorage.setItem('userName', user?.userName || user?.email || '');
    localStorage.setItem('allowedPages', JSON.stringify(user?.allowedPages || []));

    dispatch({
      type: LOGIN_SUCCESS,
      payload: { user, accessToken, refreshToken },
    });

    // Fetch pending businesses for the logged-in user
    dispatch(getPendingBusinessList());
  } catch (error) {
    dispatch({
      type: LOGIN_FAILURE,
      payload: error.response?.data?.error || error.message,
    });
  }
};

export const relogin = () => async (dispatch) => {
  dispatch({ type: RELOGIN_REQUEST });
  try {
    const refreshToken = localStorage.getItem("refreshToken");

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

    console.log("result", response.data);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("accessTokenExpiresAt", accessTokenExpiresAt);
    localStorage.setItem("userRole", user?.userRole || '');
    localStorage.setItem("allowedPages", JSON.stringify(user?.allowedPages || []));

    dispatch({
      type: RELOGIN_SUCCESS,
      payload: { accessToken, refreshToken: newRefreshToken, user },
    });

    // Fetch pending businesses for the logged-in user
    dispatch(getPendingBusinessList());

    return response.data;
  } catch (error) {
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
  const token = localStorage.getItem("accessToken");

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
    const keysToRemove = [
      "accessToken",
      "refreshToken",
      "accessTokenExpiresAt",
      "userRole",
      "userName",
      "allowedPages",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    localStorage.clear();
    sessionStorage.clear();

    delete axiosInstance.defaults.headers.common["Authorization"];

    dispatch({ type: LOGOUT });

    window.location.href = "/admin";
  }
};




