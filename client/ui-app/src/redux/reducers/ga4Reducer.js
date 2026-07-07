import {
  FETCH_GA4_OVERVIEW_REQUEST, FETCH_GA4_OVERVIEW_SUCCESS, FETCH_GA4_OVERVIEW_FAILURE,
  FETCH_GA4_TRENDS_REQUEST, FETCH_GA4_TRENDS_SUCCESS, FETCH_GA4_TRENDS_FAILURE,
  FETCH_GA4_TRAFFIC_SOURCES_REQUEST, FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, FETCH_GA4_TRAFFIC_SOURCES_FAILURE,
  FETCH_GA4_LOCATIONS_REQUEST, FETCH_GA4_LOCATIONS_SUCCESS, FETCH_GA4_LOCATIONS_FAILURE,
  FETCH_GA4_DEVICES_REQUEST, FETCH_GA4_DEVICES_SUCCESS, FETCH_GA4_DEVICES_FAILURE,
  FETCH_GA4_CONVERSIONS_REQUEST, FETCH_GA4_CONVERSIONS_SUCCESS, FETCH_GA4_CONVERSIONS_FAILURE,
} from "../actions/ga4ActionTypes";

const initialState = {
  overview: null,        overviewLoading: false,       overviewError: null,
  trends: [],            trendsLoading: false,
  trafficSources: [],    trafficSourcesLoading: false,
  locations: [],         locationsLoading: false,
  devices: [],           devicesLoading: false,
  conversions: [],       conversionsLoading: false,
};

export default function ga4Reducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_GA4_OVERVIEW_REQUEST:
      return { ...state, overviewLoading: true, overviewError: null };
    case FETCH_GA4_OVERVIEW_SUCCESS:
      return { ...state, overviewLoading: false, overview: action.payload };
    case FETCH_GA4_OVERVIEW_FAILURE:
      return { ...state, overviewLoading: false, overviewError: action.payload };

    case FETCH_GA4_TRENDS_REQUEST:
      return { ...state, trendsLoading: true };
    case FETCH_GA4_TRENDS_SUCCESS:
      return { ...state, trendsLoading: false, trends: action.payload };
    case FETCH_GA4_TRENDS_FAILURE:
      return { ...state, trendsLoading: false };

    case FETCH_GA4_TRAFFIC_SOURCES_REQUEST:
      return { ...state, trafficSourcesLoading: true };
    case FETCH_GA4_TRAFFIC_SOURCES_SUCCESS:
      return { ...state, trafficSourcesLoading: false, trafficSources: action.payload };
    case FETCH_GA4_TRAFFIC_SOURCES_FAILURE:
      return { ...state, trafficSourcesLoading: false };

    case FETCH_GA4_LOCATIONS_REQUEST:
      return { ...state, locationsLoading: true };
    case FETCH_GA4_LOCATIONS_SUCCESS:
      return { ...state, locationsLoading: false, locations: action.payload };
    case FETCH_GA4_LOCATIONS_FAILURE:
      return { ...state, locationsLoading: false };

    case FETCH_GA4_DEVICES_REQUEST:
      return { ...state, devicesLoading: true };
    case FETCH_GA4_DEVICES_SUCCESS:
      return { ...state, devicesLoading: false, devices: action.payload };
    case FETCH_GA4_DEVICES_FAILURE:
      return { ...state, devicesLoading: false };

    case FETCH_GA4_CONVERSIONS_REQUEST:
      return { ...state, conversionsLoading: true };
    case FETCH_GA4_CONVERSIONS_SUCCESS:
      return { ...state, conversionsLoading: false, conversions: action.payload };
    case FETCH_GA4_CONVERSIONS_FAILURE:
      return { ...state, conversionsLoading: false };

    default:
      return state;
  }
}
