import axios from "axios";
import {
  FETCH_AD_REQUEST, FETCH_AD_SUCCESS, FETCH_AD_FAILURE,
  CREATE_AD_REQUEST, CREATE_AD_SUCCESS, CREATE_AD_FAILURE,
  EDIT_AD_REQUEST, EDIT_AD_SUCCESS, EDIT_AD_FAILURE,
  DELETE_AD_REQUEST, DELETE_AD_SUCCESS, DELETE_AD_FAILURE,
  VIEWCATEGORY_AD_REQUEST, VIEWCATEGORY_AD_SUCCESS, VIEWCATEGORY_AD_FAILURE
} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;


const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};


export const getAllAdvertisements =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_AD_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const {
        search = "",
        status = "all",
        category = "",
        sortBy = "createdAt",
        sortOrder = ""
      } = options;

      const response = await axios.get(
        `${API_URL}/advertisment/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&category=${category}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_AD_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize
        }
      });
    } catch (error) {
      dispatch({
        type: FETCH_AD_FAILURE,
        payload: error.response?.data || error.message
      });
    }
  };


export const createAdvertisement = (adData) => async (dispatch) => {
  dispatch({ type: CREATE_AD_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axios.post(
      `${API_URL}/advertisment/create`,
      adData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const ad = response.data.advertisement || response.data;

    dispatch({ type: CREATE_AD_SUCCESS, payload: ad });
    return ad;
  } catch (error) {
    dispatch({
      type: CREATE_AD_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const getAdvertisementByCategory = (category) => async (dispatch) => {
  dispatch({ type: VIEWCATEGORY_AD_REQUEST });

  try {
      const token = await dispatch(getClientToken());

    const response = await axios.get(
      `${API_URL}/advertisment/category?category=${encodeURIComponent(category)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: VIEWCATEGORY_AD_SUCCESS,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: VIEWCATEGORY_AD_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Failed to load category advertisements",
    });
  }
};


export const editAdvertisement = (id, adData) => async (dispatch) => {
  dispatch({ type: EDIT_AD_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axios.put(
      `${API_URL}/advertisment/update/${id}`,
      adData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: EDIT_AD_SUCCESS,
      payload: response.data
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: EDIT_AD_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const deleteAdvertisement = (id) => async (dispatch) => {
  dispatch({ type: DELETE_AD_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const { data } = await axios.delete(
      `${API_URL}/advertisment/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: DELETE_AD_SUCCESS,
      payload: data.result
    });
  } catch (error) {
    dispatch({
      type: DELETE_AD_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};
