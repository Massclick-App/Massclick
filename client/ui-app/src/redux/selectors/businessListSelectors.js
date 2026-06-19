import { createSelector } from 'reselect';

// Base selector
const selectBusinessListState = (state) => state.businessListReducer || {};

// Memoized selectors - only recompute when state changes
export const selectBusinesses = createSelector(
  [selectBusinessListState],
  (state) => state.list || []
);

export const selectBusinessLoading = createSelector(
  [selectBusinessListState],
  (state) => state.loading || false
);

export const selectBusinessError = createSelector(
  [selectBusinessListState],
  (state) => state.error || null
);

export const selectSearchLogs = createSelector(
  [selectBusinessListState],
  (state) => state.searchLogs || []
);

export const selectBackendSuggestions = createSelector(
  [selectBusinessListState],
  (state) => state.backendSuggestions || []
);

export const selectBackendSuggestionsMeta = createSelector(
  [selectBusinessListState],
  (state) => ({
    loading: state.backendSuggestionsLoading || false,
    hasMore: state.backendSuggestionsHasMore || false,
    page: state.backendSuggestionsPage || 0,
    limit: state.backendSuggestionsLimit || 10,
    total: state.backendSuggestionsTotal || 0,
    query: state.backendSuggestionsQuery || "",
  })
);

export const selectBusinessCount = createSelector(
  [selectBusinesses],
  (businesses) => businesses.length
);

// Combined selector for multiple values (prevents multiple re-renders)
export const selectBusinessListData = createSelector(
  [selectBusinesses, selectBusinessLoading, selectBusinessError],
  (businesses, loading, error) => ({
    businesses,
    loading,
    error,
  })
);
