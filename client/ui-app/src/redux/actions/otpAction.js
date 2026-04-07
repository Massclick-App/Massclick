import axios from "axios";
import {
  SEND_OTP_REQUEST, SEND_OTP_SUCCESS, SEND_OTP_FAILURE,
  VERIFY_OTP_REQUEST, VERIFY_OTP_SUCCESS, VERIFY_OTP_FAILURE,
  USER_LOGOUT,
  UPDATE_OTP_USER_REQUEST, UPDATE_OTP_USER_SUCCESS, UPDATE_OTP_USER_FAILURE,
  VIEW_OTP_USER_REQUEST, VIEW_OTP_USER_SUCCESS, VIEW_OTP_USER_FAILURE,
  VIEWALL_OTP_USER_REQUEST, VIEWALL_OTP_USER_SUCCESS, VIEWALL_OTP_USER_FAILURE,
   LOG_USER_SEARCH_REQUEST, LOG_USER_SEARCH_SUCCESS,LOG_USER_SEARCH_FAILURE,
   SEND_WHATSAPP_ALL_REQUEST, SEND_WHATSAPP_ALL_SUCCESS, SEND_WHATSAPP_ALL_FAILURE,
   SEND_WHATSAPP_REQUEST, SEND_WHATSAPP_SUCCESS, SEND_WHATSAPP_FAILURE
} from "../actions/userActionTypes";

const API_URL = process.env.REACT_APP_API_URL;

export const sendOtp = (phoneNumber) => async (dispatch) => {
  dispatch({ type: SEND_OTP_REQUEST });
  try {
    const response = await axios.post(`${API_URL}/otp_user/send-otp`, { phoneNumber });

    dispatch({ type: SEND_OTP_SUCCESS, payload: response.data });

    return response.data; 
  } catch (error) {
    const errPayload = error.response?.data || { message: error.message };
    dispatch({ type: SEND_OTP_FAILURE, payload: errPayload });
    throw error;
  }
};

export const verifyOtp = (mobile, otp, userName = "") => async (dispatch) => {
  dispatch({ type: VERIFY_OTP_REQUEST });

  try {
    const response = await axios.post(
      `${API_URL}/otp_user/verify-otp`,
      { phoneNumber: mobile, otp, userName },
      { headers: { "Content-Type": "application/json" } }
    );

    const token = response.data.token;
    const user = response.data.user;

    if (token) {
      localStorage.setItem("authToken", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
if (user) {
  localStorage.setItem("authUser", JSON.stringify(user));
}
    dispatch({ type: VERIFY_OTP_SUCCESS, payload: response.data });
    return response.data;

  } catch (error) {
    const errPayload = error.response?.data || { message: error.message };
    dispatch({ type: VERIFY_OTP_FAILURE, payload: errPayload });
    throw error;
  }
};

export const updateOtpUser = (mobile, data) => async (dispatch) => {
  dispatch({ type: UPDATE_OTP_USER_REQUEST });

  try {
    const response = await axios.put(
      `${API_URL}/otp_user_update/${mobile}`,   
      data,
      { headers: { "Content-Type": "application/json" } }
    );

    dispatch({
      type: UPDATE_OTP_USER_SUCCESS,
      payload: response.data,
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: UPDATE_OTP_USER_FAILURE,
      payload: error.response?.data || error.message,
    });

    throw error;
  }
};

export const viewOtpUser = (mobile) => async (dispatch) => {

  dispatch({ type: VIEW_OTP_USER_REQUEST });

  try {

    const response = await axios.get(`${API_URL}/otp_user/${mobile}`);

    dispatch({
      type: VIEW_OTP_USER_SUCCESS,
      payload: response.data.user,
    });

    return response.data.user;

  } catch (error) {

    dispatch({
      type: VIEW_OTP_USER_FAILURE,
      payload: error.response?.data || error.message,
    });
  }
};

export const viewAllOtpUsers = () => async (dispatch) => {
  dispatch({ type: VIEWALL_OTP_USER_REQUEST });
  try {
    const response = await axios.get(`${API_URL}/otp_users`);
    dispatch({ type: VIEWALL_OTP_USER_SUCCESS, payload: response.data.users, });
    return response.data.users;
  } catch (error) {
    const errPayload = error.response?.data || error.message;
    dispatch({ type: VIEWALL_OTP_USER_FAILURE, payload: errPayload });
    throw error;
  }
};

// --- Delete User ---
// export const deleteUser = (mobile) => async (dispatch) => {
//   dispatch({ type: DELETE_USER_REQUEST });
//   try {
//     const response = await axios.delete(`${API_URL}/otp_user/${mobile}`);
//     dispatch({ type: DELETE_USER_SUCCESS, payload: response.data });
//     return response.data;
//   } catch (error) {
//     const errPayload = error.response?.data || error.message;
//     dispatch({ type: DELETE_USER_FAILURE, payload: errPayload });
//     throw error;
//   }
// };

export const userLogout = () => (dispatch) => {
  localStorage.removeItem("authToken");
  delete axios.defaults.headers.common["Authorization"];
  dispatch({ type: USER_LOGOUT });
};


export const logUserSearch = (userId, query, location, category) => async (dispatch) => {
  dispatch({ type: LOG_USER_SEARCH_REQUEST });

  try {
    const response = await axios.post(`${API_URL}/otp_user/log-search`, {
      userId,
      query,
      location,
      category
    });

    dispatch({
      type: LOG_USER_SEARCH_SUCCESS,
      payload: response.data,
    });

    return response.data;
  } catch (error) {
    const errPayload = error.response?.data || { message: error.message };
    dispatch({
      type: LOG_USER_SEARCH_FAILURE,
      payload: errPayload,
    });
    throw error;
  }
};

export const sendWhatsAppForLead = (leadId) => async (dispatch) => {
  dispatch({ type: SEND_WHATSAPP_REQUEST });

  try {
    const res = await axios.post(
      `${API_URL}/leadssend/whatsapp`,
      { leadId },
      { headers: { "Content-Type": "application/json" } }
    );

    dispatch({
      type: SEND_WHATSAPP_SUCCESS,
      payload: {
        leadId,
        response: res.data
      }
    });

    return res.data;

  } catch (error) {
    dispatch({
      type: SEND_WHATSAPP_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};


export const sendWhatsAppToLeadsBulk = (leadIds = []) => async (dispatch) => {
  dispatch({ type: SEND_WHATSAPP_ALL_REQUEST });

  try {
    const res = await axios.post(
      `${API_URL}/leadssend/whatsappall`,
      { leadIds },
      { headers: { "Content-Type": "application/json" } }
    );

    dispatch({
      type: SEND_WHATSAPP_ALL_SUCCESS,
      payload: res.data
    });

    return res.data;

  } catch (error) {
    dispatch({
      type: SEND_WHATSAPP_ALL_FAILURE,
      payload: error.response?.data || error.message
    });
    throw error;
  }
};




