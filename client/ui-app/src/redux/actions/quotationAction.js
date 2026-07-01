import axiosInstance from "../../services/axiosInstance.js";
import {
  CREATE_QUOTATION_REQUEST,
  CREATE_QUOTATION_SUCCESS,
  CREATE_QUOTATION_FAILURE,
  FETCH_QUOTATION_REQUEST,
  FETCH_QUOTATION_SUCCESS,
  FETCH_QUOTATION_FAILURE,
  EDIT_QUOTATION_REQUEST,
  EDIT_QUOTATION_SUCCESS,
  EDIT_QUOTATION_FAILURE,
  DELETE_QUOTATION_REQUEST,
  DELETE_QUOTATION_SUCCESS,
  DELETE_QUOTATION_FAILURE,
} from "./userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

const getErrorPayload = (error) => error.response?.data || error.message;

export const getAllQuotations =
  ({ pageNo = 1, pageSize = 25, search = "" } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_QUOTATION_REQUEST });

    try {
      const token = await getValidToken(dispatch);
      const params = new URLSearchParams();
      params.append("pageNo", pageNo);
      params.append("pageSize", pageSize);
      if (search) params.append("search", search);

      const response = await axiosInstance.get(
        `${API_URL}/quotation/viewall?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const payload = {
        data: response.data.data || [],
        total: response.data.total || 0,
        pageNo: response.data.pageNo || pageNo,
        pageSize: response.data.pageSize || pageSize,
        totalPages: response.data.totalPages || 1,
      };

      dispatch({ type: FETCH_QUOTATION_SUCCESS, payload });
      return payload;
    } catch (error) {
      const payload = getErrorPayload(error);
      dispatch({ type: FETCH_QUOTATION_FAILURE, payload });
      throw error;
    }
  };

export const getNextQuotationNo = (issueDate) => async (dispatch) => {
  const token = await getValidToken(dispatch);
  const params = new URLSearchParams();
  if (issueDate) params.append("issueDate", issueDate);

  const response = await axiosInstance.get(
    `${API_URL}/quotation/next-number?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

export const createQuotation = (quotationData) => async (dispatch) => {
  dispatch({ type: CREATE_QUOTATION_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/quotation/create`,
      quotationData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: CREATE_QUOTATION_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    const payload = getErrorPayload(error);
    dispatch({ type: CREATE_QUOTATION_FAILURE, payload });
    throw error;
  }
};

export const editQuotation = (id, quotationData) => async (dispatch) => {
  dispatch({ type: EDIT_QUOTATION_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.put(
      `${API_URL}/quotation/update/${id}`,
      quotationData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_QUOTATION_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    const payload = getErrorPayload(error);
    dispatch({ type: EDIT_QUOTATION_FAILURE, payload });
    throw error;
  }
};

export const deleteQuotation = (id) => async (dispatch) => {
  dispatch({ type: DELETE_QUOTATION_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    await axiosInstance.delete(`${API_URL}/quotation/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    dispatch({ type: DELETE_QUOTATION_SUCCESS, payload: id });
    return id;
  } catch (error) {
    const payload = getErrorPayload(error);
    dispatch({ type: DELETE_QUOTATION_FAILURE, payload });
    throw error;
  }
};
