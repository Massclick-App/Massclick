import {
  CREATE_PAYMENT_REQUEST,
  CREATE_PAYMENT_SUCCESS,
  CREATE_PAYMENT_FAILURE,
  CHECK_PAYMENT_STATUS_REQUEST,
  CHECK_PAYMENT_STATUS_SUCCESS,
  CHECK_PAYMENT_STATUS_FAILURE,
} from "../actions/userActionTypes.js";

const initialState = {
  loading: false,
  paymentUrl: null,
  transactionId: null,
  qrString: null,
  statusData: null,
  error: null,
};

const phonepeReducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_PAYMENT_REQUEST:
    case CHECK_PAYMENT_STATUS_REQUEST:
      return { ...state, loading: true, error: null };

    case CREATE_PAYMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        paymentUrl: action.payload.paymentUrl,
        transactionId: action.payload.transactionId,
        qrString: action.payload.qrString,
      };

    case CHECK_PAYMENT_STATUS_SUCCESS:
      return {
        ...state,
        loading: false,
        statusData: action.payload,
      };

    case CREATE_PAYMENT_FAILURE:
    case CHECK_PAYMENT_STATUS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default phonepeReducer;
