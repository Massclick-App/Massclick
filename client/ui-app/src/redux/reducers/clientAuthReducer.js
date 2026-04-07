// clientAuthReducer.js
import {
  CLIENT_AUTH_REQUEST,
  CLIENT_AUTH_SUCCESS,
  CLIENT_AUTH_FAILURE,
  CLIENT_LOGOUT,
} from "../actions/clientAuthAction.js";

const initialState = {
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  loading: false,
  error: null,
};

export default function clientAuthReducer(state = initialState, action) {
  switch (action.type) {
    case CLIENT_AUTH_REQUEST:
      return { ...state, loading: true, error: null };

    case CLIENT_AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        accessTokenExpiresAt: action.payload.accessTokenExpiresAt,
        error: null,
      };

    case CLIENT_AUTH_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case CLIENT_LOGOUT:
      return { ...initialState };

    default:
      return state;
  }
}
