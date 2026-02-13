import axios from "axios";
import {
  FETCH_ADVERTISE_REQUEST,
  FETCH_ADVERTISE_SUCCESS,
  FETCH_ADVERTISE_FAILURE,
  CREATE_ADVERTISE_REQUEST,
  CREATE_ADVERTISE_SUCCESS,
  CREATE_ADVERTISE_FAILURE,
  EDIT_ADVERTISE_REQUEST,
  EDIT_ADVERTISE_SUCCESS,
  EDIT_ADVERTISE_FAILURE,
  DELETE_ADVERTISE_REQUEST,
  DELETE_ADVERTISE_SUCCESS,
  DELETE_ADVERTISE_FAILURE,
} from "../actions/userActionTypes";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllAdvertise = () => async (dispatch) => {
  dispatch({ type: FETCH_ADVERTISE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axios.get(
      `${API_URL}/advertise/viewall`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: FETCH_ADVERTISE_SUCCESS,
      payload: response.data || [],
    });
  } catch (error) {
    dispatch({
      type: FETCH_ADVERTISE_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};


export const createAdvertise = (advertiseData) => async (dispatch) => {
  dispatch({ type: CREATE_ADVERTISE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axios.post(
      `${API_URL}/advertise/create`,
      advertiseData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const createdAdvertise = response.data;

    dispatch({
      type: CREATE_ADVERTISE_SUCCESS,
      payload: createdAdvertise,
    });

    return createdAdvertise;
  } catch (error) {
    dispatch({
      type: CREATE_ADVERTISE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};


export const editAdvertise = (id, advertiseData) => async (dispatch) => {
  dispatch({ type: EDIT_ADVERTISE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axios.put(
      `${API_URL}/advertise/update/${id}`,
      advertiseData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const updatedAdvertise = response.data;

    dispatch({
      type: EDIT_ADVERTISE_SUCCESS,
      payload: updatedAdvertise,
    });

    return updatedAdvertise;
  } catch (error) {
    dispatch({
      type: EDIT_ADVERTISE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const deleteAdvertise = (id) => async (dispatch) => {
  dispatch({ type: DELETE_ADVERTISE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const { data } = await axios.delete(
      `${API_URL}/advertise/delete/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: DELETE_ADVERTISE_SUCCESS,
      payload: data.advertise,
    });
  } catch (error) {
    dispatch({
      type: DELETE_ADVERTISE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
