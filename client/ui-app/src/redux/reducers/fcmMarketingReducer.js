import {
  FETCH_FCM_USERS_REQUEST, FETCH_FCM_USERS_SUCCESS, FETCH_FCM_USERS_FAILURE,
  SEND_FCM_MARKETING_REQUEST, SEND_FCM_MARKETING_SUCCESS, SEND_FCM_MARKETING_FAILURE,
  SCHEDULE_FCM_MARKETING_REQUEST, SCHEDULE_FCM_MARKETING_SUCCESS, SCHEDULE_FCM_MARKETING_FAILURE,
  RESEND_FCM_CAMPAIGN_REQUEST, RESEND_FCM_CAMPAIGN_SUCCESS, RESEND_FCM_CAMPAIGN_FAILURE,
  CANCEL_FCM_CAMPAIGN_REQUEST, CANCEL_FCM_CAMPAIGN_SUCCESS, CANCEL_FCM_CAMPAIGN_FAILURE,
  FETCH_FCM_CAMPAIGNS_REQUEST, FETCH_FCM_CAMPAIGNS_SUCCESS, FETCH_FCM_CAMPAIGNS_FAILURE,
} from "../actions/fcmMarketingActionTypes";

const initialState = {
  users: [],
  usersLoading: false,
  usersError: null,

  sending: false,
  sendError: null,
  lastSendResult: null,

  scheduling: false,
  scheduleError: null,
  lastScheduleResult: null,

  resending: false,
  resendError: null,

  cancelling: false,
  cancelError: null,

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

    case SCHEDULE_FCM_MARKETING_REQUEST:
      return { ...state, scheduling: true, scheduleError: null, lastScheduleResult: null };
    case SCHEDULE_FCM_MARKETING_SUCCESS:
      return { ...state, scheduling: false, lastScheduleResult: action.payload };
    case SCHEDULE_FCM_MARKETING_FAILURE:
      return { ...state, scheduling: false, scheduleError: action.payload };

    case RESEND_FCM_CAMPAIGN_REQUEST:
      return { ...state, resending: true, resendError: null };
    case RESEND_FCM_CAMPAIGN_SUCCESS:
      return { ...state, resending: false };
    case RESEND_FCM_CAMPAIGN_FAILURE:
      return { ...state, resending: false, resendError: action.payload };

    case CANCEL_FCM_CAMPAIGN_REQUEST:
      return { ...state, cancelling: true, cancelError: null };
    case CANCEL_FCM_CAMPAIGN_SUCCESS:
      return {
        ...state,
        cancelling: false,
        campaigns: state.campaigns.map((c) =>
          c._id === action.payload ? { ...c, status: "cancelled" } : c
        ),
      };
    case CANCEL_FCM_CAMPAIGN_FAILURE:
      return { ...state, cancelling: false, cancelError: action.payload };

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
