const hasScript = (needle) =>
  Array.from(document.querySelectorAll("script")).some((script) =>
    script.src.includes(needle),
  );

// Lazy load Google Analytics to avoid blocking main thread
export const loadGoogleAnalytics = () => {
  const gaId = process.env.REACT_APP_GA_MEASUREMENT_ID;
  if (!gaId || hasScript(`gtag/js?id=${gaId}`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.dataset.massclickGa = "true";

  script.onload = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", gaId, {
      send_page_view: true,
    });
  };

  script.onerror = () => {
    };

  document.head.appendChild(script);
};

export const loadGoogleTagManager = () => {
  if (hasScript("gtm.js?id=GTM-KB44T7MH")) {
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
  script.onerror = () => {
    };

  document.head.appendChild(script);
};
