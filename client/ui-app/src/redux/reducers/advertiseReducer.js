import {
  FETCH_ADVERTISE_REQUEST,
  FETCH_ADVERTISE_SUCCESS,
  FETCH_ADVERTISE_FAILURE,
  CREATE_ADVERTISE_REQUEST,
  CREATE_ADVERTISE_SUCCESS,
  CREATE_ADVERTISE_FAILURE,
  EDIT_ADVERTISE_REQUEST,
  EDIT_ADVERTISE_SUCCESS,
  EDIT_ADVERTISE_FAILURE,
  DELETE_ADVERTISE_REQUEST,
  DELETE_ADVERTISE_SUCCESS,
  DELETE_ADVERTISE_FAILURE,
} from "../actions/userActionTypes";

const initialState = {
  advertises: [],
  loading: false,
  error: null,
};

export default function advertiseReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_ADVERTISE_REQUEST:
    case CREATE_ADVERTISE_REQUEST:
    case EDIT_ADVERTISE_REQUEST:
    case DELETE_ADVERTISE_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_ADVERTISE_SUCCESS:
      return {
        ...state,
        loading: false,
        advertises: action.payload,
        error: null,
      };

    case CREATE_ADVERTISE_SUCCESS:
      return {
        ...state,
        loading: false,
        advertises: [action.payload, ...state.advertises],
        error: null,
      };

    case EDIT_ADVERTISE_SUCCESS:
      return {
        ...state,
        loading: false,
        advertises: state.advertises.map((adv) =>
          adv._id === action.payload._id ? action.payload : adv
        ),
        error: null,
      };

    case DELETE_ADVERTISE_SUCCESS:
      return {
        ...state,
        loading: false,
        advertises: state.advertises.filter(
          (adv) => adv._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_ADVERTISE_FAILURE:
    case CREATE_ADVERTISE_FAILURE:
    case EDIT_ADVERTISE_FAILURE:
    case DELETE_ADVERTISE_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
