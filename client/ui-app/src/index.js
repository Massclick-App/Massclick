import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { store } from './redux/store.js';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { DrawerProvider } from './Internals/clientComponent/Drawer/drawerContext.js';
import { HelmetProvider } from "react-helmet-async";
import { setAxiosStore } from './services/axiosInstance.js'; // Initialize axios store reference
import { scheduleIdleCallback } from './utils/scheduleIdleCallback.js';

const CHUNK_RECOVERY_FLAG = 'massclick:chunk-recovery-attempted';
const CHUNK_ERROR_PATTERN = /Loading (?:CSS )?chunk \d+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i;
const MARKETING_INTERACTION_EVENTS = [
  'pointerdown',
  'touchstart',
  'keydown',
  'scroll',
];

// Set the store reference for axios global loader
setAxiosStore(store);

const recoverFromChunkLoadFailure = (error) => {
  if (typeof window === 'undefined') {
    return;
  }

  const message = typeof error === 'string'
    ? error
    : error?.message || error?.reason?.message || '';

  if (!CHUNK_ERROR_PATTERN.test(message)) {
    return;
  }

  try {
    if (window.sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === '1') {
      return;
    }

    window.sessionStorage.setItem(CHUNK_RECOVERY_FLAG, '1');
  } catch {
    // Ignore storage failures and still try to recover once.
  }

  window.location.reload();
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    recoverFromChunkLoadFailure(event?.error || event?.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    recoverFromChunkLoadFailure(event?.reason);
  });
}

const loadDeferredScripts = async () => {
  try {
    const {
      loadGoogleAds,
      loadGoogleTagManager,
    } = await import('./services/analyticsLoader');
    // The Ads gtag runtime also processes the queued GA4 configuration, so a
    // second gtag.js download for GA4 is unnecessary.
    loadGoogleAds();
    // Stagger the heavier GTM container onto a separate idle period.
    scheduleIdleCallback(loadGoogleTagManager);
    // Google AdSense is intentionally disabled for now.
    // Uncomment the next line if ads are re-enabled later.
    // loadAdSense();
  } catch (err) {
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <DrawerProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </DrawerProvider>
  </Provider>
);

// Marketing tags are kept off the initial render/LCP path. They start on the
// first real user interaction, or after a 6s idle fallback so sessions with
// no interaction (bounces, bots) still get tracked.
const MARKETING_IDLE_FALLBACK_MS = 6000;
let marketingScriptsStarted = false;
let marketingIdleFallbackTimer = null;

const startMarketingScripts = () => {
  if (marketingScriptsStarted) {
    return;
  }

  marketingScriptsStarted = true;
  MARKETING_INTERACTION_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, startMarketingScripts);
  });
  if (marketingIdleFallbackTimer !== null) {
    window.clearTimeout(marketingIdleFallbackTimer);
    marketingIdleFallbackTimer = null;
  }
  scheduleIdleCallback(loadDeferredScripts);
};

MARKETING_INTERACTION_EVENTS.forEach((eventName) => {
  window.addEventListener(eventName, startMarketingScripts, {
    passive: true,
    once: true,
  });
});

marketingIdleFallbackTimer = window.setTimeout(
  startMarketingScripts,
  MARKETING_IDLE_FALLBACK_MS,
);

reportWebVitals();

// Register service worker for image caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(() => {});
  });
}
