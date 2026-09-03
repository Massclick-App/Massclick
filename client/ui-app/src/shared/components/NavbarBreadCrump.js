import * as React from 'react';
import { styled } from '@mui/material/styles';
import { Typography} from '@mui/material';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { useLocation } from 'react-router-dom';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

// Map your routes to readable names
const routeNames = {
  '/dashboard/home': 'Home',
  '/dashboard/category': 'Category',
  '/dashboard/location': 'Location',
  '/dashboard/business': 'Business',
  '/dashboard/clients': 'Clients',
  '/dashboard/user': 'Users',
  '/dashboard/roles': 'Roles',
};

export default function NavbarBreadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean); 

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return routeNames[path] || segment;
  });

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      {breadcrumbs.map((label, index) => (
        <Typography
          key={index}
          variant="body1"
          sx={{
            color: index === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary',
            fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
          }}
        >
          {label}
        </Typography>
      ))}
    </StyledBreadcrumbs>
  );
}
