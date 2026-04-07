// clientAuthActions.js
import axios from "axios";

export const CLIENT_AUTH_REQUEST = "CLIENT_AUTH_REQUEST";
export const CLIENT_AUTH_SUCCESS = "CLIENT_AUTH_SUCCESS";
export const CLIENT_AUTH_FAILURE = "CLIENT_AUTH_FAILURE";
export const CLIENT_LOGOUT = "CLIENT_LOGOUT";

const API_URL = process.env.REACT_APP_API_URL;
const CLIENT_ID = process.env.REACT_APP_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_OAUTH_CLIENT_SECRET;

export const clientLogin = () => async (dispatch) => {
  dispatch({ type: CLIENT_AUTH_REQUEST });

  try {
    const response = await axios.post(`${API_URL}/oauth/client`, {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    const { accessToken, refreshToken, accessTokenExpiresAt } = response.data;

    localStorage.setItem("clientAccessToken", accessToken);
    localStorage.setItem("clientRefreshToken", refreshToken);
    localStorage.setItem("clientAccessTokenExpiresAt", accessTokenExpiresAt);

    dispatch({
      type: CLIENT_AUTH_SUCCESS,
      payload: { accessToken, refreshToken, accessTokenExpiresAt },
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: CLIENT_AUTH_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const getClientToken = () => async (dispatch) => {
  let clientAccessToken = localStorage.getItem("clientAccessToken");
  const expiresAtRaw = localStorage.getItem("clientAccessTokenExpiresAt");
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).getTime() : 0;
  const now = Date.now();

  if (!clientAccessToken || now >= expiresAt) {
    try {
      const result = await dispatch(clientLogin());
      clientAccessToken = result.accessToken;

      if (result.expiresIn) {
        const newExpiresAt = Date.now() + result.expiresIn * 1000;
        localStorage.setItem("clientAccessTokenExpiresAt", newExpiresAt);
      }
    } catch (error) {
      console.error("Client token refresh failed:", error);
      localStorage.removeItem("clientAccessToken");
      localStorage.removeItem("clientAccessTokenExpiresAt");
      throw error;
    }
  }

  return clientAccessToken;
};

export const clientLogout = () => async (dispatch) => {
  try {
    localStorage.removeItem("clientAccessToken");
    localStorage.removeItem("clientRefreshToken");
    localStorage.removeItem("clientAccessTokenExpiresAt");
  } finally {
    dispatch({ type: CLIENT_LOGOUT });
  }
};
