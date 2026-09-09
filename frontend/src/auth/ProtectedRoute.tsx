import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('supervisor' | 'planner' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    if (location.pathname.startsWith('/supervisor')) {
      return <Navigate to="/supervisor/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    const effectiveRoles = [...allowedRoles];
    // Planners and Admins have delegated access to inspect the supervisor portal without credentials
    if (allowedRoles.includes('supervisor')) {
      effectiveRoles.push('planner', 'admin');
    }

    // STRICT ROLE SEPARATION: Supervisors can NEVER access planner/admin routes
    if (!effectiveRoles.includes(user.role)) {
      if (user.role === 'supervisor') {
        return <Navigate to="/supervisor" replace />;
      } else {
        return <Navigate to="/planner" replace />;
      }
    }
  }

  return <>{children}</>;
};
