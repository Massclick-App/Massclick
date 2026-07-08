import {
  CREATE_USER_FEEDBACK_FAILURE,
  CREATE_USER_FEEDBACK_REQUEST,
  CREATE_USER_FEEDBACK_SUCCESS,
  FETCH_USER_FEEDBACK_FAILURE,
  FETCH_USER_FEEDBACK_REQUEST,
  FETCH_USER_FEEDBACK_SUCCESS,
  UPDATE_USER_FEEDBACK_SUCCESS,
  USER_FEEDBACK_ACTION_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  feedbacks: [],
  total: 0,
  pageNo: 1,
  pageSize: 20,
  loading: false,
  submitting: false,
  error: null,
  lastSubmitted: null,
};

export default function userFeedbackReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_USER_FEEDBACK_REQUEST:
      return { ...state, submitting: true, error: null };

    case FETCH_USER_FEEDBACK_REQUEST:
      return { ...state, loading: true, error: null };

    case CREATE_USER_FEEDBACK_SUCCESS:
      return {
        ...state,
        submitting: false,
        lastSubmitted: action.payload,
        feedbacks: [action.payload, ...state.feedbacks],
        total: state.total + 1,
      };

    case FETCH_USER_FEEDBACK_SUCCESS:
      return {
        ...state,
        loading: false,
        feedbacks: action.payload.data || [],
        total: action.payload.total || 0,
        pageNo: action.payload.pageNo || 1,
        pageSize: action.payload.pageSize || 20,
      };

    case UPDATE_USER_FEEDBACK_SUCCESS:
      return {
        ...state,
        loading: false,
        feedbacks: state.feedbacks.map((feedback) =>
          feedback._id === action.payload._id ? action.payload : feedback
        ),
      };

    case CREATE_USER_FEEDBACK_FAILURE:
      return { ...state, submitting: false, error: action.payload };

    case FETCH_USER_FEEDBACK_FAILURE:
    case USER_FEEDBACK_ACTION_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
