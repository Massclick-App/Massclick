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

// Load marketing scripts after first paint to unblock main thread
const loadDeferredScripts = async () => {
  try {
    const {
      loadGoogleAnalytics,
      loadGoogleTagManager,
    } = await import('./services/analyticsLoader');
    loadGoogleAnalytics();
    loadGoogleTagManager();
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

// Load analytics asynchronously after page interaction to avoid blocking
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    scheduleIdleCallback(loadDeferredScripts, { timeout: 5000 });
  });
} else {
  scheduleIdleCallback(loadDeferredScripts, { timeout: 5000 });
}

reportWebVitals();

// Register service worker for image caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(() => {});
  });
}
