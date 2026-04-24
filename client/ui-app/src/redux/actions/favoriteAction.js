import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export const FETCH_FAVORITES_REQUEST = "FETCH_FAVORITES_REQUEST";
export const FETCH_FAVORITES_SUCCESS = "FETCH_FAVORITES_SUCCESS";
export const FETCH_FAVORITES_FAILURE = "FETCH_FAVORITES_FAILURE";
export const ADD_FAVORITE_REQUEST = "ADD_FAVORITE_REQUEST";
export const ADD_FAVORITE_SUCCESS = "ADD_FAVORITE_SUCCESS";
export const ADD_FAVORITE_FAILURE = "ADD_FAVORITE_FAILURE";
export const REMOVE_FAVORITE_REQUEST = "REMOVE_FAVORITE_REQUEST";
export const REMOVE_FAVORITE_SUCCESS = "REMOVE_FAVORITE_SUCCESS";
export const REMOVE_FAVORITE_FAILURE = "REMOVE_FAVORITE_FAILURE";

export const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser")) || null;
  } catch {
    return null;
  }
};

const getHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchFavorites = (page = 1, limit = 50) => async (dispatch) => {
  const user = getAuthUser();
  if (!user?._id) return;

  dispatch({ type: FETCH_FAVORITES_REQUEST });
  try {
    const { data } = await axios.get(`${API_URL}/favorites/list`, {
      params: { userId: user._id, page, limit },
      headers: getHeaders(),
    });
    dispatch({ type: FETCH_FAVORITES_SUCCESS, payload: data.favorites || [] });
  } catch (error) {
    dispatch({
      type: FETCH_FAVORITES_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const addFavorite = (businessId) => async (dispatch) => {
  const user = getAuthUser();
  if (!user?._id) return;

  dispatch({ type: ADD_FAVORITE_REQUEST, payload: businessId });
  try {
    await axios.post(
      `${API_URL}/favorites/add`,
      { userId: user._id, businessId },
      { headers: getHeaders() }
    );
    dispatch({ type: ADD_FAVORITE_SUCCESS, payload: businessId });
  } catch (error) {
    if (error.response?.status === 409) {
      dispatch({ type: ADD_FAVORITE_SUCCESS, payload: businessId });
    } else {
      dispatch({
        type: ADD_FAVORITE_FAILURE,
        payload: { businessId, message: error.response?.data?.message || error.message },
      });
    }
  }
};

export const removeFavorite = (businessId) => async (dispatch) => {
  const user = getAuthUser();
  if (!user?._id) return;

  dispatch({ type: REMOVE_FAVORITE_REQUEST, payload: businessId });
  try {
    await axios.post(
      `${API_URL}/favorites/remove`,
      { userId: user._id, businessId },
      { headers: getHeaders() }
    );
    dispatch({ type: REMOVE_FAVORITE_SUCCESS, payload: businessId });
  } catch (error) {
    dispatch({
      type: REMOVE_FAVORITE_FAILURE,
      payload: { businessId, message: error.response?.data?.message || error.message },
    });
  }
};
