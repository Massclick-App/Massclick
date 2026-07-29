// src/redux/reducers/legalDocumentsReducer.js

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
} from "../actions/userActionTypes.js";

const initialState = {
  documents: [],
  total: 0,
  loading: false,
  saving: false,
  error: null,
  // Keyed by document type so /privacy and /terms can each hold their own
  // published copy without evicting the other.
  published: {},
  publishedLoading: {},
};

export default function legalDocumentsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_LEGAL_DOCUMENTS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_LEGAL_DOCUMENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        documents: Array.isArray(action.payload?.data) ? action.payload.data : [],
        total: action.payload?.total || 0,
        error: null,
      };

    case FETCH_LEGAL_DOCUMENTS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case SAVE_LEGAL_DOCUMENT_REQUEST:
    case DELETE_LEGAL_DOCUMENT_REQUEST:
      return { ...state, saving: true, error: null };

    // The list is refetched after every mutation (publish archives a sibling
    // row, so patching one entry in place would leave the table stale).
    case SAVE_LEGAL_DOCUMENT_SUCCESS:
    case DELETE_LEGAL_DOCUMENT_SUCCESS:
      return { ...state, saving: false, error: null };

    case SAVE_LEGAL_DOCUMENT_FAILURE:
    case DELETE_LEGAL_DOCUMENT_FAILURE:
      return { ...state, saving: false, error: action.payload };

    case FETCH_PUBLISHED_LEGAL_DOCUMENT_REQUEST:
      return {
        ...state,
        publishedLoading: {
          ...state.publishedLoading,
          [action.payload.documentType]: true,
        },
      };

    case FETCH_PUBLISHED_LEGAL_DOCUMENT_SUCCESS:
      return {
        ...state,
        published: {
          ...state.published,
          [action.payload.documentType]: action.payload.document,
        },
        publishedLoading: {
          ...state.publishedLoading,
          [action.payload.documentType]: false,
        },
      };

    case FETCH_PUBLISHED_LEGAL_DOCUMENT_FAILURE:
      return {
        ...state,
        publishedLoading: {
          ...state.publishedLoading,
          [action.payload.documentType]: false,
        },
      };

    default:
      return state;
  }
}
