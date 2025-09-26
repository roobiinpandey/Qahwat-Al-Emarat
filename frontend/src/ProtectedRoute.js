import React from 'react';
import { Navigate } from 'react-router-dom';
import * as api from './api';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = api.isAdminLoggedIn();

  if (!isAuthenticated) {
    // Redirect to admin login page if not authenticated
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
