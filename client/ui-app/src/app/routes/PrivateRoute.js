import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = ({ isAuthenticated, isReady }) => {
  if (!isReady) {
    return null;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin" replace />;
};

export default PrivateRoute;
