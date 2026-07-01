import {
  CREATE_QUOTATION_REQUEST,
  CREATE_QUOTATION_SUCCESS,
  CREATE_QUOTATION_FAILURE,
  FETCH_QUOTATION_REQUEST,
  FETCH_QUOTATION_SUCCESS,
  FETCH_QUOTATION_FAILURE,
  EDIT_QUOTATION_REQUEST,
  EDIT_QUOTATION_SUCCESS,
  EDIT_QUOTATION_FAILURE,
  DELETE_QUOTATION_REQUEST,
  DELETE_QUOTATION_SUCCESS,
  DELETE_QUOTATION_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  quotations: [],
  total: 0,
  pageNo: 1,
  pageSize: 25,
  totalPages: 1,
  loading: false,
  error: null,
};

export default function quotationReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_QUOTATION_REQUEST:
    case CREATE_QUOTATION_REQUEST:
    case EDIT_QUOTATION_REQUEST:
    case DELETE_QUOTATION_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        quotations: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        totalPages: action.payload.totalPages,
        error: null,
      };

    case CREATE_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        quotations: [action.payload, ...state.quotations],
        total: state.total + 1,
        error: null,
      };

    case EDIT_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        quotations: state.quotations.map((quotation) =>
          quotation._id === action.payload._id ? action.payload : quotation
        ),
        error: null,
      };

    case DELETE_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        quotations: state.quotations.filter(
          (quotation) => quotation._id !== action.payload
        ),
        total: Math.max(0, state.total - 1),
        error: null,
      };

    case FETCH_QUOTATION_FAILURE:
    case CREATE_QUOTATION_FAILURE:
    case EDIT_QUOTATION_FAILURE:
    case DELETE_QUOTATION_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
