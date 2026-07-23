import {
  FETCH_MASSCLICK_EVENTS_FAILURE,
  FETCH_MASSCLICK_EVENTS_REQUEST,
  FETCH_MASSCLICK_EVENTS_SUCCESS,
  SAVE_MASSCLICK_EVENT_FAILURE,
  SAVE_MASSCLICK_EVENT_REQUEST,
  SAVE_MASSCLICK_EVENT_SUCCESS,
  DELETE_MASSCLICK_EVENT_FAILURE,
  DELETE_MASSCLICK_EVENT_REQUEST,
  DELETE_MASSCLICK_EVENT_SUCCESS,
  VIEW_MASSCLICK_EVENT_FAILURE,
  VIEW_MASSCLICK_EVENT_REQUEST,
  VIEW_MASSCLICK_EVENT_SUCCESS,
} from "../actions/massclickEventActionTypes.js";

const initialState = { data: [], selectedEvent: null, total: 0, loading: false, error: null };

export default function massclickEventReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MASSCLICK_EVENTS_REQUEST:
    case SAVE_MASSCLICK_EVENT_REQUEST:
    case DELETE_MASSCLICK_EVENT_REQUEST:
      return { ...state, loading: true, error: null };
    case VIEW_MASSCLICK_EVENT_REQUEST:
      return { ...state, selectedEvent: null, loading: true, error: null };
    case FETCH_MASSCLICK_EVENTS_SUCCESS:
      return { ...state, loading: false, data: action.payload.data || [], total: action.payload.total || 0 };
    case FETCH_MASSCLICK_EVENTS_FAILURE:
    case SAVE_MASSCLICK_EVENT_FAILURE:
    case DELETE_MASSCLICK_EVENT_FAILURE:
    case VIEW_MASSCLICK_EVENT_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case SAVE_MASSCLICK_EVENT_SUCCESS: {
      const exists = state.data.some((item) => item._id === action.payload._id);
      return {
        ...state,
        loading: false,
        data: exists ? state.data.map((item) => item._id === action.payload._id ? action.payload : item) : [action.payload, ...state.data],
        total: exists ? state.total : state.total + 1,
      };
    }
    case DELETE_MASSCLICK_EVENT_SUCCESS:
      return {
        ...state,
        loading: false,
        data: state.data.filter((item) => item._id !== action.payload),
        total: Math.max(0, state.total - 1),
      };
    case VIEW_MASSCLICK_EVENT_SUCCESS:
      return { ...state, loading: false, selectedEvent: action.payload };
    default:
      return state;
  }
}
