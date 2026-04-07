// src/redux/reducers/enquiryReducer.js (New file)

import {
    FETCH_ENQUIRY_REQUEST, FETCH_ENQUIRY_SUCCESS, FETCH_ENQUIRY_FAILURE,
    CREATE_ENQUIRY_REQUEST, CREATE_ENQUIRY_SUCCESS, CREATE_ENQUIRY_FAILURE,
    EDIT_ENQUIRY_REQUEST, EDIT_ENQUIRY_SUCCESS, EDIT_ENQUIRY_FAILURE,
    DELETE_ENQUIRY_REQUEST, DELETE_ENQUIRY_SUCCESS, DELETE_ENQUIRY_FAILURE
} from '../actions/userActionTypes';

const initialState = {
    enquiries: [], // Renamed state slice for clarity
    loading: false,
    error: null,
};

export default function enquiryReducer(state = initialState, action) {
    switch (action.type) {
        case FETCH_ENQUIRY_REQUEST:
        case CREATE_ENQUIRY_REQUEST:
        case EDIT_ENQUIRY_REQUEST:
        case DELETE_ENQUIRY_REQUEST:
            return { ...state, loading: true, error: null };

        case FETCH_ENQUIRY_SUCCESS:
            return { ...state, loading: false, enquiries: action.payload, error: null };

        case CREATE_ENQUIRY_SUCCESS:
            // For CREATE, we add the new enquiry to the list (for Admin view)
            return { ...state, loading: false, enquiries: [action.payload, ...state.enquiries], error: null };

        case EDIT_ENQUIRY_SUCCESS:
            // For EDIT, we update the specific enquiry in the list
            return {
                ...state,
                loading: false,
                enquiries: state.enquiries.map(enq =>
                    enq._id === action.payload._id ? action.payload : enq
                ),
                error: null,
            };

        case DELETE_ENQUIRY_SUCCESS:
            // For DELETE, we remove the deleted enquiry from the list by filtering out the ID.
            return {
                ...state,
                loading: false,
                enquiries: state.enquiries.filter(enq => enq._id !== action.payload._id),
                error: null,
            };

        case FETCH_ENQUIRY_FAILURE:
        case CREATE_ENQUIRY_FAILURE:
        case EDIT_ENQUIRY_FAILURE:
        case DELETE_ENQUIRY_FAILURE:
            return { ...state, loading: false, error: action.payload };

        default:
            return state;
    }
}