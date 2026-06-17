import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAuthSnapshot } from './auth/authStore.js';

const RoleBasedRoute = ({ allowedRoles }) => {
  const authSnapshot = getAuthSnapshot();
  const userRole =
    useSelector((state) => state.auth.user?.userRole) ||
    authSnapshot.admin.userRole;

  return allowedRoles.includes(userRole)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
};

export default RoleBasedRoute;
