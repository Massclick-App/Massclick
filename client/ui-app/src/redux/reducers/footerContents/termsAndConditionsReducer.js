// src/redux/reducers/termsAndConditionsReducer.js

import {
  FETCH_TERMS_REQUEST,
  FETCH_TERMS_SUCCESS,
  FETCH_TERMS_FAILURE,

  CREATE_TERMS_REQUEST,
  CREATE_TERMS_SUCCESS,
  CREATE_TERMS_FAILURE,

  EDIT_TERMS_REQUEST,
  EDIT_TERMS_SUCCESS,
  EDIT_TERMS_FAILURE,

  DELETE_TERMS_REQUEST,
  DELETE_TERMS_SUCCESS,
  DELETE_TERMS_FAILURE,
} from "../../actions/userActionTypes.js";

const initialState = {
  termsList: [],
  total: 0,
  loading: false,
  error: null,
};

export default function termsAndConditionsReducer(
  state = initialState,
  action
) {
  switch (action.type) {
    case FETCH_TERMS_REQUEST:
    case CREATE_TERMS_REQUEST:
    case EDIT_TERMS_REQUEST:
    case DELETE_TERMS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_TERMS_SUCCESS:
      return {
        ...state,
        loading: false,
        termsList: Array.isArray(action.payload?.data)
          ? action.payload.data
          : [],
        total: action.payload?.total || 0,
        error: null,
      };

    case CREATE_TERMS_SUCCESS:
      return {
        ...state,
        loading: false,
        termsList: [action.payload, ...state.termsList],
        error: null,
      };

    case EDIT_TERMS_SUCCESS:
      return {
        ...state,
        loading: false,
        termsList: state.termsList.map((item) =>
          item._id === action.payload._id ? action.payload : item
        ),
        error: null,
      };

    case DELETE_TERMS_SUCCESS:
      return {
        ...state,
        loading: false,
        termsList: state.termsList.filter(
          (item) => item._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_TERMS_FAILURE:
    case CREATE_TERMS_FAILURE:
    case EDIT_TERMS_FAILURE:
    case DELETE_TERMS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}