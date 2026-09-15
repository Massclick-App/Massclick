import {
  CREATE_AGREEMENT_FAILURE,
  CREATE_AGREEMENT_REQUEST,
  CREATE_AGREEMENT_SUCCESS,
  DELETE_AGREEMENT_FAILURE,
  DELETE_AGREEMENT_REQUEST,
  DELETE_AGREEMENT_SUCCESS,
  EDIT_AGREEMENT_FAILURE,
  EDIT_AGREEMENT_REQUEST,
  EDIT_AGREEMENT_SUCCESS,
  FETCH_AGREEMENTS_FAILURE,
  FETCH_AGREEMENTS_REQUEST,
  FETCH_AGREEMENTS_SUCCESS,
} from "state/actions/userActionTypes.js";

const initialState = {
  agreements: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function agreementReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_AGREEMENTS_REQUEST:
    case CREATE_AGREEMENT_REQUEST:
    case EDIT_AGREEMENT_REQUEST:
    case DELETE_AGREEMENT_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_AGREEMENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        agreements: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
      };

    case CREATE_AGREEMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        agreements: [action.payload, ...state.agreements],
        total: state.total + 1,
      };

    case EDIT_AGREEMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        agreements: state.agreements.map((agreement) =>
          agreement._id === action.payload._id ? action.payload : agreement,
        ),
      };

    case DELETE_AGREEMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        total: Math.max(0, state.total - 1),
        agreements: state.agreements.filter(
          (agreement) => agreement._id !== action.payload._id,
        ),
      };

    case FETCH_AGREEMENTS_FAILURE:
    case CREATE_AGREEMENT_FAILURE:
    case EDIT_AGREEMENT_FAILURE:
    case DELETE_AGREEMENT_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
