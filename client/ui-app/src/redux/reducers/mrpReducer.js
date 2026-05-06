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
} from '../actions/userActionTypes.js';

const initialState = {
  mrpList: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,

  loading: false,
  error: null,
  leadSending: false,

  businessSearchResults: [],
  categorySearchResults: [],

  mniLeads: [],
  mniLoading: false,
  mniError: null,

  leadReport: null,
  leadReportLoading: false,
  leadReportError: null,

  businessProfile: null,
  businessProfileLoading: false,
  businessProfileError: null
};

export default function mrpReducer(state = initialState, action) {
  switch (action.type) {

    /* ===============================
       MRP CRUD
    ============================== */

    case FETCH_MRP_REQUEST:
    case CREATE_MRP_REQUEST:
    case EDIT_MRP_REQUEST:
    case DELETE_MRP_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_MRP_SUCCESS:
      return {
        ...state,
        loading: false,
        mrpList: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize
      };

    case CREATE_MRP_SUCCESS:
      return {
        ...state,
        loading: false,
        mrpList: [action.payload, ...state.mrpList]
      };

    case EDIT_MRP_SUCCESS:
      return {
        ...state,
        loading: false,
        mrpList: state.mrpList.map(item =>
          item._id === action.payload._id ? action.payload : item
        )
      };

    case DELETE_MRP_SUCCESS:
      return {
        ...state,
        loading: false,
        mrpList: state.mrpList.filter(
          item => item._id !== action.payload._id
        )
      };

    case FETCH_MRP_FAILURE:
    case CREATE_MRP_FAILURE:
    case EDIT_MRP_FAILURE:
    case DELETE_MRP_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    /* ===============================
       SEARCH
    ============================== */

    case SEARCH_MRP_BUSINESS_REQUEST:
    case SEARCH_MRP_CATEGORY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case SEARCH_MRP_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessSearchResults: action.payload
      };

    case SEARCH_MRP_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        categorySearchResults: action.payload
      };

    case SEARCH_MRP_BUSINESS_FAILURE:
    case SEARCH_MRP_CATEGORY_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    /* ===============================
       SEND LEADS
    ============================== */

    case SEND_MRP_LEADS_REQUEST:
      return {
        ...state,
        leadSending: true,
        error: null
      };

    case SEND_MRP_LEADS_SUCCESS:
      return {
        ...state,
        leadSending: false
      };

    case SEND_MRP_LEADS_FAILURE:
      return {
        ...state,
        leadSending: false,
        error: action.payload
      };

    /* ===============================
       🔥 MNI LEADS (FIXED)
    ============================== */

    case FETCH_MNI_LEADS_REQUEST:
      return {
        ...state,
        mniLoading: true,
        mniError: null
      };

    case FETCH_MNI_LEADS_SUCCESS:
      return {
        ...state,
        mniLoading: false,
        mniLeads: action.payload.data
      };

    case FETCH_MNI_LEADS_FAILURE:
      return {
        ...state,
        mniLoading: false,
        mniError: action.payload
      };

    /* ===============================
       LEAD REPORT
    ============================== */

    case FETCH_LEAD_REPORT_REQUEST:
      return {
        ...state,
        leadReportLoading: true,
        leadReportError: null
      };

    case FETCH_LEAD_REPORT_SUCCESS:
      return {
        ...state,
        leadReportLoading: false,
        leadReport: action.payload
      };

    case FETCH_LEAD_REPORT_FAILURE:
      return {
        ...state,
        leadReportLoading: false,
        leadReportError: action.payload
      };

    /* ===============================
       BUSINESS PROFILE BY PHONE
    ============================== */

    case FETCH_BUSINESS_PROFILE_BY_PHONE_REQUEST:
      return {
        ...state,
        businessProfileLoading: true,
        businessProfileError: null
      };

    case FETCH_BUSINESS_PROFILE_BY_PHONE_SUCCESS:
      return {
        ...state,
        businessProfileLoading: false,
        businessProfile: action.payload
      };

    case FETCH_BUSINESS_PROFILE_BY_PHONE_FAILURE:
      return {
        ...state,
        businessProfileLoading: false,
        businessProfileError: action.payload
      };

    /* ===============================
       DEFAULT
    ============================== */

    default:
      return state;
  }
}