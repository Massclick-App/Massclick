import {
  FETCH_SEOPAGECONTENTBLOGS_REQUEST,
  FETCH_SEOPAGECONTENTBLOGS_SUCCESS,
  FETCH_SEOPAGECONTENTBLOGS_FAILURE,

  CREATE_SEOPAGECONTENTBLOGS_REQUEST,
  CREATE_SEOPAGECONTENTBLOGS_SUCCESS,
  CREATE_SEOPAGECONTENTBLOGS_FAILURE,

  EDIT_SEOPAGECONTENTBLOGS_REQUEST,
  EDIT_SEOPAGECONTENTBLOGS_SUCCESS,
  EDIT_SEOPAGECONTENTBLOGS_FAILURE,

  DELETE_SEOPAGECONTENTBLOGS_REQUEST,
  DELETE_SEOPAGECONTENTBLOGS_SUCCESS,
  DELETE_SEOPAGECONTENTBLOGS_FAILURE,

  FETCH_SEOPAGECONTENTBLOGS_META_REQUEST,
  FETCH_SEOPAGECONTENTBLOGS_META_SUCCESS,
  FETCH_SEOPAGECONTENTBLOGS_META_FAILURE,

  FETCH_SEOBLOG_BY_SLUG_REQUEST,
  FETCH_SEOBLOG_BY_SLUG_SUCCESS,
  FETCH_SEOBLOG_BY_SLUG_FAILURE,

  /* ===== NEW: BUSINESS SUGGESTION ===== */
  FETCH_BUSINESS_SUGGESTION_REQUEST,
  FETCH_BUSINESS_SUGGESTION_SUCCESS,
  FETCH_BUSINESS_SUGGESTION_FAILURE,

} from "../actions/userActionTypes";

/* ================= INITIAL STATE ================= */
const initialState = {
  list: [],
  blog: null,
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,

  /* ✅ NEW STATE */
  suggestions: [],
};

/* ================= REDUCER ================= */
export default function seoPageContentReducer(state = initialState, action) {
  switch (action.type) {

    /* ================= LOADING ================= */
    case FETCH_SEOPAGECONTENTBLOGS_REQUEST:
    case CREATE_SEOPAGECONTENTBLOGS_REQUEST:
    case EDIT_SEOPAGECONTENTBLOGS_REQUEST:
    case DELETE_SEOPAGECONTENTBLOGS_REQUEST:
    case FETCH_SEOPAGECONTENTBLOGS_META_REQUEST:
    case FETCH_SEOBLOG_BY_SLUG_REQUEST:
    case FETCH_BUSINESS_SUGGESTION_REQUEST:   // ✅ NEW
      return {
        ...state,
        loading: true,
        error: null,
      };

    /* ================= LIST FETCH ================= */
    case FETCH_SEOPAGECONTENTBLOGS_SUCCESS:
      return {
        ...state,
        loading: false,
        list: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null,
      };

    /* ================= META (RELATED BLOGS) ================= */
    case FETCH_SEOPAGECONTENTBLOGS_META_SUCCESS:
      return {
        ...state,
        loading: false,
        list: action.payload?.data || [],
        
      };

    /* ================= SINGLE BLOG ================= */
    case FETCH_SEOBLOG_BY_SLUG_SUCCESS:
      return {
        ...state,
        loading: false,
        blog: action.payload,
      };

    /* ================= BUSINESS SUGGESTION ================= */
    case FETCH_BUSINESS_SUGGESTION_SUCCESS:
      return {
        ...state,
        loading: false,
        suggestions: action.payload,  // ✅ store suggestions
      };

    /* ================= CREATE ================= */
    case CREATE_SEOPAGECONTENTBLOGS_SUCCESS:
      return {
        ...state,
        loading: false,
        list: [action.payload, ...state.list],
        total: state.total + 1,
      };

    /* ================= UPDATE ================= */
    case EDIT_SEOPAGECONTENTBLOGS_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.map((item) =>
          item._id === action.payload._id ? action.payload : item
        ),
      };

    /* ================= DELETE ================= */
    case DELETE_SEOPAGECONTENTBLOGS_SUCCESS:
      return {
        ...state,
        loading: false,
        list: state.list.filter(
          (item) => item._id !== action.payload.seo._id
        ),
        total: Math.max(0, state.total - 1),
      };

    /* ================= FAILURE ================= */
    case FETCH_SEOPAGECONTENTBLOGS_FAILURE:
    case FETCH_SEOPAGECONTENTBLOGS_META_FAILURE:
    case CREATE_SEOPAGECONTENTBLOGS_FAILURE:
    case EDIT_SEOPAGECONTENTBLOGS_FAILURE:
    case DELETE_SEOPAGECONTENTBLOGS_FAILURE:
    case FETCH_SEOBLOG_BY_SLUG_FAILURE:
    case FETCH_BUSINESS_SUGGESTION_FAILURE:   // ✅ NEW
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}