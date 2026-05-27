import {
  FETCH_CATEGORY_DISPLAY_SETTINGS_REQUEST,
  FETCH_CATEGORY_DISPLAY_SETTINGS_SUCCESS,
  FETCH_CATEGORY_DISPLAY_SETTINGS_FAILURE,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_REQUEST,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_SUCCESS,
  UPDATE_CATEGORY_DISPLAY_SETTINGS_FAILURE,
  FETCH_ALL_CATEGORIES_FOR_PICKER_REQUEST,
  FETCH_ALL_CATEGORIES_FOR_PICKER_SUCCESS,
  FETCH_ALL_CATEGORIES_FOR_PICKER_FAILURE,
} from '../actions/categoryDisplaySettingsActionTypes';

const initialState = {
  settings: null,
  allCategories: [],
  loading: false,
  error: null,
  saving: false,
  saveError: null,
  pickerLoading: false,
};

export default function categoryDisplaySettingsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_CATEGORY_DISPLAY_SETTINGS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_CATEGORY_DISPLAY_SETTINGS_SUCCESS:
      return { ...state, loading: false, settings: action.payload };
    case FETCH_CATEGORY_DISPLAY_SETTINGS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case UPDATE_CATEGORY_DISPLAY_SETTINGS_REQUEST:
      return { ...state, saving: true, saveError: null };
    case UPDATE_CATEGORY_DISPLAY_SETTINGS_SUCCESS:
      return { ...state, saving: false, settings: action.payload };
    case UPDATE_CATEGORY_DISPLAY_SETTINGS_FAILURE:
      return { ...state, saving: false, saveError: action.payload };

    case FETCH_ALL_CATEGORIES_FOR_PICKER_REQUEST:
      return { ...state, pickerLoading: true };
    case FETCH_ALL_CATEGORIES_FOR_PICKER_SUCCESS:
      return { ...state, pickerLoading: false, allCategories: action.payload };
    case FETCH_ALL_CATEGORIES_FOR_PICKER_FAILURE:
      return { ...state, pickerLoading: false };

    default:
      return state;
  }
}
