import {
  CREATE_SEARCH_REQUEST_FAILURE, CREATE_SEARCH_REQUEST_REQUEST, CREATE_SEARCH_REQUEST_SUCCESS,
  DELETE_SEARCH_REQUEST_FAILURE, DELETE_SEARCH_REQUEST_REQUEST, DELETE_SEARCH_REQUEST_SUCCESS,
  FETCH_SEARCH_REQUESTS_FAILURE, FETCH_SEARCH_REQUESTS_REQUEST, FETCH_SEARCH_REQUESTS_SUCCESS,
  FETCH_SEARCH_REQUEST_FAILURE, FETCH_SEARCH_REQUEST_REQUEST, FETCH_SEARCH_REQUEST_SUCCESS,
  INITIALIZE_SEARCH_REQUEST_FORM, RESET_SEARCH_REQUEST_FORM, SET_SEARCH_REQUEST_FIELD,
  UPDATE_SEARCH_REQUEST_FAILURE, UPDATE_SEARCH_REQUEST_REQUEST, UPDATE_SEARCH_REQUEST_SUCCESS,
} from "../actions/userActionTypes.js";

const emptyForm = { fullName: "", contactNumber: "", email: "", category: "", location: "", details: "" };
const initialState = { requests: [], selectedRequest: null, total: 0, page: 1, limit: 25, pages: 0, form: emptyForm, loading: false, submitting: false, error: null, lastSubmitted: null };

export default function searchRequestReducer(state = initialState, action) {
  switch (action.type) {
    case INITIALIZE_SEARCH_REQUEST_FORM:
      return { ...state, form: { ...emptyForm, ...action.payload }, error: null, lastSubmitted: null };
    case SET_SEARCH_REQUEST_FIELD:
      return { ...state, form: { ...state.form, [action.payload.name]: action.payload.value }, error: null };
    case RESET_SEARCH_REQUEST_FORM:
      return { ...state, form: emptyForm, error: null, lastSubmitted: null };
    case CREATE_SEARCH_REQUEST_REQUEST:
      return { ...state, submitting: true, error: null, lastSubmitted: null };
    case CREATE_SEARCH_REQUEST_SUCCESS:
      return { ...state, submitting: false, lastSubmitted: action.payload, form: { ...state.form, details: "" }, requests: [action.payload, ...state.requests], total: state.total + 1 };
    case FETCH_SEARCH_REQUESTS_REQUEST:
    case FETCH_SEARCH_REQUEST_REQUEST:
    case UPDATE_SEARCH_REQUEST_REQUEST:
    case DELETE_SEARCH_REQUEST_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_SEARCH_REQUESTS_SUCCESS:
      return { ...state, loading: false, requests: action.payload.items || [], total: action.payload.total || 0, page: action.payload.page || 1, limit: action.payload.limit || 25, pages: action.payload.pages || 0 };
    case FETCH_SEARCH_REQUEST_SUCCESS:
      return { ...state, loading: false, selectedRequest: action.payload };
    case UPDATE_SEARCH_REQUEST_SUCCESS:
      return { ...state, loading: false, requests: state.requests.map((item) => item._id === action.payload._id ? action.payload : item) };
    case DELETE_SEARCH_REQUEST_SUCCESS:
      return { ...state, loading: false, requests: state.requests.filter((item) => item._id !== action.payload), total: Math.max(0, state.total - 1) };
    case CREATE_SEARCH_REQUEST_FAILURE:
      return { ...state, submitting: false, error: action.payload };
    case FETCH_SEARCH_REQUESTS_FAILURE:
    case FETCH_SEARCH_REQUEST_FAILURE:
    case UPDATE_SEARCH_REQUEST_FAILURE:
    case DELETE_SEARCH_REQUEST_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}
