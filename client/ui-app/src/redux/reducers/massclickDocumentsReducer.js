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
} from "../actions/userActionTypes.js";

const initialState = {
  documents: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

export default function massclickDocumentsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_MASSCLICK_DOCUMENTS_REQUEST:
    case CREATE_MASSCLICK_DOCUMENT_REQUEST:
    case EDIT_MASSCLICK_DOCUMENT_REQUEST:
    case DELETE_MASSCLICK_DOCUMENT_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_MASSCLICK_DOCUMENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        documents: action.payload.data,
        total: action.payload.total,
        pageNo: action.payload.pageNo,
        pageSize: action.payload.pageSize,
      };

    case CREATE_MASSCLICK_DOCUMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        documents: [action.payload, ...state.documents],
      };

    case EDIT_MASSCLICK_DOCUMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        documents: state.documents.map((document) =>
          document._id === action.payload._id ? action.payload : document
        ),
      };

    case DELETE_MASSCLICK_DOCUMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        documents: state.documents.filter(
          (document) => document._id !== action.payload._id
        ),
      };

    case FETCH_MASSCLICK_DOCUMENTS_FAILURE:
    case CREATE_MASSCLICK_DOCUMENT_FAILURE:
    case EDIT_MASSCLICK_DOCUMENT_FAILURE:
    case DELETE_MASSCLICK_DOCUMENT_FAILURE:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}
