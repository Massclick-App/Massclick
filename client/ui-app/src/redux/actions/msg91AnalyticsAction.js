import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_MSG91_AUDIT_FAILURE,
  FETCH_MSG91_AUDIT_REQUEST,
  FETCH_MSG91_AUDIT_SUCCESS,
  FETCH_MSG91_DASHBOARD_FAILURE,
  FETCH_MSG91_DASHBOARD_REQUEST,
  FETCH_MSG91_DASHBOARD_SUCCESS,
  FETCH_MSG91_RECIPIENTS_FAILURE,
  FETCH_MSG91_RECIPIENTS_REQUEST,
  FETCH_MSG91_RECIPIENTS_SUCCESS,
  UPDATE_MSG91_RECIPIENT_SUCCESS,
} from "./msg91AnalyticsActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const buildMsg91AnalyticsParams = (values = {}) => {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return params.toString();
};

export const fetchMsg91Dashboard = (filters = {}) => async (dispatch) => {
  dispatch({ type: FETCH_MSG91_DASHBOARD_REQUEST });

  try {
    const query = buildMsg91AnalyticsParams(filters);
    const suffix = query ? `?${query}` : "";
    const [summary, timeseries, failures] = await Promise.all([
      axiosInstance.get(`${API_URL}/admin/msg91-analytics/summary${suffix}`, {
        headers: authHeaders(),
      }),
      axiosInstance.get(`${API_URL}/admin/msg91-analytics/timeseries${suffix}`, {
        headers: authHeaders(),
      }),
      axiosInstance.get(`${API_URL}/admin/msg91-analytics/failures${suffix}`, {
        headers: authHeaders(),
      }),
    ]);

    dispatch({
      type: FETCH_MSG91_DASHBOARD_SUCCESS,
      payload: {
        summary: summary.data.data,
        timeseries: timeseries.data.data,
        failures: failures.data.data,
      },
    });
  } catch (error) {
    dispatch({
      type: FETCH_MSG91_DASHBOARD_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const fetchMsg91Audit =
  ({ pageNo = 1, pageSize = 25, filters = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_MSG91_AUDIT_REQUEST });

    try {
      const query = buildMsg91AnalyticsParams({ ...filters, pageNo, pageSize });
      const response = await axiosInstance.get(
        `${API_URL}/admin/msg91-analytics/audit?${query}`,
        { headers: authHeaders() }
      );

      dispatch({
        type: FETCH_MSG91_AUDIT_SUCCESS,
        payload: {
          data: response.data.data || [],
          total: response.data.total || 0,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_MSG91_AUDIT_FAILURE,
        payload: error.response?.data?.message || error.message,
      });
    }
  };

export const fetchMsg91Recipients =
  ({ pageNo = 1, pageSize = 25, filters = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_MSG91_RECIPIENTS_REQUEST });

    try {
      const query = buildMsg91AnalyticsParams({ ...filters, pageNo, pageSize });
      const response = await axiosInstance.get(
        `${API_URL}/admin/msg91-analytics/recipients?${query}`,
        { headers: authHeaders() }
      );

      dispatch({
        type: FETCH_MSG91_RECIPIENTS_SUCCESS,
        payload: {
          data: response.data.data || [],
          total: response.data.total || 0,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_MSG91_RECIPIENTS_FAILURE,
        payload: error.response?.data?.message || error.message,
      });
    }
  };

export const reviewMsg91Recipient = (mobile) => async (dispatch) => {
  const response = await axiosInstance.put(
    `${API_URL}/admin/msg91-analytics/recipients/${mobile}/review`,
    {},
    { headers: authHeaders() }
  );

  dispatch({ type: UPDATE_MSG91_RECIPIENT_SUCCESS, payload: response.data.data });
  return response.data.data;
};

export const unsuppressMsg91Recipient = (mobile) => async (dispatch) => {
  const response = await axiosInstance.put(
    `${API_URL}/admin/msg91-analytics/recipients/${mobile}/unsuppress`,
    {},
    { headers: authHeaders() }
  );

  dispatch({ type: UPDATE_MSG91_RECIPIENT_SUCCESS, payload: response.data.data });
  return response.data.data;
};

export const exportMsg91AnalyticsCsv = async (filters = {}) => {
  const query = buildMsg91AnalyticsParams(filters);
  const response = await axiosInstance.get(
    `${API_URL}/admin/msg91-analytics/export-csv${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(),
      responseType: "blob",
    }
  );

  return response;
};

export const fetchMsg91FilterOptions = async (filters = {}) => {
  const query = buildMsg91AnalyticsParams(filters);
  const response = await axiosInstance.get(
    `${API_URL}/admin/msg91-analytics/filter-options${query ? `?${query}` : ""}`,
    { headers: authHeaders() }
  );

  return response.data.data || {};
};

export const searchMsg91Businesses = async ({ search = "", limit = 25 } = {}) => {
  const query = buildMsg91AnalyticsParams({ search, limit });
  const response = await axiosInstance.get(
    `${API_URL}/admin/msg91-analytics/businesses${query ? `?${query}` : ""}`,
    { headers: authHeaders() }
  );

  return response.data.data || [];
};
