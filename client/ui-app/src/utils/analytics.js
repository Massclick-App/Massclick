export const GA_TRACKING_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

const TAG_QUEUE_INITIALIZED_FLAG = "__massclickGoogleTagQueueInitialized";
const GA_QUEUE_CONFIGURED_FLAG = "__massclickGaQueueConfigured";

export const ensureGoogleTagQueue = () => {
  if (typeof window === "undefined") {
    return null;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!window[TAG_QUEUE_INITIALIZED_FLAG]) {
    window[TAG_QUEUE_INITIALIZED_FLAG] = true;
    window.gtag("js", new Date());
  }

  if (GA_TRACKING_ID && !window[GA_QUEUE_CONFIGURED_FLAG]) {
    window[GA_QUEUE_CONFIGURED_FLAG] = true;
    window.gtag("config", GA_TRACKING_ID, {
      send_page_view: false,
    });
  }

  return window.gtag;
};

export const ensureGoogleAnalyticsQueue = ensureGoogleTagQueue;

export const pageview = (url) => {
  const gtag = ensureGoogleAnalyticsQueue();
  if (!gtag || !GA_TRACKING_ID) {
    return;
  }

  gtag("event", "page_view", {
    page_path: url,
    page_location: `${window.location.origin}${url}`,
    page_title: document.title,
  });
};
