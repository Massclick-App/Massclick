import {
  FETCH_EVENT_CATEGORY_REQUEST, FETCH_EVENT_CATEGORY_SUCCESS, FETCH_EVENT_CATEGORY_FAILURE,
  CREATE_EVENT_CATEGORY_REQUEST, CREATE_EVENT_CATEGORY_SUCCESS, CREATE_EVENT_CATEGORY_FAILURE,
  EDIT_EVENT_CATEGORY_REQUEST, EDIT_EVENT_CATEGORY_SUCCESS, EDIT_EVENT_CATEGORY_FAILURE,
  DELETE_EVENT_CATEGORY_REQUEST, DELETE_EVENT_CATEGORY_SUCCESS, DELETE_EVENT_CATEGORY_FAILURE,
  FETCH_EVENT_LOCATION_REQUEST, FETCH_EVENT_LOCATION_SUCCESS, FETCH_EVENT_LOCATION_FAILURE,
  CREATE_EVENT_LOCATION_REQUEST, CREATE_EVENT_LOCATION_SUCCESS, CREATE_EVENT_LOCATION_FAILURE,
  EDIT_EVENT_LOCATION_REQUEST, EDIT_EVENT_LOCATION_SUCCESS, EDIT_EVENT_LOCATION_FAILURE,
  DELETE_EVENT_LOCATION_REQUEST, DELETE_EVENT_LOCATION_SUCCESS, DELETE_EVENT_LOCATION_FAILURE,
  FETCH_EVENT_ADVERTISEMENT_REQUEST, FETCH_EVENT_ADVERTISEMENT_SUCCESS, FETCH_EVENT_ADVERTISEMENT_FAILURE,
  CREATE_EVENT_ADVERTISEMENT_REQUEST, CREATE_EVENT_ADVERTISEMENT_SUCCESS, CREATE_EVENT_ADVERTISEMENT_FAILURE,
  EDIT_EVENT_ADVERTISEMENT_REQUEST, EDIT_EVENT_ADVERTISEMENT_SUCCESS, EDIT_EVENT_ADVERTISEMENT_FAILURE,
  DELETE_EVENT_ADVERTISEMENT_REQUEST, DELETE_EVENT_ADVERTISEMENT_SUCCESS, DELETE_EVENT_ADVERTISEMENT_FAILURE,
  FETCH_HOME_POPUP_EVENT_AD_REQUEST, FETCH_HOME_POPUP_EVENT_AD_SUCCESS, FETCH_HOME_POPUP_EVENT_AD_FAILURE,
  FETCH_EVENT_CREATION_REQUEST, FETCH_EVENT_CREATION_SUCCESS, FETCH_EVENT_CREATION_FAILURE,
  VIEW_EVENT_CREATION_REQUEST, VIEW_EVENT_CREATION_SUCCESS, VIEW_EVENT_CREATION_FAILURE,
  CREATE_EVENT_CREATION_REQUEST, CREATE_EVENT_CREATION_SUCCESS, CREATE_EVENT_CREATION_FAILURE,
  EDIT_EVENT_CREATION_REQUEST, EDIT_EVENT_CREATION_SUCCESS, EDIT_EVENT_CREATION_FAILURE,
  DELETE_EVENT_CREATION_REQUEST, DELETE_EVENT_CREATION_SUCCESS, DELETE_EVENT_CREATION_FAILURE,
  PUBLISH_EVENT_CREATION_REQUEST, PUBLISH_EVENT_CREATION_SUCCESS, PUBLISH_EVENT_CREATION_FAILURE,
} from '../actions/eventActionTypes.js';

const initialEventState = {
  data: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  loading: false,
  error: null,
};

const initialEventDetailState = {
  data: null,
  loading: false,
  error: null,
};

const initialState = {
  eventCategory: initialEventState,
  eventLocation: initialEventState,
  eventAdvertisement: { ...initialEventState, homePopupAd: null, homePopupAdLoading: false },
  eventCreation: initialEventState,
  eventCreationDetail: initialEventDetailState,
};

export default function eventReducer(state = initialState, action) {
  switch (action.type) {
    // ============= EVENT CATEGORY =============
    case FETCH_EVENT_CATEGORY_REQUEST:
    case CREATE_EVENT_CATEGORY_REQUEST:
    case EDIT_EVENT_CATEGORY_REQUEST:
    case DELETE_EVENT_CATEGORY_REQUEST:
      return {
        ...state,
        eventCategory: { ...state.eventCategory, loading: true, error: null }
      };

    case FETCH_EVENT_CATEGORY_SUCCESS:
      return {
        ...state,
        eventCategory: {
          data: action.payload.data,
          total: action.payload.total,
          pageNo: action.payload.pageNo,
          pageSize: action.payload.pageSize,
          loading: false,
          error: null
        }
      };

    case FETCH_EVENT_CATEGORY_FAILURE:
      return {
        ...state,
        eventCategory: { ...state.eventCategory, loading: false, error: action.payload }
      };

    case CREATE_EVENT_CATEGORY_SUCCESS:
      return {
        ...state,
        eventCategory: {
          ...state.eventCategory,
          data: [action.payload, ...state.eventCategory.data],
          loading: false,
          error: null
        }
      };

    case EDIT_EVENT_CATEGORY_SUCCESS:
      return {
        ...state,
        eventCategory: {
          ...state.eventCategory,
          data: state.eventCategory.data.map(cat =>
            cat._id === action.payload._id ? action.payload : cat
          ),
          loading: false,
          error: null
        }
      };

    case DELETE_EVENT_CATEGORY_SUCCESS:
      return {
        ...state,
        eventCategory: {
          ...state.eventCategory,
          data: state.eventCategory.data.filter(cat => cat._id !== action.payload),
          total: state.eventCategory.total - 1,
          loading: false,
          error: null
        }
      };

    // ============= EVENT LOCATION =============
    case FETCH_EVENT_LOCATION_REQUEST:
    case CREATE_EVENT_LOCATION_REQUEST:
    case EDIT_EVENT_LOCATION_REQUEST:
    case DELETE_EVENT_LOCATION_REQUEST:
      return {
        ...state,
        eventLocation: { ...state.eventLocation, loading: true, error: null }
      };

    case FETCH_EVENT_LOCATION_SUCCESS:
      return {
        ...state,
        eventLocation: {
          data: action.payload.data,
          total: action.payload.total,
          pageNo: action.payload.pageNo,
          pageSize: action.payload.pageSize,
          loading: false,
          error: null
        }
      };

    case FETCH_EVENT_LOCATION_FAILURE:
      return {
        ...state,
        eventLocation: { ...state.eventLocation, loading: false, error: action.payload }
      };

    case CREATE_EVENT_LOCATION_SUCCESS:
      return {
        ...state,
        eventLocation: {
          ...state.eventLocation,
          data: [action.payload, ...state.eventLocation.data],
          loading: false,
          error: null
        }
      };

    case EDIT_EVENT_LOCATION_SUCCESS:
      return {
        ...state,
        eventLocation: {
          ...state.eventLocation,
          data: state.eventLocation.data.map(loc =>
            loc._id === action.payload._id ? action.payload : loc
          ),
          loading: false,
          error: null
        }
      };

    case DELETE_EVENT_LOCATION_SUCCESS:
      return {
        ...state,
        eventLocation: {
          ...state.eventLocation,
          data: state.eventLocation.data.filter(loc => loc._id !== action.payload),
          total: state.eventLocation.total - 1,
          loading: false,
          error: null
        }
      };

    // ============= EVENT ADVERTISEMENT =============
    case FETCH_EVENT_ADVERTISEMENT_REQUEST:
    case CREATE_EVENT_ADVERTISEMENT_REQUEST:
    case EDIT_EVENT_ADVERTISEMENT_REQUEST:
    case DELETE_EVENT_ADVERTISEMENT_REQUEST:
      return {
        ...state,
        eventAdvertisement: { ...state.eventAdvertisement, loading: true, error: null }
      };

    case FETCH_EVENT_ADVERTISEMENT_SUCCESS:
      return {
        ...state,
        eventAdvertisement: {
          data: action.payload.data,
          total: action.payload.total,
          pageNo: action.payload.pageNo,
          pageSize: action.payload.pageSize,
          loading: false,
          error: null
        }
      };

    case FETCH_EVENT_ADVERTISEMENT_FAILURE:
      return {
        ...state,
        eventAdvertisement: { ...state.eventAdvertisement, loading: false, error: action.payload }
      };

    case CREATE_EVENT_ADVERTISEMENT_SUCCESS:
      return {
        ...state,
        eventAdvertisement: {
          ...state.eventAdvertisement,
          data: [action.payload, ...state.eventAdvertisement.data],
          loading: false,
          error: null
        }
      };

    case EDIT_EVENT_ADVERTISEMENT_SUCCESS:
      return {
        ...state,
        eventAdvertisement: {
          ...state.eventAdvertisement,
          data: state.eventAdvertisement.data.map(ad =>
            ad._id === action.payload._id ? action.payload : ad
          ),
          loading: false,
          error: null
        }
      };

    case DELETE_EVENT_ADVERTISEMENT_SUCCESS:
      return {
        ...state,
        eventAdvertisement: {
          ...state.eventAdvertisement,
          data: state.eventAdvertisement.data.filter(ad => ad._id !== action.payload),
          total: state.eventAdvertisement.total - 1,
          loading: false,
          error: null
        }
      };

    case FETCH_HOME_POPUP_EVENT_AD_REQUEST:
      return {
        ...state,
        eventAdvertisement: { ...state.eventAdvertisement, homePopupAdLoading: true }
      };

    case FETCH_HOME_POPUP_EVENT_AD_SUCCESS:
      return {
        ...state,
        eventAdvertisement: {
          ...state.eventAdvertisement,
          homePopupAdLoading: false,
          homePopupAd:
            Array.isArray(action.payload) && action.payload.length > 0
              ? action.payload[0]
              : null,
        }
      };

    case FETCH_HOME_POPUP_EVENT_AD_FAILURE:
      return {
        ...state,
        eventAdvertisement: { ...state.eventAdvertisement, homePopupAdLoading: false }
      };

    // ============= EVENT CREATION =============
    case FETCH_EVENT_CREATION_REQUEST:
    case CREATE_EVENT_CREATION_REQUEST:
    case EDIT_EVENT_CREATION_REQUEST:
    case DELETE_EVENT_CREATION_REQUEST:
    case PUBLISH_EVENT_CREATION_REQUEST:
      return {
        ...state,
        eventCreation: { ...state.eventCreation, loading: true, error: null }
      };

    case FETCH_EVENT_CREATION_SUCCESS:
      return {
        ...state,
        eventCreation: {
          data: action.payload.data,
          total: action.payload.total,
          pageNo: action.payload.pageNo,
          pageSize: action.payload.pageSize,
          loading: false,
          error: null
        }
      };

    case FETCH_EVENT_CREATION_FAILURE:
      return {
        ...state,
        eventCreation: { ...state.eventCreation, loading: false, error: action.payload }
      };

    case VIEW_EVENT_CREATION_REQUEST:
      return {
        ...state,
        eventCreationDetail: { ...state.eventCreationDetail, loading: true, error: null }
      };

    case VIEW_EVENT_CREATION_SUCCESS:
      return {
        ...state,
        eventCreationDetail: {
          data: action.payload,
          loading: false,
          error: null
        }
      };

    case VIEW_EVENT_CREATION_FAILURE:
      return {
        ...state,
        eventCreationDetail: {
          ...state.eventCreationDetail,
          loading: false,
          error: action.payload
        }
      };

    case CREATE_EVENT_CREATION_SUCCESS:
      return {
        ...state,
        eventCreation: {
          ...state.eventCreation,
          data: [action.payload, ...state.eventCreation.data],
          loading: false,
          error: null
        }
      };

    case EDIT_EVENT_CREATION_SUCCESS:
    case PUBLISH_EVENT_CREATION_SUCCESS:
      return {
        ...state,
        eventCreation: {
          ...state.eventCreation,
          data: state.eventCreation.data.map(event =>
            event._id === action.payload._id ? action.payload : event
          ),
          loading: false,
          error: null
        }
      };

    case DELETE_EVENT_CREATION_SUCCESS:
      return {
        ...state,
        eventCreation: {
          ...state.eventCreation,
          data: state.eventCreation.data.filter(event => event._id !== action.payload),
          total: state.eventCreation.total - 1,
          loading: false,
          error: null
        }
      };

    // Failures
    case CREATE_EVENT_CATEGORY_FAILURE:
    case EDIT_EVENT_CATEGORY_FAILURE:
    case DELETE_EVENT_CATEGORY_FAILURE:
      return {
        ...state,
        eventCategory: { ...state.eventCategory, loading: false, error: action.payload }
      };

    case CREATE_EVENT_LOCATION_FAILURE:
    case EDIT_EVENT_LOCATION_FAILURE:
    case DELETE_EVENT_LOCATION_FAILURE:
      return {
        ...state,
        eventLocation: { ...state.eventLocation, loading: false, error: action.payload }
      };

    case CREATE_EVENT_ADVERTISEMENT_FAILURE:
    case EDIT_EVENT_ADVERTISEMENT_FAILURE:
    case DELETE_EVENT_ADVERTISEMENT_FAILURE:
      return {
        ...state,
        eventAdvertisement: { ...state.eventAdvertisement, loading: false, error: action.payload }
      };

    case CREATE_EVENT_CREATION_FAILURE:
    case EDIT_EVENT_CREATION_FAILURE:
    case DELETE_EVENT_CREATION_FAILURE:
    case PUBLISH_EVENT_CREATION_FAILURE:
      return {
        ...state,
        eventCreation: { ...state.eventCreation, loading: false, error: action.payload }
      };

    default:
      return state;
  }
}
