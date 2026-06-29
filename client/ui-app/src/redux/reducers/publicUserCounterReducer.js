import {
  FETCH_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  FETCH_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  FETCH_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
  FETCH_PUBLIC_USER_COUNTER_FAILURE,
  FETCH_PUBLIC_USER_COUNTER_REQUEST,
  FETCH_PUBLIC_USER_COUNTER_SUCCESS,
  RESET_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  RESET_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  RESET_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_FAILURE,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_REQUEST,
  UPDATE_ADMIN_PUBLIC_USER_COUNTER_SUCCESS,
} from "../actions/publicUserCounterActionTypes.js";

const initialState = {
  publicSettings: null,
  adminSettings: null,
  loading: false,
  adminLoading: false,
  saving: false,
  error: null,
  adminError: null,
  saveError: null,
};

export default function publicUserCounterReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_PUBLIC_USER_COUNTER_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_PUBLIC_USER_COUNTER_SUCCESS:
      return { ...state, loading: false, publicSettings: action.payload };
    case FETCH_PUBLIC_USER_COUNTER_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_ADMIN_PUBLIC_USER_COUNTER_REQUEST:
      return { ...state, adminLoading: true, adminError: null };
    case FETCH_ADMIN_PUBLIC_USER_COUNTER_SUCCESS:
      return { ...state, adminLoading: false, adminSettings: action.payload };
    case FETCH_ADMIN_PUBLIC_USER_COUNTER_FAILURE:
      return { ...state, adminLoading: false, adminError: action.payload };

    case UPDATE_ADMIN_PUBLIC_USER_COUNTER_REQUEST:
    case RESET_ADMIN_PUBLIC_USER_COUNTER_REQUEST:
      return { ...state, saving: true, saveError: null };
    case UPDATE_ADMIN_PUBLIC_USER_COUNTER_SUCCESS:
    case RESET_ADMIN_PUBLIC_USER_COUNTER_SUCCESS:
      return {
        ...state,
        saving: false,
        adminSettings: action.payload,
        publicSettings: action.payload,
      };
    case UPDATE_ADMIN_PUBLIC_USER_COUNTER_FAILURE:
    case RESET_ADMIN_PUBLIC_USER_COUNTER_FAILURE:
      return { ...state, saving: false, saveError: action.payload };

    default:
      return state;
  }
}
