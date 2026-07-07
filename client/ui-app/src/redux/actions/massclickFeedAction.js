import axiosInstance from "../../services/axiosInstance.js";
import {
  CREATE_MASSCLICK_FEED_POST_FAILURE,
  CREATE_MASSCLICK_FEED_POST_REQUEST,
  CREATE_MASSCLICK_FEED_POST_SUCCESS,
  FETCH_MASSCLICK_FEED_FAILURE,
  FETCH_MASSCLICK_FEED_REQUEST,
  FETCH_MASSCLICK_FEED_SUCCESS,
  MASSCLICK_FEED_ACTION_FAILURE,
  UPDATE_MASSCLICK_FEED_POST_SUCCESS,
} from "./userActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;

export const getMassclickFeedPosts =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_MASSCLICK_FEED_REQUEST });

    try {
      const params = new URLSearchParams({
        pageNo,
        pageSize,
        search: options.search || "",
        status: options.status || "active",
        includeInactive: options.includeInactive ? "true" : "false",
      });

      const response = await axiosInstance.get(
        `${API_URL}/massclick-feed/posts?${params.toString()}`
      );

      dispatch({
        type: FETCH_MASSCLICK_FEED_SUCCESS,
        payload: response.data,
      });

      return response.data;
    } catch (error) {
      dispatch({
        type: FETCH_MASSCLICK_FEED_FAILURE,
        payload: error.response?.data || { message: error.message },
      });
      throw error;
    }
  };

export const createMassclickFeedPost = (postData) => async (dispatch) => {
  dispatch({ type: CREATE_MASSCLICK_FEED_POST_REQUEST });

  try {
    const response = await axiosInstance.post(`${API_URL}/massclick-feed/posts`, postData);
    const post = response.data.post || response.data;

    dispatch({ type: CREATE_MASSCLICK_FEED_POST_SUCCESS, payload: post });
    return post;
  } catch (error) {
    dispatch({
      type: CREATE_MASSCLICK_FEED_POST_FAILURE,
      payload: error.response?.data || { message: error.message },
    });
    throw error;
  }
};

const updateFeedPost = (request) => async (dispatch) => {
  try {
    const response = await request();
    const post = response.data.post || response.data;
    dispatch({ type: UPDATE_MASSCLICK_FEED_POST_SUCCESS, payload: post });
    return post;
  } catch (error) {
    dispatch({
      type: MASSCLICK_FEED_ACTION_FAILURE,
      payload: error.response?.data || { message: error.message },
    });
    throw error;
  }
};

export const toggleMassclickFeedLike = (postId) =>
  updateFeedPost(() => axiosInstance.post(`${API_URL}/massclick-feed/posts/${postId}/like`));

export const addMassclickFeedComment = (postId, text) =>
  updateFeedPost(() =>
    axiosInstance.post(`${API_URL}/massclick-feed/posts/${postId}/comment`, { text })
  );

export const shareMassclickFeedPost = (postId) =>
  updateFeedPost(() => axiosInstance.post(`${API_URL}/massclick-feed/posts/${postId}/share`));

export const updateMassclickFeedPostStatus = (postId, status) =>
  updateFeedPost(() =>
    axiosInstance.patch(`${API_URL}/massclick-feed/posts/${postId}/status`, { status })
  );

export const deleteMassclickFeedPost = (postId) =>
  updateFeedPost(() => axiosInstance.delete(`${API_URL}/massclick-feed/posts/${postId}`));
