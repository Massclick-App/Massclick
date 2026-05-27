export const showGlobalLoader = (message = '') => ({
  type: 'SHOW_GLOBAL_LOADER',
  payload: { message },
});

export const hideGlobalLoader = () => ({
  type: 'HIDE_GLOBAL_LOADER',
});
