import axios from "axios";
import {
  FETCH_BUSINESS_REQUEST, FETCH_BUSINESS_SUCCESS, FETCH_BUSINESS_FAILURE,
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
} from "../actions/userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";
const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

// export const getAllBusinessList = () => async (dispatch) => {
//   dispatch({ type: FETCH_BUSINESS_REQUEST });

//   try {
//     const token = await getValidToken(dispatch);

//     if (!token) {
//       throw new Error("No valid access token found");
//     }

//     const response = await axios.get(`${API_URL}/businesslist/viewall`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     const businessList =
//       Array.isArray(response.data)
//         ? response.data
//         : response.data?.data || response.data?.clients || [];

//     dispatch({ type: FETCH_BUSINESS_SUCCESS, payload: businessList });
//   } catch (error) {
//     console.error("getAllBusinessList error:", error);
//     dispatch({
//       type: FETCH_BUSINESS_FAILURE,
//       payload: error.response?.data || error.message,
//     });
//   }
// };
export const getBusinessDetailsById = (id) => async (dispatch) => {
  dispatch({ type: FETCH_VIEWBUSINESSDETAILS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axios.get(
      `${API_URL}/businesslist/view/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    dispatch({
      type: FETCH_VIEWBUSINESSDETAILS_SUCCESS,
      payload: response.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_VIEWBUSINESSDETAILS_FAILURE,
      payload: error.response?.data?.message || error.message,
    });

    return null;
  }
};


export const getAllBusinessList = ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
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
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const response = await axios.get(`${API_URL}/businesslist/viewall?${params.toString()}`, {
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
    console.error("getAllBusinessList error:", error);
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

    const response = await axios.get(`${API_URL}/businesslist/clientview`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const businessList =
      Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.clients || [];

    dispatch({ type: FETCH_VIEWBUSINESS_SUCCESS, payload: businessList });
  } catch (error) {
    console.error("getAllBusinessList error:", error);
    dispatch({
      type: FETCH_VIEWBUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const getBusinessByCategory = (category) => async (dispatch) => {
  dispatch({ type: CATEGORY_BUSINESS_REQUEST });

  try {
    const token = localStorage.getItem("clientAccessToken");
    if (!token) throw new Error("Client token not available");

    const response = await axios.get(
      `${API_URL}/businesslist/category?category=${category}`,
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
    const response = await axios.post(`${API_URL}/businesslist/create`, businessListData, {
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
    const response = await axios.put(
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

    const response = await axios.put(`${API_URL}/businesslist/update/${id}`, businessData, {
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

export const deleteBusinessList = (id) => async (dispatch) => {
  dispatch({ type: DELETE_BUSINESS_REQUEST });
  try {
    const token = await getValidToken(dispatch);


    if (!token) {
      throw new Error("No valid access token found");
    } await axios.delete(`${API_URL}/businesslist/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: DELETE_BUSINESS_SUCCESS, payload: id });
  } catch (error) {
    dispatch({ type: DELETE_BUSINESS_FAILURE, payload: error.response?.data || error.message });
    throw error;
  }
};

// export const getTrendingSearches = (location) => async (dispatch) => {
//   dispatch({ type: FETCH_TRENDING_REQUEST });
//   try {
//    const token = await dispatch(getClientToken());

//     if (!token) {
//       throw new Error("No valid access token found");
//     }
//     const url = location
//       ? `${API_URL}/businesslist/trending-searches?location=${location}`
//       : `${API_URL}/businesslist/trending-searches`;

//     const response = await axios.get(url, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     dispatch({ type: FETCH_TRENDING_SUCCESS, payload: response.data });
//   } catch (error) {
//     console.error("Error fetching trending searches:", error);
//     dispatch({
//       type: FETCH_TRENDING_FAILURE,
//       payload: error.response?.data || error.message,
//     });
//   }
// };


export const logSearchActivity = (categoryName, location, userDetails, searchedUserText = "") =>
  async (dispatch) => {
    try {
      const token = await dispatch(getClientToken());

      await axios.post(
        `${API_URL}/businesslist/log-search`,
        { categoryName, location, searchedUserText, userDetails },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    } catch (error) {
      console.warn("Failed to log search activity:", error.message);
    }
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

    const response = await axios.get(
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
      localStorage.clear();
    }

    dispatch({
      type: FETCH_SEARCH_LOGS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};


export const getBackendSuggestions = (search) => async (dispatch) => {
  dispatch({ type: SUGGESTION_BUSINESS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axios.get(
      `${API_URL}/businesslist/suggestions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { search },
      }
    );

    dispatch({
      type: SUGGESTION_BUSINESS_SUCCESS,
      payload: response.data || [],
    });

  } catch (error) {
    dispatch({
      type: SUGGESTION_BUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const backendMainSearch = (term, location, category) => async (dispatch) => {
  dispatch({ type: SEARCH_BUSINESS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axios.get(
      `${API_URL}/businesslist/search`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { term, location, category },
      }
    );

    dispatch({
      type: SEARCH_BUSINESS_SUCCESS,
      payload: response.data || [],
    });

    return { payload: response.data };

  } catch (error) {
    dispatch({
      type: SEARCH_BUSINESS_FAILURE,
      payload: error.response?.data || error.message,
    });
    return { payload: [] };
  }
};

export const viewSearchLogs = (category, keywords) => async (dispatch) => {
  dispatch({ type: FETCH_LOGS_REQUEST });

  try {
    const token = await dispatch(getClientToken());

    const response = await axios.post(
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

    const response = await axios.get(
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

    const response = await axios.get(
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

    const response = await axios.get(
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

    const response = await axios.get(
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

    const response = await axios.put(
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

    const response = await axios.post(
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
      const response = await axios.get(
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
