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
  total: 0,
  page: 1,
  hasMore: false,
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
        reviews: action.payload?.reviews || [],
        total: action.payload?.total || 0,
        hasMore: action.payload?.hasMore || false,
        page: action.payload?.page || 1
      };

    case CREATE_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: [
          action.payload,
          ...state.reviews
        ],
        total: state.total + 1
      };

    case REPLY_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: state.reviews.map(review =>
          review._id === action.payload._id
            ? {
                ...review,
                replies: action.payload.replies
              }
            : review
        )
      };

    case HELPFUL_REVIEW_SUCCESS:
      return {
        ...state,
        reviews: state.reviews.map(review =>
          review._id === action.payload._id
            ? {
                ...review,
                helpfulCount: action.payload.helpfulCount,
                helpfulBy: action.payload.helpfulBy
              }
            : review
        )
      };

    case REPORT_REVIEW_SUCCESS:
      return {
        ...state,
        reviews: state.reviews.filter(
          review => review._id !== action.payload
        ),
        total: state.total > 0 ? state.total - 1 : 0
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
