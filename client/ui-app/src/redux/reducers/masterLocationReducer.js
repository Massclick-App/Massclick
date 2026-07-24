import {
  FETCH_MASTER_LOCATION_REQUEST,
  FETCH_MASTER_LOCATION_SUCCESS,
  FETCH_MASTER_LOCATION_FAILURE,

  CREATE_MASTER_LOCATION_REQUEST,
  CREATE_MASTER_LOCATION_SUCCESS,
  CREATE_MASTER_LOCATION_FAILURE,

  EDIT_MASTER_LOCATION_REQUEST,
  EDIT_MASTER_LOCATION_SUCCESS,
  EDIT_MASTER_LOCATION_FAILURE,

  DELETE_MASTER_LOCATION_REQUEST,
  DELETE_MASTER_LOCATION_SUCCESS,
  DELETE_MASTER_LOCATION_FAILURE,

  SEARCH_MASTER_LOCATION_REQUEST,
  SEARCH_MASTER_LOCATION_SUCCESS,
  SEARCH_MASTER_LOCATION_FAILURE,

  FETCH_PUBLIC_DISTRICTS_REQUEST,
  FETCH_PUBLIC_DISTRICTS_SUCCESS,
  FETCH_PUBLIC_DISTRICTS_FAILURE
} from "../actions/userActionTypes";

const initialState = {
  masterLocation: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,

  // Free-text location search (hero search bar autocomplete) — kept separate
  // from the admin list state above so one doesn't clobber the other.
  locationSearchResults: [],
  locationSearchLoading: false,
  locationSearchQuery: "",

  // Storefront district picker options — fetched once and shared by every
  // search bar via redux instead of each one hitting the endpoint itself.
  districts: [],
  districtsLoading: false,
};

export default function masterLocationReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_MASTER_LOCATION_REQUEST:
    case CREATE_MASTER_LOCATION_REQUEST:
    case EDIT_MASTER_LOCATION_REQUEST:
    case DELETE_MASTER_LOCATION_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_MASTER_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        masterLocation: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null,
      };

    case CREATE_MASTER_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        masterLocation: [...state.masterLocation, action.payload],
        error: null,
      };

    case EDIT_MASTER_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        masterLocation: state.masterLocation.map((loc) =>
          loc._id === action.payload._id ? action.payload : loc
        ),
        error: null,
      };

    case DELETE_MASTER_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        masterLocation: state.masterLocation.filter(
          (loc) => loc._id !== action.payload._id
        ),
        error: null,
      };

    case SEARCH_MASTER_LOCATION_REQUEST:
      return {
        ...state,
        locationSearchLoading: true,
        locationSearchQuery: action.meta?.query ?? state.locationSearchQuery,
      };

    case SEARCH_MASTER_LOCATION_SUCCESS:
      return {
        ...state,
        locationSearchLoading: false,
        locationSearchResults: action.payload.data,
        locationSearchQuery: action.payload.query,
      };

    case SEARCH_MASTER_LOCATION_FAILURE:
      return {
        ...state,
        locationSearchLoading: false,
        locationSearchResults: [],
      };

    case FETCH_PUBLIC_DISTRICTS_REQUEST:
      return {
        ...state,
        districtsLoading: true,
      };

    case FETCH_PUBLIC_DISTRICTS_SUCCESS:
      return {
        ...state,
        districtsLoading: false,
        districts: action.payload,
      };

    case FETCH_PUBLIC_DISTRICTS_FAILURE:
      return {
        ...state,
        districtsLoading: false,
      };

    case FETCH_MASTER_LOCATION_FAILURE:
    case CREATE_MASTER_LOCATION_FAILURE:
    case EDIT_MASTER_LOCATION_FAILURE:
    case DELETE_MASTER_LOCATION_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
