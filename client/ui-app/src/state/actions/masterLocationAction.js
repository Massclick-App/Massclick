import axiosInstance from 'shared/services/axiosInstance.js';
import {
  FETCH_MASTER_LOCATION_REQUEST, FETCH_MASTER_LOCATION_SUCCESS, FETCH_MASTER_LOCATION_FAILURE,
  CREATE_MASTER_LOCATION_REQUEST, CREATE_MASTER_LOCATION_SUCCESS, CREATE_MASTER_LOCATION_FAILURE,
  EDIT_MASTER_LOCATION_REQUEST, EDIT_MASTER_LOCATION_SUCCESS, EDIT_MASTER_LOCATION_FAILURE,
  DELETE_MASTER_LOCATION_REQUEST, DELETE_MASTER_LOCATION_SUCCESS, DELETE_MASTER_LOCATION_FAILURE,
  SEARCH_MASTER_LOCATION_REQUEST, SEARCH_MASTER_LOCATION_SUCCESS, SEARCH_MASTER_LOCATION_FAILURE
} from "state/actions/userActionTypes.js";
import { getClientToken } from "state/actions/clientAuthAction.js";

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
          reviewStatus = "all",
          importSource = "all",
          origin = "all",
          level = "all",
          district = "",
          zone = "",
          ward = "",
          locality = "",
          pincode = "",
          pincodeStatus = "all",
          sortBy = "",
          sortOrder = ""
        } = options;

        const params = new URLSearchParams({
          pageNo: String(pageNo),
          pageSize: String(pageSize),
          search,
          status,
          reviewStatus,
          importSource,
          origin,
          level,
          district,
          zone,
          ward,
          locality,
          pincode,
          pincodeStatus,
          sortBy,
          sortOrder
        });

        const response = await axiosInstance.get(
          `${API_URL}/masterlocation/viewall?${params.toString()}`,
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

// Public: resolve free text ("srirangam", "kk nagar") to real masterlocations
// docs (with hierarchyPath/level/slug) — no auth token needed.
export const searchMasterLocations = (text, limit = 12) => async (dispatch) => {
  const query = String(text || "").trim();
  dispatch({ type: SEARCH_MASTER_LOCATION_REQUEST, meta: { query } });

  if (query.length < 2) {
    dispatch({ type: SEARCH_MASTER_LOCATION_SUCCESS, payload: { data: [], query } });
    return [];
  }

  try {
    const response = await axiosInstance.get(
      `${API_URL}/masterlocation/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    const data = response.data?.data || [];
    dispatch({ type: SEARCH_MASTER_LOCATION_SUCCESS, payload: { data, query } });
    return data;
  } catch (error) {
    dispatch({
      type: SEARCH_MASTER_LOCATION_FAILURE,
      payload: error.response?.data || error.message
    });
    return [];
  }
};

// Admin form helper: existing Zone/Ward/Locality values for the district
// (and zone/ward) picked so far, for the create/edit form's cascading
// autocomplete. Not stored in redux — the form owns this as local state.
export const getMasterLocationFieldOptions = ({
  field,
  district = "",
  zone = "",
  ward = "",
  status = "active",
  reviewStatus = "all",
  importSource = "all",
  origin = "all"
}) => async (dispatch) => {
  try {
    const token = await getValidToken(dispatch);
    const params = new URLSearchParams({
      field,
      district,
      zone,
      ward,
      status,
      reviewStatus,
      importSource,
      origin
    });
    const response = await axiosInstance.get(
      `${API_URL}/masterlocation/distinct-values?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data?.data || [];
  } catch (error) {
    return [];
  }
};

// Enable/disable a location without deleting it. isActive is what the public
// side filters on, so this is what puts a location into or out of search.
// Deliberately not routed through editMasterLocation: that recomputes slug,
// hierarchyPath and keywords from the hierarchy fields, which is unnecessary
// work and unnecessary risk when only a flag is changing.
export const toggleMasterLocation = (id, isActive) => async (dispatch) => {
  dispatch({ type: EDIT_MASTER_LOCATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const { data } = await axiosInstance.patch(
      `${API_URL}/masterlocation/toggle/${id}`,
      { isActive },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: EDIT_MASTER_LOCATION_SUCCESS, payload: data.location });
    return data;
  } catch (error) {
    dispatch({
      type: EDIT_MASTER_LOCATION_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

// Enable/disable many at once, for working through the imported backlog.
export const bulkToggleMasterLocation = (ids, isActive) => async (dispatch) => {
  dispatch({ type: EDIT_MASTER_LOCATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const { data } = await axiosInstance.patch(
      `${API_URL}/masterlocation/bulk-toggle`,
      { ids, isActive },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch({ type: EDIT_MASTER_LOCATION_SUCCESS, payload: null });
    return data;
  } catch (error) {
    dispatch({
      type: EDIT_MASTER_LOCATION_FAILURE,
      payload: error.response?.data || error.message,
    });
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
