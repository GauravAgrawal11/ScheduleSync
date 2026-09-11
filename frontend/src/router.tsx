import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage } from './auth/AdminLoginPage';
import { SupervisorLoginPage } from './auth/SupervisorLoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Supervisor
import { SupervisorLayout } from './supervisor/SupervisorLayout';
import { HomePage } from './supervisor/HomePage';
import { LogProgress } from './supervisor/LogProgress';
import { Submissions } from './supervisor/Submissions';
import { SubmissionDetail } from './supervisor/SubmissionDetail';
import { SiteFiles } from './supervisor/SiteFiles';

// Planner
import { PlannerLayout } from './planner/PlannerLayout';
import { ProjectSetup } from './planner/ProjectSetup';
import { ReviewQueue } from './planner/ReviewQueue';
import { MatchReview } from './planner/MatchReview';
import { Schedule } from './planner/Schedule';
import { Analytics } from './planner/Analytics';
import { ActivityDetail } from './planner/ActivityDetail';

import { HistoricalMemoryPanel } from './planner/HistoricalMemoryPanel';
import { SupervisorWorkload } from './planner/SupervisorWorkload';
import { ComplaintsPanel } from './planner/ComplaintsPanel';

export const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Application Navigation Interrupted">
      <Routes>
        {/* Dedicated Admin / Planner Login */}
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login/planner" element={<Navigate to="/admin/login" replace />} />

        {/* Dedicated Supervisor Field Link Login */}
        <Route path="/supervisor/login" element={<SupervisorLoginPage />} />
        <Route path="/login/supervisor" element={<Navigate to="/supervisor/login" replace />} />
        <Route path="/site" element={<Navigate to="/supervisor/login" replace />} />

        {/* Supervisor Panel (Delegated access for Planner/Admin, locked for Supervisor) */}
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
              <ErrorBoundary fallbackTitle="Field Supervisor Workspace Render Issue">
                <SupervisorLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="log" element={<LogProgress />} />
          <Route path="files" element={<SiteFiles />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
        </Route>

        {/* Planner/Admin Cockpit (STRICT: Site Supervisors are forbidden) */}
        <Route
          path="/planner"
          element={
            <ProtectedRoute allowedRoles={['planner', 'admin']}>
              <ErrorBoundary fallbackTitle="Planner Cockpit Render Issue">
                <PlannerLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/planner/review" replace />} />
          <Route path="dashboard" element={<Navigate to="/planner/review" replace />} />
          <Route path="setup" element={<ProjectSetup />} />
          <Route path="ingestion" element={<ProjectSetup />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="review/:id" element={<MatchReview />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="workload" element={<SupervisorWorkload />} />
          <Route path="supervisors" element={<SupervisorWorkload />} />
          <Route path="complaints" element={<ComplaintsPanel />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="historical" element={<HistoricalMemoryPanel />} />
          <Route path="activities" element={<ActivityDetail />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};
