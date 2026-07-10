import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_MASTER_LOCATION_REQUEST, FETCH_MASTER_LOCATION_SUCCESS, FETCH_MASTER_LOCATION_FAILURE,
  CREATE_MASTER_LOCATION_REQUEST, CREATE_MASTER_LOCATION_SUCCESS, CREATE_MASTER_LOCATION_FAILURE,
  EDIT_MASTER_LOCATION_REQUEST, EDIT_MASTER_LOCATION_SUCCESS, EDIT_MASTER_LOCATION_FAILURE,
  DELETE_MASTER_LOCATION_REQUEST, DELETE_MASTER_LOCATION_SUCCESS, DELETE_MASTER_LOCATION_FAILURE
} from "./userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllMasterLocation =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
    async (dispatch) => {
      dispatch({ type: FETCH_MASTER_LOCATION_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        const {
          search = "",
          status = "all",
          level = "all",
          sortBy = "",
          sortOrder = ""
        } = options;

        const response = await axiosInstance.get(
          `${API_URL}/masterlocation/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&level=${level}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        dispatch({
          type: FETCH_MASTER_LOCATION_SUCCESS,
          payload: {
            data: response.data.data,
            total: response.data.total,
            pageNo,
            pageSize
          }
        });
      } catch (error) {
        dispatch({
          type: FETCH_MASTER_LOCATION_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };

export const createMasterLocation = (locationData) => async (dispatch) => {
  dispatch({ type: CREATE_MASTER_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axiosInstance.post(`${API_URL}/masterlocation/create`, locationData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const location = response.data.data || response.data;
    dispatch({ type: CREATE_MASTER_LOCATION_SUCCESS, payload: location });
    return location;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_MASTER_LOCATION_FAILURE, payload: errPayload });
    throw error;
  }
};

export const editMasterLocation = (id, locationData) => async (dispatch) => {
  dispatch({ type: EDIT_MASTER_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axiosInstance.put(`${API_URL}/masterlocation/update/${id}`, locationData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedLocation = response.data;
    dispatch({ type: EDIT_MASTER_LOCATION_SUCCESS, payload: updatedLocation });
    return updatedLocation;
  } catch (error) {
    dispatch({ type: EDIT_MASTER_LOCATION_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const deleteMasterLocation = (id) => async (dispatch) => {
  dispatch({ type: DELETE_MASTER_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const { data } = await axiosInstance.delete(`${API_URL}/masterlocation/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_MASTER_LOCATION_SUCCESS, payload: data.location });
  } catch (error) {
    dispatch({
      type: DELETE_MASTER_LOCATION_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
