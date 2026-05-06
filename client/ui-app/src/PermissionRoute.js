import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const SUPERADMIN = 'SuperAdmin';

export default function PermissionRoute() {
  const { pathname } = useLocation();

  const userRole =
    useSelector((state) => state.auth.user?.userRole) ||
    localStorage.getItem('userRole');

  const allowedPages =
    useSelector((state) => state.auth.allowedPages) ||
    JSON.parse(localStorage.getItem('allowedPages') || '[]');

  if (userRole === SUPERADMIN) return <Outlet />;

  return allowedPages.includes(pathname)
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
}
