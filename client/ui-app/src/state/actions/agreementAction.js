import axiosInstance from "shared/services/axiosInstance.js";
import {
  CREATE_AGREEMENT_FAILURE,
  CREATE_AGREEMENT_REQUEST,
  CREATE_AGREEMENT_SUCCESS,
  DELETE_AGREEMENT_FAILURE,
  DELETE_AGREEMENT_REQUEST,
  DELETE_AGREEMENT_SUCCESS,
  EDIT_AGREEMENT_FAILURE,
  EDIT_AGREEMENT_REQUEST,
  EDIT_AGREEMENT_SUCCESS,
  FETCH_AGREEMENTS_FAILURE,
  FETCH_AGREEMENTS_REQUEST,
  FETCH_AGREEMENTS_SUCCESS,
} from "state/actions/userActionTypes.js";
import { getAdminAccessToken } from "app/auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;

export const getNextAgreementNo = (issueDate) => async () => {
  const token = await getValidToken();
  const params = new URLSearchParams({ issueDate });
  const response = await axiosInstance.get(
    `${API_URL}/agreement/next-number?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};

const getValidToken = async () => {
  const token = getAdminAccessToken();
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllAgreements =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_AGREEMENTS_REQUEST });

    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const params = new URLSearchParams({
        pageNo,
        pageSize,
        search,
        status,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
      });

      const response = await axiosInstance.get(
        `${API_URL}/agreement/viewall?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      dispatch({
        type: FETCH_AGREEMENTS_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_AGREEMENTS_FAILURE,
        payload: error.response?.data || error.message,
      });
      throw error;
    }
  };

export const createAgreement = (agreementData) => async (dispatch) => {
  dispatch({ type: CREATE_AGREEMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/agreement/create`,
      agreementData,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const agreement = response.data.agreement || response.data;
    dispatch({ type: CREATE_AGREEMENT_SUCCESS, payload: agreement });
    return agreement;
  } catch (error) {
    dispatch({
      type: CREATE_AGREEMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const editAgreement = (id, agreementData) => async (dispatch) => {
  dispatch({ type: EDIT_AGREEMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.put(
      `${API_URL}/agreement/update/${id}`,
      agreementData,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    dispatch({ type: EDIT_AGREEMENT_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({
      type: EDIT_AGREEMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const deleteAgreement = (id) => async (dispatch) => {
  dispatch({ type: DELETE_AGREEMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.delete(
      `${API_URL}/agreement/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    dispatch({
      type: DELETE_AGREEMENT_SUCCESS,
      payload: response.data.result,
    });
    return response.data.result;
  } catch (error) {
    dispatch({
      type: DELETE_AGREEMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
