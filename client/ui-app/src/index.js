import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { store } from './redux/store.js';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { DrawerProvider } from './Internals/clientComponent/Drawer/drawerContext.js';
import { HelmetProvider } from "react-helmet-async";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  typography: {
    fontFamily: `'Hogar', 'Inter', sans-serif`,
  },
});

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DrawerProvider>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </DrawerProvider>
    </ThemeProvider>
  </Provider>
);

// Schedule GA load after render cycle (3+ seconds delay to unblock main thread)
setTimeout(loadAnalytics, 3000);

reportWebVitals();
