import axiosInstance from "../../services/axiosInstance.js";
import {
  CLEAR_APPLICATION_SUCCESS, DELETE_JOB_SUCCESS, FETCH_APPLICATIONS_SUCCESS,
  FETCH_HIRING_FILTERS_SUCCESS, FETCH_JOBS_SUCCESS, FETCH_JOB_SUCCESS,
  HIRING_FAILURE, HIRING_REQUEST, SAVE_JOB_SUCCESS, SUBMIT_APPLICATION_SUCCESS,
  UPDATE_APPLICATION_SUCCESS,
} from "./hiringActionTypes.js";

const API_URL = process.env.REACT_APP_API_URL;
const message = (error) => error.response?.data?.message || error.message || "Something went wrong";
const run = async (dispatch, operation) => {
  dispatch({ type: HIRING_REQUEST });
  try { return await operation(); } catch (error) {
    dispatch({ type: HIRING_FAILURE, payload: message(error) });
    throw error;
  }
};

export const fetchPublicJobs = (filters = {}) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.get(`${API_URL}/hiring/jobs`, { params: filters });
  dispatch({ type: FETCH_JOBS_SUCCESS, payload: response.data.data || [] });
  return response.data.data;
});

export const fetchHiringFilters = () => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.get(`${API_URL}/hiring/filters`);
  dispatch({ type: FETCH_HIRING_FILTERS_SUCCESS, payload: response.data.data || {} });
  return response.data.data;
});

export const fetchPublicJob = (idOrSlug) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.get(`${API_URL}/hiring/jobs/${idOrSlug}`);
  dispatch({ type: FETCH_JOB_SUCCESS, payload: response.data.data });
  return response.data.data;
});

export const submitJobApplication = (jobId, payload) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.post(`${API_URL}/hiring/jobs/${jobId}/applications`, payload);
  dispatch({ type: SUBMIT_APPLICATION_SUCCESS, payload: response.data.data });
  return response.data;
});

export const clearApplicationSuccess = () => ({ type: CLEAR_APPLICATION_SUCCESS });

export const fetchAdminJobs = (filters = {}) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.get(`${API_URL}/admin/hiring/jobs`, { params: filters });
  dispatch({ type: FETCH_JOBS_SUCCESS, payload: response.data.data || [] });
  return response.data.data;
});

export const saveAdminJob = (payload, id) => (dispatch) => run(dispatch, async () => {
  const response = id
    ? await axiosInstance.put(`${API_URL}/admin/hiring/jobs/${id}`, payload)
    : await axiosInstance.post(`${API_URL}/admin/hiring/jobs`, payload);
  dispatch({ type: SAVE_JOB_SUCCESS, payload: response.data.data });
  return response.data.data;
});

export const deleteAdminJob = (id) => (dispatch) => run(dispatch, async () => {
  await axiosInstance.delete(`${API_URL}/admin/hiring/jobs/${id}`);
  dispatch({ type: DELETE_JOB_SUCCESS, payload: id });
});

export const fetchApplications = (filters = {}) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.get(`${API_URL}/admin/hiring/applications`, { params: filters });
  dispatch({ type: FETCH_APPLICATIONS_SUCCESS, payload: response.data.data || [] });
  return response.data.data;
});

export const updateApplicationStatus = (id, payload) => (dispatch) => run(dispatch, async () => {
  const response = await axiosInstance.put(`${API_URL}/admin/hiring/applications/${id}`, payload);
  dispatch({ type: UPDATE_APPLICATION_SUCCESS, payload: response.data.data });
  return response.data.data;
});
