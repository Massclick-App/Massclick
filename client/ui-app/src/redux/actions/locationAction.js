import axios from "axios";
import {
  FETCH_LOCATION_REQUEST, FETCH_LOCATION_SUCCESS, FETCH_LOCATION_FAILURE,
  CREATE_LOCATION_REQUEST, CREATE_LOCATION_SUCCESS, CREATE_LOCATION_FAILURE,
  EDIT_LOCATION_REQUEST, EDIT_LOCATION_SUCCESS, EDIT_LOCATION_FAILURE,
  DELETE_LOCATION_REQUEST, DELETE_LOCATION_SUCCESS, DELETE_LOCATION_FAILURE,
  FETCH_IP_LOCATION_REQUEST, FETCH_IP_LOCATION_SUCCESS, FETCH_IP_LOCATION_FAILURE,
  DETECT_DISTRICT_REQUEST, DETECT_DISTRICT_SUCCESS, DETECT_DISTRICT_FAILURE
} from "../actions/userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};


export const getAllLocation =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
    async (dispatch) => {
      dispatch({ type: FETCH_LOCATION_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        const {
          search = "",
          status = "all",
          sortBy = "",
          sortOrder = ""
        } = options;

        const response = await axios.get(
          `${API_URL}/location/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        dispatch({
          type: FETCH_LOCATION_SUCCESS,
          payload: {
            data: response.data.data,
            total: response.data.total,
            pageNo,
            pageSize
          }
        });
      } catch (error) {
        dispatch({
          type: FETCH_LOCATION_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };



export const createLocation = (userData) => async (dispatch) => {
  dispatch({ type: CREATE_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/location/create`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = response.data.data || response.data;

    dispatch({ type: CREATE_LOCATION_SUCCESS, payload: user });

    return user;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_LOCATION_FAILURE, payload: errPayload });
    throw error;
  }
};

export const editLocation = (id, locationData) => async (dispatch) => {
  dispatch({ type: EDIT_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/location/update/${id}`, locationData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedLocation = response.data;
    dispatch({ type: EDIT_LOCATION_SUCCESS, payload: updatedLocation });
    return updatedLocation;
  } catch (error) {
    dispatch({ type: EDIT_LOCATION_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};


export const deleteLocation = (id) => async (dispatch) => {
  dispatch({ type: DELETE_LOCATION_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const { data } = await axios.delete(`${API_URL}/location/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_LOCATION_SUCCESS, payload: data.location });
  } catch (error) {
    dispatch({
      type: DELETE_LOCATION_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
export const getIpLocation = () => async (dispatch) => {
  dispatch({ type: FETCH_IP_LOCATION_REQUEST });

  try {
    const token = localStorage.getItem("clientAccessToken");
    if (!token) throw new Error("No valid access token found");

    const response = await axios.get(`${API_URL}/location/getip`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const locationData = response.data.data;
    dispatch({ type: FETCH_IP_LOCATION_SUCCESS, payload: locationData });
    return locationData;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: FETCH_IP_LOCATION_FAILURE, payload: errPayload });
    throw error;
  }
};

export const detectDistrict =
  ({ latitude, longitude }) =>
  async (dispatch) => {
    dispatch({ type: DETECT_DISTRICT_REQUEST });

    try {
      const response = await axios.post(
        `${API_URL}/location/detect-district`,
        { latitude, longitude }
      );

      dispatch({
        type: DETECT_DISTRICT_SUCCESS,
        payload: response.data,
      });

      return response.data;
    } catch (error) {
      dispatch({
        type: DETECT_DISTRICT_FAILURE,
        payload: error.response?.data || error.message,
      });
      throw error;
    }
  };

