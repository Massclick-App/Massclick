const initialState = {
  isLoading: false,
  message: '',
};

const globalLoaderReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SHOW_GLOBAL_LOADER':
      return {
        isLoading: true,
        message: action.payload?.message || '',
      };
    case 'HIDE_GLOBAL_LOADER':
      return {
        isLoading: false,
        message: '',
      };
    default:
      return state;
  }
};

export default globalLoaderReducer;
