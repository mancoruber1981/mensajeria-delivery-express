import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ requiredRole }) => {
  const { user, loadingAuth } = useAuth();

  if (loadingAuth) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const isAllowed = Array.isArray(requiredRole)
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    if (!isAllowed) {
      switch (user.role) {
        case 'admin': return <Navigate to="/dashboard-admin" replace />;
        case 'cliente': return <Navigate to="/dashboard-cliente" replace />;
        case 'repartidor': return <Navigate to="/dashboard-repartidor" replace />;
        case 'auxiliar': return <Navigate to="/auxiliar-home" replace />;
        default: return <Navigate to="/" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
