import {
  FETCH_CATEGORY_REQUEST, FETCH_CATEGORY_SUCCESS, FETCH_CATEGORY_FAILURE,
  CREATE_CATEGORY_REQUEST, CREATE_CATEGORY_SUCCESS, CREATE_CATEGORY_FAILURE,
  EDIT_CATEGORY_REQUEST, EDIT_CATEGORY_SUCCESS, EDIT_CATEGORY_FAILURE,
  DELETE_CATEGORY_REQUEST, DELETE_CATEGORY_SUCCESS, DELETE_CATEGORY_FAILURE,
  BUSINESS_CATEGORYSEARCH_REQUEST, BUSINESS_CATEGORYSEARCH_SUCCESS, BUSINESS_CATEGORYSEARCH_FAILURE
} from '../actions/userActionTypes';

const initialState = {
  category: [],
  searchCategory: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function categoryReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_CATEGORY_REQUEST:
    case CREATE_CATEGORY_REQUEST:
    case EDIT_CATEGORY_REQUEST:
    case DELETE_CATEGORY_REQUEST:
      return { ...state, loading: true, error: null };
    case BUSINESS_CATEGORYSEARCH_REQUEST:
      return { ...state, loading: true };

    case FETCH_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null
      };

    case CREATE_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: [...state.category, action.payload],
        error: null,
      };
    case BUSINESS_CATEGORYSEARCH_SUCCESS:
      return {
        ...state,
        loading: false,
        searchCategory: action.payload,
      };
    case EDIT_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: state.category.map(cat =>
          cat._id === action.payload._id ? action.payload : cat
        ),
        error: null,
      };

    case DELETE_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: state.category.filter(cat =>
          cat._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_CATEGORY_FAILURE:
    case CREATE_CATEGORY_FAILURE:
    case EDIT_CATEGORY_FAILURE:
    case DELETE_CATEGORY_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case BUSINESS_CATEGORYSEARCH_FAILURE:
      return {
        ...state,
        loading: false,
        searchCategory: [],
        error: action.payload,
      };
    default:
      return state;
  }
}
