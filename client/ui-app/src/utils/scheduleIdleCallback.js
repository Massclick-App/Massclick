export const scheduleIdleCallback = (callback, options) => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, options);
  }

  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 0,
    });
  }, 0);
};
