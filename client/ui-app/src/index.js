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

// Set the store reference for axios global loader
setAxiosStore(store);

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
    console.warn('Deferred script loader error:', err);
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
      .catch(err => console.warn('SW registration failed:', err));
  });
}
