import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_MRP_REQUEST, FETCH_MRP_SUCCESS, FETCH_MRP_FAILURE,
  CREATE_MRP_REQUEST, CREATE_MRP_SUCCESS, CREATE_MRP_FAILURE,
  EDIT_MRP_REQUEST, EDIT_MRP_SUCCESS, EDIT_MRP_FAILURE,
  DELETE_MRP_REQUEST, DELETE_MRP_SUCCESS, DELETE_MRP_FAILURE,
  SEARCH_MRP_BUSINESS_REQUEST, SEARCH_MRP_BUSINESS_SUCCESS, SEARCH_MRP_BUSINESS_FAILURE,
  SEARCH_MRP_CATEGORY_REQUEST, SEARCH_MRP_CATEGORY_SUCCESS, SEARCH_MRP_CATEGORY_FAILURE,
  SEND_MRP_LEADS_REQUEST, SEND_MRP_LEADS_SUCCESS, SEND_MRP_LEADS_FAILURE,
  FETCH_MNI_LEADS_REQUEST, FETCH_MNI_LEADS_SUCCESS, FETCH_MNI_LEADS_FAILURE,
  FETCH_BUSINESS_PROFILE_BY_PHONE_REQUEST, FETCH_BUSINESS_PROFILE_BY_PHONE_SUCCESS, FETCH_BUSINESS_PROFILE_BY_PHONE_FAILURE,
  FETCH_LEAD_REPORT_REQUEST, FETCH_LEAD_REPORT_SUCCESS, FETCH_LEAD_REPORT_FAILURE
} from "./userActionTypes.js";

import { getClientToken } from "./clientAuthAction";

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

export const getAllMRP =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
    async (dispatch) => {

      dispatch({ type: FETCH_MRP_REQUEST });

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
          type: FETCH_MRP_SUCCESS,
          payload: {
            data: response.data.data,
            total: response.data.total,
            pageNo,
            pageSize
          }
        });

      } catch (error) {
        dispatch({
          type: FETCH_MRP_FAILURE,
          payload: error.response?.data || error.message
        });
      }
    };

export const createMRP = (mrpData) => async (dispatch) => {
  dispatch({ type: CREATE_MRP_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.post(
      `${API_URL}/mrpdata/create`,
      mrpData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: CREATE_MRP_SUCCESS,
      payload: response.data.data
    });

    return response.data.data;

  } catch (error) {
    dispatch({
      type: CREATE_MRP_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const editMRP = (id, mrpData) => async (dispatch) => {
  dispatch({ type: EDIT_MRP_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(
      `${API_URL}/mrpdata/update/${id}`,
      mrpData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: EDIT_MRP_SUCCESS,
      payload: response.data.data
    });

    return response.data.data;

  } catch (error) {
    dispatch({
      type: EDIT_MRP_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const deleteMRP = (id) => async (dispatch) => {
  dispatch({ type: DELETE_MRP_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const { data } = await axiosInstance.delete(
      `${API_URL}/mrpdata/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: DELETE_MRP_SUCCESS,
      payload: data
    });

  } catch (error) {
    dispatch({
      type: DELETE_MRP_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const searchMrpBusiness = (searchText) => async (dispatch) => {
  dispatch({ type: SEARCH_MRP_BUSINESS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/search/business?q=${searchText}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: SEARCH_MRP_BUSINESS_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: SEARCH_MRP_BUSINESS_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const searchMrpCategory = (searchText) => async (dispatch) => {
  dispatch({ type: SEARCH_MRP_CATEGORY_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/mrpdata/search/category?q=${searchText}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: SEARCH_MRP_CATEGORY_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: SEARCH_MRP_CATEGORY_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};

export const sendMrpLeads = (mrpId) => async (dispatch) => {

  dispatch({ type: SEND_MRP_LEADS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/mrpdata/send-leads/${mrpId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    dispatch({
      type: SEND_MRP_LEADS_SUCCESS,
      payload: response.data
    });

    return response.data;

  } catch (error) {

    dispatch({
      type: SEND_MRP_LEADS_FAILURE,
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
      const selectedLocation = localStorage.getItem("selectedLocation");

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

