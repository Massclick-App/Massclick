import {
  FETCH_PUBLICIZE_REQUEST,
  FETCH_PUBLICIZE_SUCCESS,
  FETCH_PUBLICIZE_FAILURE,
  CREATE_PUBLICIZE_REQUEST,
  CREATE_PUBLICIZE_SUCCESS,
  CREATE_PUBLICIZE_FAILURE,
  EDIT_PUBLICIZE_REQUEST,
  EDIT_PUBLICIZE_SUCCESS,
  EDIT_PUBLICIZE_FAILURE,
  DELETE_PUBLICIZE_REQUEST,
  DELETE_PUBLICIZE_SUCCESS,
  DELETE_PUBLICIZE_FAILURE,
} from "../actions/userActionTypes";

const initialState = {
  publicizes: [],
  loading: false,
  error: null,
};

export default function publicizeReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_PUBLICIZE_REQUEST:
    case CREATE_PUBLICIZE_REQUEST:
    case EDIT_PUBLICIZE_REQUEST:
    case DELETE_PUBLICIZE_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_PUBLICIZE_SUCCESS:
      return {
        ...state,
        loading: false,
        publicizes: action.payload,
        error: null,
      };

    case CREATE_PUBLICIZE_SUCCESS:
      return {
        ...state,
        loading: false,
        publicizes: [action.payload, ...state.publicizes],
        error: null,
      };

    case EDIT_PUBLICIZE_SUCCESS:
      return {
        ...state,
        loading: false,
        publicizes: state.publicizes.map((adv) =>
          adv._id === action.payload._id ? action.payload : adv
        ),
        error: null,
      };

    case DELETE_PUBLICIZE_SUCCESS:
      return {
        ...state,
        loading: false,
        publicizes: state.publicizes.filter(
          (adv) => adv._id !== action.payload._id
        ),
        error: null,
      };

    case FETCH_PUBLICIZE_FAILURE:
    case CREATE_PUBLICIZE_FAILURE:
    case EDIT_PUBLICIZE_FAILURE:
    case DELETE_PUBLICIZE_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
