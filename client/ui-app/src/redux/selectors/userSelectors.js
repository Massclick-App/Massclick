import { createSelector } from 'reselect';

// Base selectors
const selectUserState = (state) => state.userReducer || {};
const selectClientAuthState = (state) => state.clientAuth || {};
const selectAuthState = (state) => state.auth || {};

// User reducer selectors
export const selectUser = createSelector(
  [selectUserState],
  (state) => state.data || {}
);

export const selectUserId = createSelector(
  [selectUser],
  (user) => user.id
);

export const selectUserEmail = createSelector(
  [selectUser],
  (user) => user.email
);

export const selectUserLoading = createSelector(
  [selectUserState],
  (state) => state.loading || false
);

// Client auth selectors
export const selectClientAuthUser = createSelector(
  [selectClientAuthState],
  (state) => state.user || {}
);

export const selectIsClientAuthenticated = createSelector(
  [selectClientAuthState],
  (state) => state.isAuthenticated || false
);

// Auth selectors
export const selectAuthToken = createSelector(
  [selectAuthState],
  (state) => state.token || null
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (state) => state.isAuthenticated || false
);

// Combined user data selector (single selector for multiple values)
export const selectUserData = createSelector(
  [selectUser, selectUserLoading, selectIsClientAuthenticated],
  (user, loading, isAuth) => ({
    user,
    loading,
    isAuthenticated: isAuth,
  })
);
