import {
  FETCH_LOCATION_REQUEST,
  FETCH_LOCATION_SUCCESS,
  FETCH_LOCATION_FAILURE,

  CREATE_LOCATION_REQUEST,
  CREATE_LOCATION_SUCCESS,
  CREATE_LOCATION_FAILURE,

  EDIT_LOCATION_REQUEST,
  EDIT_LOCATION_SUCCESS,
  EDIT_LOCATION_FAILURE,

  DELETE_LOCATION_REQUEST,
  DELETE_LOCATION_SUCCESS,
  DELETE_LOCATION_FAILURE,

  FETCH_IP_LOCATION_REQUEST,
  FETCH_IP_LOCATION_SUCCESS,
  FETCH_IP_LOCATION_FAILURE,

  DETECT_DISTRICT_REQUEST,
  DETECT_DISTRICT_SUCCESS,
  DETECT_DISTRICT_FAILURE
} from "../actions/userActionTypes";

const initialState = {
  location: [],
  ipLocation: null,
  detectedDistrict: null,
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function locationReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_LOCATION_REQUEST:
    case CREATE_LOCATION_REQUEST:
    case EDIT_LOCATION_REQUEST:
    case DELETE_LOCATION_REQUEST:
    case FETCH_IP_LOCATION_REQUEST:
    case DETECT_DISTRICT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        location: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
        error: null
      };

    case CREATE_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        location: [...state.location, action.payload],
        error: null
      };

    case EDIT_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        location: state.location.map((loc) =>
          loc._id === action.payload._id ? action.payload : loc
        ),
        error: null
      };

    case DELETE_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        location: state.location.filter(
          (loc) => loc._id !== action.payload._id
        ),
        error: null
      };

    case FETCH_IP_LOCATION_SUCCESS:
      return {
        ...state,
        loading: false,
        ipLocation: action.payload,
        error: null
      };

    case DETECT_DISTRICT_SUCCESS:
      return {
        ...state,
        loading: false,
        detectedDistrict: action.payload,
        error: null
      };


    case FETCH_LOCATION_FAILURE:
    case CREATE_LOCATION_FAILURE:
    case EDIT_LOCATION_FAILURE:
    case DELETE_LOCATION_FAILURE:
    case FETCH_IP_LOCATION_FAILURE:
    case DETECT_DISTRICT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    default:
      return state;
  }
}
