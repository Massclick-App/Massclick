// ProtectedRoute.js
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { logout } from "./redux/actions/authAction.js";

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const expiry = localStorage.getItem("accessTokenExpiresAt");

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

  const token = localStorage.getItem("accessToken");
  const expiry = localStorage.getItem("accessTokenExpiresAt");

  if (!token || !expiry || new Date(expiry).getTime() <= Date.now()) {
    return <Navigate to="/" replace />; 
  }

  return children;
};

export default ProtectedRoute;
