import {
  ensureGoogleAnalyticsQueue,
  ensureGoogleTagQueue,
  GA_TRACKING_ID,
} from "../utils/analytics.js";

export const GOOGLE_ADS_ID = "AW-18321855911";
const GOOGLE_ADS_CONFIGURED_FLAG = "__massclickGoogleAdsConfigured";

const hasScript = (needle) =>
  Array.from(document.querySelectorAll("script")).some((script) =>
    script.src.includes(needle),
  );

export const loadGoogleAnalytics = () => {
  if (
    !ensureGoogleAnalyticsQueue() ||
    hasScript(`gtag/js?id=${GA_TRACKING_ID}`)
  ) {
    console.log("[analytics] loadGoogleAnalytics skipped (no queue or already loaded)");
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  script.dataset.massclickGa = "true";
  script.onerror = () => console.log("[analytics] gtag.js (GA4) failed to load");
  script.onload = () => console.log("[analytics] gtag.js (GA4) loaded:", script.src);

  document.head.appendChild(script);
};

export const loadGoogleAds = () => {
  const gtag = ensureGoogleTagQueue();
  if (!gtag) {
    console.log("[analytics] loadGoogleAds skipped (no gtag queue)");
    return;
  }

  if (!window[GOOGLE_ADS_CONFIGURED_FLAG]) {
    window[GOOGLE_ADS_CONFIGURED_FLAG] = true;
    gtag("config", GOOGLE_ADS_ID);
    console.log("[analytics] gtag config queued for Ads:", GOOGLE_ADS_ID);
  }

  if (hasScript(`gtag/js?id=${GOOGLE_ADS_ID}`)) {
    console.log("[analytics] Ads gtag.js already present, skipping load");
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.dataset.massclickGoogleAds = "true";
  script.onerror = () => console.log("[analytics] gtag.js (Ads) failed to load");
  script.onload = () => console.log("[analytics] gtag.js (Ads) loaded — this also drains any queued GA4 config:", script.src);

  document.head.appendChild(script);
};

export const loadGoogleTagManager = () => {
  if (hasScript("gtm.js?id=GTM-KB44T7MH")) {
    console.log("[analytics] GTM already present, skipping load");
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.async = true;
  script.dataset.massclickGtm = "true";
  script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-KB44T7MH";
  script.onerror = () => console.log("[analytics] gtm.js failed to load");
  script.onload = () => console.log("[analytics] gtm.js (GTM-KB44T7MH) loaded");
  document.head.appendChild(script);
};

export const loadAdSense = () => {
  if (
    hasScript("pagead/js/adsbygoogle.js?client=ca-pub-3217097513155005")
  ) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.massclickAdsense = "true";
  script.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3217097513155005";
  script.onerror = () => {};

  document.head.appendChild(script);
};
