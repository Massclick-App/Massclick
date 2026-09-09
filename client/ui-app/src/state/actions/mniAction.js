import axiosInstance from 'shared/services/axiosInstance.js';
import {
  FETCH_MNI_REQUEST, FETCH_MNI_SUCCESS, FETCH_MNI_FAILURE,
  CREATE_MNI_REQUEST, CREATE_MNI_SUCCESS, CREATE_MNI_FAILURE,
  EDIT_MNI_REQUEST, EDIT_MNI_SUCCESS, EDIT_MNI_FAILURE,
  DELETE_MNI_REQUEST, DELETE_MNI_SUCCESS, DELETE_MNI_FAILURE,
  SEARCH_MNI_BUSINESS_REQUEST, SEARCH_MNI_BUSINESS_SUCCESS, SEARCH_MNI_BUSINESS_FAILURE,
  SEARCH_MNI_CATEGORY_REQUEST, SEARCH_MNI_CATEGORY_SUCCESS, SEARCH_MNI_CATEGORY_FAILURE,
  SEND_MNI_LEADS_REQUEST, SEND_MNI_LEADS_SUCCESS, SEND_MNI_LEADS_FAILURE,
  FETCH_MNI_LEADS_REQUEST, FETCH_MNI_LEADS_SUCCESS, FETCH_MNI_LEADS_FAILURE,
  FETCH_BUSINESS_PROFILE_BY_PHONE_REQUEST, FETCH_BUSINESS_PROFILE_BY_PHONE_SUCCESS, FETCH_BUSINESS_PROFILE_BY_PHONE_FAILURE,
  FETCH_LEAD_REPORT_REQUEST, FETCH_LEAD_REPORT_SUCCESS, FETCH_LEAD_REPORT_FAILURE
} from "state/actions/userActionTypes.js";

import { getClientToken } from "state/actions/clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getMniLeads = (params = {}) => async (dispatch) => {

  dispatch({ type: FETCH_MNI_LEADS_REQUEST });

  try {
    const { location = "", group = "" } = params;

    const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/get-mni-leads?location=${location}&group=${group}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    dispatch({
      type: FETCH_MNI_LEADS_SUCCESS,
      payload: response.data?.data || response.data
    });

  } catch (error) {
    dispatch({
      type: FETCH_MNI_LEADS_FAILURE,
      payload: error.response?.data || error.message
    });
  }
};

export const getAllMNI =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
    async (dispatch) => {

      dispatch({ type: FETCH_MNI_REQUEST });

      try {
        const token = await getValidToken(dispatch);

        const {
          search = "",
          status = "all",
          sortBy = "",
          sortOrder = ""
        } = options;

        const response = await axiosInstance.get(
          `${API_URL}/mrpdata/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        dispatch({
          type: FETCH_MNI_SUCCESS,
          payload: {
            data: response.data.data,
            total: response.data.total,
            pageNo,
            pageSize
          }
        });

      } catch (error) {
        dispatch({
          type: FETCH_MNI_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };

export const createMNI = (mniData) => async (dispatch) => {
  dispatch({ type: CREATE_MNI_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.post(
      `${API_URL}/mrpdata/create`,
      mniData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: CREATE_MNI_SUCCESS,
      payload: response.data.data
    });

    return response.data.data;

  } catch (error) {
    dispatch({
      type: CREATE_MNI_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const editMNI = (id, mniData) => async (dispatch) => {
  dispatch({ type: EDIT_MNI_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(
      `${API_URL}/mrpdata/update/${id}`,
      mniData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: EDIT_MNI_SUCCESS,
      payload: response.data.data
    });

    return response.data.data;

  } catch (error) {
    dispatch({
      type: EDIT_MNI_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const deleteMNI = (id) => async (dispatch) => {
  dispatch({ type: DELETE_MNI_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const { data } = await axiosInstance.delete(
      `${API_URL}/mrpdata/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: DELETE_MNI_SUCCESS,
      payload: data
    });

  } catch (error) {
    dispatch({
      type: DELETE_MNI_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const searchMniBusiness = (searchText) => async (dispatch) => {
  dispatch({ type: SEARCH_MNI_BUSINESS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/search/business?q=${searchText}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: SEARCH_MNI_BUSINESS_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: SEARCH_MNI_BUSINESS_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const searchMniCategory = (searchText) => async (dispatch) => {
  dispatch({ type: SEARCH_MNI_CATEGORY_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/search/category?q=${searchText}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: SEARCH_MNI_CATEGORY_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: SEARCH_MNI_CATEGORY_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const sendMniLeads = (mniId) => async (dispatch) => {

  dispatch({ type: SEND_MNI_LEADS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/mrpdata/send-leads/${mniId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    dispatch({
      type: SEND_MNI_LEADS_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {

    dispatch({
      type: SEND_MNI_LEADS_FAILURE,
      payload: error.response?.data || error.message
    });

    throw error;
  }
};

export const getBusinessProfileByPhone = (phoneNumber) => async (dispatch) => {

  dispatch({ type: FETCH_BUSINESS_PROFILE_BY_PHONE_REQUEST });

  try {
    // ✅ USE COMMON TOKEN FUNCTION
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/mrpdata/get-business-profile`,
      { phoneNumber },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    dispatch({
      type: FETCH_BUSINESS_PROFILE_BY_PHONE_SUCCESS,
      payload: response.data?.data || response.data
    });

    return response.data?.data || response.data;

  } catch (error) {

    dispatch({
      type: FETCH_BUSINESS_PROFILE_BY_PHONE_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch business profile"
    });

    throw error;
  }
};

export const getLeadReport = ({ location, group = "A", category = "" } = {}) => async (dispatch) => {

  dispatch({ type: FETCH_LEAD_REPORT_REQUEST });

  try {
    let reportLocation = location;

    // ✅ fallback location logic
    if (!reportLocation) {
      const storedUser = localStorage.getItem("authUser");
      // selectedLocation is the specific searched place (may be empty when a
      // whole district was searched); fall back to the district scope.
      const selectedLocation = localStorage.getItem("selectedLocation") || localStorage.getItem("selectedDistrict");

      const businessLocation = storedUser
        ? JSON.parse(storedUser)?.businessLocation
        : null;

      reportLocation = (businessLocation || selectedLocation || "trichy")
        .toString()
        .trim();
    }

    if (!reportLocation) {
      throw new Error("Location is required for lead report");
    }

    // ✅ USE COMMON TOKEN FUNCTION
    const token = await getValidToken(dispatch);

    const params = new URLSearchParams({
      location: reportLocation,
      group
    });

    if (category) {
      params.append("category", category);
    }

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/lead-report?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    dispatch({
      type: FETCH_LEAD_REPORT_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {

    dispatch({
      type: FETCH_LEAD_REPORT_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch lead report"
    });

    throw error;
  }
};

