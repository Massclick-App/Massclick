import {
  FETCH_USERS_REQUEST, FETCH_USERS_SUCCESS, FETCH_USERS_FAILURE,
  CREATE_USER_REQUEST, CREATE_USER_SUCCESS, CREATE_USER_FAILURE,
  EDIT_USER_REQUEST, EDIT_USER_SUCCESS, EDIT_USER_FAILURE,
  DELETE_USER_REQUEST, DELETE_USER_SUCCESS, DELETE_USER_FAILURE
} from '../actions/userActionTypes.js';

const initialState = {
  users: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function userReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_USERS_REQUEST:
    case CREATE_USER_REQUEST:
    case EDIT_USER_REQUEST:
    case DELETE_USER_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_USERS_SUCCESS:
      return {
        ...state,
        loading: false,
        users: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null
      };

    case CREATE_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        users: [...state.users, action.payload],
        error: null
      };

    case EDIT_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        users: state.users.map(user =>
          user._id === action.payload._id ? action.payload : user
        ),
        error: null
      };

    case DELETE_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        users: state.users.filter(user =>
          user._id !== action.payload._id
        ),
        error: null
      };

    case FETCH_USERS_FAILURE:
    case CREATE_USER_FAILURE:
    case EDIT_USER_FAILURE:
    case DELETE_USER_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
