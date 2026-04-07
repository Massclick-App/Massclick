import axios from "axios";
import {
  FETCH_USERSCLIENT_REQUEST, FETCH_USERSCLIENT_SUCCESS, FETCH_USERSCLIENT_FAILURE,
  CREATE_USERCLIENT_REQUEST, CREATE_USERCLIENT_SUCCESS, CREATE_USERCLIENT_FAILURE,
  EDIT_USERCLIENT_REQUEST, EDIT_USERCLIENT_SUCCESS, EDIT_USERCLIENT_FAILURE,
  DELETE_USERCLIENT_REQUEST,DELETE_USERCLIENT_SUCCESS, DELETE_USERCLIENT_FAILURE,
  SEARCH_USERCLIENTSSUGGESTION_REQUEST, SEARCH_USERCLIENTSSUGGESTION_SUCCESS, SEARCH_USERCLIENTSSUGGESTION_FAILURE
} from "./userActionTypes";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllUsersClient =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_USERSCLIENT_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = ""
      } = options;

      const response = await axios.get(
        `${API_URL}/userclient/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_USERSCLIENT_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        }
      });

    } catch (error) {
      dispatch({
        type: FETCH_USERSCLIENT_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };


export const createUserClient = (userData) => async (dispatch) => {
  dispatch({ type: CREATE_USERCLIENT_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axios.post(`${API_URL}/userclient/create`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = response.data.data || response.data;

    dispatch({ type: CREATE_USERCLIENT_SUCCESS, payload: user });

    return user;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_USERCLIENT_FAILURE, payload: errPayload });
    throw error;
  }
};
export const editUserClient = (id, userClientData) => async (dispatch) => {
  dispatch({ type: EDIT_USERCLIENT_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axios.put(`${API_URL}/userclient/update/${id}`, userClientData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedUserClient = response.data;
    dispatch({ type: EDIT_USERCLIENT_SUCCESS, payload: updatedUserClient });
    return updatedUserClient;
  } catch (error) {
    dispatch({ type: EDIT_USERCLIENT_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};


export const deleteUserClient = (id) => async (dispatch) => {
  dispatch({ type: DELETE_USERCLIENT_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const { data } = await axios.delete(`${API_URL}/userclient/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_USERCLIENT_SUCCESS, payload: data.user  });
  } catch (error) {
    dispatch({ type: DELETE_USERCLIENT_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};


export const getUserClientSuggestion = (query) => async (dispatch) => {
  try {
    dispatch({ type: SEARCH_USERCLIENTSSUGGESTION_REQUEST });

    const token = await getValidToken(dispatch);

    const response = await axios.get(
      `${API_URL}/userClient/search?query=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: SEARCH_USERCLIENTSSUGGESTION_SUCCESS,
      payload: response.data,
    });

  } catch (error) {
    dispatch({
      type: SEARCH_USERCLIENTSSUGGESTION_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

