import axiosInstance from 'shared/services/axiosInstance.js';
import { getClientToken } from 'state/actions/clientAuthAction.js';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Paid Category SEO console.
 *
 * Plain thunks that return their payload (same pattern as
 * locationCoverageAction.js): the console owns its own screen state and
 * nothing else reads it.
 */

const authHeaders = async (dispatch) => {
  let token = localStorage.getItem('accessToken');
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error('No valid token found');
  return { Authorization: `Bearer ${token}` };
};

const failureMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const request = (method, path, fallback, body) => async (dispatch) => {
  try {
    const headers = await authHeaders(dispatch);
    const url = `${API_URL}/seo/paid-console${path}`;
    const response = method === 'get'
      ? await axiosInstance.get(url, { headers })
      : await axiosInstance[method](url, body || {}, { headers });
    return response.data;
  } catch (error) {
    throw new Error(failureMessage(error, fallback));
  }
};

export const getPaidSeoOverview = () =>
  request('get', '/overview', 'Could not load paid category SEO');

export const getPaidSeoCategory = (slug) =>
  request('get', `/category/${encodeURIComponent(slug)}`, 'Could not load this category');

export const getPaidSeoGaps = () =>
  request('get', '/gaps', 'Could not load SEO gaps');

export const getPaidSeoConflicts = () =>
  request('get', '/conflicts', 'Could not load competitor conflicts');

export const savePaidSeoRow = (payload) =>
  request('put', '/seo-row', 'Could not save SEO', payload);

export const savePaidBusinessSeo = (businessId, payload) =>
  request('put', `/business/${businessId}`, 'Could not save business SEO', payload);

export const saveProtectedTerms = (slug, terms) =>
  request('put', `/protected-terms/${encodeURIComponent(slug)}`, 'Could not save protected terms', { terms });

export const fixPaidSeoConflict = (payload) =>
  request('put', '/conflict', 'Could not update the competitor SEO', payload);

export const refreshPaidSeoCache = (slug) =>
  request('post', `/refresh-cache/${encodeURIComponent(slug)}`, 'Could not refresh live pages');
