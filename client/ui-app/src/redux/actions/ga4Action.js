import axiosInstance from "../../services/axiosInstance.js";
import {
  FETCH_GA4_OVERVIEW_REQUEST, FETCH_GA4_OVERVIEW_SUCCESS, FETCH_GA4_OVERVIEW_FAILURE,
  FETCH_GA4_TRENDS_REQUEST, FETCH_GA4_TRENDS_SUCCESS, FETCH_GA4_TRENDS_FAILURE,
  FETCH_GA4_TRAFFIC_SOURCES_REQUEST, FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, FETCH_GA4_TRAFFIC_SOURCES_FAILURE,
  FETCH_GA4_LOCATIONS_REQUEST, FETCH_GA4_LOCATIONS_SUCCESS, FETCH_GA4_LOCATIONS_FAILURE,
  FETCH_GA4_DEVICES_REQUEST, FETCH_GA4_DEVICES_SUCCESS, FETCH_GA4_DEVICES_FAILURE,
  FETCH_GA4_CONVERSIONS_REQUEST, FETCH_GA4_CONVERSIONS_SUCCESS, FETCH_GA4_CONVERSIONS_FAILURE,
  FETCH_GA4_CITIES_REQUEST, FETCH_GA4_CITIES_SUCCESS, FETCH_GA4_CITIES_FAILURE,
  FETCH_GA4_BROWSERS_REQUEST, FETCH_GA4_BROWSERS_SUCCESS, FETCH_GA4_BROWSERS_FAILURE,
  FETCH_GA4_PAGES_REQUEST, FETCH_GA4_PAGES_SUCCESS, FETCH_GA4_PAGES_FAILURE,
  FETCH_GA4_LANDING_PAGES_REQUEST, FETCH_GA4_LANDING_PAGES_SUCCESS, FETCH_GA4_LANDING_PAGES_FAILURE,
  FETCH_GA4_ACQUISITION_REQUEST, FETCH_GA4_ACQUISITION_SUCCESS, FETCH_GA4_ACQUISITION_FAILURE,
  FETCH_GA4_ENGAGEMENT_OVERVIEW_REQUEST, FETCH_GA4_ENGAGEMENT_OVERVIEW_SUCCESS, FETCH_GA4_ENGAGEMENT_OVERVIEW_FAILURE,
  FETCH_GA4_ECOMMERCE_OVERVIEW_REQUEST, FETCH_GA4_ECOMMERCE_OVERVIEW_SUCCESS, FETCH_GA4_ECOMMERCE_OVERVIEW_FAILURE,
  FETCH_GA4_TOP_ITEMS_REQUEST, FETCH_GA4_TOP_ITEMS_SUCCESS, FETCH_GA4_TOP_ITEMS_FAILURE,
  FETCH_GA4_REFERRERS_REQUEST, FETCH_GA4_REFERRERS_SUCCESS, FETCH_GA4_REFERRERS_FAILURE,
  FETCH_GA4_CAMPAIGNS_REQUEST, FETCH_GA4_CAMPAIGNS_SUCCESS, FETCH_GA4_CAMPAIGNS_FAILURE,
  FETCH_GA4_OPERATING_SYSTEMS_REQUEST, FETCH_GA4_OPERATING_SYSTEMS_SUCCESS, FETCH_GA4_OPERATING_SYSTEMS_FAILURE,
  FETCH_GA4_PLATFORMS_REQUEST, FETCH_GA4_PLATFORMS_SUCCESS, FETCH_GA4_PLATFORMS_FAILURE,
  FETCH_GA4_DEVICE_MODELS_REQUEST, FETCH_GA4_DEVICE_MODELS_SUCCESS, FETCH_GA4_DEVICE_MODELS_FAILURE,
  FETCH_GA4_SCREEN_RESOLUTIONS_REQUEST, FETCH_GA4_SCREEN_RESOLUTIONS_SUCCESS, FETCH_GA4_SCREEN_RESOLUTIONS_FAILURE,
  FETCH_GA4_REGIONS_REQUEST, FETCH_GA4_REGIONS_SUCCESS, FETCH_GA4_REGIONS_FAILURE,
  FETCH_GA4_CONTINENTS_REQUEST, FETCH_GA4_CONTINENTS_SUCCESS, FETCH_GA4_CONTINENTS_FAILURE,
  FETCH_GA4_SUB_CONTINENTS_REQUEST, FETCH_GA4_SUB_CONTINENTS_SUCCESS, FETCH_GA4_SUB_CONTINENTS_FAILURE,
  FETCH_GA4_NEW_VS_RETURNING_REQUEST, FETCH_GA4_NEW_VS_RETURNING_SUCCESS, FETCH_GA4_NEW_VS_RETURNING_FAILURE,
  FETCH_GA4_DAY_OF_WEEK_REQUEST, FETCH_GA4_DAY_OF_WEEK_SUCCESS, FETCH_GA4_DAY_OF_WEEK_FAILURE,
  FETCH_GA4_HOUR_OF_DAY_REQUEST, FETCH_GA4_HOUR_OF_DAY_SUCCESS, FETCH_GA4_HOUR_OF_DAY_FAILURE,
  FETCH_GA4_SCREENS_REQUEST, FETCH_GA4_SCREENS_SUCCESS, FETCH_GA4_SCREENS_FAILURE,
} from "./ga4ActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// Generic (days[, limit]) => GET /ga4/<path> thunk, for the simple slices
// that don't need any bespoke handling beyond REQUEST/SUCCESS/FAILURE.
const makeFetchThunk = (path, types, { hasLimit = false } = {}) =>
  (arg1 = hasLimit ? 25 : 28, arg2 = 28) => async (dispatch) => {
    const [limit, days] = hasLimit ? [arg1, arg2] : [null, arg1];
    dispatch({ type: types[0] });
    try {
      const query = hasLimit ? `?limit=${limit}&days=${days}` : `?days=${days}`;
      const res = await axiosInstance.get(`${API_URL}/ga4/${path}${query}`, {
        headers: authHeaders(),
      });
      dispatch({ type: types[1], payload: res.data });
    } catch (err) {
      dispatch({ type: types[2], payload: err.response?.data?.message || err.message });
    }
  };

export const fetchGa4Overview = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_OVERVIEW_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/overview?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_OVERVIEW_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_OVERVIEW_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Trends = (days = 90) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_TRENDS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/trends?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_TRENDS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_TRENDS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4TrafficSources = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/traffic-sources?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_TRAFFIC_SOURCES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Locations = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_LOCATIONS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/locations?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_LOCATIONS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_LOCATIONS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Devices = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_DEVICES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/devices?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_DEVICES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_DEVICES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Conversions = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_CONVERSIONS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/conversions?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_CONVERSIONS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_CONVERSIONS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Cities = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_CITIES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/cities?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_CITIES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_CITIES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Browsers = (days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_BROWSERS_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/browsers?days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_BROWSERS_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_BROWSERS_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Pages = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_PAGES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/pages?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_PAGES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_PAGES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4LandingPages = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_LANDING_PAGES_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/landing-pages?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_LANDING_PAGES_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_LANDING_PAGES_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4Acquisition = (limit = 25, days = 28) => async (dispatch) => {
  dispatch({ type: FETCH_GA4_ACQUISITION_REQUEST });
  try {
    const res = await axiosInstance.get(`${API_URL}/ga4/acquisition?limit=${limit}&days=${days}`, {
      headers: authHeaders(),
    });
    dispatch({ type: FETCH_GA4_ACQUISITION_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: FETCH_GA4_ACQUISITION_FAILURE, payload: err.response?.data?.message || err.message });
  }
};

export const fetchGa4EngagementOverview = makeFetchThunk("engagement-overview", [
  FETCH_GA4_ENGAGEMENT_OVERVIEW_REQUEST, FETCH_GA4_ENGAGEMENT_OVERVIEW_SUCCESS, FETCH_GA4_ENGAGEMENT_OVERVIEW_FAILURE,
]);

export const fetchGa4EcommerceOverview = makeFetchThunk("ecommerce-overview", [
  FETCH_GA4_ECOMMERCE_OVERVIEW_REQUEST, FETCH_GA4_ECOMMERCE_OVERVIEW_SUCCESS, FETCH_GA4_ECOMMERCE_OVERVIEW_FAILURE,
]);

export const fetchGa4TopItems = makeFetchThunk("top-items", [
  FETCH_GA4_TOP_ITEMS_REQUEST, FETCH_GA4_TOP_ITEMS_SUCCESS, FETCH_GA4_TOP_ITEMS_FAILURE,
], { hasLimit: true });

export const fetchGa4Referrers = makeFetchThunk("referrers", [
  FETCH_GA4_REFERRERS_REQUEST, FETCH_GA4_REFERRERS_SUCCESS, FETCH_GA4_REFERRERS_FAILURE,
], { hasLimit: true });

export const fetchGa4Campaigns = makeFetchThunk("campaigns", [
  FETCH_GA4_CAMPAIGNS_REQUEST, FETCH_GA4_CAMPAIGNS_SUCCESS, FETCH_GA4_CAMPAIGNS_FAILURE,
], { hasLimit: true });

export const fetchGa4OperatingSystems = makeFetchThunk("operating-systems", [
  FETCH_GA4_OPERATING_SYSTEMS_REQUEST, FETCH_GA4_OPERATING_SYSTEMS_SUCCESS, FETCH_GA4_OPERATING_SYSTEMS_FAILURE,
]);

export const fetchGa4Platforms = makeFetchThunk("platforms", [
  FETCH_GA4_PLATFORMS_REQUEST, FETCH_GA4_PLATFORMS_SUCCESS, FETCH_GA4_PLATFORMS_FAILURE,
]);

export const fetchGa4DeviceModels = makeFetchThunk("device-models", [
  FETCH_GA4_DEVICE_MODELS_REQUEST, FETCH_GA4_DEVICE_MODELS_SUCCESS, FETCH_GA4_DEVICE_MODELS_FAILURE,
], { hasLimit: true });

export const fetchGa4ScreenResolutions = makeFetchThunk("screen-resolutions", [
  FETCH_GA4_SCREEN_RESOLUTIONS_REQUEST, FETCH_GA4_SCREEN_RESOLUTIONS_SUCCESS, FETCH_GA4_SCREEN_RESOLUTIONS_FAILURE,
], { hasLimit: true });

export const fetchGa4Regions = makeFetchThunk("regions", [
  FETCH_GA4_REGIONS_REQUEST, FETCH_GA4_REGIONS_SUCCESS, FETCH_GA4_REGIONS_FAILURE,
], { hasLimit: true });

export const fetchGa4Continents = makeFetchThunk("continents", [
  FETCH_GA4_CONTINENTS_REQUEST, FETCH_GA4_CONTINENTS_SUCCESS, FETCH_GA4_CONTINENTS_FAILURE,
]);

export const fetchGa4SubContinents = makeFetchThunk("sub-continents", [
  FETCH_GA4_SUB_CONTINENTS_REQUEST, FETCH_GA4_SUB_CONTINENTS_SUCCESS, FETCH_GA4_SUB_CONTINENTS_FAILURE,
]);

export const fetchGa4NewVsReturning = makeFetchThunk("new-vs-returning", [
  FETCH_GA4_NEW_VS_RETURNING_REQUEST, FETCH_GA4_NEW_VS_RETURNING_SUCCESS, FETCH_GA4_NEW_VS_RETURNING_FAILURE,
]);

export const fetchGa4DayOfWeek = makeFetchThunk("day-of-week", [
  FETCH_GA4_DAY_OF_WEEK_REQUEST, FETCH_GA4_DAY_OF_WEEK_SUCCESS, FETCH_GA4_DAY_OF_WEEK_FAILURE,
]);

export const fetchGa4HourOfDay = makeFetchThunk("hour-of-day", [
  FETCH_GA4_HOUR_OF_DAY_REQUEST, FETCH_GA4_HOUR_OF_DAY_SUCCESS, FETCH_GA4_HOUR_OF_DAY_FAILURE,
]);

export const fetchGa4Screens = makeFetchThunk("screens", [
  FETCH_GA4_SCREENS_REQUEST, FETCH_GA4_SCREENS_SUCCESS, FETCH_GA4_SCREENS_FAILURE,
], { hasLimit: true });
