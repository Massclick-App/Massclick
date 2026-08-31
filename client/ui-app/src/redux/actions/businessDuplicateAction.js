import axiosInstance from '../../services/axiosInstance.js';
import { getClientToken } from './clientAuthAction.js';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Duplicate review console.
 *
 * These are plain thunks that return their payload rather than reducer-backed
 * actions: the console owns a single screen's worth of state, nothing else in
 * the app reads a duplicate scan, and parking a 1,300-group result in the
 * Redux store would keep it alive long after it went stale.
 */

// Mirrors getValidToken in businessListAction.js so this console refreshes the
// admin session the same way every other admin screen does.
const authHeaders = async (dispatch) => {
  let token = localStorage.getItem('accessToken');
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error('No valid token found');
  return { Authorization: `Bearer ${token}` };
};

const failureMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchDuplicateRules = () => async (dispatch) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/businesslist/duplicates/rules`, {
      headers: await authHeaders(dispatch),
    });
    return response.data.rules || [];
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not load duplicate rules'));
  }
};

export const scanDuplicates = ({
  rules = [],
  location = '',
  category = '',
  includeResolved = false,
} = {}) => async (dispatch) => {
  try {
    const params = new URLSearchParams();
    if (rules.length) params.append('rules', rules.join(','));
    if (location) params.append('location', location);
    if (category) params.append('category', category);
    if (includeResolved) params.append('includeResolved', 'true');

    const response = await axiosInstance.get(
      `${API_URL}/businesslist/duplicates/scan?${params.toString()}`,
      {
        headers: await authHeaders(dispatch),
        // A full-collection sweep across every rule is well past the 20s
        // default, and it is an explicit, admin-initiated action.
        timeout: 180000,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, 'Duplicate scan failed'));
  }
};

export const resolveDuplicateGroup = (payload) => async (dispatch) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/businesslist/duplicates/resolve`,
      payload,
      { headers: await authHeaders(dispatch), timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not apply the merge'));
  }
};

export const ignoreDuplicateGroup = (payload) => async (dispatch) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/businesslist/duplicates/ignore`,
      payload,
      { headers: await authHeaders(dispatch), timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not dismiss the group'));
  }
};

export const restoreDuplicateGroup = (payload) => async (dispatch) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/businesslist/duplicates/restore`,
      payload,
      { headers: await authHeaders(dispatch), timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not restore the listings'));
  }
};

/** Preview what a permanent delete would destroy, before confirming it. */
export const fetchPurgeImpact = (ids) => async (dispatch) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/businesslist/duplicates/impact`,
      { ids },
      { headers: await authHeaders(dispatch), timeout: 60000 }
    );
    return response.data.impact;
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not read the delete impact'));
  }
};

/**
 * Permanent delete. `confirm: true` is sent explicitly and the server rejects
 * the call without it, so this cannot be reached by accident.
 */
export const purgeDuplicateGroup = (payload) => async (dispatch) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/businesslist/duplicates/purge`,
      { ...payload, confirm: true },
      { headers: await authHeaders(dispatch), timeout: 120000 }
    );
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, 'Could not delete the listings'));
  }
};
