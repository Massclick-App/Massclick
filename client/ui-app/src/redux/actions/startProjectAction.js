import axios from "axios";
import {
    CREATE_STARTPROJECT_REQUEST, CREATE_STARTPROJECT_SUCCESS, CREATE_STARTPROJECT_FAILURE,
    FETCH_STARTPROJECT_REQUEST, FETCH_STARTPROJECT_SUCCESS, FETCH_STARTPROJECT_FAILURE,
    EDIT_STARTPROJECT_REQUEST, EDIT_STARTPROJECT_SUCCESS, EDIT_STARTPROJECT_FAILURE,
    DELETE_STARTPROJECT_REQUEST, DELETE_STARTPROJECT_SUCCESS, DELETE_STARTPROJECT_FAILURE
} from "./userActionTypes";
import { getClientToken } from "./clientAuthAction";

const API_URL = process.env.REACT_APP_API_URL;

const getValidToken = async (dispatch) => {
    let token = localStorage.getItem("accessToken");
    if (!token) token = await dispatch(getClientToken());
    if (!token) throw new Error("No valid token found");
    return token;
};


export const createStartProject = (projectData) => async (dispatch) => {
    dispatch({ type: CREATE_STARTPROJECT_REQUEST });
    try {
        const token = await getValidToken(dispatch);

        const response = await axios.post(`${API_URL}/startproject/create`, projectData, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const createdProject = response.data;

        dispatch({ type: CREATE_STARTPROJECT_SUCCESS, payload: createdProject });

        return createdProject;
    } catch (error) {
        const errPayload = error.response?.data || error.message;
        dispatch({ type: CREATE_STARTPROJECT_FAILURE, payload: errPayload });
        throw error;
    }
};

export const getAllStartProjects = () => async (dispatch) => {
    dispatch({ type: FETCH_STARTPROJECT_REQUEST });
    try {
        const token = await getValidToken(dispatch);
        const response = await axios.get(`${API_URL}/startproject/viewall`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const projects = response.data || [];
        dispatch({ type: FETCH_STARTPROJECT_SUCCESS, payload: projects });
    } catch (error) {
        dispatch({
            type: FETCH_STARTPROJECT_FAILURE,
            payload: error.response?.data || error.message,
        });
    }
};

export const editStartProject = (id, projectData) => async (dispatch) => {
    dispatch({ type: EDIT_STARTPROJECT_REQUEST });
    try {
        const token = await getValidToken(dispatch);
        const response = await axios.put(`${API_URL}/startproject/update/${id}`, projectData, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const updatedProject = response.data;
        dispatch({ type: EDIT_STARTPROJECT_SUCCESS, payload: updatedProject });
        return updatedProject;
    } catch (error) {
        dispatch({ type: EDIT_STARTPROJECT_FAILURE, payload: error.response?.data || error.message });
        throw error;
    }
};

export const deleteStartProject = (id) => async (dispatch) => {
    dispatch({ type: DELETE_STARTPROJECT_REQUEST });
    try {
        const token = await getValidToken(dispatch);
        const { data } = await axios.delete(`${API_URL}/startproject/delete/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        dispatch({ type: DELETE_STARTPROJECT_SUCCESS, payload: data.project });
    } catch (error) {
        dispatch({ type: DELETE_STARTPROJECT_FAILURE, payload: error.response?.data || error.message });
        throw error;
    }
};