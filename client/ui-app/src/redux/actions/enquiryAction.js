// src/redux/actions/enquiryActions.js (or wherever this file lives)

import axios from "axios";
import {
    FETCH_ENQUIRY_REQUEST, FETCH_ENQUIRY_SUCCESS, FETCH_ENQUIRY_FAILURE,
    CREATE_ENQUIRY_REQUEST, CREATE_ENQUIRY_SUCCESS, CREATE_ENQUIRY_FAILURE,
    EDIT_ENQUIRY_REQUEST, EDIT_ENQUIRY_SUCCESS, EDIT_ENQUIRY_FAILURE,
    DELETE_ENQUIRY_REQUEST, DELETE_ENQUIRY_SUCCESS, DELETE_ENQUIRY_FAILURE
} from "../actions/userActionTypes.js"; // Note: Ensure userActionTypes contains the ENQUIRY types

const API_URL = process.env.REACT_APP_API_URL;


export const getAllEnquiry = () => async (dispatch) => {
    dispatch({ type: FETCH_ENQUIRY_REQUEST });
    try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`${API_URL}/enquiry/viewall`, { 
            headers: { Authorization: `Bearer ${token}` },
        });

        const enquiries = response.data || []; 
        
        dispatch({ type: FETCH_ENQUIRY_SUCCESS, payload: enquiries });
    } catch (error) {
        dispatch({
            type: FETCH_ENQUIRY_FAILURE,
            payload: error.response?.data || error.message,
        });
    }
};


export const createEnquiry = (enquiryData) => async (dispatch) => { 
    dispatch({ type: CREATE_ENQUIRY_REQUEST }); 
    try {
    
        const token = localStorage.getItem("accessToken"); 
        
       const response = await axios.post(`${API_URL}/enquiry/create`, enquiryData, { 
            headers: { Authorization: `Bearer ${token}` },
        });

        const createdEnquiry = response.data.data || response.data; 

        dispatch({ type: CREATE_ENQUIRY_SUCCESS, payload: createdEnquiry });

        return createdEnquiry;
    } catch (error) {
        const errPayload = error.response?.data || error.message;
        dispatch({ type: CREATE_ENQUIRY_FAILURE, payload: errPayload });
        throw error;
    }
};


export const editEnquiry = (id, enquiryData) => async (dispatch) => { 
    dispatch({ type: EDIT_ENQUIRY_REQUEST });
    try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.put(`${API_URL}/enquiry/update/${id}`, enquiryData, { 
            headers: { Authorization: `Bearer ${token}` },
        });
        
        const updatedEnquiry = response.data.enquiry || response.data; 
        
        dispatch({ type: EDIT_ENQUIRY_SUCCESS, payload: updatedEnquiry }); 
        return updatedEnquiry;
    } catch (error) {
        dispatch({ type: EDIT_ENQUIRY_FAILURE, payload: error.response?.data || error.message }); 
        throw error;
    }
};


export const deleteEnquiry = (id) => async (dispatch) => {
    dispatch({ type: DELETE_ENQUIRY_REQUEST }); 
    try {
        const token = localStorage.getItem("accessToken");
        const { data } = await axios.delete(`${API_URL}/enquiry/delete/${id}`, { 
            headers: { Authorization: `Bearer ${token}` },
        });
        
        dispatch({ type: DELETE_ENQUIRY_SUCCESS, payload: data.enquiry }); 
    } catch (error) {
        dispatch({ type: DELETE_ENQUIRY_FAILURE, payload: error.response?.data || error.message }); 
        throw error;
    }
};