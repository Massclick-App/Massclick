import axios from "axios";
import {
  MATCH_LEADS_REQUEST,
  MATCH_LEADS_SUCCESS,
  MATCH_LEADS_FAILURE,
} from "./userActionTypes";
import { getClientToken } from "./clientAuthAction.js";

const API_URL = process.env.REACT_APP_API_URL;

export const fetchMatchedLeads = () => async (dispatch) => {
  dispatch({ type: MATCH_LEADS_REQUEST });

  try {
    const mobileNumber = localStorage.getItem("mobileNumber");
    if (!mobileNumber) {
      throw new Error("Mobile number not found");
    }

    const token = await dispatch(getClientToken());
    if (!token) {
      throw new Error("Access token missing");
    }

    const response = await axios.get(
      `${API_URL}/leadsData/leads/${mobileNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const matchedSearchLogs =
      response?.data?.data?.matchedSearchLogs || [];

    const leadsData =
      response?.data?.data?.leadsData || [];

    const finalLeads =
      matchedSearchLogs.length > 0
        ? matchedSearchLogs
        : leadsData;

    dispatch({
      type: MATCH_LEADS_SUCCESS,
      payload: finalLeads,
    });

    return response.data;

  } catch (error) {
    dispatch({
      type: MATCH_LEADS_FAILURE,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong",
    });

    return null;
  }
};
