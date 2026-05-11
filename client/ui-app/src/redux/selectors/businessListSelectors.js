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
