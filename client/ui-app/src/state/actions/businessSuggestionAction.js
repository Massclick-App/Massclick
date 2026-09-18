import axiosInstance from "shared/services/axiosInstance.js";

const API_URL = process.env.REACT_APP_API_URL;

// Suggestions are request/response only — no store slice reads them — so these
// are plain async calls rather than redux thunks.

export const submitBusinessSuggestion = async (businessId, { field, value, note, source }) => {
  const response = await axiosInstance.post(`${API_URL}/business/${businessId}/suggestions`, {
    field,
    value,
    note,
    source,
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
  });
  return response.data;
};

export const fetchBusinessSuggestions = async ({ page = 1, limit = 20, status = "", field = "", businessId = "", search = "" } = {}) => {
  const params = new URLSearchParams({ page, limit, status, field, businessId, search });
  const response = await axiosInstance.get(`${API_URL}/admin/business-suggestions?${params.toString()}`);
  return response.data;
};

export const fetchPendingSuggestionCount = async () => {
  const response = await axiosInstance.get(`${API_URL}/admin/business-suggestions/pending-count`);
  return response.data?.pendingCount || 0;
};

export const approveBusinessSuggestion = async (id, { value, applyWhatsapp = false, force = false } = {}) => {
  const response = await axiosInstance.post(`${API_URL}/admin/business-suggestions/${id}/approve`, { value, applyWhatsapp, force });
  return response.data.suggestion;
};

export const rejectBusinessSuggestion = async (id, reason = "") => {
  const response = await axiosInstance.post(`${API_URL}/admin/business-suggestions/${id}/reject`, { reason });
  return response.data.suggestion;
};

// Fired after any review so the sidebar badge and edit-form banner refresh.
export const SUGGESTIONS_CHANGED_EVENT = "business-suggestions:changed";
