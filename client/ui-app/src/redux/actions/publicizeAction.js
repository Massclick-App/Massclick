import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_PUBLICIZE_REQUEST,
  FETCH_PUBLICIZE_SUCCESS,
  FETCH_PUBLICIZE_FAILURE,
  CREATE_PUBLICIZE_REQUEST,
  CREATE_PUBLICIZE_SUCCESS,
  CREATE_PUBLICIZE_FAILURE,
  EDIT_PUBLICIZE_REQUEST,
  EDIT_PUBLICIZE_SUCCESS,
  EDIT_PUBLICIZE_FAILURE,
  DELETE_PUBLICIZE_REQUEST,
  DELETE_PUBLICIZE_SUCCESS,
  DELETE_PUBLICIZE_FAILURE,
} from "../actions/userActionTypes";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllPublicize = () => async (dispatch) => {
  dispatch({ type: FETCH_PUBLICIZE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/publicize/viewall`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: FETCH_PUBLICIZE_SUCCESS,
      payload: response.data || [],
    });
  } catch (error) {
    dispatch({
      type: FETCH_PUBLICIZE_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const createPublicize = (publicizeData) => async (dispatch) => {
  dispatch({ type: CREATE_PUBLICIZE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/publicize/create`,
      publicizeData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const createdPublicize = response.data?.publicize || response.data;

    dispatch({
      type: CREATE_PUBLICIZE_SUCCESS,
      payload: createdPublicize,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: CREATE_PUBLICIZE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};


export const editPublicize = (id, publicizeData) => async (dispatch) => {
  dispatch({ type: EDIT_PUBLICIZE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(
      `${API_URL}/publicize/update/${id}`,
      publicizeData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const updatedPublicize = response.data;

    dispatch({
      type: EDIT_PUBLICIZE_SUCCESS,
      payload: updatedPublicize,
    });

    return updatedPublicize;
  } catch (error) {
    dispatch({
      type: EDIT_PUBLICIZE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const deletePublicize = (id) => async (dispatch) => {
  dispatch({ type: DELETE_PUBLICIZE_REQUEST });

  try {
      const token = await getValidToken(dispatch);

    const { data } = await axiosInstance.delete(
      `${API_URL}/publicize/delete/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: DELETE_PUBLICIZE_SUCCESS,
      payload: data.publicize,
    });
  } catch (error) {
    dispatch({
      type: DELETE_PUBLICIZE_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
