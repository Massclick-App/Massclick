import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_AUTHORS_REQUEST,
  FETCH_AUTHORS_SUCCESS,
  FETCH_AUTHORS_FAILURE,
  SEARCH_AUTHORS_REQUEST,
  SEARCH_AUTHORS_SUCCESS,
  SEARCH_AUTHORS_FAILURE,
  CREATE_AUTHOR_REQUEST,
  CREATE_AUTHOR_SUCCESS,
  CREATE_AUTHOR_FAILURE,
  UPDATE_AUTHOR_REQUEST,
  UPDATE_AUTHOR_SUCCESS,
  UPDATE_AUTHOR_FAILURE,
  DELETE_AUTHOR_REQUEST,
  DELETE_AUTHOR_SUCCESS,
  DELETE_AUTHOR_FAILURE,
} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API = process.env.REACT_APP_API_URL;

const getToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  return token;
};

export const fetchAllAuthors = (options = {}) => async (dispatch) => {
  dispatch({ type: FETCH_AUTHORS_REQUEST });

  try {
    const res = await axiosInstance.get(`${API}/author/all`, {
      params: options,
    });

    dispatch({
      type: FETCH_AUTHORS_SUCCESS,
      payload: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    dispatch({
      type: FETCH_AUTHORS_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};

export const searchAuthors = (query, options = {}) => async (dispatch) => {
  dispatch({ type: SEARCH_AUTHORS_REQUEST });

  try {
    const res = await axiosInstance.get(`${API}/author/search`, {
      params: { query, ...options },
    });

    dispatch({
      type: SEARCH_AUTHORS_SUCCESS,
      payload: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    dispatch({
      type: SEARCH_AUTHORS_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};

export const createAuthor = (authorData) => async (dispatch) => {
  dispatch({ type: CREATE_AUTHOR_REQUEST });

  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.post(`${API}/author/create`, authorData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    dispatch({
      type: CREATE_AUTHOR_SUCCESS,
      payload: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    dispatch({
      type: CREATE_AUTHOR_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};

export const updateAuthor = (id, authorData) => async (dispatch) => {
  dispatch({ type: UPDATE_AUTHOR_REQUEST });

  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.put(
      `${API}/author/${id}`,
      authorData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: UPDATE_AUTHOR_SUCCESS,
      payload: res.data.data,
    });

    return res.data.data;
  } catch (error) {
    dispatch({
      type: UPDATE_AUTHOR_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};

export const deleteAuthor = (id) => async (dispatch) => {
  dispatch({ type: DELETE_AUTHOR_REQUEST });

  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.delete(`${API}/author/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    dispatch({
      type: DELETE_AUTHOR_SUCCESS,
      payload: id,
    });

    return res.data;
  } catch (error) {
    dispatch({
      type: DELETE_AUTHOR_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};

export const fetchAuthorBySlug = (slug) => async (dispatch) => {
  dispatch({ type: FETCH_AUTHORS_REQUEST });

  try {
    const res = await axiosInstance.get(`${API}/author/profile/${slug}`);

    dispatch({
      type: FETCH_AUTHORS_SUCCESS,
      payload: [res.data.data],
    });

    return res.data.data;
  } catch (error) {
    dispatch({
      type: FETCH_AUTHORS_FAILURE,
      payload: error.message,
    });

    throw error;
  }
};
