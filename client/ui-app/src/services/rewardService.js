import axiosInstance from "./axiosInstance";

const API_URL = process.env.REACT_APP_API_URL;

export const fetchRewardWallet = async (customerKey) => {
  const response = await axiosInstance.get(`${API_URL}/rewards/wallet/${encodeURIComponent(customerKey)}`);
  return response.data;
};

export const requestRewardRedemption = async (customerKey, rewardCode) => {
  const response = await axiosInstance.post(`${API_URL}/rewards/redeem`, { customerKey, rewardCode });
  return response.data;
};

export const fetchRewardRules = async () => (await axiosInstance.get(`${API_URL}/rewards/admin/rules`)).data;
export const fetchRewardCategoryOptions = async () => {
  // Reuse the same automatic category catalogue used throughout MassClick.
  // It is public, cached and available even before a newly deployed rewards API restarts.
  const { data } = await axiosInstance.get(`${API_URL}/category/all`);
  const parents = Array.isArray(data) ? data : [];
  const options = [];
  const seen = new Set();
  const add = (item, categoryType, parentName = "") => {
    const id = String(item?._id || "");
    const name = String(item?.name || item?.category || "").trim();
    if (!id || !name || seen.has(id)) return;
    seen.add(id);
    options.push({ _id: id, category: name, slug: item.slug || "", categoryType, parentName });
  };
  parents.forEach((parent) => {
    add(parent, "Primary Categories");
    (parent.subs || []).forEach((subcategory) => add(subcategory, "Sub Categories", parent.name));
  });
  return options.sort((a, b) => a.category.localeCompare(b.category));
};
export const saveRewardRule = async (rule) => (await axiosInstance.put(`${API_URL}/rewards/admin/rules`, rule)).data;
export const deleteRewardRule = async (id) => (await axiosInstance.delete(`${API_URL}/rewards/admin/rules/${encodeURIComponent(id)}`)).data;
export const createRewardClaim = async (claim) => (await axiosInstance.post(`${API_URL}/rewards/claims`, claim)).data;
export const fetchMyRewardClaims = async () => (await axiosInstance.get(`${API_URL}/rewards/claims/mine`)).data;
export const fetchRewardClaims = async ({ status = "", page = 1, limit = 25, search = "", sortBy = "createdAt", sortOrder = "desc" } = {}) =>
  (await axiosInstance.get(`${API_URL}/rewards/admin/claims`, {
    params: { status: status === "all" ? "" : status, page, limit, search, sortBy, sortOrder },
  })).data;
export const reviewRewardClaim = async (id, decision) => (await axiosInstance.patch(`${API_URL}/rewards/admin/claims/${id}`, decision)).data;
export const fetchRewardBusinessLocations = async (category) => (await axiosInstance.get(`${API_URL}/rewards/business-locations`, { params: { category } })).data || [];
export const fetchRewardBusinesses = async ({ category, location }) => {
  const { data } = await axiosInstance.get(`${API_URL}/rewards/businesses`, { params: { category, location } });
  return Array.isArray(data) ? data : [];
};
