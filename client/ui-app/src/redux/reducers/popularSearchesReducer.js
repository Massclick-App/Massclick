import {
  FETCH_ENQUIRYNOW_REQUEST,
  FETCH_ENQUIRYNOW_SUCCESS,
  FETCH_ENQUIRYNOW_FAILURE,
  CREATE_ENQUIRYNOW_REQUEST,
  CREATE_ENQUIRYNOW_SUCCESS,
  CREATE_ENQUIRYNOW_FAILURE,
} from "../actions/userActionTypes";

const initialState = {
  enquiries: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function enquiryNowReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_ENQUIRYNOW_REQUEST:
    case CREATE_ENQUIRYNOW_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_ENQUIRYNOW_SUCCESS:
      return {
        ...state,
        loading: false,
        enquiries: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
      };

    case CREATE_ENQUIRYNOW_SUCCESS:
      return {
        ...state,
        loading: false,
        enquiries: [action.payload, ...state.enquiries],
      };

    case FETCH_ENQUIRYNOW_FAILURE:
    case CREATE_ENQUIRYNOW_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
