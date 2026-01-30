import {
  FETCH_REVIEWS_REQUEST,
  FETCH_REVIEWS_SUCCESS,
  FETCH_REVIEWS_FAILURE,
  CREATE_REVIEW_REQUEST,
  CREATE_REVIEW_SUCCESS,
  CREATE_REVIEW_FAILURE,
  REPLY_REVIEW_REQUEST,
  REPLY_REVIEW_SUCCESS,
  REPLY_REVIEW_FAILURE,
  HELPFUL_REVIEW_SUCCESS,
  REPORT_REVIEW_SUCCESS
} from "../actions/userActionTypes";

const initialState = {
  reviews: [],
  loading: false,
  error: null
};

export default function reviewReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_REVIEWS_REQUEST:
    case CREATE_REVIEW_REQUEST:
    case REPLY_REVIEW_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_REVIEWS_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: Array.isArray(action.payload?.reviews)
          ? action.payload.reviews
          : []
      };

    case CREATE_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: [
          action.payload,
          ...state.reviews
        ]
      };

    case REPLY_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: state.reviews.map(r =>
          r._id === action.payload._id
            ? { ...r, replies: action.payload.replies }
            : r
        )
      };

    case HELPFUL_REVIEW_SUCCESS:
      return {
        ...state,
        reviews: state.reviews.map(r =>
          r._id === action.payload._id
            ? {
                ...r,
                helpfulCount: action.payload.helpfulCount,
                helpfulBy: action.payload.helpfulBy
              }
            : r
        )
      };

    case REPORT_REVIEW_SUCCESS:
      return {
        ...state,
        reviews: state.reviews.filter(
          r => r._id !== action.payload
        )
      };

    case FETCH_REVIEWS_FAILURE:
    case CREATE_REVIEW_FAILURE:
    case REPLY_REVIEW_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
}
