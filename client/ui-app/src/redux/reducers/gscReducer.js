import {
  FETCH_GSC_OVERVIEW_REQUEST, FETCH_GSC_OVERVIEW_SUCCESS, FETCH_GSC_OVERVIEW_FAILURE,
  FETCH_GSC_TRENDS_REQUEST, FETCH_GSC_TRENDS_SUCCESS, FETCH_GSC_TRENDS_FAILURE,
  FETCH_GSC_QUERIES_REQUEST, FETCH_GSC_QUERIES_SUCCESS, FETCH_GSC_QUERIES_FAILURE,
  FETCH_GSC_PAGES_REQUEST, FETCH_GSC_PAGES_SUCCESS, FETCH_GSC_PAGES_FAILURE,
  FETCH_GSC_DEVICES_REQUEST, FETCH_GSC_DEVICES_SUCCESS, FETCH_GSC_DEVICES_FAILURE,
  FETCH_GSC_COUNTRIES_REQUEST, FETCH_GSC_COUNTRIES_SUCCESS, FETCH_GSC_COUNTRIES_FAILURE,
  FETCH_GSC_OPPORTUNITIES_REQUEST, FETCH_GSC_OPPORTUNITIES_SUCCESS, FETCH_GSC_OPPORTUNITIES_FAILURE,
  FETCH_GSC_KEYWORD_GAPS_REQUEST, FETCH_GSC_KEYWORD_GAPS_SUCCESS, FETCH_GSC_KEYWORD_GAPS_FAILURE,
  FETCH_TRACKED_KEYWORDS_REQUEST, FETCH_TRACKED_KEYWORDS_SUCCESS, FETCH_TRACKED_KEYWORDS_FAILURE,
  ADD_TRACKED_KEYWORD_SUCCESS,
  UPDATE_TRACKED_KEYWORD_SUCCESS, DELETE_TRACKED_KEYWORD_SUCCESS,
  CHECK_KEYWORD_RANK_REQUEST, CHECK_KEYWORD_RANK_SUCCESS, CHECK_KEYWORD_RANK_FAILURE,
  CHECK_ALL_KEYWORDS_REQUEST, CHECK_ALL_KEYWORDS_SUCCESS, CHECK_ALL_KEYWORDS_FAILURE,
  FETCH_KEYWORD_HISTORY_REQUEST, FETCH_KEYWORD_HISTORY_SUCCESS, FETCH_KEYWORD_HISTORY_FAILURE,
  FETCH_KEYWORD_QUOTA_SUCCESS,
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
  trackedKeywords: [],  trackedKeywordsLoading: false, trackedKeywordsError: null,
  keywordCheckingId: null, keywordCheckError: null,
  keywordHistory: null, keywordHistoryLoading: false,
  keywordQuota: null,
  checkAllLoading: false, checkAllResult: null, checkAllError: null,
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

    case FETCH_TRACKED_KEYWORDS_REQUEST:
      return { ...state, trackedKeywordsLoading: true, trackedKeywordsError: null };
    case FETCH_TRACKED_KEYWORDS_SUCCESS:
      return { ...state, trackedKeywordsLoading: false, trackedKeywords: action.payload };
    case FETCH_TRACKED_KEYWORDS_FAILURE:
      return { ...state, trackedKeywordsLoading: false, trackedKeywordsError: action.payload };

    case ADD_TRACKED_KEYWORD_SUCCESS:
      return { ...state, trackedKeywords: [action.payload, ...state.trackedKeywords] };

    case UPDATE_TRACKED_KEYWORD_SUCCESS:
      return {
        ...state,
        trackedKeywords: state.trackedKeywords.map((k) =>
          k._id === action.payload._id ? action.payload : k
        ),
      };

    case DELETE_TRACKED_KEYWORD_SUCCESS:
      return {
        ...state,
        trackedKeywords: state.trackedKeywords.filter((k) => k._id !== action.payload),
      };

    case CHECK_KEYWORD_RANK_REQUEST:
      return { ...state, keywordCheckingId: action.payload, keywordCheckError: null };
    case CHECK_KEYWORD_RANK_SUCCESS:
      return {
        ...state,
        keywordCheckingId: null,
        trackedKeywords: state.trackedKeywords.map((k) =>
          k._id === action.payload._id ? action.payload : k
        ),
      };
    case CHECK_KEYWORD_RANK_FAILURE:
      return { ...state, keywordCheckingId: null, keywordCheckError: action.payload };

    case CHECK_ALL_KEYWORDS_REQUEST:
      return { ...state, checkAllLoading: true, checkAllResult: null, checkAllError: null };
    case CHECK_ALL_KEYWORDS_SUCCESS:
      return { ...state, checkAllLoading: false, checkAllResult: action.payload };
    case CHECK_ALL_KEYWORDS_FAILURE:
      return { ...state, checkAllLoading: false, checkAllError: action.payload };

    case FETCH_KEYWORD_HISTORY_REQUEST:
      return { ...state, keywordHistoryLoading: true };
    case FETCH_KEYWORD_HISTORY_SUCCESS:
      return { ...state, keywordHistoryLoading: false, keywordHistory: action.payload };
    case FETCH_KEYWORD_HISTORY_FAILURE:
      return { ...state, keywordHistoryLoading: false };

    case FETCH_KEYWORD_QUOTA_SUCCESS:
      return { ...state, keywordQuota: action.payload };

    default:
      return state;
  }
}
