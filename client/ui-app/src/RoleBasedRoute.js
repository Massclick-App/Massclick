import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const RoleBasedRoute = ({ allowedRoles }) => {
  const userRole =
    useSelector((state) => state.auth.user?.userRole) ||
    localStorage.getItem('userRole');

  return allowedRoles.includes(userRole)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
};

export default RoleBasedRoute;
