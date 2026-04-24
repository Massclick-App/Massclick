import {
  FETCH_FAVORITES_REQUEST,
  FETCH_FAVORITES_SUCCESS,
  FETCH_FAVORITES_FAILURE,
  ADD_FAVORITE_REQUEST,
  ADD_FAVORITE_SUCCESS,
  ADD_FAVORITE_FAILURE,
  REMOVE_FAVORITE_REQUEST,
  REMOVE_FAVORITE_SUCCESS,
  REMOVE_FAVORITE_FAILURE,
} from "../actions/favoriteAction";

const initialState = {
  favorites: [],
  favoriteIds: [],
  togglingIds: [],
  loading: false,
  error: null,
};

export default function favoriteReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_FAVORITES_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_FAVORITES_SUCCESS:
      return {
        ...state,
        loading: false,
        favorites: action.payload,
        favoriteIds: action.payload.map((b) => b._id),
        error: null,
      };

    case FETCH_FAVORITES_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case ADD_FAVORITE_REQUEST:
      return { ...state, togglingIds: [...state.togglingIds, action.payload] };

    case ADD_FAVORITE_SUCCESS:
      return {
        ...state,
        togglingIds: state.togglingIds.filter((id) => id !== action.payload),
        favoriteIds: state.favoriteIds.includes(action.payload)
          ? state.favoriteIds
          : [...state.favoriteIds, action.payload],
      };

    case ADD_FAVORITE_FAILURE:
      return {
        ...state,
        togglingIds: state.togglingIds.filter((id) => id !== action.payload.businessId),
      };

    case REMOVE_FAVORITE_REQUEST:
      return { ...state, togglingIds: [...state.togglingIds, action.payload] };

    case REMOVE_FAVORITE_SUCCESS:
      return {
        ...state,
        togglingIds: state.togglingIds.filter((id) => id !== action.payload),
        favoriteIds: state.favoriteIds.filter((id) => id !== action.payload),
        favorites: state.favorites.filter((b) => b._id !== action.payload),
      };

    case REMOVE_FAVORITE_FAILURE:
      return {
        ...state,
        togglingIds: state.togglingIds.filter((id) => id !== action.payload.businessId),
      };

    default:
      return state;
  }
}
