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



const getSSRMeta = () => {
  try {
    // Primary: read from server-injected window variable (reliable across all HTML formats)
    if (typeof window !== "undefined" && window.__SSR_SEO__) {
      return window.__SSR_SEO__;
    }
    // Fallback: parse DOM meta tags (works in local dev without SSR injection)
    if (typeof document === "undefined") return null;
    const title = document.querySelector("title")?.textContent?.trim() || null;
    const getAttr = (sel, attr = "content") =>
      document.querySelector(sel)?.getAttribute(attr) || null;
    const canonical = getAttr('link[rel="canonical"]', "href");
    const description = getAttr('meta[name="description"]');
    const keywords = getAttr('meta[name="keywords"]');
    const robots = getAttr('meta[name="robots"]');
    if (!title && !description) return null;
    return { title, description, keywords, robots, canonical };
  } catch {
    return null;
  }
};

/**
 * INITIAL STATE
 */
const initialState = {
  list: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  meta: getSSRMeta(),
  categorySuggestions: [],
  loading: false,
  error: null,
};



/**
 * REDUCER
 */
export default function seoReducer(state = initialState, action) {

  switch (action.type) {

    /**
     * ========================================
     * LOADING STATES
     * ========================================
     */
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



    /**
     * ========================================
     * FETCH SEO LIST (MAIN TABLE DATA)
     * This is the ONLY place list should update
     * ========================================
     */
    case FETCH_SEO_SUCCESS:
      return {
        ...state,
        loading: false,

        // replace entire list (prevents duplicates)
        list: action.payload.data || [],

        total: action.payload.total || 0,
        pageNo: action.payload.pageNo || 1,
        pageSize: action.payload.pageSize || 10,

        error: null,
      };



    /**
     * ========================================
     * CREATE SUCCESS
     * DO NOT manually add to list
     * Because getAllSeo() will refresh list
     * ========================================
     */
    case CREATE_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };



    /**
     * ========================================
     * EDIT SUCCESS
     * DO NOT modify list manually
     * getAllSeo() refresh handles update
     * ========================================
     */
    case EDIT_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };



    /**
     * ========================================
     * DELETE SUCCESS
     * DO NOT modify list manually
     * getAllSeo() refresh handles delete
     * ========================================
     */
    case DELETE_SEO_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };



    case FETCH_SEO_META_SUCCESS:
      return {
        ...state,
        loading: false,
        meta: action.payload || null,
        error: null,
      };


    case CLEAR_SEO_META:
      return {
        ...state,
        // keep previous meta until the next fetch completes to avoid flash
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
        error: null,
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