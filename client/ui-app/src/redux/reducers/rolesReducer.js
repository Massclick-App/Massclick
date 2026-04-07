import {
  FETCH_ROLES_REQUEST, FETCH_ROLES_SUCCESS, FETCH_ROLES_FAILURE,
  CREATE_ROLES_REQUEST, CREATE_ROLES_SUCCESS, CREATE_ROLES_FAILURE,
  EDIT_ROLES_REQUEST, EDIT_ROLES_SUCCESS, EDIT_ROLES_FAILURE,
  DELETE_ROLES_REQUEST, DELETE_ROLES_SUCCESS, DELETE_ROLES_FAILURE
} from '../actions/userActionTypes';

const initialState = {
  roles: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function rolesReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_ROLES_REQUEST:
    case CREATE_ROLES_REQUEST:
    case EDIT_ROLES_REQUEST:
    case DELETE_ROLES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_ROLES_SUCCESS:
      return {
        ...state,
        loading: false,
        roles: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null
      };

    case CREATE_ROLES_SUCCESS:
      return {
        ...state,
        loading: false,
        roles: [...state.roles, action.payload],
        error: null,
      };

    case EDIT_ROLES_SUCCESS:
      return {
        ...state,
        loading: false,
        roles: state.roles.map((rol) =>
          rol._id === action.payload._id ? action.payload : rol
        ),
        error: null,
      };

    case DELETE_ROLES_SUCCESS:
      return {
        ...state,
        loading: false,
        roles: state.roles.filter((rol) =>
          rol._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_ROLES_FAILURE:
    case CREATE_ROLES_FAILURE:
    case EDIT_ROLES_FAILURE:
    case DELETE_ROLES_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
