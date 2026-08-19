import { createTicketApi, getTicketApi, listTicketsApi, replyTicketApi, updateTicketStatusApi } from "../../services/supportService";

export const setSupportSection = (section) => ({ type: "SUPPORT/SET_SECTION", payload: section });
export const setSupportSearch = (query) => ({ type: "SUPPORT/SET_SEARCH", payload: query });
export const clearSupportError = () => ({ type: "SUPPORT/CLEAR_ERROR" });

const errorText = (error) => error.response?.data?.error || error.message || "Something went wrong";
const asyncAction = (type, request) => async (dispatch) => {
  dispatch({ type: `SUPPORT/${type}_REQUEST` });
  try {
    const payload = await request();
    dispatch({ type: `SUPPORT/${type}_SUCCESS`, payload });
    return payload;
  } catch (error) {
    dispatch({ type: `SUPPORT/${type}_FAILURE`, payload: errorText(error) });
    throw error;
  }
};

export const loadSupportTickets = (status = "all") => asyncAction("LIST", () => listTicketsApi(status));
export const createSupportTicket = (data) => asyncAction("CREATE", () => createTicketApi(data));
export const loadSupportTicket = (id) => asyncAction("DETAIL", () => getTicketApi(id));
export const replySupportTicket = (id, message) => asyncAction("UPDATE", () => replyTicketApi(id, message));
export const closeSupportTicket = (id) => asyncAction("UPDATE", () => updateTicketStatusApi(id, "closed"));
