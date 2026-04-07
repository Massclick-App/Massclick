import axios from "axios";
import {
  CREATE_PAYMENT_REQUEST,
  CREATE_PAYMENT_SUCCESS,
  CREATE_PAYMENT_FAILURE,
  CHECK_PAYMENT_STATUS_REQUEST,
  CHECK_PAYMENT_STATUS_SUCCESS,
  CHECK_PAYMENT_STATUS_FAILURE,
} from "./userActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

export const createPhonePePayment = (amount, userId, businessId) => async (dispatch) => {
  dispatch({ type: CREATE_PAYMENT_REQUEST });

  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/phonepe/create`,
  { amount, userId, businessId }, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { paymentUrl, transactionId } = response.data;
    dispatch({
      type: CREATE_PAYMENT_SUCCESS,
      payload: { paymentUrl, transactionId },
    });

    if (paymentUrl) {
      window.location.href = paymentUrl; 
    }
  } catch (error) {
    console.error("Error creating PhonePe payment:", error);
    dispatch({
      type: CREATE_PAYMENT_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const checkPhonePeStatus = (transactionId) => async (dispatch) => {
  dispatch({ type: CHECK_PAYMENT_STATUS_REQUEST });

  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/phonepe/status/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    dispatch({
      type: CHECK_PAYMENT_STATUS_SUCCESS,
      payload: response.data,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    dispatch({
      type: CHECK_PAYMENT_STATUS_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};
