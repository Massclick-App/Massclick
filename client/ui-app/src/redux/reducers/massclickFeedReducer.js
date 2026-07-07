import {
  CREATE_MASSCLICK_FEED_POST_FAILURE,
  CREATE_MASSCLICK_FEED_POST_REQUEST,
  CREATE_MASSCLICK_FEED_POST_SUCCESS,
  FETCH_MASSCLICK_FEED_FAILURE,
  FETCH_MASSCLICK_FEED_REQUEST,
  FETCH_MASSCLICK_FEED_SUCCESS,
  MASSCLICK_FEED_ACTION_FAILURE,
  UPDATE_MASSCLICK_FEED_POST_SUCCESS,
} from "../actions/userActionTypes.js";

const initialState = {
  posts: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function massclickFeedReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MASSCLICK_FEED_REQUEST:
    case CREATE_MASSCLICK_FEED_POST_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_MASSCLICK_FEED_SUCCESS:
      return {
        ...state,
        loading: false,
        posts: action.payload.data || [],
        total: action.payload.total || 0,
        pageNo: action.payload.pageNo || 1,
        pageSize: action.payload.pageSize || 10,
      };

    case CREATE_MASSCLICK_FEED_POST_SUCCESS:
      return {
        ...state,
        loading: false,
        posts: [action.payload, ...state.posts],
        total: state.total + 1,
      };

    case UPDATE_MASSCLICK_FEED_POST_SUCCESS:
      return {
        ...state,
        loading: false,
        posts: state.posts.map((post) =>
          post._id === action.payload._id ? action.payload : post
        ),
      };

    case FETCH_MASSCLICK_FEED_FAILURE:
    case CREATE_MASSCLICK_FEED_POST_FAILURE:
    case MASSCLICK_FEED_ACTION_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
