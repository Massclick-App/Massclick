import {
  FETCH_MRP_REQUEST, FETCH_MRP_SUCCESS, FETCH_MRP_FAILURE,
  CREATE_MRP_REQUEST, CREATE_MRP_SUCCESS, CREATE_MRP_FAILURE,
  EDIT_MRP_REQUEST, EDIT_MRP_SUCCESS, EDIT_MRP_FAILURE,
  DELETE_MRP_REQUEST, DELETE_MRP_SUCCESS, DELETE_MRP_FAILURE,
  SEARCH_MRP_BUSINESS_REQUEST, SEARCH_MRP_BUSINESS_SUCCESS, SEARCH_MRP_BUSINESS_FAILURE,
  SEARCH_MRP_CATEGORY_REQUEST, SEARCH_MRP_CATEGORY_SUCCESS, SEARCH_MRP_CATEGORY_FAILURE,
  SEND_MRP_LEADS_REQUEST, SEND_MRP_LEADS_SUCCESS, SEND_MRP_LEADS_FAILURE
} from '../actions/userActionTypes.js';

const initialState = {
  mrpList: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  leadSending: false,
  error: null,
  businessSearchResults: [],
  categorySearchResults: []
};

export default function mrpReducer(state = initialState, action) {
  switch (action.type) {

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

    case FETCH_MRP_FAILURE:
    case CREATE_MRP_FAILURE:
    case EDIT_MRP_FAILURE:
    case DELETE_MRP_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
}