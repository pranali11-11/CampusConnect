import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Loader from './Loader';

/**
 * Route protection wrapper based on authentication status and user roles.
 */
const ProtectedRoute = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // If auth state is loading from localStorage, show spinner
  if (loading) {
    return <Loader fullPage />;
  }

  // If user is not logged in, redirect to login page
  if (!user && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user has wrong role, redirect to unauthorized
  if (role && user && user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
