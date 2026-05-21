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
  FETCH_REDIS_KEYS_REQUEST,
  FETCH_REDIS_KEYS_SUCCESS,
  FETCH_REDIS_KEYS_FAILURE,
  DELETE_REDIS_KEYS_REQUEST,
  DELETE_REDIS_KEYS_SUCCESS,
  DELETE_REDIS_KEYS_FAILURE,
  FETCH_REDIS_INFO_REQUEST,
  FETCH_REDIS_INFO_SUCCESS,
  FETCH_REDIS_INFO_FAILURE,
  FLUSH_REDIS_DB_REQUEST,
  FLUSH_REDIS_DB_SUCCESS,
  FLUSH_REDIS_DB_FAILURE,
  DELETE_REDIS_PATTERN_REQUEST,
  DELETE_REDIS_PATTERN_SUCCESS,
  DELETE_REDIS_PATTERN_FAILURE,
} from "../actions/cacheActionTypes";

const initialState = {
  redisStatus: null,
  redisLoading: false,
  redisError: null,
  cacheClearing: false,
  cacheClearError: null,
  lastClearResult: null,
  redisKeys: [],
  keysLoading: false,
  keysError: null,
  keysDeleting: false,
  keysDeleteError: null,
  redisInfo: null,
  infoLoading: false,
  infoError: null,
  flushing: false,
  patternDeleting: false,
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

    case FETCH_REDIS_KEYS_REQUEST:
      return { ...state, keysLoading: true, keysError: null };
    case FETCH_REDIS_KEYS_SUCCESS:
      return { ...state, keysLoading: false, redisKeys: action.payload?.keys || [] };
    case FETCH_REDIS_KEYS_FAILURE:
      return { ...state, keysLoading: false, keysError: action.payload };

    case DELETE_REDIS_KEYS_REQUEST:
      return { ...state, keysDeleting: true, keysDeleteError: null };
    case DELETE_REDIS_KEYS_SUCCESS:
      return { ...state, keysDeleting: false };
    case DELETE_REDIS_KEYS_FAILURE:
      return { ...state, keysDeleting: false, keysDeleteError: action.payload };

    case FETCH_REDIS_INFO_REQUEST:
      return { ...state, infoLoading: true, infoError: null };
    case FETCH_REDIS_INFO_SUCCESS:
      return { ...state, infoLoading: false, redisInfo: action.payload };
    case FETCH_REDIS_INFO_FAILURE:
      return { ...state, infoLoading: false, infoError: action.payload };

    case FLUSH_REDIS_DB_REQUEST:
      return { ...state, flushing: true };
    case FLUSH_REDIS_DB_SUCCESS:
      return { ...state, flushing: false, redisKeys: [] };
    case FLUSH_REDIS_DB_FAILURE:
      return { ...state, flushing: false };

    case DELETE_REDIS_PATTERN_REQUEST:
      return { ...state, patternDeleting: true };
    case DELETE_REDIS_PATTERN_SUCCESS:
      return { ...state, patternDeleting: false };
    case DELETE_REDIS_PATTERN_FAILURE:
      return { ...state, patternDeleting: false };

    default:
      return state;
  }
}
