import axios from "axios";
import {
    FETCH_ROLES_REQUEST, FETCH_ROLES_SUCCESS, FETCH_ROLES_FAILURE,
    CREATE_ROLES_REQUEST, CREATE_ROLES_SUCCESS, CREATE_ROLES_FAILURE,
    EDIT_ROLES_REQUEST, EDIT_ROLES_SUCCESS, EDIT_ROLES_FAILURE,
    DELETE_ROLES_REQUEST, DELETE_ROLES_SUCCESS, DELETE_ROLES_FAILURE
} from "../actions/userActionTypes.js";

import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllRoles =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_ROLES_REQUEST });

    try {
      const token = await getValidToken(dispatch);

      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = ""
      } = options;

      const response = await axios.get(
        `${API_URL}/roles/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_ROLES_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize
        }
      });

    } catch (error) {
      dispatch({
        type: FETCH_ROLES_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };



export const createRoles = (rolesData) => async (dispatch) => {debugger
    dispatch({ type: CREATE_ROLES_REQUEST });
    try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.post(`${API_URL}/roles/create`, rolesData, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const roles = response.data.data || response.data;
        dispatch({ type: CREATE_ROLES_SUCCESS, payload: roles });

        return roles;

    } catch (error) {
        const errPayload = error.response?.data || error.message;
        dispatch({ type: CREATE_ROLES_FAILURE, payload: errPayload });
        throw error;
    }
};

export const editRoles = (id, rolesData) => async (dispatch) => {
    dispatch({ type: EDIT_ROLES_REQUEST });
    try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.put(`${API_URL}/roles/update/${id}`, rolesData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const updatedRoles = response.data;
        dispatch({ type: EDIT_ROLES_SUCCESS, payload: updatedRoles });
        return updatedRoles;
    } catch (error) {
        dispatch({ type: EDIT_ROLES_FAILURE, payload: error.response?.data || error.message });
        throw error;
    }
};


export const deleteRoles = (id) => async (dispatch) => {
    dispatch({ type: DELETE_ROLES_REQUEST });
    try {
        const token = localStorage.getItem("accessToken");
        const { data } = await axios.delete(`${API_URL}/roles/delete/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        dispatch({ type: DELETE_ROLES_SUCCESS, payload: data });
    } catch (error) {
        dispatch({
            type: DELETE_ROLES_FAILURE,
            payload: error.response?.data || error.message,
        });
        throw error;
    }
};

