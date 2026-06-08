import {
  FETCH_GMAPS_LEADS_REQUEST,
  FETCH_GMAPS_LEADS_SUCCESS,
  FETCH_GMAPS_LEADS_FAILURE,
  UPDATE_GMAPS_LEAD_STATUS_SUCCESS,
  FETCH_GMAPS_LEADS_STATS_SUCCESS,
  FETCH_GMAPS_LEADS_DISTINCTS_SUCCESS,
  SET_GMAPS_LEAD_IMPORT,
  CLEAR_GMAPS_LEAD_IMPORT,
} from '../actions/userActionTypes';

const initialState = {
  leads: [],
  total: 0,
  stats: { total: 0, available: 0, imported: 0, skipped: 0 },
  distincts: { locations: [], sectors: [], categories: [] },
  loading: false,
  error: null,
  leadToImport: null,
};

export default function gmapsLeadsReducer(state = initialState, action) {
  switch (action.type) {

    case FETCH_GMAPS_LEADS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_GMAPS_LEADS_SUCCESS:
      return {
        ...state,
        loading: false,
        leads: action.payload.data,
        total: action.payload.total,
      };

    case FETCH_GMAPS_LEADS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    // Update a single lead's status in-place after PATCH
    case UPDATE_GMAPS_LEAD_STATUS_SUCCESS:
      return {
        ...state,
        leads: state.leads.map((lead) =>
          lead._id === action.payload._id ? { ...lead, ...action.payload } : lead
        ),
      };

    case FETCH_GMAPS_LEADS_STATS_SUCCESS:
      return { ...state, stats: action.payload };

    case FETCH_GMAPS_LEADS_DISTINCTS_SUCCESS:
      return { ...state, distincts: action.payload };

    case SET_GMAPS_LEAD_IMPORT:
      return { ...state, leadToImport: action.payload };

    case CLEAR_GMAPS_LEAD_IMPORT:
      return { ...state, leadToImport: null };

    default:
      return state;
  }
}
