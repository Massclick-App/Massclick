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
  FETCH_LOGS_REQUEST, FETCH_LOGS_SUCCESS, FETCH_LOGS_FAILURE, SET_LEADS_HISTORY_USERS,
  CATEGORY_BUSINESS_REQUEST,
  CATEGORY_BUSINESS_SUCCESS,
  CATEGORY_BUSINESS_FAILURE,
  FIND_BUSINESS_BY_MOBILE_REQUEST, FIND_BUSINESS_BY_MOBILE_SUCCESS, FIND_BUSINESS_BY_MOBILE_FAILURE,
  FETCH_VIEWBUSINESSDETAILS_REQUEST,
  FETCH_VIEWBUSINESSDETAILS_SUCCESS,
  FETCH_VIEWBUSINESSDETAILS_FAILURE,
  FETCH_DASHBOARDCARD_REQUEST,
  FETCH_DASHBOARDCARD_SUCCESS,
  FETCH_DASHBOARDCARD_FAILURE,
  FETCH_DASHBOARDCHART_REQUEST,
  FETCH_DASHBOARDCHART_SUCCESS,
  FETCH_DASHBOARDCHART_FAILURE,
  FETCH_PENDINGBUSINESS_REQUEST,
  FETCH_PENDINGBUSINESS_SUCCESS,
  FETCH_PENDINGBUSINESS_FAILURE,
  UPDATE_SEARCH_LOG_REQUEST,
  UPDATE_SEARCH_LOG_SUCCESS,
  UPDATE_SEARCH_LOG_FAILURE,
  FETCH_BUSINESS_BY_SLUG_REQUEST,
  FETCH_BUSINESS_BY_SLUG_SUCCESS,
  FETCH_BUSINESS_BY_SLUG_FAILURE,
} from '../actions/userActionTypes';

const initialState = {
  businessList: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  clientBusinessList: [],
  categoryBusinessList: {},
  loading: false,
  error: null,

  trendingList: [],
  trendingLoading: false,
  trendingError: null,
  backendSuggestions: [],
  backendSearchResults: [],

  searchLogs: [],
  searchLogsLoading: false,
  searchLogsError: null,

  matchedLogs: [],
  matchedLogsLoading: false,
  matchedLogsError: null,

  leadsHistoryUsers: [],

  matchedBusiness: null,
  matchedBusinessLoading: false,
  matchedBusinessError: null,

  businessDetails: null,
  businessDetailsLoading: false,
  businessDetailsError: null,

  dashboardSummary: null,
  dashboardSummaryLoading: false,
  dashboardSummaryError: null,

  chartData: null,
  chartLoading: false,
  chartError: null,

  pendingBusinessList: [],
  pendingBusinessLoading: false,
  pendingBusinessError: null,

  businessBySlug: null,
  businessBySlugLoading: false,
  businessBySlugError: null,

};

export default function businessListReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_BUSINESS_REQUEST:
    case CREATE_BUSINESS_REQUEST:
    case EDIT_BUSINESS_REQUEST:
    case DELETE_BUSINESS_REQUEST:
    case ACTIVE_BUSINESS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessList: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null,
      };

    case CREATE_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessList: [...state.businessList, action.payload],
        error: null,
      };

    case EDIT_BUSINESS_SUCCESS:
    case ACTIVE_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessList: state.businessList.map((b) =>
          b._id === action.payload._id ? action.payload : b
        ),
        pendingBusinessList: state.pendingBusinessList.filter(
          (b) => b._id !== action.payload._id
        ),
        error: null,
      };

    case DELETE_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessList: state.businessList.filter((b) => b._id !== action.payload),
        error: null,
      };

    case FETCH_BUSINESS_FAILURE:
    case CREATE_BUSINESS_FAILURE:
    case EDIT_BUSINESS_FAILURE:
    case DELETE_BUSINESS_FAILURE:
    case ACTIVE_BUSINESS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_VIEWBUSINESS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_VIEWBUSINESS_SUCCESS:
      return { ...state, loading: false, clientBusinessList: action.payload, error: null };

    case FETCH_VIEWBUSINESS_FAILURE:
      return { ...state, loading: false, clientBusinessList: [], error: action.payload };
    case FETCH_VIEWBUSINESSDETAILS_REQUEST:
      return {
        ...state,
        businessDetailsLoading: true,
        businessDetailsError: null,
      };

    case FETCH_VIEWBUSINESSDETAILS_SUCCESS:
      return {
        ...state,
        businessDetailsLoading: false,
        businessDetails: action.payload,
        businessDetailsError: null,
      };

    case FETCH_VIEWBUSINESSDETAILS_FAILURE:
      return {
        ...state,
        businessDetailsLoading: false,
        businessDetails: null,
        businessDetailsError: action.payload,
      };
    case FETCH_BUSINESS_BY_SLUG_REQUEST:
      return {
        ...state,
        businessBySlugLoading: true,
        businessBySlugError: null,
      };

    case FETCH_BUSINESS_BY_SLUG_SUCCESS:
      return {
        ...state,
        businessBySlugLoading: false,
        businessBySlug: action.payload,
      };

    case FETCH_BUSINESS_BY_SLUG_FAILURE:
      return {
        ...state,
        businessBySlugLoading: false,
        businessBySlug: null,
        businessBySlugError: action.payload,
      };

    case UPDATE_SEARCH_LOG_REQUEST:
      return {
        ...state,
        searchLogsLoading: true,
        searchLogsError: null,
      };

    case UPDATE_SEARCH_LOG_SUCCESS:
      return {
        ...state,
        searchLogsLoading: false,
        searchLogs: state.searchLogs.map((log) =>
          log._id === action.payload._id ? action.payload : log
        ),
      };

    case UPDATE_SEARCH_LOG_FAILURE:
      return {
        ...state,
        searchLogsLoading: false,
        searchLogsError: action.payload,
      };

    case FETCH_DASHBOARDCARD_REQUEST:
      return {
        ...state,
        dashboardSummaryLoading: true,
        dashboardSummaryError: null,
      };

    case FETCH_DASHBOARDCARD_SUCCESS:
      return {
        ...state,
        dashboardSummaryLoading: false,
        dashboardSummary: action.payload,
        dashboardSummaryError: null,
      };

    case FETCH_DASHBOARDCARD_FAILURE:
      return {
        ...state,
        dashboardSummaryLoading: false,
        dashboardSummary: null,
        dashboardSummaryError: action.payload,
      };
    case FETCH_DASHBOARDCHART_REQUEST:
      return { ...state, chartLoading: true, chartError: null };

    case FETCH_DASHBOARDCHART_SUCCESS:
      return { ...state, chartLoading: false, chartData: action.payload };

    case FETCH_DASHBOARDCHART_FAILURE:
      return { ...state, chartLoading: false, chartError: action.payload };

    case CATEGORY_BUSINESS_REQUEST:
      return { ...state, loading: true, error: null };

    case CATEGORY_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        categoryBusinessList: {
          ...state.categoryBusinessList,
          [action.payload.category]: action.payload.data,
        },
        error: null,
      };

    case CATEGORY_BUSINESS_FAILURE:
      return {
        ...state,
        loading: false,
        categoryBusinessList: {
          ...state.categoryBusinessList,
          [action.payload.category]: [],
        },
        error: action.payload.error,
      };

    case FETCH_TRENDING_REQUEST:
      return { ...state, trendingLoading: true, trendingError: null };

    case FETCH_TRENDING_SUCCESS:
      return {
        ...state,
        trendingLoading: false,
        trendingList: action.payload,
        trendingError: null,
      };

    case FETCH_TRENDING_FAILURE:
      return {
        ...state,
        trendingLoading: false,
        trendingList: [],
        trendingError: action.payload,
      };

    case FIND_BUSINESS_BY_MOBILE_REQUEST:
      return {
        ...state,
        matchedBusinessLoading: true,
        matchedBusinessError: null,
      };

    case FIND_BUSINESS_BY_MOBILE_SUCCESS:
      return {
        ...state,
        matchedBusinessLoading: false,
        matchedBusiness: action.payload,
        matchedBusinessError: null,
      };

    case FIND_BUSINESS_BY_MOBILE_FAILURE:
      return {
        ...state,
        matchedBusinessLoading: false,
        matchedBusiness: null,
        matchedBusinessError: action.payload,
      };

    case FETCH_PENDINGBUSINESS_REQUEST:
      return {
        ...state,
        pendingBusinessLoading: true,
        pendingBusinessError: null,
      };

    case FETCH_PENDINGBUSINESS_SUCCESS:
      return {
        ...state,
        pendingBusinessLoading: false,
        pendingBusinessList: action.payload,
      };

    case FETCH_PENDINGBUSINESS_FAILURE:
      return {
        ...state,
        pendingBusinessLoading: false,
        pendingBusinessList: [],
        pendingBusinessError: action.payload,
      };

    case FETCH_SEARCH_LOGS_REQUEST:
      return { ...state, searchLogsLoading: true, searchLogsError: null };

    case FETCH_SEARCH_LOGS_SUCCESS:
      return {
        ...state,
        searchLogsLoading: false,
        searchLogs: action.payload,
        searchLogsError: null,
      };

    case FETCH_SEARCH_LOGS_FAILURE:
      return {
        ...state,
        searchLogsLoading: false,
        searchLogs: [],
        searchLogsError: action.payload,
      };

    case FETCH_LOGS_REQUEST:
      return {
        ...state,
        matchedLogsLoading: true,
        matchedLogsError: null,
      };

    case FETCH_LOGS_SUCCESS:
      return {
        ...state,
        matchedLogsLoading: false,
        matchedLogs: action.payload,
        matchedLogsError: null,
      };

    case FETCH_LOGS_FAILURE:
      return {
        ...state,
        matchedLogsLoading: false,
        matchedLogs: [],
        matchedLogsError: action.payload,
      };
    case SET_LEADS_HISTORY_USERS:
      return {
        ...state,
        leadsHistoryUsers: action.payload
      };

    case SUGGESTION_BUSINESS_REQUEST:
      return { ...state, loading: true };

    case SUGGESTION_BUSINESS_SUCCESS:
      return { ...state, loading: false, backendSuggestions: action.payload };

    case SUGGESTION_BUSINESS_FAILURE:
      return { ...state, loading: false, backendSuggestions: [] };

    case SEARCH_BUSINESS_REQUEST:
      return { ...state, loading: true };

    case SEARCH_BUSINESS_SUCCESS:
      return { ...state, loading: false, backendSearchResults: action.payload };

    case SEARCH_BUSINESS_FAILURE:
      return { ...state, loading: false, backendSearchResults: [] };

    default:
      return state;
  }
}
