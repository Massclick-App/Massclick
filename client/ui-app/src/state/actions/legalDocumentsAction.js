// src/state/actions/legalDocumentsAction.js

import axiosInstance from "shared/services/axiosInstance.js";
import {
  FETCH_LEGAL_DOCUMENTS_REQUEST,
  FETCH_LEGAL_DOCUMENTS_SUCCESS,
  FETCH_LEGAL_DOCUMENTS_FAILURE,

  SAVE_LEGAL_DOCUMENT_REQUEST,
  SAVE_LEGAL_DOCUMENT_SUCCESS,
  SAVE_LEGAL_DOCUMENT_FAILURE,

  DELETE_LEGAL_DOCUMENT_REQUEST,
  DELETE_LEGAL_DOCUMENT_SUCCESS,
  DELETE_LEGAL_DOCUMENT_FAILURE,

  FETCH_PUBLISHED_LEGAL_DOCUMENT_REQUEST,
  FETCH_PUBLISHED_LEGAL_DOCUMENT_SUCCESS,
  FETCH_PUBLISHED_LEGAL_DOCUMENT_FAILURE,
} from "state/actions/userActionTypes.js";

// REACT_APP_API_URL already ends in /api, and axiosInstance uses it as its
// baseURL — so these are relative to that, without repeating the prefix.
const ADMIN_BASE = "/admin/legal-documents";
const PUBLIC_BASE = "/legal-documents/published";

const errorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";

/**
 * Admin list. The admin token is attached by the axios request interceptor.
 */
export const getAllLegalDocuments =
  ({ pageNo = 1, pageSize = 25, type = "", status = "", search = "" } = {}) =>
  async (dispatch) => {
    dispatch({ type: FETCH_LEGAL_DOCUMENTS_REQUEST });

    try {
      const response = await axiosInstance.get(ADMIN_BASE, {
        params: {
          pageNo,
          pageSize,
          ...(type && { type }),
          ...(status && { status }),
          ...(search && { search }),
        },
      });

      dispatch({
        type: FETCH_LEGAL_DOCUMENTS_SUCCESS,
        payload: response.data,
      });

      return response.data;
    } catch (error) {
      dispatch({
        type: FETCH_LEGAL_DOCUMENTS_FAILURE,
        payload: errorMessage(error),
      });
      throw error;
    }
  };

export const createLegalDocument = (payload) => async (dispatch) => {
  dispatch({ type: SAVE_LEGAL_DOCUMENT_REQUEST });

  try {
    const response = await axiosInstance.post(ADMIN_BASE, payload);

    dispatch({
      type: SAVE_LEGAL_DOCUMENT_SUCCESS,
      payload: response.data?.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: SAVE_LEGAL_DOCUMENT_FAILURE,
      payload: errorMessage(error),
    });
    throw error;
  }
};

export const editLegalDocument = (id, payload) => async (dispatch) => {
  dispatch({ type: SAVE_LEGAL_DOCUMENT_REQUEST });

  try {
    const response = await axiosInstance.put(`${ADMIN_BASE}/${id}`, payload);

    dispatch({
      type: SAVE_LEGAL_DOCUMENT_SUCCESS,
      payload: response.data?.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: SAVE_LEGAL_DOCUMENT_FAILURE,
      payload: errorMessage(error),
    });
    throw error;
  }
};

/**
 * Clone any version into a fresh editable draft — the way an amendment starts,
 * since published wording is immutable server-side.
 */
export const createLegalDocumentVersion = (id) => async (dispatch) => {
  dispatch({ type: SAVE_LEGAL_DOCUMENT_REQUEST });

  try {
    const response = await axiosInstance.post(`${ADMIN_BASE}/${id}/new-version`);

    dispatch({
      type: SAVE_LEGAL_DOCUMENT_SUCCESS,
      payload: response.data?.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: SAVE_LEGAL_DOCUMENT_FAILURE,
      payload: errorMessage(error),
    });
    throw error;
  }
};

export const publishLegalDocument = (id) => async (dispatch) => {
  dispatch({ type: SAVE_LEGAL_DOCUMENT_REQUEST });

  try {
    const response = await axiosInstance.post(`${ADMIN_BASE}/${id}/publish`);

    dispatch({
      type: SAVE_LEGAL_DOCUMENT_SUCCESS,
      payload: response.data?.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: SAVE_LEGAL_DOCUMENT_FAILURE,
      payload: errorMessage(error),
    });
    throw error;
  }
};

export const deleteLegalDocument = (id) => async (dispatch) => {
  dispatch({ type: DELETE_LEGAL_DOCUMENT_REQUEST });

  try {
    const response = await axiosInstance.delete(`${ADMIN_BASE}/${id}`);

    dispatch({
      type: DELETE_LEGAL_DOCUMENT_SUCCESS,
      payload: response.data?.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: DELETE_LEGAL_DOCUMENT_FAILURE,
      payload: errorMessage(error),
    });
    throw error;
  }
};

/**
 * Public read used by the customer-facing /privacy and /terms pages. No auth —
 * these pages must render for signed-out visitors and for crawlers.
 */
export const fetchPublishedLegalDocument = (type) => async (dispatch) => {
  dispatch({
    type: FETCH_PUBLISHED_LEGAL_DOCUMENT_REQUEST,
    payload: { documentType: type },
  });

  try {
    const response = await axiosInstance.get(`${PUBLIC_BASE}/${type}`);

    dispatch({
      type: FETCH_PUBLISHED_LEGAL_DOCUMENT_SUCCESS,
      payload: { documentType: type, document: response.data?.data },
    });

    return response.data?.data;
  } catch (error) {
    dispatch({
      type: FETCH_PUBLISHED_LEGAL_DOCUMENT_FAILURE,
      payload: { documentType: type, error: errorMessage(error) },
    });
    // Swallowed on purpose: the public pages fall back to their bundled copy,
    // so a fetch failure must not blank the page or surface an error state.
    return null;
  }
};

