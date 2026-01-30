import axios from "axios";
import {
  FETCH_REVIEWS_REQUEST, FETCH_REVIEWS_SUCCESS, FETCH_REVIEWS_FAILURE,
  CREATE_REVIEW_REQUEST, CREATE_REVIEW_SUCCESS, CREATE_REVIEW_FAILURE,
  REPLY_REVIEW_REQUEST, REPLY_REVIEW_SUCCESS, REPLY_REVIEW_FAILURE,
  HELPFUL_REVIEW_REQUEST, HELPFUL_REVIEW_SUCCESS, HELPFUL_REVIEW_FAILURE,
  REPORT_REVIEW_REQUEST, REPORT_REVIEW_SUCCESS, REPORT_REVIEW_FAILURE
} from "./userActionTypes";

import { getClientToken } from "./clientAuthAction";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getBusinessReviews =
  (businessId, sort = "latest") =>
    async (dispatch) => {

      dispatch({ type: FETCH_REVIEWS_REQUEST });

      try {
        const response = await axios.get(
          `${API_URL}/business/${businessId}/reviews?sort=${sort}`
        );

        dispatch({
          type: FETCH_REVIEWS_SUCCESS,
          payload: response.data
        });

      } catch (error) {
        dispatch({
          type: FETCH_REVIEWS_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };

export const createReview =
  (businessId, reviewData) =>
    async (dispatch) => {

      dispatch({ type: CREATE_REVIEW_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        const response = await axios.post(
          `${API_URL}/business/${businessId}/reviews`,
          reviewData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        dispatch({
          type: CREATE_REVIEW_SUCCESS,
          payload: response.data.data
        });

        return response.data.data;

      } catch (error) {
        dispatch({
          type: CREATE_REVIEW_FAILURE,
          payload: error.response?.data || error.message
        });
        throw error;
      }
    };


export const replyToReview =
  (businessId, reviewId, payload) =>
  async (dispatch) => {
    dispatch({ type: REPLY_REVIEW_REQUEST });

    try {
      const response = await axios.post(
        `${API_URL}/business/${businessId}/reviews/${reviewId}/reply`,
        payload
      );

      dispatch({
        type: REPLY_REVIEW_SUCCESS,
        payload: response.data.data
      });

      return response.data.data;
    } catch (error) {
      dispatch({
        type: REPLY_REVIEW_FAILURE,
        payload: error.response?.data || error.message
      });
      throw error;
    }
  };


export const markReviewHelpful =
  (businessId, reviewId, userId) =>
  async (dispatch) => {

    dispatch({ type: HELPFUL_REVIEW_REQUEST });

    try {
      const response = await axios.post(
        `${API_URL}/business/${businessId}/reviews/${reviewId}/helpful`,
        { userId }
      );

      dispatch({
        type: HELPFUL_REVIEW_SUCCESS,
        payload: response.data.review
      });

    } catch (error) {
      dispatch({
        type: HELPFUL_REVIEW_FAILURE,
        payload: error.response?.data || error.message
      });
    }
  };


export const reportReview =
  (businessId, reviewId) =>
    async (dispatch) => {

      dispatch({ type: REPORT_REVIEW_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        await axios.post(
          `${API_URL}/business/${businessId}/reviews/${reviewId}/report`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        dispatch({
          type: REPORT_REVIEW_SUCCESS,
          payload: reviewId
        });

      } catch (error) {
        dispatch({
          type: REPORT_REVIEW_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };
