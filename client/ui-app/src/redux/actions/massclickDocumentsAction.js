import axiosInstance from "../../services/axiosInstance.js";
import {
  CREATE_MASSCLICK_DOCUMENT_FAILURE,
  CREATE_MASSCLICK_DOCUMENT_REQUEST,
  CREATE_MASSCLICK_DOCUMENT_SUCCESS,
  DELETE_MASSCLICK_DOCUMENT_FAILURE,
  DELETE_MASSCLICK_DOCUMENT_REQUEST,
  DELETE_MASSCLICK_DOCUMENT_SUCCESS,
  EDIT_MASSCLICK_DOCUMENT_FAILURE,
  EDIT_MASSCLICK_DOCUMENT_REQUEST,
  EDIT_MASSCLICK_DOCUMENT_SUCCESS,
  FETCH_MASSCLICK_DOCUMENTS_FAILURE,
  FETCH_MASSCLICK_DOCUMENTS_REQUEST,
  FETCH_MASSCLICK_DOCUMENTS_SUCCESS,
} from "./userActionTypes.js";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
  let token = localStorage.getItem("accessToken");
  if (!token) token = await dispatch(getClientToken());
  if (!token) throw new Error("No valid token found");
  return token;
};

export const getAllMassclickDocuments =
  ({ pageNo = 1, pageSize = 10, options = {} } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_MASSCLICK_DOCUMENTS_REQUEST });

    try {
      const token = await getValidToken(dispatch);
      const {
        search = "",
        status = "all",
        section = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const params = new URLSearchParams({
        pageNo,
        pageSize,
        search,
        status,
        section,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
      });

      const response = await axiosInstance.get(
        `${API_URL}/massclick-documents/viewall?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      dispatch({
        type: FETCH_MASSCLICK_DOCUMENTS_SUCCESS,
        payload: {
          data: response.data.data,
          total: response.data.total,
          pageNo,
          pageSize,
        },
      });
    } catch (error) {
      dispatch({
        type: FETCH_MASSCLICK_DOCUMENTS_FAILURE,
        payload: error.response?.data || error.message,
      });
    }
  };

export const createMassclickDocument = (documentData) => async (dispatch) => {
  dispatch({ type: CREATE_MASSCLICK_DOCUMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.post(
      `${API_URL}/massclick-documents/create`,
      documentData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const document = response.data.document || response.data;
    dispatch({ type: CREATE_MASSCLICK_DOCUMENT_SUCCESS, payload: document });
    return document;
  } catch (error) {
    dispatch({
      type: CREATE_MASSCLICK_DOCUMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const editMassclickDocument = (id, documentData) => async (dispatch) => {
  dispatch({ type: EDIT_MASSCLICK_DOCUMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.put(
      `${API_URL}/massclick-documents/update/${id}`,
      documentData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({ type: EDIT_MASSCLICK_DOCUMENT_SUCCESS, payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({
      type: EDIT_MASSCLICK_DOCUMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};

export const deleteMassclickDocument = (id) => async (dispatch) => {
  dispatch({ type: DELETE_MASSCLICK_DOCUMENT_REQUEST });

  try {
    const token = await getValidToken(dispatch);
    const response = await axiosInstance.delete(
      `${API_URL}/massclick-documents/delete/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    dispatch({
      type: DELETE_MASSCLICK_DOCUMENT_SUCCESS,
      payload: response.data.result,
    });
    return response.data.result;
  } catch (error) {
    dispatch({
      type: DELETE_MASSCLICK_DOCUMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
    throw error;
  }
};
