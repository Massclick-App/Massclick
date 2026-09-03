import {
  CLEAR_APPLICATION_SUCCESS, DELETE_JOB_SUCCESS, FETCH_APPLICATIONS_SUCCESS,
  FETCH_HIRING_FILTERS_SUCCESS, FETCH_JOBS_SUCCESS, FETCH_JOB_SUCCESS,
  HIRING_FAILURE, HIRING_REQUEST, SAVE_JOB_SUCCESS, SUBMIT_APPLICATION_SUCCESS,
  UPDATE_APPLICATION_SUCCESS,
} from "state/actions/hiringActionTypes.js";

const initialState = {
  jobs: [], selectedJob: null, filters: { departments: [], locations: [] },
  applications: [], applicationSuccess: false, loading: false, error: null,
};

export default function hiringReducer(state = initialState, action) {
  switch (action.type) {
    case HIRING_REQUEST:
      return { ...state, loading: true, error: null };
    case HIRING_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case FETCH_JOBS_SUCCESS:
      return { ...state, loading: false, jobs: action.payload, error: null };
    case FETCH_JOB_SUCCESS:
      return { ...state, loading: false, selectedJob: action.payload, error: null };
    case FETCH_HIRING_FILTERS_SUCCESS:
      return { ...state, loading: false, filters: { departments: action.payload.departments || [], locations: action.payload.locations || [] } };
    case SAVE_JOB_SUCCESS: {
      const exists = state.jobs.some((job) => job._id === action.payload._id);
      return { ...state, loading: false, jobs: exists ? state.jobs.map((job) => job._id === action.payload._id ? action.payload : job) : [action.payload, ...state.jobs] };
    }
    case DELETE_JOB_SUCCESS:
      return { ...state, loading: false, jobs: state.jobs.filter((job) => job._id !== action.payload) };
    case SUBMIT_APPLICATION_SUCCESS:
      return { ...state, loading: false, applicationSuccess: true };
    case CLEAR_APPLICATION_SUCCESS:
      return { ...state, applicationSuccess: false, error: null };
    case FETCH_APPLICATIONS_SUCCESS:
      return { ...state, loading: false, applications: action.payload };
    case UPDATE_APPLICATION_SUCCESS:
      return { ...state, loading: false, applications: state.applications.map((item) => item._id === action.payload._id ? action.payload : item) };
    default:
      return state;
  }
}
