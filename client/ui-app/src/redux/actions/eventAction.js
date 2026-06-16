import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_EVENT_CATEGORY_REQUEST,
  FETCH_EVENT_CATEGORY_SUCCESS,
  FETCH_EVENT_CATEGORY_FAILURE,
  CREATE_EVENT_CATEGORY_REQUEST,
  CREATE_EVENT_CATEGORY_SUCCESS,
  CREATE_EVENT_CATEGORY_FAILURE,
  EDIT_EVENT_CATEGORY_REQUEST,
  EDIT_EVENT_CATEGORY_SUCCESS,
  EDIT_EVENT_CATEGORY_FAILURE,
  DELETE_EVENT_CATEGORY_REQUEST,
  DELETE_EVENT_CATEGORY_SUCCESS,
  DELETE_EVENT_CATEGORY_FAILURE,
  FETCH_EVENT_LOCATION_REQUEST,
  FETCH_EVENT_LOCATION_SUCCESS,
  FETCH_EVENT_LOCATION_FAILURE,
  CREATE_EVENT_LOCATION_REQUEST,
  CREATE_EVENT_LOCATION_SUCCESS,
  CREATE_EVENT_LOCATION_FAILURE,
  EDIT_EVENT_LOCATION_REQUEST,
  EDIT_EVENT_LOCATION_SUCCESS,
  EDIT_EVENT_LOCATION_FAILURE,
  DELETE_EVENT_LOCATION_REQUEST,
  DELETE_EVENT_LOCATION_SUCCESS,
  DELETE_EVENT_LOCATION_FAILURE,
  FETCH_EVENT_ADVERTISEMENT_REQUEST,
  FETCH_EVENT_ADVERTISEMENT_SUCCESS,
  FETCH_EVENT_ADVERTISEMENT_FAILURE,
  CREATE_EVENT_ADVERTISEMENT_REQUEST,
  CREATE_EVENT_ADVERTISEMENT_SUCCESS,
  CREATE_EVENT_ADVERTISEMENT_FAILURE,
  EDIT_EVENT_ADVERTISEMENT_REQUEST,
  EDIT_EVENT_ADVERTISEMENT_SUCCESS,
  EDIT_EVENT_ADVERTISEMENT_FAILURE,
  DELETE_EVENT_ADVERTISEMENT_REQUEST,
  DELETE_EVENT_ADVERTISEMENT_SUCCESS,
  DELETE_EVENT_ADVERTISEMENT_FAILURE,
  FETCH_EVENT_CREATION_REQUEST,
  FETCH_EVENT_CREATION_SUCCESS,
  FETCH_EVENT_CREATION_FAILURE,
  VIEW_EVENT_CREATION_REQUEST,
  VIEW_EVENT_CREATION_SUCCESS,
  VIEW_EVENT_CREATION_FAILURE,
  CREATE_EVENT_CREATION_REQUEST,
  CREATE_EVENT_CREATION_SUCCESS,
  CREATE_EVENT_CREATION_FAILURE,
  EDIT_EVENT_CREATION_REQUEST,
  EDIT_EVENT_CREATION_SUCCESS,
  EDIT_EVENT_CREATION_FAILURE,
  DELETE_EVENT_CREATION_REQUEST,
  DELETE_EVENT_CREATION_SUCCESS,
  DELETE_EVENT_CREATION_FAILURE,
  PUBLISH_EVENT_CREATION_REQUEST,
  PUBLISH_EVENT_CREATION_SUCCESS,
  PUBLISH_EVENT_CREATION_FAILURE,
  FETCH_HOME_POPUP_EVENT_AD_REQUEST,
  FETCH_HOME_POPUP_EVENT_AD_SUCCESS,
  FETCH_HOME_POPUP_EVENT_AD_FAILURE,
} from "./eventActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

// ============= EVENT CATEGORY ACTIONS =============

export const getAllEventCategory =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_EVENT_CATEGORY_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = "",
      } = options;

      const response = await axiosInstance.get(
        `${API_URL}/event-category/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      dispatch({
        type: FETCH_EVENT_CATEGORY_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({ type: FETCH_EVENT_CATEGORY_FAILURE, payload: error.message });
    }
  };

export const createEventCategory = (categoryData) => async (dispatch) => {
  dispatch({ type: CREATE_EVENT_CATEGORY_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/event-category/create`,
      categoryData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: CREATE_EVENT_CATEGORY_SUCCESS,
      payload: response.data.data || response.data.category,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: CREATE_EVENT_CATEGORY_FAILURE, payload: error.message });
    throw error;
  }
};

export const updateEventCategory =
  (categoryId, categoryData) => async (dispatch) => {
    dispatch({ type: EDIT_EVENT_CATEGORY_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const response = await axiosInstance.put(
        `${API_URL}/event-category/update/${categoryId}`,
        categoryData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      dispatch({
        type: EDIT_EVENT_CATEGORY_SUCCESS,
        payload: response.data.data || response.data.category,
      });
      return response.data;
    } catch (error) {
      dispatch({ type: EDIT_EVENT_CATEGORY_FAILURE, payload: error.message });
      throw error;
    }
  };

export const deleteEventCategory = (categoryId) => async (dispatch) => {
  dispatch({ type: DELETE_EVENT_CATEGORY_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.delete(
      `${API_URL}/event-category/delete/${categoryId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({ type: DELETE_EVENT_CATEGORY_SUCCESS, payload: categoryId });
    return response.data;
  } catch (error) {
    dispatch({ type: DELETE_EVENT_CATEGORY_FAILURE, payload: error.message });
    throw error;
  }
};

// ============= EVENT LOCATION ACTIONS =============

export const getAllEventLocation =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_EVENT_LOCATION_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = "",
      } = options;

      const response = await axiosInstance.get(
        `${API_URL}/event-location/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      dispatch({
        type: FETCH_EVENT_LOCATION_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({ type: FETCH_EVENT_LOCATION_FAILURE, payload: error.message });
    }
  };

export const createEventLocation = (locationData) => async (dispatch) => {
  dispatch({ type: CREATE_EVENT_LOCATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/event-location/create`,
      locationData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: CREATE_EVENT_LOCATION_SUCCESS,
      payload: response.data.data || response.data.location,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: CREATE_EVENT_LOCATION_FAILURE, payload: error.message });
    throw error;
  }
};

export const updateEventLocation =
  (locationId, locationData) => async (dispatch) => {
    dispatch({ type: EDIT_EVENT_LOCATION_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const response = await axiosInstance.put(
        `${API_URL}/event-location/update/${locationId}`,
        locationData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      dispatch({
        type: EDIT_EVENT_LOCATION_SUCCESS,
        payload: response.data.data || response.data.location,
      });
      return response.data;
    } catch (error) {
      dispatch({ type: EDIT_EVENT_LOCATION_FAILURE, payload: error.message });
      throw error;
    }
  };

export const deleteEventLocation = (locationId) => async (dispatch) => {
  dispatch({ type: DELETE_EVENT_LOCATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.delete(
      `${API_URL}/event-location/delete/${locationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({ type: DELETE_EVENT_LOCATION_SUCCESS, payload: locationId });
    return response.data;
  } catch (error) {
    dispatch({ type: DELETE_EVENT_LOCATION_FAILURE, payload: error.message });
    throw error;
  }
};

// ============= EVENT ADVERTISEMENT ACTIONS =============

export const getAllEventAdvertisement =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_EVENT_ADVERTISEMENT_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = "",
      } = options;

      const response = await axiosInstance.get(
        `${API_URL}/event-advertisement/viewall?pageNo=${pageNo}&pageSize=${pageSize}&search=${search}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      dispatch({
        type: FETCH_EVENT_ADVERTISEMENT_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_EVENT_ADVERTISEMENT_FAILURE,
        payload: error.message,
      });
    }
  };

export const createEventAdvertisement =
  (advertisementData) => async (dispatch) => {
    dispatch({ type: CREATE_EVENT_ADVERTISEMENT_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const response = await axiosInstance.post(
        `${API_URL}/event-advertisement/create`,
        advertisementData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      dispatch({
        type: CREATE_EVENT_ADVERTISEMENT_SUCCESS,
        payload: response.data.data,
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: CREATE_EVENT_ADVERTISEMENT_FAILURE,
        payload: error.message,
      });
      throw error;
    }
  };

export const updateEventAdvertisement =
  (advertisementId, advertisementData) => async (dispatch) => {
    dispatch({ type: EDIT_EVENT_ADVERTISEMENT_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const response = await axiosInstance.put(
        `${API_URL}/event-advertisement/update/${advertisementId}`,
        advertisementData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      dispatch({
        type: EDIT_EVENT_ADVERTISEMENT_SUCCESS,
        payload: response.data.data,
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: EDIT_EVENT_ADVERTISEMENT_FAILURE,
        payload: error.message,
      });
      throw error;
    }
  };

export const deleteEventAdvertisement =
  (advertisementId) => async (dispatch) => {
    dispatch({ type: DELETE_EVENT_ADVERTISEMENT_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const response = await axiosInstance.delete(
        `${API_URL}/event-advertisement/delete/${advertisementId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      dispatch({
        type: DELETE_EVENT_ADVERTISEMENT_SUCCESS,
        payload: advertisementId,
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: DELETE_EVENT_ADVERTISEMENT_FAILURE,
        payload: error.message,
      });
      throw error;
    }
  };

export const getHomePopupEventAd = () => async (dispatch) => {
  dispatch({ type: FETCH_HOME_POPUP_EVENT_AD_REQUEST });
  try {
    const token = await dispatch(getClientToken());
    const response = await axiosInstance.get(
      `${API_URL}/event-advertisement/popup`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    dispatch({
      type: FETCH_HOME_POPUP_EVENT_AD_SUCCESS,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: FETCH_HOME_POPUP_EVENT_AD_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Failed to load popup advertisement",
    });
  }
};

// ============= EVENT CREATION ACTIONS =============

export const getAllEventCreation =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_EVENT_CREATION_REQUEST });
    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        sortBy = "",
        sortOrder = "",
        isActive,
      } = options;

      const params = new URLSearchParams({
        pageNo,
        pageSize,
        search,
        status,
        sortBy,
        sortOrder,
      });

      if (isActive !== undefined) {
        params.append("isActive", isActive);
      }

      const response = await axiosInstance.get(
        `${API_URL}/event-creation/viewall?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      dispatch({
        type: FETCH_EVENT_CREATION_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({ type: FETCH_EVENT_CREATION_FAILURE, payload: error.message });
    }
  };

export const viewEventCreation = (eventId) => async (dispatch) => {
  dispatch({ type: VIEW_EVENT_CREATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.get(
      `${API_URL}/event-creation/view/${eventId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: VIEW_EVENT_CREATION_SUCCESS,
      payload: response.data.data,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: VIEW_EVENT_CREATION_FAILURE, payload: error.message });
    throw error;
  }
};

export const createEventCreation = (eventData) => async (dispatch) => {
  dispatch({ type: CREATE_EVENT_CREATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/event-creation/create`,
      eventData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: CREATE_EVENT_CREATION_SUCCESS,
      payload: response.data.data,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: CREATE_EVENT_CREATION_FAILURE, payload: error.message });
    throw error;
  }
};

export const updateEventCreation = (eventId, eventData) => async (dispatch) => {
  dispatch({ type: EDIT_EVENT_CREATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.put(
      `${API_URL}/event-creation/update/${eventId}`,
      eventData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: EDIT_EVENT_CREATION_SUCCESS,
      payload: response.data.data,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: EDIT_EVENT_CREATION_FAILURE, payload: error.message });
    throw error;
  }
};

export const deleteEventCreation = (eventId) => async (dispatch) => {
  dispatch({ type: DELETE_EVENT_CREATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.delete(
      `${API_URL}/event-creation/delete/${eventId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({ type: DELETE_EVENT_CREATION_SUCCESS, payload: eventId });
    return response.data;
  } catch (error) {
    dispatch({ type: DELETE_EVENT_CREATION_FAILURE, payload: error.message });
    throw error;
  }
};

export const publishEventCreation = (eventId) => async (dispatch) => {
  dispatch({ type: PUBLISH_EVENT_CREATION_REQUEST });
  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.put(
      `${API_URL}/event-creation/publish/${eventId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    dispatch({
      type: PUBLISH_EVENT_CREATION_SUCCESS,
      payload: response.data.data,
    });
    return response.data;
  } catch (error) {
    dispatch({ type: PUBLISH_EVENT_CREATION_FAILURE, payload: error.message });
    throw error;
  }
};
