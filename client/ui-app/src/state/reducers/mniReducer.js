import {
  FETCH_MNI_REQUEST, FETCH_MNI_SUCCESS, FETCH_MNI_FAILURE,
  CREATE_MNI_REQUEST, CREATE_MNI_SUCCESS, CREATE_MNI_FAILURE,
  EDIT_MNI_REQUEST, EDIT_MNI_SUCCESS, EDIT_MNI_FAILURE,
  DELETE_MNI_REQUEST, DELETE_MNI_SUCCESS, DELETE_MNI_FAILURE,
  SEARCH_MNI_BUSINESS_REQUEST, SEARCH_MNI_BUSINESS_SUCCESS, SEARCH_MNI_BUSINESS_FAILURE,
  SEARCH_MNI_CATEGORY_REQUEST, SEARCH_MNI_CATEGORY_SUCCESS, SEARCH_MNI_CATEGORY_FAILURE,
  SEND_MNI_LEADS_REQUEST, SEND_MNI_LEADS_SUCCESS, SEND_MNI_LEADS_FAILURE,
  FETCH_MNI_LEADS_REQUEST, FETCH_MNI_LEADS_SUCCESS, FETCH_MNI_LEADS_FAILURE,
  FETCH_BUSINESS_PROFILE_BY_PHONE_REQUEST, FETCH_BUSINESS_PROFILE_BY_PHONE_SUCCESS, FETCH_BUSINESS_PROFILE_BY_PHONE_FAILURE,
  FETCH_LEAD_REPORT_REQUEST, FETCH_LEAD_REPORT_SUCCESS, FETCH_LEAD_REPORT_FAILURE
} from 'state/actions/userActionTypes.js';

const initialState = {
  mniList: [],
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

export default function mniReducer(state = initialState, action) {
  switch (action.type) {

    /* ===============================
       MNI CRUD
    ============================== */

    case FETCH_MNI_REQUEST:
    case CREATE_MNI_REQUEST:
    case EDIT_MNI_REQUEST:
    case DELETE_MNI_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_MNI_SUCCESS:
      return {
        ...state,
        loading: false,
        mniList: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize
      };

    case CREATE_MNI_SUCCESS:
      return {
        ...state,
        loading: false,
        mniList: [action.payload, ...state.mniList]
      };

    case EDIT_MNI_SUCCESS:
      return {
        ...state,
        loading: false,
        mniList: state.mniList.map(item =>
          item._id === action.payload._id ? action.payload : item
        )
      };

    case DELETE_MNI_SUCCESS:
      return {
        ...state,
        loading: false,
        mniList: state.mniList.filter(
          item => item._id !== action.payload._id
        )
      };

    case FETCH_MNI_FAILURE:
    case CREATE_MNI_FAILURE:
    case EDIT_MNI_FAILURE:
    case DELETE_MNI_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    /* ===============================
       SEARCH
    ============================== */

    case SEARCH_MNI_BUSINESS_REQUEST:
    case SEARCH_MNI_CATEGORY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case SEARCH_MNI_BUSINESS_SUCCESS:
      return {
        ...state,
        loading: false,
        businessSearchResults: action.payload
      };

    case SEARCH_MNI_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        categorySearchResults: action.payload
      };

    case SEARCH_MNI_BUSINESS_FAILURE:
    case SEARCH_MNI_CATEGORY_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    /* ===============================
       SEND LEADS
    ============================== */

    case SEND_MNI_LEADS_REQUEST:
      return {
        ...state,
        leadSending: true,
        error: null
      };

    case SEND_MNI_LEADS_SUCCESS:
      return {
        ...state,
        leadSending: false
      };

    case SEND_MNI_LEADS_FAILURE:
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
        mniLeads: Array.isArray(action.payload)
          ? action.payload
          : action.payload?.data || []
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
