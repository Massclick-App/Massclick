import axiosInstance from '../../services/axiosInstance.js';
import {
  FETCH_BUSINESS_REQUEST, FETCH_BUSINESS_SUCCESS, FETCH_BUSINESS_FAILURE,
  EXPORT_BUSINESS_REQUEST, EXPORT_BUSINESS_SUCCESS, EXPORT_BUSINESS_FAILURE,
  CREATE_BUSINESS_REQUEST, CREATE_BUSINESS_SUCCESS, CREATE_BUSINESS_FAILURE,
  EDIT_BUSINESS_REQUEST, EDIT_BUSINESS_SUCCESS, EDIT_BUSINESS_FAILURE,
  DELETE_BUSINESS_REQUEST, DELETE_BUSINESS_SUCCESS, DELETE_BUSINESS_FAILURE,
  ACTIVE_BUSINESS_REQUEST, ACTIVE_BUSINESS_SUCCESS, ACTIVE_BUSINESS_FAILURE,
  FETCH_TRENDING_REQUEST, FETCH_TRENDING_SUCCESS, FETCH_TRENDING_FAILURE,
  FETCH_SEARCH_LOGS_REQUEST, FETCH_SEARCH_LOGS_SUCCESS, FETCH_SEARCH_LOGS_FAILURE,
  FETCH_VIEWBUSINESS_REQUEST, FETCH_VIEWBUSINESS_SUCCESS, FETCH_VIEWBUSINESS_FAILURE,
  SUGGESTION_BUSINESS_REQUEST, SUGGESTION_BUSINESS_SUCCESS, SUGGESTION_BUSINESS_FAILURE,
  SEARCH_BUSINESS_REQUEST, SEARCH_BUSINESS_SUCCESS, SEARCH_BUSINESS_FAILURE,
  CATEGORY_BUSINESS_REQUEST, CATEGORY_BUSINESS_SUCCESS, CATEGORY_BUSINESS_FAILURE,
  FETCH_LOGS_REQUEST, FETCH_LOGS_SUCCESS, FETCH_LOGS_FAILURE, SET_LEADS_HISTORY_USERS,
  FIND_BUSINESS_BY_MOBILE_REQUEST, FIND_BUSINESS_BY_MOBILE_SUCCESS, FIND_BUSINESS_BY_MOBILE_FAILURE,
  FETCH_VIEWBUSINESSDETAILS_REQUEST, FETCH_VIEWBUSINESSDETAILS_SUCCESS, FETCH_VIEWBUSINESSDETAILS_FAILURE,
  FETCH_DASHBOARDCARD_REQUEST, FETCH_DASHBOARDCARD_SUCCESS, FETCH_DASHBOARDCARD_FAILURE,
  FETCH_DASHBOARDCHART_REQUEST, FETCH_DASHBOARDCHART_SUCCESS, FETCH_DASHBOARDCHART_FAILURE,
  FETCH_PENDINGBUSINESS_REQUEST, FETCH_PENDINGBUSINESS_SUCCESS, FETCH_PENDINGBUSINESS_FAILURE,
  UPDATE_SEARCH_LOG_REQUEST, UPDATE_SEARCH_LOG_SUCCESS, UPDATE_SEARCH_LOG_FAILURE,
  FETCH_BUSINESS_BY_SLUG_REQUEST, FETCH_BUSINESS_BY_SLUG_SUCCESS, FETCH_BUSINESS_BY_SLUG_FAILURE,
  QR_DOWNLOAD_REQUEST, QR_DOWNLOAD_SUCCESS, QR_DOWNLOAD_FAILURE,
  SEND_ENQUIRY_LEAD_REQUEST, SEND_ENQUIRY_LEAD_SUCCESS, SEND_ENQUIRY_LEAD_FAILURE,
} from "../actions/userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";
import { clearPublicClientSession } from "../../auth/authStore.js";
const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getDownloadFilename = (contentDisposition, fallback) => {
  const match = String(contentDisposition || "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : fallback;
};

const getBlobErrorMessage = async (error) => {
  const data = error.response?.data;
  if (!(data instanceof Blob)) {
    return error.response?.data?.message || error.message;
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed?.message || error.message;
  } catch {
    return error.message;
  }
};

export const exportBusinessList = ({
  search = "",
  searchTerm = "",
  category = "",
  location = "",
  paymentStatus = "all",
  status = "all",
  liveStatus = "",
  createdFrom = "",
  createdTo = "",
  sortBy = "createdAt",
  sortOrder = "desc",
} = {}) => async (dispatch) => {
  dispatch({ type: EXPORT_BUSINESS_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (searchTerm) params.append("searchTerm", searchTerm);
    if (category) params.append("category", category);
    if (location) params.append("location", location);
    if (paymentStatus && paymentStatus !== "all") params.append("paymentStatus", paymentStatus);
    if (status && status !== "all") params.append("status", status);
    if (liveStatus) params.append("liveStatus", liveStatus);
    if (createdFrom) params.append("createdFrom", createdFrom);
    if (createdTo) params.append("createdTo", createdTo);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const stamp = new Date().toISOString().slice(0, 10);
    const response = await axiosInstance.get(`${API_URL}/businesslist/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
      timeout: 120000,
    });
    const filename = getDownloadFilename(
      response.headers?.["content-disposition"],
      `massclick-business-directory-${stamp}.xlsx`
    );
    downloadBlob(response.data, filename);

    const exportedCount = Number(response.headers?.["x-export-row-count"] || 0);
    const payload = { exportedCount, filename };

    dispatch({ type: EXPORT_BUSINESS_SUCCESS, payload });
    return payload;
  } catch (error) {
    const message = await getBlobErrorMessage(error);
    dispatch({ type: EXPORT_BUSINESS_FAILURE, payload: message });
    throw new Error(message);
  }
};

export const trackQrDownload = (businessId) => async (dispatch) => {
  dispatch({ type: QR_DOWNLOAD_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/businesslist/qr-download/${businessId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: QR_DOWNLOAD_SUCCESS,
      payload: businessId,
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: QR_DOWNLOAD_FAILURE,
      payload: error.response?.data?.message || error.message,
    });

    throw error;
  }
};


export const getBusinessDetailsById = (id) => async (dispatch) => {

  dispatch({ type: FETCH_VIEWBUSINESSDETAILS_REQUEST });

  try {

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/view/${id}`
    );

    dispatch({
      type: FETCH_VIEWBUSINESSDETAILS_SUCCESS,
      payload: response.data,
    });

    return response.data;

  } catch (error) {

    dispatch({
      type: FETCH_VIEWBUSINESSDETAILS_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message,
    });

    return null;

  }

};


export const getAllBusinessList = ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
  liveStatus = "",
  category = "",
  location = "",
  paymentStatus = "",
  createdFrom = "",
  createdTo = "",
  sortBy = null,
  sortOrder = "asc",
} = {}) => async (dispatch) => {
  dispatch({ type: FETCH_BUSINESS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const params = new URLSearchParams();
    params.append("pageNo", pageNo);
    params.append("pageSize", pageSize);
    if (search) params.append("search", search);
    if (status && status !== "all") params.append("status", status);
    if (liveStatus) params.append("liveStatus", liveStatus);
    if (category) params.append("category", category);
    if (location) params.append("location", location);
    if (paymentStatus) params.append("paymentStatus", paymentStatus);
    if (createdFrom) params.append("createdFrom", createdFrom);
    if (createdTo) params.append("createdTo", createdTo);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const response = await axiosInstance.get(`${API_URL}/businesslist/viewall?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    dispatch({
      type: FETCH_BUSINESS_SUCCESS,
      payload: {
        data: response.data.data,
        total: response.data.total,
        pageNo: response.data.pageNo,
        pageSize: response.data.pageSize,
      },
    });
  } catch (error) {
    dispatch({
      type: FETCH_BUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const getAllClientBusinessList = () => async (dispatch) => {
  dispatch({ type: FETCH_VIEWBUSINESS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(`${API_URL}/businesslist/clientview`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const businessList =
      Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.clients || [];

    dispatch({ type: FETCH_VIEWBUSINESS_SUCCESS, payload: businessList });
  } catch (error) {
    dispatch({
      type: FETCH_VIEWBUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const getBusinessByCategory = (category, district) => async (dispatch) => {
  dispatch({ type: CATEGORY_BUSINESS_REQUEST });

  try {
    const token = localStorage.getItem("clientAccessToken");
    if (!token) throw new Error("Client token not available");

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/category?category=${category}&district=${district}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: CATEGORY_BUSINESS_SUCCESS,
      payload: {
        category,
        data: response.data,
      },
    });

  } catch (error) {
    dispatch({
      type: CATEGORY_BUSINESS_FAILURE,
      payload: {
        category,
        error: error.response?.data?.message || error.message,
      },
    });
  }
};

export const createBusinessList = (businessListData) => async (dispatch) => {
  dispatch({ type: CREATE_BUSINESS_REQUEST });
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axiosInstance.post(`${API_URL}/businesslist/create`, businessListData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const businessList = response.data.data || response.data;

    dispatch({ type: CREATE_BUSINESS_SUCCESS, payload: businessList });

    return businessList;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: CREATE_BUSINESS_FAILURE, payload: errPayload });
    throw error;
  }
};

export const toggleBusinessStatus = ({ id, newStatus }) => async (dispatch) => {
  dispatch({ type: ACTIVE_BUSINESS_REQUEST });

  try {
    const token = localStorage.getItem("accessToken");


    if (!token) {
      throw new Error("No valid access token found");
    }
    const response = await axiosInstance.put(
      `${API_URL}/businesslist/activate/${id}`,
      { activeBusinesses: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updatedBusiness = response.data.business;

    dispatch({ type: ACTIVE_BUSINESS_SUCCESS, payload: updatedBusiness });

    return updatedBusiness;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: ACTIVE_BUSINESS_FAILURE, payload: errPayload });
    throw error;
  }
};

export const editBusinessList = (id, businessData) => async (dispatch) => {
  dispatch({ type: EDIT_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(`${API_URL}/businesslist/update/${id}`, businessData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedBusinessList = response.data;
    dispatch({ type: EDIT_BUSINESS_SUCCESS, payload: updatedBusinessList });
    return updatedBusinessList;
  } catch (error) {
    dispatch({ type: EDIT_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const editBusinessSection = (id, section, sectionData) => async (dispatch) => {
  dispatch({ type: EDIT_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(
      `${API_URL}/businesslist/${id}/${section}`,
      sectionData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const updatedBusiness = response.data;
    dispatch({ type: EDIT_BUSINESS_SUCCESS, payload: updatedBusiness });
    return updatedBusiness;
  } catch (error) {
    dispatch({ type: EDIT_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const updateBusinessBadges = (id, badgesData) => async (dispatch) => {
  dispatch({ type: EDIT_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(`${API_URL}/businesslist/badges/${id}`, badgesData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedBusinessList = response.data;
    dispatch({ type: EDIT_BUSINESS_SUCCESS, payload: updatedBusinessList });
    return updatedBusinessList;
  } catch (error) {
    dispatch({ type: EDIT_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const regenerateBusinessCertificates = (id) => async (dispatch) => {
  dispatch({ type: EDIT_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.post(
      `${API_URL}/businesslist/certificates/${id}/regenerate`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const updatedBusinessList = {
      ...(response.data.business || response.data),
      certificateRegenerationTrace: response.data.trace || null,
    };
    dispatch({ type: EDIT_BUSINESS_SUCCESS, payload: updatedBusinessList });
    return updatedBusinessList;
  } catch (error) {
    dispatch({ type: EDIT_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const revertPaidStatus = (id) => async (dispatch) => {
  dispatch({ type: EDIT_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(`${API_URL}/businesslist/revert-paid/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedBusinessList = response.data.business;
    dispatch({ type: EDIT_BUSINESS_SUCCESS, payload: updatedBusinessList });
    return updatedBusinessList;
  } catch (error) {
    dispatch({ type: EDIT_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const deleteBusinessList = (id) => async (dispatch) => {
  dispatch({ type: DELETE_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);

    if (!token) {
      throw new Error("No valid access token found");
    } await axiosInstance.delete(`${API_URL}/businesslist/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_BUSINESS_SUCCESS, payload: id });
  } catch (error) {
    dispatch({ type: DELETE_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

export const logSearchActivity = (
  categoryName,
  location,
  userDetails,
  searchedUserText = "",
  isKnownCategory = false,
  matchedBusinessIds = []
) =>
  async (dispatch) => {
    try {
      const token = await dispatch(getClientToken());

      await axiosInstance.post(
        `${API_URL}/businesslist/log-search`,
        {
          categoryName: isKnownCategory ? categoryName : "",
          location,
          searchedUserText,
          userDetails,
          isKnownCategory,
          matchedBusinessIds,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    } catch (error) {
      }
  };

export const sendEnquiryLead = (payload) => async (dispatch) => {
  dispatch({ type: SEND_ENQUIRY_LEAD_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.post(
      `${API_URL}/businesslist/send-enquiry`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: SEND_ENQUIRY_LEAD_SUCCESS, payload: response.data });

    return response.data;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: SEND_ENQUIRY_LEAD_FAILURE, payload: errPayload });
    throw error;
  }
};

export const sendBusinessInfo = (payload) => async (dispatch) => {
  const token = await dispatch(getClientToken());
  const response = await axiosInstance.post(
    `${API_URL}/businesslist/send-info`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const getAllSearchLogs = () => async (dispatch) => {
  dispatch({ type: FETCH_SEARCH_LOGS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    if (!token) {
      return dispatch({
        type: FETCH_SEARCH_LOGS_FAILURE,
        payload: "No access token",
      });
    }

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/trending-searches/viewall`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    dispatch({
      type: FETCH_SEARCH_LOGS_SUCCESS,
      payload: Array.isArray(response.data) ? response.data : [],
    });
  } catch (error) {
    if (error.response?.status === 401) {
      clearPublicClientSession();
    }

    dispatch({
      type: FETCH_SEARCH_LOGS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const getBackendSuggestions = (searchOrOptions, extraOptions = {}) => async (dispatch) => {
  const options = typeof searchOrOptions === "string"
    ? { search: searchOrOptions, ...extraOptions }
    : (searchOrOptions || {});
  const search = String(options.search || "").trim();
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(25, Math.max(1, Number(options.limit) || 10));
  const append = Boolean(options.append);

  dispatch({
    type: SUGGESTION_BUSINESS_REQUEST,
    meta: { append, query: search, page, limit }
  });

  if (search.length < 2) {
    const emptyPayload = {
      items: [],
      page: 1,
      limit,
      total: 0,
      hasMore: false,
      query: search
    };
    dispatch({
      type: SUGGESTION_BUSINESS_SUCCESS,
      payload: emptyPayload,
      meta: { append: false, query: search, page: 1, limit }
    });
    return emptyPayload;
  }

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/suggestions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, page, limit },
      }
    );

    const raw = response.data;
    const normalized = Array.isArray(raw)
      ? {
          items: raw,
          page,
          limit,
          total: raw.length,
          hasMore: raw.length >= limit,
          query: search
        }
      : {
          items: Array.isArray(raw?.items) ? raw.items : [],
          page: Number(raw?.page) || page,
          limit: Number(raw?.limit) || limit,
          total: Number(raw?.total) || 0,
          hasMore: Boolean(raw?.hasMore),
          query: String(raw?.query || search)
        };

    dispatch({
      type: SUGGESTION_BUSINESS_SUCCESS,
      payload: normalized,
      meta: { append, query: search, page, limit }
    });

    return normalized;
  } catch (error) {
    dispatch({
      type: SUGGESTION_BUSINESS_FAILURE,
      payload: error.response?.data || error.message,
      meta: { append, query: search, page, limit }
    });
  }
};

export const backendMainSearch = (term, location, category, extraParams = {}) => async (dispatch) => {
  dispatch({ type: SEARCH_BUSINESS_REQUEST });
  const requestParams = { term, location, category, ...extraParams };
  console.log("[API] GET /businesslist/search → called with", requestParams);

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/search`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: requestParams,
      }
    );

    // Handle both legacy (raw array) and new paginated ({ results, total, ... }) shapes.
    // Old Redis cache entries (30-min TTL) may still return a raw array after deploy.
    const raw = response.data;
    const isLegacy = Array.isArray(raw);
    console.log("[API] GET /businesslist/search → raw response", isLegacy ? { legacyArrayLength: raw.length } : raw);
    const normalized = isLegacy
      ? { results: raw, total: raw.length, page: 1, pageSize: raw.length, hasMore: false, resolvedCategory: null }
      : { results: raw.results || [], total: raw.total || 0, page: raw.page || 1, pageSize: raw.pageSize || 20, hasMore: raw.hasMore || false, resolvedCategory: raw.resolvedCategory || null };
    console.log(
      `[API] GET /businesslist/search → processed: ${normalized.results.length}/${normalized.total} result(s), resolvedCategory=${normalized.resolvedCategory ? `"${normalized.resolvedCategory}"` : "not resolved"}`
    );

    dispatch({ type: SEARCH_BUSINESS_SUCCESS, payload: normalized.results });

    return { payload: normalized };

  } catch (error) {
    console.log("[API] GET /businesslist/search → failed", error?.message);
    dispatch({
      type: SEARCH_BUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
    return { payload: { results: [], total: 0, page: 1, pageSize: 20, hasMore: false, resolvedCategory: null } };
  }
};

export const fetchNearbyBusinesses = ({ lat, lng, category, limit = 6 }) => async (dispatch) => {
  console.log("[API] GET /businesslist/nearby → called with", { lat, lng, category, limit });
  try {
    const token = await dispatch(getClientToken());
    const response = await axiosInstance.get(`${API_URL}/businesslist/nearby`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { lat, lng, category, limit },
    });
    const data = Array.isArray(response.data) ? response.data : [];
    console.log(`[API] GET /businesslist/nearby → processed: ${data.length} result(s) for category="${category}"`);
    return { data };
  } catch (error) {
    console.log("[API] GET /businesslist/nearby → failed", error?.message);
    return { data: [] };
  }
};

// Centralized search function - intelligently routes to category or term search
// If isKnownCategory: sends as category parameter (exact match)
// If !isKnownCategory: sends as term parameter (flexible search)
export const performSearch = (searchInput, location, isKnownCategory = false, extraParams = {}) => async (dispatch) => {
  if (isKnownCategory) {
    return dispatch(backendMainSearch("", location, searchInput, extraParams));
  } else {
    return dispatch(backendMainSearch(searchInput, location, "", extraParams));
  }
};

export const viewSearchLogs = (category, keywords) => async (dispatch) => {
  dispatch({ type: FETCH_LOGS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.post(
      `${API_URL}/businesslist/trending-searches/view`,
      { category, keywords },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: FETCH_LOGS_SUCCESS,
      payload: Array.isArray(response.data) ? response.data : [],
    });

  } catch (error) {
    dispatch({
      type: FETCH_LOGS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const setLeadsHistoryUsers = (users) => ({
  type: SET_LEADS_HISTORY_USERS,
  payload: users,
});

export const findBusinessByMobile = (mobile) => async (dispatch) => {
  dispatch({ type: FIND_BUSINESS_BY_MOBILE_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/findByMobile/${mobile}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: FIND_BUSINESS_BY_MOBILE_SUCCESS,
      payload: response.data.business || null,
    });

    return response.data.business;

  } catch (error) {
    dispatch({
      type: FIND_BUSINESS_BY_MOBILE_FAILURE,
      payload: error.response?.data?.message || error.message,
    });

    return null;
  }
};

export const getDashboardSummary = () => async (dispatch) => {
  dispatch({ type: FETCH_DASHBOARDCARD_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/dashboard-summary`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    dispatch({
      type: FETCH_DASHBOARDCARD_SUCCESS,
      payload: response.data,
    });

  } catch (error) {
    dispatch({
      type: FETCH_DASHBOARDCARD_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const getDashboardCharts = () => async (dispatch) => {
  dispatch({ type: FETCH_DASHBOARDCHART_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/dashboard-charts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: FETCH_DASHBOARDCHART_SUCCESS,
      payload: response.data,
    });

  } catch (error) {
    dispatch({
      type: FETCH_DASHBOARDCHART_FAILURE,
      payload: error.message,
    });
  }
};

export const getPendingBusinessList = () => async (dispatch) => {
  dispatch({ type: FETCH_PENDINGBUSINESS_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/pendingbusiness`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: FETCH_PENDINGBUSINESS_SUCCESS,
      payload: response.data.data,
    });

  } catch (error) {
    dispatch({
      type: FETCH_PENDINGBUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const updateSearchLogRead = (searchLogId) => async (dispatch) => {
  dispatch({ type: UPDATE_SEARCH_LOG_REQUEST });

  try {
    const token = await getValidToken(dispatch);

    const response = await axiosInstance.put(
      `${API_URL}/businesslist/log-search/${searchLogId}`,
      { isRead: true },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: UPDATE_SEARCH_LOG_SUCCESS,
      payload: response.data.data,
    });

    return response.data.data;

  } catch (error) {
    dispatch({
      type: UPDATE_SEARCH_LOG_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const getTrendingCategories = () => async (dispatch) => {
  dispatch({ type: FETCH_TRENDING_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axiosInstance.post(
      `${API_URL}/businesslist/trending-searches/trending-category`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: FETCH_TRENDING_SUCCESS,
      payload: response.data.data || [],
    });

  } catch (error) {
    dispatch({
      type: FETCH_TRENDING_FAILURE,
      payload: error.response?.data?.message || error.message,
    });
  }
};

export const getBusinessDetailsBySlug =
  ({ location, slug }) =>
  async (dispatch) => {
    dispatch({ type: FETCH_BUSINESS_BY_SLUG_REQUEST });

    try {
      const response = await axiosInstance.get(
        `${API_URL}/business/by-slug`,
        {
          params: { location, slug },
        }
      );

      dispatch({
        type: FETCH_BUSINESS_BY_SLUG_SUCCESS,
        payload: response.data,
      });

      return response.data;

    } catch (error) {
      dispatch({
        type: FETCH_BUSINESS_BY_SLUG_FAILURE,
        payload: error.response?.data?.message || error.message,
      });

      return null;
    }
  };
