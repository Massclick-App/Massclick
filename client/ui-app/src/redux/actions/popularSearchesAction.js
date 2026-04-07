import axios from "axios";
import {
  FETCH_ENQUIRYNOW_REQUEST,
  FETCH_ENQUIRYNOW_SUCCESS,
  FETCH_ENQUIRYNOW_FAILURE,
  CREATE_ENQUIRYNOW_REQUEST,
  CREATE_ENQUIRYNOW_SUCCESS,
  CREATE_ENQUIRYNOW_FAILURE,
} from "../actions/userActionTypes";

import { getClientToken } from "./clientAuthAction";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};


export const createEnquiryNow = (enquiryData) => async (dispatch) => {
  dispatch({ type: CREATE_ENQUIRYNOW_REQUEST });

  try {
    const response = await axios.post(
      `${API_URL}/popular-search/enquiry-now/create`,
      enquiryData
    );

    dispatch({
      type: CREATE_ENQUIRYNOW_SUCCESS,
      payload: response.data.data,
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: CREATE_ENQUIRYNOW_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};


export const getAllEnquiryNow =
  ({ pageNo = 1, pageSize = 10 } = {}) =>
  async (dispatch) => {

    dispatch({ type: FETCH_ENQUIRYNOW_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const response = await axios.get(
        `${API_URL}/popular-search/enquiry-now/viewall?pageNo=${pageNo}&pageSize=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_ENQUIRYNOW_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });

    } catch (error) {
      dispatch({
        type: FETCH_ENQUIRYNOW_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };
