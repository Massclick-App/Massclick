import {
    CREATE_STARTPROJECT_REQUEST, CREATE_STARTPROJECT_SUCCESS, CREATE_STARTPROJECT_FAILURE,
    FETCH_STARTPROJECT_REQUEST, FETCH_STARTPROJECT_SUCCESS, FETCH_STARTPROJECT_FAILURE,
    EDIT_STARTPROJECT_REQUEST, EDIT_STARTPROJECT_SUCCESS, EDIT_STARTPROJECT_FAILURE,
    DELETE_STARTPROJECT_REQUEST, DELETE_STARTPROJECT_SUCCESS, DELETE_STARTPROJECT_FAILURE
} from '../actions/userActionTypes';

const initialState = {
    projects: [], 
    loading: false,
    error: null,
};

export default function startProjectReducer(state = initialState, action) {
    switch (action.type) {
        case FETCH_STARTPROJECT_REQUEST:
        case CREATE_STARTPROJECT_REQUEST:
        case EDIT_STARTPROJECT_REQUEST:
        case DELETE_STARTPROJECT_REQUEST:
            return { ...state, loading: true, error: null };

        case FETCH_STARTPROJECT_SUCCESS:
            return { ...state, loading: false, projects: action.payload, error: null };

        case CREATE_STARTPROJECT_SUCCESS:
            return { ...state, loading: false, projects: [action.payload, ...state.projects], error: null };

        case EDIT_STARTPROJECT_SUCCESS:
            return {
                ...state,
                loading: false,
                projects: state.projects.map(proj =>
                    proj._id === action.payload._id ? action.payload : proj
                ),
                error: null,
            };

        case DELETE_STARTPROJECT_SUCCESS:
            return {
                ...state,
                loading: false,
                projects: state.projects.filter(proj => proj._id !== action.payload._id),
                error: null,
            };

        case FETCH_STARTPROJECT_FAILURE:
        case CREATE_STARTPROJECT_FAILURE:
        case EDIT_STARTPROJECT_FAILURE:
        case DELETE_STARTPROJECT_FAILURE:
            return { ...state, loading: false, error: action.payload };

        default:
            return state;
    }
}