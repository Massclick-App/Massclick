import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { store } from './redux/store.js';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { DrawerProvider } from './Internals/clientComponent/Drawer/drawerContext.js';
import { HelmetProvider } from "react-helmet-async";
import { setAxiosStore } from './services/axiosInstance.js'; // Initialize axios store reference

// Set the store reference for axios global loader
setAxiosStore(store);

// Load Google Analytics after first paint to unblock main thread
const loadAnalytics = async () => {
  try {
    const { loadGoogleAnalytics } = await import('./services/analyticsLoader');
    loadGoogleAnalytics();
  } catch (err) {
    console.warn('Analytics loader error:', err);
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
    requestIdleCallback(loadAnalytics, { timeout: 5000 });
  });
} else {
  requestIdleCallback(loadAnalytics, { timeout: 5000 });
}

reportWebVitals();

// Register service worker for image caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}
