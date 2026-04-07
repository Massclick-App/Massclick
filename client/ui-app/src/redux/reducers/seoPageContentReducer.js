import {
  FETCH_SEOPAGECONTENT_REQUEST,
  FETCH_SEOPAGECONTENT_SUCCESS,
  FETCH_SEOPAGECONTENT_FAILURE,

  CREATE_SEOPAGECONTENT_REQUEST,
  CREATE_SEOPAGECONTENT_SUCCESS,
  CREATE_SEOPAGECONTENT_FAILURE,

  EDIT_SEOPAGECONTENT_REQUEST,
  EDIT_SEOPAGECONTENT_SUCCESS,
  EDIT_SEOPAGECONTENT_FAILURE,

  DELETE_SEOPAGECONTENT_REQUEST,
  DELETE_SEOPAGECONTENT_SUCCESS,
  DELETE_SEOPAGECONTENT_FAILURE,

  FETCH_SEOPAGECONTENT_META_REQUEST,
  FETCH_SEOPAGECONTENT_META_SUCCESS,
  FETCH_SEOPAGECONTENT_META_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  list: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};


export default function seoPageContentReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_SEOPAGECONTENT_REQUEST:
    case CREATE_SEOPAGECONTENT_REQUEST:
    case EDIT_SEOPAGECONTENT_REQUEST:
    case DELETE_SEOPAGECONTENT_REQUEST:
    case FETCH_SEOPAGECONTENT_META_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
      
    case FETCH_SEOPAGECONTENT_SUCCESS:
  return {
    ...state,
    loading: false,
    list: action.payload.data,
    total: action.payload.total,
    pageNo: action.payload.pageNo,
    pageSize: action.payload.pageSize,
    error: null,
  };

    case FETCH_SEOPAGECONTENT_META_SUCCESS:
      return {
        ...state,
        loading: false,
        list: action.payload?.data || [],
        total: action.payload?.total || 0,
      };

    case CREATE_SEOPAGECONTENT_SUCCESS:
      return {
        ...state,
        loading: false,
        list: [action.payload, ...state.list],
        total: state.total + 1,
      };

    case EDIT_SEOPAGECONTENT_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.map((item) =>
          item._id === action.payload._id ? action.payload : item
        ),
      };

    case DELETE_SEOPAGECONTENT_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.filter(
          (item) => item._id !== action.payload?.seo?._id
        ),
        total: Math.max(0, state.total - 1),
      };

    case FETCH_SEOPAGECONTENT_FAILURE:
    case FETCH_SEOPAGECONTENT_META_FAILURE:
    case CREATE_SEOPAGECONTENT_FAILURE:
    case EDIT_SEOPAGECONTENT_FAILURE:
    case DELETE_SEOPAGECONTENT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
