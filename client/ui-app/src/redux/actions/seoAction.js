import axios from "axios";
import {
  FETCH_SEO_REQUEST, FETCH_SEO_SUCCESS, FETCH_SEO_FAILURE,
  CREATE_SEO_REQUEST, CREATE_SEO_SUCCESS, CREATE_SEO_FAILURE,
  EDIT_SEO_REQUEST, EDIT_SEO_SUCCESS, EDIT_SEO_FAILURE,
  DELETE_SEO_REQUEST, DELETE_SEO_SUCCESS, DELETE_SEO_FAILURE,
  FETCH_SEO_META_REQUEST, FETCH_SEO_META_SUCCESS, FETCH_SEO_META_FAILURE,
  FETCH_SEO_CATEGORY_SUGGESTIONS_REQUEST, FETCH_SEO_CATEGORY_SUGGESTIONS_SUCCESS,
  FETCH_SEO_CATEGORY_SUGGESTIONS_FAILURE
} from "./userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};


export const getAllSeo =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_SEO_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = ""
      } = options;

      const response = await axios.get(
        `${API_URL}/seo/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_SEO_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize
        }
      });

    } catch (error) {
      dispatch({
        type: FETCH_SEO_FAILURE,
        payload: error.response?.data || error.message
      });
    }
  };


export const createSeo = (seoData) => async (dispatch) => {

  dispatch({ type: CREATE_SEO_REQUEST });

  try {

    const token = await getValidToken(dispatch);

    const response = await axios.post(
      `${API_URL}/seo/create`,
      seoData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: CREATE_SEO_SUCCESS,
      payload: response.data
    });

    return response.data;

  }
  catch (error) {

    const message =
      error?.response?.data?.message ||
      "SEO creation failed";

    dispatch({
      type: CREATE_SEO_FAILURE,
      payload: message
    });

    throw new Error(message);

  }

};

export const editSeo = (id, seoData) => async (dispatch) => {
  dispatch({ type: EDIT_SEO_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axios.put(
      `${API_URL}/seo/update/${id}`,
      seoData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_SEO_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({
      type: EDIT_SEO_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const deleteSeo = (id) => async (dispatch) => {
  dispatch({ type: DELETE_SEO_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axios.delete(
      `${API_URL}/seo/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: DELETE_SEO_SUCCESS, payload: response.data });
  } catch (error) {
    dispatch({
      type: DELETE_SEO_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};


export const fetchSeoMeta =
  ({ pageType, category, location }) =>
    async (dispatch) => {
      dispatch({ type: FETCH_SEO_META_REQUEST });

      try {
        const response = await axios.get(`${API_URL}/seo/meta`, {
          params: { pageType, category, location },
        });

        dispatch({
          type: FETCH_SEO_META_SUCCESS,
          payload: response.data
        });

        return response.data;
      } catch (error) {
        dispatch({
          type: FETCH_SEO_META_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };

export const fetchSeoCategorySuggestions =
  ({ query, limit = 10 }) =>
    async (dispatch) => {
      dispatch({ type: FETCH_SEO_CATEGORY_SUGGESTIONS_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        const response = await axios.get(
          `${API_URL}/seo/category-suggestions`,
          {
            params: { q: query, limit },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        dispatch({
          type: FETCH_SEO_CATEGORY_SUGGESTIONS_SUCCESS,
          payload: response.data,
        });

        return response.data;
      } catch (error) {
        dispatch({
          type: FETCH_SEO_CATEGORY_SUGGESTIONS_FAILURE,
          payload: error.response?.data || error.message,
        });
      }
    };
