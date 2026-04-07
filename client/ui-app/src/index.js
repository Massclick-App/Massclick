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

reportWebVitals();
