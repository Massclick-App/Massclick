export const throttle = (callback, delay) => {
  let timeoutId = null;
  let lastCallTime = 0;

  return function throttled(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delay) {
      callback.apply(this, args);
      lastCallTime = now;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback.apply(this, args);
        lastCallTime = Date.now();
      }, delay - timeSinceLastCall);
    }
  };
};

export const debounce = (callback, delay) => {
  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
};
