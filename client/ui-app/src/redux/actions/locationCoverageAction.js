import axiosInstance from '../../services/axiosInstance.js';
import { getClientToken } from './clientAuthAction.js';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Location Coverage console.
 *
 * A plain thunk that returns its payload rather than a reducer-backed action:
 * the console owns a single screen's worth of state, and nothing else in the
 * app reads a location-coverage page.
 */

const authHeaders = async (dispatch) => {
  let token = localStorage.getItem('accessToken');
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error('No valid token found');
  return { Authorization: `Bearer ${token}` };
};

const failureMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const getLocationCoverage =
  ({ pageNo = 1, pageSize = 25, options = {} } = {}) =>
    async (dispatch) => {
      const {
        search = '',
        status = 'all',
        reviewStatus = 'all',
        importSource = 'all',
        origin = 'all',
        level = 'all',
        district = '',
        zone = '',
        ward = '',
        locality = '',
        pincode = '',
        pincodeStatus = 'all',
        businessCoverage = 'all',
        sortBy = '',
        sortOrder = '',
      } = options;

      const params = new URLSearchParams({
        pageNo: String(pageNo),
        pageSize: String(pageSize),
        search,
        status,
        reviewStatus,
        importSource,
        origin,
        level,
        district,
        zone,
        ward,
        locality,
        pincode,
        pincodeStatus,
        businessCoverage,
        sortBy,
        sortOrder,
      });

      try {
        const response = await axiosInstance.get(
          `${API_URL}/masterlocation/viewall-with-business-stats?${params.toString()}`,
          { headers: await authHeaders(dispatch) }
        );
        return response.data;
      } catch (error) {
        throw new Error(failureMessage(error, 'Could not load location coverage'));
      }
    };
