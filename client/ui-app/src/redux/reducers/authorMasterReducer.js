import {
  FETCH_AUTHORS_REQUEST,
  FETCH_AUTHORS_SUCCESS,
  FETCH_AUTHORS_FAILURE,
  SEARCH_AUTHORS_REQUEST,
  SEARCH_AUTHORS_SUCCESS,
  SEARCH_AUTHORS_FAILURE,
  CREATE_AUTHOR_REQUEST,
  CREATE_AUTHOR_SUCCESS,
  CREATE_AUTHOR_FAILURE,
  UPDATE_AUTHOR_REQUEST,
  UPDATE_AUTHOR_SUCCESS,
  UPDATE_AUTHOR_FAILURE,
  DELETE_AUTHOR_REQUEST,
  DELETE_AUTHOR_SUCCESS,
  DELETE_AUTHOR_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  list: [],
  searchResults: [],
  loading: false,
  error: null,
};

export default function authorMasterReducer(state = initialState, action) {
  switch (action.type) {
    /* ================= LOADING ================= */
    case FETCH_AUTHORS_REQUEST:
    case SEARCH_AUTHORS_REQUEST:
    case CREATE_AUTHOR_REQUEST:
    case UPDATE_AUTHOR_REQUEST:
    case DELETE_AUTHOR_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    /* ================= SUCCESS ================= */
    case FETCH_AUTHORS_SUCCESS:
      return {
        ...state,
        list: action.payload,
        loading: false,
      };

    case SEARCH_AUTHORS_SUCCESS:
      return {
        ...state,
        searchResults: action.payload,
        loading: false,
      };

    case CREATE_AUTHOR_SUCCESS:
      return {
        ...state,
        list: [...state.list, action.payload],
        loading: false,
      };

    case UPDATE_AUTHOR_SUCCESS:
      return {
        ...state,
        list: state.list.map((author) =>
          author._id === action.payload._id ? action.payload : author
        ),
        loading: false,
      };

    case DELETE_AUTHOR_SUCCESS:
      return {
        ...state,
        list: state.list.filter((author) => author._id !== action.payload),
        loading: false,
      };

    /* ================= FAILURE ================= */
    case FETCH_AUTHORS_FAILURE:
    case SEARCH_AUTHORS_FAILURE:
    case CREATE_AUTHOR_FAILURE:
    case UPDATE_AUTHOR_FAILURE:
    case DELETE_AUTHOR_FAILURE:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    default:
      return state;
  }
}
