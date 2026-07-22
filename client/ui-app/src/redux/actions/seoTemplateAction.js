import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_SEOTEMPLATE_REQUEST,
  FETCH_SEOTEMPLATE_SUCCESS,
  FETCH_SEOTEMPLATE_FAILURE,

  CREATE_SEOTEMPLATE_REQUEST,
  CREATE_SEOTEMPLATE_SUCCESS,
  CREATE_SEOTEMPLATE_FAILURE,

  EDIT_SEOTEMPLATE_REQUEST,
  EDIT_SEOTEMPLATE_SUCCESS,
  EDIT_SEOTEMPLATE_FAILURE,

  DELETE_SEOTEMPLATE_REQUEST,
  DELETE_SEOTEMPLATE_SUCCESS,
  DELETE_SEOTEMPLATE_FAILURE,
} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API = process.env.REACT_APP_API_URL;

const getToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  return token;
};

export const viewAllSeoTemplate =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEOTEMPLATE_REQUEST });

    try {
      const token = await getToken(dispatch);

      const {
        search = "",
        status = "all",
        sortBy = "updatedAt",
        sortOrder = "desc"
      } = options;

      const res = await axiosInstance.get(
        `${API}/seotemplate/viewall`,
        {
          params: {
            pageNo,
            pageSize,
            search,
            status,
            sortBy,
            sortOrder
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      dispatch({
        type: FETCH_SEOTEMPLATE_SUCCESS,
        payload: {
          data: res.data.data,
          total: res.data.total,
          pageNo,
          pageSize,
        },
      });

    } catch (err) {
      dispatch({
        type: FETCH_SEOTEMPLATE_FAILURE,
        payload: err.response?.data || err.message,
      });
    }
  };


export const createSeoTemplate = (data) => async (dispatch) => {
  dispatch({ type: CREATE_SEOTEMPLATE_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.post(
      `${API}/seotemplate/create`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: CREATE_SEOTEMPLATE_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: CREATE_SEOTEMPLATE_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const updateSeoTemplate = (id, data) => async (dispatch) => {
  dispatch({ type: EDIT_SEOTEMPLATE_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.put(
      `${API}/seotemplate/update/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_SEOTEMPLATE_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: EDIT_SEOTEMPLATE_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const deleteSeoTemplate = (id) => async (dispatch) => {
  dispatch({ type: DELETE_SEOTEMPLATE_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axiosInstance.delete(
      `${API}/seotemplate/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: DELETE_SEOTEMPLATE_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: DELETE_SEOTEMPLATE_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};
