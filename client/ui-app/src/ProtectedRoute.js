// ProtectedRoute.js
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { getAuthSnapshot } from "./auth/authStore.js";
import { logout } from "./redux/actions/authAction.js";

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const { admin } = getAuthSnapshot();
    const token = admin.accessToken;
    const expiry = admin.expiresAt;

    if (!token || !expiry || new Date(expiry).getTime() <= Date.now()) {
      dispatch(logout());
    } else {
      const timeout = new Date(expiry).getTime() - Date.now();
      const timer = setTimeout(() => {
        alert("Session expired. Logging out.");
        dispatch(logout());
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [dispatch]);

  const { admin } = getAuthSnapshot();
  const token = admin.accessToken;
  const expiry = admin.expiresAt;

  if (!token || !expiry || new Date(expiry).getTime() <= Date.now()) {
    return <Navigate to="/" replace />; 
  }

  return children;
};

export default ProtectedRoute;
