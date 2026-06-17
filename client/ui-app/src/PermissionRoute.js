import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAuthSnapshot } from './auth/authStore.js';

const SUPERADMIN = 'SuperAdmin';

export default function PermissionRoute() {
  const { pathname } = useLocation();
  const authSnapshot = getAuthSnapshot();

  const userRole =
    useSelector((state) => state.auth.user?.userRole) ||
    authSnapshot.admin.userRole;

  const allowedPages =
    useSelector((state) => state.auth.allowedPages) ||
    authSnapshot.admin.allowedPages;

  if (userRole === SUPERADMIN) return <Outlet />;

  return allowedPages.includes(pathname)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
}
