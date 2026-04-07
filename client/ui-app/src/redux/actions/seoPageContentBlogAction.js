import axios from "axios";
import {
  FETCH_SEOPAGECONTENTBLOGS_REQUEST,
  FETCH_SEOPAGECONTENTBLOGS_SUCCESS,
  FETCH_SEOPAGECONTENTBLOGS_FAILURE,

  CREATE_SEOPAGECONTENTBLOGS_REQUEST,
  CREATE_SEOPAGECONTENTBLOGS_SUCCESS,
  CREATE_SEOPAGECONTENTBLOGS_FAILURE,

  EDIT_SEOPAGECONTENTBLOGS_REQUEST,
  EDIT_SEOPAGECONTENTBLOGS_SUCCESS,
  EDIT_SEOPAGECONTENTBLOGS_FAILURE,

  DELETE_SEOPAGECONTENTBLOGS_REQUEST,
  DELETE_SEOPAGECONTENTBLOGS_SUCCESS,
  DELETE_SEOPAGECONTENTBLOGS_FAILURE,
  
  FETCH_SEOPAGECONTENTBLOGS_META_REQUEST,
  FETCH_SEOPAGECONTENTBLOGS_META_SUCCESS,
  FETCH_SEOPAGECONTENTBLOGS_META_FAILURE,

  FETCH_SEOBLOG_BY_SLUG_REQUEST,
  FETCH_SEOBLOG_BY_SLUG_SUCCESS,
  FETCH_SEOBLOG_BY_SLUG_FAILURE,
  
 FETCH_BUSINESS_SUGGESTION_REQUEST,
 FETCH_BUSINESS_SUGGESTION_SUCCESS,
 FETCH_BUSINESS_SUGGESTION_FAILURE,

} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API = process.env.REACT_APP_API_URL;

const getToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  return token;
};

export const viewAllSeoPageContentBlogs =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEOPAGECONTENTBLOGS_REQUEST });

    try {
      const token = await getToken(dispatch);

      const {
        search = "",
        sortBy = "updatedAt",
        sortOrder = "desc"
      } = options;

      const res = await axios.get(
        `${API}/seopagecontentblog/viewall`,
        {
          params: {
            pageNo,
            pageSize,
            search,
            sortBy,
            sortOrder,
            status: "all",   
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      dispatch({
        type: FETCH_SEOPAGECONTENTBLOGS_SUCCESS,
        payload: {
          data: res.data.data,
          total: res.data.total,
          pageNo,
          pageSize,
        },
      });

    } catch (err) {
      dispatch({
        type: FETCH_SEOPAGECONTENTBLOGS_FAILURE,
        payload: err.response?.data || err.message,
      });
    }
  };

export const createSeoPageContentBlogs = (data) => async (dispatch) => {
  dispatch({ type: CREATE_SEOPAGECONTENTBLOGS_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.post(
      `${API}/seopagecontentblog/create`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: CREATE_SEOPAGECONTENTBLOGS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: CREATE_SEOPAGECONTENTBLOGS_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const updateSeoPageContentBlogs = (id, data) => async (dispatch) => {
  dispatch({ type: EDIT_SEOPAGECONTENTBLOGS_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.put(
      `${API}/seopagecontentblog/update/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_SEOPAGECONTENTBLOGS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: EDIT_SEOPAGECONTENTBLOGS_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const deleteSeoPageContentBlogs = (id) => async (dispatch) => {
  dispatch({ type: DELETE_SEOPAGECONTENTBLOGS_REQUEST });
  try {
    const token = await getToken(dispatch);

    const res = await axios.delete(
      `${API}/seopagecontentblog/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: DELETE_SEOPAGECONTENTBLOGS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: DELETE_SEOPAGECONTENTBLOGS_FAILURE,
      payload: err.response?.data || err.message,
    });
    throw err;
  }
};

export const fetchSeoPageContentBlogsMeta =
  ({ pageType, category, location }) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEOPAGECONTENTBLOGS_META_REQUEST });

    try {
      const res = await axios.get(
        `${API}/seopagecontentblog/meta`,
        {
          params: { pageType, category, location },
        }
      );

      dispatch({
        type: FETCH_SEOPAGECONTENTBLOGS_META_SUCCESS,
        payload: {
          data: res.data || [],
          total: res.data?.length || 0,
        },
      });

      return res.data;
    } catch (err) {
      console.log("❌ API ERROR:", err);

      dispatch({
        type: FETCH_SEOPAGECONTENTBLOGS_META_FAILURE,
        payload: err.response?.data || err.message,
      });
    }
  };

  export const fetchSeoBlogBySlug = (slug) => async (dispatch) => {
  dispatch({ type: FETCH_SEOBLOG_BY_SLUG_REQUEST });

  try {
    console.log("🔥 FETCH BLOG BY SLUG:", slug);

    const res = await axios.get(
      `${API}/seopagecontentblog/blog/${slug}`
    );

    dispatch({
      type: FETCH_SEOBLOG_BY_SLUG_SUCCESS,
      payload: res.data,
    });

    return res.data;

  } catch (err) {
    console.log("❌ BLOG ERROR:", err);

    dispatch({
      type: FETCH_SEOBLOG_BY_SLUG_FAILURE,
      payload: err.response?.data || err.message,
    });
  }
};

export const fetchBusinessSuggestion = (search) => async (dispatch) => {
  dispatch({ type: FETCH_BUSINESS_SUGGESTION_REQUEST });

  try {
    const res = await axios.get(
      `${API}/seopagecontentblog/suggestion`,
      {
        params: { search },
      }
    );

    dispatch({
      type: FETCH_BUSINESS_SUGGESTION_SUCCESS,
      payload: res.data,
    });

  } catch (err) {
    dispatch({
      type: FETCH_BUSINESS_SUGGESTION_FAILURE,
      payload: err.response?.data || err.message,
    });
  }
};