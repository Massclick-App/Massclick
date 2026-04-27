import {
  FETCH_FCM_USERS_REQUEST, FETCH_FCM_USERS_SUCCESS, FETCH_FCM_USERS_FAILURE,
  SEND_FCM_MARKETING_REQUEST, SEND_FCM_MARKETING_SUCCESS, SEND_FCM_MARKETING_FAILURE,
  FETCH_FCM_CAMPAIGNS_REQUEST, FETCH_FCM_CAMPAIGNS_SUCCESS, FETCH_FCM_CAMPAIGNS_FAILURE,
} from "../actions/fcmMarketingActionTypes";

const initialState = {
  users: [],
  usersLoading: false,
  usersError: null,

  sending: false,
  sendError: null,
  lastSendResult: null,

  campaigns: [],
  campaignsTotal: 0,
  campaignsPage: 1,
  campaignsLoading: false,
  campaignsError: null,
};

export default function fcmMarketingReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_FCM_USERS_REQUEST:
      return { ...state, usersLoading: true, usersError: null };
    case FETCH_FCM_USERS_SUCCESS:
      return { ...state, usersLoading: false, users: Array.isArray(action.payload) ? action.payload : [] };
    case FETCH_FCM_USERS_FAILURE:
      return { ...state, usersLoading: false, usersError: action.payload };

    case SEND_FCM_MARKETING_REQUEST:
      return { ...state, sending: true, sendError: null, lastSendResult: null };
    case SEND_FCM_MARKETING_SUCCESS:
      return { ...state, sending: false, lastSendResult: action.payload };
    case SEND_FCM_MARKETING_FAILURE:
      return { ...state, sending: false, sendError: action.payload };

    case FETCH_FCM_CAMPAIGNS_REQUEST:
      return { ...state, campaignsLoading: true, campaignsError: null };
    case FETCH_FCM_CAMPAIGNS_SUCCESS:
      return {
        ...state,
        campaignsLoading: false,
        campaigns: Array.isArray(action.payload.data) ? action.payload.data : [],
        campaignsTotal: action.payload.total || 0,
        campaignsPage: action.payload.page || 1,
      };
    case FETCH_FCM_CAMPAIGNS_FAILURE:
      return { ...state, campaignsLoading: false, campaignsError: action.payload };

    default:
      return state;
  }
}
