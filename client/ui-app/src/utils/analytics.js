export const GA_TRACKING_ID = "G-925S15KNR9";

export const pageview = (url) => {
  if (window.gtag) {
    window.gtag("config", GA_TRACKING_ID, {
      page_path: url,
    });
  }
};
