import {
  FETCH_AD_REQUEST, FETCH_AD_SUCCESS, FETCH_AD_FAILURE,
  CREATE_AD_REQUEST, CREATE_AD_SUCCESS, CREATE_AD_FAILURE,
  EDIT_AD_REQUEST, EDIT_AD_SUCCESS, EDIT_AD_FAILURE,
  DELETE_AD_REQUEST, DELETE_AD_SUCCESS, DELETE_AD_FAILURE,
  VIEWCATEGORY_AD_REQUEST, VIEWCATEGORY_AD_SUCCESS, VIEWCATEGORY_AD_FAILURE
} from "../actions/userActionTypes.js";

const initialState = {
  advertisements: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
  categoryAdvertisements: [],

};

export default function advertisementReducer(state = initialState, action) {
  switch (action.type) {

    case VIEWCATEGORY_AD_REQUEST:
      return { ...state, loading: true, error: null };

    case VIEWCATEGORY_AD_SUCCESS:
      return {
        ...state,
        loading: false,
        categoryAdvertisements: action.payload,
      };


    case VIEWCATEGORY_AD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_AD_REQUEST:
    case CREATE_AD_REQUEST:
    case EDIT_AD_REQUEST:
    case DELETE_AD_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_AD_SUCCESS:
      return {
        ...state,
        loading: false,
        advertisements: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
      };

    case CREATE_AD_SUCCESS:
      return {
        ...state,
        loading: false,
        advertisements: [...state.advertisements, action.payload],
      };

    case EDIT_AD_SUCCESS:
      return {
        ...state,
        loading: false,
        advertisements: state.advertisements.map((ad) =>
          ad._id === action.payload._id ? action.payload : ad
        ),
      };

    case DELETE_AD_SUCCESS:
      return {
        ...state,
        loading: false,
        advertisements: state.advertisements.filter(
          (ad) => ad._id !== action.payload._id
        ),
      };

    case FETCH_AD_FAILURE:
    case CREATE_AD_FAILURE:
    case EDIT_AD_FAILURE:
    case DELETE_AD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
