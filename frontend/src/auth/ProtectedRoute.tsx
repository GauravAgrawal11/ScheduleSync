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
  // Must NEVER redirect to /planner, /planner/review, or /admin/login!
  // If unauthenticated or currently in an admin session, auto-initialize a clean supervisor session.
  if (isSupervisorRoute) {
    if (!isAuthenticated || !user || user.role !== 'supervisor') {
      const defaultSupervisorUser = {
        id: 2,
        name: 'Supervisor 1 - Piping',
        email: 'piping.sup1@oilindia.in',
        role: 'supervisor' as const,
        discipline: 'Piping',
      };
      const existingToken = useAuthStore.getState().token || 'demo-supervisor-session-token';
      setAuth(defaultSupervisorUser, existingToken);
    }
    return <>{children}</>;
  }

  // PLANNER / ADMIN COCKPIT ROUTES:
  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // STRICT ROLE ISOLATION: Supervisors can NEVER view the central planner cockpit
  if (user.role === 'supervisor') {
    return <Navigate to="/supervisor" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

