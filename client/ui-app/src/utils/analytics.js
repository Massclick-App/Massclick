export const GA_TRACKING_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

export const pageview = (url) => {
  if (window.gtag) {
    window.gtag("config", GA_TRACKING_ID, {
      page_path: url,
    });
  }
};
