import {
  FETCH_CATEGORY_REQUEST, FETCH_CATEGORY_SUCCESS, FETCH_CATEGORY_FAILURE,
  CREATE_CATEGORY_REQUEST, CREATE_CATEGORY_SUCCESS, CREATE_CATEGORY_FAILURE,
  EDIT_CATEGORY_REQUEST, EDIT_CATEGORY_SUCCESS, EDIT_CATEGORY_FAILURE,
  DELETE_CATEGORY_REQUEST, DELETE_CATEGORY_SUCCESS, DELETE_CATEGORY_FAILURE,
  BUSINESS_CATEGORYSEARCH_REQUEST, BUSINESS_CATEGORYSEARCH_SUCCESS, BUSINESS_CATEGORYSEARCH_FAILURE,

  FETCH_HOME_CATEGORY_REQUEST, FETCH_HOME_CATEGORY_SUCCESS, FETCH_HOME_CATEGORY_FAILURE,
  FETCH_SUB_CATEGORY_REQUEST, FETCH_SUB_CATEGORY_SUCCESS, FETCH_SUB_CATEGORY_FAILURE,
  FETCH_POPULAR_CATEGORY_REQUEST, FETCH_POPULAR_CATEGORY_SUCCESS, FETCH_POPULAR_CATEGORY_FAILURE,
  FETCH_SERVICE_CARDS_REQUEST, FETCH_SERVICE_CARDS_SUCCESS, FETCH_SERVICE_CARDS_FAILURE

} from '../actions/userActionTypes';

const initialState = {
  category: [],
  homeCategories: [],
  subCategories: [],
  popularCategories: [],
  searchCategory: [],
  serviceCards: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function categoryReducer(state = initialState, action) {
  switch (action.type) {

    // ================= COMMON LOADING =================
    case FETCH_CATEGORY_REQUEST:
    case CREATE_CATEGORY_REQUEST:
    case EDIT_CATEGORY_REQUEST:
    case DELETE_CATEGORY_REQUEST:
    case FETCH_HOME_CATEGORY_REQUEST:
    case FETCH_SUB_CATEGORY_REQUEST:
    case FETCH_POPULAR_CATEGORY_REQUEST:
    case FETCH_SERVICE_CARDS_REQUEST:
    case BUSINESS_CATEGORYSEARCH_REQUEST:
      return { ...state, loading: true, error: null };

    // ================= ALL CATEGORY =================
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

    case FETCH_CATEGORY_FAILURE:
      return { ...state, loading: false, error: action.payload };


    // ================= CREATE =================
    case CREATE_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: [...state.category, action.payload],
        error: null,
      };

    case CREATE_CATEGORY_FAILURE:
      return { ...state, loading: false, error: action.payload };


    // ================= EDIT =================
    case EDIT_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: state.category.map(cat =>
          cat._id === action.payload._id ? action.payload : cat
        ),
        error: null,
      };

    case EDIT_CATEGORY_FAILURE:
      return { ...state, loading: false, error: action.payload };


    // ================= DELETE =================
    case DELETE_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        category: state.category.filter(cat =>
          cat._id !== action.payload._id
        ),
        error: null,
      };

    case DELETE_CATEGORY_FAILURE:
      return { ...state, loading: false, error: action.payload };


    case BUSINESS_CATEGORYSEARCH_SUCCESS:
      return {
        ...state,
        loading: false,
        searchCategory: action.payload,
        error: null,
      };

    case BUSINESS_CATEGORYSEARCH_FAILURE:
      return {
        ...state,
        loading: false,
        searchCategory: [],
        error: action.payload,
      };


    // ================= HOME CATEGORY =================
    case FETCH_HOME_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        homeCategories: action.payload,
        error: null,
      };

    case FETCH_HOME_CATEGORY_FAILURE:
      return {
        ...state,
        loading: false,
        homeCategories: [],
        error: action.payload,
      };
    case FETCH_SERVICE_CARDS_SUCCESS:
      return {
        ...state,
        loading: false,
        serviceCards: action.payload,
        error: null,
      };
    case FETCH_SERVICE_CARDS_FAILURE:
      return {
        ...state,
        loading: false,
        serviceCards: [],
        error: action.payload,
      };

    // ================= SUB CATEGORY =================
    case FETCH_SUB_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        subCategories: action.payload,
        error: null,
      };

    case FETCH_SUB_CATEGORY_FAILURE:
      return {
        ...state,
        loading: false,
        subCategories: [],
        error: action.payload,
      };


    // ================= POPULAR CATEGORY =================
    case FETCH_POPULAR_CATEGORY_SUCCESS:
      return {
        ...state,
        loading: false,
        popularCategories: action.payload,
        error: null,
      };

    case FETCH_POPULAR_CATEGORY_FAILURE:
      return {
        ...state,
        loading: false,
        popularCategories: [],
        error: action.payload,
      };


    // ================= DEFAULT =================
    default:
      return state;
  }
}