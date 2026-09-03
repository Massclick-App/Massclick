import React, { Suspense } from 'react';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Outlet } from 'react-router-dom';

import AppNavbar from 'shared/components/AppNavbar.js';
import SideMenu from 'shared/components/SideMenu.js';
import AppTheme from 'shared/theme/AppTheme.js';
import Header from 'shared/components/Header.js';
import {
  // chartsCustomizations,
  // datePickersCustomizations,
  // treeViewCustomizations,
} from 'shared/theme/customizations/index.js';

const xThemeComponents = {
  // ...chartsCustomizations,
  // ...datePickersCustomizations,
  // ...treeViewCustomizations,
};

const DashboardRouteFallback = () => (
  <Box
    sx={{
      width: '100%',
      minHeight: 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      fontWeight: 600,
    }}
  >
    Loading page...
  </Box>
);

export default function Dashboard(props) {
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
        <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', minWidth: 0 }}>
       
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
              minWidth: 0,
              width: '100%',
              p: { xs: 0, sm: 1.5, md: 2.5, xl: 3 },
            })}
          >
            <Stack
              spacing={2}
              sx={{
                width: '100%',
                minWidth: 0,
                alignItems: 'stretch',
                mx: 0,
                pb: 5,
                mt: { xs: 8, md: 0 },
              }}
            >
              <Header />
              <Suspense fallback={<DashboardRouteFallback />}>
                <Outlet />
              </Suspense>
            </Stack>
          </Box>
        </Box>
    </AppTheme>
  );
}

