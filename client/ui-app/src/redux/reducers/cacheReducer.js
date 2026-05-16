import {
  FETCH_REDIS_STATUS_REQUEST,
  FETCH_REDIS_STATUS_SUCCESS,
  FETCH_REDIS_STATUS_FAILURE,
  INVALIDATE_CACHE_REQUEST,
  INVALIDATE_CACHE_SUCCESS,
  INVALIDATE_CACHE_FAILURE,
  CLEAR_ALL_CACHES_REQUEST,
  CLEAR_ALL_CACHES_SUCCESS,
  CLEAR_ALL_CACHES_FAILURE,
} from "../actions/cacheActionTypes";

const initialState = {
  redisStatus: null,
  redisLoading: false,
  redisError: null,
  cacheClearing: false,
  cacheClearError: null,
  lastClearResult: null,
};

export default function cacheReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_REDIS_STATUS_REQUEST:
      return { ...state, redisLoading: true, redisError: null };
    case FETCH_REDIS_STATUS_SUCCESS:
      return { ...state, redisLoading: false, redisStatus: action.payload };
    case FETCH_REDIS_STATUS_FAILURE:
      return { ...state, redisLoading: false, redisError: action.payload };

    case INVALIDATE_CACHE_REQUEST:
      return { ...state, cacheClearing: true, cacheClearError: null };
    case INVALIDATE_CACHE_SUCCESS:
      return { ...state, cacheClearing: false, lastClearResult: action.payload };
    case INVALIDATE_CACHE_FAILURE:
      return { ...state, cacheClearing: false, cacheClearError: action.payload };

    case CLEAR_ALL_CACHES_REQUEST:
      return { ...state, cacheClearing: true, cacheClearError: null };
    case CLEAR_ALL_CACHES_SUCCESS:
      return { ...state, cacheClearing: false, lastClearResult: action.payload };
    case CLEAR_ALL_CACHES_FAILURE:
      return { ...state, cacheClearing: false, cacheClearError: action.payload };

    default:
      return state;
  }
}
