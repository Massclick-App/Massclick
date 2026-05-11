// Export all memoized selectors
export * from './businessListSelectors';
export * from './userSelectors';

// Tips for using selectors in components:
// 1. Replace useSelector((state) => state.businessListReducer) with useSelector(selectBusinessListData)
// 2. Use specific selectors when you only need one value: useSelector(selectBusinessLoading)
// 3. Selectors prevent unnecessary re-renders by memoizing output values
// 4. Only subscribe to the exact data you need in each component
