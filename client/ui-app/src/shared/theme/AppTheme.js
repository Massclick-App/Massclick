import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { inputsCustomizations } from 'shared/theme/customizations/inputs.js';
import { dataDisplayCustomizations } from 'shared/theme/customizations/dataDisplay.js';
import { feedbackCustomizations } from 'shared/theme/customizations/feedBack.js';
import { navigationCustomizations } from 'shared/theme/customizations/navigation.js';
import { surfacesCustomizations } from 'shared/theme/customizations/surfaces.js';
import { getDesignTokens } from 'shared/theme/themePrimitives.js'; 

export default function AppTheme(props) {
  const { children, disableCustomTheme, themeComponents } = props;

  const theme = React.useMemo(() => {
    if (disableCustomTheme) return createTheme();

    const designTokens = getDesignTokens('light'); 

    return createTheme({
      ...designTokens,
      components: {
        ...inputsCustomizations,
        ...dataDisplayCustomizations,
        ...feedbackCustomizations,
        ...navigationCustomizations,
        ...surfacesCustomizations,
        ...themeComponents,
      },
    });
  }, [disableCustomTheme, themeComponents]);

  if (disableCustomTheme) return <>{children}</>;

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
