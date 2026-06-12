import {
  FETCH_MSG91_AUDIT_FAILURE,
  FETCH_MSG91_AUDIT_REQUEST,
  FETCH_MSG91_AUDIT_SUCCESS,
  FETCH_MSG91_DASHBOARD_FAILURE,
  FETCH_MSG91_DASHBOARD_REQUEST,
  FETCH_MSG91_DASHBOARD_SUCCESS,
  FETCH_MSG91_RECIPIENTS_FAILURE,
  FETCH_MSG91_RECIPIENTS_REQUEST,
  FETCH_MSG91_RECIPIENTS_SUCCESS,
  UPDATE_MSG91_RECIPIENT_SUCCESS,
} from "../actions/msg91AnalyticsActionTypes";

const initialState = {
  summary: null,
  timeseries: [],
  failures: null,
  audit: [],
  auditTotal: 0,
  auditPageNo: 1,
  auditPageSize: 25,
  recipients: [],
  recipientsTotal: 0,
  recipientsPageNo: 1,
  recipientsPageSize: 25,
  loading: false,
  auditLoading: false,
  recipientsLoading: false,
  error: null,
};

export default function msg91AnalyticsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MSG91_DASHBOARD_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_MSG91_DASHBOARD_SUCCESS:
      return {
        ...state,
        loading: false,
        summary: action.payload.summary,
        timeseries: action.payload.timeseries || [],
        failures: action.payload.failures,
      };
    case FETCH_MSG91_DASHBOARD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_MSG91_AUDIT_REQUEST:
      return { ...state, auditLoading: true, error: null };
    case FETCH_MSG91_AUDIT_SUCCESS:
      return {
        ...state,
        auditLoading: false,
        audit: action.payload.data,
        auditTotal: action.payload.total,
        auditPageNo: action.payload.pageNo,
        auditPageSize: action.payload.pageSize,
      };
    case FETCH_MSG91_AUDIT_FAILURE:
      return { ...state, auditLoading: false, error: action.payload };

    case FETCH_MSG91_RECIPIENTS_REQUEST:
      return { ...state, recipientsLoading: true, error: null };
    case FETCH_MSG91_RECIPIENTS_SUCCESS:
      return {
        ...state,
        recipientsLoading: false,
        recipients: action.payload.data,
        recipientsTotal: action.payload.total,
        recipientsPageNo: action.payload.pageNo,
        recipientsPageSize: action.payload.pageSize,
      };
    case FETCH_MSG91_RECIPIENTS_FAILURE:
      return { ...state, recipientsLoading: false, error: action.payload };

    case UPDATE_MSG91_RECIPIENT_SUCCESS:
      return {
        ...state,
        recipients: state.recipients.map((recipient) =>
          recipient.mobile === action.payload.mobile ? action.payload : recipient
        ),
      };

    default:
      return state;
  }
}
