import axios from "axios";
import {
  FETCH_SEOPAGECONTENT_REQUEST,
  FETCH_SEOPAGECONTENT_SUCCESS,
  FETCH_SEOPAGECONTENT_FAILURE,

  CREATE_SEOPAGECONTENT_REQUEST,
  CREATE_SEOPAGECONTENT_SUCCESS,
  CREATE_SEOPAGECONTENT_FAILURE,

  EDIT_SEOPAGECONTENT_REQUEST,
  EDIT_SEOPAGECONTENT_SUCCESS,
  EDIT_SEOPAGECONTENT_FAILURE,

  DELETE_SEOPAGECONTENT_REQUEST,
  DELETE_SEOPAGECONTENT_SUCCESS,
  DELETE_SEOPAGECONTENT_FAILURE,
  
  FETCH_SEOPAGECONTENT_META_REQUEST,
  FETCH_SEOPAGECONTENT_META_SUCCESS,
  FETCH_SEOPAGECONTENT_META_FAILURE
} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API = process.env.REACT_APP_API_URL;

const getToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  return token;
};

export const viewAllSeoPageContent =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEOPAGECONTENT_REQUEST });

    try {
      const token = await getToken(dispatch);

      const {
        search = "",
        sortBy = "updatedAt",
        sortOrder = "desc"
      } = options;

      const res = await axios.get(
        `${API}/seopagecontent/viewall`,
        {
          params: {
            pageNo,
            pageSize,
            search,
            sortBy,
            sortOrder
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      dispatch({
        type: FETCH_SEOPAGECONTENT_SUCCESS,
        payload: {
          data: res.data.data,
          total: res.data.total,
          pageNo,
          pageSize,
        },
      });

    } catch (err) {
      dispatch({
        type: FETCH_SEOPAGECONTENT_FAILURE,
        payload: err.response?.data || err.message,
      });
    }
  };


export const createSeoPageContent = (data) => async (dispatch) => {
  dispatch({ type: CREATE_SEOPAGECONTENT_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.post(
      `${API}/seopagecontent/create`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: CREATE_SEOPAGECONTENT_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: CREATE_SEOPAGECONTENT_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const updateSeoPageContent = (id, data) => async (dispatch) => {
  dispatch({ type: EDIT_SEOPAGECONTENT_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.put(
      `${API}/seopagecontent/update/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_SEOPAGECONTENT_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: EDIT_SEOPAGECONTENT_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const deleteSeoPageContent = (id) => async (dispatch) => {
  dispatch({ type: DELETE_SEOPAGECONTENT_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.delete(
      `${API}/seopagecontent/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: DELETE_SEOPAGECONTENT_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: DELETE_SEOPAGECONTENT_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const fetchSeoPageContentMeta =
  ({ pageType, category, location }) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEOPAGECONTENT_META_REQUEST });

    try {
      const res = await axios.get(
        `${API}/seopagecontent/meta`,
        {
          params: { pageType, category, location },
        }
      );

      dispatch({
        type: FETCH_SEOPAGECONTENT_META_SUCCESS,
        payload: {
          data: res.data ? [res.data] : [],
          total: res.data ? 1 : 0,
        },
      });

      return res.data;
    } catch (err) {
      dispatch({
        type: FETCH_SEOPAGECONTENT_META_FAILURE,
        payload: err.response?.data || err.message,
      });
    }
  };
