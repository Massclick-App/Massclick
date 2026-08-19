const initialState = { activeSection: "chat", search: "", tickets: [], selectedTicket: null, loading: false, saving: false, error: "" };

export default function supportReducer(state = initialState, action) {
  switch (action.type) {
    case "SUPPORT/SET_SECTION": return { ...state, activeSection: action.payload, error: "" };
    case "SUPPORT/SET_SEARCH": return { ...state, search: action.payload };
    case "SUPPORT/CLEAR_ERROR": return { ...state, error: "" };
    case "SUPPORT/LIST_REQUEST": case "SUPPORT/DETAIL_REQUEST": return { ...state, loading: true, error: "" };
    case "SUPPORT/CREATE_REQUEST": case "SUPPORT/UPDATE_REQUEST": return { ...state, saving: true, error: "" };
    case "SUPPORT/LIST_SUCCESS": return { ...state, loading: false, tickets: action.payload.data || [] };
    case "SUPPORT/DETAIL_SUCCESS": return { ...state, loading: false, selectedTicket: action.payload };
    case "SUPPORT/CREATE_SUCCESS": return { ...state, saving: false, selectedTicket: action.payload, tickets: [action.payload, ...state.tickets] };
    case "SUPPORT/UPDATE_SUCCESS": return { ...state, saving: false, selectedTicket: action.payload, tickets: state.tickets.map((item) => item.id === action.payload.id ? action.payload : item) };
    case "SUPPORT/LIST_FAILURE": case "SUPPORT/DETAIL_FAILURE": return { ...state, loading: false, error: action.payload };
    case "SUPPORT/CREATE_FAILURE": case "SUPPORT/UPDATE_FAILURE": return { ...state, saving: false, error: action.payload };
    default: return state;
  }
}
