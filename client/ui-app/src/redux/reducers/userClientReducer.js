import {
  FETCH_USERSCLIENT_REQUEST,
  FETCH_USERSCLIENT_SUCCESS,
  FETCH_USERSCLIENT_FAILURE,

  CREATE_USERCLIENT_REQUEST,
  CREATE_USERCLIENT_SUCCESS,
  CREATE_USERCLIENT_FAILURE,

  EDIT_USERCLIENT_REQUEST,
  EDIT_USERCLIENT_SUCCESS,
  EDIT_USERCLIENT_FAILURE,

  DELETE_USERCLIENT_REQUEST,
  DELETE_USERCLIENT_SUCCESS,
  DELETE_USERCLIENT_FAILURE,

  SEARCH_USERCLIENTSSUGGESTION_REQUEST,
  SEARCH_USERCLIENTSSUGGESTION_SUCCESS,
  SEARCH_USERCLIENTSSUGGESTION_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  userClient: [],
  searchSuggestion: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function userClientReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_USERSCLIENT_REQUEST:
    case CREATE_USERCLIENT_REQUEST:
    case EDIT_USERCLIENT_REQUEST:
    case DELETE_USERCLIENT_REQUEST:
    case SEARCH_USERCLIENTSSUGGESTION_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_USERSCLIENT_SUCCESS:
      return {
        ...state,
        loading: false,
        userClient: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null,
      };

    case SEARCH_USERCLIENTSSUGGESTION_SUCCESS:
      return {
        ...state,
        loading: false,
        searchSuggestion: action.payload,
        error: null,
      };

    case CREATE_USERCLIENT_SUCCESS:
      return {
        ...state,
        loading: false,
        userClient: [...state.userClient, action.payload],
        error: null,
      };

    case EDIT_USERCLIENT_SUCCESS:
      return {
        ...state,
        loading: false,
        userClient: state.userClient.map((user) =>
          user._id === action.payload._id ? action.payload : user
        ),
        error: null,
      };

    case DELETE_USERCLIENT_SUCCESS:
      return {
        ...state,
        loading: false,
        userClient: state.userClient.filter(
          (user) => user._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_USERSCLIENT_FAILURE:
    case CREATE_USERCLIENT_FAILURE:
    case EDIT_USERCLIENT_FAILURE:
    case DELETE_USERCLIENT_FAILURE:
    case SEARCH_USERCLIENTSSUGGESTION_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
