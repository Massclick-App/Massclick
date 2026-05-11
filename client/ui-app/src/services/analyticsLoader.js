// Lazy load Google Analytics to avoid blocking main thread
export const loadGoogleAnalytics = () => {
  if (document.querySelector('script[src*="googletagmanager"]')) {
    return; // Already loaded
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-925S15KNR9';

  script.onload = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-925S15KNR9', {
      send_page_view: true,
    });
  };

  script.onerror = () => {
    console.warn('Failed to load Google Analytics');
  };

  document.head.appendChild(script);
};
