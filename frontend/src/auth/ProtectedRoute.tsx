import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('supervisor' | 'planner' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const location = useLocation();

  const isSupervisorRoute = location.pathname.startsWith('/supervisor');

  // FIELD SUPERVISOR ROUTES:
  // Requires supervisor login first. Must NEVER redirect to admin!
  if (isSupervisorRoute) {
    if (!isAuthenticated || !user || user.role !== 'supervisor') {
      return <Navigate to="/supervisor/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // PLANNER / ADMIN COCKPIT ROUTES:
  // Requires planner/admin login first.
  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // STRICT ROLE ISOLATION: Supervisors can NEVER view the central planner cockpit
  if (user.role === 'supervisor') {
    return <Navigate to="/supervisor/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

