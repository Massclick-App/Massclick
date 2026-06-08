import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_GMAPS_LEADS_REQUEST,
  FETCH_GMAPS_LEADS_SUCCESS,
  FETCH_GMAPS_LEADS_FAILURE,
  UPDATE_GMAPS_LEAD_STATUS_REQUEST,
  UPDATE_GMAPS_LEAD_STATUS_SUCCESS,
  UPDATE_GMAPS_LEAD_STATUS_FAILURE,
  FETCH_GMAPS_LEADS_STATS_SUCCESS,
  FETCH_GMAPS_LEADS_DISTINCTS_SUCCESS,
  SET_GMAPS_LEAD_IMPORT,
  CLEAR_GMAPS_LEAD_IMPORT,
} from './userActionTypes';
import { getClientToken } from './clientAuthAction.js';

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem('accessToken');
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error('No valid token found');
  return token;
};

export const getAllGmapsLeads =
  ({ pageNo = 1, pageSize = 20, filters = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_GMAPS_LEADS_REQUEST });
    try {
      const token = await getValidToken(dispatch);

      const {
        massclick_location = '',
        search_sector = '',
        massclick_category = '',
        status = 'all',
        min_rating = '',
        has_phone = '',
        search = '',
        business_status = 'OPERATIONAL',
      } = filters;

      const params = new URLSearchParams({
        pageNo,
        pageSize,
        massclick_location,
        search_sector,
        massclick_category,
        status,
        min_rating,
        has_phone: has_phone ? 'true' : '',
        search,
        business_status,
      }).toString();

      const response = await axiosInstance.get(
        `${API_URL}/gmaps-leads/viewall?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_GMAPS_LEADS_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_GMAPS_LEADS_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };

export const getGmapsLeadsStats = () => async (dispatch) => {
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.get(`${API_URL}/gmaps-leads/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: FETCH_GMAPS_LEADS_STATS_SUCCESS, payload: response.data });
  } catch (error) {
    console.error('getGmapsLeadsStats error:', error);
  }
};

export const getGmapsLeadsDistincts = () => async (dispatch) => {
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.get(`${API_URL}/gmaps-leads/distincts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: FETCH_GMAPS_LEADS_DISTINCTS_SUCCESS, payload: response.data });
  } catch (error) {
    console.error('getGmapsLeadsDistincts error:', error);
  }
};

export const updateGmapsLeadStatus = (id, data) => async (dispatch) => {
  dispatch({ type: UPDATE_GMAPS_LEAD_STATUS_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.patch(
      `${API_URL}/gmaps-leads/status/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({
      type: UPDATE_GMAPS_LEAD_STATUS_SUCCESS,
      payload: response.data,
    });
    return response.data;
  } catch (error) {
    dispatch({
      type: UPDATE_GMAPS_LEAD_STATUS_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

// Synchronous — store a lead to be imported into Business form
export const setGmapsLeadToImport = (lead) => ({
  type: SET_GMAPS_LEAD_IMPORT,
  payload: lead,
});

// Synchronous — clear after Business is saved
export const clearGmapsLeadImport = () => ({
  type: CLEAR_GMAPS_LEAD_IMPORT,
});
