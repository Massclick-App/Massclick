import axios from "axios";
import {
  FETCH_CATEGORY_REQUEST, FETCH_CATEGORY_SUCCESS, FETCH_CATEGORY_FAILURE,
  CREATE_CATEGORY_REQUEST, CREATE_CATEGORY_SUCCESS, CREATE_CATEGORY_FAILURE,
  EDIT_CATEGORY_REQUEST, EDIT_CATEGORY_SUCCESS, EDIT_CATEGORY_FAILURE,
  DELETE_CATEGORY_REQUEST, DELETE_CATEGORY_SUCCESS, DELETE_CATEGORY_FAILURE,
  BUSINESS_CATEGORYSEARCH_REQUEST, BUSINESS_CATEGORYSEARCH_SUCCESS, BUSINESS_CATEGORYSEARCH_FAILURE
} from "../actions/userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;


const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllCategory =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_CATEGORY_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const { search = "", status = "all", sortBy = "", sortOrder = "" } = options;

      const response = await axios.get(
        `${API_URL}/category/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_CATEGORY_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_CATEGORY_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };



export const createCategory = (categoryData) => async (dispatch) => {
  dispatch({ type: CREATE_CATEGORY_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/category/create`, categoryData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const category = response.data.data || response.data;

    dispatch({ type: CREATE_CATEGORY_SUCCESS, payload: category });

    return category;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_CATEGORY_FAILURE, payload: errPayload });
    throw error;
  }
};

export const editCategory = (id, categoryData) => async (dispatch) => {
  dispatch({ type: EDIT_CATEGORY_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/category/update/${id}`, categoryData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedCategory = response.data;
    dispatch({ type: EDIT_CATEGORY_SUCCESS, payload: updatedCategory });
    return updatedCategory;
  } catch (error) {
    dispatch({ type: EDIT_CATEGORY_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};


export const deleteCategory = (id) => async (dispatch) => {
  dispatch({ type: DELETE_CATEGORY_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const { data } = await axios.delete(`${API_URL}/category/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_CATEGORY_SUCCESS, payload: data.category });
  } catch (error) {
    dispatch({ type: DELETE_CATEGORY_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const businessCategorySearch = (query) => async (dispatch) => {
  try {
    dispatch({ type: BUSINESS_CATEGORYSEARCH_REQUEST });

    const token = await getValidToken(dispatch);

    const response = await axios.get(
      `${API_URL}/category/businesscategorysearch?query=${query}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    dispatch({
      type: BUSINESS_CATEGORYSEARCH_SUCCESS,
      payload: response.data,
    });

  } catch (error) {
    dispatch({
      type: BUSINESS_CATEGORYSEARCH_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};
