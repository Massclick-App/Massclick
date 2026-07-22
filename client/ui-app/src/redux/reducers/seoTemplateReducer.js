import {
  FETCH_SEOTEMPLATE_REQUEST,
  FETCH_SEOTEMPLATE_SUCCESS,
  FETCH_SEOTEMPLATE_FAILURE,

  CREATE_SEOTEMPLATE_REQUEST,
  CREATE_SEOTEMPLATE_SUCCESS,
  CREATE_SEOTEMPLATE_FAILURE,

  EDIT_SEOTEMPLATE_REQUEST,
  EDIT_SEOTEMPLATE_SUCCESS,
  EDIT_SEOTEMPLATE_FAILURE,

  DELETE_SEOTEMPLATE_REQUEST,
  DELETE_SEOTEMPLATE_SUCCESS,
  DELETE_SEOTEMPLATE_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  list: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};


export default function seoTemplateReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_SEOTEMPLATE_REQUEST:
    case CREATE_SEOTEMPLATE_REQUEST:
    case EDIT_SEOTEMPLATE_REQUEST:
    case DELETE_SEOTEMPLATE_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_SEOTEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        list: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null,
      };

    case CREATE_SEOTEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        list: [action.payload, ...state.list],
        total: state.total + 1,
      };

    case EDIT_SEOTEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.map((item) =>
          item._id === action.payload._id ? action.payload : item
        ),
      };

    // Delete controller responds { message, template } — not { message, seo }
    // like seoPageContentController — so filter on payload.template._id here.
    case DELETE_SEOTEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.filter(
          (item) => item._id !== action.payload?.template?._id
        ),
        total: Math.max(0, state.total - 1),
      };

    case FETCH_SEOTEMPLATE_FAILURE:
    case CREATE_SEOTEMPLATE_FAILURE:
    case EDIT_SEOTEMPLATE_FAILURE:
    case DELETE_SEOTEMPLATE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
