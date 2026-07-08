import axiosInstance from "../../services/axiosInstance.js";
import {
  CREATE_USER_FEEDBACK_FAILURE,
  CREATE_USER_FEEDBACK_REQUEST,
  CREATE_USER_FEEDBACK_SUCCESS,
  FETCH_USER_FEEDBACK_FAILURE,
  FETCH_USER_FEEDBACK_REQUEST,
  FETCH_USER_FEEDBACK_SUCCESS,
  UPDATE_USER_FEEDBACK_SUCCESS,
  USER_FEEDBACK_ACTION_FAILURE,
} from "./userActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;

export const createUserFeedback = (feedbackData) => async (dispatch) => {
  dispatch({ type: CREATE_USER_FEEDBACK_REQUEST });

  try {
    const response = await axiosInstance.post(`${API_URL}/user-feedback`, {
      ...feedbackData,
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
    });
    const feedback = response.data.feedback || response.data;

    dispatch({ type: CREATE_USER_FEEDBACK_SUCCESS, payload: feedback });
    return feedback;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: CREATE_USER_FEEDBACK_FAILURE, payload });
    throw error;
  }
};

export const getUserFeedback =
  ({ pageNo = 1, pageSize = 20, search = "", status = "" } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_USER_FEEDBACK_REQUEST });

    try {
      const params = new URLSearchParams({ pageNo, pageSize, search, status });
      const response = await axiosInstance.get(
        `${API_URL}/admin/user-feedback?${params.toString()}`
      );

      dispatch({ type: FETCH_USER_FEEDBACK_SUCCESS, payload: response.data });
      return response.data;
    } catch (error) {
      const payload = error.response?.data || { message: error.message };
      dispatch({ type: FETCH_USER_FEEDBACK_FAILURE, payload });
      throw error;
    }
  };

export const updateUserFeedbackStatus = (feedbackId, updates) => async (dispatch) => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/admin/user-feedback/${feedbackId}`,
      updates
    );
    const feedback = response.data.feedback || response.data;

    dispatch({ type: UPDATE_USER_FEEDBACK_SUCCESS, payload: feedback });
    return feedback;
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    dispatch({ type: USER_FEEDBACK_ACTION_FAILURE, payload });
    throw error;
  }
};
