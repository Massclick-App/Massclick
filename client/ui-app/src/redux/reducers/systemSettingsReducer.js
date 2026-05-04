import {
  FETCH_SYSTEM_SETTINGS_REQUEST,
  FETCH_SYSTEM_SETTINGS_SUCCESS,
  FETCH_SYSTEM_SETTINGS_FAILURE,
  UPDATE_SYSTEM_SETTINGS_REQUEST,
  UPDATE_SYSTEM_SETTINGS_SUCCESS,
  UPDATE_SYSTEM_SETTINGS_FAILURE,
} from "../actions/systemSettingsActionTypes";

const initialState = {
  settings: null,
  loading: false,
  error: null,
  saving: false,
  saveError: null,
};

export default function systemSettingsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_SYSTEM_SETTINGS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_SYSTEM_SETTINGS_SUCCESS:
      return { ...state, loading: false, settings: action.payload };
    case FETCH_SYSTEM_SETTINGS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case UPDATE_SYSTEM_SETTINGS_REQUEST:
      return { ...state, saving: true, saveError: null };
    case UPDATE_SYSTEM_SETTINGS_SUCCESS:
      return { ...state, saving: false, settings: action.payload };
    case UPDATE_SYSTEM_SETTINGS_FAILURE:
      return { ...state, saving: false, saveError: action.payload };

    default:
      return state;
  }
}
