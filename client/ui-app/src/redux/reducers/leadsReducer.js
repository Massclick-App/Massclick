import {
  MATCH_LEADS_REQUEST,
  MATCH_LEADS_SUCCESS,
  MATCH_LEADS_FAILURE,
} from "../actions/userActionTypes";

// 1️⃣ Initial state
const initialState = {
  loading: false,
  leads: [],
  error: null,
};

// 2️⃣ Reducer
export default function leadsReducer(state = initialState, action) {
  switch (action.type) {

    case MATCH_LEADS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MATCH_LEADS_SUCCESS:
      return {
        ...state,
        loading: false,
        leads: action.payload,
      };

    case MATCH_LEADS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}
