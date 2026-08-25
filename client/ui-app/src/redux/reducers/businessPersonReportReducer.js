import { REPORT_BUSINESSES_SUCCESS, REPORT_CATEGORIES_SUCCESS, REPORT_LOCATIONS_SUCCESS, REPORT_OPTIONS_FAILURE, REPORT_OPTIONS_REQUEST } from "../actions/businessPersonReportAction.js";

const initialState = { categories: [], locations: [], businesses: [], businessTotal: 0, loading: {}, errors: {}, requestIds: {} };

export default function businessPersonReportReducer(state = initialState, action) {
  const kind = action.payload?.kind;
  switch (action.type) {
    case REPORT_OPTIONS_REQUEST:
      return { ...state, loading: { ...state.loading, [kind]: true }, errors: { ...state.errors, [kind]: "" }, requestIds: { ...state.requestIds, [kind]: action.payload.requestId } };
    case REPORT_CATEGORIES_SUCCESS:
      if (state.requestIds.categories !== action.payload.requestId) return state;
      return { ...state, categories: action.payload.data, loading: { ...state.loading, categories: false } };
    case REPORT_LOCATIONS_SUCCESS:
      if (state.requestIds.locations !== action.payload.requestId) return state;
      return { ...state, locations: action.payload.data, loading: { ...state.loading, locations: false } };
    case REPORT_BUSINESSES_SUCCESS:
      if (state.requestIds.businesses !== action.payload.requestId) return state;
      return { ...state, businesses: action.payload.data, businessTotal: action.payload.total, loading: { ...state.loading, businesses: false } };
    case REPORT_OPTIONS_FAILURE:
      if (state.requestIds[kind] !== action.payload.requestId) return state;
      return { ...state, loading: { ...state.loading, [kind]: false }, errors: { ...state.errors, [kind]: action.payload.message } };
    default: return state;
  }
}
