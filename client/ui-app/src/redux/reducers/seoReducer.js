import {
  FETCH_SEO_REQUEST,
  FETCH_SEO_SUCCESS,
  FETCH_SEO_FAILURE,

  CREATE_SEO_REQUEST,
  CREATE_SEO_SUCCESS,
  CREATE_SEO_FAILURE,

  EDIT_SEO_REQUEST,
  EDIT_SEO_SUCCESS,
  EDIT_SEO_FAILURE,

  DELETE_SEO_REQUEST,
  DELETE_SEO_SUCCESS,
  DELETE_SEO_FAILURE,

  FETCH_SEO_META_REQUEST,
  FETCH_SEO_META_SUCCESS,
  FETCH_SEO_META_FAILURE,

  FETCH_SEO_CATEGORY_SUGGESTIONS_REQUEST,
  FETCH_SEO_CATEGORY_SUGGESTIONS_SUCCESS,
  FETCH_SEO_CATEGORY_SUGGESTIONS_FAILURE,

  CLEAR_SEO_META
} from "../actions/userActionTypes.js";

const initialState = {
  list: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  meta: null,
  categorySuggestions: [],
  loading: false,
  error: null,
};



export default function seoReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_SEO_REQUEST:
    case CREATE_SEO_REQUEST:
    case EDIT_SEO_REQUEST:
    case DELETE_SEO_REQUEST:
    case FETCH_SEO_META_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

   
   case FETCH_SEO_SUCCESS:
  return {
    ...state,
    loading: false,
    list: action.payload.data,
    total: action.payload.total,
    pageNo: action.payload.pageNo,
    pageSize: action.payload.pageSize,
    error: null,
  };


   
    case CREATE_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        list: [...state.list, action.payload],
      };

    
    case EDIT_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.map((seo) =>
          seo._id === action.payload._id ? action.payload : seo
        ),
      };

   
    case DELETE_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.filter(
          (seo) =>
            seo._id !==
            (action.payload?._id || action.payload?.data?._id)
        ),
      };

    
    case FETCH_SEO_META_SUCCESS:
      return {
        ...state,
        loading: false,
        meta: action.payload,
      };

    
    case CLEAR_SEO_META:
      return {
        ...state,
        meta: null,
      };

 
    case FETCH_SEO_CATEGORY_SUGGESTIONS_REQUEST:
      return {
        ...state,
        error: null,
      };

    case FETCH_SEO_CATEGORY_SUGGESTIONS_SUCCESS:
      return {
        ...state,
        categorySuggestions: action.payload || [],
      };

    case FETCH_SEO_CATEGORY_SUGGESTIONS_FAILURE:
      return {
        ...state,
        categorySuggestions: [],
        error: action.payload,
      };

  
    case FETCH_SEO_FAILURE:
    case CREATE_SEO_FAILURE:
    case EDIT_SEO_FAILURE:
    case DELETE_SEO_FAILURE:
    case FETCH_SEO_META_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

   
    default:
      return state;
  }
}
