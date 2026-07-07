import {
  FETCH_GA4_OVERVIEW_REQUEST, FETCH_GA4_OVERVIEW_SUCCESS, FETCH_GA4_OVERVIEW_FAILURE,
  FETCH_GA4_TRENDS_REQUEST, FETCH_GA4_TRENDS_SUCCESS, FETCH_GA4_TRENDS_FAILURE,
  FETCH_GA4_TRAFFIC_SOURCES_REQUEST, FETCH_GA4_TRAFFIC_SOURCES_SUCCESS, FETCH_GA4_TRAFFIC_SOURCES_FAILURE,
  FETCH_GA4_LOCATIONS_REQUEST, FETCH_GA4_LOCATIONS_SUCCESS, FETCH_GA4_LOCATIONS_FAILURE,
  FETCH_GA4_DEVICES_REQUEST, FETCH_GA4_DEVICES_SUCCESS, FETCH_GA4_DEVICES_FAILURE,
  FETCH_GA4_CITIES_REQUEST, FETCH_GA4_CITIES_SUCCESS, FETCH_GA4_CITIES_FAILURE,
  FETCH_GA4_BROWSERS_REQUEST, FETCH_GA4_BROWSERS_SUCCESS, FETCH_GA4_BROWSERS_FAILURE,
  FETCH_GA4_PAGES_REQUEST, FETCH_GA4_PAGES_SUCCESS, FETCH_GA4_PAGES_FAILURE,
  FETCH_GA4_LANDING_PAGES_REQUEST, FETCH_GA4_LANDING_PAGES_SUCCESS, FETCH_GA4_LANDING_PAGES_FAILURE,
  FETCH_GA4_ACQUISITION_REQUEST, FETCH_GA4_ACQUISITION_SUCCESS, FETCH_GA4_ACQUISITION_FAILURE,
} from "../actions/ga4ActionTypes";

// Slices added after the initial GA4 rollout — data-driven since they all
// share the exact (Loading, value) shape, to avoid 48 lines of copy-paste.
const EXTRA_SLICES = [
  ["ENGAGEMENT_OVERVIEW", "engagementOverview", null],
  ["REFERRERS", "referrers", []],
  ["CAMPAIGNS", "campaigns", []],
  ["OPERATING_SYSTEMS", "operatingSystems", []],
  ["PLATFORMS", "platforms", []],
  ["DEVICE_MODELS", "deviceModels", []],
  ["SCREEN_RESOLUTIONS", "screenResolutions", []],
  ["REGIONS", "regions", []],
  ["CONTINENTS", "continents", []],
  ["SUB_CONTINENTS", "subContinents", []],
  ["NEW_VS_RETURNING", "newVsReturning", []],
  ["DAY_OF_WEEK", "dayOfWeek", []],
  ["HOUR_OF_DAY", "hourOfDay", []],
  ["SCREENS", "screens", []],
];

const extraInitialState = {};
for (const [, key, empty] of EXTRA_SLICES) {
  extraInitialState[key] = empty;
  extraInitialState[`${key}Loading`] = false;
}

const initialState = {
  overview: null,        overviewLoading: false,       overviewError: null,
  trends: [],            trendsLoading: false,
  trafficSources: [],    trafficSourcesLoading: false,
  locations: [],         locationsLoading: false,
  devices: [],           devicesLoading: false,
  cities: [],            citiesLoading: false,
  browsers: [],          browsersLoading: false,
  pages: [],             pagesLoading: false,
  landingPages: [],      landingPagesLoading: false,
  acquisition: [],       acquisitionLoading: false,
  ...extraInitialState,
};

const extraSliceReducer = (state, action) => {
  for (const [typeBase, key] of EXTRA_SLICES) {
    if (action.type === `FETCH_GA4_${typeBase}_REQUEST`) return { ...state, [`${key}Loading`]: true };
    if (action.type === `FETCH_GA4_${typeBase}_SUCCESS`) return { ...state, [`${key}Loading`]: false, [key]: action.payload };
    if (action.type === `FETCH_GA4_${typeBase}_FAILURE`) return { ...state, [`${key}Loading`]: false };
  }
  return null;
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

    case FETCH_GA4_CITIES_REQUEST:
      return { ...state, citiesLoading: true };
    case FETCH_GA4_CITIES_SUCCESS:
      return { ...state, citiesLoading: false, cities: action.payload };
    case FETCH_GA4_CITIES_FAILURE:
      return { ...state, citiesLoading: false };

    case FETCH_GA4_BROWSERS_REQUEST:
      return { ...state, browsersLoading: true };
    case FETCH_GA4_BROWSERS_SUCCESS:
      return { ...state, browsersLoading: false, browsers: action.payload };
    case FETCH_GA4_BROWSERS_FAILURE:
      return { ...state, browsersLoading: false };

    case FETCH_GA4_PAGES_REQUEST:
      return { ...state, pagesLoading: true };
    case FETCH_GA4_PAGES_SUCCESS:
      return { ...state, pagesLoading: false, pages: action.payload };
    case FETCH_GA4_PAGES_FAILURE:
      return { ...state, pagesLoading: false };

    case FETCH_GA4_LANDING_PAGES_REQUEST:
      return { ...state, landingPagesLoading: true };
    case FETCH_GA4_LANDING_PAGES_SUCCESS:
      return { ...state, landingPagesLoading: false, landingPages: action.payload };
    case FETCH_GA4_LANDING_PAGES_FAILURE:
      return { ...state, landingPagesLoading: false };

    case FETCH_GA4_ACQUISITION_REQUEST:
      return { ...state, acquisitionLoading: true };
    case FETCH_GA4_ACQUISITION_SUCCESS:
      return { ...state, acquisitionLoading: false, acquisition: action.payload };
    case FETCH_GA4_ACQUISITION_FAILURE:
      return { ...state, acquisitionLoading: false };

    default: {
      const extra = extraSliceReducer(state, action);
      return extra !== null ? extra : state;
    }
  }
}
