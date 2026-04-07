// src/theme/theme.js
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
    palette: {
        primary: {
            main: '#2196F3', 
            dark: '#1976D2',
        },
        secondary: {
            main: '#FF5722', 
            contrastText: '#fff',
        },
        text: {
            primary: '#333333',
            secondary: '#666666',
        },
        background: {
            default: '#F5F5F5', 
            paper: '#FFFFFF',
        },
        orangeBar: {
            main: '#FF8A2C', 
            contrastText: '#fff',
        },
        blueServiceCard: {
            main: '#2196F3', 
            contrastText: '#fff',
        },
        greenServiceCard: {
            main: '#4CAF50',
            contrastText: '#fff',
        },
        yellowServiceCard: {
            main: '#FFC107', 
            contrastText: '#333333',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 700 },
        h2: { fontSize: '2rem', fontWeight: 600 },
        h3: { fontSize: '1.75rem', fontWeight: 600 },
        h4: { fontSize: '1.5rem', fontWeight: 500 },
        h5: { fontSize: '1.25rem', fontWeight: 500 },
        h6: { fontSize: '1rem', fontWeight: 500 },
        subtitle1: { fontSize: '1rem', fontWeight: 400 },
        body1: { fontSize: '0.95rem', lineHeight: 1.5 },
        body2: { fontSize: '0.85rem', lineHeight: 1.4 },
        button: {
            textTransform: 'none', 
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8, 
                    boxShadow: 'none', 
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                containedSecondary: {
                    backgroundColor: '#FF8A2C', 
                    '&:hover': {
                        backgroundColor: '#e67320',
                    }
                }
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none', 
                    borderBottom: '1px solid #e0e0e0',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)', 
                }
            }
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    borderRadius: 8, 
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
                notchedOutline: {
                    borderColor: '#e0e0e0', 
                },
            }
        }
    },
});

theme = responsiveFontSizes(theme);

export default theme;