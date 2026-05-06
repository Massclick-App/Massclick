// src/redux/actions/termsAndConditionsActions.js

import axios from "axios";
import {
  FETCH_TERMS_REQUEST,
  FETCH_TERMS_SUCCESS,
  FETCH_TERMS_FAILURE,

  CREATE_TERMS_REQUEST,
  CREATE_TERMS_SUCCESS,
  CREATE_TERMS_FAILURE,

  EDIT_TERMS_REQUEST,
  EDIT_TERMS_SUCCESS,
  EDIT_TERMS_FAILURE,

  DELETE_TERMS_REQUEST,
  DELETE_TERMS_SUCCESS,
  DELETE_TERMS_FAILURE,
} from "../userActionTypes.js";

import { getClientToken } from "../clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");

  if (!token) {
    token = await dispatch(getClientToken());
  }

  if (!token) {
    throw new Error("No valid token found");
  }

  return token;
};

/**
 * GET ALL
 */
export const getAllTermsAndConditions = () => async (dispatch) => {
  dispatch({ type: FETCH_TERMS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axios.get(
      `${API_URL}/terms-and-conditions/viewall`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    dispatch({
      type: FETCH_TERMS_SUCCESS,
      payload: response.data || [],
    });
  } catch (error) {
    dispatch({
      type: FETCH_TERMS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

/**
 * CREATE
 */
export const createTermsAndConditions = (payloadData) => async (dispatch) => {
  dispatch({ type: CREATE_TERMS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axios.post(
      `${API_URL}/terms-and-conditions/create`,
      payloadData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const createdData = response.data;

    dispatch({
      type: CREATE_TERMS_SUCCESS,
      payload: createdData,
    });

    return createdData;
  } catch (error) {
    dispatch({
      type: CREATE_TERMS_FAILURE,
      payload: error.response?.data || error.message,
    });

    throw error;
  }
};

/**
 * UPDATE
 */
export const editTermsAndConditions =
  (id, payloadData) => async (dispatch) => {
    dispatch({ type: EDIT_TERMS_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const response = await axios.put(
        `${API_URL}/terms-and-conditions/update/${id}`,
        payloadData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedData = response.data;

      dispatch({
        type: EDIT_TERMS_SUCCESS,
        payload: updatedData,
      });

      return updatedData;
    } catch (error) {
      dispatch({
        type: EDIT_TERMS_FAILURE,
        payload: error.response?.data || error.message,
      });

      throw error;
    }
  };

/**
 * DELETE
 */
export const deleteTermsAndConditions = (id) => async (dispatch) => {
  dispatch({ type: DELETE_TERMS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axios.delete(
      `${API_URL}/terms-and-conditions/delete/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    dispatch({
      type: DELETE_TERMS_SUCCESS,
      payload: response.data.data,
    });
  } catch (error) {
    dispatch({
      type: DELETE_TERMS_FAILURE,
      payload: error.response?.data || error.message,
    });

    throw error;
  }
};