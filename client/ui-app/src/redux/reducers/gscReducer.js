import {
  FETCH_GSC_OVERVIEW_REQUEST, FETCH_GSC_OVERVIEW_SUCCESS, FETCH_GSC_OVERVIEW_FAILURE,
  FETCH_GSC_TRENDS_REQUEST, FETCH_GSC_TRENDS_SUCCESS, FETCH_GSC_TRENDS_FAILURE,
  FETCH_GSC_QUERIES_REQUEST, FETCH_GSC_QUERIES_SUCCESS, FETCH_GSC_QUERIES_FAILURE,
  FETCH_GSC_PAGES_REQUEST, FETCH_GSC_PAGES_SUCCESS, FETCH_GSC_PAGES_FAILURE,
  FETCH_GSC_DEVICES_REQUEST, FETCH_GSC_DEVICES_SUCCESS, FETCH_GSC_DEVICES_FAILURE,
  FETCH_GSC_COUNTRIES_REQUEST, FETCH_GSC_COUNTRIES_SUCCESS, FETCH_GSC_COUNTRIES_FAILURE,
  FETCH_GSC_OPPORTUNITIES_REQUEST, FETCH_GSC_OPPORTUNITIES_SUCCESS, FETCH_GSC_OPPORTUNITIES_FAILURE,
  FETCH_GSC_KEYWORD_GAPS_REQUEST, FETCH_GSC_KEYWORD_GAPS_SUCCESS, FETCH_GSC_KEYWORD_GAPS_FAILURE,
} from "../actions/gscActionTypes";

const initialState = {
  overview: null,       overviewLoading: false,  overviewError: null,
  trends: [],           trendsLoading: false,
  queries: [],          queriesLoading: false,
  pages: [],            pagesLoading: false,
  devices: [],          devicesLoading: false,
  countries: [],        countriesLoading: false,
  opportunities: null,  opportunitiesLoading: false,
  keywordGaps: [],      keywordGapsLoading: false,
};

export default function gscReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_GSC_OVERVIEW_REQUEST:
      return { ...state, overviewLoading: true, overviewError: null };
    case FETCH_GSC_OVERVIEW_SUCCESS:
      return { ...state, overviewLoading: false, overview: action.payload };
    case FETCH_GSC_OVERVIEW_FAILURE:
      return { ...state, overviewLoading: false, overviewError: action.payload };

    case FETCH_GSC_TRENDS_REQUEST:
      return { ...state, trendsLoading: true };
    case FETCH_GSC_TRENDS_SUCCESS:
      return { ...state, trendsLoading: false, trends: action.payload };
    case FETCH_GSC_TRENDS_FAILURE:
      return { ...state, trendsLoading: false };

    case FETCH_GSC_QUERIES_REQUEST:
      return { ...state, queriesLoading: true };
    case FETCH_GSC_QUERIES_SUCCESS:
      return { ...state, queriesLoading: false, queries: action.payload };
    case FETCH_GSC_QUERIES_FAILURE:
      return { ...state, queriesLoading: false };

    case FETCH_GSC_PAGES_REQUEST:
      return { ...state, pagesLoading: true };
    case FETCH_GSC_PAGES_SUCCESS:
      return { ...state, pagesLoading: false, pages: action.payload };
    case FETCH_GSC_PAGES_FAILURE:
      return { ...state, pagesLoading: false };

    case FETCH_GSC_DEVICES_REQUEST:
      return { ...state, devicesLoading: true };
    case FETCH_GSC_DEVICES_SUCCESS:
      return { ...state, devicesLoading: false, devices: action.payload };
    case FETCH_GSC_DEVICES_FAILURE:
      return { ...state, devicesLoading: false };

    case FETCH_GSC_COUNTRIES_REQUEST:
      return { ...state, countriesLoading: true };
    case FETCH_GSC_COUNTRIES_SUCCESS:
      return { ...state, countriesLoading: false, countries: action.payload };
    case FETCH_GSC_COUNTRIES_FAILURE:
      return { ...state, countriesLoading: false };

    case FETCH_GSC_OPPORTUNITIES_REQUEST:
      return { ...state, opportunitiesLoading: true };
    case FETCH_GSC_OPPORTUNITIES_SUCCESS:
      return { ...state, opportunitiesLoading: false, opportunities: action.payload };
    case FETCH_GSC_OPPORTUNITIES_FAILURE:
      return { ...state, opportunitiesLoading: false };

    case FETCH_GSC_KEYWORD_GAPS_REQUEST:
      return { ...state, keywordGapsLoading: true };
    case FETCH_GSC_KEYWORD_GAPS_SUCCESS:
      return { ...state, keywordGapsLoading: false, keywordGaps: action.payload };
    case FETCH_GSC_KEYWORD_GAPS_FAILURE:
      return { ...state, keywordGapsLoading: false };

    default:
      return state;
  }
}
