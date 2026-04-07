import axios from "axios";
import {
  FETCH_USERS_REQUEST, FETCH_USERS_SUCCESS, FETCH_USERS_FAILURE,
  CREATE_USER_REQUEST, CREATE_USER_SUCCESS, CREATE_USER_FAILURE,
  EDIT_USER_REQUEST, EDIT_USER_SUCCESS, EDIT_USER_FAILURE,
  DELETE_USER_REQUEST, DELETE_USER_SUCCESS, DELETE_USER_FAILURE
} from "./userActionTypes";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllUsers =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_USERS_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = ""
      } = options;

      const response = await axios.get(
        `${API_URL}/user/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_USERS_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        }
      });

    } catch (error) {
      dispatch({
        type: FETCH_USERS_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };


export const createUser = (userData) => async (dispatch) => {
  dispatch({ type: CREATE_USER_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/user/create`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = response.data.data || response.data;

    dispatch({ type: CREATE_USER_SUCCESS, payload: user });

    return user;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_USER_FAILURE, payload: errPayload });
    throw error;
  }
};
export const editUser = (id, userData) => async (dispatch) => {
  dispatch({ type: EDIT_USER_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/user/update/${id}`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedUser = response.data;
    dispatch({ type: EDIT_USER_SUCCESS, payload: updatedUser });
    return updatedUser;
  } catch (error) {
    dispatch({ type: EDIT_USER_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};


export const deleteUser = (id) => async (dispatch) => {
  dispatch({ type: DELETE_USER_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const { data } = await axios.delete(`${API_URL}/user/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_USER_SUCCESS, payload: data.user });
  } catch (error) {
    dispatch({ type: DELETE_USER_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

