import React from 'react';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Outlet } from 'react-router-dom';

import AppNavbar from './components/AppNavbar';
import SideMenu from './components/SideMenu';
import AppTheme from './theme/AppTheme.js';
import Header from './components/Header';
// import ReloginDialog from './Internals/Login/reLogin.js'; 
import {
  // chartsCustomizations,
  // datePickersCustomizations,
  // treeViewCustomizations,
} from './theme/customizations';

const xThemeComponents = {
  // ...chartsCustomizations,
  // ...datePickersCustomizations,
  // ...treeViewCustomizations,
};

export default function Dashboard(props) {
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
        <Box sx={{ display: 'flex' }}>
       
        <SideMenu />

          <AppNavbar />

          <Box
            component="main"
            sx={(theme) => ({
              flexGrow: 1,
              backgroundColor: theme.vars
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : alpha(theme.palette.background.default, 1),
              overflow: 'auto',
              p: 3,
            })}
          >
            <Stack spacing={2} sx={{ alignItems: 'center', mx: 3, pb: 5, mt: { xs: 8, md: 0 } }}>
              <Header />
              <Outlet />
            </Stack>
          </Box>
        </Box>
    </AppTheme>
  );
}
