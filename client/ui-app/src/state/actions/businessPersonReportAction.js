import axiosInstance from "shared/services/axiosInstance.js";

export const REPORT_OPTIONS_REQUEST = "BUSINESS_PERSON_REPORT/OPTIONS_REQUEST";
export const REPORT_CATEGORIES_SUCCESS = "BUSINESS_PERSON_REPORT/CATEGORIES_SUCCESS";
export const REPORT_LOCATIONS_SUCCESS = "BUSINESS_PERSON_REPORT/LOCATIONS_SUCCESS";
export const REPORT_BUSINESSES_SUCCESS = "BUSINESS_PERSON_REPORT/BUSINESSES_SUCCESS";
export const REPORT_OPTIONS_FAILURE = "BUSINESS_PERSON_REPORT/OPTIONS_FAILURE";

const normalizeReportOptions = (items = []) => items.map((item) => typeof item === "string"
  ? { id: item, name: item, slug: "", active: true, businessCount: 0 }
  : item);

export const findReportCategories = (search, requestId) => async (dispatch) => {
  dispatch({ type: REPORT_OPTIONS_REQUEST, payload: { kind: "categories", requestId } });
  try {
    const [canonicalResult, reportResult] = await Promise.allSettled([
      axiosInstance.get("/category/viewall", { params: { pageNo: 1, pageSize: 100, search, status: "all", sortBy: "category", sortOrder: "asc" } }),
      axiosInstance.get("/admin/business-person-reports/filters", { params: { search } }),
    ]);
    const counted = normalizeReportOptions(reportResult.status === "fulfilled" ? reportResult.value.data?.categories : []);
    const counts = new Map(counted.map((item) => [String(item.name || "").trim().toLocaleLowerCase(), item]));
    const canonical = canonicalResult.status === "fulfilled" ? (canonicalResult.value.data?.data || []) : [];
    const merged = new Map();
    canonical.forEach((row) => {
      const name = String(row.category || row.title || row.subcategory || "").trim();
      if (!name) return;
      const extra = counts.get(name.toLocaleLowerCase());
      merged.set(name.toLocaleLowerCase(), { id: String(row._id || name), name, slug: row.slug || "", active: row.isActive !== false, businessCount: extra?.businessCount || 0 });
    });
    counted.forEach((item) => { const key = String(item.name || "").trim().toLocaleLowerCase(); if (key && !merged.has(key)) merged.set(key, item); });
    if (canonicalResult.status === "rejected" && reportResult.status === "rejected") throw canonicalResult.reason;
    let data = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (data.length) {
      try {
        const usage = await axiosInstance.get("/category/business-usage", { params: { names: data.map((item) => item.name).join(",") } });
        const usageMap = new Map((usage.data || []).map((item) => [String(item.name).toLocaleLowerCase(), Number(item.count || 0)]));
        data = data.map((item) => ({ ...item, businessCount: usageMap.get(item.name.toLocaleLowerCase()) ?? item.businessCount }));
      } catch { /* report counts remain available when usage lookup is unavailable */ }
    }
    dispatch({ type: REPORT_CATEGORIES_SUCCESS, payload: { data, requestId } });
    return data;
  } catch (error) {
    dispatch({ type: REPORT_OPTIONS_FAILURE, payload: { kind: "categories", requestId, message: error.response?.data?.message || error.message || "Could not load categories" } });
    throw error;
  }
};

export const findReportLocations = (category, search, requestId) => async (dispatch) => {
  dispatch({ type: REPORT_OPTIONS_REQUEST, payload: { kind: "locations", requestId } });
  try {
    const [masterResult, reportResult] = await Promise.allSettled([
      search
        ? axiosInstance.get("/masterlocation/search", { params: { q: search, limit: 50 } })
        : axiosInstance.get("/masterlocation/distinct-values", { params: { field: "district" } }),
      axiosInstance.get("/admin/business-person-reports/filters", { params: { category } }),
    ]);
    if (masterResult.status === "rejected" && reportResult.status === "rejected") throw masterResult.reason;
    const reportRows = reportResult.status === "fulfilled" ? (reportResult.value.data?.locations || []) : [];
    const counts = new Map(reportRows.map((item) => [String(typeof item === "string" ? item : item.name).trim().toLocaleLowerCase(), Number(item.businessCount || 0)]));
    const masterData = masterResult.status === "fulfilled" ? (masterResult.value.data?.data || []) : [];
    const masterDistricts = [...new Set(masterData.map((item) => typeof item === "string" ? item : item.district).filter(Boolean))];
    const merged = new Map();
    masterDistricts.forEach((name) => { const clean = String(name || "").trim(); if (clean) merged.set(clean.toLocaleLowerCase(), { name: clean, businessCount: counts.get(clean.toLocaleLowerCase()) || 0, source: "master" }); });
    reportRows.forEach((item) => { const name = String(typeof item === "string" ? item : item.name || "").trim(); const key = name.toLocaleLowerCase(); if (name && !merged.has(key)) merged.set(key, { name, businessCount: Number(item.businessCount || 0), source: "business" }); });
    const data = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
    dispatch({ type: REPORT_LOCATIONS_SUCCESS, payload: { data, requestId } });
    return data;
  } catch (error) {
    dispatch({ type: REPORT_OPTIONS_FAILURE, payload: { kind: "locations", requestId, message: error.response?.data?.message || error.message || "Could not load locations" } });
    throw error;
  }
};

export const findReportBusinesses = (params, requestId) => async (dispatch) => {
  dispatch({ type: REPORT_OPTIONS_REQUEST, payload: { kind: "businesses", requestId } });
  try {
    const [reportResult, businessResult] = await Promise.allSettled([
      axiosInstance.get("/admin/business-person-reports/businesses", { params }),
      axiosInstance.get("/businesslist/viewall", { params: { pageNo: 1, pageSize: 100, status: "all", category: params.category, location: params.location, search: params.search || "", sortBy: "businessName", sortOrder: "asc" } }),
    ]);
    if (reportResult.status === "rejected" && businessResult.status === "rejected") throw reportResult.reason;
    const preferred = reportResult.status === "fulfilled" ? (reportResult.value.data?.data || []) : [];
    const existingRows = businessResult.status === "fulfilled" ? (businessResult.value.data?.data || []) : [];
    const fallback = existingRows.map((row) => ({ id: String(row._id), name: row.businessName || row.name || "Unnamed business", category: row.category || "", subcategory: row.subcategory || "", location: row.location || "", contact: row.contact || row.contactList || "", whatsapp: row.whatsappNumber || "", clientId: row.clientId || "", live: Boolean(row.businessesLive && row.activeBusinesses && row.isActive) }));
    const merged = new Map([...fallback, ...preferred].map((row) => [row.id, row]));
    const data = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
    const preferredTotal = reportResult.status === "fulfilled" ? Number(reportResult.value.data?.total || 0) : 0;
    const fallbackTotal = businessResult.status === "fulfilled" ? Number(businessResult.value.data?.total || 0) : 0;
    const payload = { data, total: Math.max(preferredTotal, fallbackTotal, data.length), requestId };
    dispatch({ type: REPORT_BUSINESSES_SUCCESS, payload });
    return payload;
  } catch (error) {
    dispatch({ type: REPORT_OPTIONS_FAILURE, payload: { kind: "businesses", requestId, message: error.response?.data?.message || error.message || "Could not load businesses" } });
    throw error;
  }
};
